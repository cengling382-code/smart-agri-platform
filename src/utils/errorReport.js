/* ============================================================
 * 全局错误上报中心：统一收集 Vue / window / Promise 异常
 * 目标：任何单点异常只被记录与提示，绝不中断应用运行
 * ============================================================ */

const RING_MAX = 60
const ring = []
const seen = new Map() // 简单去重：同一 message 5s 内只记录一次

export function getErrorLog() {
  return [...ring].reverse()
}
export function clearErrorLog() {
  ring.length = 0
  seen.clear()
}

/** 记录一条错误（去抖、环形缓冲、控制台输出） */
export function reportError(err, context = '') {
  const message = err?.message || String(err || 'Unknown error')
  const now = Date.now()
  const key = `${context}::${message}`
  if ((seen.get(key) || 0) > now - 5000) return
  seen.set(key, now)
  if (seen.size > 200) {
    for (const [k, t] of seen) {
      if (t < now - 30000) seen.delete(k)
    }
  }
  const entry = {
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    context,
    message,
    stack: err?.stack ? String(err.stack).split('\n').slice(0, 4).join('\n') : '',
  }
  ring.push(entry)
  if (ring.length > RING_MAX) ring.shift()
  console.warn(`[agri-error${context ? ' · ' + context : ''}]`, message)
}

/**
 * 安装全局兜底：
 * 1) app.config.errorHandler —— 捕获组件渲染 / 生命周期 / 事件处理器异常（阻止 Vue 默认的破坏性抛出）
 * 2) window.onerror —— 捕获同步脚本错误与静态资源加载失败
 * 3) unhandledrejection —— 捕获未处理的 Promise 异常（接口超时等）
 */
export function installGlobalErrorHandlers(app) {
  app.config.errorHandler = (err, _instance, info) => {
    reportError(err, `vue:${info}`)
  }

  window.addEventListener('error', (event) => {
    // 静态资源（脚本/样式）加载失败：仅记录，不影响 SPA 运行
    if (event?.target && event.target !== window && (event.target.src || event.target.href)) {
      reportError(new Error(`静态资源加载失败: ${event.target.src || event.target.href}`), 'resource')
      return
    }
    reportError(event.error || event.message, 'window')
  }, true)

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'unhandledrejection')
    // 阻止默认的控制台噪音之外的传播；应用保持运行
  })
}
