<script setup>
/** 页面 50 · 文件资源管理：上传图片、视频、附件统一管理、预览、下载 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable } from '@/components/ui'
import { sysApi } from '@/api'
import { downloadBlob } from '@/utils/exportFile'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const uploadVisible = ref(false)
const fileList = ref([])
const uploading = ref(false)
const summary = ref({ total: 0, img: 0, video: 0, doc: 0 })

const TYPE_META = cfg.fileTypeMeta

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
async function refreshSummary() {
  try {
    const res = await sysApi.files({ page: 1, size: 1000 })
    summary.value = {
      total: res.total,
      img: res.list.filter((f) => f.type === 'img').length,
      video: res.list.filter((f) => f.type === 'video').length,
      doc: res.list.filter((f) => f.type === 'doc').length,
    }
  } catch (e) {
    console.warn('[FileResource]', e?.message || e)
  }
}
onMounted(refreshSummary)

function typeOf(file) {
  const name = file.name.toLowerCase()
  if (file.type?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(name)) return 'img'
  if (file.type?.startsWith('video') || /\.(mp4|avi|mov|mkv|webm)$/.test(name)) return 'video'
  return 'doc'
}
function sizeText(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
function baseName(name) {
  return String(name).replace(/\.(\w+)$/, '')
}

/* 真实下载：演示环境无原始二进制，按类型生成可打开的真实文件（图片/视频封面为 PNG，文档为 TXT） */
function download(row) {
  try {
    if (row.type === 'img' || row.type === 'video') {
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 450
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#1c2a3c'
      ctx.fillRect(0, 0, 800, 450)
      ctx.fillStyle = '#699c78'
      ctx.fillRect(0, 340, 800, 110)
      ctx.fillStyle = '#ffffff'
      ctx.font = '700 30px "Microsoft YaHei", sans-serif'
      ctx.fillText(row.type === 'img' ? '现场照片' : '巡检视频封面', 48, 120)
      ctx.font = '20px "Microsoft YaHei", sans-serif'
      ctx.fillStyle = '#cfe3d4'
      ctx.fillText(row.name, 48, 170)
      ctx.fillText(`${row.related} · ${row.uploadBy} · ${row.time}`, 48, 210)
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(`${baseName(row.name)}.png`, blob)
      }, 'image/png')
    } else {
      const content = [
        `文件名称：${row.name}`,
        `文件类型：${TYPE_META[row.type]?.label || row.type}`,
        `文件大小：${row.size}`,
        `关联业务：${row.related}`,
        `上传人员：${row.uploadBy}`,
        `上传时间：${row.time}`,
        `存储路径：${row.path}`,
        '',
        '（演示环境导出文件信息，生产环境将下载原始文件流）',
      ].join('\r\n')
      downloadBlob(`${baseName(row.name)}.txt`, new Blob([content], { type: 'text/plain;charset=utf-8' }))
    }
    ElMessage.success(`「${row.name}」已开始下载`)
  } catch (e) {
    ElMessage.error(`下载失败：${e.message}`)
  }
}
async function removeFile(row) {
  try {
    await ElMessageBox.confirm(`确定删除文件「${row.name}」吗？删除后不可恢复。`, '删除确认', { type: 'error' })
  } catch {
    return
  }
  try {
    await sysApi.removeFile(row.id)
    ElMessage.success('文件已删除')
    tableRef.value?.reload(true)
    refreshSummary()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
async function handleUpload() {
  if (!fileList.value.length) {
    ElMessage.warning('请先选择要上传的文件')
    return
  }
  uploading.value = true
  try {
    for (const f of fileList.value) {
      const raw = f.raw || f
      await sysApi.uploadFile({
        name: raw.name,
        type: typeOf(raw),
        size: sizeText(raw.size),
        related: '文件资源',
        uploadBy: '当前用户',
        path: `/upload/${new Date().toISOString().slice(0, 10).replace(/-/g, '/')}/${raw.name}`,
      })
    }
    ElMessage.success(`已上传 ${fileList.value.length} 个文件`)
    uploadVisible.value = false
    fileList.value = []
    tableRef.value?.reload(true)
    refreshSummary()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    uploading.value = false
  }
}

function preview(row) {
  ElMessageBox.alert(
    `<div style="text-align:center;padding:10px">
      <div style="width:220px;height:140px;border-radius:12px;background:${row.type === 'img' ? 'linear-gradient(135deg,#5c85f5,#074ce0)' : row.type === 'video' ? 'linear-gradient(135deg,#D6E6F2,#4C6983)' : 'linear-gradient(135deg,#F3DFA6,#c9803e)'};margin:0 auto 12px;display:grid;place-items:center;font-size:20px;font-weight:600;color:#fff">
        ${row.type === 'img' ? '图片' : row.type === 'video' ? '视频' : '文档'}
      </div>
      <b>${row.name}</b><br/>
      <span style="color:#6b7380;font-size:12px">${row.size} · ${row.path}</span>
    </div>`,
    '文件预览',
    { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' }
  ).catch(() => {})
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
      <el-upload v-model:file-list="fileList" drag multiple action="#" :auto-upload="false" accept="image/*,video/*,.pdf">
        <el-icon :size="42" color="var(--ag-text-4)"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处，或 <em>点击选择文件</em></div>
        <template #tip>
          <div class="el-upload__tip">支持图片 / 视频 / PDF，单文件 ≤ 100MB</div>
        </template>
      </el-upload>
      <template #footer>
        <el-button @click="uploadVisible = false">取 消</el-button>
        <el-button type="primary" :loading="uploading" @click="handleUpload">开始上传</el-button>
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
