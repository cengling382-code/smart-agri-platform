/**
 * 全局数据版本号：本地 JSON 文件发生变更时递增，页面/组件据此自动重取数据。
 * dev 环境通过 SSE 接收变更（外部编辑 JSON / 其它标签页写入），静态部署自动跳过。
 */
import { ref, watch, onScopeDispose } from 'vue'
import { dbMeta, ensureDbReady, applyServerDoc } from '@/mock/db'
import { fetchServerAll } from '@/data/jsonSource'

/** 每次数据变更 +1，组件 watch 即可感知 */
export const dataVersion = ref(0)
/** 最近一次变更涉及的集合键（为空表示全量） */
export const lastChangeKeys = ref([])
/** live：SSE 实时联动；static：纯静态/降级模式 */
export const liveMode = ref('unknown')
/** 外部 JSON 解析失败等错误提示 */
export const liveError = ref('')

let source = null
let started = false
let refreshing = false
let pendingRefresh = false

async function refreshFromServer(keys = []) {
  // 一次保存常产生多条 SSE 事件；原实现会丢弃并发事件，导致最后一次改动偶发不生效
  if (refreshing) {
    pendingRefresh = true
    return
  }
  refreshing = true
  try {
    const doc = await fetchServerAll()
    if (!doc) return
    applyServerDoc(doc)
    lastChangeKeys.value = keys
    dataVersion.value += 1
  } catch (e) {
    console.warn('[live] 拉取最新 JSON 失败', e)
  } finally {
    refreshing = false
    if (pendingRefresh) {
      pendingRefresh = false
      refreshFromServer([])
    }
  }
}

/** 手动触发一次全量对账（外部修改后由 SSE 自动调用，也可供页面调试使用） */
export function refreshData(keys = []) {
  return refreshFromServer(keys)
}

/** 启动实时联动（main.js 挂载后调用一次） */
export async function startLiveSync() {
  if (started) return
  started = true
  const { mode } = await ensureDbReady()
  liveMode.value = mode
  if (mode !== 'file' || typeof EventSource === 'undefined') return

  source = new EventSource('/__data/events')
  source.onopen = () => {
    // 断线重连后先对账，避免漏掉断线期间的外部修改
    if (dataVersion.value > 0) refreshFromServer([])
  }
  source.onmessage = (event) => {
    let msg
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }
    if (msg?.type === 'error') {
      liveError.value = msg.error || '外部 JSON 格式错误'
      console.warn('[live]', msg.error)
      return
    }
    if (msg?.type !== 'change') return
    // 忽略本标签页自己发起的写入，避免重复刷新
    if (msg.origin === 'api' && msg.clientId === dbMeta.clientId) return
    refreshFromServer(msg.keys || [])
  }
  source.onerror = () => {
    // 断线由 EventSource 自动重连，onopen 中会做一次全量对账
  }
}

/** 停止实时联动（测试/热更新场景） */
export function stopLiveSync() {
  if (source) source.close()
  source = null
  started = false
}

/**
 * 监听数据变更：组件卸载时自动清理。
 * @param {Function} fn 变更后执行的回调（通常为页面 load 函数）
 * @param {{ keys?: string[], debounce?: number }} options
 */
export function onDataChange(fn, { keys = [], debounce = 250 } = {}) {
  let timer = null
  const stop = watch(dataVersion, () => {
    if (keys.length && lastChangeKeys.value.length && !lastChangeKeys.value.some((k) => keys.includes(k))) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        fn()
      } catch (e) {
        console.warn('[live] 刷新回调失败', e)
      }
    }, debounce)
  })
  onScopeDispose(() => {
    clearTimeout(timer)
    stop()
  })
  return stop
}
