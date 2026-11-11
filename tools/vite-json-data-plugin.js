/**
 * Vite 本地 JSON 数据插件（仅 dev server 生效）
 * - 读取 data/ 下按模块拆分的 JSON 数据文件
 * - 接收前端写回请求，原子替换对应文件
 * - fs.watch 监听外部编辑，通过 SSE 推送变更，前端无需刷新即可重渲染
 *
 * 接口：
 *   GET  /__data/health
 *   GET  /__data/all
 *   GET  /__data/events         (SSE)
 *   POST /__data/write          { updates:[{key,data}], seq, savedAt, clientId }
 *   POST /__data/manifest       { seq, savedAt }
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const API_PREFIX = '/__data'
const MAX_BODY = 8 * 1024 * 1024

const hashText = (text) => crypto.createHash('md5').update(text).digest('hex')
const nowISO = () => new Date().toISOString()

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      raw += chunk
    })
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    req.on('error', reject)
  })
}

export default function jsonDataPlugin() {
  return {
    name: 'smart-agri-json-data',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const dataDir = path.join(root, 'data')
      const manifestPath = path.join(dataDir, 'manifest.json')
      /** 最近一次由接口写入的文件：路径 → 内容 hash，用于抑制自身触发的 watch 事件 */
      const selfWrites = new Map()
      /** SSE 客户端 */
      const clients = new Set()
      let watcher = null

      const readManifest = async () => {
        const raw = await fsp.readFile(manifestPath, 'utf8')
        return JSON.parse(raw)
      }

      const resolveTarget = async (key) => {
        const manifest = await readManifest()
        const entry = manifest.collections?.[key] || manifest.singletons?.[key] || manifest.configs?.[key]
        if (!entry) throw new Error(`未知数据键：${key}`)
        const rel = typeof entry === 'string' ? entry : entry.file
        const abs = path.resolve(dataDir, rel)
        if (!abs.startsWith(dataDir + path.sep)) throw new Error(`非法数据路径：${rel}`)
        const kind = typeof entry === 'string'
          ? (manifest.singletons?.[key] ? 'object' : 'config')
          : entry.kind || 'array'
        return { abs, rel, kind, seqKey: entry.seqKey || null }
      }

      const writeAtomic = async (abs, text) => {
        await fsp.mkdir(path.dirname(abs), { recursive: true })
        const tmp = `${abs}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
        await fsp.writeFile(tmp, text, 'utf8')
        let lastError = null
        for (let i = 0; i < 3; i++) {
          try {
            await fsp.rename(tmp, abs)
            return
          } catch (e) {
            lastError = e
            await new Promise((r) => setTimeout(r, 40))
          }
        }
        await fsp.unlink(tmp).catch(() => {})
        throw lastError
      }

      const readEnvelope = async (abs, key, kind) => {
        const raw = await fsp.readFile(abs, 'utf8')
        return { raw, file: JSON.parse(raw), hash: hashText(raw), key, kind }
      }

      const readAll = async () => {
        const manifest = await readManifest()
        const doc = {
          __version: manifest.version || 1,
          __savedAt: manifest.savedAt || null,
          __seq: manifest.seq || {},
          collections: {},
          singletons: {},
          statics: {},
          configs: {},
          __files: {},
        }
        const readInto = async (bucket, map) => {
          for (const [key, entry] of Object.entries(map || {})) {
            const rel = typeof entry === 'string' ? entry : entry.file
            const abs = path.join(dataDir, rel)
            try {
              const parsed = JSON.parse(await fsp.readFile(abs, 'utf8'))
              bucket[key] = parsed.data
              doc.__files[key] = { file: rel, updatedAt: parsed._meta?.updatedAt || null, count: parsed._meta?.count ?? null }
            } catch (e) {
              server.config.logger.warn(`[json-data] 读取 ${rel} 失败：${e.message}`)
            }
          }
        }
        await readInto(doc.collections, manifest.collections)
        await readInto(doc.singletons, manifest.singletons)
        await readInto(doc.statics, manifest.statics)
        await readInto(doc.configs, manifest.configs)
        return doc
      }

      const broadcast = (payload) => {
        const text = `data: ${JSON.stringify(payload)}\n\n`
        for (const res of clients) {
          try {
            res.write(text)
          } catch {
            clients.delete(res)
          }
        }
      }

      /* ---------- 文件监听：递归监听 data/，外部编辑时推送 ---------- */
      const onChange = async (filename) => {
        if (!filename) return
        const rel = String(filename).replace(/\\/g, '/')
        if (!rel.endsWith('.json')) return
        const abs = path.join(dataDir, rel)
        if (rel === 'manifest.json') {
          try {
            const manifest = await readManifest()
            broadcast({ type: 'change', origin: 'external', keys: [], version: manifest.version, savedAt: manifest.savedAt })
          } catch (e) {
            broadcast({ type: 'error', error: `manifest.json 解析失败：${e.message}` })
          }
          return
        }
        // 防抖：同一文件短时间内多次事件合并
        clearTimeout(onChangeTimers.get(abs))
        onChangeTimers.set(abs, setTimeout(async () => {
          onChangeTimers.delete(abs)
          try {
            const raw = await fsp.readFile(abs, 'utf8')
            const parsed = JSON.parse(raw)
            if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
              throw new Error('缺少 data 字段，需保持 { _meta, data } 结构')
            }
            const hash = hashText(raw)
            const last = selfWrites.get(abs)
            if (last && last.hash === hash && Date.now() - last.at < 1500) return
            const manifest = await readManifest()
            const keys = []
            for (const [key, entry] of Object.entries({ ...manifest.collections, ...manifest.singletons, ...manifest.configs })) {
              const target = typeof entry === 'string' ? entry : entry.file
              if (path.resolve(dataDir, target) === abs) keys.push(key)
            }
            broadcast({ type: 'change', origin: 'external', keys, version: manifest.version, savedAt: manifest.savedAt })
          } catch (e) {
            server.config.logger.warn(`[json-data] 外部文件 ${rel} 解析失败：${e.message}`)
            broadcast({ type: 'error', error: `${rel} 解析失败：${e.message}`, file: rel })
          }
        }, 120))
      }
      const onChangeTimers = new Map()

      try {
        watcher = fs.watch(dataDir, { recursive: true }, (_event, filename) => onChange(filename))
      } catch (e) {
        server.config.logger.warn(`[json-data] 递归监听失败，退化为逐目录监听：${e.message}`)
        const walk = (dir) => {
          fs.mkdirSync(dir, { recursive: true })
          try {
            watcher = fs.watch(dir, (_evt, name) => onChange(name ? path.relative(dataDir, path.join(dir, name)) : ''))
          } catch {}
          for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            if (ent.isDirectory()) walk(path.join(dir, ent.name))
          }
        }
        walk(dataDir)
      }

      /* ---------- 中间件 ---------- */
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        if (!url.pathname.startsWith(API_PREFIX)) return next()
        const pathname = url.pathname.slice(API_PREFIX.length) || '/'

        try {
          if (pathname === '/health' && req.method === 'GET') {
            const manifest = await readManifest()
            return sendJson(res, 200, { ok: true, mode: 'file', version: manifest.version, savedAt: manifest.savedAt, dataDir: 'data/' })
          }

          if (pathname === '/all' && req.method === 'GET') {
            return sendJson(res, 200, await readAll())
          }

          if (pathname === '/events' && req.method === 'GET') {
            res.writeHead(200, {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
            })
            res.write(`retry: 2000\n\n`)
            clients.add(res)
            const timer = setInterval(() => {
              try { res.write(': ping\n\n') } catch { /* ignore */ }
            }, 15000)
            req.on('close', () => {
              clearInterval(timer)
              clients.delete(res)
            })
            return
          }

          if (pathname === '/write' && req.method === 'POST') {
            const body = await readBody(req)
            const updates = Array.isArray(body.updates) ? body.updates : []
            if (!updates.length) return sendJson(res, 400, { ok: false, error: 'updates 不能为空' })
            const manifest = await readManifest()
            const writtenKeys = []
            for (const item of updates) {
              if (!item || typeof item.key !== 'string') throw new Error('update.key 缺失')
              const target = await resolveTarget(item.key)
              if (target.kind === 'static') throw new Error(`只读字典不允许写入：${item.key}`)
              const data = item.data
              if (target.kind === 'array' && !Array.isArray(data)) throw new Error(`${item.key} 必须是数组`)
              if (target.kind === 'object' && (data === null || typeof data !== 'object' || Array.isArray(data))) {
                throw new Error(`${item.key} 必须是对象`)
              }
              const envelope = {
                _meta: { collection: item.key, kind: target.kind, updatedAt: nowISO(), count: Array.isArray(data) ? data.length : Object.keys(data || {}).length },
                data,
              }
              const text = JSON.stringify(envelope, null, 2) + '\n'
              await writeAtomic(target.abs, text)
              selfWrites.set(target.abs, { hash: hashText(text), at: Date.now() })
              writtenKeys.push(item.key)
            }
            if (body.seq && typeof body.seq === 'object') manifest.seq = { ...manifest.seq, ...body.seq }
            manifest.version = (manifest.version || 1) + 1
            manifest.savedAt = body.savedAt || nowISO()
            await writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
            selfWrites.set(manifestPath, { hash: hashText(await fsp.readFile(manifestPath, 'utf8')), at: Date.now() })
            broadcast({ type: 'change', origin: 'api', clientId: body.clientId || null, keys: writtenKeys, version: manifest.version, savedAt: manifest.savedAt })
            return sendJson(res, 200, { ok: true, version: manifest.version, savedAt: manifest.savedAt, keys: writtenKeys })
          }

          if (pathname === '/manifest' && req.method === 'POST') {
            const body = await readBody(req)
            const manifest = await readManifest()
            if (body.seq && typeof body.seq === 'object') manifest.seq = { ...manifest.seq, ...body.seq }
            manifest.version = (manifest.version || 1) + 1
            manifest.savedAt = body.savedAt || nowISO()
            await writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
            selfWrites.set(manifestPath, { hash: hashText(await fsp.readFile(manifestPath, 'utf8')), at: Date.now() })
            return sendJson(res, 200, { ok: true, version: manifest.version, savedAt: manifest.savedAt })
          }

          return sendJson(res, 404, { ok: false, error: `未实现的接口：${pathname}` })
        } catch (e) {
          return sendJson(res, 400, { ok: false, error: e.message })
        }
      })

      server.httpServer?.on('close', () => {
        try { watcher?.close() } catch { /* ignore */ }
        for (const res of clients) {
          try { res.end() } catch { /* ignore */ }
        }
        clients.clear()
      })
    },
  }
}
