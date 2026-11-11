/**
 * 一次性导出脚本：把 src/mock/data.js 的种子数据拆分为 data/ 下的模块 JSON。
 * 运行：node scripts/export-seed-json.mjs
 * 数据文件统一信封：{ _meta: { collection, kind, updatedAt, count }, data }
 */
import * as seed from '../src/mock/data.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'data')
const STAMP = new Date().toISOString()

/** 业务集合（数组）→ 文件 */
const COLLECTIONS = {
  tenants: 'core/tenants.json',
  plots: 'core/plots.json',
  devices: 'core/devices.json',
  farmPlans: 'farm/farmPlans.json',
  workOrders: 'farm/workOrders.json',
  ledgerRecords: 'farm/ledgerRecords.json',
  materials: 'farm/materials.json',
  stockRecords: 'farm/stockRecords.json',
  personnel: 'farm/personnel.json',
  harvests: 'farm/harvests.json',
  alarms: 'iot/alarms.json',
  strategies: 'iot/strategies.json',
  cronTasks: 'iot/cronTasks.json',
  controlLogs: 'iot/controlLogs.json',
  apiConfigs: 'iot/apiConfigs.json',
  traceBatches: 'trace/traceBatches.json',
  residueReports: 'trace/residueReports.json',
  products: 'trade/products.json',
  salesOrders: 'trade/salesOrders.json',
  customers: 'trade/customers.json',
  growthAnalysis: 'ai/growthAnalysis.json',
  pestRecords: 'ai/pestRecords.json',
  reports: 'ai/reports.json',
  dictGroups: 'system/dictGroups.json',
  sysParams: 'system/sysParams.json',
  logs: 'system/logs.json',
  fileResources: 'system/fileResources.json',
  roles: 'system/roles.json',
  accountUsers: 'system/accountUsers.json',
  menuTree: 'system/menuTree.json',
}

/** 对象型单例 */
const SINGLETONS = {
  plotShapes: 'core/plotShapes.json',
  paramMeta: 'iot/paramMeta.json',
  collectConfig: 'iot/collectConfig.json',
  weather: 'ai/weather.json',
}

/** 只读字典 */
const STATICS = {
  CROPS: 'core/crops.json',
}

/** 页面配置（后续由页面常量迁移填充） */
const CONFIGS = {
  constants: 'config/constants.json',
  screens: 'config/screens.json',
  workbench: 'config/workbench.json',
  mobile: 'config/mobile.json',
}

/** 集合 → 自增序列键（与 src/mock/db.js 的 DEFAULT_SEQ 对齐） */
const SEQ_KEY = {
  tenants: 'tenants', plots: 'plots', devices: 'devices', farmPlans: 'plans', workOrders: 'orders',
  ledgerRecords: 'ledger', materials: 'materials', stockRecords: 'stock', personnel: 'personnel',
  harvests: 'harvests', alarms: 'alarms', strategies: 'strategies', cronTasks: 'tasks',
  controlLogs: 'logs', apiConfigs: 'apis', traceBatches: 'trace', residueReports: 'residue',
  products: 'products', salesOrders: 'sales', customers: 'customers', reports: 'reports',
  dictGroups: 'dict', sysParams: 'params', logs: 'logs', fileResources: 'files',
  roles: 'role', accountUsers: 'user', menuTree: 'role',
}

const DEFAULT_SEQ = {
  user: 100,
  role: 10,
  ...Object.fromEntries([
    'plots', 'devices', 'alarms', 'strategies', 'tasks', 'plans', 'orders', 'materials', 'stock',
    'ledger', 'personnel', 'harvests', 'trace', 'residue', 'products', 'sales', 'customers', 'dict',
    'params', 'logs', 'files', 'tenants', 'apis', 'reports', 'misc',
  ].map((k) => [k, 10000])),
}

function writeJson(rel, value) {
  const abs = path.join(DATA_DIR, rel)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, JSON.stringify(value, null, 2) + '\n', 'utf8')
  return abs
}

function envelope(collection, kind, data) {
  return {
    _meta: {
      collection,
      kind,
      updatedAt: STAMP,
      count: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
    },
    data,
  }
}

let written = 0
const collections = {}
for (const [key, rel] of Object.entries(COLLECTIONS)) {
  const value = seed[key]
  if (!Array.isArray(value)) throw new Error(`集合 ${key} 不是数组，请检查 data.js`)
  writeJson(rel, envelope(key, 'array', value))
  collections[key] = { file: rel, kind: 'array', seqKey: SEQ_KEY[key] || 'misc' }
  written++
}

const singletons = {}
for (const [key, rel] of Object.entries(SINGLETONS)) {
  const value = seed[key]
  if (!value || typeof value !== 'object') throw new Error(`单例 ${key} 不是对象，请检查 data.js`)
  writeJson(rel, envelope(key, 'object', value))
  singletons[key] = rel
  written++
}

const statics = {}
for (const [key, rel] of Object.entries(STATICS)) {
  const value = seed[key]
  if (!Array.isArray(value)) throw new Error(`字典 ${key} 不是数组`)
  writeJson(rel, envelope(key, 'static', value))
  statics[key] = rel
  written++
}

for (const [key, rel] of Object.entries(CONFIGS)) {
  writeJson(rel, envelope(key, 'config', {}))
  written++
}

writeJson('manifest.json', {
  _meta: { collection: 'manifest', kind: 'manifest', updatedAt: STAMP, description: '数据清单：集合/单例/静态字典/页面配置到文件的映射' },
  version: 1,
  savedAt: STAMP,
  seq: DEFAULT_SEQ,
  collections,
  singletons,
  statics,
  configs: CONFIGS,
})

console.log(`[seed] 已生成 ${written} 个数据文件 + manifest.json → ${DATA_DIR}`)
