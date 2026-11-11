/* ============================================================
 * Mock 接口分发器：模拟 REST API（axios 自定义 adapter 调用）
 * 支持路径参数、查询过滤、分页、模拟网络延迟
 * ============================================================ */
import * as db from './data'
import { rng } from './data'
import { dbMeta, persistDb, exportDb, importDb, resetDb, dbStats, ensureDbReady } from './db'
import { getConfig } from '@/data/configStore'

const LATENCY = () => 90 + Math.random() * 160
const ok = (data, msg = 'success') => ({ code: 0, msg, data })
const fail = (msg, code = 1) => ({ code, msg, data: null })

/** 自增 id 序列由 JSON 数据库托管，随存档一起持久化 */
const seq = dbMeta.seq
const nextId = (k) => {
  // 旧存档可能没有新增集合的序列键，缺省时回落到 10000，避免自增出 NaN
  if (!Number.isFinite(seq[k])) seq[k] = 10000
  return ++seq[k]
}

// 历史脏数据兼容：旧版新建表单会把 id:null 一起提交，这里为缺失 id 的记录补齐自增 id，
// 否则后续 PUT/DELETE 用 +id 匹配不到记录，会抛出 "Cannot convert undefined or null to object"
const ID_COLLECTIONS = [
  ['plans', 'farmPlans'], ['orders', 'workOrders'], ['materials', 'materials'], ['personnel', 'personnel'],
  ['harvests', 'harvests'], ['stock', 'stockRecords'], ['ledger', 'ledgerRecords'], ['reports', 'reports'],
]
ID_COLLECTIONS.forEach(([seqKey, key]) => {
  (db[key] || []).forEach((x) => { if (!x.id) x.id = nextId(seqKey) })
})
// 兜底迁移：设备/地块/账号/角色/菜单/字典/产品等集合历史上也可能残留 id:null，
// 统一补自增 id，保证详情、编辑、删除都能按 id 命中
Object.keys(db).forEach((k) => {
  if (!Array.isArray(db[k])) return
  db[k].forEach((x) => { if (x && typeof x === 'object' && !x.id) x.id = nextId('misc') })
})

// 旧存档里的农药档案没有安全间隔期字段，按药剂标准补齐，保证农药台账口径一致
const SAFE_INTERVAL = getConfig('constants').pesticideSafeInterval
db.materials.forEach((m) => {
  if (m.category !== '农药' || m.safeInterval) return
  const key = Object.keys(SAFE_INTERVAL).find((k) => String(m.name).includes(k))
  m.safeInterval = SAFE_INTERVAL[key] || 7
})

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

/** 真实本地时间（不写入任何虚拟时间） */
const nowText = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')

