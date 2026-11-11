/**
 * 本地 JSON 数据源
 * - 构建期/首屏：通过 import.meta.glob 同步打包 data/ 下的 JSON 文件，保证首屏无需等待网络
 * - 运行时：dev 环境从 Vite 插件拉取最新数据（外部修改后可对账），静态部署自动跳过
 */
import manifest from '../../data/manifest.json'

/** data/ 下全部 JSON 文件（键形如 ../../data/core/plots.json） */
const modules = import.meta.glob('../../data/**/*.json', { eager: true, import: 'default' })

const FILE_PREFIX = '../../data/'

function readFile(rel) {
  const mod = modules[`${FILE_PREFIX}${rel.replace(/\\/g, '/')}`]
  return mod?.data
}

function pickSection(section) {
  const out = {}
  for (const [key, entry] of Object.entries(section || {})) {
    const rel = typeof entry === 'string' ? entry : entry.file
    const value = readFile(rel)
    if (value !== undefined) out[key] = value
  }
  return out
}

/** 打包进产物的全量数据（同步可用） */
export function bundledAll() {
  return {
    __version: manifest.version || 1,
    __savedAt: manifest.savedAt || null,
    __seq: manifest.seq || {},
    collections: pickSection(manifest.collections),
    singletons: pickSection(manifest.singletons),
    statics: pickSection(manifest.statics),
    configs: pickSection(manifest.configs),
  }
}

/** dev 环境从本地插件拉取最新数据；非 dev、测试环境或接口不可用返回 null */
export async function fetchServerAll() {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return null
  try {
    const res = await fetch('/__data/all', { cache: 'no-store' })
    if (!res.ok) return null
    const doc = await res.json()
    return doc && doc.collections ? doc : null
  } catch {
    return null
  }
}

/** 探测本地 JSON 服务是否可用（测试环境强制走静态模式，避免污染 data/ 文件） */
export async function probeJsonService() {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return null
  try {
    const res = await fetch('/__data/health', { cache: 'no-store' })
    if (!res.ok) return null
    const health = await res.json()
    return health?.ok && health.mode === 'file' ? health : null
  } catch {
    return null
  }
}

/** 写入集合（单集合或多集合），供 db.js 持久化使用 */
export async function writeCollections(updates, seq, clientId) {
  const res = await fetch('/__data/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates, seq, clientId }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.ok) throw new Error(body.error || `写入失败（HTTP ${res.status}）`)
  return body
}

/** 仅保存 manifest 的 seq/savedAt */
export async function writeManifest(seq, savedAt) {
  const res = await fetch('/__data/manifest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seq, savedAt }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.ok) throw new Error(body.error || `manifest 写入失败（HTTP ${res.status}）`)
  return body
}

export const jsonManifest = manifest
