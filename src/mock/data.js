/* ============================================================
 * 数据层入口：所有业务数据从本地 JSON 文件装载（data/ 目录）
 * 本文件只保留纯计算工具函数，不再硬编码任何可变业务数据
 * 数组/对象内容由 src/mock/db.js 在运行时原位更新（外部修改 JSON 可实时同步）
 * ============================================================ */
import { bundledAll } from '@/data/jsonSource'

const bundled = bundledAll()
const col = (key) => bundled.collections[key] ?? []
const single = (key) => bundled.singletons[key] ?? {}

/** mulberry32 伪随机（可复现） */
export function rng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = rng(20260201)
const NOW = Date.now()
const fmtTime = (t) => {
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
export const daysAgo = (n, hour = 9) => NOW - n * 86400000 - (rand() * 3600000) | 0
export const fmt = fmtTime

/* ---------- 只读字典（data/core/crops.json） ---------- */
export const CROPS = bundled.statics.CROPS ?? []

/* ---------- 园区 / 地块 ---------- */
export const tenants = col('tenants')
export const plots = col('plots')
export const plotShapes = single('plotShapes')

/* ---------- 设备 ---------- */
export const devices = col('devices')

/* ---------- 传感器指标与读数生成（指标元数据来自 data/iot/paramMeta.json） ---------- */
export const paramMeta = single('paramMeta')

export function genSeries(seed, paramKey, points, stepMs = 3600000) {
  const meta = paramMeta[paramKey] || { name: paramKey, unit: '', base: 10, amp: 3 }
  const r = rng(seed)
  const arr = []
  const t0 = NOW - points * stepMs
  let v = meta.base
  for (let i = 0; i < points; i++) {
    const wave = Math.sin(i / (points / 3)) * meta.amp * 0.5
    v = meta.base + wave + (r() - 0.5) * meta.amp * 0.4
    arr.push([t0 + i * stepMs, +(v.toFixed(meta.amp < 1 ? 2 : 1))])
  }
  return { meta, arr }
}

/* ---------- 物联网 ---------- */
export const alarms = col('alarms')
export const strategies = col('strategies')
export const cronTasks = col('cronTasks')
export const controlLogs = col('controlLogs')
export const collectConfig = single('collectConfig')
export const apiConfigs = col('apiConfigs')

/* ---------- 农事 ---------- */
export const farmPlans = col('farmPlans')
export const workOrders = col('workOrders')
export const ledgerRecords = col('ledgerRecords')
export const materials = col('materials')
export const stockRecords = col('stockRecords')
export const personnel = col('personnel')
export const harvests = col('harvests')

/* ---------- 溯源 ---------- */
export const traceBatches = col('traceBatches')
export const residueReports = col('residueReports')

/* ---------- 产销 ---------- */
export const products = col('products')
export const salesOrders = col('salesOrders')
export const customers = col('customers')

/* ---------- AI 分析 ---------- */
export const weather = single('weather')
export const growthAnalysis = col('growthAnalysis')
export const pestRecords = col('pestRecords')
export const reports = col('reports')

/* ---------- 系统 ---------- */
export const dictGroups = col('dictGroups')
export const sysParams = col('sysParams')
export const logs = col('logs')
export const fileResources = col('fileResources')
export const roles = col('roles')
export const accountUsers = col('accountUsers')
export const menuTree = col('menuTree')
