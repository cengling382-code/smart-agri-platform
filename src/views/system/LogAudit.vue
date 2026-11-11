<script setup>
/** 页面 49 · 操作日志审计：登录日志、用户操作日志、异常日志查询与审计 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ProTable, StatCard } from '@/components/ui'
import { sysApi } from '@/api'
import { downloadCsv } from '@/utils/exportFile'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const summary = ref({ login: 0, operate: 0, error: 0, fail: 0 })
const exporting = ref(false)

const TYPE_META = cfg.logTypeMeta

const columns = [
  { prop: 'time', label: '时间', width: 165 },
  { prop: 'type', label: '类型', width: 100, align: 'center' },
  { prop: 'user', label: '操作人', width: 120 },
  { prop: 'ip', label: 'IP 地址', width: 130 },
  { prop: 'module', label: '模块', width: 110 },
  { prop: 'action', label: '操作内容', minWidth: 200 },
  { prop: 'result', label: '结果', width: 80, align: 'center' },
  { prop: 'detail', label: '详情', minWidth: 160 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '用户 / 模块 / IP' },
  { key: 'type', label: '类型', type: 'select', options: Object.entries(TYPE_META).map(([v, m]) => ({ label: m.label, value: v })) },
  { key: 'result', label: '结果', type: 'select', options: cfg.statusOptionGroups.logResult },
]

async function loadTable(params) {
  const res = await sysApi.logs(params)
  return res
}
async function refreshSummary() {
  try {
    const res = await sysApi.logs({ page: 1, size: 1000 })
    const list = res.list
    summary.value = {
      login: list.filter((l) => l.type === 'login').length,
      operate: list.filter((l) => l.type === 'operate').length,
      error: list.filter((l) => l.type === 'error').length,
      fail: list.filter((l) => l.result === '失败').length,
    }
  } catch (e) {
    console.warn('[LogAudit]', e?.message || e)
  }
}
refreshSummary()

async function exportLog() {
  if (exporting.value) return
  exporting.value = true
  try {
    const res = await sysApi.logs({ page: 1, size: 2000 })
    const rows = res.list.map((l) => [
      l.time, TYPE_META[l.type]?.label || l.type, l.user, l.ip, l.module, l.action, l.result, l.detail,
    ])
    downloadCsv('操作日志审计', ['时间', '类型', '操作人', 'IP 地址', '模块', '操作内容', '结果', '详情'], rows)
    ElMessage.success(`已导出 ${rows.length} 条日志记录`)
  } catch (e) {
    ElMessage.error(`导出失败：${e.message}`)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="日志审计" desc="登录日志、用户操作日志与异常日志的集中查询与审计">
      <template #actions>
        <el-button type="primary" plain :icon="'Download'" :loading="exporting" @click="exportLog">导出日志</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid stagger">
      <StatCard label="登录日志" :value="summary.login" unit="条" icon="Key" tone="blue" />
      <StatCard label="操作日志" :value="summary.operate" unit="条" icon="EditPen" tone="green" />
      <StatCard label="异常日志" :value="summary.error" unit="条" icon="WarningFilled" tone="red" />
      <StatCard label="失败操作" :value="summary.fail" unit="条" icon="CircleClose" tone="amber" />
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters">
      <template #col-type="{ row }">
        <el-tag size="small" :type="TYPE_META[row.type]?.tag" effect="plain">{{ TYPE_META[row.type]?.label }}</el-tag>
      </template>
      <template #col-result="{ row }">
        <el-tag size="small" :type="row.result === '成功' ? 'success' : 'danger'" effect="light">{{ row.result }}</el-tag>
      </template>
      <template #col-detail="{ row }">
        <span class="log-detail" :title="row.detail">{{ row.detail }}</span>
      </template>
    </ProTable>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.log-detail {
  color: var(--ag-danger);
  font-size: 12px;
  font-family: Consolas, monospace;
}
</style>
