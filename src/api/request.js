import axios from 'axios'
import { handleMock } from '@/mock'
import { reportError } from '@/utils/errorReport'

/** 模拟 REST 请求：自定义 adapter → Mock 分发器（模拟延迟 90-250ms） */
const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

/**
 * 自定义 adapter：
 * - 注入 Token
 * - 强制执行 timeout（真实超时控制，模拟慢网/接口挂起场景）
 * - 超时/网络错误 → 归一化为友好文案，页面只需捕获 Error.message
 */
service.defaults.adapter = (config) =>
  new Promise((resolve, reject) => {
    config.headers = config.headers || {}
    const token = localStorage.getItem('agri_token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      const err = new Error(`请求超时（${config.timeout || 10000}ms）`)
      err.code = 'ECONNABORTED'
      reject(err)
    }, config.timeout || 10000)

    handleMock(config).then(
      (res) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({ data: res, status: 200, statusText: 'OK', headers: {}, config, request: {} })
      },
      (err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    )
  })

/** 统一业务响应封装：失败一律 reject(Error)，消息已翻译为用户可读文案 */
export function request(options) {
  return service(options).then(
    (res) => res.data.data,
    (err) => {
      let msg = err?.response?.data?.msg || err?.message || '网络异常，请稍后重试'
      if (err?.code === 'ECONNABORTED' || /timeout/i.test(String(msg))) {
        msg = '请求超时，请检查网络后重试'
      } else if (/Network Error|ERR_NETWORK/i.test(String(msg))) {
        msg = '网络连接异常，请稍后重试'
      }
      reportError(new Error(msg), `api:${options.url || ''}`)
      return Promise.reject(new Error(msg))
    }
  )
}

/** 分页参数快捷构造 */
export const pageParams = (page, size, extra = {}) => ({ page, size, ...extra })

export default service
