<script setup>
/** 大屏专用 ECharts 容器（100% 填充，自动重绘；异常降级为占位，不向外抛出） */
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  options: { type: Object, required: true },
})
const el = ref(null)
const failed = ref(false)
let chart = null
let ro = null

function render() {
  if (!chart || !props.options) return
  try {
    chart.setOption(props.options)
    failed.value = false
  } catch (e) {
    failed.value = true
    console.warn('[ScreenChart] setOption failed:', e?.message || e)
  }
}
function retry() {
  failed.value = false
  chart?.dispose?.()
  chart = null
  try {
    chart = echarts.init(el.value)
    render()
  } catch (e) {
    failed.value = true
    console.warn('[ScreenChart] init failed:', e?.message || e)
  }
}

onMounted(() => {
  try {
    chart = echarts.init(el.value)
    chart.setOption(props.options)
    ro = new ResizeObserver(() => {
      try { chart?.resize() } catch { /* 忽略 */ }
    })
    ro.observe(el.value)
  } catch (e) {
    failed.value = true
    console.warn('[ScreenChart] init failed:', e?.message || e)
  }
})
watch(() => props.options, render, { deep: true })
onBeforeUnmount(() => {
  ro?.disconnect()
  try { chart?.dispose() } catch { /* 忽略 */ }
  chart = null
})
</script>

<template>
  <div v-if="!failed" ref="el" class="screen-chart" role="img" :aria-label="'大屏图表：' + (options.title?.text || '数据可视化')"></div>
  <div v-else class="screen-chart-failed" role="alert">
    <span>图表渲染异常</span>
    <button class="sc-retry" @click="retry">重试</button>
  </div>
</template>

<style scoped>
.screen-chart {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.screen-chart-failed {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--ag-screen-text-dim, '#8FA3B8');
  font-size: 12px;
  border: 1px dashed rgba(143, 182, 216, 0.25);
  border-radius: 10px;
}
.sc-retry {
  border: 1px solid rgba(143, 182, 216, 0.35);
  background: transparent;
  color: inherit;
  border-radius: 6px;
  padding: 3px 12px;
  cursor: pointer;
  font-size: 12px;
}
</style>
