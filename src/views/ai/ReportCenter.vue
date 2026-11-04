<script setup>
/** 页面 37 · 报表中心：环境/水肥/设备/农事/采收报表预览、PDF/Excel 导出 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable } from '@/components/ui'
import { aiApi } from '@/api'

const tableRef = ref(null)

const FMT_META = {
  PDF: { tag: 'danger', icon: 'Document' },
  Excel: { tag: 'success', icon: 'Grid' },
}
const TYPE_ICON = { 环境报表: 'Cloudy', 水肥报表: 'Pouring', 设备报表: 'Cpu', 农事报表: 'Tickets', 采收报表: 'Apple', 告警报表: 'Bell' }

const columns = [
  { prop: 'name', label: '报表名称', minWidth: 250 },
  { prop: 'type', label: '类型', width: 110, align: 'center' },
  { prop: 'cycle', label: '周期', width: 80, align: 'center' },
  { prop: 'time', label: '生成时间', width: 165 },
  { prop: 'size', label: '大小', width: 85, align: 'right' },
  { prop: 'fmt', label: '格式', width: 85, align: 'center' },
]

/* 生成报表配置 */
const GEN_TYPES = ['环境报表', '水肥报表', '设备报表', '农事报表', '采收报表', '告警报表']
const genForm = ref({ type: '环境报表', cycle: '月报', range: ['2026-10-01', '2026-10-31'], fmt: 'PDF' })
const genDialog = ref(false)
const generating = ref(false)

async function preview(row) {
  await ElMessageBox.alert(
    `<div style="font-size:13px;line-height:2;color:#4A545E">
      <b>${row.name}</b><br/>
      <span style="color:#6b7380">类型：${row.type}（${row.cycle}）<br/>
      生成时间：${row.time} · 大小：${row.size}</span><br/>
      <div style="margin-top:8px;padding:12px;background:#F5F5F5;border-radius:8px">
        报表预览：<br/>
        ① 环境指标均值与峰值统计表<br/>
        ② 超阈值时段分析<br/>
        ③ 地块对比明细<br/>
        <span style="color:#9AA4AE;font-size:11px">（演示环境为预览示意，生产环境渲染完整报表）</span>
      </div>
    </div>`,
    '报表预览',
    { dangerouslyUseHTMLString: true, confirmButtonText: '关闭预览' }
  ).catch(() => {})
}
function download(row) {
  ElMessage.success(`《${row.name}》${row.fmt} 文件已开始下载（演示）`)
}
async function generate() {
  generating.value = true
  setTimeout(() => {
    generating.value = false
    genDialog.value = false
    ElMessage.success(`${genForm.value.type}（${genForm.value.cycle}）已生成，可在列表下载`)
    tableRef.value?.reload(true)
  }, 900)
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
