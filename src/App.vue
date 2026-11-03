<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'

const route = useRoute()
const isFullScreen = computed(() => ['ScreenLayout', 'MobileLayout'].includes(String(route.meta.layout || '')))
const isTracePage = computed(() => String(route.meta.layout || '') === 'TraceLayout')
</script>

<template>
  <a class="skip-link" href="#main-content">跳转到主内容</a>
  <div id="main-content" class="app-root" :class="{ 'is-fullscreen': isFullScreen, 'is-trace': isTracePage }">
    <!-- 最外层错误边界：拦截布局级异常，保证 #app 永不白屏 -->
    <ErrorBoundary :route-key="route.path">
      <router-view v-slot="{ Component }">
        <transition name="route" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </ErrorBoundary>
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}
.app-root.is-fullscreen {
  height: 100vh;
  overflow: hidden;
}
.app-root.is-trace {
  min-height: 100vh;
}
</style>
