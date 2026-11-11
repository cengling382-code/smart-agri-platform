<script setup>
/** 页面 38 · 溯源批次管理：生产批次维护、生成溯源二维码、批次状态管理（含召回） */
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { traceApi, farmApi } from '@/api'
import { getConfig } from '@/data/configStore'
import {
  getConfiguredBase, setConfiguredBase, buildTraceUrl, isLocalBase,
  renderQr, downloadQrPng, copyText,
} from '@/utils/traceQr'

const cfg = getConfig('constants')

const router = useRouter()
const tableRef = ref(null)
const qrDialog = ref(false)
const qrCanvas = ref(null)
const qrRow = ref(null)
const qrBase = ref(getConfiguredBase())
const qrError = ref('')
const qrUrl = computed(() => (qrRow.value ? buildTraceUrl(qrRow.value.code, qrBase.value) : ''))
const qrIsLocal = computed(() => isLocalBase(qrBase.value))
const dialogVisible = ref(false)
const submitting = ref(false)
const harvests = ref([])

const STATUS_TAG = cfg.traceStatusTag

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
    if (!h) {
      ElMessage.warning('请选择有效的已入库采收批次')
      return
    }
    await traceApi.create({ crop: h.crop, plotName: h.plotName, qty: `${h.qty}kg`, harvestCode: form.harvestCode })
    ElMessage.success('溯源批次创建成功，请完善溯源信息后发布')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

/**
 * 生成溯源二维码（一物一码）
 * 地址可配置：本地调试时 localhost 手机打不开，可填写局域网 IP 或部署后的域名，
 * 修改后立即重绘，二维码内容即为下方展示的真实链接。
 */
async function showQr(row) {
  qrRow.value = row
  qrBase.value = getConfiguredBase()
  qrError.value = ''
  qrDialog.value = true
  await nextTick()
  await redrawQr()
}
async function redrawQr() {
  qrError.value = ''
  try {
    setConfiguredBase(qrBase.value)
    await renderQr(qrCanvas.value, qrUrl.value, { width: 256 })
  } catch (e) {
    qrError.value = `二维码生成失败：${e?.message || e}`
  }
}
async function copyQrUrl() {
  try {
    await copyText(qrUrl.value)
    ElMessage.success('扫码链接已复制')
  } catch (e) {
    ElMessage.error(e?.message || '复制失败')
  }
}
function downloadQr() {
  try {
    downloadQrPng(qrCanvas.value, `溯源二维码_${qrRow.value.code}.png`)
    ElMessage.success('二维码已下载（高清 PNG，可直接印刷）')
  } catch (e) {
    ElMessage.error(e?.message || '下载失败')
  }
}

async function publish(row) {
  const ok = await ElMessageBox.confirm(`发布批次「${row.code}」的溯源页面？发布后消费者扫码即可查询。`, '发布确认', { type: 'info' }).catch(() => false)
  if (!ok) return
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
  const ok = await ElMessageBox.confirm(`下架批次「${row.code}」的溯源页面？`, '下架确认', { type: 'warning' }).catch(() => false)
  if (!ok) return
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
    <el-dialog v-model="qrDialog" :title="`溯源二维码 · ${qrRow?.code || ''}`" width="420px" align-center>
      <div class="qr-box" v-if="qrRow">
        <el-input v-model="qrBase" class="qr-base" placeholder="扫码访问地址" @change="redrawQr" @keyup.enter="redrawQr">
          <template #prepend>扫码地址</template>
        </el-input>
        <el-alert
          v-if="qrIsLocal"
          type="warning" :closable="false" show-icon
          title="当前是本机地址，手机扫码无法打开"
          description="请填写电脑的局域网 IP（如 http://192.168.1.10:5173，手机需连同一 WiFi），或部署后的公网域名。"
        />
        <canvas ref="qrCanvas" class="qr-canvas"></canvas>
        <el-alert v-if="qrError" type="error" :closable="false" show-icon :title="qrError" />
        <div class="qr-url mono-num">
          <span :title="qrUrl">{{ qrUrl }}</span>
          <el-button link type="primary" :icon="'DocumentCopy'" @click="copyQrUrl">复制</el-button>
        </div>
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
  gap: 12px;
  padding: 8px 0;
}
.qr-box :deep(.el-alert),
.qr-base {
  width: 100%;
}
.qr-url {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ag-text-3);
  background: var(--ag-bg-hover);
  border-radius: 8px;
  padding: 4px 10px;
  box-sizing: border-box;
}
.qr-url span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
