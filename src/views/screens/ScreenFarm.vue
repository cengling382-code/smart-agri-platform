<script setup>
/** 页面 56 · 农事与采收统计大屏：农事进度看板、产量统计图表、动态更新 */
import { ref, computed, onMounted } from 'vue'
import ScreenChart from '@/components/ui/ScreenChart.vue'
import CountUp from '@/components/ui/CountUp.vue'
import { darkBase, darkAxis, SCREEN_COLORS } from '@/utils/screenCharts'
import { farmApi } from '@/api'

const stats = ref(null)
const plans = ref([])

const FARM_COLORS = { 播种: '#7DC383', 施肥: '#FFB37B', 打药: '#E84A5F', 灌溉: '#9FC3DD', 采收: '#B17179', 除草: '#8FB3CC', 移栽: '#E89552' }

const monthOptions = computed(() => ({
  ...darkBase,
  tooltip: { ...darkBase.tooltip, trigger: 'axis' },
  grid: { left: 8, right: 14, top: 30, bottom: 0, containLabel: true },
  xAxis: darkAxis({ type: 'category', data: stats.value?.byMonth?.map((m) => m.month) || [] }),
  yAxis: darkAxis({ type: 'value', name: 'kg' }),
  series: [{
    type: 'bar', barWidth: 20,
    data: (stats.value?.byMonth || []).map((m, i) => ({
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
  yAxis: darkAxis({ type: 'category', data: (stats.value?.byPlot || []).slice(0, 6).map((p) => p.name).reverse() }),
  series: [{
    type: 'bar', barWidth: 14,
    data: (stats.value?.byPlot || []).slice(0, 6).reverse().map((p, i) => ({
      value: p.value, itemStyle: { color: SCREEN_COLORS[i % SCREEN_COLORS.length], borderRadius: [0, 4, 4, 0] },
    })),
  }],
}))

const KPI = computed(() => [
  { label: '年度采收总量', value: stats.value?.total || 0, unit: 'kg', color: '#7DC383' },
  { label: '采收批次', value: stats.value?.batches || 0, unit: '批', color: '#9FC3DD' },
  { label: '批均产量', value: stats.value?.avg || 0, unit: 'kg', color: '#FFB37B' },
  { label: '进行中工单', value: 6, unit: '个', color: '#E84A5F' },
])

const PROGRESS = [
  { name: '东大田A区 · 水稻', stage: '接近采收', pct: 92, color: '#FFB37B' },
  { name: '1号智能大棚 · 番茄', stage: '结果期', pct: 68, color: '#7DC383' },
  { name: '西山坡果园 · 柑橘', stage: '挂果期', pct: 55, color: '#E89552' },
  { name: '2号智能大棚 · 黄瓜', stage: '开花期', pct: 42, color: '#9FC3DD' },
  { name: '3号育苗棚 · 生菜', stage: '育苗期', pct: 18, color: '#B17179' },
]

onMounted(async () => {
  stats.value = await farmApi.harvestStats()
  const res = await farmApi.planPage({ page: 1, size: 8 })
  plans.value = res.list
})
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
            <span class="plan-type" :style="{ background: (FARM_COLORS[pl.type] || '#8FB3CC') + '22', color: FARM_COLORS[pl.type] || '#8FB3CC' }">{{ pl.type }}</span>
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
