/* ============================================================
 * JSON 本地数据库（浏览器端）
 * ------------------------------------------------------------
 * 数据源：data/ 目录下按模块拆分的 JSON 文件（通过 src/data/jsonSource.js 装载）
 * 写回：dev 环境通过 Vite 插件 POST /__data/write 原子写回对应 JSON 文件；
 *       纯静态部署（无插件）自动降级为 localStorage 快照。
 * 实时：外部修改 JSON → 插件 fs.watch → SSE → useDataVersion 拉取 /__data/all
 *       后调用 applyServerDoc 原位更新集合，页面无需刷新。
 *
 * 接口层（mock/index.js）仍只操作 data.js 导出的可变数组/对象，
 * 任一写操作成功后由分发器统一调用 persistDb()。
 * ============================================================ */
import * as seed from './data'
import { bundledAll, fetchServerAll, probeJsonService, writeCollections, writeManifest } from '@/data/jsonSource'
import { applyConfigs } from '@/data/configStore'

const STORAGE_KEY = 'agri-db-v1'
// v3：设备「下挂设备数」字段由 children 改名 childCount（数字型 children 会触发 el-table 树表崩溃）
const VERSION = 3
/** 只读常量字典，不参与持久化 */
const STATIC_ARRAY = new Set(['CROPS'])
/** 对象型单例集合 */
const SINGLETONS = ['plotShapes', 'weather', 'collectConfig', 'paramMeta']

const DEFAULT_SEQ = {
  user: 100,
  role: 10,
  ...Object.fromEntries(
    ['plots', 'devices', 'alarms', 'strategies', 'tasks', 'plans', 'orders', 'materials', 'stock',
      'ledger', 'personnel', 'harvests', 'trace', 'residue', 'products', 'sales', 'customers', 'dict',
      'params', 'logs', 'files', 'tenants', 'apis', 'reports'].map((k) => [k, 10000])
  ),
}

const bundled = bundledAll()

export const dbMeta = {
  seq: { ...DEFAULT_SEQ, ...(bundled.__seq || {}) },
  savedAt: bundled.__savedAt || null,
  storage: 'data/*.json',
  available: true,
  key: 'data/',
  version: bundled.__version || VERSION,
  /** file：Vite 本地 JSON 服务；static：内置 JSON + localStorage 降级 */
  mode: 'unknown',
  clientId: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
}

const collectionKeys = () => Object.keys(seed).filter((k) => Array.isArray(seed[k]) && !STATIC_ARRAY.has(k))
const persistKeys = () => [...collectionKeys(), ...SINGLETONS.filter((k) => seed[k])]

/** 覆盖写入：数组用 splice 原地替换，对象清键后合并，保持其它模块的引用有效 */
function assignInPlace(target, next) {
  if (Array.isArray(target)) {
    target.splice(0, target.length, ...next)
  } else if (target && typeof target === 'object') {
    Object.keys(target).forEach((k) => delete target[k])
    Object.assign(target, next)
  }
}

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn('[db] 读取失败，将使用内置 JSON 数据', e)
    return null
  }
}

function writeRaw(doc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
    dbMeta.available = true
    dbMeta.savedAt = doc.__savedAt
    return true
  } catch (e) {
    // 配额超限 / 隐私模式：降级为内存态，并在控制台暴露原因
    dbMeta.available = false
    console.warn('[db] 写入失败，数据仅保留在当前会话', e)
    return false
  }
}

/**
 * 历史存档迁移：网关"下挂设备数"早期写在 children 字段上。
 * 数字型 children 会被 el-table 当成树表子节点遍历，触发
 * `inlineChildren is not iterable` 崩溃，这里统一迁移为 childCount。
 */
function migrateDoc(doc) {
  if (!Array.isArray(doc?.devices)) return false
  let changed = false
  for (const d of doc.devices) {
    if (!d || typeof d !== 'object' || !('children' in d)) continue
    if (typeof d.children === 'number' && d.childCount == null) d.childCount = d.children
    delete d.children
    changed = true
  }
  return changed
}

