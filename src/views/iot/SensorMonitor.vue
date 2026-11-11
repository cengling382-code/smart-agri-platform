<script setup>
/** 页面 13 · 传感器数据监测：环境实时数据表格、多地块/大棚切换、趋势曲线图表 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ChartCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { plotApi, deviceApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const plots = ref([])
const activePlotId = ref(null)
const loading = ref(true)
const series = ref([])
const autoRefresh = ref(true)
let refreshTimer = null

const PARAMS = cfg.sensorParams

const activePlot = computed(() => plots.value.find((p) => p.id === activePlotId.value))

/** 当前地块的实时环境指标（若无该参数则显示 —） */
const envCards = computed(() => {
  const e = activePlot.value?.env || {}
  return PARAMS.map((p) => ({
    ...p,
    value: e[p.key] ?? null,
  })).filter((p) => p.value !== null || ['temp', 'hum', 'co2', 'light'].includes(p.key))
})

const multiTrend = ref([]) // [{param, meta, arr}]

const trendOptions = computed(() => {
  if (!multiTrend.value.length) return {}
  return {
    color: CHART_COLORS,
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#6b7380' } },
    grid: { left: 10, right: 16, top: 36, bottom: 4, containLabel: true },
    xAxis: { type: 'time', axisLabel: { formatter: '{MM}-{dd} {HH}:{mm}' } },
    yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: '#eef0f3' } } },
    dataZoom: [{ type: 'inside' }],
    series: multiTrend.value.map((s, i) => ({
      name: `${s.meta.name}(${s.meta.unit || '-'})`,
      type: 'line', smooth: true, showSymbol: false, data: s.arr,
      lineStyle: { width: 2.2, color: CHART_COLORS[i % CHART_COLORS.length] },
    })),
  }
})

async function loadAll() {
  if (!plots.value.length) plots.value = await plotApi.all()
  if (!plots.value.length) {
    activePlotId.value = null
    multiTrend.value = []
    loading.value = false
    return
  }
  if (!activePlotId.value) activePlotId.value = plots.value[0].id
  await loadSeries()
}
async function loadSeries() {
  loading.value = true
  try {
    const plot = activePlot.value
    if (!plot) {
      multiTrend.value = []
      return
    }
    const keys = (plot?.type === '水产' ? ['oxygen'] : plot?.type === '畜禽' ? ['nh3'] : ['temp', 'hum', 'co2', 'light']).filter(Boolean)
    const res = await Promise.all(keys.map((k, i) => deviceApi.series(100 + i * 7 + (plot?.id || 1), k, 72)))
    // 接口返回 { meta, series: [[t,v],...] }，统一映射为页面使用的 { param, meta, arr }
    multiTrend.value = res.map((r, i) => ({ param: keys[i], meta: r?.meta || { name: keys[i] }, arr: r?.series || [] }))
  } catch (e) {
    console.warn('[SensorMonitor]', e?.message || e)
  } finally {
    loading.value = false
  }
}

function switchPlot(id) {
  activePlotId.value = id
  loadSeries()
}
function toggleAuto() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (autoRefresh.value) refreshTimer = setInterval(loadSeries, 15000)
}

const pad2 = (n) => String(n).padStart(2, '0')
const csvTime = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 导出当前地块近 72 小时趋势数据 */
function exportCsv() {
  if (!multiTrend.value.length) {
    ElMessage.warning('暂无可导出的环境数据')
    return
  }
  const rows = [['地块', '监测指标', '单位', '时间', '数值']]
  multiTrend.value.forEach((s) => {
    const meta = s.meta || {}
    ;(s.arr || []).forEach(([t, v]) => {
      rows.push([activePlot.value?.name || '', meta.name || s.param, meta.unit || '', csvTime(t), v])
    })
  })
  const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `环境监测_${activePlot.value?.name || '地块'}_${csvTime(Date.now()).replace(/[-: ]/g, '')}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  const count = multiTrend.value.reduce((n, s) => n + (s.arr?.length || 0), 0)
  ElMessage.success(`已导出 ${count} 条环境数据`)
}

onMounted(async () => {
  await loadAll()
  if (autoRefresh.value) toggleAuto()
})
onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<template>
  <div class="page">
    <PageHeader title="传感器数据监测" desc="多地块/大棚环境实时数据与趋势曲线对比，支持自动刷新">
      <template #actions>
        <div class="flex gap-8 items-center">
          <el-switch v-model="autoRefresh" active-text="自动刷新" @change="toggleAuto" />
          <el-button :icon="'Refresh'" @click="loadSeries" circle aria-label="手动刷新" />
        </div>
      </template>
    </PageHeader>

    <el-empty v-if="!loading && !plots.length" description="暂无地块数据，请先在地块档案中新建地块" />

    <template v-else-if="plots.length">
      <!-- 地块切换器 -->
      <div class="plot-switch stagger">
        <button
          v-for="p in plots"
          :key="p.id"
          class="p-chip"
          :class="{ active: p.id === activePlotId }"
          @click="switchPlot(p.id)"
        >
          <span class="p-type">{{ p.type }}</span>
          <span class="p-name">{{ p.name }}</span>
        </button>
      </div>

      <!-- 实时指标卡 -->
      <div class="env-cards stagger" v-loading="loading">
        <div v-for="p in envCards" :key="p.key" class="e-card ag-card ag-card--hover">
          <div class="e-head">
            <el-icon :size="18" :color="p.color"><component :is="p.icon" /></el-icon>
            <span class="e-name">{{ p.label }}</span>
          </div>
          <div class="e-val mono-num">{{ p.value ?? '—' }}<small>{{ p.unit }}</small></div>
          <div class="e-bar">
            <i :style="{ width: Math.min(100, Math.abs(p.value || 0) / (p.key === 'co2' ? 8 : p.key === 'light' ? 0.8 : 1)) + '%', background: p.color }"></i>
          </div>
        </div>
      </div>

      <!-- 趋势对比 -->
      <div class="ag-card anim-up">
        <div class="ag-card__head">
          <div class="ag-card__title"><span class="dot"></span>{{ activePlot?.name }} · 近 72 小时趋势（多参数对比）</div>
          <el-button link type="primary" :icon="'Download'" @click="exportCsv">导出 CSV</el-button>
        </div>
        <div class="ag-card__body">
          <ChartCard :options="trendOptions" :height="340" :loading="loading" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.plot-switch {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.p-chip {
  border: none;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius-sm); /* 点位筛选 chip 属小控件，对齐控件档 8px */
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  transition: all 0.22s var(--ag-ease);
}
.p-chip:hover {
  background: var(--ag-green-50);
  transform: translateY(-1px);
}
.p-chip.active {
  background: var(--ag-green-600);
}
.p-chip.active .p-type,
.p-chip.active .p-name {
  color: #fff;
}
.p-type {
  font-size: 10px;
  color: var(--ag-text-4);
  letter-spacing: 1px;
}
.p-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ag-text-1);
}
.env-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
  margin-bottom: 20px;
  min-height: 120px;
}
.e-card {
  padding: 14px 16px;
}
.e-head {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--ag-text-2);
  font-size: 12px;
}
.e-val {
  font-size: 27px;
  font-weight: 800;
  color: var(--ag-text-1);
  margin: 6px 0;
}
.e-val small {
  font-size: 12px;
  color: var(--ag-text-4);
  font-weight: 400;
  margin-left: 4px;
}
.e-bar {
  height: 5px;
  border-radius: 3px;
  background: var(--ag-border-light);
  overflow: hidden;
}
.e-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s var(--ag-ease);
}
</style>
