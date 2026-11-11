import { describe, it, expect, beforeAll } from 'vitest'
import manifest from '../data/manifest.json'
import { bundledAll } from '@/data/jsonSource'
import { getConfig, applyConfigs } from '@/data/configStore'
import * as data from '@/mock/data'
import { ensureDbReady, applyServerDoc, persistDb, dbStats } from '@/mock/db'
import { handleMock } from '@/mock/index'

const bundled = bundledAll()

describe('本地 JSON 数据驱动架构', () => {
  beforeAll(async () => {
    await ensureDbReady()
  })

  it('manifest 中每个集合都能从独立 JSON 文件读到数组', () => {
    const keys = Object.keys(manifest.collections || {})
    expect(keys.length).toBeGreaterThanOrEqual(30)
    for (const key of keys) {
      expect(Array.isArray(bundled.collections[key]), `${key} 不是数组`).toBe(true)
    }
    const singles = Object.keys(manifest.singletons || {})
    expect(singles.length).toBeGreaterThanOrEqual(4)
    for (const key of singles) {
      expect(bundled.singletons[key] && typeof bundled.singletons[key] === 'object', `${key} 不是对象`).toBe(true)
    }
  })

  it('页面配置全部来自 data/config/*.json', () => {
    const c = getConfig('constants')
    expect(c.cropNames.length).toBeGreaterThan(0)
    expect(c.plotTypes).toContain('设施大棚')
    expect(c.farmTypes.length).toBeGreaterThan(0)
    expect(c.statusTagMaps.online.type).toBe('success')
    expect(getConfig('screens').plotColors.length).toBeGreaterThan(0)
    expect(getConfig('screens').overview.mapPlots.length).toBeGreaterThan(0)
    expect(getConfig('workbench').quickEntries.length).toBeGreaterThan(0)
    expect(getConfig('mobile').quickEntries.length).toBeGreaterThan(0)
  })

  it('applyConfigs 原位更新且保持页面持有引用', () => {
    const ref = getConfig('constants').farmTypes
    applyConfigs({ constants: { farmTypes: ['播种', '施肥'] } })
    expect(getConfig('constants').farmTypes).toBe(ref)
    expect(ref).toEqual(['播种', '施肥'])
    applyConfigs({ constants: bundled.configs.constants })
    expect(ref).toEqual(bundled.configs.constants.farmTypes)
  })

  it('applyServerDoc 原位替换集合，业务模块引用不失效', () => {
    const plotsRef = data.plots
    const doc = {
      collections: { plots: [{ ...bundled.collections.plots[0], name: '外部变更测试地块' }] },
      singletons: bundled.singletons,
      configs: bundled.configs,
      __seq: bundled.__seq,
      __version: bundled.__version,
      __savedAt: new Date().toISOString(),
    }
    applyServerDoc(doc)
    expect(data.plots).toBe(plotsRef)
    expect(data.plots[0].name).toBe('外部变更测试地块')
    expect(data.plots.length).toBe(1)
    // 还原
    applyServerDoc({ ...bundled, __savedAt: new Date().toISOString() })
    expect(data.plots.length).toBe(bundled.collections.plots.length)
  })

  it('新增地块通过接口写入后，存档立即包含该记录', async () => {
    const before = data.plots.length
    const res = await handleMock({
      url: '/plots',
      method: 'post',
      data: { code: 'PLOT-JSON-E2E', name: 'JSON 写入测试地块', type: '大田', crop: '番茄', areaMu: 9, status: '种植中' },
    })
    expect(res.code).toBe(0)
    expect(data.plots.length).toBe(before + 1)
    persistDb()
    const doc = JSON.parse(localStorage.getItem('agri-db-v1'))
    expect(doc.plots.some((p) => p.code === 'PLOT-JSON-E2E')).toBe(true)
    expect(dbStats().records).toBeGreaterThan(0)
  })
})
