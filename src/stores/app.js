import { defineStore } from 'pinia'

const VIEW_MODE_KEY = 'ag-view-mode'

/** 设备形态自动识别：UA 与视口宽度任一命中即视为移动设备 */
function detectDevice() {
  if (typeof window === 'undefined') return 'desktop'
  const saved = localStorage.getItem(VIEW_MODE_KEY)
  if (saved === 'desktop' || saved === 'mobile') return saved
  const isMobileUA = /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent)
  return isMobileUA || window.innerWidth < 768 ? 'mobile' : 'desktop'
}

/** 用户是否手动选择过视图：手动选择后不再被自动识别改写 */
function readManualChoice() {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem(VIEW_MODE_KEY)
  return saved === 'desktop' || saved === 'mobile'
}

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    device: detectDevice(),
    manualViewMode: readManualChoice(),
    visitedTags: [],
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    setDevice(mode) {
      if (mode !== 'desktop' && mode !== 'mobile') return
      this.device = mode
      this.manualViewMode = true
      try {
        localStorage.setItem(VIEW_MODE_KEY, mode)
      } catch { /* 隐私模式下写入失败可忽略 */ }
    },
    addTag(route) {
      if (!route.name || route.meta?.hideTag) return
      if (!this.visitedTags.some((t) => t.path === route.path)) {
        this.visitedTags.push({ name: route.name, path: route.path, title: route.meta.title || route.name })
      }
      if (this.visitedTags.length > 12) this.visitedTags.shift()
    },
    removeTag(path) {
      const i = this.visitedTags.findIndex((t) => t.path === path)
      return i > -1 ? this.visitedTags[i - 1] || this.visitedTags[i + 1] : null
    },
  },
  persist: false,
})
