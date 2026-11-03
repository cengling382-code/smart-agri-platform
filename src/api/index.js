import { request } from './request'

/* ================= 认证 ================= */
export const authApi = {
  login: (data) => request({ url: '/auth/login', method: 'post', data }),
  register: (data) => request({ url: '/auth/register', method: 'post', data }),
  getProfile: () => request({ url: '/auth/userinfo', method: 'get' }),
  updateProfile: (data) => request({ url: '/auth/profile', method: 'put', data }),
  changePassword: (data) => request({ url: '/auth/password', method: 'put', data }),
}

/* ================= 数据面板 ================= */
export const statsApi = {
  dashboard: () => request({ url: '/stats/dashboard', method: 'get' }),
}

/* ================= 地块 ================= */
export const plotApi = {
  page: (params) => request({ url: '/plots', method: 'get', params }),
  all: () => request({ url: '/plots/all', method: 'get' }),
  create: (data) => request({ url: '/plots', method: 'post', data }),
  update: (id, data) => request({ url: `/plots/${id}`, method: 'put', data }),
  remove: (id) => request({ url: `/plots/${id}`, method: 'delete' }),
}

/* ================= 设备 ================= */
export const deviceApi = {
  page: (params) => request({ url: '/devices', method: 'get', params }),
  all: () => request({ url: '/devices/all', method: 'get' }),
  detail: (id) => request({ url: `/devices/${id}`, method: 'get' }),
  series: (id, param, points = 48) => request({ url: `/devices/${id}/series`, method: 'get', params: { param, points } }),
  logs: (id) => request({ url: `/devices/${id}/logs`, method: 'get' }),
  create: (data) => request({ url: '/devices', method: 'post', data }),
  update: (id, data) => request({ url: `/devices/${id}`, method: 'put', data }),
  remove: (id) => request({ url: `/devices/${id}`, method: 'delete' }),
  control: (id, data) => request({ url: `/devices/${id}/control`, method: 'post', data }),
}

/* ================= 告警 ================= */
export const alarmApi = {
  page: (params) => request({ url: '/alarms', method: 'get', params }),
  stats: () => request({ url: '/alarms/stats', method: 'get' }),
  update: (id, data) => request({ url: `/alarms/${id}`, method: 'put', data }),
  batch: (ids, status) => request({ url: '/alarms/batch/status', method: 'put', data: { ids, status } }),
}

/* ================= 策略/任务 ================= */
export const strategyApi = {
  page: (params) => request({ url: '/strategies', method: 'get', params }),
  create: (data) => request({ url: '/strategies', method: 'post', data }),
  update: (id, data) => request({ url: `/strategies/${id}`, method: 'put', data }),
  remove: (id) => request({ url: `/strategies/${id}`, method: 'delete' }),
}
export const taskApi = {
  list: () => request({ url: '/tasks', method: 'get' }),
  create: (data) => request({ url: '/tasks', method: 'post', data }),
  update: (id, data) => request({ url: `/tasks/${id}`, method: 'put', data }),
  remove: (id) => request({ url: `/tasks/${id}`, method: 'delete' }),
}
export const controlApi = {
  logs: (params) => request({ url: '/control-logs', method: 'get', params }),
  collectConfig: () => request({ url: '/collect-config', method: 'get' }),
  saveCollect: (data) => request({ url: '/collect-config', method: 'put', data }),
}

/* ================= 农事 ================= */
export const farmApi = {
  planPage: (params) => request({ url: '/farm-plans', method: 'get', params }),
  createPlan: (data) => request({ url: '/farm-plans', method: 'post', data }),
  updatePlan: (id, data) => request({ url: `/farm-plans/${id}`, method: 'put', data }),
  removePlan: (id) => request({ url: `/farm-plans/${id}`, method: 'delete' }),
  orderPage: (params) => request({ url: '/work-orders', method: 'get', params }),
  createOrder: (data) => request({ url: '/work-orders', method: 'post', data }),
  updateOrder: (id, data) => request({ url: `/work-orders/${id}`, method: 'put', data }),
  removeOrder: (id) => request({ url: `/work-orders/${id}`, method: 'delete' }),
  ledger: (params) => request({ url: '/ledger', method: 'get', params }),
  materialPage: (params) => request({ url: '/materials', method: 'get', params }),
  createMaterial: (data) => request({ url: '/materials', method: 'post', data }),
  updateMaterial: (id, data) => request({ url: `/materials/${id}`, method: 'put', data }),
  removeMaterial: (id) => request({ url: `/materials/${id}`, method: 'delete' }),
  stockPage: (params) => request({ url: '/stock-records', method: 'get', params }),
  createStock: (data) => request({ url: '/stock-records', method: 'post', data }),
  inventory: (params) => request({ url: '/inventory', method: 'get', params }),
  personnel: (params) => request({ url: '/personnel', method: 'get', params }),
  harvestPage: (params) => request({ url: '/harvests', method: 'get', params }),
  createHarvest: (data) => request({ url: '/harvests', method: 'post', data }),
  updateHarvest: (id, data) => request({ url: `/harvests/${id}`, method: 'put', data }),
  harvestStats: () => request({ url: '/harvest-stats', method: 'get' }),
}

