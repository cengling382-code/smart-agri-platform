<script setup>
/** 页面 18 · 告警统计分析：类型统计、趋势图表、处理效率分析（ECharts） */
import { ref, computed, onMounted } from 'vue'
import { PageHeader, ChartCard, StatCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { alarmApi } from '@/api'

const stats = ref(null)
const loading = ref(true)

const typeOptions = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#6b7380' }, itemWidth: 10, itemHeight: 10 },
  series: [{
    type: 'pie', radius: ['42%', '70%'], center: ['50%', '42%'],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    data: stats.value?.byType?.map((t, i) => ({ name: t.name, value: t.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })) || [],
  }],
}))

const levelOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: stats.value?.byLevel?.map((l) => l.name) || [], axisLine: { lineStyle: { color: '#dde0e6' } } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    type: 'bar', barWidth: 42, data: stats.value?.byLevel?.map((l, i) => ({
      value: l.value,
      itemStyle: { color: ['#9AA4AE', '#FFB37B', '#E84A5F'][i], borderRadius: [6, 6, 0, 0] },
    })) || [],
  }],
}))

const trendOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: stats.value?.byDay?.map((d) => d.day) || [] },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    name: '告警数量', type: 'line', smooth: true, data: stats.value?.byDay?.map((d) => d.count) || [],
    lineStyle: { width: 2.5, color: CHART_COLORS[0] },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(7,76,224,.15)' }, { offset: 1, color: 'rgba(7,76,224,.02)' }] } },
  }],
}))

const channelOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 30, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: stats.value?.channels?.map((c) => c.name) || [] },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    type: 'bar', barWidth: 36,
    data: stats.value?.channels?.map((c, i) => ({ value: c.count, itemStyle: { color: CHART_COLORS[i], borderRadius: [6, 6, 0, 0] } })) || [],
  }],
}))

onMounted(async () => {
  try {
    stats.value = await alarmApi.stats()
  } catch (e) {
    console.warn('[AlarmStats]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="告警统计分析" desc="告警类型、级别、趋势与处理效率多维度分析（ECharts 可视化）" />

    <div class="kpi-grid stagger" v-if="stats">
      <StatCard label="告警总数" :value="stats.total" unit="条" icon="Bell" tone="blue" />
      <StatCard label="待处理" :value="stats.pending" unit="条" icon="WarningFilled" tone="red" />
      <StatCard label="闭环率" :value="stats.resolveRate" unit="%" icon="CircleCheck" tone="green" />
      <StatCard label="平均处置时长" :value="stats.avgHours" unit="h" icon="Timer" tone="amber" :decimals="1" />
    </div>

    <div class="chart-grid">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>告警类型分布</div></div>
        <div class="ag-card__body"><ChartCard :options="typeOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>告警级别分布</div></div>
        <div class="ag-card__body"><ChartCard :options="levelOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>告警趋势（近 7 日）</div></div>
        <div class="ag-card__body"><ChartCard :options="trendOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>通知渠道触达量</div></div>
        <div class="ag-card__body"><ChartCard :options="channelOptions" :height="300" /></div>
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
