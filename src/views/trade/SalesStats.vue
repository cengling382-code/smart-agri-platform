<script setup>
/** 页面 45 · 销售统计分析：销售额、销量、热销产品分析、饼图柱状图 */
import { ref, computed, onMounted } from 'vue'
import { PageHeader, ChartCard, StatCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { tradeApi } from '@/api'

const stats = ref(null)
const loading = ref(true)

const productOptions = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#6b7380' }, itemWidth: 10, itemHeight: 10 },
  series: [{
    type: 'pie', radius: ['42%', '70%'], center: ['50%', '42%'],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }, label: { show: false },
    data: stats.value?.byProduct?.map((p, i) => ({ name: p.name, value: p.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })) || [],
  }],
}))

const monthOptions = computed(() => ({
  color: CHART_COLORS,
  tooltip: { trigger: 'axis' },
  legend: { top: 0, textStyle: { color: '#6b7380' } },
  grid: { left: 10, right: 16, top: 40, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: stats.value?.byMonth?.map((m) => m.month) || [] },
  yAxis: [{ type: 'value', name: '元', splitLine: { lineStyle: { color: '#eef0f3' } } }, { type: 'value', name: '单', splitLine: { show: false } }],
  series: [
    { name: '销售额', type: 'bar', barWidth: 22, data: stats.value?.byMonth?.map((m) => m.amount) || [], itemStyle: { borderRadius: [5, 5, 0, 0] } },
    { name: '订单量', type: 'line', yAxisIndex: 1, smooth: true, data: stats.value?.byMonth?.map((m) => m.orders) || [], lineStyle: { width: 2.5 } },
  ],
}))

const rank = computed(() =>
  [...(stats.value?.byProduct || [])].sort((a, b) => b.value - a.value).slice(0, 5)
)

onMounted(async () => {
  try {
    stats.value = await tradeApi.stats()
  } catch (e) {
    console.warn('[SalesStats]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="销售统计分析" desc="销售额、订单量、热销产品多维分析（饼图 + 柱状图）" />

    <div class="kpi-grid stagger" v-if="stats">
      <StatCard label="销售总额" :value="stats.totalAmount" unit="元" icon="Coin" tone="green" :trend="21" />
      <StatCard label="订单总数" :value="stats.orders" unit="单" icon="List" tone="blue" />
      <StatCard label="成交订单" :value="stats.doneOrders" unit="单" icon="CircleCheck" tone="cyan" />
      <StatCard label="在售产品" :value="stats.products" unit="款" icon="Goods" tone="amber" />
    </div>

    <div class="chart-grid">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>产品销售额占比（饼图）</div></div>
        <div class="ag-card__body"><ChartCard :options="productOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>月度销售趋势（柱状图 + 折线）</div></div>
        <div class="ag-card__body"><ChartCard :options="monthOptions" :height="300" /></div>
      </div>
    </div>

    <!-- 热销排行 -->
    <div class="ag-card mt-16 anim-up">
      <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>热销产品 TOP5</div></div>
      <div class="ag-card__body rank-list">
        <div v-for="(r, i) in rank" :key="r.name" class="rank-row">
          <span class="rk-no" :class="'top' + (i + 1)">{{ i + 1 }}</span>
          <b class="rk-name">{{ r.name }}</b>
          <el-progress :percentage="Math.round((r.value / rank[0].value) * 100)" :stroke-width="10" :show-text="false" color="#074ce0" style="flex: 1" />
          <span class="mono-num rk-val">¥{{ r.value }}</span>
        </div>
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
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.rank-row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.rk-no {
  width: 26px;
  height: 26px;
  border-radius: var(--ag-radius-sm); /* 决策依据：26px 排名角标属小控件，对齐控件档 6px */
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 13px;
  background: var(--ag-bg-hover);
  color: var(--ag-text-3);
  flex: none;
}
.rk-no.top1 { background: #FFB37B; color: #fff; }
.rk-no.top2 { background: #9AA4AE; color: #fff; }
.rk-no.top3 { background: #c9803e; color: #fff; }
.rk-name {
  width: 190px;
  font-size: 13px;
}
.rk-val {
  font-weight: 700;
  color: var(--ag-danger);
  width: 90px;
  text-align: right;
}
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
