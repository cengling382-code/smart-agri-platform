<script setup>
/** 状态标签：统一语义色映射 */
import { computed } from 'vue'
import { getConfig } from '@/data/configStore'

const MAPS = getConfig('constants').statusTagMaps
const props = defineProps({
  value: { type: [String, Number], default: '' },
  map: { type: Object, default: null },
})
const conf = computed(() => {
  if (props.map && props.map[props.value]) return props.map[props.value]
  return MAPS[props.value] || { label: props.value || '—', type: 'info' }
})
</script>

<template>
  <el-tag :type="conf.type" :effect="conf.effect || 'light'" size="small" disable-transitions>{{ conf.label }}</el-tag>
</template>
