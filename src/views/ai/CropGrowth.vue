<script setup>
/** 页面 34 · 作物长势分析：长势评估、图片对比、成熟期预测、产量预估 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ChartCard, StatCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { aiApi } from '@/api'

const list = ref([])
const loading = ref(true)
const active = ref(null)

const levelOptions = computed(() => {
  const levels = { 优: 0, 良: 0, 中: 0 }
  list.value.forEach((g) => levels[g.level]++)
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie', radius: ['44%', '70%'], center: ['50%', '42%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }, label: { show: false },
      data: [
        { name: '优', value: levels['优'], itemStyle: { color: '#558162' } },
        { name: '良', value: levels['良'], itemStyle: { color: '#5E7F9A' } },
        { name: '中', value: levels['中'], itemStyle: { color: '#c9803e' } },
      ],
    }],
  }
})

const scoreOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 40, containLabel: true },
  xAxis: { type: 'category', data: list.value.map((g) => g.plotName), axisLabel: { rotate: 24, fontSize: 10 } },
  yAxis: { type: 'value', max: 100, name: '长势评分', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    type: 'bar', barWidth: 26,
    data: list.value.map((g, i) => ({
      value: g.score,
      itemStyle: { color: g.score > 88 ? '#558162' : g.score > 78 ? '#5E7F9A' : '#c9803e', borderRadius: [6, 6, 0, 0] },
    })),
    label: { show: true, position: 'top', color: '#6b7380', fontSize: 10 },
  }],
}))

/* 模拟图像对比（渐进式生成伪影像） */
function mockImage(seed, type) {
  const base = type === 'now' ? 'hsl(130,42%,46%)' : 'hsl(96,38%,58%)'
  return `repeating-linear-gradient(${60 + seed * 20}deg, ${base}, ${base} 6px, hsl(${100 + seed * 10},45%,${type === 'now' ? 38 : 52}%) 8px)`
}

function compare(row) {
  active.value = row
  ElMessage.info(`正在加载「${row.plotName}」两期影像对比（演示数据）`)
}

onMounted(async () => {
  try {
    const res = await aiApi.growth()
    list.value = res.list
  } catch (e) {
    console.warn('[CropGrowth]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="作物长势分析" desc="结合图像与环境数据评估长势等级，预测成熟期与产量（AI 智能分析）" />

    <div class="kpi-grid stagger">
      <StatCard label="监测地块" :value="list.length" unit="块" icon="Place" tone="green" />
      <StatCard label="长势优良率" :value="list.length ? Math.round(list.filter((g) => g.level !== '中').length / list.length * 100) : 0" unit="%" icon="CircleCheck" tone="blue" />
      <StatCard label="预估总产量" :value="list.reduce((s, g) => s + g.yieldEst, 0)" unit="kg" icon="Cherry" tone="amber" :trend="9" />
      <StatCard label="平均 NDVI" :value="list.length ? +(list.reduce((s, g) => s + g.ndvi, 0) / list.length).toFixed(2) : 0" icon="Sunrise" tone="cyan" :decimals="2" />
    </div>

    <div class="growth-layout">
      <!-- 长势列表 -->
      <div class="ag-card anim-left">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>长势评估结果</div></div>
        <div class="ag-card__body growth-list">
          <div
            v-for="g in list"
            :key="g.id"
            class="g-row"
            :class="{ active: active?.id === g.id }"
            @click="compare(g)"
            tabindex="0"
            role="button"
            @keyup.enter="compare(g)"
          >
            <div class="g-left">
              <b>{{ g.plotName }}</b>
              <span class="text-dim">{{ g.crop }} · {{ g.stage }}</span>
            </div>
            <div class="g-mid">
              <el-progress :percentage="g.score" :stroke-width="8" :show-text="false" :color="g.score > 88 ? '#558162' : g.score > 78 ? '#5E7F9A' : '#c9803e'" style="width: 110px" />
              <span class="lv" :class="'lv-' + g.level">{{ g.level }}</span>
            </div>
            <div class="g-right">
              <span class="text-dim">成熟期</span>
              <b class="mono-num">{{ g.maturity }} 天</b>
              <span class="text-dim">预估 {{ g.yieldEst }} kg/亩</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 影像对比 + 图表 -->
      <div class="right-col">
        <div class="ag-card anim-up">
          <div class="ag-card__head">
            <div class="ag-card__title"><span class="dot"></span>影像对比{{ active ? ` · ${active.plotName}` : '' }}</div>
            <el-tag v-if="active" size="small" type="success">NDVI {{ active.ndvi }}（{{ active.compare >= 0 ? '+' : '' }}{{ active.compare }}% 较上期）</el-tag>
          </div>
          <div class="ag-card__body">
            <div class="img-compare" v-if="active">
              <div class="img-box">
                <div class="mock-img" :style="{ background: mockImage(active.id, 'prev') }"><span>上一期（15 天前）</span></div>
                <div class="mock-img" :style="{ background: mockImage(active.id, 'now') }"><span>当前最新影像</span></div>
              </div>
              <el-alert type="success" :closable="false" show-icon :title="`AI 评估：${active.plotName} 当前处于「${active.stage}」，长势等级 ${active.level}（评分 ${active.score}），预计 ${active.maturity} 天后成熟，预估产量 ${active.yieldEst} kg/亩`" />
            </div>
            <el-empty v-else description="点击左侧地块查看两期影像对比" :image-size="90" />
          </div>
        </div>

        <div class="chart-row">
          <div class="ag-card anim-up anim-delay-1">
            <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>长势等级分布</div></div>
            <div class="ag-card__body"><ChartCard :options="levelOptions" :height="240" /></div>
          </div>
          <div class="ag-card anim-up anim-delay-2">
            <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>长势评分对比</div></div>
            <div class="ag-card__body"><ChartCard :options="scoreOptions" :height="240" /></div>
          </div>
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
.growth-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  align-items: start;
}
.growth-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 560px;
  overflow: auto;
}
.g-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：长势列表行属卡片类，对齐卡片档 10px */
  cursor: pointer;
  transition: all 0.22s var(--ag-ease);
}
.g-row:hover {
  border-color: var(--ag-green-300);
  transform: translateX(3px);
}
.g-row.active {
  border-color: var(--ag-green-600);
  background: var(--ag-green-50);
}
.g-left {
  display: flex;
  flex-direction: column;
  min-width: 105px;
}
.g-left b {
  font-size: 13px;
}
.g-mid {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.lv {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: var(--ag-radius-sm); /* 决策依据：等级标签属小控件，对齐控件档 6px */
  font-weight: 700;
}
.lv-优 { background: #E2EFE5; color: #558162; }
.lv-良 { background: #D6E6F2; color: #3D5871; }
.lv-中 { background: #FFF1BC; color: #C77F3B; }
.g-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 11px;
}
.g-right b {
  color: var(--ag-green-700);
}
.img-compare .img-box {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}
.mock-img {
  aspect-ratio: 16/10;
  border-radius: var(--ag-radius); /* 决策依据：对比图片块属卡片类，对齐卡片档 10px */
  position: relative;
  overflow: hidden;
  animation: agFadeIn 0.5s both;
}
.mock-img span {
  position: absolute;
  bottom: 8px;
  left: 8px;
  color: #fff;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 8px;
  border-radius: var(--ag-radius-sm); /* 决策依据：图片角标属标签类小控件，对齐控件档 6px */
}
.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 16px;
}
@media (max-width: 1250px) {
  .growth-layout { grid-template-columns: 1fr; }
  .chart-row { grid-template-columns: 1fr; }
}
</style>
