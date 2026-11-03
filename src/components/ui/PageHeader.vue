<script setup>
/** 页头：标题 + 描述 + 右侧操作区 */
defineProps({
  title: String,
  desc: String,
})
</script>

<template>
  <header class="page-header">
    <div>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="desc" class="page-desc">{{ desc }}</p>
    </div>
    <div class="page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>
