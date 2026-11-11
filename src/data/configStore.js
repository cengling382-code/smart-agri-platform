/**
 * 页面配置中心：读取 data/config/*.json（constants / screens / workbench / mobile）
 * 静态首屏同步可用，dev 环境外部修改后由 applyConfigs 原位更新并触发页面重渲染。
 */
import { reactive } from 'vue'
import { bundledAll } from './jsonSource'

const bundled = bundledAll().configs || {}

export const configStore = reactive({ ...bundled })

export function getConfig(name) {
  return configStore[name] || {}
}

/** 递归原位合并：数组 splice、对象按键覆盖，尽量保持页面已持有的引用 */
function mergeInPlace(target, next) {
  if (Array.isArray(target) && Array.isArray(next)) {
    target.splice(0, target.length, ...next)
    return target
  }
  if (target && typeof target === 'object' && !Array.isArray(target) && next && typeof next === 'object' && !Array.isArray(next)) {
    for (const key of Object.keys(target)) if (!(key in next)) delete target[key]
    for (const [key, value] of Object.entries(next)) {
      if (target[key] && typeof target[key] === 'object' && value && typeof value === 'object') mergeInPlace(target[key], value)
      else target[key] = value
    }
    return target
  }
  return next
}

/** 外部变更后原位替换配置内容，保持页面已持有的引用 */
export function applyConfigs(configs) {
  if (!configs) return
  for (const [name, data] of Object.entries(configs)) {
    if (!(name in configStore)) configStore[name] = data
    else mergeInPlace(configStore[name], data)
  }
}
