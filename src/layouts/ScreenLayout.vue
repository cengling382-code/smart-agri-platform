<script setup>
/** 指挥中心大屏布局：1920×1080 设计稿自适应缩放 + 屏间导航 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const now = ref(new Date())
const scale = ref(1)

const screens = [
  { name: 'ScreenOverview', title: '总览大屏' },
  { name: 'ScreenEnv', title: '环境监测' },
  { name: 'ScreenFarm', title: '农事采收' },
  { name: 'ScreenDevice', title: '设备运维' },
]
const activeTitle = computed(() => route.meta.title || '')

function update() {
  now.value = new Date()
  const w = window.innerWidth
  const h = window.innerHeight
  scale.value = Math.min(w / 1920, h / 1080)
}
let timer = null
onMounted(() => {
  update()
  window.addEventListener('resize', update)
  timer = setInterval(update, 1000)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', update)
  clearInterval(timer)
})

const timeText = computed(() =>
  now.value.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
)
</script>

<template>
  <div class="screen-layout">
    <div class="screen-canvas" :style="{ transform: `scale(${scale})` }">
      <!-- 顶部标题栏 -->
      <header class="s-header">
        <div class="s-left">
          <svg viewBox="0 0 48 48" class="s-logo" aria-hidden="true">
            <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(125,195,131,.16)" stroke="rgba(125,195,131,.6)" stroke-width="2" />
            <path d="M24 38c0-9 3-16 12-21 1 12-4 19-12 21zm0 0c0-7-2.5-12.5-9.5-16.5C13.6 30.5 18 36.2 24 38z" fill="#7DC383" />
          </svg>
          <div>
            <div class="s-title">智慧农业综合管理平台</div>
            <div class="s-sub">COMMAND CENTER</div>
          </div>
        </div>
        <nav class="s-nav" aria-label="大屏切换">
          <button
            v-for="s in screens"
            :key="s.name"
            class="s-tab"
            :class="{ active: route.name === s.name }"
            @click="router.push({ name: s.name })"
          >
            {{ s.title }}
          </button>
        </nav>
        <div class="s-right">
          <span class="s-time mono-num">{{ timeText }}</span>
          <button class="s-exit" @click="router.push('/dashboard')" aria-label="退出大屏">
            <el-icon><Back /></el-icon> 退出大屏
          </button>
        </div>
        <div class="s-head-line"></div>
      </header>

      <!-- 内容区：1920×920 -->
      <main class="s-body">
        <div class="s-body-inner">
          <ErrorBoundary :route-key="route.fullPath" compact>
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" :key="route.path" />
              </transition>
            </router-view>
          </ErrorBoundary>
        </div>
      </main>
      <div class="screen-scan" aria-hidden="true"></div>
    </div>
  </div>
</template>

<style scoped>
/* 大屏底色：原为「两团径向光斑 + 160° 斜向渐变」三层叠加——
   典型的无意义装饰渐变，且三层叠加让面板边界难以判断。
   决策依据：大屏的层次应由面板（半透明 + 背景模糊 + 发丝边框）
   提供，底色只负责让文字达到对比度，因此改为单一深色实底。 */
/* 居中策略修正（既有缺陷，本次验证中发现）：
   原为 display:grid + place-items:center。grid 在未显式定义轨道时，
   隐式轨道会按子项自身的 1920×1080 尺寸撑开、并从容器左上角起算，
   于是"居中"实际发生在一条本就溢出的轨道内部——画布被推到右下角。
   改用 flex：单个超尺寸子项在 justify-content:center 下会向两侧等量
   溢出，这才是缩放画布需要的居中语义。
   该缺陷在 1920×1080 视口下因 scale=1 恰好铺满而不可见，任何非 16:9
   视口都会暴露（内容整体偏右下、左上留出大片空底色）。 */
.screen-layout {
  height: 100vh;
  width: 100vw;
  background: var(--ag-screen-bg-1);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.screen-canvas {
  width: 1920px;
  height: 1080px;
  /* flex 子项默认 flex-shrink:1，会把 1920 压到容器宽度再叠加 scale，
     导致内容横向挤压变形。必须禁止收缩，让它以设计稿尺寸参与居中。 */
  flex: none;
  transform-origin: center center;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0 var(--ag-space-8);
}
.s-header {
  position: relative;
  height: 90px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
}
.s-left {
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 2;
}
.s-logo {
  width: 46px;
  height: 46px;
}
/* 标题：原为 白→绿→蓝 三色渐变文字。渐变文字在 26px 下会
   让字重显得不均匀，也是 AI 模板的高频手法。改为实色 + 负字距收拢。 */
.s-title {
  font-size: 26px;
  font-weight: 700;                 /* 800 → 700：大字号配过粗字重会糊 */
  letter-spacing: 3px;
  color: #e8eef4;
  white-space: nowrap;
}
.s-sub {
  font-size: 10px;
  letter-spacing: 6px;
  color: rgba(143, 182, 216, 0.7);
}
.s-nav {
  display: flex;
  gap: 4px;
  background: rgba(13, 46, 76, 0.6);
  border: 1px solid var(--ag-screen-border);
  border-radius: var(--ag-radius);   /* 24px 胶囊 → 10px：与全站卡片同语汇 */
  padding: 4px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}
.s-tab {
  border: none;
  background: transparent;
  color: var(--ag-screen-text-dim);
  font-size: 14px;
  padding: 8px 22px;
  border-radius: var(--ag-radius-sm); /* 18px → 6px：与控件同语汇 */
  cursor: pointer;
  letter-spacing: 2px;
  transition: background var(--ag-dur) var(--ag-ease), color var(--ag-dur) var(--ag-ease);
}
.s-tab:hover {
  color: #fff;
}
/* 激活态：单色实底 + 白字，与管理端 .tag.active 同语汇。
   原为绿→蓝渐变底 + 青色辉光投影——色彩与光影双重堆砌。 */
.s-tab.active {
  background: var(--ag-green-700);
  color: #fff;
  font-weight: 600;
}
.s-right {
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 2;
}
.s-time {
  font-size: 16px;
  color: var(--ag-screen-text);
  letter-spacing: 1px;
  font-variant-numeric: tabular-nums;
}
.s-exit {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--ag-screen-border);
  background: rgba(13, 46, 76, 0.6);
  color: var(--ag-screen-text-dim);
  font-size: 12px;
  padding: 7px 14px;
  border-radius: var(--ag-radius-sm);
  cursor: pointer;
  transition: color var(--ag-dur-fast) var(--ag-ease), border-color var(--ag-dur-fast) var(--ag-ease);
}
.s-exit:hover {
  color: #fff;
  border-color: rgba(159, 195, 221, 0.6);
}
/* 头部分隔线：原为「透明→青→绿→透明」渐变。改为单色发丝线——
   它的作用是分隔，不是装饰；渐变只会让分隔变得时隐时现。 */
.s-head-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(159, 195, 221, 0.24);
}
.s-body {
  flex: 1;
  min-height: 0;
  padding: 18px 0 24px;
}
.s-body-inner {
  height: 100%;
}
</style>
