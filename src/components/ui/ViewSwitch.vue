<script setup>
/** 视图模式切换：桌面管理端 ⇄ 移动端门户（手动覆盖自动识别） */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const auth = useAuthStore()
const router = useRouter()

const isMobile = computed(() => app.device === 'mobile')

function select(mode) {
  if (app.device === mode) return
  app.setDevice(mode)
  if (mode === 'mobile') router.push(auth.isLoggedIn ? '/m/home' : '/m/login')
  else router.push(auth.isLoggedIn ? '/dashboard' : '/login')
}
</script>

<template>
  <div class="view-switch" :class="{ 'is-mobile': isMobile }" role="group" aria-label="视图模式切换">
    <button
      type="button"
      class="seg"
      :class="{ active: !isMobile }"
      :aria-pressed="!isMobile"
      title="桌面端视图"
      @click="select('desktop')"
    >
      <el-icon :size="13"><Monitor /></el-icon>
      <span>桌面端</span>
    </button>
    <button
      type="button"
      class="seg"
      :class="{ active: isMobile }"
      :aria-pressed="isMobile"
      title="移动端视图"
      @click="select('mobile')"
    >
      <el-icon :size="13"><Iphone /></el-icon>
      <span>移动端</span>
    </button>
  </div>
</template>

<style scoped>
/* 定位：固定右下角，移动端视图时上移到标签栏之上，避免遮挡底部导航。
   视觉：半透明白底 + 轻模糊，只用 1 层描边与最小阴影，不做发光，
   保证在深浅两种页面底色上都能读清，又不会抢内容视线。 */
.view-switch {
  position: fixed;
  right: var(--ag-space-4);
  bottom: var(--ag-space-4);
  z-index: 1900;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-sm);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
  box-shadow: var(--ag-shadow-sm);
  opacity: 0.72;
  transition: opacity var(--ag-dur) var(--ag-ease), box-shadow var(--ag-dur) var(--ag-ease);
}
.view-switch:hover,
.view-switch:focus-within {
  opacity: 1;
  box-shadow: var(--ag-shadow);
}
.view-switch.is-mobile {
  bottom: calc(62px + env(safe-area-inset-bottom) + 12px);
}
.seg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border: none;
  border-radius: calc(var(--ag-radius-sm) - 2px);
  background: transparent;
  color: var(--ag-text-3);
  font-size: var(--ag-fs-micro);
  letter-spacing: var(--ag-ls-micro);
  line-height: 1;
  cursor: pointer;
  transition: color var(--ag-dur-fast) var(--ag-ease), background var(--ag-dur-fast) var(--ag-ease);
}
.seg:hover {
  color: var(--ag-text-1);
}
.seg:active {
  transform: scale(0.97);
}
.seg.active {
  background: var(--ag-green-700);
  color: #fff;
}
@media (prefers-reduced-motion: reduce) {
  .seg:active { transform: none; }
}
</style>
