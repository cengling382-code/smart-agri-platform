/**
 * 场景一/二/三：页面组件渲染报错 → 错误边界隔离 + 重试恢复 + 路由切换自动复位
 * 验证目标：单个组件崩溃绝不向外传播，边界外内容与导航不受影响
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import ElementPlus from 'element-plus'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import { reportError, getErrorLog, clearErrorLog } from '@/utils/errorReport'

const EP = { global: { plugins: [ElementPlus] } }

let shouldThrow = true
/** 首次渲染抛错、重试后恢复的模拟页面组件 */
const Flippy = defineComponent({
  setup() {
    if (shouldThrow) throw new Error('first-fail-render')
    return () => h('div', { class: 'page-ok' }, 'RECOVERED')
  },
})
const Bad = defineComponent({ setup() { throw new Error('boom-render') }, render: () => h('div') })

describe('ErrorBoundary 错误边界', () => {
  beforeEach(() => {
    shouldThrow = true
    clearErrorLog()
  })

  it('子组件渲染报错时展示降级 UI，且异常不向外传播（mount 不抛错）', async () => {
    const wrapper = mount(ErrorBoundary, { ...EP, slots: { default: Bad } })
    await nextTick()
    expect(wrapper.html()).toContain('页面加载出现问题')
    expect(wrapper.html()).toContain('boom-render')
    // 降级文案包含说明与其他操作入口
    expect(wrapper.html()).toContain('平台其他功能不受影响')
    expect(wrapper.text()).toContain('返回首页')
    expect(wrapper.text()).toContain('返回上一页')
    expect(wrapper.text()).toContain('刷新整站')
  })

  it('边界外的兄弟内容不受边界内崩溃影响（错误隔离）', async () => {
    const Parent = defineComponent({
      render() {
        return h('div', [
          h('section', { class: 'safe-zone' }, 'SAFE-ZONE'),
          h(ErrorBoundary, null, { default: () => h(Bad) }),
        ])
      },
    })
    const wrapper = mount(Parent)
    await nextTick()
    expect(wrapper.find('.safe-zone').text()).toBe('SAFE-ZONE')
    expect(wrapper.html()).toContain('页面加载出现问题')
  })

  it('点击「重试加载本页」可重建页面：组件恢复后正常展示', async () => {
    const wrapper = mount(ErrorBoundary, { ...EP, slots: { default: () => h(Flippy) } })
    await nextTick()
    expect(wrapper.html()).toContain('页面加载出现问题')
    shouldThrow = false
    const retryBtn = wrapper.findAll('button').find((b) => b.text().includes('重试加载本页'))
    expect(retryBtn).toBeTruthy()
    await retryBtn.trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.page-ok').text()).toBe('RECOVERED')
  })

  it('路由切换（routeKey 变化）自动复位错误状态', async () => {
    const wrapper = mount(ErrorBoundary, {
      ...EP,
      props: { routeKey: '/a' },
      slots: { default: () => h(Flippy) },
    })
    await nextTick()
    expect(wrapper.html()).toContain('页面加载出现问题')
    shouldThrow = false
    await wrapper.setProps({ routeKey: '/b' })
    await flushPromises()
    expect(wrapper.find('.page-ok').exists()).toBe(true)
  })

  it('错误被记入全局错误日志（可追溯）', async () => {
    const wrapper = mount(ErrorBoundary, { ...EP, slots: { default: Bad } })
    await nextTick()
    const log = getErrorLog()
    expect(log.length).toBeGreaterThan(0)
    expect(log[0].message).toContain('boom-render')
  })

  it('reportError 去重：同一错误 5 秒内只记录一次', () => {
    clearErrorLog()
    reportError(new Error('dup'), 't')
    reportError(new Error('dup'), 't')
    reportError(new Error('dup'), 't')
    expect(getErrorLog().filter((l) => l.message === 'dup').length).toBe(1)
  })
})
