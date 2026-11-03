/* ============================================================
 * 侧边菜单树（RBAC：roles 为空 = 所有登录角色可见）
 * ============================================================ */
export const menuGroups = [
  {
    key: 'dashboard', title: '数据面板', icon: 'Odometer', roles: ['admin', 'manager', 'tech', 'farmer', 'regulator'],
    children: [
      { route: 'Workbench', title: '工作台首页', roles: ['admin', 'manager', 'tech', 'farmer', 'regulator'] },
    ],
  },
  {
    key: 'iot', title: '物联网监测', icon: 'Cpu', roles: ['admin', 'manager', 'tech', 'farmer'],
    children: [
      { route: 'DeviceOverview', title: '设备总览', roles: ['admin', 'manager', 'tech'] },
      { route: 'SensorMonitor', title: '数据监测', roles: ['admin', 'manager', 'tech'] },
      { route: 'VideoMonitor', title: '视频监控', roles: ['admin', 'manager', 'tech', 'farmer'] },
      { route: 'StrategyConfig', title: '策略联动', roles: ['admin', 'manager', 'tech'] },
      { route: 'DeviceControl', title: '设备控制', roles: ['admin', 'manager', 'tech', 'farmer'] },
      { route: 'AlarmList', title: '告警列表', roles: ['admin', 'manager', 'tech', 'farmer'] },
      { route: 'AlarmStats', title: '告警统计', roles: ['admin', 'manager'] },
      { route: 'CollectConfig', title: '采集参数', roles: ['admin', 'tech'] },
      { route: 'GatewayManage', title: '网关管理', roles: ['admin', 'tech'] },
    ],
  },
  {
    key: 'gis', title: 'GIS 地理信息', icon: 'LocationInformation', roles: ['admin', 'manager', 'tech'],
    children: [
      { route: 'GisMap', title: '园区地图', roles: ['admin', 'manager', 'tech'] },
      { route: 'PlotArchive', title: '地块档案', roles: ['admin', 'manager', 'tech'] },
      { route: 'LayerManage', title: '图层管理', roles: ['admin', 'manager'] },
    ],
  },
  {
    key: 'farm', title: '农事生产', icon: 'Cherry', roles: ['admin', 'manager', 'tech', 'farmer'],
    children: [
      { route: 'FarmPlan', title: '农事计划', roles: ['admin', 'manager', 'tech'] },
      { route: 'WorkOrder', title: '农事工单', roles: ['admin', 'manager', 'tech', 'farmer'] },
      { route: 'FarmLedger', title: '农事台账', roles: ['admin', 'manager', 'tech'] },
      { route: 'MaterialArchive', title: '农资档案', roles: ['admin', 'manager', 'tech'] },
      { route: 'StockRecord', title: '出入库单', roles: ['admin', 'manager', 'tech'] },
      { route: 'MaterialInventory', title: '库存列表', roles: ['admin', 'manager', 'tech'] },
      { route: 'Personnel', title: '人员管理', roles: ['admin', 'manager'] },
      { route: 'HarvestManage', title: '采收管理', roles: ['admin', 'manager', 'tech', 'farmer'] },
      { route: 'HarvestStats', title: '产量统计', roles: ['admin', 'manager', 'tech'] },
    ],
  },
  {
    key: 'ai', title: 'AI 分析报表', icon: 'DataAnalysis', roles: ['admin', 'manager', 'tech', 'regulator'],
    children: [
      { route: 'AiOverview', title: '数据分析总览', roles: ['admin', 'manager', 'tech'] },
      { route: 'CropGrowth', title: '作物长势', roles: ['admin', 'manager', 'tech'] },
      { route: 'PestAnalysis', title: '病虫害分析', roles: ['admin', 'manager', 'tech'] },
      { route: 'WeatherWarning', title: '气象预警', roles: ['admin', 'manager', 'tech'] },
      { route: 'ReportCenter', title: '报表中心', roles: ['admin', 'manager', 'tech', 'regulator'] },
    ],
  },
  {
    key: 'trace', title: '农产品溯源', icon: 'Postcard', roles: ['admin', 'manager', 'tech', 'regulator'],
    children: [
      { route: 'TraceBatch', title: '溯源批次', roles: ['admin', 'manager', 'tech', 'regulator'] },
      { route: 'TracePreview', title: '扫码预览', roles: ['admin', 'manager', 'tech', 'regulator'] },
      { route: 'ResidueReport', title: '农残检测', roles: ['admin', 'manager', 'tech', 'regulator'] },
      { route: 'TraceStats', title: '查询统计', roles: ['admin', 'manager', 'regulator'] },
    ],
  },
  {
    key: 'trade', title: '产销对接', icon: 'ShoppingCart', roles: ['admin', 'manager'],
    children: [
      { route: 'ProductManage', title: '产品上架', roles: ['admin', 'manager'] },
      { route: 'SalesOrder', title: '销售订单', roles: ['admin', 'manager'] },
      { route: 'SalesStats', title: '销售统计', roles: ['admin', 'manager'] },
      { route: 'CustomerArchive', title: '客户档案', roles: ['admin', 'manager'] },
    ],
  },
  {
    key: 'system', title: '系统设置', icon: 'Setting', roles: ['admin', 'manager'],
    children: [
      { route: 'UserList', title: '用户管理', roles: ['admin'] },
      { route: 'RoleManage', title: '角色管理', roles: ['admin'] },
      { route: 'RolePerm', title: '角色权限配置', roles: ['admin'] },
      { route: 'MenuManage', title: '菜单权限', roles: ['admin'] },
      { route: 'SysParams', title: '系统参数', roles: ['admin', 'manager'] },
      { route: 'DictManage', title: '字典管理', roles: ['admin'] },
      { route: 'LogAudit', title: '日志审计', roles: ['admin', 'manager'] },
      { route: 'FileResource', title: '文件资源', roles: ['admin', 'manager'] },
      { route: 'TenantManage', title: '租户/园区', roles: ['admin'] },
      { route: 'ApiConfig', title: '接口配置', roles: ['admin'] },
    ],
  },
  {
    key: 'screen', title: '指挥中心大屏', icon: 'Monitor', roles: ['admin', 'manager'],
    children: [
      { route: 'ScreenOverview', title: '总览大屏', roles: ['admin', 'manager'] },
      { route: 'ScreenEnv', title: '环境监测大屏', roles: ['admin', 'manager'] },
      { route: 'ScreenFarm', title: '农事采收大屏', roles: ['admin', 'manager'] },
      { route: 'ScreenDevice', title: '设备运维大屏', roles: ['admin', 'manager'] },
    ],
  },
]

/** 角色是否有权访问某个路由 meta */
export function hasRoutePermission(roles, meta) {
  if (!meta?.roles || meta.roles.length === 0) return true
  return roles.some((r) => meta.roles.includes(r))
}
