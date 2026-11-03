<script setup>
/** 页面 32 · 采收产量统计：产量统计报表、地块对比、年度趋势柱状图 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ChartCard, StatCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { farmApi } from '@/api'

const stats = ref(null)
const loading = ref(true)

const plotOptions = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: stats.value?.byPlot?.map((p) => p.name) || [], axisLabel: { interval: 0, rotate: 24 } },
  yAxis: { type: 'value', name: 'kg', splitLine: { lineStyle: { color: '#F0F1F1' } } },
  series: [{
    type: 'bar', barWidth: 26,
    data: stats.value?.byPlot?.map((p, i) => ({ value: p.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], borderRadius: [6, 6, 0, 0] } })) || [],
  }],
}))

const monthOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: stats.value?.byMonth?.map((m) => m.month) || [] },
  yAxis: { type: 'value', name: 'kg', splitLine: { lineStyle: { color: '#F0F1F1' } } },
  series: [{
    name: '产量', type: 'line', smooth: true, data: stats.value?.byMonth?.map((m) => m.value) || [],
    lineStyle: { width: 2.5, color: CHART_COLORS[0] },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(105,156,120,.25)' }, { offset: 1, color: 'rgba(105,156,120,.02)' }] } },
  }],
}))

const yearOptions = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: stats.value?.yearTrend?.map((y) => y.year) || [] },
  yAxis: { type: 'value', name: 'kg', splitLine: { lineStyle: { color: '#F0F1F1' } } },
  series: [{
    type: 'bar', barWidth: 46,
    data: stats.value?.yearTrend?.map((y) => ({ value: y.value, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#7DC383' }, { offset: 1, color: '#38556A' }] }, borderRadius: [6, 6, 0, 0] } })) || [],
  }],
}))

const gradeOptions = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}kg ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#6E7883' } },
  series: [{
    type: 'pie', radius: ['44%', '70%'], center: ['50%', '44%'],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }, label: { show: false },
    data: stats.value?.byGrade?.map((g, i) => ({ name: g.name, value: g.value, itemStyle: { color: ['#7DC383', '#5E7F9A', '#9AA4AE'][i] } })) || [],
  }],
}))

function exportReport() {
  ElMessage.success('采收产量统计报表 Excel 已生成并开始下载（演示）')
}

onMounted(async () => {
  try {
    stats.value = await farmApi.harvestStats()
  } catch (e) {
    console.warn('[HarvestStats]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="采收产量统计" desc="产量统计报表、地块对比与年度趋势分析">
      <template #actions>
        <el-button type="primary" plain :icon="'Download'" @click="exportReport">导出报表</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid stagger" v-if="stats">
      <StatCard label="采收总量" :value="stats.total" unit="kg" icon="Apple" tone="green" :trend="12" />
      <StatCard label="采收批次" :value="stats.batches" unit="批" icon="Tickets" tone="blue" />
      <StatCard label="批均产量" :value="stats.avg" unit="kg" icon="DataLine" tone="cyan" />
    </div>

    <div class="chart-grid">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>地块产量对比</div></div>
        <div class="ag-card__body"><ChartCard :options="plotOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>月度产量趋势</div></div>
        <div class="ag-card__body"><ChartCard :options="monthOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>分级占比</div></div>
        <div class="ag-card__body"><ChartCard :options="gradeOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>年度产量对比（柱状图）</div></div>
        <div class="ag-card__body"><ChartCard :options="yearOptions" :height="300" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: 1fr; }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
