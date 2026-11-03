import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasRoutePermission } from './menus'
import { installRouterErrorHandler } from '@/utils/routerError'
// 静态导入：降级页打进主包，自身永远不会加载失败
import RouteError from '@/views/error/RouteError.vue'

/**
 * 路由表：对应《前端页面清单》69 个页面
 * meta.public  = 免登录
 * meta.roles   = RBAC 角色白名单（空 = 全部角色）
 * meta.layout  = 布局（默认 AdminLayout）
 */
const routes = [
  /* ---------- 公开页面 ---------- */
  { path: '/login', name: 'Login', component: () => import('@/views/login/LoginView.vue'), meta: { title: '登录', public: true, hideTag: true } },
  { path: '/register', name: 'Register', component: () => import('@/views/login/RegisterView.vue'), meta: { title: '注册', public: true, hideTag: true } },
  { path: '/forgot', name: 'Forgot', component: () => import('@/views/login/ForgotView.vue'), meta: { title: '找回密码', public: true, hideTag: true } },
  { path: '/403', name: 'Forbidden', component: () => import('@/views/error/Forbidden.vue'), meta: { title: '无权限访问', public: true, hideTag: true } },
  // 路由级降级页：动态资源加载失败且站内无可用页面时的最终兜底（静态打包，必可达）
  { path: '/route-error', name: 'RouteError', component: RouteError, meta: { title: '页面加载失败', public: true, hideTag: true } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/error/NotFound.vue'), meta: { title: '页面不存在', public: true, hideTag: true } },

  /* ---------- 消费者溯源（公开） ---------- */
  { path: '/scan/:code', name: 'ScanLoading', component: () => import('@/views/trace-public/ScanLoading.vue'), meta: { title: '溯源加载', public: true, layout: 'TraceLayout' } },
  { path: '/trace/:code', name: 'TraceDetail', component: () => import('@/views/trace-public/TraceDetail.vue'), meta: { title: '溯源详情', public: true, layout: 'TraceLayout' } },

  /* ---------- 管理端 ---------- */
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      // 数据面板
      { path: 'dashboard', name: 'Workbench', component: () => import('@/views/dashboard/Workbench.vue'), meta: { title: '工作台首页', icon: 'Odometer' } },
      // 个人中心
      { path: 'profile', name: 'Profile', component: () => import('@/views/profile/ProfileView.vue'), meta: { title: '基本资料', icon: 'User' } },
      { path: 'profile/password', name: 'Password', component: () => import('@/views/profile/PasswordView.vue'), meta: { title: '修改密码', icon: 'Key' } },
      // 物联网监测
      { path: 'iot/devices', name: 'DeviceOverview', component: () => import('@/views/iot/DeviceOverview.vue'), meta: { title: '设备总览', icon: 'Monitor', roles: ['admin', 'manager', 'tech'] } },
      { path: 'iot/devices/:id', name: 'DeviceDetail', component: () => import('@/views/iot/DeviceDetail.vue'), meta: { title: '设备详情', roles: ['admin', 'manager', 'tech'], hideTag: true } },
      { path: 'iot/sensors', name: 'SensorMonitor', component: () => import('@/views/iot/SensorMonitor.vue'), meta: { title: '数据监测', icon: 'TrendCharts', roles: ['admin', 'manager', 'tech'] } },
      { path: 'iot/video', name: 'VideoMonitor', component: () => import('@/views/iot/VideoMonitor.vue'), meta: { title: '视频监控', icon: 'VideoCamera', roles: ['admin', 'manager', 'tech', 'farmer'] } },
      { path: 'iot/strategies', name: 'StrategyConfig', component: () => import('@/views/iot/StrategyConfig.vue'), meta: { title: '策略联动', icon: 'Connection', roles: ['admin', 'manager', 'tech'] } },
      { path: 'iot/control', name: 'DeviceControl', component: () => import('@/views/iot/DeviceControl.vue'), meta: { title: '设备控制', icon: 'SwitchButton', roles: ['admin', 'manager', 'tech', 'farmer'] } },
      { path: 'iot/alarms', name: 'AlarmList', component: () => import('@/views/iot/AlarmList.vue'), meta: { title: '告警列表', icon: 'Bell', roles: ['admin', 'manager', 'tech', 'farmer'] } },
      { path: 'iot/alarm-stats', name: 'AlarmStats', component: () => import('@/views/iot/AlarmStats.vue'), meta: { title: '告警统计', icon: 'Histogram', roles: ['admin', 'manager'] } },
      { path: 'iot/collect', name: 'CollectConfig', component: () => import('@/views/iot/CollectConfig.vue'), meta: { title: '采集参数', icon: 'Stopwatch', roles: ['admin', 'tech'] } },
      { path: 'iot/gateways', name: 'GatewayManage', component: () => import('@/views/iot/GatewayManage.vue'), meta: { title: '网关管理', icon: 'Link', roles: ['admin', 'tech'] } },
      // GIS
      { path: 'gis/map', name: 'GisMap', component: () => import('@/views/gis/GisMap.vue'), meta: { title: '园区地图', icon: 'MapLocation', roles: ['admin', 'manager', 'tech'] } },
      { path: 'gis/plots', name: 'PlotArchive', component: () => import('@/views/gis/PlotArchive.vue'), meta: { title: '地块档案', icon: 'Place', roles: ['admin', 'manager', 'tech'] } },
      { path: 'gis/layers', name: 'LayerManage', component: () => import('@/views/gis/LayerManage.vue'), meta: { title: '图层管理', icon: 'Grid', roles: ['admin', 'manager'] } },
      // 农事生产
      { path: 'farm/plans', name: 'FarmPlan', component: () => import('@/views/farm/FarmPlan.vue'), meta: { title: '农事计划', icon: 'Calendar', roles: ['admin', 'manager', 'tech'] } },
      { path: 'farm/orders', name: 'WorkOrder', component: () => import('@/views/farm/WorkOrder.vue'), meta: { title: '农事工单', icon: 'Tickets', roles: ['admin', 'manager', 'tech', 'farmer'] } },
      { path: 'farm/ledger', name: 'FarmLedger', component: () => import('@/views/farm/FarmLedger.vue'), meta: { title: '农事台账', icon: 'Notebook', roles: ['admin', 'manager', 'tech'] } },
      { path: 'farm/materials', name: 'MaterialArchive', component: () => import('@/views/farm/MaterialArchive.vue'), meta: { title: '农资档案', icon: 'Box', roles: ['admin', 'manager', 'tech'] } },
      { path: 'farm/stock', name: 'StockRecord', component: () => import('@/views/farm/StockRecord.vue'), meta: { title: '出入库单', icon: 'Sort', roles: ['admin', 'manager', 'tech'] } },
      { path: 'farm/inventory', name: 'MaterialInventory', component: () => import('@/views/farm/MaterialInventory.vue'), meta: { title: '库存列表', icon: 'Coin', roles: ['admin', 'manager', 'tech'] } },
      { path: 'farm/personnel', name: 'Personnel', component: () => import('@/views/farm/Personnel.vue'), meta: { title: '人员管理', icon: 'UserFilled', roles: ['admin', 'manager'] } },
      { path: 'farm/harvest', name: 'HarvestManage', component: () => import('@/views/farm/HarvestManage.vue'), meta: { title: '采收管理', icon: 'Apple', roles: ['admin', 'manager', 'tech', 'farmer'] } },
      { path: 'farm/harvest-stats', name: 'HarvestStats', component: () => import('@/views/farm/HarvestStats.vue'), meta: { title: '产量统计', icon: 'TrophyBase', roles: ['admin', 'manager', 'tech'] } },
      // AI 分析
      { path: 'ai/overview', name: 'AiOverview', component: () => import('@/views/ai/AiOverview.vue'), meta: { title: '数据分析总览', icon: 'DataBoard', roles: ['admin', 'manager', 'tech'] } },
      { path: 'ai/crop', name: 'CropGrowth', component: () => import('@/views/ai/CropGrowth.vue'), meta: { title: '作物长势', icon: 'Sunny', roles: ['admin', 'manager', 'tech'] } },
      { path: 'ai/pest', name: 'PestAnalysis', component: () => import('@/views/ai/PestAnalysis.vue'), meta: { title: '病虫害分析', icon: 'WarningFilled', roles: ['admin', 'manager', 'tech'] } },
      { path: 'ai/weather', name: 'WeatherWarning', component: () => import('@/views/ai/WeatherWarning.vue'), meta: { title: '气象预警', icon: 'Cloudy', roles: ['admin', 'manager', 'tech'] } },
      { path: 'ai/reports', name: 'ReportCenter', component: () => import('@/views/ai/ReportCenter.vue'), meta: { title: '报表中心', icon: 'Document', roles: ['admin', 'manager', 'tech', 'regulator'] } },
      // 溯源
      { path: 'trace/batches', name: 'TraceBatch', component: () => import('@/views/trace/TraceBatch.vue'), meta: { title: '溯源批次', icon: 'Postcard', roles: ['admin', 'manager', 'tech', 'regulator'] } },
      { path: 'trace/batches/info/:id', name: 'TraceInfoEdit', component: () => import('@/views/trace/TraceInfoEdit.vue'), meta: { title: '溯源信息编辑', roles: ['admin', 'manager', 'tech'], hideTag: true } },
      { path: 'trace/preview', name: 'TracePreview', component: () => import('@/views/trace/TracePreview.vue'), meta: { title: '扫码预览', icon: 'Iphone', roles: ['admin', 'manager', 'tech', 'regulator'] } },
      { path: 'trace/residue', name: 'ResidueReport', component: () => import('@/views/trace/ResidueReport.vue'), meta: { title: '农残检测', icon: 'Files', roles: ['admin', 'manager', 'tech', 'regulator'] } },
      { path: 'trace/stats', name: 'TraceStats', component: () => import('@/views/trace/TraceStats.vue'), meta: { title: '查询统计', icon: 'DataLine', roles: ['admin', 'manager', 'regulator'] } },
      // 产销对接
      { path: 'trade/products', name: 'ProductManage', component: () => import('@/views/trade/ProductManage.vue'), meta: { title: '产品上架', icon: 'Goods', roles: ['admin', 'manager'] } },
      { path: 'trade/orders', name: 'SalesOrder', component: () => import('@/views/trade/SalesOrder.vue'), meta: { title: '销售订单', icon: 'List', roles: ['admin', 'manager'] } },
      { path: 'trade/stats', name: 'SalesStats', component: () => import('@/views/trade/SalesStats.vue'), meta: { title: '销售统计', icon: 'PieChart', roles: ['admin', 'manager'] } },
      { path: 'trade/customers', name: 'CustomerArchive', component: () => import('@/views/trade/CustomerArchive.vue'), meta: { title: '客户档案', icon: 'Avatar', roles: ['admin', 'manager'] } },
      // 系统设置
      { path: 'system/users', name: 'UserList', component: () => import('@/views/system/UserList.vue'), meta: { title: '用户管理', icon: 'UserFilled', roles: ['admin'] } },
      { path: 'system/roles', name: 'RoleManage', component: () => import('@/views/system/RoleManage.vue'), meta: { title: '角色管理', icon: 'Stamp', roles: ['admin'] } },
      { path: 'system/role-perm', name: 'RolePerm', component: () => import('@/views/system/RolePerm.vue'), meta: { title: '角色权限配置', icon: 'Lock', roles: ['admin'] } },
      { path: 'system/menus', name: 'MenuManage', component: () => import('@/views/system/MenuManage.vue'), meta: { title: '菜单权限', icon: 'Menu', roles: ['admin'] } },
      { path: 'system/params', name: 'SysParams', component: () => import('@/views/system/SysParams.vue'), meta: { title: '系统参数', icon: 'Tools', roles: ['admin', 'manager'] } },
      { path: 'system/dicts', name: 'DictManage', component: () => import('@/views/system/DictManage.vue'), meta: { title: '字典管理', icon: 'Collection', roles: ['admin'] } },
      { path: 'system/logs', name: 'LogAudit', component: () => import('@/views/system/LogAudit.vue'), meta: { title: '日志审计', icon: 'Document', roles: ['admin', 'manager'] } },
      { path: 'system/files', name: 'FileResource', component: () => import('@/views/system/FileResource.vue'), meta: { title: '文件资源', icon: 'FolderOpened', roles: ['admin', 'manager'] } },
      { path: 'system/tenants', name: 'TenantManage', component: () => import('@/views/system/TenantManage.vue'), meta: { title: '租户/园区', icon: 'OfficeBuilding', roles: ['admin'] } },
      { path: 'system/apis', name: 'ApiConfig', component: () => import('@/views/system/ApiConfig.vue'), meta: { title: '接口配置', icon: 'SetUp', roles: ['admin'] } },
    ],
  },

  /* ---------- 指挥中心大屏 ---------- */
  {
    path: '/screens',
    component: () => import('@/layouts/ScreenLayout.vue'),
    children: [
      { path: 'overview', name: 'ScreenOverview', component: () => import('@/views/screens/ScreenOverview.vue'), meta: { title: '智慧农业总览大屏', layout: 'ScreenLayout' } },
      { path: 'env', name: 'ScreenEnv', component: () => import('@/views/screens/ScreenEnv.vue'), meta: { title: '环境监测大屏', layout: 'ScreenLayout' } },
      { path: 'farm', name: 'ScreenFarm', component: () => import('@/views/screens/ScreenFarm.vue'), meta: { title: '农事采收大屏', layout: 'ScreenLayout' } },
      { path: 'device', name: 'ScreenDevice', component: () => import('@/views/screens/ScreenDevice.vue'), meta: { title: '设备运维大屏', layout: 'ScreenLayout' } },
    ],
  },

  /* ---------- 移动端 ---------- */
  {
    path: '/m',
    component: () => import('@/layouts/MobileLayout.vue'),
    children: [
      { path: 'login', name: 'MobileLogin', component: () => import('@/views/mobile/MobileLogin.vue'), meta: { title: '移动端登录', public: true } },
      { path: 'home', name: 'MobileHome', component: () => import('@/views/mobile/MobileHome.vue'), meta: { title: '移动工作台' } },
      { path: 'env', name: 'MobileEnv', component: () => import('@/views/mobile/MobileEnv.vue'), meta: { title: '实时环境数据' } },
      { path: 'video', name: 'MobileVideo', component: () => import('@/views/mobile/MobileVideo.vue'), meta: { title: '视频预览' } },
      { path: 'control', name: 'MobileControl', component: () => import('@/views/mobile/MobileControl.vue'), meta: { title: '设备远程控制' } },
      { path: 'alarms', name: 'MobileAlarms', component: () => import('@/views/mobile/MobileAlarms.vue'), meta: { title: '告警消息' } },
      { path: 'orders', name: 'MobileOrders', component: () => import('@/views/mobile/MobileOrders.vue'), meta: { title: '工单执行' } },
      { path: 'plots', name: 'MobilePlots', component: () => import('@/views/mobile/MobilePlots.vue'), meta: { title: '地块信息' } },
      { path: 'harvest', name: 'MobileHarvest', component: () => import('@/views/mobile/MobileHarvest.vue'), meta: { title: '采收登记' } },
      { path: 'profile', name: 'MobileProfile', component: () => import('@/views/mobile/MobileProfile.vue'), meta: { title: '个人中心' } },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/** 免登录路径 */
const PUBLIC_PATHS = new Set(['/login', '/register', '/forgot', '/403', '/m/login'])

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isPublic = to.meta.public || PUBLIC_PATHS.has(to.path) || to.path.startsWith('/scan/') || to.path.startsWith('/trace/')
  if (!auth.isLoggedIn && !isPublic) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // 已登录访问登录页 → 回工作台
  if (auth.isLoggedIn && (to.path === '/login' || to.path === '/register' || to.path === '/forgot')) {
    return { path: '/dashboard' }
  }
  // RBAC：无权限菜单自动跳转 403
  if (auth.isLoggedIn && to.meta?.roles && !hasRoutePermission([auth.role], to.meta)) {
    return { path: '/403' }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 智慧农业综合管理平台` : '智慧农业综合管理平台'
})

// 路由级错误兜底：chunk 加载失败 / 导航异常 → 隔离在当前页或落到静态错误页
installRouterErrorHandler(router)

export default router
