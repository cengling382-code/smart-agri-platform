<script setup>
/** 页面 55 · 环境监测大屏：各大棚环境实时曲线、气象数据展示、自动轮播 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ScreenChart from '@/components/ui/ScreenChart.vue'
import { darkBase, darkAxis, SCREEN_COLORS } from '@/utils/screenCharts'
import { deviceApi } from '@/api'

const plots = ref([])
const activeIdx = ref(0)
const series = ref([])
let carousel = null
let dataTimer = null

const PLOT_META = [
  { name: '1号智能大棚', crop: '番茄', color: '#7DC383' },
  { name: '2号智能大棚', crop: '黄瓜', color: '#9FC3DD' },
  { name: '3号育苗棚', crop: '生菜', color: '#FFB37B' },
  { name: '西山坡果园', crop: '柑橘', color: '#B17179' },
  { name: '东大田A区', crop: '水稻', color: '#E84A5F' },
  { name: '南湖1号塘', crop: '水产', color: '#8FB3CC' },
]

const trendOptions = computed(() => {
  if (!series.value.length) return {}
  return {
    ...darkBase,
    tooltip: { ...darkBase.tooltip, trigger: 'axis' },
    legend: { ...darkBase.legend, top: 0, right: 0 },
    grid: { left: 8, right: 14, top: 30, bottom: 0, containLabel: true },
    xAxis: darkAxis({ type: 'time', axisLabel: { color: '#8FA3B8', fontSize: 10 } }),
    yAxis: darkAxis({ type: 'value', scale: true }),
    series: series.value.map((s, i) => ({
      name: `${s.meta.name}(${s.meta.unit || '-'})`,
      type: 'line', smooth: true, showSymbol: false, data: s.arr,
      lineStyle: { width: 2, color: SCREEN_COLORS[i % SCREEN_COLORS.length] },
      areaStyle: { color: SCREEN_COLORS[i % SCREEN_COLORS.length] + '18' },
    })),
  }
})

const realtimeCards = computed(() => {
  const s = series.value
  return s.map((x, i) => {
    const last = x.arr?.[x.arr.length - 1]?.[1] ?? '—'
    return { name: x.meta.name, unit: x.meta.unit, value: last, color: SCREEN_COLORS[i % SCREEN_COLORS.length] }
  })
})

const weather = [
  { label: '温度', value: '19.2℃', icon: '☀' },
  { label: '湿度', value: '58%', icon: '💧' },
  { label: '风速', value: '3.2m/s', icon: '🌬' },
  { label: '降雨', value: '0mm', icon: '🌧' },
  { label: '气压', value: '1013hPa', icon: '📊' },
  { label: '紫外线', value: '中等', icon: '🕶' },
]

async function loadSeries() {
  try {
    const keys = ['temp', 'hum', 'co2']
    series.value = await Promise.all(keys.map((k, i) => deviceApi.series(31 + i * 13, k, 72)))
  } catch (e) {
    console.warn('[ScreenEnv]', e?.message || e)
  }
}

onMounted(async () => {
  await loadSeries()
  carousel = setInterval(() => {
    activeIdx.value = (activeIdx.value + 1) % PLOT_META.length
  }, 5000)
  dataTimer = setInterval(loadSeries, 30000)
})
onBeforeUnmount(() => {
  clearInterval(carousel)
  clearInterval(dataTimer)
})
</script>

<template>
  <div class="screen-env">
    <div class="env-main">
      <!-- 左：大棚切换 + 实时卡 -->
      <div class="left-col">
        <div class="screen-panel panel">
          <div class="p-title">监测地块（自动轮播）</div>
          <div class="plot-list">
            <button
              v-for="(p, i) in PLOT_META"
              :key="p.name"
              class="plot-btn"
              :class="{ active: i === activeIdx }"
              :style="{ '--c': p.color }"
              @click="activeIdx = i"
            >
              <b>{{ p.name }}</b>
              <span>{{ p.crop }}</span>
            </button>
          </div>
        </div>

        <div class="screen-panel panel">
          <div class="p-title">实时读数</div>
          <div class="rt-cards">
            <div v-for="(c, i) in realtimeCards" :key="c.name" class="rt-card" :style="{ '--c': c.color }">
              <span class="rt-name">{{ c.name }}</span>
              <span class="rt-val mono-num">{{ c.value }}<i>{{ c.unit }}</i></span>
            </div>
          </div>
        </div>

        <div class="screen-panel panel">
          <div class="p-title">气象数据（气象站接入）</div>
          <div class="weather-grid">
            <div v-for="w in weather" :key="w.label" class="w-cell">
              <span class="w-icon">{{ w.icon }}</span>
              <span class="w-val mono-num">{{ w.value }}</span>
              <span class="w-label">{{ w.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：主曲线 -->
      <div class="screen-panel panel chart-panel">
        <div class="p-title">
          {{ PLOT_META[activeIdx]?.name }} · 72 小时环境曲线
          <span class="p-sub">温度 / 湿度 / CO₂（每 30s 自动刷新）</span>
        </div>
        <div class="chart-wrap">
          <ScreenChart :options="trendOptions" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen-env {
  height: 100%;
}
.env-main {
  height: 100%;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 14px;
}
.col {
  display: flex;
  flex-direction: column;
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
  border-left: 3px solid var(--ag-screen-cyan);
  margin-bottom: 12px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
}
.p-sub {
  font-size: 10px;
  color: var(--ag-screen-text-dim);
  font-weight: 400;
  letter-spacing: 0;
}
.chart-panel {
  flex: 1;
}
.chart-wrap {
  flex: 1;
  min-height: 0;
}
.plot-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.plot-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(143, 182, 216, 0.18);
  background: rgba(13, 46, 76, 0.4);
  color: var(--ag-screen-text-dim);
  border-radius: var(--ag-radius-sm); /* 决策依据：地块选择按钮属控件，对齐控件档 6px */
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.25s var(--ag-ease);
}
.plot-btn b {
  color: inherit;
  font-weight: 600;
}
.plot-btn span {
  font-size: 11px;
}
.plot-btn.active {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent);
  color: #fff;
  box-shadow: 0 0 14px color-mix(in srgb, var(--c) 30%, transparent);
}
.rt-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.rt-card {
  border: 1px solid rgba(143, 182, 216, 0.16);
  border-radius: var(--ag-radius); /* 决策依据：实时数据小卡属卡片类，token 化为卡片档 10px（值不变） */
  padding: 10px 8px;
  text-align: center;
}
.rt-name {
  font-size: 10px;
  color: var(--ag-screen-text-dim);
}
.rt-val {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: var(--c);
  margin-top: 3px;
}
.rt-val i {
  font-style: normal;
  font-size: 10px;
  color: var(--ag-screen-text-dim);
  margin-left: 2px;
}
.weather-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.w-cell {
  text-align: center;
  padding: 8px 4px;
  background: rgba(13, 46, 76, 0.4);
  border-radius: var(--ag-radius); /* 决策依据：天气数据格属卡片类，token 化为卡片档 10px（值不变） */
}
.w-icon {
  font-size: 16px;
}
.w-val {
  display: block;
  font-size: 14px;
  color: var(--ag-screen-text);
  font-weight: 700;
  margin: 2px 0;
}
.w-label {
  font-size: 10px;
  color: var(--ag-screen-text-dim);
}
</style>