/* ================= 溯源 ================= */
export const traceApi = {
  page: (params) => request({ url: '/trace-batches', method: 'get', params }),
  create: (data) => request({ url: '/trace-batches', method: 'post', data }),
  update: (id, data) => request({ url: `/trace-batches/${id}`, method: 'put', data }),
  residuePage: (params) => request({ url: '/residue-reports', method: 'get', params }),
  createResidue: (data) => request({ url: '/residue-reports', method: 'post', data }),
  updateResidue: (id, data) => request({ url: `/residue-reports/${id}`, method: 'put', data }),
  stats: () => request({ url: '/trace/stats', method: 'get' }),
  publicDetail: (code) => request({ url: `/trace/public/${code}`, method: 'get' }),
}

/* ================= 产销 ================= */
export const tradeApi = {
  productPage: (params) => request({ url: '/products', method: 'get', params }),
  createProduct: (data) => request({ url: '/products', method: 'post', data }),
  updateProduct: (id, data) => request({ url: `/products/${id}`, method: 'put', data }),
  removeProduct: (id) => request({ url: `/products/${id}`, method: 'delete' }),
  orderPage: (params) => request({ url: '/sales-orders', method: 'get', params }),
  updateOrder: (id, data) => request({ url: `/sales-orders/${id}`, method: 'put', data }),
  customers: (params) => request({ url: '/customers', method: 'get', params }),
  stats: () => request({ url: '/sales-stats', method: 'get' }),
}

/* ================= AI ================= */
export const aiApi = {
  weather: () => request({ url: '/weather', method: 'get' }),
  growth: () => request({ url: '/growth', method: 'get' }),
  pests: (params) => request({ url: '/pests', method: 'get', params }),
  updatePest: (id, data) => request({ url: `/pests/${id}`, method: 'put', data }),
  reports: () => request({ url: '/reports', method: 'get' }),
}

/* ================= 系统 ================= */
export const sysApi = {
  dicts: () => request({ url: '/dicts', method: 'get' }),
  addDictItem: (type, data) => request({ url: `/dicts/${type}/items`, method: 'post', data }),
  updateDictItem: (type, id, data) => request({ url: `/dicts/${type}/items/${id}`, method: 'put', data }),
  removeDictItem: (type, id) => request({ url: `/dicts/${type}/items/${id}`, method: 'delete' }),
  params: () => request({ url: '/params', method: 'get' }),
  updateParam: (id, data) => request({ url: `/params/${id}`, method: 'put', data }),
  logs: (params) => request({ url: '/logs', method: 'get', params }),
  files: (params) => request({ url: '/files', method: 'get', params }),
  removeFile: (id) => request({ url: `/files/${id}`, method: 'delete' }),
  tenants: (params) => request({ url: '/tenants', method: 'get', params }),
  updateTenant: (id, data) => request({ url: `/tenants/${id}`, method: 'put', data }),
  apiConfigs: () => request({ url: '/api-configs', method: 'get' }),
  updateApiConfig: (id, data) => request({ url: `/api-configs/${id}`, method: 'put', data }),
  userPage: (params) => request({ url: '/users', method: 'get', params }),
  createUser: (data) => request({ url: '/users', method: 'post', data }),
  updateUser: (id, data) => request({ url: `/users/${id}`, method: 'put', data }),
  removeUser: (id) => request({ url: `/users/${id}`, method: 'delete' }),
  rolePage: (params) => request({ url: '/roles', method: 'get', params }),
  allRoles: () => request({ url: '/roles/all', method: 'get' }),
  createRole: (data) => request({ url: '/roles', method: 'post', data }),
  updateRole: (id, data) => request({ url: `/roles/${id}`, method: 'put', data }),
  removeRole: (id) => request({ url: `/roles/${id}`, method: 'delete' }),
  menuTree: () => request({ url: '/menus', method: 'get' }),
  createMenu: (data) => request({ url: '/menus', method: 'post', data }),
  updateMenu: (id, data) => request({ url: `/menus/${id}`, method: 'put', data }),
  removeMenu: (id) => request({ url: `/menus/${id}`, method: 'delete' }),
}