/* ---------- 基线快照：脏集合检测 ---------- */
const baseline = new Map()

function resetBaseline() {
  baseline.clear()
  for (const k of persistKeys()) baseline.set(k, JSON.stringify(seed[k]))
}

/** 外部变更 / 服务端全量文档 → 原位更新本地集合并重置基线 */
export function applyServerDoc(doc) {
  if (!doc) return false
  for (const k of collectionKeys()) {
    if (Array.isArray(doc.collections?.[k])) assignInPlace(seed[k], doc.collections[k])
  }
  for (const k of SINGLETONS) {
    if (doc.singletons?.[k]) assignInPlace(seed[k], doc.singletons[k])
  }
  if (doc.__seq) Object.assign(dbMeta.seq, doc.__seq)
  if (doc.__version) dbMeta.version = doc.__version
  dbMeta.savedAt = doc.__savedAt || null
  applyConfigs(doc.configs)
  resetBaseline()
  return true
}

/** 静态模式：叠加旧的 localStorage 存档（保持历史数据不丢失） */
function loadLegacyLocal() {
  const saved = readRaw()
  if (!saved || saved.__version !== VERSION) return false
  migrateDoc(saved)
  for (const k of collectionKeys()) {
    if (Array.isArray(saved[k])) assignInPlace(seed[k], saved[k])
  }
  for (const k of SINGLETONS) {
    if (saved[k]) assignInPlace(seed[k], saved[k])
  }
  if (saved.__seq) Object.assign(dbMeta.seq, saved.__seq)
  dbMeta.savedAt = saved.__savedAt || null
  return true
}

let readyPromise = null

/** 启动对账：dev 优先读本地 JSON 服务；不可用时降级 localStorage。可重复调用（单例 Promise） */
export function ensureDbReady() {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    const health = await probeJsonService()
    if (health) {
      const doc = await fetchServerAll()
      if (doc) {
        dbMeta.mode = 'file'
        dbMeta.storage = 'data/*.json'
        dbMeta.key = 'data/'
        applyServerDoc(doc)
        return { mode: 'file' }
      }
    }
    dbMeta.mode = 'static'
    dbMeta.storage = 'localStorage'
    dbMeta.key = STORAGE_KEY
    loadLegacyLocal()
    resetBaseline()
    return { mode: 'static' }
  })()
  return readyPromise
}
export const ensureReady = ensureDbReady

/** 是否已完成对账（供页面判断） */
export const isDbReady = () => Boolean(readyPromise)

/* ---------- 写回 ---------- */
let flushTimer = null
let flushing = false
let flushAgain = false
let forceAll = false

function collectDirty() {
  const updates = []
  const keys = persistKeys()
  for (const k of keys) {
    const text = JSON.stringify(seed[k])
    if (forceAll || text !== baseline.get(k)) updates.push({ key: k, text })
  }
  return updates
}

async function flushFileUpdates() {
  const updates = collectDirty()
  if (!updates.length) {
    if (forceAll) {
      forceAll = false
      try {
        const res = await writeManifest(dbMeta.seq, dbMeta.savedAt)
        dbMeta.version = res.version
      } catch (e) {
        console.warn('[db] manifest 写回失败', e)
      }
    }
    return
  }
  flushing = true
  try {
    const savedAt = new Date().toISOString()
    const payload = updates.map((u) => ({ key: u.key, data: JSON.parse(u.text) }))
    const res = await writeCollections(payload, dbMeta.seq, dbMeta.clientId)
    dbMeta.version = res.version
    dbMeta.savedAt = res.savedAt || savedAt
    dbMeta.available = true
    for (const u of updates) baseline.set(u.key, u.text)
    forceAll = false
  } catch (e) {
    dbMeta.available = false
    console.warn('[db] 写回 JSON 文件失败，稍后重试', e)
    flushAgain = true
  } finally {
    flushing = false
    if (flushAgain) {
      flushAgain = false
      scheduleFlush(400)
    }
  }
}

