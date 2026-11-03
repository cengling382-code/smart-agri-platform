<script setup>
/** 页面 17 · 告警列表：级别筛选、状态处理、闭环归档（一般/重要/紧急三级） */
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, StatusTag } from '@/components/ui'
import { alarmApi } from '@/api'

const tableRef = ref(null)
const selected = ref([])

const LEVELS = { 1: { text: '一般', tag: 'info' }, 2: { text: '重要', tag: 'warning' }, 3: { text: '紧急', tag: 'danger' } }
const STATUS_FLOW = { pending: '未处理', confirmed: '已确认', resolved: '已处置', archived: '已归档' }

const columns = [
  { prop: 'code', label: '告警编号', width: 125 },
  { prop: 'level', label: '级别', width: 82, align: 'center' },
  { prop: 'type', label: '类型', width: 105 },
  { prop: 'content', label: '告警内容', minWidth: 260 },
  { prop: 'source', label: '来源', width: 110 },
  { prop: 'time', label: '告警时间', width: 160 },
  { prop: 'status', label: '状态', width: 90, align: 'center' },
  { prop: 'handler', label: '处理人', width: 90 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '编号 / 内容 / 来源' },
  { key: 'level', label: '级别', type: 'select', options: Object.entries(LEVELS).map(([v, m]) => ({ label: m.text, value: v })) },
  { key: 'type', label: '类型', type: 'select', options: ['环境超限', '设备故障', '离线掉线', '库存不足', '灾害预警', '传感器异常'].map((t) => ({ label: t, value: t })) },
  { key: 'status', label: '状态', type: 'select', options: Object.entries(STATUS_FLOW).map(([v, l]) => ({ label: l, value: v })) },
]

/** 处理闭环：未处理 → 确认 → 处置 → 归档 */
async function confirmAlarm(row) {
  await ElMessageBox.confirm(`确认告警「${row.code}」吗？确认后进入处置流程。`, '告警确认', { type: 'warning' })
  await alarmApi.update(row.id, { status: 'confirmed', handler: '当前用户' })
  ElMessage.success('告警已确认')
  tableRef.value?.reload(true)
}
async function resolveAlarm(row) {
  const { value } = await ElMessageBox.prompt('请填写处置记录（处理措施、现场情况）：', '告警处置', {
    inputType: 'textarea', inputPlaceholder: '如：已现场开启风机并恢复正常', confirmButtonText: '完成处置',
  }).catch(() => ({ value: null }))
  if (value === null) return
  await alarmApi.update(row.id, { status: 'resolved', handleNote: value, handler: '当前用户' })
  ElMessage.success('告警已处置')
  tableRef.value?.reload(true)
}
async function archiveAlarm(row) {
  await ElMessageBox.confirm(`归档告警「${row.code}」后进入历史库，仅可查询。`, '归档确认', { type: 'info' })
  await alarmApi.update(row.id, { status: 'archived' })
  ElMessage.success('告警已归档')
  tableRef.value?.reload(true)
}

async function batchConfirm() {
  if (!selected.value.length) return ElMessage.warning('请先勾选告警')
  const pendings = selected.value.filter((a) => a.status === 'pending')
  if (!pendings.length) return ElMessage.info('所选告警中没有未处理项')
  await ElMessageBox.confirm(`批量确认 ${pendings.length} 条未处理告警？`, '批量操作', { type: 'warning' })
  await alarmApi.batch(pendings.map((a) => a.id), 'confirmed')
  ElMessage.success('批量确认完成')
  tableRef.value?.reload(true)
}
</script>

<template>
  <div class="page">
    <PageHeader title="告警列表" desc="设备故障、环境超限等告警的分级查看与处理闭环：确认 → 处置 → 归档">
      <template #actions>
        <el-button type="primary" plain :icon="'Check'" @click="batchConfirm">批量确认</el-button>
      </template>
    </PageHeader>

    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch="alarmApi.page"
      :filters="filters"
      :default-query="{ status: 'pending' }"
      selectable
      action-width="220"
      @selection-change="(v) => (selected = v)"
    >
      <template #col-level="{ row }">
        <el-tag :type="LEVELS[row.level]?.tag" effect="dark" size="small" :class="{ blink: row.level === 3 && row.status === 'pending' }">
          {{ LEVELS[row.level]?.text }}
        </el-tag>
      </template>
      <template #col-content="{ row }">
        <span :class="{ 'urgent-content': row.level === 3 && row.status === 'pending' }">{{ row.content }}</span>
      </template>
      <template #col-status="{ row }">
        <StatusTag :value="row.status" />
      </template>
      <template #col-action="{ row }">
        <el-button v-if="row.status === 'pending'" link type="warning" @click="confirmAlarm(row)">确认</el-button>
        <el-button v-if="row.status === 'confirmed'" link type="success" @click="resolveAlarm(row)">处置</el-button>
        <el-button v-if="row.status === 'resolved'" link type="info" @click="archiveAlarm(row)">归档</el-button>
        <el-button v-if="row.status === 'archived'" link disabled>已闭环</el-button>
      </template>
      <template #toolbar>
        <span class="flow-tip text-dim">处理闭环流程：<el-tag size="small" type="danger">未处理</el-tag> → <el-tag size="small" type="warning">已确认</el-tag> → <el-tag size="small" type="success">已处置</el-tag> → <el-tag size="small" type="info">已归档</el-tag></span>
      </template>
    </ProTable>
  </div>
</template>

<style scoped>
.blink {
  animation: agBlink 1.4s ease-in-out infinite;
}
.urgent-content {
  color: var(--ag-danger);
  font-weight: 500;
}
.flow-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
</style>
