<script setup>
/**
 * MoreSheet —— 「更多」页面集合窗口（底栏 Dock 的全局导航入口）
 * 视觉与底栏 DockNav 严格同源：玻璃胶囊材质（86% 白 + blur20 saturate180 +
 * 内侧高光 + 深柔影）、无边框透明磁贴（hover 浅灰、按下 scale、当前页蓝点）。
 * 交互规范（ios-design）：窗口从触发它的 Dock 方向升起（进入/退出同一路径）；
 * 桌面端为底部抽屉，移动端（≤768px）转全屏；Esc 关闭、打开时锁定背景滚动；
 * reduced-motion 降级为纯淡入，reduced-transparency 去玻璃材质。
 */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Close, Right } from '@element-plus/icons-vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 分组集合：[{ key, title, icon, children: [{ title, to }] }] */
  groups: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])
const route = useRoute()
const router = useRouter()

const query = ref('')
const closeRef = ref(null)

/** 关键词过滤后的分组（保留有命中的分组） */
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.groups
    .map((g) => ({ ...g, children: g.children.filter((c) => !q || c.title.toLowerCase().includes(q)) }))
    .filter((g) => g.children.length)
})
const total = computed(() => filtered.value.reduce((n, g) => n + g.children.length, 0))

/** 当前页磁贴高亮（与 Dock 的 active 同语法：蓝字 + 蓝点） */
function isActive(to) {
  if (typeof to === 'string') return route.path.startsWith(to)
  return route.name === to.name
}

watch(
  () => props.open,
  async (v) => {
    if (v) {
      query.value = ''
      document.body.style.overflow = 'hidden'
      await nextTick()
      closeRef.value?.focus()
    } else {
      document.body.style.overflow = ''
    }
  }
)
onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

function go(item) {
  if (!item) return
  emit('close')
  router.push(item.to)
}
function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <transition name="ms">
      <div v-if="open" class="ms-scrim" @click.self="$emit('close')" @keydown="onKey">
        <section class="ms-sheet" role="dialog" aria-modal="true" aria-label="全部页面">
          <!-- 头部：标题 + 筛选 + 关闭 -->
          <header class="ms-head">
            <div class="ms-head-text">
              <h2 class="ms-title">全部页面</h2>
              <p class="ms-sub">{{ total }} 个可访问页面 · 点击直达</p>
            </div>
            <div class="ms-search">
              <el-icon :size="15" color="var(--ag-text-4)"><Search /></el-icon>
              <input v-model="query" placeholder="筛选页面…" aria-label="筛选页面" />
            </div>
            <button ref="closeRef" class="ms-close" aria-label="关闭窗口" @click="$emit('close')">
              <el-icon :size="15"><Close /></el-icon>
            </button>
          </header>

          <!-- 分组页面网格：分组间以发丝线相隔（同 dock-sep） -->
          <div class="ms-body">
            <section v-for="g in filtered" :key="g.key" class="ms-group" :aria-label="g.title">
              <div class="ms-group-head">
                <el-icon :size="14" class="ms-group-icon"><component :is="g.icon" /></el-icon>
                <span class="ms-group-title">{{ g.title }}</span>
                <span class="ms-group-count">{{ g.children.length }}</span>
              </div>
              <div class="ms-grid">
                <button
                  v-for="c in g.children"
                  :key="g.key + c.title"
                  type="button"
                  class="ms-tile"
                  :class="{ active: isActive(c.to) }"
                  :aria-current="isActive(c.to) ? 'page' : undefined"
                  @click="go(c)"
                >
                  <el-icon :size="17" class="ms-tile-icon"><component :is="g.icon" /></el-icon>
                  <span class="ms-tile-title">{{ c.title }}</span>
                  <el-icon class="ms-tile-enter" :size="13"><Right /></el-icon>
                  <span class="ms-tile-dot" aria-hidden="true" />
                </button>
              </div>
            </section>
            <div v-if="!filtered.length" class="ms-empty">没有匹配的页面，换个关键词试试</div>
          </div>
        </section>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
/* ---------- 遮罩：调暗背景以聚焦（同命令面板） ---------- */
.ms-scrim {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(22, 25, 31, 0.28);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding: 20px;
}

/* ---------- 抽屉面板：与 Dock 胶囊同一材质 ----------
   86% 白玻璃 + blur(20) saturate(180) + 内侧 1px 高光 + 深柔影，
   完全复刻 .dock-pill 的质感语法，仅形制放大为面板 */
.ms-sheet {
  width: min(880px, 100%);
  max-height: min(76vh, 700px);
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.86);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--ag-border);
  border-radius: 28px;
  box-shadow: 0 12px 40px rgba(22, 25, 31, 0.14), 0 1px 0 rgba(255, 255, 255, 0.6) inset;
  overflow: hidden;
}

