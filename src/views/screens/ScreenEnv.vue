<script setup>
/** 页面 55 · 环境监测大屏：各大棚环境实时曲线、气象数据展示、自动轮播 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import ScreenChart from '@/components/ui/ScreenChart.vue'
import { darkBase, darkAxis, SCREEN_COLORS } from '@/utils/screenCharts'
import { deviceApi, plotApi } from '@/api'
import { getConfig } from '@/data/configStore'
import { onDataChange } from '@/composables/useDataVersion'

const cfg = getConfig('screens')

const plots = ref([])
const allDevices = ref([])
const activeIdx = ref(0)
const series = ref([])
let carousel = null
let dataTimer = null

const PLOT_COLORS = cfg.plotColors
const KEY_META = cfg.envKeyMeta

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

const activePlot = computed(() => plots.value[activeIdx.value])

const weather = cfg.envWeatherCards

async function loadSeries() {
  const p = activePlot.value
  if (!p) {
    series.value = []
    return
  }
  const keys = ['temp', 'hum', 'co2']
  const sensors = allDevices.value.filter((d) => d.type === 'sensor' && d.plotId === p.id)
  // 地块无对应传感器时展示空态，避免用其他地块数据冒充当前地块
  if (!sensors.length) {
    series.value = keys.map((k) => ({ meta: KEY_META[k], arr: [] }))
    return
  }
  const findSensor = (key) => sensors.find((s) => Array.isArray(s.params) && s.params.includes(key))
  try {
    const res = await Promise.all(
      keys.map((k) =>
        findSensor(k)
          ? deviceApi.series(findSensor(k).id, k, 72)
          : Promise.resolve({ meta: KEY_META[k], series: [] })
      )
    )
    series.value = res.map((r, i) => ({ meta: r?.meta || KEY_META[keys[i]], arr: r?.series || [] }))
  } catch (e) {
    console.warn('[ScreenEnv]', e?.message || e)
    series.value = keys.map((k) => ({ meta: KEY_META[k], arr: [] }))
  }
}

async function initPlots() {
  try {
    const [ps, ds] = await Promise.all([plotApi.all(), deviceApi.all()])
    allDevices.value = ds
    plots.value = ps.map((p, i) => ({ ...p, color: PLOT_COLORS[i % PLOT_COLORS.length] }))
    if (!plots.value.length) return
    await loadSeries()
  } catch (e) {
    console.warn('[ScreenEnv]', e?.message || e)
  }
}

watch(activeIdx, loadSeries)
onDataChange(initPlots, { debounce: 400 })

onMounted(async () => {
  await initPlots()
  carousel = setInterval(() => {
    if (plots.value.length) activeIdx.value = (activeIdx.value + 1) % plots.value.length
  }, cfg.envCarouselMs)
  dataTimer = setInterval(loadSeries, cfg.envRefreshMs)
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
              v-for="(p, i) in plots"
              :key="p.id"
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
          {{ activePlot?.name || '暂无监测地块' }} · 72 小时环境曲线
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
.left-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.left-col > .screen-panel {
  flex: none;
}
.left-col > .screen-panel:nth-child(2) {
  flex: 1;
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