/** 日期文本归一化：兼容 2026-11-5 / 2026-11-05，统一成 MM-DD 供趋势图分组 */
const dayKey = (t) => {
  const m = String(t ?? '').match(/\d{4}[-/](\d{1,2})[-/](\d{1,2})/)
  return m ? `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : '未知'
}

/** 今天的 YYYY-MM-DD：服务端与表单使用同一套比较口径 */
const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 报表正文：按报表类型从本地 JSON 集合实时聚合，下载时直接使用这份数据 */
function reportContent(type) {
  const STATUS = getConfig('constants').reportStatusLabels
  switch (type) {
    case '环境报表':
      return {
        headers: ['地块', '空气温度(℃)', '空气湿度(%)', 'CO₂(ppm)', '光照(klx)', '土壤温度(℃)'],
        rows: db.plots.map((p) => [p.name, p.env?.temp ?? '—', p.env?.hum ?? '—', p.env?.co2 ?? '—', p.env?.light ?? '—', p.env?.soilT ?? '—']),
      }
    case '水肥报表': {
      const list = db.ledgerRecords.filter((r) => r.type === '灌溉' || r.type === '施肥')
      return {
        headers: ['记录编号', '作业时间', '类型', '地块', '作业人员', '工时(h)', '物料消耗'],
        rows: list.map((r) => [r.code, r.time, r.type, r.plotName, r.operator, r.hours, r.material]),
      }
    }
    case '设备报表':
      return {
        headers: ['设备编号', '设备名称', '类型', '状态', '所属地块', '最近上报'],
        rows: db.devices.map((d) => [d.code, d.name, { gateway: '网关', sensor: '传感器', actuator: '执行器', camera: '摄像头' }[d.type] || d.type, STATUS[d.status] || d.status, db.plots.find((p) => p.id === d.plotId)?.name || '—', d.lastReport ? new Date(d.lastReport).toLocaleString('zh-CN', { hour12: false }) : '—']),
      }
    case '农事报表':
      return {
        headers: ['记录编号', '作业时间', '类型', '地块', '作业人员', '工时(h)', '作业结果'],
        rows: db.ledgerRecords.map((r) => [r.code, r.time, r.type, r.plotName, r.operator, r.hours, r.result]),
      }
    case '采收报表':
      return {
        headers: ['批次编号', '地块', '作物', '采收日期', '产量(kg)', '等级', '状态'],
        rows: db.harvests.map((h) => [h.batchCode, h.plotName, h.crop, h.date, h.qty, h.grade, h.status]),
      }
    case '告警报表':
      return {
        headers: ['告警编号', '类型', '级别', '告警内容', '发生时间', '状态', '处理人'],
        rows: db.alarms.map((a) => [a.code, a.type, `${a.level}级`, a.content, a.time, STATUS[a.status] || a.status, a.handler || '—']),
      }
    default:
      return { headers: ['项目', '数值'], rows: [['报表类型', type], ['生成时间', nowText()]] }
  }
}

function paginate(list, params = {}) {
  // 边界保护：页码/页大小非法时回落到合法值，避免负索引或空页
  const page = Math.max(1, Number.parseInt(params.page, 10) || 1)
  const size = Math.max(1, Number.parseInt(params.size, 10) || 10)
  const start = (page - 1) * size
  return { list: list.slice(start, start + size), total: list.length, page, size }
}

function filterBy(list, params, keys) {
  return list.filter((item) =>
    keys.every(([k, pkey]) => {
      const v = params[pkey || k]
      // 空值（'' / null / undefined）表示该条件不参与筛选
      if (v === undefined || v === '' || v === null) return true
      const iv = item[k]
      if (iv === undefined || iv === null) return false
      if (typeof iv === 'number') return iv === Number(v)
      if (typeof iv === 'boolean') return String(iv) === String(v)
      // 下拉筛选按选项值精确匹配，避免 includes 造成 1 匹配 10 这类误判
      return String(iv) === String(v)
    })
  )
}

const kw = (list, fields, keyword) => {
  // 空白字符串视为未输入，避免“搜索空格返回空列表”
  const k = String(keyword ?? '').trim().toLowerCase()
  if (!k) return list
  return list.filter((it) => fields.some((f) => String(it[f] ?? '').toLowerCase().includes(k)))
}

/* ================= 业务处理表 ================= */
const routes = [
  /* ---------- 认证 ---------- */
  { m: 'post', p: '/auth/login', h: ({ data: body }) => {
      // 手机验证码登录：手机号必须已注册，演示验证码固定 123456
      let user
      if (body.smsCode) {
        if (String(body.smsCode) !== '123456') return fail('验证码不正确（演示验证码：123456）')
        user = db.accountUsers.find((u) => u.phone === body.phone)
        if (!user) return fail('该手机号未注册，请联系管理员')
      } else {
        user = db.accountUsers.find((u) => u.username === body.username)
        if (!user || user.password !== body.password) return fail('用户名或密码错误')
      }
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
  { m: 'post', p: '/auth/reset-password', h: ({ data: body }) => {
      const user = db.accountUsers.find((u) => u.username === body.username || u.phone === body.phone)
      if (!user) return fail('账号不存在，请核对用户名或手机号')
      if (String(body.smsCode || '') !== '123456') return fail('验证码不正确（演示验证码：123456）')
      if (!body.password || body.password.length < 6 || body.password.length > 20) return fail('新密码长度需为 6-20 位')
      user.password = body.password
      return ok(null, '密码重置成功，请使用新密码登录')
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
        env: db.plots.slice(0, 4).map((p) => {
          // 手动新增的地块可能没有 env 字段，统一兜底，避免面板接口抛错
          const e = p.env || {}
          return {
            name: p.name, type: p.type,
            temp: e.temp ?? e.waterT ?? 0,
            hum: e.hum ?? (e.oxygen != null ? e.oxygen * 10 : 0),
            co2: e.co2 ?? 0, light: e.light ?? 0, ph: e.ph ?? 7,
          }
        }),
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
  { m: 'post', p: '/plots', h: ({ data: b }) => {
      if (b?.startDate && b?.endDate && b.endDate < b.startDate) return fail('种植结束不能早于种植开始')
      const item = { id: nextId('plots'), sensors: 0, ...b }
      db.plots.unshift(item)
      return ok(item, '新增地块成功')
    } },
  { m: 'put', p: '/plots/:id', h: ({ params, data: b }) => {
      const t = db.plots.find((x) => x.id === +params.id)
      if (!t) return fail('地块不存在', 404)
      const next = { ...t, ...b }
      if (next.startDate && next.endDate && next.endDate < next.startDate) return fail('种植结束不能早于种植开始')
      Object.assign(t, b)
      return ok(t, '保存成功')
    } },
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
  { m: 'post', p: '/devices', h: ({ data: b }) => { const item = { id: nextId('devices'), status: 'online', battery: 100, lastReport: Date.now(), childCount: 0, ...b }; db.devices.unshift(item); return ok(item, '设备注册成功') } },
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
        // 单条数据缺级别时不能把统计值算成 NaN
        if (byLevel[a.level] != null) byLevel[a.level]++
        const day = dayKey(a.time)
        byDay[day] = (byDay[day] || 0) + 1
      })
      const resolved = db.alarms.filter((a) => a.status === 'resolved' || a.status === 'archived').length
      return ok({
        byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
        byLevel: [{ name: '一般', value: byLevel[1] }, { name: '重要', value: byLevel[2] }, { name: '紧急', value: byLevel[3] }],
        byDay: Object.entries(byDay).map(([day, count]) => ({ day, count })),
        total: db.alarms.length, pending: db.alarms.filter((a) => a.status === 'pending').length,
        resolved, resolveRate: db.alarms.length ? Math.round((resolved / db.alarms.length) * 100) : 0,
        avgHours: 3.6, channels: [{ name: '站内消息', count: db.alarms.length }, { name: '短信', count: Math.round(db.alarms.length * 0.5) }, { name: '微信公众号', count: Math.round(db.alarms.length * 0.7) }],
      })
    } },
  { m: 'put', p: '/alarms/:id', h: ({ params, data: b }) => {
      const t = db.alarms.find((x) => x.id === +params.id)
      if (!t) return fail('告警不存在', 404)
      Object.assign(t, b)
      return ok(t, '告警状态已更新')
    } },
  /* 新增告警：写入 db.alarms（随持久化落盘到 JSON 快照），状态固定为未处理 */
  { m: 'post', p: '/alarms', h: ({ data: b }) => {
      const content = String(b?.content ?? '').trim()
      const type = String(b?.type ?? '').trim()
      if (!content) return fail('请填写告警内容')
      if (!type) return fail('请选择告警类型')
      const id = nextId('alarms')
      const item = {
        id,
        code: `AL-${new Date().getFullYear()}${String(id).padStart(4, '0')}`,
        level: Number(b?.level) || 1,
        type,
        content,
        plotCode: b?.plotCode || null,
        source: String(b?.source ?? '').trim() || '手工录入',
        time: nowText(),
        status: 'pending',
        handler: null,
        handleNote: '',
        channels: ['站内消息'],
      }
      db.alarms.unshift(item)
      return ok(item, '告警已新增')
    } },
  /* 删除告警：从 db.alarms 移除并落盘 */
  { m: 'delete', p: '/alarms/:id', h: ({ params }) => {
      const i = db.alarms.findIndex((x) => x.id === +params.id)
      if (i === -1) return fail('告警不存在', 404)
      db.alarms.splice(i, 1)
      return ok(null, '告警已删除')
    } },
  { m: 'put', p: '/alarms/batch/status', h: ({ data: b }) => { b.ids.forEach((id) => { const t = db.alarms.find((x) => x.id === id); if (t) t.status = b.status }); return ok(null, '批量处理完成') } },

  /* ---------- 策略 / 定时任务 / 控制日志 ---------- */
  { m: 'get', p: '/strategies', h: ({ params }) => ok(paginate(kw(filterBy(db.strategies, params, [['trigger'], ['enabled'], ['plotId']]), ['name', 'condition', 'action'], params.keyword), params)) },
  {
    m: 'post',
    p: '/strategies',
    h: ({ data: b }) => {
      // 服务端字段不可由客户端伪造：新建策略触发次数固定 0，更新时间取真实当前时间
      const { id: _id, times: _times, updatedAt: _updatedAt, ...rest } = b
      const item = { id: nextId('strategies'), times: 0, enabled: rest.enabled !== false, updatedAt: nowText(), ...rest }
      db.strategies.unshift(item)
      return ok(item, '策略创建成功')
    },
  },
  {
    m: 'put',
    p: '/strategies/:id',
    h: ({ params, data: b }) => {
      const t = db.strategies.find((x) => x.id === +params.id)
      if (!t) return fail('策略不存在', 404)
      // 客户端不允许改写 id / 触发次数 / 更新时间，保存时统一刷新为真实时间
      const { id: _id, times: _times, updatedAt: _updatedAt, ...rest } = b
      Object.assign(t, rest, { updatedAt: nowText() })
      return ok(t, '保存成功')
    },
  },
  { m: 'delete', p: '/strategies/:id', h: ({ params }) => { const i = db.strategies.findIndex((x) => x.id === +params.id); if (i > -1) db.strategies.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/tasks', h: () => ok({ list: db.cronTasks, total: db.cronTasks.length }) },
  { m: 'post', p: '/tasks', h: ({ data: b }) => { const { id: _id, ...rest } = b; const item = { id: nextId('tasks'), nextRun: '—', enabled: true, ...rest }; db.cronTasks.unshift(item); return ok(item, '定时任务创建成功') } },
  { m: 'put', p: '/tasks/:id', h: ({ params, data: b }) => { const t = db.cronTasks.find((x) => x.id === +params.id); Object.assign(t, b); return ok(t, '保存成功') } },
  { m: 'delete', p: '/tasks/:id', h: ({ params }) => { const i = db.cronTasks.findIndex((x) => x.id === +params.id); if (i > -1) db.cronTasks.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/control-logs', h: ({ params }) => ok(paginate(kw(filterBy(db.controlLogs, params, [['source'], ['result']]), ['operator', 'device', 'deviceCode'], params.keyword), params)) },
  { m: 'get', p: '/collect-config', h: () => ok(db.collectConfig) },
  { m: 'put', p: '/collect-config', h: ({ data: b }) => { Object.assign(db.collectConfig, b); return ok(db.collectConfig, '采集参数已保存') } },

  /* ---------- 农事 ---------- */
  { m: 'get', p: '/farm-plans', h: ({ params }) => ok(paginate(kw(filterBy(db.farmPlans, params, [['type'], ['status']]), ['code', 'plotName', 'crop', 'creator'], params.keyword), params)) },
  { m: 'post', p: '/farm-plans', h: ({ data: b }) => {
      if (!b?.planDate) return fail('请选择计划日期')
      if (b.planDate < todayISO()) return fail('计划日期不能早于今天')
      if (b.endDate && b.endDate < b.planDate) return fail('完成期限不能早于计划日期')
      const { id: _id, code: _code, status: _status, creator: _creator, approver: _approver, ...rest } = b || {}
      const item = { id: nextId('plans'), code: `FP-2026-${Math.floor(Math.random() * 900 + 100)}`, status: '待审批', creator: '农技人员-罗永刚', approver: '', ...rest }
      db.farmPlans.unshift(item)
      return ok(item, '农事计划已提交审批')
    } },
  { m: 'put', p: '/farm-plans/:id', h: ({ params, data: b }) => {
      const t = db.farmPlans.find((x) => x.id === +params.id)
      if (!t) return fail('农事计划不存在', 404)
      const next = { ...t, ...b }
      if (next.planDate && next.endDate && next.endDate < next.planDate) return fail('完成期限不能早于计划日期')
      // id 由服务端维护，忽略客户端误传的 id
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '保存成功')
    } },
  { m: 'delete', p: '/farm-plans/:id', h: ({ params }) => { const i = db.farmPlans.findIndex((x) => x.id === +params.id); if (i > -1) db.farmPlans.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/work-orders', h: ({ params }) => ok(paginate(kw(filterBy(db.workOrders, params, [['type'], ['status']]), ['code', 'plotName', 'assignee'], params.keyword), params)) },
  { m: 'post', p: '/work-orders', h: ({ data: b }) => {
      if (b?.planDate && b.planDate < todayISO()) return fail('作业日期不能早于今天')
      // id/编号/状态/派单时间由服务端维护，避免表单里的 id:null 覆盖自增 id
      const { id: _id, code: _code, status: _status, createdAt: _createdAt, checkin: _checkin, ...rest } = b || {}
      const item = { id: nextId('orders'), code: `WO-2026-${Math.floor(Math.random() * 900 + 100)}`, status: '待接单', createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), checkin: null, ...rest }
      db.workOrders.unshift(item)
      return ok(item, '工单派发成功')
    } },
  { m: 'put', p: '/work-orders/:id', h: ({ params, data: b }) => {
      const t = db.workOrders.find((x) => x.id === +params.id)
      if (!t) return fail('工单不存在，请刷新列表后重试', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '工单状态已更新')
    } },
  { m: 'delete', p: '/work-orders/:id', h: ({ params }) => { const i = db.workOrders.findIndex((x) => x.id === +params.id); if (i > -1) db.workOrders.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/ledger', h: ({ params }) => ok(paginate(kw(filterBy(db.ledgerRecords, params, [['type']]), ['code', 'plotName', 'operator', 'crop'], params.keyword), params)) },
  { m: 'get', p: '/materials', h: ({ params }) => ok(paginate(kw(filterBy(db.materials, params, [['category']]), ['code', 'name', 'supplier'], params.keyword), params)) },
  { m: 'post', p: '/materials', h: ({ data: b }) => {
      const { id: _id, ...rest } = b || {}
      const id = nextId('materials')
      const item = { id, code: b?.code || `MZ-${String(id).slice(-3)}`, ...rest }
      db.materials.unshift(item)
      return ok(item, '农资档案创建成功')
    } },
  { m: 'put', p: '/materials/:id', h: ({ params, data: b }) => {
      const t = db.materials.find((x) => x.id === +params.id)
      if (!t) return fail('农资档案不存在，请刷新列表后重试', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '保存成功')
    } },
  { m: 'delete', p: '/materials/:id', h: ({ params }) => { const i = db.materials.findIndex((x) => x.id === +params.id); if (i > -1) db.materials.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/stock-records', h: ({ params }) => {
      let list = db.stockRecords
      if (params.type) list = list.filter((r) => r.type === params.type)
      list = kw(list, ['code', 'materialName', 'operator', 'supplier'], params.keyword)
      return ok(paginate(list, params))
    } },
  { m: 'post', p: '/stock-records', h: ({ data: b }) => {
      const { id: _id, code: _code, time: _time, ...rest } = b || {}
      const m = db.materials.find((x) => x.id === +b.materialId)
      const qty = +b.qty
      if (!m) return fail('农资档案不存在，请刷新后重试')
      if (!Number.isFinite(qty) || qty <= 0) return fail('数量必须大于 0')
      if (b.type === 'out' && qty > m.stock) return fail(`库存不足，当前仅剩 ${m.stock}${m.unit || ''}`)
      const item = { id: nextId('stock'), code: `${b.type === 'in' ? 'RK' : 'CK'}-2026-${Math.floor(Math.random() * 900 + 100)}`, time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), ...rest }
      db.stockRecords.unshift(item)
      m.stock = Math.max(0, m.stock + (b.type === 'in' ? qty : -qty))
      return ok(item, b.type === 'in' ? '入库登记成功' : '出库登记成功')
    } },
  { m: 'get', p: '/inventory', h: ({ params }) => {
      let list = db.materials.map((m) => ({ ...m, low: m.stock < m.safeStock, ratio: Math.min(100, Math.round((m.stock / (m.safeStock * 3)) * 100)) }))
      if (params.onlyLow) list = list.filter((m) => m.low)
      list = kw(list, ['code', 'name', 'supplier'], params.keyword)
      return ok(paginate(list, params))
    } },
  // 农药使用台账：由「农药农资档案 + 出库记录 + 农事台账打药记录」关联生成，不另存冗余副本
  { m: 'get', p: '/pesticide-ledger', h: ({ params }) => {
      const pesticides = db.materials.filter((m) => m.category === '农药')
      const findPesticide = (text) => pesticides.find((m) => String(text || '').includes(m.name.slice(0, 3))) || null
      const rows = []
      db.stockRecords.filter((r) => r.type === 'out' && pesticides.some((m) => m.id === +r.materialId)).forEach((r) => {
        const m = db.materials.find((x) => x.id === +r.materialId)
        const order = db.workOrders.find((o) => o.code === r.relatedOrder)
        rows.push({
          id: `S${r.id}`, date: r.time, name: m?.name || r.materialName, qty: `${r.qty}${m?.unit || ''}`,
          plotName: order?.plotName || '—', operator: r.operator, safeInterval: m?.safeInterval ?? 7,
          source: '出库记录', code: r.code,
        })
      })
      db.ledgerRecords.filter((r) => r.type === '打药').forEach((r) => {
        const m = findPesticide(r.material)
        rows.push({
          id: `L${r.id}`, date: r.time, name: m?.name || String(r.material).replace(/\s+\S+$/, ''), qty: r.material,
          plotName: r.plotName, operator: r.operator, safeInterval: m?.safeInterval ?? 7,
          source: '农事台账', code: r.code,
        })
      })
      rows.sort((a, b) => String(b.date).localeCompare(String(a.date)))
      const list = kw(rows, ['name', 'plotName', 'operator', 'code'], params.keyword)
      return ok({ list, total: list.length })
    } },
  { m: 'get', p: '/personnel', h: ({ params }) => ok(paginate(kw(filterBy(db.personnel, params, [['role'], ['status']]), ['name', 'phone', 'area'], params.keyword), params)) },
  { m: 'post', p: '/personnel', h: ({ data: b }) => {
      const { id: _id, ...rest } = b || {}
      const item = { id: nextId('personnel'), workHours: 0, tasks: 0, status: '在岗', ...rest }
      db.personnel.unshift(item)
      return ok(item, '人员档案创建成功')
    } },
  { m: 'put', p: '/personnel/:id', h: ({ params, data: b }) => {
      const t = db.personnel.find((x) => x.id === +params.id)
      if (!t) return fail('人员档案不存在，请刷新列表后重试', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '保存成功')
    } },
  { m: 'delete', p: '/personnel/:id', h: ({ params }) => { const i = db.personnel.findIndex((x) => x.id === +params.id); if (i > -1) db.personnel.splice(i, 1); return ok(null, '删除成功') } },
  { m: 'get', p: '/harvests', h: ({ params }) => ok(paginate(kw(filterBy(db.harvests, params, [['grade'], ['status']]), ['batchCode', 'plotName', 'crop', 'inspector'], params.keyword), params)) },
  { m: 'post', p: '/harvests', h: ({ data: b }) => {
      if (b?.date && b.date > todayISO()) return fail('采收日期不能晚于今天')
      const qty = Number(b?.qty)
      if (!Number.isFinite(qty) || qty <= 0) return fail('采收产量需为大于 0 的数值')
      if (qty > 1000000) return fail('采收产量超出合理范围（上限 1000000kg）')
      const { id: _id, batchCode: _batchCode, status: _status, ...rest } = b || {}
      const item = { id: nextId('harvests'), batchCode: `HC-2026-${Math.floor(Math.random() * 900 + 100)}`, status: '待登记', ...rest }
      db.harvests.unshift(item)
      return ok(item, '采收批次登记成功')
    } },
  { m: 'put', p: '/harvests/:id', h: ({ params, data: b }) => {
      if (b?.date && b.date > todayISO()) return fail('采收日期不能晚于今天')
      if (b?.qty !== undefined) {
        const qty = Number(b.qty)
        if (!Number.isFinite(qty) || qty <= 0) return fail('采收产量需为大于 0 的数值')
        if (qty > 1000000) return fail('采收产量超出合理范围（上限 1000000kg）')
      }
      const t = db.harvests.find((x) => x.id === +params.id)
      if (!t) return fail('采收批次不存在', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '保存成功')
    } },
  { m: 'delete', p: '/harvests/:id', h: ({ params }) => {
      const i = db.harvests.findIndex((x) => x.id === +params.id)
      if (i === -1) return fail('采收批次不存在', 404)
      db.harvests.splice(i, 1)
      return ok(null, '采收批次已删除')
    } },
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
  { m: 'put', p: '/trace-batches/:id', h: ({ params, data: b }) => {
      const t = db.traceBatches.find((x) => x.id === +params.id)
      if (!t) return fail('溯源批次不存在', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '保存成功')
    } },
  { m: 'get', p: '/residue-reports', h: ({ params }) => ok(paginate(kw(filterBy(db.residueReports, params, [['result']]), ['code', 'batchCode', 'org'], params.keyword), params)) },
  { m: 'post', p: '/residue-reports', h: ({ data: b }) => {
      if (b?.date && b.date > todayISO()) return fail('检测日期不能晚于今天')
      const item = { id: nextId('residue'), code: `JC-2026-${Math.floor(Math.random() * 900 + 100)}`, ...b }
      db.residueReports.unshift(item)
      return ok(item, '检测报告登记成功')
    } },
  { m: 'put', p: '/residue-reports/:id', h: ({ params, data: b }) => {
      if (b?.date && b.date > todayISO()) return fail('检测日期不能晚于今天')
      const t = db.residueReports.find((x) => x.id === +params.id)
      if (!t) return fail('检测报告不存在', 404)
      Object.assign(t, b)
      return ok(t, '保存成功')
    } },
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
      // 溯源码必须精确匹配：查不到即返回 404，不再回退到第一条批次
      // （原实现会让任意二维码都显示同一批数据，消费者看到的都是假信息）
      const code = String(params.code || '').trim()
      const b = db.traceBatches.find((x) => x.code === code)
      if (!b) return fail('未找到该溯源码，请确认二维码来源或联系园区', 404)
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
  { m: 'put', p: '/products/:id', h: ({ params, data: b }) => {
      const t = db.products.find((x) => x.id === +params.id)
      if (!t) return fail('产品不存在', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '保存成功')
    } },
  { m: 'delete', p: '/products/:id', h: ({ params }) => { const i = db.products.findIndex((x) => x.id === +params.id); if (i > -1) db.products.splice(i, 1); return ok(null, '下架成功') } },
  { m: 'get', p: '/sales-orders', h: ({ params }) => ok(paginate(kw(filterBy(db.salesOrders, params, [['status']]), ['code', 'customer', 'product'], params.keyword), params)) },
  { m: 'put', p: '/sales-orders/:id', h: ({ params, data: b }) => {
      const t = db.salesOrders.find((x) => x.id === +params.id)
      if (!t) return fail('销售订单不存在', 404)
      Object.assign(t, b)
      return ok(t, '订单状态已更新')
    } },
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
  { m: 'put', p: '/pests/:id', h: ({ params, data: b }) => {
      const t = db.pestRecords.find((x) => x.id === +params.id)
      if (!t) return fail('病虫害记录不存在', 404)
      Object.assign(t, b)
      return ok(t, '已更新')
    } },
  // 报表元数据存 db.reports，正文按类型实时聚合，下载时直接取用
  { m: 'get', p: '/reports', h: ({ params }) => {
      const list = db.reports.map((r) => ({ ...r, content: reportContent(r.type) }))
      return ok(paginate(kw(list, ['name', 'type', 'cycle'], params.keyword), params))
    } },
  { m: 'post', p: '/reports', h: ({ data: b }) => {
      const { id: _id, time: _time, size: _size, ...rest } = b || {}
      const item = {
        id: nextId('reports'),
        name: b?.name || `${b?.type || '综合'}（${b?.cycle || '月报'}）`,
        time: nowText(),
        size: b?.fmt === 'PDF' ? `${(1 + Math.random() * 1.5).toFixed(1)}MB` : '420KB',
        ...rest,
      }
      db.reports.unshift(item)
      return ok(item, '报表生成成功')
    } },
  { m: 'delete', p: '/reports/:id', h: ({ params }) => { const i = db.reports.findIndex((x) => x.id === +params.id); if (i > -1) db.reports.splice(i, 1); return ok(null, '删除成功') } },

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
      if (!item) return fail('字典项不存在', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(item, rest)
      return ok(item, '保存成功')
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
  { m: 'post', p: '/files', h: ({ data: b }) => {
      const id = nextId('files')
      const item = {
        id,
        name: b?.name || `附件-${id}`,
        type: b?.type || 'doc',
        size: b?.size || '—',
        related: b?.related || '—',
        uploadBy: b?.uploadBy || '当前用户',
        time: nowText(),
        path: b?.path || `/uploads/${id}/${b?.name || 'file'}`,
      }
      db.fileResources.unshift(item)
      return ok(item, '文件上传成功')
    } },
  { m: 'delete', p: '/files/:id', h: ({ params }) => { const i = db.fileResources.findIndex((x) => x.id === +params.id); if (i > -1) db.fileResources.splice(i, 1); return ok(null, '文件已删除') } },
  { m: 'get', p: '/tenants', h: ({ params }) => ok(paginate(kw(db.tenants, ['name', 'admin'], params.keyword), params)) },
  { m: 'post', p: '/tenants', h: ({ data: b }) => {
      const item = { id: nextId('tenants'), status: '启用', users: 0, plan: '标准版', ...b }
      db.tenants.unshift(item)
      return ok(item, '租户创建成功')
    } },
  { m: 'put', p: '/tenants/:id', h: ({ params, data: b }) => {
      const t = db.tenants.find((x) => x.id === +params.id)
      if (!t) return fail('租户不存在', 404)
      // 服务端校验：存储配额不得小于该租户当前已用额度，防止绕过前端校验
      if (b && b.quota !== undefined) {
        const used = parseFloat(t.used) || 0
        const quota = parseFloat(b.quota)
        if (Number.isFinite(quota) && quota < used) {
          return fail(`存储配额不能小于当前已用额度（${t.used}），请先清理数据或选择更大配额`, 400)
        }
      }
      Object.assign(t, b)
      return ok(t, '保存成功')
    } },
  { m: 'get', p: '/api-configs', h: () => ok({ list: db.apiConfigs, total: db.apiConfigs.length }) },
  { m: 'put', p: '/api-configs/:id', h: ({ params, data: b }) => {
      const t = db.apiConfigs.find((x) => x.id === +params.id)
      if (!t) return fail('接口配置不存在', 404)
      Object.assign(t, b)
      return ok(t, '配置已保存')
    } },
  { m: 'post', p: '/api-configs/:id/test', h: ({ params }) => {
      const t = db.apiConfigs.find((x) => x.id === +params.id)
      if (!t) return fail('接口配置不存在', 404)
      if (!t.url) return fail('请先填写接口地址')
      return ok({ ok: true, latency: 30 + Math.round(Math.random() * 40), url: t.url, time: nowText() }, '连接成功')
    } },

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
      if (!t) return fail('用户不存在，请刷新列表后重试', 404)
      const { id: _id, ...rest } = b || {}
      const role = db.roles.find((r) => r.code === rest.role)
      Object.assign(t, rest, rest.role ? { roleName: role?.name } : {})
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
  { m: 'put', p: '/roles/:id', h: ({ params, data: b }) => {
      const t = db.roles.find((x) => x.id === +params.id)
      if (!t) return fail('角色不存在', 404)
      const { id: _id, ...rest } = b || {}
      Object.assign(t, rest)
      return ok(t, '保存成功')
    } },
  { m: 'get', p: '/roles/:id/menus', h: ({ params }) => {
      const r = db.roles.find((x) => x.id === +params.id)
      if (!r) return fail('角色不存在', 404)
      return ok({ ids: r.menus || [] })
    } },
  { m: 'put', p: '/roles/:id/menus', h: ({ params, data: b }) => {
      const r = db.roles.find((x) => x.id === +params.id)
      if (!r) return fail('角色不存在', 404)
      r.menus = b?.ids || []
      return ok({ ids: r.menus }, '权限已保存')
    } },
  { m: 'delete', p: '/roles/:id', h: ({ params }) => { const t = db.roles.find((x) => x.id === +params.id); if (t?.builtIn) return fail('内置角色不允许删除'); const idx = db.roles.findIndex((x) => x.id === +params.id); if (idx > -1) db.roles.splice(idx, 1); return ok(null, '角色已删除') } },
  { m: 'get', p: '/menus', h: () => ok(db.menuTree) },
  { m: 'post', p: '/menus', h: ({ data: b }) => {
      const item = { id: nextId('role'), ...b }
      if (b.parentId) {
        const parent = db.menuTree.find((x) => x.id === b.parentId)
          || db.menuTree.flatMap((g) => g.children || []).find((x) => x.id === b.parentId)
        if (!parent) return fail('父级菜单不存在，请刷新后重试')
        parent.children = parent.children || []
        parent.children.push(item)
        return ok(item, '子菜单添加成功')
      }
      db.menuTree.push({ ...item, children: [] })
      return ok(item, '菜单添加成功')
    } },
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
        const i = (g.children || []).findIndex((x) => x.id === +params.id)
        if (i > -1) { g.children.splice(i, 1); return ok(null, '删除成功') }
      }
      const gi = db.menuTree.findIndex((x) => x.id === +params.id)
      if (gi > -1) { db.menuTree.splice(gi, 1); return ok(null, '删除成功') }
      return fail('菜单不存在')
    } },

  /* ---------- 本地 JSON 数据库（存储管理） ---------- */
  { m: 'get', p: '/db/stats', h: () => ok(dbStats()) },
  { m: 'get', p: '/db/export', h: () => ok({ json: exportDb(), stats: dbStats() }) },
  { m: 'post', p: '/db/import', h: ({ data }) => {
      try { return ok(importDb(data.json), '数据已导入并落盘') } catch (e) { return fail(e.message) }
    } },
  { m: 'post', p: '/db/reset', h: () => { const s = resetDb(); return ok(s, '已恢复初始数据') } },

  /* ---------- 页面配置（data/config/*.json） ---------- */
  { m: 'get', p: '/config/:name', h: ({ params }) => {
      const conf = getConfig(params.name)
      return Object.keys(conf || {}).length ? ok(conf) : fail(`配置不存在：${params.name}`, 404)
    } },
]

/** 分发入口（axios adapter 调用） */
export async function handleMock(config) {
  // 首次请求先完成本地 JSON 对账（dev 读文件 / 静态降级 localStorage）
  await ensureDbReady()
  const url = (config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(config.baseURL || '', '')
  const method = (config.method || 'get').toLowerCase()
  const route = routes.find((r) => r.m === method && matchRoute(r.p, url))
  if (!route) return fail(`Mock 接口未实现: [${method.toUpperCase()}] ${url}`, 404)
  const params = { ...(config.params || {}) }
  const pathParams = matchRoute(route.p, url)
  let body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
  // 统一剥离新建请求里的 id：表单初始值 id:null 会覆盖服务端自增 id，
  // 导致记录 id 为空、后续详情/编辑/删除全部 404
  if (method === 'post' && body && typeof body === 'object' && !Array.isArray(body)) {
    const { id: _ignoredId, ...rest } = body
    body = rest
  }
  const result = await route.h({
    // 关键修复：查询条件（config.params）必须合并进 params，
    // 否则所有 GET 列表接口收到的 params 只有路径参数，筛选条件被整体忽略
    params: { ...params, ...(pathParams || {}) },
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
