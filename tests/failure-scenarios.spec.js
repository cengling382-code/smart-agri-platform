/**
 * 场景四组：异常边界测试
 * 1. 接口请求超时 / 网络错误 → 友好文案 + 列表页降级为空态，不崩溃
 * 2. 页面资源 404 → 命中 catch-all NotFound，且导航可恢复
 * 3. 动态加载脚本（chunk）执行失败 → 分类与降级决策正确，站内停留/兜底页
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import { request, default as service } from '@/api/request'
import ProTable from '@/components/ui/ProTable.vue'
import router from '@/router'
import { classifyRouterError, decideRouterErrorAction, installRouterErrorHandler } from '@/utils/routerError'

beforeAll(() => {
  setActivePinia(createPinia())
})

describe('接口请求超时与网络错误', () => {
  it('请求超时：request() 以友好文案 reject，且不抛出同步异常', async () => {
    service.defaults.adapter = (config) =>
      new Promise((_, reject) =>
        setTimeout(() => {
          const e = new Error(`timeout of ${config.timeout}ms exceeded`)
          e.code = 'ECONNABORTED'
          reject(e)
        }, 10)
      )
    await expect(request({ url: '/stats/dashboard', timeout: 10 })).rejects.toThrow('请求超时')
  })

  it('网络错误：归一化为可读文案', async () => {
    service.defaults.adapter = () =>
      Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))
    await expect(request({ url: '/anything' })).rejects.toThrow('网络连接异常')
  })

  it('接口挂起时，列表页（ProTable）降级为空态而非崩溃，分页仍可交互', async () => {
    const wrapper = mount(ProTable, {
      props: {
        columns: [{ prop: 'name', label: '名称' }],
        fetch: () => Promise.reject(new Error('请求超时，请检查网络后重试')),
      },
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('暂无数据')
    expect(wrapper.find('.pager').exists()).toBe(true)
    // 组件仍然存活：表格容器存在
    expect(wrapper.find('.el-table').exists()).toBe(true)
  })
})

describe('页面资源 404', () => {
  it('未知路径命中 catch-all NotFound 路由，页面正常渲染', async () => {
    const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
    await router.push('/this-route-does-not-exist-xyz')
    await router.isReady()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('NotFound')
    expect(wrapper.html()).toContain('404')
  })

  it('404 后仍可正常导航到其他页面（无残留性崩溃）', async () => {
    await router.push('/login')
    await router.isReady()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('Login')
    await router.push('/register')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('Register')
  })
})

describe('动态加载脚本（chunk）执行失败', () => {
  const chunkErr = new Error('Failed to fetch dynamically imported module: http://localhost/assets/Dashboard-abc123.js')

  it('错误分类：chunk / 404模块 / 导航中止 / 未知', () => {
    expect(classifyRouterError(chunkErr)).toBe('chunk')
    expect(classifyRouterError(new Error('Loading chunk 5 failed'))).toBe('chunk')
    expect(classifyRouterError(new Error('Importing a module script failed.'))).toBe('chunk')
    expect(classifyRouterError(new Error('Cannot find module "./Missing.vue"'))).toBe('chunk404')
    expect(classifyRouterError(new Error('Navigation aborted'))).toBe('nav')
    expect(classifyRouterError(new Error('something else'))).toBe('unknown')
  })

  it('降级决策：站内有可用页面 → 停留当前页（错误隔离，不跳站）', () => {
    expect(decideRouterErrorAction(chunkErr, { hasCurrentRoute: true, chunkReloadUsed: false })).toBe('reload')
    expect(decideRouterErrorAction(chunkErr, { hasCurrentRoute: true, chunkReloadUsed: true })).toBe('stay')
    expect(decideRouterErrorAction(new Error('Navigation aborted'), { hasCurrentRoute: true, chunkReloadUsed: false })).toBe('stay')
  })

  it('降级决策：首屏无可用页面 → 落到静态 /route-error 兜底页', () => {
    expect(decideRouterErrorAction(chunkErr, { hasCurrentRoute: false, chunkReloadUsed: true })).toBe('error-page')
    expect(decideRouterErrorAction(new Error('anything'), { hasCurrentRoute: false, chunkReloadUsed: false })).toBe('error-page')
  })

  it('错误处理器可安全安装到真实 router（重复安装不抛错）', () => {
    expect(() => installRouterErrorHandler(router)).not.toThrow()
    expect(() => installRouterErrorHandler(router)).not.toThrow()
  })
})