/* ---------- 头部 ---------- */
.ms-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 24px 14px;
}
.ms-title {
  margin: 0;
  font-family: var(--ag-font-display);
  font-size: var(--ag-fs-h3);
  letter-spacing: var(--ag-ls-h3);
  color: var(--ag-text-1);
}
.ms-sub {
  margin: 3px 0 0;
  font-size: var(--ag-fs-micro);
  letter-spacing: var(--ag-ls-micro);
  color: var(--ag-text-4);
}
/* 胶囊筛选框：与 Dock 同级控件形制（胶囊 + 发丝边 + 玻璃白） */
.ms-search {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 220px;
  padding: 8px 14px;
  border-radius: var(--ag-radius-pill);
  border: 1px solid var(--ag-border);
  background: rgba(255, 255, 255, 0.6);
  transition: border-color var(--ag-dur) var(--ag-ease), background var(--ag-dur) var(--ag-ease);
}
.ms-search:focus-within {
  border-color: var(--ag-green-300);
  background: var(--ag-bg-surface);
}
.ms-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: var(--ag-text-1);
}
.ms-search input::placeholder {
  color: var(--ag-text-4);
}
/* 关闭按钮：Dock 级控件（8px 控件圆角档，按下即缩放） */
.ms-close {
  flex: none;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 11px;
  background: rgba(22, 25, 31, 0.05);
  color: var(--ag-text-2);
  cursor: pointer;
  transition: background var(--ag-dur) var(--ag-ease), transform 0.1s ease-out;
}
.ms-close:hover {
  background: rgba(22, 25, 31, 0.08);
  color: var(--ag-text-1);
}
.ms-close:active {
  transform: scale(0.92);
  transition-duration: 0.05s;
}

/* ---------- 分组：11px 小标签（同 dock-label 字级）+ 发丝分隔 ---------- */
.ms-body {
  overflow-y: auto;
  padding: 0 24px 24px;
}
.ms-group {
  padding-top: 16px;
}
.ms-group + .ms-group {
  border-top: 1px solid var(--ag-border-light);
  margin-top: 16px;
}
.ms-group-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 2px 10px;
}
.ms-group-icon {
  color: var(--ag-green-600);
}
.ms-group-title {
  font-size: var(--ag-fs-micro);
  font-weight: 600;
  letter-spacing: var(--ag-ls-micro);
  color: var(--ag-text-3);
}
.ms-group-count {
  font-size: 11px;
  font-family: var(--ag-font-num);
  color: var(--ag-text-4);
}

/* ---------- 磁贴：Dock 项目的横向版 ----------
   无边框透明底 + 14px 圆角 + hover 浅灰 + 按下 scale(0.96)，
   当前页以蓝字 + 底部蓝点指示（同 dock-item.active） */
.ms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 2px 6px;
}
.ms-tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 12px;
  border: none;
  border-radius: 14px;
  background: transparent;
  font: inherit;
  color: var(--ag-text-1);
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--ag-dur) var(--ag-ease), color var(--ag-dur) var(--ag-ease),
    transform 0.1s ease-out;
}
.ms-tile:active {
  transform: scale(0.96);
  transition-duration: 0.05s;
}
@media (hover: hover) and (pointer: fine) {
  .ms-tile:hover {
    background: rgba(22, 25, 31, 0.05);
  }
  .ms-tile:hover .ms-tile-enter {
    opacity: 1;
  }
}
.ms-tile-icon {
  flex: none;
  color: var(--ag-text-3);
  transition: color var(--ag-dur) var(--ag-ease);
}
.ms-tile-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ms-tile-enter {
  flex: none;
  opacity: 0;
  color: var(--ag-green-600);
  transition: opacity var(--ag-dur-fast) var(--ag-ease);
}
/* 当前页指示点：同 dock-dot（4px 蓝点，缩放出现） */
.ms-tile-dot {
  position: absolute;
  bottom: 4px;
  left: 18px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: transparent;
  transform: translateX(-50%) scale(0);
  transition: transform var(--ag-dur) var(--ag-ease), background var(--ag-dur) var(--ag-ease);
}
.ms-tile.active {
  color: var(--ag-green-700);
}
.ms-tile.active .ms-tile-icon {
  color: var(--ag-green-600);
}
.ms-tile.active .ms-tile-dot {
  background: var(--ag-green-600);
  transform: translateX(-50%) scale(1);
}

.ms-empty {
  padding: 48px 0;
  text-align: center;
  color: var(--ag-text-4);
  font-size: 13px;
}

/* ---------- 进入/退出同路径：从 Dock 方向升起 ---------- */
.ms-enter-active,
.ms-leave-active {
  transition: opacity var(--ag-dur-slow) var(--ag-ease);
}
.ms-enter-active .ms-sheet,
.ms-leave-active .ms-sheet {
  transition: transform var(--ag-dur-slow) var(--ag-ease), opacity var(--ag-dur-slow) var(--ag-ease);
}
.ms-enter-from,
.ms-leave-to {
  opacity: 0;
}
.ms-enter-from .ms-sheet,
.ms-leave-to .ms-sheet {
  transform: translateY(28px);
  opacity: 0;
}

/* ---------- 移动端：全屏化（含顶部状态栏 / 底部安全区留位） ---------- */
@media (max-width: 768px) {
  .ms-scrim {
    padding: 0;
  }
  .ms-sheet {
    width: 100%;
    max-height: 100%;
    height: 100%;
    border-radius: 0;
    border: none;
    padding-top: env(safe-area-inset-top);
    /* 全屏形态下玻璃透出底层内容影响可读性，改为近实心底 */
    background: var(--ag-bg-surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .ms-head {
    flex-wrap: wrap;
    padding: 16px 18px 12px;
  }
  .ms-search {
    order: 3;
    width: 100%;
    height: 44px;
  }
  .ms-close {
    width: 44px;
    height: 44px;
  }
  .ms-body {
    padding: 0 12px calc(18px + env(safe-area-inset-bottom));
  }
  .ms-tile {
    padding: 13px 12px 15px;
  }
}
/* ---------- 偏好豁免 ---------- */
@media (prefers-reduced-motion: reduce) {
  .ms-enter-active .ms-sheet,
  .ms-leave-active .ms-sheet {
    transition: none;
    transform: none;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .ms-scrim {
    backdrop-filter: none;
  }
  .ms-sheet {
    background: var(--ag-bg-surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
