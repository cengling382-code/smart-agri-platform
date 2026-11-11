<script setup>
/** 页面 29 · 农资库存列表：库存查询、低库存预警、库存盘点、农药使用台账 */
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, StatCard } from '@/components/ui'
import { farmApi } from '@/api'
import { downloadCsv } from '@/utils/exportFile'

const tableRef = ref(null)
const onlyLow = ref(false)
const checkDialog = ref(false)
const checkList = ref([])

const columns = [
  { prop: 'code', label: '编号', width: 90 },
  { prop: 'name', label: '农资名称', minWidth: 200 },
  { prop: 'category', label: '类别', width: 85, align: 'center' },
  { prop: 'spec', label: '规格', width: 110 },
  { prop: 'supplier', label: '供应商', minWidth: 140 },
  { prop: 'stock', label: '当前库存', width: 100, align: 'center' },
  { prop: 'safeStock', label: '安全库存', width: 90, align: 'center' },
  { prop: 'ratio', label: '库存水位', width: 150 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '编号 / 名称 / 供应商' },
]

async function loadTable(params) {
  return farmApi.inventory({ ...params, onlyLow: onlyLow.value })
}

const summary = ref({ total: 0, low: 0, value: 0 })
async function loadSummary() {
  try {
    // 汇总需基于全量农资，避免分页截断导致品类/总价值少算
    const res = await farmApi.inventory({ page: 1, size: 10000 })
    summary.value.total = res.total ?? res.list.length
    summary.value.low = res.list.filter((m) => m.low).length
    summary.value.value = res.list.reduce((s, m) => s + m.stock * m.price, 0)
  } catch (e) {
    console.warn('[MaterialInventory]', e?.message || e)
  }
}
loadSummary()

