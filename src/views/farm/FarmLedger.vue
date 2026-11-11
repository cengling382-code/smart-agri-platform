<script setup>
/** 页面 26 · 农事台账查询：历史农事记录、多条件筛选、时间线展示、导出 Excel */
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ProTable } from '@/components/ui'
import { farmApi } from '@/api'
import { downloadCsv } from '@/utils/exportFile'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const viewMode = ref('table') // table | timeline
const timelineRecords = ref([])

const TYPE_TAG = cfg.farmTypeTag

const columns = [
  { prop: 'code', label: '记录编号', width: 115 },
  { prop: 'time', label: '作业时间', width: 160 },
  { prop: 'type', label: '农事类型', width: 95, align: 'center' },
  { prop: 'plotName', label: '地块', minWidth: 130 },
  { prop: 'crop', label: '作物', width: 85 },
  { prop: 'operator', label: '作业人员', width: 95 },
  { prop: 'hours', label: '工时(h)', width: 85, align: 'right' },
  { prop: 'material', label: '物料消耗', minWidth: 150 },
  { prop: 'photos', label: '照片', width: 70, align: 'center', className: 'col-photos' },
  { prop: 'result', label: '作业结果', minWidth: 130 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '编号 / 地块 / 人员' },
  { key: 'type', label: '农事类型', type: 'select', options: Object.keys(TYPE_TAG).map((t) => ({ label: t, value: t })) },
]

const lastParams = ref({})
async function loadTable(params) {
  lastParams.value = params
  return farmApi.ledger(params)
}
async function loadTimeline() {
  try {
    // 时间线沿用表格最后一次的筛选条件，切换视图后结果保持一致
    const res = await farmApi.ledger({ ...lastParams.value, page: 1, size: 10 })
    timelineRecords.value = res.list
  } catch (e) {
    console.warn('[FarmLedger]', e?.message || e)
  }
}
watch(viewMode, (v) => { if (v === 'timeline') loadTimeline() })

const exporting = ref(false)
async function exportExcel() {
  exporting.value = true
  try {
    // 导出当前筛选条件下的全量记录，数据直接取自本地 JSON 库
    const res = await farmApi.ledger({ ...lastParams.value, page: 1, size: 10000 })
    const rows = res.list.map((r) => [r.code, r.time, r.type, r.plotName, r.crop, r.operator, r.hours, r.material, r.photos, r.result])
    downloadCsv(
      '农事台账',
      ['记录编号', '作业时间', '农事类型', '地块', '作物', '作业人员', '工时(h)', '物料消耗', '照片数', '作业结果'],
      rows,
      [`农事台账导出 · 共 ${res.total ?? rows.length} 条`, `筛选关键字：${lastParams.value.keyword || '全部'}；农事类型：${lastParams.value.type || '全部'}`]
    )
    ElMessage.success(`已导出 ${rows.length} 条农事记录`)
  } catch (e) {
    ElMessage.error(e.message || '导出失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

</script>

<template>
  <div class="page">
    <PageHeader title="农事台账查询" desc="农事全周期历史记录，多条件筛选，支持时间线展示与 Excel 导出">
      <template #actions>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="table">表格视图</el-radio-button>
          <el-radio-button value="timeline">时间线视图</el-radio-button>
        </el-radio-group>
        <el-button type="primary" plain :icon="'Download'" :loading="exporting" @click="exportExcel">导出 Excel</el-button>
      </template>
    </PageHeader>

    <ProTable v-if="viewMode === 'table'" ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters">
      <template #col-type="{ row }">
        <el-tag size="small" :type="TYPE_TAG[row.type] || 'info'" effect="plain">{{ row.type }}</el-tag>
      </template>
      <template #col-hours="{ row }">
        <span class="mono-num">{{ row.hours }}</span>
      </template>
      <template #col-photos="{ row }">
        <el-badge :value="row.photos" type="primary">
          <el-icon :size="18" color="var(--ag-text-3)"><Camera /></el-icon>
        </el-badge>
      </template>
    </ProTable>

    <!-- 时间线视图 -->
    <div v-else class="ag-card tl-card anim-up">
      <div class="ag-card__head">
        <div class="ag-card__title"><span class="dot"></span>农事全周期时间线（最新 10 条）</div>
        <el-button link type="primary" @click="loadTimeline">刷新</el-button>
      </div>
      <div class="ag-card__body">
        <el-timeline>
          <el-timeline-item
            v-for="r in timelineRecords"
            :key="r.id"
            :timestamp="r.time"
            :type="r.result === '正常完成' ? 'success' : 'warning'"
            placement="top"
            :hollow="true"
          >
            <div class="tl-item ag-card ag-card--hover">
              <div class="tli-head">
                <el-tag size="small" :type="TYPE_TAG[r.type] || 'info'" effect="plain">{{ r.type }}</el-tag>
                <b>{{ r.plotName }}</b>
                <span class="text-dim">{{ r.crop }}</span>
                <span class="tl-code text-dim mono-num">{{ r.code }}</span>
              </div>
              <div class="tl-meta">
                <span><el-icon><User /></el-icon>{{ r.operator }}</span>
                <span><el-icon><Timer /></el-icon>{{ r.hours }} 小时</span>
                <span v-if="r.material !== '—'"><el-icon><Box /></el-icon>{{ r.material }}</span>
                <span><el-icon><Camera /></el-icon>{{ r.photos }} 张照片</span>
              </div>
              <div class="tl-result">{{ r.result }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 照片列用 el-badge 展示照片数：角标需上浮到图标右上角，
   而 Element Plus 的 .cell 默认 overflow:hidden 会把圆的上半部分裁掉。
   仅对本列放开溢出（其它列仍保留长文本省略与 tooltip），并限制在 td 范围。 */
:deep(.el-table td.col-photos .cell) {
  overflow: visible !important;
}
.tl-card :deep(.el-timeline) {
  padding-left: 8px;
  max-height: 640px;
  overflow: auto;
}
.tl-item {
  padding: 12px 16px;
}
.tli-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tl-code {
  margin-left: auto;
}
.tl-meta {
  display: flex;
  gap: 20px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--ag-text-2);
  flex-wrap: wrap;
}
.tl-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tl-result {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ag-green-700);
}
</style>
