<script setup>
/** 页面 42 · 溯源查询统计：扫码次数统计、溯源访问量分析 */
import { ref, computed, onMounted } from 'vue'
import { PageHeader, ChartCard, StatCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { traceApi } from '@/api'

const stats = ref(null)
const loading = ref(true)

const byDayOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: stats.value?.byDay?.map((d) => d.day) || [] },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F1F1' } } },
  series: [{
    name: '扫码次数', type: 'line', smooth: true, areaStyle: {
      color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(76,105,131,.22)' }, { offset: 1, color: 'rgba(76,105,131,.02)' }] },
    },
    data: stats.value?.byDay?.map((d) => d.count) || [],
    lineStyle: { width: 2.5, color: CHART_COLORS[1] },
  }],
}))

const byBatchOptions = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} 次 ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#6E7883' }, itemWidth: 10, itemHeight: 10 },
  series: [{
    type: 'pie', radius: ['44%', '70%'], center: ['50%', '42%'], roseType: 'radius',
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }, label: { show: false },
    data: stats.value?.byBatch?.map((b, i) => ({ name: b.name, value: b.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })) || [],
  }],
}))

onMounted(async () => {
  try {
    stats.value = await traceApi.stats()
  } catch (e) {
    console.warn('[TraceStats]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="溯源查询统计" desc="消费者扫码次数统计与溯源访问量分析，衡量品牌信任度" />

    <div class="kpi-grid stagger" v-if="stats">
      <StatCard label="累计扫码" :value="stats.totalScans" unit="次" icon="View" tone="blue" :trend="18" />
      <StatCard label="今日扫码" :value="stats.todayScans" unit="次" icon="Odometer" tone="green" :trend="6" />
      <StatCard label="近 7 日" :value="stats.weekScans" unit="次" icon="DataLine" tone="cyan" :trend="12" />
      <StatCard label="已发布批次" :value="stats.published" unit="个" icon="Postcard" tone="amber" />
    </div>

    <div class="chart-grid">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>近 7 日扫码趋势</div></div>
        <div class="ag-card__body"><ChartCard :options="byDayOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>批次扫码占比（TOP 批次）</div></div>
        <div class="ag-card__body"><ChartCard :options="byBatchOptions" :height="300" /></div>
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
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
