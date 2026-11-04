<script setup>
/**
 * DockNav —— 底部悬浮导航 Dock（新架构核心组件之一）
 * 取代传统左侧菜单栏：一级模块以玻璃胶囊悬浮于底部，随时可达。
 * 交互遵循 ios-design：
 *  —— 按下即反馈（:active scale，不等 click）
 *  —— 可打断性：显隐用 transform 过渡，动画中仍可点击
 *  —— reduced-motion 时去掉位移动画，只保留透明度
 * 移动端宽度有限：只展示前 4 个一级模块，「更多」按钮永远可见——
 * 被收起的模块不丢失（全部页面仍可经「更多」窗口到达）。
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  /** 一级模块：[{ key, title, icon, entry }]，entry 为该组第一个可见路由 name */
  modules: { type: Array, default: () => [] },
  /** 当前激活模块 key */
  activeKey: { type: String, default: '' },
  /** 向下滚动时隐藏，向上滚动时出现 */
  hidden: { type: Boolean, default: false },
})

const emit = defineEmits(['go', 'more'])

const MOBILE_MAX = 4
const dockMq = window.matchMedia('(max-width: 768px)')
const isMobile = ref(dockMq.matches)
function onMqChange(e) {
  isMobile.value = e.matches
}
onMounted(() => dockMq.addEventListener('change', onMqChange))
onBeforeUnmount(() => dockMq.removeEventListener('change', onMqChange))

const shownModules = computed(() => (isMobile.value ? props.modules.slice(0, MOBILE_MAX) : props.modules))
/** 当前页所属模块被收起时，点亮「更多」作为兜底指示 */
const moreActive = computed(
  () => props.activeKey && props.activeKey !== 'dashboard' && !shownModules.value.some((m) => m.key === props.activeKey)
)
</script>

<template>
  <nav
    class="dock"
    :class="{ 'dock-hidden': hidden }"
    aria-label="全局模块导航"
  >
    <div class="dock-pill">
      <!-- 工作台 -->
      <button
        class="dock-item"
        :class="{ active: activeKey === 'dashboard' }"
        :aria-current="activeKey === 'dashboard' ? 'page' : undefined"
        @click="emit('go', 'Workbench')"
      >
        <el-icon :size="19"><Odometer /></el-icon>
        <span class="dock-label">工作台</span>
        <span class="dock-dot" aria-hidden="true" />
      </button>

      <span class="dock-sep" aria-hidden="true" />

      <!-- 一级模块（移动端仅前 4 个，其余经「更多」到达） -->
      <button
        v-for="m in shownModules"
        :key="m.key"
        class="dock-item"
        :class="{ active: activeKey === m.key }"
        :aria-current="activeKey === m.key ? 'page' : undefined"
        :aria-label="m.title"
        @click="emit('go', m.entry)"
      >
        <el-icon :size="19"><component :is="m.icon" /></el-icon>
        <span class="dock-label">{{ m.title }}</span>
        <span class="dock-dot" aria-hidden="true" />
      </button>

      <span class="dock-sep" aria-hidden="true" />

      <!-- 更多：全部页面集合窗口（任何宽度下都固定可见） -->
      <button
        class="dock-item dock-cmd"
        :class="{ active: moreActive }"
        :aria-current="moreActive ? 'true' : undefined"
        aria-label="查看全部页面"
        @click="emit('more')"
      >
        <el-icon :size="19"><Grid /></el-icon>
        <span class="dock-label">更多</span>
        <span v-if="moreActive" class="dock-dot" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
/* ---------- 悬浮 Dock：玻璃材质胶囊 ---------- */
.dock {
  position: fixed;
  left: 0;
  right: 0;
  /* 底部叠加 iOS 安全区（Home Indicator），避免 Dock 被系统手势条遮挡 */
  bottom: calc(14px + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  z-index: 2000;
  pointer-events: none;
  transition: transform 0.36s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.28s var(--ag-ease);
}
.dock-hidden {
  transform: translateY(calc(100% + 20px));
  opacity: 0;
}

.dock-pill {
  pointer-events: auto;
  display: flex;
  align-items: stretch;
  gap: 2px;
  max-width: calc(100vw - 24px);
  padding: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--ag-border);
  box-shadow: 0 12px 40px rgba(22, 25, 31, 0.14), 0 1px 0 rgba(255, 255, 255, 0.6) inset;
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  overflow-x: auto;
  scrollbar-width: none;
}
.dock-pill::-webkit-scrollbar {
  display: none;
}

/* ---------- 单个模块按钮 ---------- */
.dock-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 64px;
  padding: 7px 10px 9px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--ag-text-2);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--ag-dur) var(--ag-ease), color var(--ag-dur) var(--ag-ease),
    transform 0.1s ease-out;
}
/* 按下即反馈（ios-design：响应不等 release） */
.dock-item:active {
  transform: scale(0.94);
  transition-duration: 0.05s;
}
@media (hover: hover) and (pointer: fine) {
  .dock-item:hover {
    background: rgba(22, 25, 31, 0.05);
    color: var(--ag-text-1);
  }
}
.dock-item.active {
  color: var(--ag-green-700);
}
.dock-item.active > .el-icon {
  color: var(--ag-green-600);
}

.dock-label {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

/* 激活指示点：模块下方的小蓝点（不填充整块，保持玻璃通透） */
.dock-dot {
  position: absolute;
  bottom: 3px;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: transparent;
  transform: translateX(-50%) scale(0);
  transition: transform var(--ag-dur) var(--ag-ease), background var(--ag-dur) var(--ag-ease);
}
.dock-item.active .dock-dot {
  background: var(--ag-green-600);
  transform: translateX(-50%) scale(1);
}

.dock-sep {
  width: 1px;
  margin: 8px 4px;
  background: var(--ag-border);
  flex: none;
}

/* ---------- 无障碍与偏好豁免 ---------- */
@media (prefers-reduced-motion: reduce) {
  .dock,
  .dock-item,
  .dock-dot {
    transition: opacity 0.01ms;
  }
  .dock-hidden {
    opacity: 0;
    transform: none;
    pointer-events: none;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .dock-pill {
    background: var(--ag-bg-surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
@media (max-width: 768px) {
  .dock-label {
    display: none;
  }
  .dock-item {
    min-width: 44px;
    padding: 10px;
  }
  /* 收敛后的 6 个入口必然放得下：禁用横向滚动，杜绝任何入口被裁切 */
  .dock-pill {
    overflow-x: visible;
  }
}
</style>
