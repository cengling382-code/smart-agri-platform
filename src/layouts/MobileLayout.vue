<script setup>
/** 移动端布局：手机框容器 + 页面内容 + 底部标签导航 */
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tabs = [
  { path: '/m/home', title: '工作台', icon: 'Odometer' },
  { path: '/m/env', title: '环境', icon: 'Sunny' },
  { path: '/m/control', title: '设备', icon: 'SwitchButton' },
  { path: '/m/alarms', title: '消息', icon: 'Bell' },
  { path: '/m/profile', title: '我的', icon: 'User' },
]
const isLogin = computed(() => route.path === '/m/login')
const title = computed(() => route.meta.title || '智慧农业')

watch(
  () => auth.isLoggedIn,
  (v) => {
    if (!v && !isLogin.value) router.replace('/m/login')
  }
)
</script>

<template>
  <div class="mobile-outer">
    <!-- 桌面端提示背景 -->
    <div class="phone" :class="{ 'is-login': isLogin }" role="application" aria-label="移动端预览">
      <!-- 页面 -->
      <div class="m-screen">
        <ErrorBoundary :route-key="route.fullPath" compact>
          <router-view v-slot="{ Component }">
            <transition name="m-slide" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
        </ErrorBoundary>
      </div>

      <!-- 底部导航 -->
      <nav v-if="!isLogin" class="tabbar" aria-label="底部导航">
        <button
          v-for="t in tabs"
          :key="t.path"
          class="tab"
          :class="{ active: route.path === t.path }"
          @click="router.push(t.path)"
          :aria-label="t.title"
        >
          <el-icon :size="20"><component :is="t.icon" /></el-icon>
          <span>{{ t.title }}</span>
        </button>
      </nav>
    </div>

    <div class="outer-tip">
      <span>移动端 · 农户/管理员 App</span>
      <router-link to="/dashboard">返回管理端 →</router-link>
    </div>
  </div>
</template>

<style scoped>
/* 演示台背景：原为两团绿/蓝 radial-gradient 光斑——纯装饰、无信息量，
   是"AI 生成感"的典型来源。改为单一深色实底，靠手机模型自身的
   投影建立前后层次（物体该有的影子留着，氛围光斑去掉）。 */
.mobile-outer {
  height: 100vh;
  height: 100dvh;
  display: grid;
  place-items: center;
  background: #141e2b;
  position: relative;
}
.phone {
  width: 390px;
  height: min(844px, calc(100vh - 48px));
  height: min(844px, calc(100dvh - 48px));
  background: var(--ag-bg-ground);
  border-radius: 44px;
  border: 10px solid #1c2a3c;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: agZoomIn 0.4s var(--ag-ease-spring) both;
}
.m-screen {
  flex: 1;
  overflow-y: auto;
  position: relative;
  background: var(--ag-bg-ground);
  -webkit-overflow-scrolling: touch;
}
.tabbar {
  flex: none;
  /* border-box 下 padding 会吃掉内容高度：把安全区额外加到总高，保证 62px 内容区不被压缩 */
  height: calc(62px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1px solid var(--ag-border-light);
  display: flex;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.tab {
  flex: 1;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 11px;
  letter-spacing: var(--ag-ls-micro);
  color: var(--ag-text-4);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: color var(--ag-dur) var(--ag-ease);
}
.tab.active {
  color: var(--ag-green-600);
  font-weight: 600;
}
.tab.active :deep(.el-icon) {
  animation: agCountGlow 0.6s var(--ag-ease);
}
.outer-tip {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 18px;
  color: rgba(226, 243, 255, 0.55);
  font-size: 12px;
}
.outer-tip a {
  color: var(--ag-green-300);
}

/* 移动端页面切换动效 */
.m-slide-enter-active {
  transition: opacity 0.25s var(--ag-ease), transform 0.25s var(--ag-ease);
}
.m-slide-leave-active {
  transition: opacity 0.16s ease;
}
.m-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);   /* 与 slide-right 的 16px 位移保持一致 */
}
.m-slide-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .phone {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    border: none;
    border-radius: 0;
  }
  .outer-tip {
    display: none;
  }
}

/* 横屏矮视口：压缩手机框与底部导航，给内容区留出可用高度 */
@media (orientation: landscape) and (max-height: 500px) {
  .phone {
    width: min(760px, 94vw);
    height: min(440px, calc(100dvh - 16px));
    border-width: 6px;
    border-radius: 22px;
  }
  .tabbar {
    height: calc(46px + env(safe-area-inset-bottom, 0px));
  }
  .tab {
    flex-direction: row;
    gap: 6px;
  }
  .outer-tip {
    display: none;
  }
}
</style>
