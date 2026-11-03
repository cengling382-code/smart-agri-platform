<script setup>
/** 页面 47 · 系统参数配置：平台基础参数、告警短信/推送配置、采集频率设置 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { sysApi } from '@/api'

const params = ref([])
const loading = ref(true)
const savingId = ref(null)
const draft = reactive({})

onMounted(async () => {
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
const GROUPS = computedGroups()
function computedGroups() {
  return [
    { name: '平台基础', keys: ['platform.name', 'trace.expire'] },
    { name: '数据采集', keys: ['collect.interval'] },
    { name: '告警通知（短信 / 微信公众号）', keys: ['alarm.sms', 'alarm.wechat', 'alarm.threshold.temp.max', 'alarm.threshold.temp.min', 'alarm.threshold.hum.min'] },
  ]
}
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
</style>
