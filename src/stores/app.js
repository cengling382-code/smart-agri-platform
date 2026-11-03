import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    device: 'desktop',
    visitedTags: [],
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
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
