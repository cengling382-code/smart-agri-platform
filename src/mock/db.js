/* ============================================================
 * JSON 本地数据库（浏览器端）
 * ------------------------------------------------------------
 * 设计：把全部业务集合序列化为一篇 JSON 文档，持久化在 localStorage。
 * 文档结构：{ __version, __savedAt, __seq, __meta, <集合名>: [...] }
 *
 * 启动时把 JSON 反填回 data.js 的集合数组，所以接口层 / 页面层
 * 完全不需要感知存储细节；任一写操作（POST/PUT/DELETE）成功后
 * 由 mock 分发器统一调用 persistDb() 落盘。
 *
 * 浏览器沙箱不允许静默写本地 .json 文件，因此额外提供
 * 导出（下载 JSON 备份）与导入（读取 JSON 恢复）能力。
 * ============================================================ */
import * as seed from './data'

const STORAGE_KEY = 'agri-db-v1'
// v3：设备「下挂设备数」字段由 children 改名 childCount（数字型 children 会触发 el-table 树表崩溃），升版重播种
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
      'personnel', 'harvests', 'trace', 'residue', 'products', 'sales', 'customers', 'dict',
      'params', 'logs', 'files', 'tenants', 'apis'].map((k) => [k, 10000])
  ),
}

export const dbMeta = {
  seq: { ...DEFAULT_SEQ },
  savedAt: null,
  storage: 'localStorage',
  available: true,
  key: STORAGE_KEY,
  version: VERSION,
}

const collectionKeys = () => Object.keys(seed).filter((k) => Array.isArray(seed[k]) && !STATIC_ARRAY.has(k))

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
    console.warn('[db] 读取失败，将使用种子数据', e)
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

/** 组装当前内存数据的 JSON 文档 */
export function buildDoc() {
  const doc = {
    __version: VERSION,
    __savedAt: new Date().toISOString(),
    __seq: { ...dbMeta.seq },
  }
  for (const k of collectionKeys()) doc[k] = seed[k]
  for (const k of SINGLETONS) if (seed[k]) doc[k] = seed[k]
  return doc
}

/** 落盘：任一写操作成功后调用 */
export function persistDb() {
  const doc = buildDoc()
  writeRaw(doc)
  return doc
}

/** 启动装载：有一次有效存档则回填，否则以种子数据建立首个存档 */
export function loadDb() {
  const saved = readRaw()
  if (!saved || saved.__version !== VERSION) {
    persistDb()
    return { restored: false }
  }
  for (const k of collectionKeys()) {
    if (Array.isArray(saved[k])) assignInPlace(seed[k], saved[k])
  }
  for (const k of SINGLETONS) {
    if (saved[k]) assignInPlace(seed[k], saved[k])
  }
  if (saved.__seq) Object.assign(dbMeta.seq, saved.__seq)
  dbMeta.savedAt = saved.__savedAt || null
  return { restored: true }
}

/** 恢复种子数据（不影响登录态） */
export function resetDb() {
  // 种子已被存档覆盖，这里用模块加载时的「运行时首次快照」保证可还原
  for (const k of Object.keys(seedSnapshot)) {
    assignInPlace(seed[k], JSON.parse(JSON.stringify(seedSnapshot[k])))
  }
  Object.assign(dbMeta.seq, DEFAULT_SEQ)
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
  for (const k of keys) assignInPlace(seed[k], doc[k])
  for (const k of SINGLETONS) if (doc[k]) assignInPlace(seed[k], doc[k])
  Object.assign(dbMeta.seq, DEFAULT_SEQ, doc.__seq || {})
  persistDb()
  return dbStats()
}

/** 存储概览：供系统参数页展示 */
export function dbStats() {
  let sizeKB = 0
  let records = 0
  try {
    sizeKB = Math.round((localStorage.getItem(STORAGE_KEY) || '').length / 1024)
  } catch { sizeKB = 0 }
  for (const k of collectionKeys()) records += Array.isArray(seed[k]) ? seed[k].length : 0
  return {
    storage: dbMeta.storage,
    key: STORAGE_KEY,
    available: dbMeta.available,
    collections: collectionKeys().length,
    records,
    sizeKB,
    savedAt: dbMeta.savedAt,
    version: VERSION,
  }
}

/** 运行时种子快照：必须在首次 loadDb 覆盖之前采样 */
const seedSnapshot = {}
for (const k of collectionKeys()) seedSnapshot[k] = JSON.parse(JSON.stringify(seed[k]))
for (const k of SINGLETONS) if (seed[k]) seedSnapshot[k] = JSON.parse(JSON.stringify(seed[k]))

loadDb()
