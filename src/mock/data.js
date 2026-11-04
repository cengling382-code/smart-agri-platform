/* ============================================================
 * Mock 数据层：确定性种子数据 + 伪随机生成器
 * 所有业务实体存于内存，可写操作同步到 localStorage 持久化
 * ============================================================ */

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
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const rint = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const rfloat = (min, max, fixed = 1) => +(rand() * (max - min) + min).toFixed(fixed)

const NOW = Date.now()
const fmtTime = (t) => {
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
export const daysAgo = (n, hour = 9) => NOW - n * 86400000 - (rand() * 3600000) | 0
export const fmt = fmtTime

/* ---------- 基础字典池 ---------- */
export const CROPS = ['番茄', '黄瓜', '生菜', '草莓', '水稻', '柑橘', '辣椒', '西兰花']
const PERSON_NAMES = ['张建国', '李秀兰', '王大富', '刘志强', '陈美凤', '杨春生', '赵德柱', '孙丽娟', '周文斌', '吴桂香', '郑天佑', '何小芳', '罗永刚', '梁山伯', '谢雨欣', '韩梅梅', '唐国强', '冯春华']
const SUPPLIERS = ['金穗农资有限公司', '绿丰种业', '丰收化肥厂', '生物农药科技', '兴农地膜制品', '川农供应链']
const PESTS = ['番茄晚疫病', '黄瓜霜霉病', '白粉虱', '蚜虫', '红蜘蛛', '灰霉病', '菜青虫', '叶斑病']

/* ---------- 园区 / 租户 ---------- */
export const tenants = [
  { id: 1, name: '示范园总部（智慧农业示范园）', admin: '园区管理员', plots: 12, devices: 86, users: 24, quota: '100GB', used: '62.5GB', status: '正常', expire: '2027-11-30', createdAt: '2024-09-01 08:00' },
  { id: 2, name: '江北分园', admin: '王大富', plots: 8, devices: 41, users: 12, quota: '50GB', used: '18.2GB', status: '正常', expire: '2027-06-30', createdAt: '2025-03-15 10:00' },
  { id: 3, name: '南湖水产养殖基地', admin: '刘志强', plots: 5, devices: 23, users: 8, quota: '30GB', used: '9.8GB', status: '正常', expire: '2026-12-31', createdAt: '2025-08-20 14:30' },
  { id: 4, name: '西山畜禽牧场', admin: '陈美凤', plots: 4, devices: 18, users: 6, quota: '20GB', used: '15.6GB', status: '配额预警', expire: '2027-03-31', createdAt: '2025-05-10 09:20' },
]

/* ---------- 地块 ---------- */
export const plots = [
  { id: 1, code: 'P-A01', name: '1号智能大棚', type: '设施大棚', crop: '番茄', areaMu: 3.2, manager: '张建国', startDate: '2026-08-15', endDate: '2027-02-20', status: '种植中', sensors: 8, lat: 30.512, lng: 114.312, env: { temp: 26.4, hum: 68, co2: 520, light: 32.5, soilT: 21.8, soilH: 54.2, ph: 6.5 } },
  { id: 2, code: 'P-A02', name: '2号智能大棚', type: '设施大棚', crop: '黄瓜', areaMu: 3.2, manager: '李秀兰', startDate: '2026-09-01', endDate: '2027-03-01', status: '种植中', sensors: 8, lat: 30.518, lng: 114.318, env: { temp: 25.1, hum: 72, co2: 480, light: 28.6, soilT: 20.9, soilH: 61.3, ph: 6.3 } },
  { id: 3, code: 'P-A03', name: '3号育苗棚', type: '设施大棚', crop: '生菜', areaMu: 2.0, manager: '王大富', startDate: '2026-10-10', endDate: '2027-01-10', status: '育苗期', sensors: 6, lat: 30.521, lng: 114.305, env: { temp: 23.6, hum: 75, co2: 450, light: 21.3, soilT: 19.5, soilH: 66.8, ph: 6.8 } },
  { id: 4, code: 'P-B01', name: '东大田A区', type: '大田', crop: '水稻', areaMu: 120, manager: '刘志强', startDate: '2026-06-20', endDate: '2026-11-05', status: '接近采收', sensors: 12, lat: 30.532, lng: 114.328, env: { temp: 18.9, hum: 58, co2: 420, light: 45.2, soilT: 17.2, soilH: 48.5, ph: 6.9 } },
  { id: 5, code: 'P-B02', name: '东大田B区', type: '大田', crop: '小麦', areaMu: 96, manager: '杨春生', startDate: '2026-10-25', endDate: '2027-06-01', status: '种植中', sensors: 10, lat: 30.536, lng: 114.335, env: { temp: 16.8, hum: 52, co2: 415, light: 41.8, soilT: 15.6, soilH: 42.1, ph: 7.0 } },
  { id: 6, code: 'P-C01', name: '西山坡果园', type: '果园', crop: '柑橘', areaMu: 85, manager: '赵德柱', startDate: '2024-03-01', endDate: '长期', status: '挂果期', sensors: 14, lat: 30.505, lng: 114.292, env: { temp: 19.2, hum: 60, co2: 430, light: 52.4, soilT: 18.1, soilH: 39.6, ph: 6.6 } },
  { id: 7, code: 'P-D01', name: '南湖1号塘', type: '水产', crop: '淡水鱼', areaMu: 26, manager: '孙丽娟', startDate: '2026-04-01', endDate: '2027-01-31', status: '养殖中', sensors: 6, lat: 30.489, lng: 114.34, env: { waterT: 18.4, oxygen: 7.8, ph: 7.4, ammonia: 0.02, nitrite: 0.01, turbidity: 12 } },
  { id: 8, code: 'P-E01', name: '牧场1号舍', type: '畜禽', crop: '生猪', areaMu: 12, manager: '周文斌', startDate: '2026-05-15', endDate: '2027-02-15', status: '养殖中', sensors: 8, lat: 30.545, lng: 114.285, env: { temp: 21.5, hum: 64, nh3: 8.2, h2s: 1.1 } },
]
// GIS 地图地块多边形（画布坐标 0~100）
export const plotShapes = {
  1: [[18, 12], [34, 12], [34, 26], [18, 26]],
  2: [[36, 12], [52, 12], [52, 26], [36, 26]],
  3: [[18, 28], [34, 28], [34, 40], [18, 40]],
  4: [[56, 10], [88, 10], [88, 34], [56, 34]],
  5: [[56, 36], [88, 36], [88, 58], [56, 58]],
  6: [[10, 44], [50, 44], [50, 72], [10, 72]],
  7: [[56, 62], [88, 62], [88, 84], [56, 84]],
  8: [[12, 76], [48, 76], [48, 92], [12, 92]],
}

/* ---------- 设备 ---------- */
const SENSOR_TYPES = [
  ['空气温湿度传感器', ['temp', 'hum']], ['CO₂浓度传感器', ['co2']], ['光照度传感器', ['light']],
  ['土壤温湿度传感器', ['soilT', 'soilH']], ['土壤PH/EC传感器', ['ph']], ['气象站', ['wind', 'rain']],
  ['溶氧传感器', ['oxygen']], ['氨气传感器', ['nh3']],
]
const ACTUATORS = ['水泵', '电磁阀', '风机', '卷帘机', '补光灯', '加温设备', '增氧机', '遮阳帘']
const CAMERAS = ['鱼塘枪机', '大棚球机', '园区全景枪机', '果园枪机', '大田球机', '牧场红外枪机', '仓库枪机', '大门枪机']

function genDevices() {
  const list = []
  let id = 1
  // 网关 4 台
  const gwNames = ['农业物联网智能网关-A', '农业物联网智能网关-B', '水产监测网关', '畜禽养殖网关']
  gwNames.forEach((name, i) => {
    list.push({ id: id++, code: `GW-2026-0${i + 1}`, name, type: 'gateway', model: 'AGW-2000 Pro', plotId: i < 2 ? 1 : i === 2 ? 7 : 8, status: i === 3 ? 'offline' : 'online', ip: `192.168.1.${10 + i}`, fw: 'v2.3.1', lastReport: NOW - rint(1, 30) * 60000, childCount: 0, signal: i === 3 ? 0 : rint(72, 98) })
  })
  // 传感器（按地块类型选型：水产塘配溶氧/氨氮，畜禽舍配氨气/温湿度，避免大棚装溶氧仪这类错位）
  const SENSOR_POOLS = { default: [0, 1, 2, 3, 4, 5], 水产: [6, 7, 0], 畜禽: [7, 0, 1] }
  const sensorPlots = plots.filter((p) => p.sensors > 0)
  sensorPlots.forEach((p) => {
    const pool = SENSOR_POOLS[p.type] || SENSOR_POOLS.default
    const count = Math.min(p.sensors, 4)
    for (let i = 0; i < count; i++) {
      const t = SENSOR_TYPES[pool[i % pool.length]]
      const gw = list.find((d) => d.type === 'gateway' && d.plotId === p.id) || list[0]
      list.push({ id: id++, code: `SN-${String(1000 + id)}`, name: `${t[0]}#${p.code}-${i + 1}`, type: 'sensor', subtype: t[0], params: t[1], model: pick(['RS485-Pro', 'LoRa-433M', 'NB-IoT']), plotId: p.id, gatewayCode: gw.code, status: rand() > 0.9 ? (rand() > 0.5 ? 'offline' : 'fault') : 'online', battery: rint(28, 100), lastReport: NOW - rint(1, 20) * 60000, childCount: 0, signal: rint(40, 100) })
    }
  })
  // 执行器（水产塘只配水泵/电磁阀/增氧机；同名设备按序号去重）
  const AQUA_ACTUATORS = ['水泵', '电磁阀', '增氧机']
  const actNameCount = {}
  for (let i = 0; i < 14; i++) {
    const p = pick(plots.filter((x) => x.type === '设施大棚' || x.type === '水产'))
    const kind = pick(p.type === '水产' ? AQUA_ACTUATORS : ACTUATORS.filter((n) => n !== '增氧机'))
    let fullName = `${p.name}-${kind}`
    actNameCount[fullName] = (actNameCount[fullName] || 0) + 1
    if (actNameCount[fullName] > 1) fullName += `-${actNameCount[fullName]}`
    const gw = list.find((d) => d.type === 'gateway' && d.plotId === p.id) || list[0]
    list.push({ id: id++, code: `ACT-${String(2000 + id)}`, name: fullName, type: 'actuator', subtype: kind, model: 'EX-2200', plotId: p.id, gatewayCode: gw.code, status: rand() > 0.88 ? (rand() > 0.5 ? 'offline' : 'fault') : 'online', running: rand() > 0.7, lastReport: NOW - rint(1, 15) * 60000, childCount: 0, signal: rint(45, 100) })
  }
  // 摄像头（按名称落位到匹配的地块，避免"鱼塘枪机"装进大棚）
  const CAMERA_PLOTS = [7, 1, 3, 6, 4, 8, 1, 3]
  CAMERAS.forEach((name, i) => {
    const p = plots[CAMERA_PLOTS[i] - 1]
    list.push({ id: id++, code: `CAM-${String(300 + i)}`, name, type: 'camera', subtype: name.includes('球机') ? '球机' : '枪机', model: 'HK-4K-i8', plotId: p.id, gatewayCode: 'GW-2026-01', status: i === 5 ? 'fault' : 'online', battery: 100, lastReport: NOW - rint(1, 10) * 60000, childCount: 0, channel: i + 1, signal: rint(60, 100) })
  })
  // 网关下挂设备数
  list.filter((d) => d.type === 'gateway').forEach((gw) => {
    gw.childCount = list.filter((d) => d.gatewayCode === gw.code).length
  })
  return list
}
export const devices = genDevices()

/* ---------- 传感器读数（生成函数，不入库） ---------- */
const PARAM_META = {
  temp: { name: '空气温度', unit: '℃', base: 22, amp: 8 },
  hum: { name: '空气湿度', unit: '%RH', base: 62, amp: 18 },
  co2: { name: 'CO₂浓度', unit: 'ppm', base: 480, amp: 120 },
  light: { name: '光照强度', unit: 'klx', base: 32, amp: 25 },
  soilT: { name: '土壤温度', unit: '℃', base: 19, amp: 4 },
  soilH: { name: '土壤湿度', unit: '%', base: 52, amp: 15 },
  ph: { name: 'PH值', unit: '', base: 6.6, amp: 0.6 },
  wind: { name: '风速', unit: 'm/s', base: 2.4, amp: 3 },
  rain: { name: '降雨量', unit: 'mm', base: 0.2, amp: 1.5 },
  oxygen: { name: '溶解氧', unit: 'mg/L', base: 7.5, amp: 2 },
  nh3: { name: '氨气浓度', unit: 'ppm', base: 6, amp: 4 },
}
export function genSeries(seed, paramKey, points, stepMs = 3600000) {
  const meta = PARAM_META[paramKey] || { name: paramKey, unit: '', base: 10, amp: 3 }
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
export const paramMeta = PARAM_META

/* ---------- 告警 ---------- */
// 每条模板绑定真实存在的来源设备编码，避免"氨气传感器故障"却上报成摄像头编码
const ALARM_TPL = [
  ['环境超限', '1号智能大棚空气温度超过阈值上限 32℃', 'P-A01', 'SN-1006'],
  ['设备故障', '牧场1号舍氨气传感器通信异常，连续3次上报失败', 'P-E01', 'SN-1034'],
  ['环境超限', '南湖1号塘溶解氧低于 5mg/L，请及时开启增氧机', 'P-D01', 'SN-1030'],
  ['离线掉线', '畜禽养殖网关离线超过 30 分钟', 'P-E01', 'GW-2026-04'],
  ['库存不足', '有机肥（腐熟羊粪）库存低于安全线', null, '数据中台'],
  ['传感器异常', '2号智能大棚土壤湿度数据漂移，疑似传感器故障', 'P-A02', 'SN-1013'],
  ['灾害预警', '气象部门发布霜冻蓝色预警，预计夜间最低温 1℃', null, '数据中台'],
]
export const alarms = Array.from({ length: 26 }, (_, i) => {
  const [type, content, plotCode, source] = ALARM_TPL[i % ALARM_TPL.length]
  const status = i < 5 ? 'pending' : i < 10 ? 'confirmed' : i < 22 ? 'resolved' : 'archived'
  return {
    id: 1000 + i, code: `AL-2026${String(1000 + i)}`, type,
    level: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
    content, plotCode, source,
    time: fmt(NOW - i * rint(40, 300) * 60000),
    status, handler: status === 'pending' ? null : pick(PERSON_NAMES),
    channels: [pick(['站内消息', '短信', '微信公众号']), '站内消息'],
    handleNote: status === 'resolved' || status === 'archived' ? pick(['已现场处置并恢复正常', '已更换备用传感器', '已远程开启设备', '已安排人员巡检']) : '',
  }
})

/* ---------- 控制策略 / 定时任务 / 控制日志 ---------- */
export const strategies = [
  { id: 1, name: '番茄棚智能灌溉', plotId: 1, trigger: 'threshold', condition: '土壤湿度 < 45% 持续 15 分钟', action: '开启滴灌电磁阀 20 分钟', enabled: true, times: 32, scene: '', updatedAt: fmt(NOW - 86400000 * 2) },
  { id: 2, name: '高温自动通风', plotId: 1, trigger: 'threshold', condition: '空气温度 > 30℃ 且 CO₂ < 600ppm', action: '开启风机 + 开启遮阳帘', enabled: true, times: 18, scene: '', updatedAt: fmt(NOW - 86400000 * 4) },
  { id: 3, name: '育苗棚补光', plotId: 3, trigger: 'schedule', condition: '每日 06:00-08:00 / 17:30-19:30', action: '开启补光灯（强度 80%）', enabled: true, times: 210, scene: '', updatedAt: fmt(NOW - 86400000 * 6) },
  { id: 4, name: '鱼塘溶氧保护', plotId: 7, trigger: 'threshold', condition: '溶解氧 < 5mg/L', action: '开启增氧机直至恢复正常', enabled: true, times: 7, scene: '', updatedAt: fmt(NOW - 86400000) },
  { id: 5, name: '多条件组合：夜间低温防护', plotId: 2, trigger: 'combo', condition: '02:00-06:00 且 空气温度 < 8℃', action: '开启加温设备 + 关闭天窗', enabled: false, times: 3, scene: '', updatedAt: fmt(NOW - 86400000 * 9) },
  { id: 6, name: '育苗场景模板', plotId: 3, trigger: 'scene', condition: '温度 22-26℃ / 湿度 65-75% / 光照 20klx', action: '一键切换设备组合（加温+补光+微喷）', enabled: true, times: 12, scene: '育苗', updatedAt: fmt(NOW - 86400000 * 3) },
  { id: 7, name: '开花场景模板', plotId: 1, trigger: 'scene', condition: '温度 20-25℃ / 湿度 55-65%', action: '一键切换设备组合（通风+滴灌）', enabled: true, times: 5, scene: '开花', updatedAt: fmt(NOW - 86400000 * 5) },
  { id: 8, name: '越冬场景模板', plotId: 8, trigger: 'scene', condition: '温度 18-22℃ / 氨气 < 10ppm', action: '一键切换设备组合（加温+风机）', enabled: false, times: 1, scene: '越冬', updatedAt: fmt(NOW - 86400000 * 30) },
]
export const cronTasks = [
  { id: 1, name: '大棚1号晨间灌溉', cron: '0 30 6 * * ?', cronText: '每天 06:30', action: '开启滴灌 25 分钟', plotId: 1, enabled: true, nextRun: '明日 06:30' },
  { id: 2, name: '育苗棚晚间补光', cron: '0 0 17,19 * * ?', cronText: '每天 17:00 / 19:00', action: '开启补光灯 2 小时', plotId: 3, enabled: true, nextRun: '今日 17:00' },
  { id: 3, name: '鱼塘午后增氧', cron: '0 0 13 * * ?', cronText: '每天 13:00', action: '开启增氧机 90 分钟', plotId: 7, enabled: true, nextRun: '今日 13:00' },
  { id: 4, name: '果园周报数据归档', cron: '0 0 2 ? * MON', cronText: '每周一 02:00', action: '生成环境周报并归档', plotId: 6, enabled: false, nextRun: '—' },
]
export const controlLogs = Array.from({ length: 30 }, (_, i) => {
  const dev = pick(devices.filter((d) => d.type === 'actuator'))
  return {
    id: i + 1, operator: rand() > 0.4 ? '张建国' : '系统策略',
    source: rand() > 0.4 ? 'manual' : 'auto',
    device: dev.name, deviceCode: dev.code,
    action: pick(['开启', '关闭', '调节至 60%', '开启 20 分钟']),
    time: fmt(NOW - i * rint(20, 200) * 60000),
    result: rand() > 0.06 ? '成功' : '失败(设备离线)',
  }
})

/* ---------- 农事计划 / 工单 / 台账 ---------- */
const FARM_TYPES = ['播种', '移栽', '施肥', '打药', '除草', '灌溉', '采收']
// 种植类农事只在陆地地块安排（鱼塘/畜禽舍不播种除草）；小麦刚于 2026-10-25 播种，不排采收/移栽
const LAND_PLOTS = plots.filter((p) => ['设施大棚', '大田', '果园'].includes(p.type) && p.crop !== '小麦')
export const farmPlans = Array.from({ length: 14 }, (_, i) => {
  const plot = pick(LAND_PLOTS)
  return {
    id: i + 1, code: `FP-2026-${String(100 + i)}`, type: pick(FARM_TYPES), plotId: plot.id, plotName: plot.name,
    crop: plot.crop, content: pick(['全棚统一作业，预计2人1天完成', '分两个批次进行', '上午完成东半区，下午完成西半区']),
    planDate: fmt(NOW + (i - 6) * 86400000).slice(0, 10), endDate: fmt(NOW + (i - 6) * 86400000 + 86400000).slice(0, 10),
    // 状态与日期对齐：越早的计划越靠后生命周期（已完成→进行中→已审批→待审批）
    status: i < 5 ? '已完成' : i < 7 ? '进行中' : i < 11 ? '已审批' : '待审批',
    creator: '农技人员-罗永刚', approver: i < 11 ? '园区管理员' : '', createdAt: fmt(NOW - (i + 2) * 86400000),
  }
})
export const workOrders = Array.from({ length: 16 }, (_, i) => {
  // 只取计划日期已到期的计划（索引 0~5，日期为 1~6 天前），避免"已完成"工单早于计划日期
  const plan = farmPlans[i % 6]
  const status = ['待接单', '进行中', '待验收', '已完成', '已驳回'][i % 5]
  return {
    id: i + 1, code: `WO-2026-${String(200 + i)}`, type: plan.type, planCode: plan.code, plotId: plan.plotId, plotName: plan.plotName,
    assignee: pick(PERSON_NAMES), phone: `138${rint(10000000, 99999999)}`,
    planDate: plan.planDate, status,
    checkin: status === '已完成' || status === '待验收' ? { time: fmt(NOW - rint(2, 10) * 3600000), location: `${plan.plotName}入口`, photos: 2, hours: rfloat(2, 8, 1), remark: '作业现场已完成，附件为现场照片' } : null,
    materials: i % 3 === 0 ? [{ name: '复合化肥', qty: '25kg' }] : [],
    createdAt: fmt(NOW - (i + 1) * 43200000),
  }
})
export const ledgerRecords = Array.from({ length: 24 }, (_, i) => {
  const plot = pick(LAND_PLOTS)
  const t = FARM_TYPES[i % FARM_TYPES.length]
  return {
    id: i + 1, code: `LG-2026-${String(300 + i)}`, time: fmt(NOW - i * 86400000 * 3), type: t, plotName: plot.name, crop: plot.crop,
    operator: pick(PERSON_NAMES), hours: rfloat(2, 8, 1),
    material: t === '施肥' ? '复合化肥 20kg' : t === '打药' ? pick(['吡虫啉 200ml', '多菌灵 500g']) : '—',
    photos: rint(1, 4), result: pick(['正常完成', '正常完成', '已完成，部分区域返工']),
  }
})

/* ---------- 农资 ---------- */
export const materials = [
  { id: 1, code: 'MZ-001', name: '番茄种子（浙粉702）', category: '种子', spec: '1000粒/袋', unit: '袋', supplier: '绿丰种业', price: 128, stock: 34, safeStock: 10 },
  { id: 2, code: 'MZ-002', name: '黄瓜种子（津优35）', category: '种子', spec: '500粒/袋', unit: '袋', supplier: '绿丰种业', price: 86, stock: 8, safeStock: 10 },
  { id: 3, code: 'MZ-003', name: '复合化肥（15-15-15）', category: '化肥', spec: '50kg/袋', unit: '袋', supplier: '丰收化肥厂', price: 165, stock: 46, safeStock: 20 },
  { id: 4, code: 'MZ-004', name: '有机肥（腐熟羊粪）', category: '化肥', spec: '40kg/袋', unit: '袋', supplier: '丰收化肥厂', price: 78, stock: 15, safeStock: 20 },
  { id: 5, code: 'MZ-005', name: '吡虫啉悬浮剂', category: '农药', spec: '500ml/瓶', unit: '瓶', supplier: '生物农药科技', price: 42, stock: 22, safeStock: 8 },
  { id: 6, code: 'MZ-006', name: '多菌灵可湿性粉剂', category: '农药', spec: '1kg/袋', unit: '袋', supplier: '生物农药科技', price: 35, stock: 5, safeStock: 8 },
  { id: 7, code: 'MZ-007', name: '黑色地膜（1.2m）', category: '地膜', spec: '100m/卷', unit: '卷', supplier: '兴农地膜制品', price: 96, stock: 18, safeStock: 5 },
  { id: 8, code: 'MZ-008', name: '育苗基质', category: '种子', spec: '50L/袋', unit: '袋', supplier: '金穗农资有限公司', price: 58, stock: 27, safeStock: 10 },
]
export const stockRecords = Array.from({ length: 20 }, (_, i) => {
  const m = pick(materials)
  const isIn = i % 2 === 0
  return {
    id: i + 1, code: `${isIn ? 'RK' : 'CK'}-2026-${String(400 + i)}`, type: isIn ? 'in' : 'out', materialId: m.id, materialName: m.name,
    qty: rint(2, 30), unit: m.unit, operator: pick(PERSON_NAMES), time: fmt(NOW - i * 86400000),
    supplier: isIn ? m.supplier : '—', relatedOrder: isIn ? `PO-2026-${500 + i}` : pick(workOrders).code, remark: isIn ? '验收入库' : '工单领用出库',
  }
})
// 期末库存对账：库存 = 期初(非负) + 入库 - 出库，故不得小于累计净入库
const stockNet = {}
stockRecords.forEach((r) => {
  stockNet[r.materialId] = (stockNet[r.materialId] || 0) + (r.type === 'in' ? r.qty : -r.qty)
})
materials.forEach((m) => {
  const net = stockNet[m.id] || 0
  if (net > m.stock) m.stock = net
})

/* ---------- 人员 ---------- */
export const personnel = PERSON_NAMES.slice(0, 12).map((name, i) => ({
  id: i + 1, name, gender: i % 2 ? '男' : '女', role: i % 4 === 0 ? '技术员' : i % 3 === 0 ? '工人' : '农户',
  phone: `139${rint(10000000, 99999999)}`, skills: [pick(['播种', '施肥', '打药', '采收', '嫁接', '修剪']), pick(['滴灌维护', '大棚管理', '农机操作', '水产养殖'])],
  area: pick(['1号棚', '2号棚', '东大田', '果园', '鱼塘', '牧场']), workHours: rint(80, 480), tasks: rint(6, 45), status: i === 11 ? '休假' : '在岗', joinDate: `202${rint(3, 6)}-0${rint(1, 9)}-1${rint(0, 8)}`,
}))

/* ---------- 采收 / 溯源 / 农残 ---------- */
export const harvests = Array.from({ length: 12 }, (_, i) => {
  // 排除育苗期棚与刚播种的小麦（2026-10-25），保证采收日期晚于地块种植日期
  const plot = pick(plots.filter((p) => ['设施大棚', '大田', '果园', '水产'].includes(p.type) && p.status !== '育苗期' && p.crop !== '小麦'))
  return {
    id: i + 1, batchCode: `HC-2026-${String(700 + i)}`, plotId: plot.id, plotName: plot.name, crop: plot.crop,
    date: fmt(NOW - i * 86400000 * 4).slice(0, 10), qty: rint(200, 3600), grade: pick(['特级', '一级', '一级', '二级']),
    inspector: pick(PERSON_NAMES), quality: pick(['优', '良', '良', '合格']), status: i < 3 ? '待登记' : '已入库',
  }
})
export const traceBatches = harvests.slice(0, 8).map((h, i) => ({
  id: i + 1, code: `TR-${h.batchCode.slice(3)}`, crop: h.crop, plotName: h.plotName, qty: `${h.qty}kg`,
  harvestCode: h.batchCode, status: i < 2 ? '待完善' : i < 6 ? '已发布' : i === 6 ? '已召回' : '已下架',
  // 溯源批次在采收次日建立（不得早于采收日期；首条当日生效）
  created: i === 0 ? fmt(NOW) : fmt(NOW - i * 86400000 * 4 + 86400000 + rint(1, 20) * 3600000),
  scans: rint(12, 860), org: '示范园总部（智慧农业示范园）',
  records: { farm: rint(6, 18), env: rint(300, 900), tests: i < 2 ? 0 : rint(1, 2) },
}))
export const residueReports = traceBatches.filter((b) => b.status !== '待完善').map((b, i) => ({
  id: i + 1, code: `JC-2026-${String(800 + i)}`, batchCode: b.code, crop: b.crop,
  item: pick(['敌敌畏', '氯氰菊酯', '毒死蜱', '多菌灵']),
  // 检测日期 = 对应批次采收日 + 2 天；不合格结论只落在"已召回"的批次（traceBatches[6]）上
  result: i === 4 ? '不合格' : '合格',
  org: pick(['市农产品质量安全检测中心', '第三方检测机构（华测）']),
  date: fmt(NOW - (i + 2) * 86400000 * 4 + 86400000 * 2).slice(0, 10), file: '检测报告.pdf',
}))

/* ---------- 产销对接 ---------- */
export const products = [
  { id: 1, name: '智慧番茄礼盒（3kg）', crop: '番茄', spec: '3kg/盒 精选果', price: 68, stock: 240, status: '上架', traceCode: traceBatches[0].code, sales: 356, img: 'tomato' },
  { id: 2, name: '水果黄瓜（2.5kg）', crop: '黄瓜', spec: '2.5kg/箱', price: 39.9, stock: 180, status: '上架', traceCode: traceBatches[1].code, sales: 218, img: 'cucumber' },
  { id: 3, name: '有机生菜（1kg）', crop: '生菜', spec: '1kg/袋 净菜', price: 12.8, stock: 90, status: '上架', traceCode: traceBatches[2].code, sales: 143, img: 'lettuce' },
  { id: 4, name: '生态大米（5kg）', crop: '水稻', spec: '5kg/袋 当季新米', price: 59, stock: 320, status: '上架', traceCode: traceBatches[3].code, sales: 502, img: 'rice' },
  { id: 5, name: '高山柑橘（5kg）', crop: '柑橘', spec: '5kg/箱', price: 45, stock: 0, status: '下架', traceCode: traceBatches[4].code, sales: 87, img: 'orange' },
]
export const salesOrders = Array.from({ length: 18 }, (_, i) => {
  const p = pick(products)
  const qty = rint(1, 8)
  return {
    id: i + 1, code: `SO-2026-${String(600 + i)}`, customer: pick(['曾凌', '敖旺', ...PERSON_NAMES]),
    product: p.name, traceCode: p.traceCode, qty, amount: +(p.price * qty).toFixed(2),
    status: ['待付款', '待发货', '已发货', '已完成', '已完成', '已退款'][i % 6],
    time: fmt(NOW - i * 43200000), address: pick(['江北区云杉路 21 号', '南湖大道 88 号', '科技二路 5 号']),
  }
})
export const customers = ['曾凌', '敖旺', ...PERSON_NAMES.slice(0, 8)].map((name, i) => ({
  id: i + 1, name, phone: `137${rint(10000000, 99999999)}`, level: i % 5 === 0 ? '大客户' : i % 3 === 0 ? 'VIP' : '普通',
  orders: rint(1, 24), amount: rint(200, 6800), lastBuy: fmt(NOW - rint(1, 60) * 86400000), tags: i % 5 === 0 ? ['企业采购'] : ['复购客户'],
}))

/* ---------- 系统设置 ---------- */
export const dictGroups = [
  { type: 'crop_type', name: '作物类型', items: CROPS.map((c, i) => ({ id: i + 1, label: c, value: `crop_${i + 1}`, sort: i + 1, status: true })) },
  { type: 'farm_type', name: '农事类型', items: FARM_TYPES.map((c, i) => ({ id: i + 10, label: c, value: `farm_${i + 1}`, sort: i + 1, status: true })) },
  { type: 'device_type', name: '设备类型', items: ['网关', '传感器', '执行器', '摄像头'].map((c, i) => ({ id: i + 30, label: c, value: `dev_${i + 1}`, sort: i + 1, status: true })) },
  { type: 'alarm_type', name: '告警类型', items: ['环境超限', '设备故障', '离线掉线', '库存不足', '灾害预警', '传感器异常'].map((c, i) => ({ id: i + 40, label: c, value: `alarm_${i + 1}`, sort: i + 1, status: true })) },
  { type: 'unit', name: '计量单位', items: ['kg', '袋', '瓶', '卷', '箱', '亩'].map((c, i) => ({ id: i + 60, label: c, value: `u_${i + 1}`, sort: i + 1, status: true })) },
]
export const sysParams = [
  { id: 1, key: 'platform.name', name: '平台名称', value: '智慧农业综合管理平台', type: 'string', desc: '浏览器标题与页头展示' },
  { id: 2, key: 'collect.interval', name: '默认采集频率（秒）', value: 300, type: 'number', desc: '传感器默认数据上报间隔' },
  { id: 3, key: 'alarm.sms', name: '告警短信通知', value: true, type: 'switch', desc: '重要/紧急告警触发短信' },
  { id: 4, key: 'alarm.wechat', name: '微信公众号推送', value: true, type: 'switch', desc: '关注公众号后接收告警推送' },
  { id: 5, key: 'alarm.threshold.temp.max', name: '温度告警上限（℃）', value: 32, type: 'number', desc: '空气温度超过此值触发环境超限告警' },
  { id: 6, key: 'alarm.threshold.temp.min', name: '温度告警下限（℃）', value: 5, type: 'number', desc: '空气温度低于此值触发霜冻风险告警' },
  { id: 7, key: 'alarm.threshold.hum.min', name: '湿度告警下限（%）', value: 30, type: 'number', desc: '土壤湿度低于此值触发灌溉提醒' },
  { id: 8, key: 'trace.expire', name: '溯源页面有效期（月）', value: 36, type: 'number', desc: '溯源二维码失效时间' },
]
export const logs = Array.from({ length: 40 }, (_, i) => {
  const type = i % 7 === 0 ? 'error' : i % 3 === 0 ? 'login' : 'operate'
  const user = pick(['admin', '园区管理员', '农技人员-罗永刚', '张建国', '监管人员'])
  return {
    id: i + 1, type, user, ip: `192.168.${rint(0, 2)}.${rint(2, 250)}`,
    module: pick(['登录模块', '设备控制', '用户管理', '农事工单', '告警中心', '系统设置']),
    action: type === 'login' ? pick(['登录成功', '登录失败（密码错误）']) : type === 'error' ? pick(['接口异常 500', '设备控制超时', '文件上传失败']) : pick(['新增设备', '修改策略', '删除地块', '派发工单', '导出报表', '处置告警']),
    time: fmt(NOW - i * 3600000 * rint(1, 9)), result: type === 'error' ? '失败' : '成功',
    detail: type === 'error' ? 'Request timeout of 10000ms exceeded' : '—',
  }
})
export const fileResources = Array.from({ length: 16 }, (_, i) => {
  const type = ['img', 'video', 'doc'][i % 3]
  return {
    id: i + 1, name: type === 'img' ? `现场照片_${1000 + i}.jpg` : type === 'video' ? `大棚巡检视频_${1000 + i}.mp4` : `检测报告_${1000 + i}.pdf`,
    type, size: type === 'video' ? `${rint(28, 420)}MB` : `${rint(120, 8600)}KB`,
    path: `/upload/2026/10/${1000 + i}.${type === 'img' ? 'jpg' : type === 'video' ? 'mp4' : 'pdf'}`,
    uploadBy: pick(PERSON_NAMES), time: fmt(NOW - i * 86400000 * 2), related: pick(['农事工单', '溯源批次', '设备巡检']),
  }
})
export const apiConfigs = [
  { id: 1, name: '气象数据服务', provider: '和风天气', type: 'weather', url: 'https://api.qweather.com/v7', key: 'QW-****-9f3a', status: '已连接', lastSync: fmt(NOW - 3600000), qps: 100 },
  { id: 2, name: '农产品质量安全监管平台', provider: '省农业农村厅', type: 'gov', url: 'https://jc.ncp.gov.cn/api', key: 'GV-****-22b1', status: '已连接', lastSync: fmt(NOW - 86400000), qps: 20 },
  { id: 3, name: '物联网设备接入平台', provider: 'OneNET', type: 'iot', url: 'https://iot-api.heclouds.com', key: 'ON-****-7c8d', status: '已连接', lastSync: fmt(NOW - 300000), qps: 500 },
  { id: 4, name: '视频云平台', provider: '萤石云', type: 'video', url: 'https://open.ys7.com/api', key: 'YS-****-1a2e', status: '异常', lastSync: fmt(NOW - 86400000 * 2), qps: 60 },
  { id: 5, name: '电商订单同步', provider: '系统内部', type: 'erp', url: '内部服务 /api/trade/sync', key: '—', status: '未启用', lastSync: '—', qps: 0 },
]

/* ---------- 用户 / 角色 / 菜单（RBAC） ---------- */
export const roles = [
  { id: 1, code: 'admin', name: '系统管理员', desc: '平台最高权限，管理账号与系统配置', users: 1, status: '启用', dataScope: '全部数据', builtIn: true },
  { id: 2, code: 'manager', name: '园区管理员', desc: '园区运营监控、告警处置、审批与报表', users: 2, status: '启用', dataScope: '本园区数据', builtIn: true },
  { id: 3, code: 'tech', name: '农技人员', desc: '农事计划制定、工单派发、设备远程控制', users: 2, status: '启用', dataScope: '本园区数据', builtIn: true },
  { id: 4, code: 'farmer', name: '农户/工人', desc: '接收工单、打卡上报、查看告警', users: 2, status: '启用', dataScope: '本人数据', builtIn: true },
  { id: 5, code: 'regulator', name: '监管人员', desc: '溯源信息与农残检测报告监督查看', users: 1, status: '启用', dataScope: '溯源相关数据', builtIn: true },
]
export const accountUsers = [
  { id: 1, username: 'admin', password: '123456', name: '系统管理员', role: 'admin', roleName: '系统管理员', phone: '13800000001', email: 'admin@agri.com', dept: '信息中心', avatar: '', status: '启用', createdAt: '2024-09-01 08:00', lastLogin: fmt(NOW - 3600000) },
  { id: 2, username: 'manager', password: '123456', name: '王大富', role: 'manager', roleName: '园区管理员', phone: '13800000002', email: 'manager@agri.com', dept: '示范园总部', avatar: '', status: '启用', createdAt: '2024-09-05 09:00', lastLogin: fmt(NOW - 7200000) },
  { id: 3, username: 'tech', password: '123456', name: '罗永刚', role: 'tech', roleName: '农技人员', phone: '13800000003', email: 'tech@agri.com', dept: '农技服务站', avatar: '', status: '启用', createdAt: '2024-09-10 10:00', lastLogin: fmt(NOW - 86400000) },
  { id: 4, username: 'farmer', password: '123456', name: '张建国', role: 'farmer', roleName: '农户/工人', phone: '13800000004', email: 'farmer@agri.com', dept: '种植一组', avatar: '', status: '启用', createdAt: '2024-10-01 14:00', lastLogin: fmt(NOW - 172800000) },
  { id: 5, username: 'regulator', password: '123456', name: '郑天佑', role: 'regulator', roleName: '监管人员', phone: '13800000005', email: 'reg@agri.gov', dept: '市监管局', avatar: '', status: '启用', createdAt: '2025-01-15 11:00', lastLogin: fmt(NOW - 259200000) },
  { id: 6, username: 'lixiulan', password: '123456', name: '李秀兰', role: 'farmer', roleName: '农户/工人', phone: '13987654321', email: '', dept: '种植二组', avatar: '', status: '禁用', createdAt: '2025-02-20 16:00', lastLogin: fmt(NOW - 2592000000) },
  { id: 7, username: 'liuzq', password: '123456', name: '刘志强', role: 'tech', roleName: '农技人员', phone: '13900001111', email: 'liuzq@agri.com', dept: '农技服务站', avatar: '', status: '启用', createdAt: '2025-03-08 10:30', lastLogin: fmt(NOW - 345600000) },
  { id: 8, username: 'chenmf', password: '123456', name: '陈美凤', role: 'manager', roleName: '园区管理员', phone: '13900002222', email: 'chenmf@agri.com', dept: '西山牧场', avatar: '', status: '启用', createdAt: '2025-05-10 09:20', lastLogin: fmt(NOW - 432000000) },
]

/** 菜单权限树（角色权限配置页使用） */
export const menuTree = [
  { id: 100, name: '数据面板', children: [{ id: 101, name: '工作台' }, { id: 102, name: '核心指标卡片' }, { id: 103, name: '环境实时数据' }, { id: 104, name: '环境趋势图' }, { id: 105, name: '大屏可视化' }] },
  { id: 200, name: '物联网监测', children: [{ id: 201, name: '设备总览' }, { id: 202, name: '设备详情' }, { id: 203, name: '传感器数据监测' }, { id: 204, name: '视频监控' }, { id: 205, name: '策略联动配置' }, { id: 206, name: '设备控制' }, { id: 207, name: '告警列表' }, { id: 208, name: '告警统计分析' }, { id: 209, name: '采集参数配置' }, { id: 210, name: '网关设备管理' }] },
  { id: 300, name: 'GIS地理信息', children: [{ id: 301, name: '园区地图总览' }, { id: 302, name: '地块档案管理' }, { id: 303, name: '图层管理' }] },
  { id: 400, name: '农事生产管理', children: [{ id: 401, name: '农事计划' }, { id: 402, name: '农事工单' }, { id: 403, name: '农事台账' }, { id: 404, name: '农资档案' }, { id: 405, name: '入库/出库单' }, { id: 406, name: '农资库存' }, { id: 407, name: '人员管理' }, { id: 408, name: '采收管理' }, { id: 409, name: '采收产量统计' }] },
  { id: 500, name: 'AI数据分析', children: [{ id: 501, name: '数据分析总览' }, { id: 502, name: '作物长势分析' }, { id: 503, name: '病虫害分析' }, { id: 504, name: '气象与灾害预警' }, { id: 505, name: '报表中心' }] },
  { id: 600, name: '农产品溯源', children: [{ id: 601, name: '溯源批次管理' }, { id: 602, name: '溯源信息编辑' }, { id: 603, name: '扫码预览' }, { id: 604, name: '农残检测报告' }, { id: 605, name: '溯源查询统计' }] },
  { id: 700, name: '产销对接', children: [{ id: 701, name: '产品上架' }, { id: 702, name: '销售订单' }, { id: 703, name: '销售统计' }, { id: 704, name: '客户档案' }] },
  { id: 800, name: '系统设置', children: [{ id: 801, name: '系统参数' }, { id: 802, name: '字典管理' }, { id: 803, name: '日志审计' }, { id: 804, name: '文件资源' }, { id: 805, name: '租户/园区管理' }, { id: 806, name: '接口配置' }] },
]

/* ---------- 气象数据 ---------- */
export const weather = {
  city: '武汉市', date: new Date(NOW).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }),
  temp: 19, cond: '多云', humidity: 58, wind: '东南风 3级', aqi: 62,
  forecast: ['小雨转阴', '多云', '晴', '多云转小雨', '阴', '多云', '晴'].map((c, i) => ({
    day: i === 0 ? '今天' : `周${'日一二三四五六'[(new Date(NOW).getDay() + i) % 7]}`, cond: c,
    tMax: rint(16, 24), tMin: rint(6, 13), icon: c.includes('雨') ? 'rain' : c.includes('晴') ? 'sunny' : 'cloudy',
  })),
  warnings: [{ level: '蓝色', type: '霜冻', content: '预计明天夜间最低气温将降至 1℃，请注意防范霜冻对露天作物的影响。', publish: '武汉市气象台' }],
}
// 预报与实况/预警自洽：今日最高温不低于当前气温；明日最低温与霜冻预警的 1℃ 一致
weather.forecast[0].tMax = Math.max(weather.forecast[0].tMax, weather.temp + 1)
weather.forecast[1].tMin = 1

