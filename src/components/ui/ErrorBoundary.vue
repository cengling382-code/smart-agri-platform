<script setup>
/**
 * 页面级错误边界（Error Boundary）
 * - 捕获子树（当前页面）的渲染 / 生命周期 / 事件异常，阻止其向全局传播
 * - 单页异常时仅本页区域展示降级 UI，侧边栏 / 顶部导航 / 其他页面不受影响
 * - 提供：重试（重建页面）、返回首页、返回上一页、强制刷新、错误详情
 */
import { ref, watch, onErrorCaptured } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reportError, getErrorLog } from '@/utils/errorReport'

const props = defineProps({
  /** 路由标识：变化时自动复位错误状态（切页即恢复） */
  routeKey: { type: String, default: '' },
  /** 紧凑模式（移动端 / 大屏使用） */
  compact: { type: Boolean, default: false },
})

// 路由上下文可选：无 router 环境（如纯组件测试）下边界依然可用
let route = null
let router = null
try {
  route = useRoute()
  router = useRouter()
} catch { /* 无路由上下文 */ }

const error = ref(null)
const errorInfo = ref('')
const showDetail = ref(false)
const nonce = ref(0) // 重试计数：驱动插槽内容重建

onErrorCaptured((err, _instance, info) => {
  error.value = err
  errorInfo.value = info
  reportError(err, `boundary:${info}`)
  // 返回 false：终止继续向上传播 —— 实现「错误隔离」
  return false
})

// 路由变化（前进 / 返回 / 跳转其他页面）时自动清除错误状态
watch(() => props.routeKey || route?.fullPath || '', () => {
  error.value = null
  errorInfo.value = ''
  showDetail.value = false
})

function retry() {
  error.value = null
  errorInfo.value = ''
  nonce.value++
}
function goHome() {
  if (router) router.push('/dashboard').catch(() => router.push('/'))
  else window.location.hash = '#/dashboard'
}
function goBack() {
  if (router) router.back()
  else window.history.back()
}
function hardReload() {
  window.location.reload()
}
const recentLog = ref([])
function toggleDetail() {
  showDetail.value = !showDetail.value
  if (showDetail.value) recentLog.value = getErrorLog().slice(0, 6)
}
</script>

<template>
  <div class="eb-root" :class="{ compact }">
    <!-- 正常渲染 -->
    <template v-if="!error">
      <slot :nonce="nonce" />
    </template>

    <!-- 降级 UI：仅替换当前页面区域 -->
    <div v-else class="eb-fallback" role="alert" aria-live="assertive">
      <div class="eb-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" class="eb-leaf">
          <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(232,149,82,.14)" />
          <path d="M24 10l12 24H12z" fill="none" stroke="#E89552" stroke-width="2.6" stroke-linejoin="round" />
          <circle cx="24" cy="28" r="1.8" fill="#E89552" />
          <path d="M24 22v-4" stroke="#E89552" stroke-width="2.6" stroke-linecap="round" />
        </svg>
      </div>
      <h2 class="eb-title">页面加载出现问题</h2>
      <p class="eb-desc">
        当前页面内容暂时无法正常显示，但<b>平台其他功能不受影响</b>。
        您可以重试本页，或通过左侧菜单 / 下方按钮继续使用其他功能。
      </p>
      <p class="eb-msg mono-num" v-if="error?.message">{{ error.message }}</p>

      <div class="eb-actions">
        <el-button type="primary" :icon="'RefreshRight'" @click="retry">重试加载本页</el-button>
        <el-button :icon="'House'" @click="goHome">返回首页</el-button>
        <el-button :icon="'Back'" @click="goBack">返回上一页</el-button>
        <el-button :icon="'Refresh'" @click="hardReload">刷新整站</el-button>
        <el-button link type="info" @click="toggleDetail">{{ showDetail ? '收起详情' : '查看错误详情' }}</el-button>
      </div>

      <div v-if="showDetail" class="eb-detail">
        <div class="eb-detail-row"><b>触发阶段</b><span class="mono-num">{{ errorInfo || 'render' }}</span></div>
        <div class="eb-detail-row"><b>错误信息</b><span class="mono-num">{{ error?.message }}</span></div>
        <div v-if="error?.stack" class="eb-detail-row"><b>调用栈（截取）</b><pre class="eb-stack">{{ error.stack }}</pre></div>
        <div v-if="recentLog.length" class="eb-detail-row">
          <b>近期错误记录</b>
          <ul class="eb-log">
            <li v-for="(l, i) in recentLog" :key="i">
              <span class="mono-num">{{ l.time }}</span> [{{ l.context }}] {{ l.message }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.eb-root {
  height: 100%;
  min-height: 0;
}
.eb-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 24px;
  min-height: 420px;
  animation: agFadeUp 0.4s var(--ag-ease) both;
}
.eb-leaf {
  width: 64px;
  height: 64px;
}
.eb-title {
  font-size: 20px;
  color: var(--ag-text-1);
  margin: 16px 0 6px;
}
.eb-desc {
  color: var(--ag-text-3);
  font-size: 13px;
  max-width: 460px;
  line-height: 1.8;
  margin: 0 0 8px;
}
.eb-desc b {
  color: var(--ag-green-700);
}
.eb-msg {
  font-size: 11px;
  color: var(--ag-text-4);
  background: var(--ag-bg-hover);
  border-radius: 8px;
  padding: 4px 12px;
  max-width: 560px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 0 18px;
}
.eb-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.eb-detail {
  margin-top: 22px;
  width: min(640px, 92%);
  text-align: left;
  background: var(--ag-bg-hover);
  border: 1px solid var(--ag-border-light);
  border-radius: 12px;
  padding: 14px 16px;
  animation: agFadeUp 0.3s var(--ag-ease) both;
}
.eb-detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  font-size: 12px;
}
.eb-detail-row b {
  color: var(--ag-text-3);
}
.eb-stack {
  font-family: Consolas, monospace;
  font-size: 11px;
  color: var(--ag-text-2);
  background: #fff;
  border-radius: 8px;
  padding: 8px 10px;
  overflow: auto;
  max-height: 120px;
  margin: 0;
  white-space: pre-wrap;
}
.eb-log {
  margin: 0;
  padding-left: 16px;
  color: var(--ag-text-2);
  font-size: 11px;
  line-height: 1.9;
}

/* 紧凑模式：移动端 / 大屏 */
.eb-root.compact .eb-fallback {
  min-height: 300px;
  padding: 36px 16px;
}
.eb-root.compact .eb-actions {
  flex-direction: column;
  width: min(280px, 100%);
}
.eb-root.compact .eb-actions :deep(.el-button) {
  width: 100%;
  margin-left: 0;
}
</style>
