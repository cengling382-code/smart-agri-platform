import { describe, it, expect } from 'vitest'
import * as data from '@/mock/data'
import { loadDb, persistDb, exportDb, importDb, resetDb, dbStats } from '@/mock/db'

const KEY = 'agri-db-v1'

describe('JSON 本地数据库', () => {
  it('首次加载即建立 JSON 存档', () => {
    const raw = localStorage.getItem(KEY)
    expect(raw).toBeTruthy()
    const doc = JSON.parse(raw)
    expect(doc.__version).toBe(1)
    expect(Array.isArray(doc.plots)).toBe(true)
    expect(doc.plots.length).toBe(data.plots.length)
    expect(doc.__seq).toBeTruthy()
  })

  it('写操作落盘后，刷新可恢复数据', () => {
    const before = data.plots.length
    data.plots.unshift({
      id: 999001,
      code: 'PLOT-DB-TEST',
      name: '持久化测试地块',
      crop: '番茄',
      area: 12,
      status: 'active',
      tenantId: 1,
    })
    persistDb()

    const saved = JSON.parse(localStorage.getItem(KEY))
    expect(saved.plots.some((p) => p.id === 999001)).toBe(true)

    // 模拟页面刷新：清空内存集合，再从 JSON 存档回填
    data.plots.splice(0, data.plots.length)
    loadDb()
    expect(data.plots.length).toBe(before + 1)
    expect(data.plots[0].code).toBe('PLOT-DB-TEST')
  })

  it('导出 JSON 与导入 JSON 可无损往返', () => {
    const json = exportDb()
    expect(() => JSON.parse(json)).not.toThrow()
    const stats = importDb(json)
    expect(stats.collections).toBeGreaterThanOrEqual(20)
    expect(stats.records).toBeGreaterThan(0)
    expect(stats.sizeKB).toBeGreaterThan(0)
  })

  it('恢复初始数据会清除测试写入并重新落盘', () => {
    const stats = resetDb()
    expect(data.plots.some((p) => p.code === 'PLOT-DB-TEST')).toBe(false)
    expect(stats.savedAt).toBeTruthy()
    const saved = JSON.parse(localStorage.getItem(KEY))
    expect(saved.plots.some((p) => p.code === 'PLOT-DB-TEST')).toBe(false)
  })

  it('统计信息包含集合数、记录数与存储占用', () => {
    const stats = dbStats()
    expect(stats.storage).toBe('localStorage')
    expect(stats.collections).toBeGreaterThan(20)
    expect(stats.records).toBeGreaterThan(100)
    expect(stats.sizeKB).toBeGreaterThan(50)
  })
})