/* ---------- 长势 / 病虫害 AI ---------- */
// 生育期与亩产按作物区分（水稻亩产 5000kg+ 明显超纲）
const STAGE_BY_CROP = {
  水稻: ['苗期', '分蘖期', '拔节期', '抽穗期', '成熟期'],
  小麦: ['苗期', '分蘖期', '拔节期', '灌浆期', '成熟期'],
  柑橘: ['幼果期', '果实膨大期', '转色期', '成熟期'],
  生菜: ['出苗期', '成苗期', '莲座期', '结球期'],
}
const YIELD_RANGE = {
  番茄: [3000, 5500], 黄瓜: [3500, 6000], 生菜: [1200, 2400], 草莓: [1500, 2600],
  水稻: [520, 750], 小麦: [380, 620], 柑橘: [2200, 3600], 辣椒: [2000, 3500], 西兰花: [800, 1500],
}
export const growthAnalysis = plots.filter((p) => ['设施大棚', '大田', '果园'].includes(p.type)).map((p, i) => {
  const score = rint(72, 96)
  const range = YIELD_RANGE[p.crop] || [1000, 3000]
  return {
    id: i + 1, plotName: p.name, crop: p.crop,
    stage: pick(STAGE_BY_CROP[p.crop] || ['苗期', '开花期', '结果期', '成熟期']),
    score, level: score > 88 ? '优' : score > 78 ? '良' : '中',
    maturity: rint(5, 30), yieldEst: rint(range[0], range[1]), yieldUnit: 'kg/亩',
    ndvi: rfloat(0.42, 0.86, 2), compare: rfloat(-8, 12, 1), updatedAt: fmt(NOW - rint(1, 72) * 3600000),
  }
})
// 病虫害只在陆地种植地块发生，且病害种类与寄主作物对应（"黄瓜霜霉病"不会长在柑橘/鱼塘上）
const PEST_POOL = {
  番茄: ['番茄晚疫病', '灰霉病', '白粉虱', '蚜虫'],
  黄瓜: ['黄瓜霜霉病', '白粉虱', '蚜虫'],
  生菜: ['蚜虫', '菜青虫', '叶斑病'],
  柑橘: ['红蜘蛛', '蚜虫', '叶斑病'],
}
export const pestRecords = Array.from({ length: 12 }, (_, i) => {
  const plot = pick(plots.filter((p) => ['设施大棚', '果园'].includes(p.type)))
  const pest = pick(PEST_POOL[plot.crop] || PESTS)
  const conf = rint(72, 98)
  return {
    id: i + 1, time: fmt(NOW - i * 86400000 * 2), plotName: plot.name, crop: plot.crop, pest,
    level: rand() > 0.45 ? '轻度' : '中度', conf, source: pick(['AI摄像头识别', '人工上报', '无人机巡检']),
    image: 1, suggestion: pick(['建议喷施吡虫啉 800 倍液，连续 2 次', '加强通风降湿，喷施多菌灵防治', '释放天敌丽蚜小蜂，物理黄板诱杀', '清园处理，剪除病枝并带出棚外销毁']),
    status: i % 3 === 0 ? '待处理' : '已处理',
  }
})

/* ---------- 采集参数配置 ---------- */
export const collectConfig = {
  defaultInterval: 300, retentionDays: 365, filterRule: '3σ去噪 + 中值滤波', anomalyPolicy: '标记并告警',
  devices: devices.filter((d) => d.type === 'sensor').slice(0, 12).map((d, i) => ({
    id: d.id, code: d.code, name: d.name, interval: [60, 300, 600, 1800][i % 4], enabled: i % 5 !== 4, status: d.status,
  })),
}
