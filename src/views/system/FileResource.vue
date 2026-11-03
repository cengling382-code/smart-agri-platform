<script setup>
/** 页面 50 · 文件资源管理：上传图片、视频、附件统一管理、预览、下载 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable } from '@/components/ui'
import { sysApi } from '@/api'

const tableRef = ref(null)
const uploadVisible = ref(false)
const summary = ref({ total: 0, img: 0, video: 0, doc: 0 })

const TYPE_META = {
  img: { label: '图片', icon: 'Picture', color: '#699C78' },
  video: { label: '视频', icon: 'VideoCamera', color: '#4C6983' },
  doc: { label: '文档', icon: 'Document', color: '#E89552' },
}

const columns = [
  { prop: 'name', label: '文件名', minWidth: 240 },
  { prop: 'type', label: '类型', width: 90, align: 'center' },
  { prop: 'size', label: '大小', width: 90, align: 'right' },
  { prop: 'related', label: '关联业务', width: 110 },
  { prop: 'uploadBy', label: '上传人', width: 95 },
  { prop: 'time', label: '上传时间', width: 165 },
  { prop: 'path', label: '存储路径', minWidth: 180 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '文件名 / 上传人' },
  { key: 'type', label: '类型', type: 'select', options: Object.entries(TYPE_META).map(([v, m]) => ({ label: m.label, value: v })) },
]

async function loadTable(params) {
  const res = await sysApi.files(params)
  return res
}
onMounted(async () => {
  try {
    const res = await sysApi.files({ page: 1, size: 100 })
    summary.value = {
      total: res.total,
      img: res.list.filter((f) => f.type === 'img').length,
      video: res.list.filter((f) => f.type === 'video').length,
      doc: res.list.filter((f) => f.type === 'doc').length,
    }
  } catch (e) {
    console.warn('[FileResource]', e?.message || e)
  }
})

function preview(row) {
  ElMessageBox.alert(
    `<div style="text-align:center;padding:10px">
      <div style="width:220px;height:140px;border-radius:12px;background:${row.type === 'img' ? 'linear-gradient(135deg,#DCEBE0,#699C78)' : row.type === 'video' ? 'linear-gradient(135deg,#D6E6F2,#4C6983)' : 'linear-gradient(135deg,#F3DFA6,#E89552)'};margin:0 auto 12px;display:grid;place-items:center;font-size:40px;color:#fff">
        ${row.type === 'img' ? '🖼' : row.type === 'video' ? '🎬' : '📄'}
      </div>
      <b>${row.name}</b><br/>
      <span style="color:#6E7883;font-size:12px">${row.size} · ${row.path}</span>
    </div>`,
    '文件预览',
    { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' }
  ).catch(() => {})
}
function download(row) {
  ElMessage.success(`「${row.name}」已开始下载（演示）`)
}
async function removeFile(row) {
  await ElMessageBox.confirm(`确定删除文件「${row.name}」吗？删除后不可恢复。`, '删除确认', { type: 'error' })
  await sysApi.removeFile(row.id)
  ElMessage.success('文件已删除')
  tableRef.value?.reload(true)
}
function handleUpload() {
  ElMessage.success('文件上传成功（演示环境模拟上传）')
  uploadVisible.value = false
  tableRef.value?.reload(true)
}
</script>

<template>
  <div class="page">
    <PageHeader title="文件资源管理" desc="现场照片、巡检视频、检测报告等附件统一管理、预览与下载">
      <template #actions>
        <el-button type="primary" :icon="'Upload'" @click="uploadVisible = true">上传文件</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid stagger">
      <div class="kpi-card ag-card" v-for="(m, k) in { total: ['全部文件', summary.total], img: ['图片', summary.img], video: ['视频', summary.video], doc: ['文档', summary.doc] }" :key="k">
        <el-icon :size="22" :color="TYPE_META[k]?.color || 'var(--ag-green-600)'">
          <component :is="TYPE_META[k]?.icon || 'FolderOpened'" />
        </el-icon>
        <div>
          <b class="mono-num">{{ m[1] }}</b>
          <span class="text-dim">{{ m[0] }}</span>
        </div>
      </div>
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters" action-width="200">
      <template #col-name="{ row }">
        <span class="f-name">
          <span class="f-icon" :style="{ background: TYPE_META[row.type]?.color + '18', color: TYPE_META[row.type]?.color }">
            <el-icon><component :is="TYPE_META[row.type]?.icon" /></el-icon>
          </span>
          {{ row.name }}
        </span>
      </template>
      <template #col-type="{ row }">
        <el-tag size="small" effect="plain">{{ TYPE_META[row.type]?.label }}</el-tag>
      </template>
      <template #col-path="{ row }">
        <code class="f-path">{{ row.path }}</code>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" :icon="'View'" @click="preview(row)">预览</el-button>
        <el-button link type="success" :icon="'Download'" @click="download(row)">下载</el-button>
        <el-button link type="danger" @click="removeFile(row)">删除</el-button>
      </template>
    </ProTable>

    <el-dialog v-model="uploadVisible" title="上传文件" width="480px">
      <el-upload drag multiple action="#" :auto-upload="false" accept="image/*,video/*,.pdf">
        <el-icon :size="42" color="var(--ag-text-4)"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处，或 <em>点击选择文件</em></div>
        <template #tip>
          <div class="el-upload__tip">支持图片 / 视频 / PDF，单文件 ≤ 100MB</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="uploadVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleUpload">开始上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
}
.kpi-card b {
  display: block;
  font-size: 20px;
}
.kpi-card span {
  font-size: 12px;
}
.f-name {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-weight: 500;
}
.f-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--ag-radius); /* 决策依据：32px 图标块非控件，按卡片档归 10px */
  display: grid;
  place-items: center;
  flex: none;
}
.f-path {
  font-size: 11px;
  color: var(--ag-text-4);
  background: var(--ag-bg-hover);
  padding: 2px 8px;
  border-radius: 5px;
}
</style>
