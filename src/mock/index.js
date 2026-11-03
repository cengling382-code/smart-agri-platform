/* ============================================================
 * Mock 接口分发器：模拟 REST API（axios 自定义 adapter 调用）
 * 支持路径参数、查询过滤、分页、模拟网络延迟
 * ============================================================ */
import * as db from './data'
import { rng } from './data'
import { dbMeta, persistDb, exportDb, importDb, resetDb, dbStats } from './db'

const LATENCY = () => 90 + Math.random() * 160
const ok = (data, msg = 'success') => ({ code: 0, msg, data })
const fail = (msg, code = 1) => ({ code, msg, data: null })

/** 自增 id 序列由 JSON 数据库托管，随存档一起持久化 */
const seq = dbMeta.seq
const nextId = (k) => ++seq[k]

/** 路径段匹配：'/devices/:id' vs '/devices/12' */
function matchRoute(pattern, url) {
  const pp = pattern.split('/').filter(Boolean)
  const up = url.split('?')[0].split('/').filter(Boolean)
  if (pp.length !== up.length) return null
  const params = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(up[i])
    else if (pp[i] !== up[i]) return null
  }
  return params
}

function paginate(list, params = {}) {
  const page = +(params.page || 1)
  const size = +(params.size || 10)
  const start = (page - 1) * size
  return { list: list.slice(start, start + size), total: list.length, page, size }
}

function filterBy(list, params, keys) {
  return list.filter((item) =>
    keys.every(([k, pkey]) => {
      const v = params[pkey || k]
      if (v === undefined || v === '' || v === null) return true
      const iv = item[k]
      if (iv === undefined) return true
      if (typeof v === 'boolean') return iv === v
      return String(iv).toLowerCase().includes(String(v).toLowerCase())
    })
  )
}

const kw = (list, fields, keyword) => {
  if (!keyword) return list
  const k = keyword.toLowerCase()
  return list.filter((it) => fields.some((f) => String(it[f] ?? '').toLowerCase().includes(k)))
}

