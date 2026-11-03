<script setup>
/** 页面 38 · 溯源批次管理：生产批次维护、生成溯源二维码、批次状态管理（含召回） */
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import QRCode from 'qrcode'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { traceApi, farmApi } from '@/api'

const router = useRouter()
const tableRef = ref(null)
const qrDialog = ref(false)
const qrCanvas = ref(null)
const qrRow = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)
const harvests = ref([])

const STATUS_TAG = { 待完善: 'warning', 已发布: 'success', 已召回: 'danger', 已下架: 'info' }

const form = reactive({ id: null, crop: '', plotName: '', qty: '', harvestCode: '' })
const rules = {
  harvestCode: [{ required: true, message: '请选择采收批次', trigger: 'change' }],
}

const columns = [
  { prop: 'code', label: '溯源码', width: 140 },
  { prop: 'crop', label: '作物', width: 90 },
  { prop: 'plotName', label: '产地地块', minWidth: 130 },
  { prop: 'qty', label: '批次产量', width: 95, align: 'right' },
  { prop: 'records', label: '溯源信息', minWidth: 200 },
  { prop: 'scans', label: '扫码次数', width: 95, align: 'center' },
  { prop: 'status', label: '状态', width: 90, align: 'center' },
  { prop: 'created', label: '创建时间', width: 160 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '溯源码 / 作物 / 地块' },
  { key: 'status', label: '状态', type: 'select', options: Object.keys(STATUS_TAG).map((s) => ({ label: s, value: s })) },
]

async function loadTable(params) {
  if (!harvests.value.length) {
    const res = await farmApi.harvestPage({ page: 1, size: 50, status: '已入库' })
    harvests.value = res.list
  }
  return traceApi.page(params)
}

