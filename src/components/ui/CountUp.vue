<script setup>
/** 数字滚动动画组件（rAF，性能友好，尊重 prefers-reduced-motion） */
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 900 },
  decimals: { type: Number, default: 0 },
})
const display = ref('0')
let raf = null

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function animate(from, to) {
  if (reduced) {
    display.value = to.toFixed(props.decimals)
    return
  }
  cancelAnimationFrame(raf)
  const t0 = performance.now()
  const step = (t) => {
    const p = Math.min(1, (t - t0) / props.duration)
    const eased = 1 - Math.pow(1 - p, 3)
    display.value = (from + (to - from) * eased).toFixed(props.decimals)
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => animate(0, props.value))
watch(() => props.value, (v, old) => animate(old || 0, v))
</script>

<template>
  <span class="countup mono-num">{{ display }}</span>
</template>

<style scoped>
.countup {
  font-weight: 700;
  letter-spacing: 0.5px;
}
</style>
