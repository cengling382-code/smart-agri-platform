<script setup>
/** 页面 56 · 农事与采收统计大屏：农事进度看板、产量统计图表、动态更新 */
import { ref, computed, onMounted } from 'vue'
import ScreenChart from '@/components/ui/ScreenChart.vue'
import CountUp from '@/components/ui/CountUp.vue'
import { darkBase, darkAxis, SCREEN_COLORS } from '@/utils/screenCharts'
import { farmApi } from '@/api'
import { getConfig } from '@/data/configStore'
import { onDataChange } from '@/composables/useDataVersion'

const cfg = getConfig('screens')

/**
 * 修复（页面 56 显示异常）：
 * data/config/screens.json 未定义 farmColors，原代码 `const FARM_COLORS = cfg.farmColors`
 * 得到 undefined；模板渲染农事计划时执行 FARM_COLORS[pl.type]，第一条计划
 * type 为「施肥」即抛出 TypeError: Cannot read properties of undefined (reading '施肥')，
 * 被 ErrorBoundary 捕获后整页降级。
 * 这里改为「本地默认配色 + 配置覆盖」的 computed：配置缺字段时用默认值，
 * 后续配置补齐或热更新时自动采用配置值，不改变原有配色驱动的业务逻辑。
 */
const DEFAULT_FARM_COLORS = {
  播种: '#7DC383', 移栽: '#9FC3DD', 施肥: '#FFB37B', 打药: '#E84A5F',
  除草: '#B17179', 采收: '#FFF199', 灌溉: '#8FB3CC', 修剪: '#B17179',
}
const DEFAULT_KPI_META = {
  total: { label: '年度采收总量', unit: 'kg', color: '#7DC383' },
  batches: { label: '采收批次', unit: '批', color: '#9FC3DD' },
  avg: { label: '批均产量', unit: 'kg', color: '#FFB37B' },
  orders: { label: '进行中工单', unit: '个', color: '#E84A5F' },
}
const DEFAULT_PROGRESS = [
  { name: '东大田A区 · 水稻', stage: '接近采收', pct: 92, color: '#FFB37B' },
  { name: '1号智能大棚 · 番茄', stage: '结果期', pct: 68, color: '#7DC383' },
  { name: '西山坡果园 · 柑橘', stage: '挂果期', pct: 55, color: '#E89552' },
  { name: '2号智能大棚 · 黄瓜', stage: '开花期', pct: 42, color: '#9FC3DD' },
  { name: '3号育苗棚 · 生菜', stage: '育苗期', pct: 18, color: '#B17179' },
]
const FALLBACK_COLOR = '#8FB3CC'
const EMPTY_STATS = { total: 0, batches: 0, avg: 0, byMonth: [], byPlot: [] }

const stats = ref({ ...EMPTY_STATS })
const plans = ref([])

const FARM_COLORS = computed(() => ({ ...DEFAULT_FARM_COLORS, ...(cfg.farmColors || {}) }))
const KPI_META = computed(() => cfg.farmKpiMeta || DEFAULT_KPI_META)
const PROGRESS = computed(() => (Array.isArray(cfg.farmProgress) ? cfg.farmProgress : DEFAULT_PROGRESS))
/** 只返回 6 位 hex，保证模板里拼接 '22' 透明度后仍是合法颜色 */
function planColor(type) {
  const c = FARM_COLORS.value[type] || FALLBACK_COLOR
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : FALLBACK_COLOR
}
function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const monthRows = computed(() => (Array.isArray(stats.value?.byMonth) ? stats.value.byMonth : []))
const plotRows = computed(() => (Array.isArray(stats.value?.byPlot) ? stats.value.byPlot : []))

const monthOptions = computed(() => ({
  ...darkBase,
  tooltip: { ...darkBase.tooltip, trigger: 'axis' },
  grid: { left: 8, right: 14, top: 30, bottom: 0, containLabel: true },
  xAxis: darkAxis({ type: 'category', data: monthRows.value.map((m) => m.month) }),
  yAxis: darkAxis({ type: 'value', name: 'kg' }),
  series: [{
    type: 'bar', barWidth: 20,
    data: monthRows.value.map((m) => ({
      value: m.value,
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#9FC3DD' }, { offset: 1, color: 'rgba(159,195,221,.1)' }] }, borderRadius: [4, 4, 0, 0] },
    })),
  }],
}))

const plotOptions = computed(() => ({
  ...darkBase,
  tooltip: { ...darkBase.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 20, top: 20, bottom: 0, containLabel: true },
  xAxis: darkAxis({ type: 'value' }),
  yAxis: darkAxis({ type: 'category', data: plotRows.value.slice(0, 6).map((p) => p.name).reverse() }),
  series: [{
    type: 'bar', barWidth: 14,
    data: plotRows.value.slice(0, 6).reverse().map((p, i) => ({
      value: p.value, itemStyle: { color: SCREEN_COLORS[i % SCREEN_COLORS.length], borderRadius: [0, 4, 4, 0] },
    })),
  }],
}))

const KPI = computed(() => {
  const meta = KPI_META.value
  const orders = plans.value.filter((p) => p.status === '已审批' || p.status === '进行中').length
  return [
    { ...(meta.total || {}), value: num(stats.value?.total) },
    { ...(meta.batches || {}), value: num(stats.value?.batches) },
    { ...(meta.avg || {}), value: num(stats.value?.avg) },
    { ...(meta.orders || {}), value: orders },
  ]
})

