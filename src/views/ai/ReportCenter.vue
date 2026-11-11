<script setup>
/** 页面 37 · 报表中心：环境/水肥/设备/农事/采收报表预览、PDF/Excel 导出 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable } from '@/components/ui'
import { aiApi } from '@/api'
import { downloadCsv, downloadPdf } from '@/utils/exportFile'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)

const FMT_META = cfg.reportFmtMeta
const TYPE_ICON = cfg.reportTypeIcon

const columns = [
  { prop: 'name', label: '报表名称', minWidth: 250 },
  { prop: 'type', label: '类型', width: 110, align: 'center' },
  { prop: 'cycle', label: '周期', width: 80, align: 'center' },
  { prop: 'time', label: '生成时间', width: 165 },
  { prop: 'size', label: '大小', width: 85, align: 'right' },
  { prop: 'fmt', label: '格式', width: 85, align: 'center' },
]

/* 生成报表配置 */
const GEN_TYPES = cfg.reportGenTypes
const genForm = ref({ type: '环境报表', cycle: '月报', range: ['2026-10-01', '2026-10-31'], fmt: 'PDF' })
const genDialog = ref(false)
const generating = ref(false)

async function preview(row) {
  const c = row.content || { headers: [], rows: [] }
  const head = c.headers.map((h) => `<th style="padding:6px 10px;background:#EEF2EC;font-weight:600;white-space:nowrap">${h}</th>`).join('')
  const body = c.rows.slice(0, 8).map((r) => `<tr>${r.map((v) => `<td style="padding:6px 10px;border-bottom:1px solid #E6E9E6;white-space:nowrap">${v ?? ''}</td>`).join('')}</tr>`).join('')
  await ElMessageBox.alert(
    `<div style="font-size:13px;line-height:1.9;color:#4A545E">
      <b>${row.name}</b><br/>
      <span style="color:#6b7380">类型：${row.type}（${row.cycle}） · 生成时间：${row.time} · 共 ${c.rows.length} 条数据</span>
      <div style="margin-top:10px;max-height:320px;overflow:auto;border:1px solid #E6E9E6;border-radius:8px">
        <table style="border-collapse:collapse;font-size:12px;width:100%">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${c.rows.length > 8 ? '<span style="color:#9AA4AE;font-size:11px">仅预览前 8 条，完整数据请下载报表</span>' : ''}
    </div>`,
    '报表预览',
    { dangerouslyUseHTMLString: true, confirmButtonText: '关闭预览', customClass: 'report-preview' }
  ).catch(() => {})
}
function download(row) {
  const c = row.content
  if (!c || !c.rows?.length) {
    ElMessage.warning('该报表暂无可导出的数据')
    return
  }
  try {
    if (row.fmt === 'Excel') {
      downloadCsv(row.name, c.headers, c.rows, [`${row.type} · ${row.cycle}`, `生成时间：${row.time} · 共 ${c.rows.length} 条`])
    } else {
      downloadPdf(row.name, { title: row.name, meta: `${row.type} · ${row.cycle} · 生成于 ${row.time} · 共 ${c.rows.length} 条`, headers: c.headers, rows: c.rows })
    }
    ElMessage.success(`《${row.name}》${row.fmt} 已开始下载`)
  } catch (e) {
    ElMessage.error(e.message || '报表下载失败')
  }
}
async function generate() {
  generating.value = true
  try {
    const [start, end] = genForm.value.range || []
    const name = `${genForm.value.type}（${genForm.value.cycle}${start ? ` · ${start} 至 ${end}` : ''}）`
    await aiApi.createReport({ name, type: genForm.value.type, cycle: genForm.value.cycle, range: genForm.value.range, fmt: genForm.value.fmt })
    genDialog.value = false
    ElMessage.success(`${genForm.value.type}（${genForm.value.cycle}）已生成，可在列表下载`)
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message || '报表生成失败')
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="报表中心" desc="环境、水肥、设备、农事、采收多维报表，支持 PDF / Excel 导出">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="genDialog = true">生成报表</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="aiApi.reports" :page-size="10" action-width="170">
      <template #col-name="{ row }">
        <span class="r-name">
          <span class="r-icon"><el-icon><component :is="TYPE_ICON[row.type] || 'Document'" /></el-icon></span>
          {{ row.name }}
        </span>
      </template>
      <template #col-fmt="{ row }">
        <el-tag size="small" :type="FMT_META[row.fmt]?.tag" effect="light">{{ row.fmt }}</el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" :icon="'View'" @click="preview(row)">预览</el-button>
        <el-button link type="success" :icon="'Download'" @click="download(row)">下载</el-button>
      </template>
    </ProTable>

    <!-- 生成报表 -->
    <el-dialog v-model="genDialog" title="生成报表" width="480px">
      <el-form label-width="90px">
        <el-form-item label="报表类型">
          <el-select v-model="genForm.type" style="width: 100%">
            <el-option v-for="t in GEN_TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计周期">
          <el-radio-group v-model="genForm.cycle">
            <el-radio-button value="周报">周报</el-radio-button>
            <el-radio-button value="月报">月报</el-radio-button>
            <el-radio-button value="季报">季报</el-radio-button>
            <el-radio-button value="年报">年报</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker v-model="genForm.range" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" style="width: 100%" />
        </el-form-item>
        <el-form-item label="导出格式">
          <el-radio-group v-model="genForm.fmt">
            <el-radio value="PDF">PDF 文档</el-radio>
            <el-radio value="Excel">Excel 表格</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="genDialog = false">取 消</el-button>
        <el-button type="primary" :loading="generating" @click="generate">开始生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.r-name {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}
.r-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--ag-radius); /* 决策依据：32px 图标块非控件，按卡片档归 10px */
  background: var(--ag-green-50);
  color: var(--ag-green-600);
  display: grid;
  place-items: center;
  flex: none;
}
</style>