function openCreate() {
  Object.assign(form, { id: null, crop: '', plotName: '', qty: '', harvestCode: '' })
  dialogVisible.value = true
}
async function handleSubmit() {
  submitting.value = true
  try {
    const h = harvests.value.find((x) => x.batchCode === form.harvestCode)
    await traceApi.create({ crop: h?.crop, plotName: h?.plotName, qty: `${h?.qty}kg`, harvestCode: form.harvestCode })
    ElMessage.success('溯源批次创建成功，请完善溯源信息后发布')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

/** 生成溯源二维码（一物一码） */
async function showQr(row) {
  qrRow.value = row
  qrDialog.value = true
  await nextTick()
  const url = `${window.location.origin}/trace/${row.code}`
  try {
    await QRCode.toCanvas(qrCanvas.value, url, {
      width: 220, margin: 2,
      color: { dark: '#3A5743', light: '#ffffff' },
    })
  } catch (e) {
    console.warn('[TraceBatch] QR:', e?.message || e)
  }
}
function downloadQr() {
  const canvas = qrCanvas.value
  const link = document.createElement('a')
  link.download = `溯源二维码_${qrRow.value.code}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
  ElMessage.success('溯源二维码已下载')
}

async function publish(row) {
  await ElMessageBox.confirm(`发布批次「${row.code}」的溯源页面？发布后消费者扫码即可查询。`, '发布确认', { type: 'info' })
  await traceApi.update(row.id, { status: '已发布' })
  ElMessage.success('溯源批次已发布')
  tableRef.value?.reload(true)
}
async function recall(row) {
  const { value } = await ElMessageBox.prompt('输入召回原因（将记录到召回档案）：', '批次召回 · 敏感操作', { inputPlaceholder: '如：农残复检不合格', type: 'error', confirmButtonText: '确认召回' }).catch(() => ({ value: null }))
  if (value === null) return
  await traceApi.update(row.id, { status: '已召回', recallReason: value })
  ElMessage.warning('批次已召回，溯源页面已标注召回信息')
  tableRef.value?.reload(true)
}
async function offline(row) {
  await ElMessageBox.confirm(`下架批次「${row.code}」的溯源页面？`, '下架确认', { type: 'warning' })
  await traceApi.update(row.id, { status: '已下架' })
  ElMessage.success('已下架')
  tableRef.value?.reload(true)
}
</script>

<template>
  <div class="page">
    <PageHeader title="溯源批次管理" desc="一物一码：为每批次农产品生成唯一溯源二维码，支持批次发布、召回与状态管理">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新建溯源批次</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters" action-width="270">
      <template #col-code="{ row }">
        <span class="trace-code mono-num">{{ row.code }}</span>
      </template>
      <template #col-records="{ row }">
        <div class="rec-chips">
          <el-tag size="small" type="success" effect="plain">农事 {{ row.records.farm }} 条</el-tag>
          <el-tag size="small" type="primary" effect="plain">环境 {{ row.records.env }} 条</el-tag>
          <el-tag size="small" :type="row.records.tests ? 'success' : 'info'" effect="plain">检测 {{ row.records.tests }} 份</el-tag>
        </div>
      </template>
      <template #col-scans="{ row }">
        <span class="mono-num">{{ row.scans }}</span>
      </template>
      <template #col-status="{ row }">
        <el-tag size="small" :type="STATUS_TAG[row.status]" effect="light">{{ row.status }}</el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" :icon="'Postcard'" @click="showQr(row)">二维码</el-button>
        <el-button link type="primary" @click="router.push(`/trace/batches/info/${row.id}`)">编辑</el-button>
        <el-button v-if="row.status === '待完善'" link type="success" @click="publish(row)">发布</el-button>
        <el-button v-if="row.status === '已发布'" link type="danger" @click="recall(row)">召回</el-button>
        <el-button v-if="row.status === '已发布'" link type="warning" @click="offline(row)">下架</el-button>
      </template>
    </ProTable>

    <!-- 新建批次 -->
    <FormDialog v-model="dialogVisible" title="新建溯源批次" :rules="rules" :model="form" :submit-loading="submitting" width="520px" @submit="handleSubmit">
      <el-form-item label="采收批次" prop="harvestCode">
        <el-select v-model="form.harvestCode" style="width: 100%" placeholder="选择已入库的采收批次（自动关联产地与产量）">
          <el-option v-for="h in harvests" :key="h.batchCode" :label="`${h.batchCode} · ${h.plotName}（${h.crop} ${h.qty}kg）`" :value="h.batchCode" />
        </el-select>
      </el-form-item>
      <el-alert type="info" :closable="false" show-icon title="创建后系统自动关联该批次的农事记录、环境数据与检测报告" />
    </FormDialog>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrDialog" :title="`溯源二维码 · ${qrRow?.code || ''}`" width="380px" align-center>
      <div class="qr-box" v-if="qrRow">
        <canvas ref="qrCanvas" class="qr-canvas"></canvas>
        <div class="qr-meta">
          <b>{{ qrRow.crop }} · {{ qrRow.plotName }}</b>
          <span class="text-dim mono-num">{{ qrRow.code }}</span>
          <span class="text-dim">扫码查看生长全过程、产地环境与检测报告</span>
        </div>
        <div class="qr-actions">
          <el-button type="primary" :icon="'Download'" @click="downloadQr">下载二维码</el-button>
          <el-button :icon="'View'" @click="router.push(`/trace/${qrRow.code}`)">预览溯源页</el-button>
        </div>
        <div class="print-tip text-dim">打印模板：60×60mm 标签 · 含平台 Logo 与「扫码溯源」引导语</div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.trace-code {
  font-weight: 700;
  color: var(--ag-green-700);
}
.rec-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.qr-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 8px 0;
}
.qr-canvas {
  border: 1px solid var(--ag-border-light);
  border-radius: var(--ag-radius); /* 决策依据：二维码画布块属卡片类，对齐卡片档 10px */
  padding: 8px;
  animation: agZoomIn 0.4s var(--ag-ease-spring) both;
}
.qr-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.qr-actions {
  display: flex;
  gap: 10px;
}
.print-tip {
  font-size: 11px;
}
</style>