function scheduleFlush(delay = 300) {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (flushing) {
      flushAgain = true
      return
    }
    if (dbMeta.mode === 'file') flushFileUpdates()
  }, delay)
}

/** 落盘：任一写操作成功后调用（file 模式按脏集合增量写回） */
export function persistDb() {
  const doc = buildDoc()
  if (dbMeta.mode === 'file') {
    scheduleFlush()
    return doc
  }
  writeRaw(doc)
  resetBaseline()
  return doc
}

/** 强制立即写回并等待完成（测试/系统参数导入后使用） */
export async function flushPersist() {
  if (dbMeta.mode !== 'file') {
    writeRaw(buildDoc())
    resetBaseline()
    return
  }
  clearTimeout(flushTimer)
  flushTimer = null
  while (flushing) {
    flushAgain = true
    await new Promise((r) => setTimeout(r, 200))
  }
  await flushFileUpdates()
}

/** 组装当前内存数据的 JSON 文档（导出/导入格式，保持历史兼容） */
export function buildDoc() {
  const doc = {
    __version: VERSION,
    __revision: dbMeta.version,
    __savedAt: new Date().toISOString(),
    __seq: { ...dbMeta.seq },
  }
  for (const k of collectionKeys()) doc[k] = seed[k]
  for (const k of SINGLETONS) if (seed[k]) doc[k] = seed[k]
  return doc
}

/** 兼容旧调用：启动装载 */
export function loadDb() {
  return ensureDbReady()
}

/** 恢复初始数据（不影响登录态） */
export function resetDb() {
  for (const k of Object.keys(seedSnapshot)) {
    assignInPlace(seed[k], JSON.parse(JSON.stringify(seedSnapshot[k])))
  }
  Object.assign(dbMeta.seq, DEFAULT_SEQ)
  forceAll = true
  persistDb()
  return dbStats()
}

/** 导出为可读 JSON 文本 */
export function exportDb() {
  return JSON.stringify(buildDoc(), null, 2)
}

/** 导入 JSON 文本（校验版本与集合完整性，避免半损坏存档） */
export function importDb(jsonText) {
  let doc
  try {
    doc = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText
  } catch {
    throw new Error('文件不是合法的 JSON')
  }
  if (!doc || doc.__version !== VERSION) throw new Error('数据版本不匹配，请导入本系统导出的 JSON')
  const keys = collectionKeys()
  const missing = keys.filter((k) => !Array.isArray(doc[k]))
  if (missing.length) throw new Error(`JSON 缺少集合：${missing.join('、')}`)
  migrateDoc(doc)
  for (const k of keys) assignInPlace(seed[k], doc[k])
  for (const k of SINGLETONS) if (doc[k]) assignInPlace(seed[k], doc[k])
  Object.assign(dbMeta.seq, DEFAULT_SEQ, doc.__seq || {})
  forceAll = true
  persistDb()
  return dbStats()
}

/** 存储概览：供系统参数页展示 */
export function dbStats() {
  let sizeKB = 0
  let records = 0
  for (const k of collectionKeys()) records += Array.isArray(seed[k]) ? seed[k].length : 0
  try {
    const source = dbMeta.mode === 'file' ? JSON.stringify(buildDoc()) : (localStorage.getItem(STORAGE_KEY) || '')
    sizeKB = Math.round(source.length / 1024)
  } catch {
    sizeKB = 0
  }
  return {
    storage: dbMeta.storage,
    key: dbMeta.key,
    mode: dbMeta.mode,
    available: dbMeta.available,
    collections: collectionKeys().length,
    records,
    sizeKB,
    savedAt: dbMeta.savedAt,
    version: dbMeta.version,
  }
}

/** 运行时种子快照：模块加载时（data.js 已完成内置 JSON 装载）采样，用于恢复初始数据 */
const seedSnapshot = {}
for (const k of persistKeys()) seedSnapshot[k] = JSON.parse(JSON.stringify(seed[k]))
resetBaseline()
