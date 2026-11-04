<script setup>
/** 页面 33 · 数据分析总览：环境趋势、产量、水肥消耗综合图表仪表盘 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PageHeader, ChartCard, StatCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { deviceApi, farmApi, tradeApi, statsApi } from '@/api'

const router = useRouter()
const loading = ref(true)
const dash = ref(null)
const harvest = ref(null)
const sales = ref(null)

/* 水肥消耗（演示数据） */
const waterFert = {
  months: ['6月', '7月', '8月', '9月', '10月', '11月'],
  water: [420, 480, 560, 430, 380, 260],
  fert: [86, 102, 128, 95, 80, 42],
}
const waterFertOptions = computed(() => ({
  color: CHART_COLORS,
  tooltip: { trigger: 'axis' },
  legend: { top: 0, textStyle: { color: '#6b7380' } },
  grid: { left: 10, right: 16, top: 40, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: waterFert.months },
  yAxis: [
    { type: 'value', name: '水(m³)', splitLine: { lineStyle: { color: '#eef0f3' } } },
    { type: 'value', name: '肥(kg)', splitLine: { show: false } },
  ],
  series: [
    { name: '灌溉用水', type: 'bar', barWidth: 20, data: waterFert.water, itemStyle: { color: '#5E7F9A', borderRadius: [5, 5, 0, 0] } },
    { name: '施肥量', type: 'line', yAxisIndex: 1, smooth: true, data: waterFert.fert, lineStyle: { width: 2.5, color: '#074ce0' } },
  ],
}))

const envCompare = computed(() => {
  if (!dash.value) return {}
  const env = dash.value.env
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { color: '#6b7380' } },
    radar: {
      indicator: [
        { name: '温度(℃)', max: 35 }, { name: '湿度(%)', max: 100 }, { name: 'CO₂(ppm)', max: 700 },
        { name: '光照(klx)', max: 60 }, { name: 'PH', max: 8 },
      ],
      radius: '62%',
      splitArea: { areaStyle: { color: ['rgba(241,245,249,.4)', 'rgba(255,255,255,.6)'] } },
    },
    series: env.slice(0, 4).map((e, i) => ({
      type: 'radar', name: e.name, data: [[e.temp, e.hum, e.co2, e.light, e.ph || 7]],
      areaStyle: { color: CHART_COLORS[i] + '22' },
      lineStyle: { color: CHART_COLORS[i], width: 2 },
      symbol: 'circle', symbolSize: 4,
    })),
  }
})

const yieldOptions = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: harvest.value?.byPlot?.map((p) => p.name) || [], axisLabel: { rotate: 20 } },
  yAxis: { type: 'value', name: 'kg', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    type: 'bar', barWidth: 24,
    data: harvest.value?.byPlot?.map((p, i) => ({ value: p.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], borderRadius: [6, 6, 0, 0] } })) || [],
  }],
}))

const salesOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: sales.value?.byMonth?.map((m) => m.month) || [] },
  yAxis: { type: 'value', name: '元', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    name: '销售额', type: 'line', smooth: true,
    data: sales.value?.byMonth?.map((m) => m.amount) || [],
    lineStyle: { width: 2.5, color: CHART_COLORS[4] },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(177,113,121,.2)' }, { offset: 1, color: 'rgba(177,113,121,.02)' }] } },
  }],
}))

onMounted(async () => {
  try {
    const [d, h, s] = await Promise.all([statsApi.dashboard(), farmApi.harvestStats(), tradeApi.stats()])
    dash.value = d
    harvest.value = h
    sales.value = s
  } catch (e) {
    console.warn('[AiOverview]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="数据分析总览" desc="环境趋势、产量、水肥消耗与销售的综合数据仪表盘">
      <template #actions>
        <el-button :icon="'Iphone'" @click="router.push('/screens/overview')">大屏模式</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid stagger" v-if="dash && harvest && sales">
      <StatCard label="本月产量" :value="dash.monthYield" unit="kg" icon="Cherry" tone="green" :trend="16" />
      <StatCard label="灌溉用水(月)" :value="260" unit="m³" icon="Pouring" tone="blue" :trend="-8" />
      <StatCard label="施肥量(月)" :value="42" unit="kg" icon="Box" tone="amber" :trend="-5" />
      <StatCard label="销售额(月)" :value="sales.byMonth?.[5]?.amount || 0" unit="元" icon="ShoppingCart" tone="cyan" :trend="21" />
    </div>

    <div class="grid-2">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>多地块环境对比（雷达图）</div></div>
        <div class="ag-card__body"><ChartCard :options="envCompare" :height="320" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>水肥消耗分析（月度）</div></div>
        <div class="ag-card__body"><ChartCard :options="waterFertOptions" :height="320" /></div>
      </div>
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>地块产量对比</div></div>
        <div class="ag-card__body"><ChartCard :options="yieldOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>销售额趋势</div></div>
        <div class="ag-card__body"><ChartCard :options="salesOptions" :height="300" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .grid-2 { grid-template-columns: 1fr; }
}
</style>
