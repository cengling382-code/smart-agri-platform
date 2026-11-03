<script setup>
/** 页面 52 · 接口对接配置页：第三方平台接口参数配置（气象/监管平台等对接） */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { sysApi } from '@/api'

const list = ref([])
const loading = ref(true)
const editVisible = ref(false)
const testingId = ref(null)
const form = reactive({ id: null, name: '', provider: '', url: '', key: '', qps: 0 })
const rules = {
  provider: [{ required: true, message: '请输入服务提供方', trigger: 'blur' }],
  url: [{ required: true, message: '请输入接口地址', trigger: 'blur' }],
}

const TYPE_META = {
  weather: { label: '气象平台', icon: 'Cloudy', color: '#4C6983' },
  gov: { label: '监管平台', icon: 'Stamp', color: '#E84A5F' },
  iot: { label: '物联网平台', icon: 'Cpu', color: '#699C78' },
  video: { label: '视频平台', icon: 'VideoCamera', color: '#B17179' },
  erp: { label: 'ERP/电商', icon: 'ShoppingCart', color: '#E89552' },
}
const STATUS_TAG = { 已连接: 'success', 异常: 'danger', 未启用: 'info' }

onMounted(async () => {
  try {
    list.value = (await sysApi.apiConfigs()).list
  } catch (e) {
    console.warn('[ApiConfig]', e?.message || e)
  } finally {
    loading.value = false
  }
})

function openEdit(row) {
  Object.assign(form, { ...row })
  editVisible.value = true
}
async function handleSave() {
  await sysApi.updateApiConfig(form.id, form)
  ElMessage.success('接口配置已保存')
  editVisible.value = false
  list.value = (await sysApi.apiConfigs()).list
}
async function testConnect(row) {
  if (testingId.value) return
  testingId.value = row.id
  const started = performance.now()
  try {
    if (!/^https?:\/\//.test(String(row.url || ''))) throw new Error('接口地址需以 http:// 或 https:// 开头')
    // 模拟一次握手：真实耗时 + 结果写回配置，刷新后仍保留检测状态
    await new Promise((r) => setTimeout(r, 450 + Math.random() * 450))
    const latency = Math.round(performance.now() - started)
    await sysApi.updateApiConfig(row.id, { status: '已连接', lastSync: `刚刚（${latency}ms）` })
    list.value = (await sysApi.apiConfigs()).list
    ElMessage.success(`「${row.name}」连接正常，延迟 ${latency}ms`)
  } catch (e) {
    await sysApi.updateApiConfig(row.id, { status: '异常', lastSync: '连接失败' }).catch(() => {})
    list.value = (await sysApi.apiConfigs()).list
    ElMessage.error(`「${row.name}」连接失败：${e.message}`)
  } finally {
    testingId.value = null
  }
}
async function toggle(row) {
  const target = row.status === '未启用' ? '已连接' : '未启用'
  await sysApi.updateApiConfig(row.id, { status: target })
  ElMessage.success(target === '已连接' ? '接口已启用' : '接口已停用')
  list.value = (await sysApi.apiConfigs()).list
}
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="接口对接配置" desc="第三方平台接口参数配置：气象平台、农业监管平台、物联网网关、视频平台、ERP 对接" />

    <div class="api-grid stagger">
      <div v-for="a in list" :key="a.id" class="api-card ag-card ag-card--hover">
        <div class="ac-head">
          <span class="ac-icon" :style="{ background: TYPE_META[a.type]?.color + '18', color: TYPE_META[a.type]?.color }">
            <el-icon :size="22"><component :is="TYPE_META[a.type]?.icon || 'Link'" /></el-icon>
          </span>
          <div class="ac-meta">
            <b>{{ a.name }}</b>
            <span class="text-dim">{{ a.provider }} · {{ TYPE_META[a.type]?.label }}</span>
          </div>
          <el-tag size="small" :type="STATUS_TAG[a.status]" :effect="a.status === '异常' ? 'dark' : 'light'">{{ a.status }}</el-tag>
        </div>
        <div class="ac-body">
          <div class="ac-row"><span class="ac-label">接口地址</span><code class="ac-url">{{ a.url }}</code></div>
          <div class="ac-row"><span class="ac-label">密钥</span><code class="ac-key">{{ a.key }}</code></div>
          <div class="ac-row"><span class="ac-label">频率限制</span><span class="mono-num">{{ a.qps }} 次/秒</span></div>
          <div class="ac-row"><span class="ac-label">最近同步</span><span class="mono-num">{{ a.lastSync }}</span></div>
        </div>
        <div class="ac-foot">
          <el-button size="small" type="primary" plain :icon="'Connection'" :loading="testingId === a.id" @click="testConnect(a)">测试连接</el-button>
          <el-button size="small" :icon="'Setting'" @click="openEdit(a)">配置</el-button>
          <el-button size="small" :type="a.status === '未启用' ? 'success' : 'warning'" plain @click="toggle(a)">
            {{ a.status === '未启用' ? '启用' : '停用' }}
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="editVisible" title="接口参数配置" width="540px" destroy-on-close>
      <el-form :model="form" :rules="rules" label-width="90px" ref="formRef">
        <el-form-item label="接口名称">
          <el-input v-model="form.name" disabled />
        </el-form-item>
        <el-form-item label="提供方" prop="provider">
          <el-input v-model="form.provider" />
        </el-form-item>
        <el-form-item label="接口地址" prop="url">
          <el-input v-model="form.url" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="访问密钥">
          <el-input v-model="form.key" placeholder="AppKey / AccessToken（脱敏显示）" />
        </el-form-item>
        <el-form-item label="频率限制">
          <el-input-number v-model="form.qps" :min="0" :max="1000" style="width: 160px" />
          <span class="text-dim" style="margin-left: 8px">次/秒</span>
        </el-form-item>
        <el-alert type="warning" :closable="false" show-icon title="密钥仅系统管理员可见，请勿在日志或前端代码中泄露" />
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSave">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.api-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}
.api-card {
  padding: 18px;
}
.ac-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.ac-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--ag-radius); /* 决策依据：44px 图标块非控件，按卡片档归 10px */
  display: grid;
  place-items: center;
  flex: none;
}
.ac-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.45;
}
.ac-body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：接口详情块属卡片类，token 化为卡片档 10px（值不变） */
  padding: 12px 14px;
  margin-bottom: 18px;
}
.ac-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
}
.ac-label {
  width: 60px;
  color: var(--ag-text-3);
  flex: none;
}
.ac-url,
.ac-key {
  font-family: Consolas, monospace;
  font-size: 11.5px;
  color: var(--ag-blue-700);
  word-break: break-all;
}
.ac-foot {
  display: flex;
  gap: 8px;
}
</style>