async function startCheck() {
  const res = await farmApi.inventory({ page: 1, size: 100 })
  checkList.value = res.list.map((m) => ({ ...m, counted: m.stock, diff: 0 }))
  checkDialog.value = true
}
function diffOf(item) {
  item.diff = item.counted - item.stock
}
async function submitCheck() {
  const diffs = checkList.value.filter((m) => m.diff !== 0)
  try {
    await ElMessageBox.confirm(
      `盘点完成：共 ${checkList.value.length} 项，其中 ${diffs.length} 项存在差异${diffs.length ? '，将生成盘盈盘亏调整单' : ''}。确定提交盘点结果吗？`,
      '盘点确认', { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    // 差异项真实写入出入库记录，由服务端同步库存，不再只提示成功
    for (const m of diffs) {
      await farmApi.createStock({
        type: m.diff > 0 ? 'in' : 'out', materialId: m.id, materialName: m.name,
        qty: Math.abs(m.diff), operator: '库存盘点', supplier: m.supplier,
        reason: '盘盈盘亏调整', relatedOrder: '—',
      })
    }
    checkDialog.value = false
    ElMessage.success(diffs.length ? `盘点结果已提交，已生成 ${diffs.length} 条盘盈盘亏调整记录` : '盘点结果已提交，账实一致')
    tableRef.value?.reload(true)
    loadSummary()
  } catch (e) {
    ElMessage.error(e.message || '盘点提交失败')
  }
}

/* ---------- 农药使用台账：数据由农资档案 + 出入库 + 农事台账关联生成 ---------- */
const pestDialog = ref(false)
const pestLoading = ref(false)
const pestRows = ref([])

async function fetchPesticide() {
  pestLoading.value = true
  try {
    const res = await farmApi.pesticideLedger({ page: 1, size: 1000 })
    pestRows.value = res.list || []
    return pestRows.value
  } catch (e) {
    ElMessage.error(e.message || '农药使用台账加载失败')
    return []
  } finally {
    pestLoading.value = false
  }
}
async function openPesticide() {
  pestDialog.value = true
  await fetchPesticide()
}
async function exportPesticide() {
  const rows = await fetchPesticide()
  if (!rows.length) {
    ElMessage.warning('当前没有农药使用记录可导出')
    return
  }
  downloadCsv(
    '农药使用台账',
    ['使用日期', '农药名称', '用量', '地块', '作业人员', '安全间隔期(天)', '数据来源', '来源编号'],
    rows.map((r) => [r.date, r.name, r.qty, r.plotName, r.operator, r.safeInterval, r.source, r.code]),
    [`农药使用台账 · 共 ${rows.length} 条`, '安全间隔期依据《农药合理使用准则》，施药后须满足间隔期方可采收']
  )
  ElMessage.success(`已导出 ${rows.length} 条农药使用记录`)
}
</script>

<template>
  <div class="page">
    <PageHeader title="农资库存列表" desc="库存查询、低库存预警、库存盘点与农药使用台账（安全监管）">
      <template #actions>
        <el-switch v-model="onlyLow" active-text="仅看低库存" @change="tableRef?.reload()" />
        <el-button type="primary" plain :icon="'Finished'" @click="startCheck">库存盘点</el-button>
        <el-button plain :icon="'Document'" @click="openPesticide">农药使用台账</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid stagger">
      <StatCard label="农资品类" :value="summary.total" unit="种" icon="Box" tone="green" />
      <StatCard label="低库存预警" :value="summary.low" unit="项" icon="WarningFilled" tone="red" />
      <StatCard label="库存总价值" :value="summary.value" unit="元" icon="Coin" tone="amber" />
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters">
      <template #col-stock="{ row }">
        <span class="mono-num" :class="{ 'stock-low': row.low }">{{ row.stock }}</span>
        <el-tag v-if="row.low" size="small" type="danger" effect="light" style="margin-left: 6px">预警</el-tag>
      </template>
      <template #col-ratio="{ row }">
        <el-progress
          :percentage="row.ratio"
          :stroke-width="8"
          :show-text="false"
          :color="row.low ? '#E84A5F' : row.ratio < 50 ? '#c9803e' : '#558162'"
        />
      </template>
    </ProTable>

    <!-- 盘点弹窗 -->
    <el-dialog v-model="checkDialog" title="库存盘点（实盘录入）" width="680px" top="6vh">
      <el-alert type="info" :closable="false" show-icon title="按实际清点数量录入「实盘数」，系统自动计算差异" class="mb-12" />
      <el-table :data="checkList" size="small" max-height="420" border>
        <el-table-column prop="code" label="编号" width="85" />
        <el-table-column prop="name" label="农资名称" min-width="180" />
        <el-table-column prop="stock" label="账面库存" width="85" align="center" />
        <el-table-column label="实盘数" width="130" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.counted" size="small" :min="0" style="width: 110px" @change="diffOf(row)" />
          </template>
        </el-table-column>
        <el-table-column label="差异" width="80" align="center">
          <template #default="{ row }">
            <span class="mono-num" :style="{ color: row.diff > 0 ? 'var(--ag-success)' : row.diff < 0 ? 'var(--ag-danger)' : 'var(--ag-text-4)', fontWeight: 700 }">
              {{ row.diff > 0 ? '+' : '' }}{{ row.diff }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="checkDialog = false">取 消</el-button>
        <el-button type="primary" @click="submitCheck">提交盘点结果</el-button>
      </template>
    </el-dialog>

    <!-- 农药使用台账 -->
    <el-dialog v-model="pestDialog" title="农药使用台账（安全监管）" width="880px" top="8vh">
      <div class="pest-head">
        <span class="text-dim">数据来源：农药农资档案 + 出入库记录 + 农事台账打药记录，实时关联生成</span>
        <el-button type="primary" plain size="small" :icon="'Download'" @click="exportPesticide">导出 Excel</el-button>
      </div>
      <el-table v-loading="pestLoading" :data="pestRows" size="small" max-height="440" border>
        <el-table-column prop="date" label="使用日期" width="160" />
        <el-table-column prop="name" label="农药名称" min-width="150" />
        <el-table-column prop="qty" label="用量" min-width="120" />
        <el-table-column prop="plotName" label="地块" min-width="120" />
        <el-table-column prop="operator" label="作业人员" width="100" />
        <el-table-column prop="safeInterval" label="安全间隔期" width="95" align="center">
          <template #default="{ row }"><span class="mono-num">{{ row.safeInterval }} 天</span></template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="90" />
        <el-table-column prop="code" label="来源编号" width="130" />
      </el-table>
      <template #footer>
        <el-button @click="pestDialog = false">关 闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.stock-low {
  color: var(--ag-danger);
  font-weight: 700;
}
.pest-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
</style>
