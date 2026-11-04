<script setup>
/**
 * ECharts 封装：自动初始化 / 响应式重绘 / 主题色统一
 * 加固：init / setOption / resize 全部 try-catch，
 *      图表异常时降级为「图表加载失败 + 重试」占位，不向外抛出（页面级隔离）
 * 用法：<ChartCard :options="chartOptions" :height="320" />
 */
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { AGRI_SOFT_THEME } from '@/utils/chartTheme'

/** 主题只注册一次；显式 options 仍优先于主题兜底 */
let themeRegistered = false
function ensureTheme(echarts) {
  if (themeRegistered) return
  echarts.registerTheme('agri-soft', AGRI_SOFT_THEME)
  themeRegistered = true
}

const props = defineProps({
  options: { type: Object, required: true },
  height: { type: [String, Number], default: 300 },
  loading: { type: Boolean, default: false },
  autoMerge: { type: Boolean, default: false },
})
const el = ref(null)
const failed = ref(false)
let chart = null
let ro = null
let echarts = null

function render() {
  if (!chart || !props.options) return
  try {
    chart.setOption(props.options, { notMerge: !props.autoMerge })
    failed.value = false
  } catch (e) {
    // options 数据结构异常：降级为占位，不让页面崩溃
    failed.value = true
    console.warn('[ChartCard] setOption failed:', e?.message || e)
  }
}

async function init() {
  if (!el.value || chart) return
  try {
    if (!echarts) echarts = (await import('echarts')).default ?? (await import('echarts'))
    ensureTheme(echarts)
    chart = echarts.init(el.value, 'agri-soft')
    failed.value = false
    render()
    ro = new ResizeObserver(() => {
      try { chart && chart.resize() } catch { /* 忽略 resize 期异常 */ }
    })
    ro.observe(el.value)
  } catch (e) {
    failed.value = true
    console.warn('[ChartCard] init failed:', e?.message || e)
  }
}

function retry() {
  failed.value = false
  chart?.dispose?.()
  chart = null
  ro?.disconnect()
  ro = null
  init()
}

onMounted(async () => {
  await nextTick()
  await init()
})

watch(() => props.options, render, { deep: true })
watch(() => props.loading, (v) => {
  if (!chart) return
  try {
    v ? chart.showLoading({ text: '', color: '#074ce0', maskColor: 'rgba(255,255,255,0.6)' }) : chart.hideLoading()
  } catch { /* 忽略 */ }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  try { chart?.dispose() } catch { /* 忽略 */ }
  chart = null
})
</script>

<template>
  <div v-if="!failed" ref="el" class="chart" :style="{ height: typeof height === 'number' ? height + 'px' : height }" role="img" :aria-label="'图表：' + (options.title?.text || '数据可视化')"></div>
  <div v-else class="chart-failed" :style="{ height: typeof height === 'number' ? height + 'px' : height }" role="alert">
    <el-icon :size="22" color="var(--ag-text-4)"><Histogram /></el-icon>
    <span>图表渲染异常，数据加载不受影响</span>
    <el-button size="small" plain :icon="'RefreshRight'" @click="retry">重试</el-button>
  </div>
</template>

<style scoped>
.chart {
  width: 100%;
}
.chart-failed {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ag-text-4);
  font-size: 12px;
  background: var(--ag-bg-hover);
  border-radius: 10px;
}
</style>
