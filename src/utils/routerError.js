/* ============================================================
 * 路由级错误处理：动态 chunk 加载失败 / 导航异常的分类与降级决策
 *
 * 策略：
 * - chunk 加载失败（网络抖动 / 发版后旧 hash 404）：
 *     · 站内已有可用页面 → 中止本次导航，用户停留当前页（天然隔离）
 *     · 每个会话允许一次硬刷新重试（拉取新构建资源）
 *     · 首屏无任何页面可显示 → 跳转静态 /route-error 页
 * - 其他导航错误：有当前页则停留并提示；无当前页跳 /route-error
 * ============================================================ */
import { reportError } from './errorReport'

const RELOAD_FLAG = 'agri_chunk_reload_once'

/** 错误分类（纯函数，可单测） */
export function classifyRouterError(error) {
  const msg = String(error?.message || error || '')
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed|ChunkLoadError|dynamically imported module/i.test(msg)) return 'chunk'
  if (/Cannot find module|Module not found|404/i.test(msg)) return 'chunk404'
  if (/Navigation (aborted|cancelled|duplicated|redirected)/i.test(msg)) return 'nav'
  return 'unknown'
}

/**
 * 降级决策（纯函数，可单测）
 * @returns {'reload' | 'stay' | 'error-page'}
 */
export function decideRouterErrorAction(error, { hasCurrentRoute, chunkReloadUsed }) {
  const kind = classifyRouterError(error)
  if (kind === 'chunk' || kind === 'chunk404') {
    if (!chunkReloadUsed) return 'reload'
    return hasCurrentRoute ? 'stay' : 'error-page'
  }
  if (kind === 'nav') return 'stay'
  return hasCurrentRoute ? 'stay' : 'error-page'
}

/** 安装到 router 实例（副作用层） */
export function installRouterErrorHandler(router) {
  router.onError((error, to, from) => {
    const hasCurrentRoute = !!(from && from.matched && from.matched.length)
    const chunkReloadUsed = sessionStorage.getItem(RELOAD_FLAG) === '1'
    const action = decideRouterErrorAction(error, { hasCurrentRoute, chunkReloadUsed })
    reportError(error, `router:${classifyRouterError(error)} → ${action}`)

    if (action === 'reload') {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.replace(to?.fullPath || from?.fullPath || '/')
      return
    }
    if (action === 'stay') {
      // 导航中止：用户停留在当前页面，其余功能不受影响（错误隔离）
      import('element-plus').then(({ ElMessage }) => {
        ElMessage.error('页面资源加载失败，已停留在当前页面。可稍后重试，或从菜单进入其他页面。')
      }).catch(() => {})
      return
    }
    // 首屏失败：落到静态错误页（该页非懒加载，必定可用）
    router.replace({
      path: '/route-error',
      query: { from: to?.fullPath || '/', msg: String(error?.message || '页面资源加载失败') },
    }).catch(() => {})
  })
}
