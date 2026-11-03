<script setup>
/** 页面 44 · 销售订单管理：客户订单列表、订单状态跟踪、发货管理 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable } from '@/components/ui'
import { tradeApi } from '@/api'

const tableRef = ref(null)

const columns = [
  { prop: 'code', label: '订单编号', width: 130 },
  { prop: 'customer', label: '客户', width: 95 },
  { prop: 'product', label: '产品', minWidth: 180 },
  { prop: 'traceCode', label: '溯源码', width: 130 },
  { prop: 'qty', label: '数量', width: 70, align: 'center' },
  { prop: 'amount', label: '金额', width: 100, align: 'right' },
  { prop: 'status', label: '状态', width: 90, align: 'center' },
  { prop: 'time', label: '下单时间', width: 160 },
  { prop: 'address', label: '收货地址', minWidth: 150 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '订单号 / 客户 / 产品' },
  { key: 'status', label: '状态', type: 'select', options: ['待付款', '待发货', '已发货', '已完成', '已退款'].map((s) => ({ label: s, value: s })) },
]

async function markShip(row) {
  await ElMessageBox.confirm(`确认对订单「${row.code}」执行发货吗？发货后将短信通知客户。`, '发货确认', { type: 'info', confirmButtonText: '确认发货' })
  await tradeApi.updateOrder(row.id, { status: '已发货' })
  ElMessage.success('订单已发货')
  tableRef.value?.reload(true)
}
async function markDone(row) {
  await ElMessageBox.confirm(`确认订单「${row.code}」已签收完成吗？`, '完成确认', { type: 'info' })
  await tradeApi.updateOrder(row.id, { status: '已完成' })
  ElMessage.success('订单已完成')
  tableRef.value?.reload(true)
}
async function refund(row) {
  const { value } = await ElMessageBox.prompt('输入退款原因：', '退款处理 · 敏感操作', { inputPlaceholder: '如：客户拒收', type: 'warning' }).catch(() => ({ value: null }))
  if (value === null) return
  await tradeApi.updateOrder(row.id, { status: '已退款', refundReason: value })
  ElMessage.success('退款申请已受理')
  tableRef.value?.reload(true)
}
</script>

<template>
  <div class="page">
    <PageHeader title="销售订单管理" desc="客户订单列表、订单状态跟踪与发货管理" />

    <ProTable ref="tableRef" :columns="columns" :fetch="tradeApi.orderPage" :filters="filters" action-width="230">
      <template #col-code="{ row }">
        <span class="mono-num so-code">{{ row.code }}</span>
      </template>
      <template #col-amount="{ row }">
        <span class="mono-num amount">¥{{ row.amount }}</span>
      </template>
      <template #col-status="{ row }">
        <el-tag size="small" :type="row.status === '已完成' ? 'success' : row.status === '已退款' ? 'danger' : row.status === '待付款' ? 'warning' : 'primary'" effect="light">
          {{ row.status }}
        </el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button v-if="row.status === '待发货'" link type="primary" :icon="'Van'" @click="markShip(row)">发货</el-button>
        <el-button v-if="row.status === '已发货'" link type="success" @click="markDone(row)">签收</el-button>
        <el-button v-if="row.status === '待付款'" link type="danger" @click="refund(row)">退款</el-button>
      </template>
    </ProTable>
  </div>
</template>

<style scoped>
.so-code {
  font-weight: 700;
  color: var(--ag-blue-700);
}
.amount {
  font-weight: 700;
  color: var(--ag-danger);
}
</style>
