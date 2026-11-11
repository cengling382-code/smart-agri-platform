<script setup>
/** 页面 47 · 系统参数配置：平台基础参数、告警短信/推送配置、采集频率设置 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { sysApi, dbApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const params = ref([])
const loading = ref(true)
const savingId = ref(null)
const draft = reactive({})

/* ---------- 本地 JSON 数据库 ---------- */
const dbStatsInfo = ref({ storage: '-', collections: 0, records: 0, sizeKB: 0, savedAt: null, available: true })
const dbBusy = ref(false)
const fileInput = ref(null)

async function loadDbStats() {
  try {
    dbStatsInfo.value = await dbApi.stats()
  } catch (e) {
    console.warn('[SysParams][db]', e?.message || e)
  }
}

function formatSavedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { hour12: false })
}

async function exportDbJson() {
  dbBusy.value = true
  try {
    const { json } = await dbApi.exportJson()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smart-agri-db-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('已导出 JSON 数据文件')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    dbBusy.value = false
  }
}

function pickDbFile() {
  fileInput.value?.click()
}

async function onDbFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const text = await file.text()
  dbBusy.value = true
  try {
    dbStatsInfo.value = await dbApi.importJson(text)
    ElMessage.success('数据已导入并写入 JSON 存档')
    params.value = (await sysApi.params()).list
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    dbBusy.value = false
    event.target.value = ''
  }
}

async function resetDbData() {
  try {
    await ElMessageBox.confirm('将清空当前所有业务数据，恢复为初始种子数据，是否继续？', '恢复初始数据', {
      type: 'warning',
      confirmButtonText: '确认恢复',
      cancelButtonText: '取消',
    })
  } catch { return }
  dbBusy.value = true
  try {
    dbStatsInfo.value = await dbApi.reset()
    params.value = (await sysApi.params()).list
    ElMessage.success('已恢复初始数据')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    dbBusy.value = false
  }
}

onMounted(async () => {
  loadDbStats()
  try {
    params.value = (await sysApi.params()).list
  } catch (e) {
    console.warn('[SysParams]', e?.message || e)
  } finally {
    loading.value = false
  }
})

async function saveParam(p) {
  savingId.value = p.id
  try {
    await sysApi.updateParam(p.id, { value: p.value })
    ElMessage.success(`「${p.name}」已保存`)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    savingId.value = null
  }
}
function renderValue(p) {
  if (p.type === 'switch') return
  if (p.key.includes('interval')) return `${p.value} 秒`
  if (p.key.includes('expire')) return `${p.value} 个月`
  if (p.key.includes('threshold')) return `${p.value} ℃/%`
  return p.value
}
const GROUPS = computed(() => cfg.sysParamGroups)
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="系统参数配置" desc="平台基础参数、告警短信/推送配置与数据采集频率设置" />

    <div class="param-groups" v-for="g in GROUPS" :key="g.name">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>{{ g.name }}</div></div>
        <div class="ag-card__body param-list">
          <div v-for="p in params.filter((x) => g.keys.includes(x.key))" :key="p.id" class="param-row">
            <div class="pr-meta">
              <b>{{ p.name }}</b>
              <span class="text-dim">{{ p.desc }} <code class="p-key">{{ p.key }}</code></span>
            </div>
            <div class="pr-value">
              <el-switch
                v-if="p.type === 'switch'"
                v-model="p.value"
                @change="saveParam(p)"
                :aria-label="p.name"
              />
              <template v-else>
                <el-input-number
                  v-if="p.type === 'number'"
                  v-model="p.value"
                  size="small"
                  style="width: 130px"
                />
                <el-input v-else v-model="p.value" size="small" style="width: 240px" />
                <el-button size="small" type="primary" plain :loading="savingId === p.id" @click="saveParam(p)">保存</el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ag-card anim-up db-card">
      <div class="ag-card__head">
        <div class="ag-card__title"><span class="dot"></span>本地数据存储（JSON）</div>
        <div class="db-actions">
          <el-button size="small" plain :loading="dbBusy" @click="exportDbJson">导出 JSON</el-button>
          <el-button size="small" plain :loading="dbBusy" @click="pickDbFile">导入 JSON</el-button>
          <el-button size="small" type="danger" plain :loading="dbBusy" @click="resetDbData">恢复初始数据</el-button>
        </div>
      </div>
      <div class="ag-card__body db-body">
        <div class="db-meta">
          <div class="db-item"><span>存储介质</span><b>{{ dbStatsInfo.available ? dbStatsInfo.storage : '内存（配额不足）' }}</b></div>
          <div class="db-item"><span>运行模式</span><b>{{ dbStatsInfo.mode === 'file' ? '本地 JSON 文件直写' : '静态模式（内置 JSON + 浏览器存档）' }}</b></div>
          <div class="db-item"><span>集合 / 记录</span><b>{{ dbStatsInfo.collections }} / {{ dbStatsInfo.records }}</b></div>
          <div class="db-item"><span>占用空间</span><b>{{ dbStatsInfo.sizeKB }} KB</b></div>
          <div class="db-item"><span>最后写入</span><b>{{ formatSavedAt(dbStatsInfo.savedAt) }}</b></div>
        </div>
        <p class="db-desc">
          开发模式下所有业务写操作（新增 / 编辑 / 删除 / 状态变更）都会自动回写到 data/ 目录下对应的 JSON 文件；
          静态部署时浏览器无法直接写文件，会退化为内置 JSON + 浏览器存档，可通过导出 / 导入完成备份与迁移。
        </p>
        <input ref="fileInput" type="file" accept=".json,application/json" class="db-file" @change="onDbFile" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.param-groups {
  margin-bottom: 20px;
  max-width: 980px;
}
.param-list {
  display: flex;
  flex-direction: column;
}
.param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 13px 4px;
  border-bottom: 1px dashed var(--ag-border-light);
}
.param-row:last-child {
  border-bottom: none;
}
.pr-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.p-key {
  font-size: 10px;
  background: var(--ag-bg-hover);
  padding: 1px 6px;
  border-radius: 5px;
  color: var(--ag-text-4);
  margin-left: 6px;
}
.pr-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.db-card {
  max-width: 980px;
  margin-top: 4px;
}
.db-actions {
  display: flex;
  gap: 8px;
  flex: none;
}
.db-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.db-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-bg-subtle, var(--ag-bg-hover));
}
.db-item span {
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-3);
}
.db-item b {
  font-size: 13px;
  font-weight: 600;
  color: var(--ag-text-1);
}
.db-desc {
  margin: 14px 0 0;
  font-size: var(--ag-fs-micro);
  line-height: 1.7;
  color: var(--ag-text-3);
}
.db-file {
  display: none;
}
</style>
