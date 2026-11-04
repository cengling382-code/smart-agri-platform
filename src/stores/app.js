import { defineStore } from 'pinia'

/** 全局 UI 状态（精简版）：原设备识别/视图切换/访问标签已随响应式适配与命令面板下线 */
export const useAppStore = defineStore('app', {
  state: () => ({}),
  persist: false,
})