onMounted(load)
onDataChange(load, { debounce: 400 })

let loading = false
/**
 * 数据加载：两个接口并行取回，统一赋值；任何一步失败都保留上一次成功的数据，
 * 避免异步异常冒泡为整页错误、或数据半更新造成的空白与闪烁。
 * loading 标志防止数据版本高频变更时的并发重复刷新。
 */
async function load() {
  if (loading) return
  loading = true
  try {
    const [s, res] = await Promise.all([
      farmApi.harvestStats(),
      farmApi.planPage({ page: 1, size: 8 }),
    ])
    stats.value = {
      ...EMPTY_STATS,
      ...(s && typeof s === 'object' ? s : {}),
      byMonth: Array.isArray(s?.byMonth) ? s.byMonth : [],
      byPlot: Array.isArray(s?.byPlot) ? s.byPlot : [],
    }
    const list = Array.isArray(res?.list) ? res.list : (Array.isArray(res) ? res : [])
    plans.value = list
  } catch (e) {
    console.warn('[农事采收大屏] 数据加载失败，沿用上次结果：', e?.message || e)
  } finally {
    loading = false
  }
}
</script>

<template>
  <div class="screen-farm">
    <!-- KPI -->
    <div class="kpi-row">
      <div v-for="k in KPI" :key="k.label" class="screen-panel kpi-item">
        <span class="k-val mono-num" :style="{ color: k.color }"><CountUp :value="k.value" /></span>
        <span class="k-label">{{ k.label }} <i>{{ k.unit }}</i></span>
      </div>
    </div>

    <div class="main-grid">
      <!-- 左：农事进度看板 -->
      <div class="screen-panel panel">
        <div class="p-title">作物生长进度看板</div>
        <div class="progress-list">
          <div v-for="p in PROGRESS" :key="p.name" class="pr-row">
            <div class="pr-head">
              <b>{{ p.name }}</b>
              <span class="pr-stage" :style="{ color: p.color, borderColor: p.color }">{{ p.stage }}</span>
            </div>
            <div class="pr-bar"><i :style="{ width: p.pct + '%', background: `linear-gradient(90deg, ${p.color}88, ${p.color})` }"></i></div>
            <span class="pct mono-num">{{ p.pct }}%</span>
          </div>
        </div>
        <div class="p-title" style="margin-top: 16px">最新农事计划</div>
        <div class="plan-list">
          <div v-for="pl in plans.slice(0, 5)" :key="pl.id" class="plan-row">
            <span class="plan-type" :style="{ background: planColor(pl.type) + '22', color: planColor(pl.type) }">{{ pl.type }}</span>
            <span class="plan-name">{{ pl.plotName }}</span>
            <span class="plan-date mono-num">{{ pl.planDate }}</span>
            <span class="plan-status" :class="{ done: pl.status === '已完成' }">{{ pl.status }}</span>
          </div>
        </div>
      </div>

      <!-- 中：月度产量 -->
      <div class="screen-panel panel">
        <div class="p-title">月度采收产量（kg）</div>
        <div class="chart-wrap"><ScreenChart :options="monthOptions" /></div>
      </div>

      <!-- 右：地块产量对比 -->
      <div class="screen-panel panel">
        <div class="p-title">地块产量对比（kg）</div>
        <div class="chart-wrap"><ScreenChart :options="plotOptions" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen-farm {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  flex: none;
}
.kpi-item {
  padding: 14px 18px;
}
.k-val {
  font-size: 30px;
  font-weight: 800;
  display: block;
}
.k-label {
  font-size: 12px;
  color: var(--ag-screen-text-dim);
}
.k-label i {
  font-style: normal;
  font-size: 11px;
}
.main-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  gap: 14px;
  min-height: 0;
}
.panel {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.p-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ag-screen-text);
  letter-spacing: 2px;
  padding-left: 10px;
  border-left: 3px solid var(--ag-screen-green);
  margin-bottom: 12px;
  flex: none;
}
.chart-wrap {
  flex: 1;
  min-height: 0;
}
.progress-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pr-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pr-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 250px;
  flex: none;
}
.pr-head b {
  font-size: 12.5px;
  color: var(--ag-screen-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pr-stage {
  font-size: 10px;
  border: 1px solid;
  border-radius: var(--ag-radius-sm); /* 决策依据：阶段标签属小控件，对齐控件档 6px */
  padding: 0 6px;
  flex: none;
}
.pr-bar {
  flex: 1;
  height: 9px;
  border-radius: 5px;
  background: rgba(143, 182, 216, 0.12);
  overflow: hidden;
}
.pr-bar i {
  display: block;
  height: 100%;
  border-radius: 5px;
  transition: width 1.2s var(--ag-ease);
}
.pct {
  width: 44px;
  text-align: right;
  color: var(--ag-screen-text-dim);
  font-size: 12px;
}
.plan-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.plan-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.plan-type {
  padding: 1px 8px;
  border-radius: 7px;
  font-weight: 600;
  flex: none;
}
.plan-name {
  flex: 1;
  color: var(--ag-screen-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.plan-date {
  color: var(--ag-screen-text-dim);
}
.plan-status {
  color: var(--ag-screen-text-dim);
}
.plan-status.done {
  color: var(--ag-screen-green);
}
</style>