/* ================= 业务处理表 ================= */
const routes = [
  /* ---------- 认证 ---------- */
  { m: 'post', p: '/auth/login', h: ({ data: body }) => {
      const user = db.accountUsers.find((u) => u.username === body.username)
      if (!user || user.password !== body.password) return fail('用户名或密码错误')
      if (user.status === '禁用') return fail('该账号已被禁用，请联系系统管理员')
      const info = { ...user }
      delete info.password
      return ok({ token: `agri-${user.role}-${Date.now().toString(36)}`, user: info })
    } },
  { m: 'get', p: '/auth/userinfo', h: ({ headers }) => {
      const token = headers.Authorization?.replace('Bearer ', '') || ''
      const role = token.split('-')[1]
      const user = db.accountUsers.find((u) => u.role === role) || db.accountUsers[0]
      const info = { ...user }
      delete info.password
      return ok(info)
    } },
  { m: 'post', p: '/auth/register', h: ({ data: body }) => {
      if (db.accountUsers.some((u) => u.username === body.username)) return fail('用户名已存在')
      db.accountUsers.push({ id: nextId('user'), ...body, role: 'farmer', roleName: '农户/工人', status: '启用', avatar: '', createdAt: new Date().toLocaleString('zh-CN'), lastLogin: '—' })
      return ok(null, '注册成功，等待管理员分配权限')
    } },
  { m: 'put', p: '/auth/profile', h: ({ data: body, headers }) => {
      const role = (headers.Authorization || '').split('-')[1]
      const user = db.accountUsers.find((u) => u.role === role) || db.accountUsers[0]
      Object.assign(user, body)
      const info = { ...user }
      delete info.password
      return ok(info, '资料已更新')
    } },
  { m: 'put', p: '/auth/password', h: ({ data: body, headers }) => {
      const role = (headers.Authorization || '').split('-')[1]
      const user = db.accountUsers.find((u) => u.role === role) || db.accountUsers[0]
      if (user.password !== body.oldPassword) return fail('当前密码不正确')
      if (body.newPassword !== body.confirmPassword) return fail('两次输入的新密码不一致')
      user.password = body.newPassword
      return ok(null, '密码修改成功，请重新登录')
    } },

  /* ---------- 数据面板 ---------- */
  { m: 'get', p: '/stats/dashboard', h: () => {
      const devs = db.devices
      const online = devs.filter((d) => d.status === 'online').length
      return ok({
        parks: db.tenants.length, plots: db.plots.length, devices: devs.length,
        online, onlineRate: Math.round((online / devs.length) * 100),
        todayAlarms: db.alarms.filter((a) => a.status === 'pending').length,
        monthYield: 128400, yieldUnit: 'kg',
        env: db.plots.slice(0, 4).map((p) => ({ name: p.name, type: p.type, temp: p.env.temp ?? p.env.waterT, hum: p.env.hum ?? p.env.oxygen * 10, co2: p.env.co2 ?? 0, light: p.env.light ?? 0, ph: p.env.ph ?? 7 })),
        pendingAlarms: db.alarms.filter((a) => a.status === 'pending'),
        weekTrend: Array.from({ length: 7 }, (_, i) => {
          const r = rng(77 + i)
          return { day: `周${'一二三四五六日'[i]}`, temp: +(18 + r() * 8).toFixed(1), hum: +(50 + r() * 25).toFixed(0), light: +(20 + r() * 30).toFixed(1) }
        }),
        workOrderStatus: ['待接单', '进行中', '待验收', '已完成'].map((s, i) => ({ name: s, value: db.workOrders.filter((o) => o.status === s).length + i })),
        deviceTypes: ['gateway', 'sensor', 'actuator', 'camera'].map((t) => ({ name: { gateway: '网关', sensor: '传感器', actuator: '执行器', camera: '摄像头' }[t], total: db.devices.filter((d) => d.type === t).length, online: db.devices.filter((d) => d.type === t && d.status === 'online').length })),
      })
    } },

  /* ---------- 地块 ---------- */
  { m: 'get', p: '/plots', h: ({ params }) => ok(paginate(kw(filterBy(db.plots, params, [['type'], ['status']]), ['code', 'name', 'crop', 'manager'], params.keyword), params)) },
  { m: 'get', p: '/plots/all', h: () => ok(db.plots.map((p) => ({ ...p, shape: db.plotShapes[p.id] || [] }))) },
  { m: 'post', p: '/plots', h: ({ data: b }) => { const item = { id: nextId('plots'), sensors: 0, ...b }; db.plots.unshift(item); return ok(item, '新增地块成功') } },
  { m: 'put', p: '/plots/:id', h: ({ params, data: b }) => { const t = db.plots.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/plots/:id', h: ({ params }) => { const i = db.plots.findIndex((x) => x.id === +params.id); if (i > -1) db.plots.splice(i, 1); return ok(null, '删除成功') } },

  /* ---------- 设备 ---------- */
  { m: 'get', p: '/devices', h: ({ params }) => {
      let list = kw(filterBy(db.devices, params, [['type'], ['status']]), ['code', 'name', 'model'], params.keyword)
      if (params.group) list = list.filter((d) => { const p = db.plots.find((x) => x.id === d.plotId); return p && p.type === params.group })
      return ok(paginate(list, params))
    } },
  { m: 'get', p: '/devices/all', h: () => ok(db.devices) },
  { m: 'get', p: '/devices/:id', h: ({ params }) => {
      const dev = db.devices.find((x) => x.id === +params.id)
      if (!dev) return fail('设备不存在', 404)
      const plot = db.plots.find((p) => p.id === dev.plotId)
      return ok({ ...dev, plotName: plot?.name || '—', plotType: plot?.type || '—' })
    } },
  { m: 'get', p: '/devices/:id/series', h: ({ params, query }) => {
      const paramKey = query?.param || 'temp'
      const points = +(query?.points || 48)
      const { meta, arr } = db.genSeries(+params.id * 31 + points, paramKey, points)
      return ok({ meta, series: arr.map(([t, v]) => [t, v]) })
    } },
  { m: 'get', p: '/devices/:id/logs', h: () => ok({ list: db.controlLogs.slice(0, 12), total: 12 }) },
  { m: 'post', p: '/devices', h: ({ data: b }) => { const item = { id: nextId('devices'), status: 'online', battery: 100, lastReport: Date.now(), children: 0, ...b }; db.devices.unshift(item); return ok(item, '设备注册成功') } },
  { m: 'put', p: '/devices/:id', h: ({ params, data: b }) => { const t = db.devices.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/devices/:id', h: ({ params }) => { const i = db.devices.findIndex((x) => x.id === +params.id); if (i > -1) db.devices.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'post', p: '/devices/:id/control', h: ({ params, data: b }) => {
      const dev = db.devices.find((x) => x.id === +params.id)
      if (!dev) return fail('设备不存在')
      dev.running = b.action === 'on'
      db.controlLogs.unshift({ id: nextId('logs'), operator: b.operator || '当前用户', source: b.source || 'manual', device: dev.name, deviceCode: dev.code, action: b.action === 'on' ? '开启' : '关闭', time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), result: dev.status === 'online' ? '成功' : '失败(设备离线)' })
      return ok({ running: dev.running }, dev.status === 'online' ? '指令已下发' : '设备离线，指令下发失败')
    } },

  /* ---------- 告警 ---------- */
  { m: 'get', p: '/alarms', h: ({ params }) => {
      let list = db.alarms
      if (params.level) list = list.filter((a) => String(a.level) === String(params.level))
      if (params.status) list = list.filter((a) => a.status === params.status)
      if (params.type) list = list.filter((a) => a.type === params.type)
      list = kw(list, ['code', 'content', 'source'], params.keyword)
      list = [...list].sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1))
      return ok(paginate(list, params))
    } },
  { m: 'get', p: '/alarms/stats', h: () => {
      const byType = {}
      const byLevel = { 1: 0, 2: 0, 3: 0 }
      const byDay = {}
      db.alarms.forEach((a) => {
        byType[a.type] = (byType[a.type] || 0) + 1
        byLevel[a.level]++
        const day = a.time.slice(5, 10)
        byDay[day] = (byDay[day] || 0) + 1
      })
      const resolved = db.alarms.filter((a) => a.status === 'resolved' || a.status === 'archived').length
      return ok({
        byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
        byLevel: [{ name: '一般', value: byLevel[1] }, { name: '重要', value: byLevel[2] }, { name: '紧急', value: byLevel[3] }],
        byDay: Object.entries(byDay).map(([day, count]) => ({ day, count })),
        total: db.alarms.length, pending: db.alarms.filter((a) => a.status === 'pending').length,
        resolved, resolveRate: Math.round((resolved / db.alarms.length) * 100),
        avgHours: 3.6, channels: [{ name: '站内消息', count: db.alarms.length }, { name: '短信', count: Math.round(db.alarms.length * 0.5) }, { name: '微信公众号', count: Math.round(db.alarms.length * 0.7) }],
      })
    } },
  { m: 'put', p: '/alarms/:id', h: ({ params, data: b }) => { const t = db.alarms.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '告警状态已更新') } },
  { m: 'put', p: '/alarms/batch/status', h: ({ data: b }) => { b.ids.forEach((id) => { const t = db.alarms.find((x) => x.id === id); if (t) t.status = b.status }); return ok(null, '批量处理完成') } },

  /* ---------- 策略 / 定时任务 / 控制日志 ---------- */
  { m: 'get', p: '/strategies', h: ({ params }) => ok(paginate(kw(db.strategies, ['name', 'condition', 'action'], params.keyword), params)) },
  { m: 'post', p: '/strategies', h: ({ data: b }) => { const item = { id: nextId('strategies'), times: 0, enabled: true, updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), ...b }; db.strategies.unshift(item); return ok(item, '策略创建成功') } },
  { m: 'put', p: '/strategies/:id', h: ({ params, data: b }) => { const t = db.strategies.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/strategies/:id', h: ({ params }) => { const i = db.strategies.findIndex((x) => x.id === +params.id); if (i > -1) db.strategies.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/tasks', h: () => ok({ list: db.cronTasks, total: db.cronTasks.length }) },
  { m: 'post', p: '/tasks', h: ({ data: b }) => { const item = { id: nextId('tasks'), nextRun: '—', enabled: true, ...b }; db.cronTasks.unshift(item); return ok(item, '定时任务创建成功') } },
  { m: 'put', p: '/tasks/:id', h: ({ params, data: b }) => { const t = db.cronTasks.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/tasks/:id', h: ({ params }) => { const i = db.cronTasks.findIndex((x) => x.id === +params.id); if (i > -1) db.cronTasks.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/control-logs', h: ({ params }) => ok(paginate(kw(filterBy(db.controlLogs, params, [['source'], ['result']]), ['operator', 'device', 'deviceCode'], params.keyword), params)) },
  { m: 'get', p: '/collect-config', h: () => ok(db.collectConfig) },
  { m: 'put', p: '/collect-config', h: ({ data: b }) => { Object.assign(db.collectConfig, b); return ok(db.collectConfig, '采集参数已保存') } },

  /* ---------- 农事 ---------- */
  { m: 'get', p: '/farm-plans', h: ({ params }) => ok(paginate(kw(filterBy(db.farmPlans, params, [['type'], ['status']]), ['code', 'plotName', 'crop', 'creator'], params.keyword), params)) },
  { m: 'post', p: '/farm-plans', h: ({ data: b }) => { const item = { id: nextId('plans'), code: `FP-2026-${Math.floor(Math.random() * 900 + 100)}`, status: '待审批', creator: '农技人员-罗永刚', approver: '', ...b }; db.farmPlans.unshift(item); return ok(item, '农事计划已提交审批') } },
  { m: 'put', p: '/farm-plans/:id', h: ({ params, data: b }) => { const t = db.farmPlans.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/farm-plans/:id', h: ({ params }) => { const i = db.farmPlans.findIndex((x) => x.id === +params.id); if (i > -1) db.farmPlans.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/work-orders', h: ({ params }) => ok(paginate(kw(filterBy(db.workOrders, params, [['type'], ['status']]), ['code', 'plotName', 'assignee'], params.keyword), params)) },
  { m: 'post', p: '/work-orders', h: ({ data: b }) => { const item = { id: nextId('orders'), code: `WO-2026-${Math.floor(Math.random() * 900 + 100)}`, status: '待接单', createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), checkin: null, ...b }; db.workOrders.unshift(item); return ok(item, '工单派发成功') } },
  { m: 'put', p: '/work-orders/:id', h: ({ params, data: b }) => { const t = db.workOrders.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '工单状态已更新') } },
  { m: 'delete', p: '/work-orders/:id', h: ({ params }) => { const i = db.workOrders.findIndex((x) => x.id === +params.id); if (i > -1) db.workOrders.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/ledger', h: ({ params }) => ok(paginate(kw(filterBy(db.ledgerRecords, params, [['type']]), ['code', 'plotName', 'operator', 'crop'], params.keyword), params)) },
  { m: 'get', p: '/materials', h: ({ params }) => ok(paginate(kw(filterBy(db.materials, params, [['category']]), ['code', 'name', 'supplier'], params.keyword), params)) },
  { m: 'post', p: '/materials', h: ({ data: b }) => { const item = { id: nextId('materials'), code: `MZ-${String(nextId('stock')).slice(-3)}`, ...b }; db.materials.unshift(item); return ok(item, '农资档案创建成功') } },
  { m: 'put', p: '/materials/:id', h: ({ params, data: b }) => { const t = db.materials.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/materials/:id', h: ({ params }) => { const i = db.materials.findIndex((x) => x.id === +params.id); if (i > -1) db.materials.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/stock-records', h: ({ params }) => {
      let list = db.stockRecords
      if (params.type) list = list.filter((r) => r.type === params.type)
      list = kw(list, ['code', 'materialName', 'operator', 'supplier'], params.keyword)
      return ok(paginate(list, params))
    } },
  { m: 'post', p: '/stock-records', h: ({ data: b }) => {
      const item = { id: nextId('stock'), code: `${b.type === 'in' ? 'RK' : 'CK'}-2026-${Math.floor(Math.random() * 900 + 100)}`, time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), ...b }
      db.stockRecords.unshift(item)
      const m = db.materials.find((x) => x.id === +b.materialId)
      if (m) m.stock = Math.max(0, m.stock + (b.type === 'in' ? +b.qty : -b.qty))
      return ok(item, b.type === 'in' ? '入库登记成功' : '出库登记成功')
    } },
  { m: 'get', p: '/inventory', h: ({ params }) => {
      let list = db.materials.map((m) => ({ ...m, low: m.stock < m.safeStock, ratio: Math.min(100, Math.round((m.stock / (m.safeStock * 3)) * 100)) }))
      if (params.onlyLow) list = list.filter((m) => m.low)
      list = kw(list, ['code', 'name', 'supplier'], params.keyword)
      return ok(paginate(list, params))
    } },
  { m: 'get', p: '/personnel', h: ({ params }) => ok(paginate(kw(filterBy(db.personnel, params, [['role'], ['status']]), ['name', 'phone', 'area'], params.keyword), params)) },
  { m: 'get', p: '/harvests', h: ({ params }) => ok(paginate(kw(filterBy(db.harvests, params, [['grade'], ['status']]), ['batchCode', 'plotName', 'crop', 'inspector'], params.keyword), params)) },
  { m: 'post', p: '/harvests', h: ({ data: b }) => { const item = { id: nextId('harvests'), batchCode: `HC-2026-${Math.floor(Math.random() * 900 + 100)}`, status: '待登记', ...b }; db.harvests.unshift(item); return ok(item, '采收批次登记成功') } },
  { m: 'put', p: '/harvests/:id', h: ({ params, data: b }) => { const t = db.harvests.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'get', p: '/harvest-stats', h: () => {
      const byPlot = {}
      const byMonth = {}
      const byGrade = { 特级: 0, 一级: 0, 二级: 0 }
      db.harvests.forEach((h) => {
        byPlot[h.plotName] = (byPlot[h.plotName] || 0) + h.qty
        const m = h.date.slice(0, 7)
        byMonth[m] = (byMonth[m] || 0) + h.qty
        byGrade[h.grade] += h.qty
      })
      return ok({
        byPlot: Object.entries(byPlot).map(([name, value]) => ({ name, value })),
        byMonth: Object.entries(byMonth).sort().map(([month, value]) => ({ month, value })),
        byGrade: Object.entries(byGrade).map(([name, value]) => ({ name, value })),
        total: db.harvests.reduce((s, h) => s + h.qty, 0),
        batches: db.harvests.length, avg: Math.round(db.harvests.reduce((s, h) => s + h.qty, 0) / Math.max(1, db.harvests.length)),
        yearTrend: ['2023', '2024', '2025', '2026'].map((y, i) => ({ year: y, value: 68000 + i * 21400 })),
      })
    } },

  /* ---------- 溯源 ---------- */
  { m: 'get', p: '/trace-batches', h: ({ params }) => ok(paginate(kw(filterBy(db.traceBatches, params, [['status']]), ['code', 'crop', 'plotName'], params.keyword), params)) },
  { m: 'post', p: '/trace-batches', h: ({ data: b }) => {
      const item = { id: nextId('trace'), code: `TR-${b.harvestCode?.slice(3) || Math.floor(Math.random() * 900 + 100)}`, status: '待完善', created: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), scans: 0, org: '示范园总部（智慧农业示范园）', records: { farm: 0, env: 0, tests: 0 }, ...b }
      db.traceBatches.unshift(item); return ok(item, '溯源批次创建成功，请完善溯源信息')
    } },
  { m: 'put', p: '/trace-batches/:id', h: ({ params, data: b }) => { const t = db.traceBatches.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'get', p: '/residue-reports', h: ({ params }) => ok(paginate(kw(filterBy(db.residueReports, params, [['result']]), ['code', 'batchCode', 'org'], params.keyword), params)) },
  { m: 'post', p: '/residue-reports', h: ({ data: b }) => { const item = { id: nextId('residue'), code: `JC-2026-${Math.floor(Math.random() * 900 + 100)}`, ...b }; db.residueReports.unshift(item); return ok(item, '检测报告登记成功') } },
  { m: 'put', p: '/residue-reports/:id', h: ({ params, data: b }) => { const t = db.residueReports.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'get', p: '/trace/stats', h: () => {
      const totalScans = db.traceBatches.reduce((s, b) => s + b.scans, 0)
      return ok({
        totalScans, batches: db.traceBatches.length, published: db.traceBatches.filter((b) => b.status === '已发布').length,
        todayScans: 47, weekScans: 318,
        byBatch: db.traceBatches.filter((b) => b.status === '已发布').slice(0, 6).map((b) => ({ name: `${b.crop}(${b.code.slice(-4)})`, value: b.scans })),
        byDay: Array.from({ length: 7 }, (_, i) => { const r = rng(900 + i); return { day: `${i + 1}日`, count: Math.round(30 + r() * 60) } }),
      })
    } },
  { m: 'get', p: '/trace/public/:code', h: ({ params }) => {
      const b = db.traceBatches.find((x) => x.code === params.code) || db.traceBatches[0]
      const plot = db.plots.find((p) => p.name === b.plotName) || db.plots[0]
      const harvest = db.harvests.find((h) => h.batchCode === b.harvestCode)
      const test = db.residueReports.find((r) => r.batchCode === b.code)
      return ok({
        batch: b, plot, harvest,
        env: plot.env,
        farmRecords: db.ledgerRecords.slice(0, 6).map((r) => ({ time: r.time, type: r.type, operator: r.operator, note: `${r.plotName} ${r.type}作业` })),
        report: test || null,
        company: { name: '智慧农业示范园（示范园总部）', license: '91420100MA4K12345X', address: '湖北省武汉市东西湖区示范路 1 号', phone: '027-88888888', cert: ['绿色食品认证', 'ISO9001 质量管理体系', '农产品质量追溯体系'] },
      })
    } },

  /* ---------- 产销对接 ---------- */
  { m: 'get', p: '/products', h: ({ params }) => ok(paginate(kw(filterBy(db.products, params, [['status']]), ['name', 'crop'], params.keyword), params)) },
  { m: 'post', p: '/products', h: ({ data: b }) => { const item = { id: nextId('products'), sales: 0, img: 'tomato', ...b }; db.products.unshift(item); return ok(item, '产品上架成功') } },
  { m: 'put', p: '/products/:id', h: ({ params, data: b }) => { const t = db.products.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/products/:id', h: ({ params }) => { const i = db.products.findIndex((x) => x.id === +params.id); if (i > -1) db.products.splice(i, 1); return ok(null, '下架成功') } },
  { m: 'get', p: '/sales-orders', h: ({ params }) => ok(paginate(kw(filterBy(db.salesOrders, params, [['status']]), ['code', 'customer', 'product'], params.keyword), params)) },
  { m: 'put', p: '/sales-orders/:id', h: ({ params, data: b }) => { const t = db.salesOrders.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '订单状态已更新') } },
  { m: 'get', p: '/customers', h: ({ params }) => ok(paginate(kw(filterBy(db.customers, params, [['level']]), ['name', 'phone'], params.keyword), params)) },
  { m: 'get', p: '/sales-stats', h: () => {
      const done = db.salesOrders.filter((o) => o.status !== '待付款' && o.status !== '已退款')
      const byProduct = {}
      done.forEach((o) => { byProduct[o.product] = (byProduct[o.product] || 0) + o.amount })
      return ok({
        totalAmount: Math.round(done.reduce((s, o) => s + o.amount, 0)), orders: db.salesOrders.length,
        doneOrders: done.length, products: db.products.length,
        byProduct: Object.entries(byProduct).map(([name, value]) => ({ name, value: Math.round(value) })),
        byMonth: ['6月', '7月', '8月', '9月', '10月', '11月'].map((m, i) => { const r = rng(50 + i); return { month: m, amount: Math.round(8000 + r() * 22000), orders: Math.round(30 + r() * 90) } }),
      })
    } },

  /* ---------- AI 分析 ---------- */
  { m: 'get', p: '/weather', h: () => ok(db.weather) },
  { m: 'get', p: '/growth', h: () => ok({ list: db.growthAnalysis, total: db.growthAnalysis.length }) },
  { m: 'get', p: '/pests', h: ({ params }) => {
      let list = db.pestRecords
      if (params.status) list = list.filter((p) => p.status === params.status)
      return ok(paginate(kw(list, ['plotName', 'pest', 'crop'], params.keyword), params))
    } },
  { m: 'put', p: '/pests/:id', h: ({ params, data: b }) => { const t = db.pestRecords.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '已更新') } },
  { m: 'get', p: '/reports', h: () => ok({ list: [
      { id: 1, name: '环境数据月报（2026-10）', type: '环境报表', cycle: '月报', time: '2026-11-01 08:00', size: '2.4MB', fmt: 'PDF' },
      { id: 2, name: '水肥消耗统计表（2026-10）', type: '水肥报表', cycle: '月报', time: '2026-11-01 08:05', size: '560KB', fmt: 'Excel' },
      { id: 3, name: '设备运行月报（2026-10）', type: '设备报表', cycle: '月报', time: '2026-11-01 08:10', size: '1.8MB', fmt: 'PDF' },
      { id: 4, name: '农事作业周报（第43周）', type: '农事报表', cycle: '周报', time: '2026-10-27 18:00', size: '820KB', fmt: 'Excel' },
      { id: 5, name: '采收产量汇总（2026年Q4）', type: '采收报表', cycle: '季报', time: '2026-10-30 09:00', size: '1.1MB', fmt: 'Excel' },
      { id: 6, name: '告警处置月度分析（2026-10）', type: '告警报表', cycle: '月报', time: '2026-11-01 08:30', size: '960KB', fmt: 'PDF' },
    ], total: 6 }) },

  /* ---------- 系统设置 ---------- */
  { m: 'get', p: '/dicts', h: () => ok(db.dictGroups) },
  { m: 'post', p: '/dicts/:type/items', h: ({ params, data: b }) => {
      const g = db.dictGroups.find((x) => x.type === params.type)
      const item = { id: nextId('dict'), status: true, ...b }
      g.items.push(item); return ok(item, '字典项添加成功')
    } },
  { m: 'put', p: '/dicts/:type/items/:id', h: ({ params, data: b }) => {
      const g = db.dictGroups.find((x) => x.type === params.type)
      const item = g.items.find((x) => x.id === +params.id)
      Object.assign(item, b); return ok(item, '保存成功')
    } },
  { m: 'delete', p: '/dicts/:type/items/:id', h: ({ params }) => {
      const g = db.dictGroups.find((x) => x.type === params.type)
      g.items = g.items.filter((x) => x.id !== +params.id); return ok(null, '删除成功')
    } },
  { m: 'get', p: '/params', h: () => ok({ list: db.sysParams, total: db.sysParams.length }) },
  { m: 'put', p: '/params/:id', h: ({ params, data: b }) => { const t = db.sysParams.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '参数已保存') } },
  { m: 'get', p: '/logs', h: ({ params }) => {
      let list = db.logs
      if (params.type) list = list.filter((l) => l.type === params.type)
      if (params.result) list = list.filter((l) => l.result === params.result)
      list = kw(list, ['user', 'module', 'action', 'ip'], params.keyword)
      return ok(paginate(list, params))
    } },
  { m: 'get', p: '/files', h: ({ params }) => ok(paginate(kw(filterBy(db.fileResources, params, [['type']]), ['name', 'uploadBy'], params.keyword), params)) },
  { m: 'delete', p: '/files/:id', h: ({ params }) => { const i = db.fileResources.findIndex((x) => x.id === +params.id); if (i > -1) db.fileResources.splice(i, 1); return ok(null, '文件已删除') } },
  { m: 'get', p: '/tenants', h: ({ params }) => ok(paginate(kw(db.tenants, ['name', 'admin'], params.keyword), params)) },
  { m: 'put', p: '/tenants/:id', h: ({ params, data: b }) => { const t = db.tenants.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'get', p: '/api-configs', h: () => ok({ list: db.apiConfigs, total: db.apiConfigs.length }) },
  { m: 'put', p: '/api-configs/:id', h: ({ params, data: b }) => { const t = db.apiConfigs.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '配置已保存') } },

  /* ---------- 用户 / 角色 / 菜单 ---------- */
  { m: 'get', p: '/users', h: ({ params }) => {
      let list = db.accountUsers.map(({ password, ...rest }) => rest)
      if (params.role) list = list.filter((u) => u.role === params.role)
      if (params.status) list = list.filter((u) => u.status === params.status)
      list = kw(list, ['username', 'name', 'phone', 'email', 'dept'], params.keyword)
      return ok(paginate(list, params))
    } },
  { m: 'post', p: '/users', h: ({ data: b }) => {
      if (db.accountUsers.some((u) => u.username === b.username)) return fail('用户名已存在')
      const role = db.roles.find((r) => r.code === b.role)
      const item = { id: nextId('user'), status: '启用', avatar: '', createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), lastLogin: '—', roleName: role?.name || b.role, ...b }
      db.accountUsers.push(item); return ok({ ...item, password: undefined }, '用户新增成功')
    } },
  { m: 'put', p: '/users/:id', h: ({ params, data: b }) => {
      const t = db.accountUsers.find((x) => x.id === +params.id)
      const role = db.roles.find((r) => r.code === b.role)
      Object.assign(t, b, b.role ? { roleName: role?.name } : {})
      return ok({ ...t, password: undefined }, '用户信息已更新')
    } },
  { m: 'delete', p: '/users/:id', h: ({ params }) => { const i = db.accountUsers.findIndex((x) => x.id === +params.id); if (i > -1) db.accountUsers.splice(i, 1); return ok(null, '用户已删除') } },
  { m: 'get', p: '/roles', h: ({ params }) => {
      let list = db.roles
      if (params.status) list = list.filter((r) => r.status === params.status)
      return ok(paginate(kw(list, ['code', 'name', 'desc'], params.keyword), params))
    } },
  { m: 'get', p: '/roles/all', h: () => ok(db.roles) },
  { m: 'post', p: '/roles', h: ({ data: b }) => { const item = { id: nextId('role'), users: 0, status: '启用', dataScope: '本园区数据', menus: [], ...b }; db.roles.push(item); return ok(item, '角色创建成功') } },
  { m: 'put', p: '/roles/:id', h: ({ params, data: b }) => { const t = db.roles.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/roles/:id', h: ({ params }) => { const t = db.roles.find((x) => x.id === +params.id); if (t?.builtIn) return fail('内置角色不允许删除'); const idx = db.roles.findIndex((x) => x.id === +params.id); if (idx > -1) db.roles.splice(idx, 1); return ok(null, '角色已删除') } },
  { m: 'get', p: '/menus', h: () => ok(db.menuTree) },
  { m: 'post', p: '/menus', h: ({ data: b }) => { const item = { id: nextId('role'), ...b }; const parent = db.menuTree.find((x) => x.id === b.parentId); if (parent) parent.children.push(item); else db.menuTree.push({ ...item, children: [] }); return ok(item, '菜单添加成功') } },
  { m: 'put', p: '/menus/:id', h: ({ params, data: b }) => {
      for (const g of db.menuTree) {
        const t = g.children.find((x) => x.id === +params.id)
        if (t) { Object.assign(t, b); return ok(t, '保存成功') }
        if (g.id === +params.id) { Object.assign(g, b); return ok(g, '保存成功') }
      }
      return fail('菜单不存在')
    } },
  { m: 'delete', p: '/menus/:id', h: ({ params }) => {
      for (const g of db.menuTree) {
        const i = g.children.findIndex((x) => x.id === +params.id)
        if (i > -1) { g.children.splice(i, 1); return ok(null, '删除成功') }
      }
      return fail('菜单不存在')
    } },

  /* ---------- 本地 JSON 数据库（存储管理） ---------- */
  { m: 'get', p: '/db/stats', h: () => ok(dbStats()) },
  { m: 'get', p: '/db/export', h: () => ok({ json: exportDb(), stats: dbStats() }) },
  { m: 'post', p: '/db/import', h: ({ data }) => {
      try { return ok(importDb(data.json), '数据已导入并落盘') } catch (e) { return fail(e.message) }
    } },
  { m: 'post', p: '/db/reset', h: () => { const s = resetDb(); return ok(s, '已恢复初始数据') } },
]

/** 分发入口（axios adapter 调用） */
export async function handleMock(config) {
  const url = (config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(config.baseURL || '', '')
  const method = (config.method || 'get').toLowerCase()
  const route = routes.find((r) => r.m === method && matchRoute(r.p, url))
  if (!route) return fail(`Mock 接口未实现: [${method.toUpperCase()}] ${url}`, 404)
  const params = { ...(config.params || {}) }
  const pathParams = matchRoute(route.p, url)
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  const result = await route.h({
    params: pathParams || {},
    query: params,
    data: body || {},
    headers: config.headers || {},
  })
  // 模拟分页参数透传（body 中携带分页时）
  if (body && body.page && result.code === 0 && route.m === 'post') {
    Object.assign(result, { data: result.data })
  }
  await new Promise((r) => setTimeout(r, LATENCY()))
  if (result.code !== 0) {
    const err = new Error(result.msg)
    err.code = result.code
    err.response = { data: result, status: result.code === 404 ? 404 : 400 }
    throw err
  }
  // 写操作成功后统一落盘：所有业务数据都进入 JSON 文档，刷新后仍可复现
  if (method !== 'get') persistDb()
  return result
}
