# 本地 JSON 数据规范

本项目的所有业务数据、页面配置、内容素材与动态参数均来自 `data/` 目录下的独立 JSON 文件。
业务代码只允许硬编码「全局绝对固定的静态文案 / 结构性常量」（如按钮文字、路由路径、设计主题色），
任何会在页面展示或随业务变化的内容都必须落到 JSON。

---

## 1. 目录结构

```
data/
├─ manifest.json              # 数据清单：集合/单例/静态字典/页面配置 → 文件映射
├─ core/                      # 核心主数据
│  ├─ tenants.json            # 租户/园区
│  ├─ plots.json              # 地块
│  ├─ devices.json            # 设备
│  ├─ plotShapes.json         # 地块边界（单例）
│  └─ crops.json              # 作物字典（静态，只读）
├─ farm/                      # 农事
│  ├─ farmPlans.json  workOrders.json  ledgerRecords.json
│  ├─ materials.json  stockRecords.json  personnel.json  harvests.json
├─ iot/                       # 物联网
│  ├─ alarms.json  strategies.json  cronTasks.json  controlLogs.json
│  ├─ collectConfig.json（单例）  paramMeta.json（单例）
├─ trace/                     # 溯源
│  ├─ traceBatches.json  residueReports.json
├─ trade/                     # 产销
│  ├─ products.json  salesOrders.json  customers.json
├─ ai/                        # AI 分析
│  ├─ growthAnalysis.json  pestRecords.json  reports.json  weather.json（单例）
├─ system/                    # 系统管理
│  ├─ dictGroups.json  sysParams.json  logs.json  fileResources.json
│  ├─ roles.json  accountUsers.json  menuTree.json  apiConfigs.json
└─ config/                    # 页面配置
   ├─ constants.json          # 全局枚举与状态映射
   ├─ screens.json            # 数据大屏配置
   ├─ workbench.json          # 工作台配置
   └─ mobile.json             # 移动端配置
```

### 拆分原则

- 一个业务模块一个子目录，一个集合一个文件；
- 页面级配置按页面聚合成一个文件（`screens.json` / `workbench.json` / `mobile.json`），避免碎片化；
- 全局共享的枚举、状态映射、字典放 `config/constants.json`，禁止各页面重复维护；
- 只读字典（如作物清单）放 `core/crops.json`，不参与写回。

---

## 2. 文件格式（数据信封）

集合 / 单例 / 配置文件统一使用信封结构：

```json
{
  "_meta": {
    "collection": "plots",          // 集合键，与 manifest 一致
    "kind": "collection",           // collection | singleton | config | static
    "updatedAt": "2026-11-06T02:10:00.000Z",
    "count": 12                     // 集合为记录数，配置为顶层字段数
  },
  "data": []
}
```

- `data` 为真实业务内容，前端只读取 `data`；
- `_meta` 供运维排查与调试，前端不依赖其值参与业务计算；
- 标准 JSON 不支持注释，字段用途统一在本规范中说明（需求 5 的“注释说明”以本文档为准）。

### manifest.json

```json
{
  "_meta": { "version": 1, "description": "数据清单" },
  "version": 1,
  "savedAt": "2026-11-06T02:10:00.000Z",
  "seq": { "plots": 10000, "devices": 10000 },
  "collections": { "plots": { "file": "core/plots.json", "kind": "collection", "seqKey": "plots" } },
  "singletons": { "plotShapes": "core/plotShapes.json" },
  "statics": { "CROPS": "core/crops.json" },
  "configs": { "constants": "config/constants.json" }
}
```

- `seq`：各集合自增 id 游标，随写入一起持久化，避免刷新后 id 冲突；
- `collections/singletons/statics/configs`：白名单。服务端只允许写白名单内文件，杜绝路径穿越；
- `version/savedAt`：全局数据版本与最后写入时间，供前端判断是否需要重新渲染。

---

## 3. 命名与类型规范

| 项目 | 规则 |
| --- | --- |
| 文件名 | 小写 camelCase + `.json`（`farmPlans.json`）；单例同样 |
| 集合键 | 与文件名（去扩展名）一致；manifest 中的键必须唯一 |
| 字段名 | 小写 camelCase（`tenantId`、`areaMu`、`safeInterval`） |
| 布尔字段 | `isXxx` / `hasXxx` 或状态枚举，禁止 `"0"/"1"` 字符串 |
| 日期时间 | `YYYY-MM-DD` / `YYYY-MM-DD HH:mm:ss` 字符串；时间戳用 `savedAt`（ISO 8601） |
| 金额 / 面积 / 数量 | number，不带单位；单位由配置或表头声明 |
| 枚举 | 中文业务值直接存中文（便于展示与筛选）；英文 key 仅用于系统内部状态 |
| id | number，全局唯一；新增由 `seq` 自增，禁止前端写死 |
| 空值 | 使用 `null`，禁止空字符串表达“无数据” |
| 嵌套 | 层级不超过 3 层；大数组不嵌套大数组 |

### 集合记录通用字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 主键，自增 |
| `code` | string | 业务编号（地块/工单/批次等可选） |
| `name` | string | 展示名称 |
| `status` | string | 业务状态，取值见 `constants.json` |
| `createdAt` / `updatedAt` | string | 创建/更新时间（可选） |

---

## 4. 配置字段说明

### 4.1 `config/constants.json`

| 字段 | 用途 |
| --- | --- |
| `cropNames` | 作物字典，地块/产品表单与筛选使用 |
| `plotTypes` / `plotTypeColors` / `plotTypeFills` | 地块类型及 GIS/大屏配色 |
| `plotStatuses` | 地块状态筛选项 |
| `farmTypes` / `farmTypeTag` / `farmTypeColors` | 农事类型、标签色与图表色 |
| `farmPlanStatuses` / `workOrderStatuses` | 计划/工单状态筛选项 |
| `workerNames` | 工单负责人候选 |
| `grades` / `qualities` | 采收等级与品质 |
| `materialCategories` / `suppliers` / `materialCatMeta` | 农资分类、供应商与图标配色 |
| `pesticideSafeInterval` | 农药安全间隔期兜底值（天），按药剂名匹配 |
| `personnelSkills` / `personnelRoles` / `personnelStatusOptions` | 人员技能、角色、在岗状态 |
| `alarmTypes` / `alarmLevels` / `alarmStatusMap` | 告警类型、级别样式、处置状态 |
| `deviceTypeMeta` / `deviceStatusMap` / `deviceGroupOptions` | 设备类型、状态、分组 |
| `deviceParamLabels` | 传感器参数中文名与单位 |
| `sensorParams` | 监测页参数卡（key/label/unit/icon/color） |
| `strategyParams` / `strategyTriggerMeta` | 策略参数选项与触发方式样式 |
| `actuatorIcons` | 执行器图标映射 |
| `collectIntervals` / `collectFilters` / `collectAnomalyPolicies` | 采集频率、过滤与异常策略 |
| `reportGenTypes` / `reportTypeIcon` / `reportFmtMeta` | 报表类型、图标、格式样式 |
| `weatherWarnLevel` / `weatherIcons` | 气象预警级别配色与图标 |
| `pestKnowledge` | 病虫害知识库 |
| `tracePublicTabs` / `scanSteps` | 溯源码公开页页签与扫码步骤 |
| `customerLevelTag` / `traceStatusTag` / `apiStatusTag` | 各类状态标签色 |
| `fileTypeMeta` / `apiTypeMeta` / `logTypeMeta` | 文件、接口、日志类型元数据 |
| `menuIcons` / `roleButtonPerms` / `roleDataScopes` / `roleDefaultMenus` | 菜单图标与角色权限配置 |
| `avatarColors` | 头像配色 |
| `loginFeatures` / `loginDemoAccounts` | 登录页特性与演示账号 |
| `productImgMeta` | 产品占位图配色与文字 |
| `reportStatusLabels` | 报表导出时状态英文 key → 中文 |
| `statusTagMaps` | 全局状态标签映射（`label/type/effect`），`StatusTag` 组件唯一数据源 |
| `statusOptionGroups` | 列表页筛选下拉选项分组（`label/value`），键与业务模块对应：`salesOrder` / `product` / `user` / `stockType` / `logResult` / `harvest` / `residue` / `controlSource` / `controlResult` / `strategyEnabled` / `pestStatus` |
| `sysParamGroups` | 系统参数页分组（`name` + `keys`），按参数 key 归组展示；新增参数只需在 `system/sysParams.json` 增加记录，并在此补充对应 key |

### 4.2 `config/screens.json`

| 字段 | 用途 |
| --- | --- |
| `titles` | 四块大屏标题 |
| `plotColors` | 环境大屏地块轮播配色 |
| `envKeyMeta` / `envKeyParams` | 环境参数名/单位与轮播键 |
| `envWeatherCards` / `envCarouselMs` / `envRefreshMs` | 气象卡内容与轮播/刷新间隔 |
| `farmProgress` / `farmKpiMeta` | 农事大屏进度条与 KPI 文案 |
| `deviceWorkOrders` | 设备大屏运维工单展示 |
| `deviceTypeLabels` | 设备类型中文名 |
| `overview` | 总览大屏：面积/年产量/头部指标/产量趋势/地图地块与设备点位/告警轮播间隔 |

### 4.3 `config/workbench.json`

`quickEntries`（快捷入口）、`kpiMeta`（KPI 卡片键与趋势）、`statusText` / `levelText` / `levelTag`（告警状态与级别）、`hero`（标题与天气）、`greeting`（问候语时段）、`alarmCarouselMs`。

### 4.4 `config/mobile.json`

`greeting`（移动端问候时段）、`quickEntries`（快捷入口）、`orderPreviewLimit` / `devicePreviewLimit`（首页预览条数）、`controlIcons`（设备图标）、`alarmLevelStyle`（告警级别样式）。

---

## 5. 运行时数据流

### 首屏装载

1. `src/data/jsonSource.js` 用 `import.meta.glob('../../data/**/*.json', { eager: true })` 同步打包全部 JSON；
2. `src/mock/data.js` 从 `bundledAll()` 按集合键导出 39 个同名数组/对象，业务页面与 mock 接口无需改变调用方式；
3. `configStore` 从 `configs` 建立响应式配置中心，页面通过 `getConfig(name)` 读取。

### 启动对账

`ensureDbReady()`：

- dev：探测 `GET /__data/health` → 拉取 `GET /__data/all` → `applyServerDoc()` 原位覆盖集合并重置脏数据基线；
- 失败或静态部署：`mode = 'static'`，叠加旧 `localStorage` 存档（`agri-db-v1`），并迁移历史脏字段。

### 写回（页面/后台 → JSON）

1. mock 接口路由完成增删改后调用 `persistDb()`；
2. file 模式：300ms 防抖 → 对比基线找出脏集合 → `POST /__data/write`；
3. 服务端原子写入（临时文件 + rename，失败重试）→ 更新 manifest 的 `seq/savedAt/version`；
4. 成功后更新基线、`dbMeta.version/savedAt`，避免重复写；
5. 失败自动标记 `flushAgain` 并重试；static 模式回退写 `localStorage`。

### 监听（JSON → 页面）

1. 服务端 `fs.watch(data/, { recursive: true })` 监听外部修改；
2. 120ms 去抖后解析文件，校验 `data` 字段，广播 SSE `{ type:'change', keys, origin:'external', version }`；
3. 前端 `useDataVersion.js` 维护全局 `dataVersion` 与 `lastChangeKeys`；
4. `onDataChange(fn, { keys, debounce })` 订阅：命中 `keys` 时拉取 `/__data/all` → `applyServerDoc()` → 递增版本；
5. `ProTable`、工作台、大屏等组件监听版本后自动重新取数，无需手动刷新；
6. 自身写入通过 `clientId` 过滤，不会触发重复重渲染。
7. `vite.config.js` 中 `server.watch.ignored` 已忽略 `data/`，避免编辑 JSON 触发整页 HMR；因此只新增/修改**记录内容**时会实时同步，而新增**集合或配置字段**后需重启 dev server，让首屏 `import.meta.glob` 重新读取文件结构。

---

## 6. 新增数据 / 页面配置的流程

1. 在 `data/<模块>/` 新建 `xxx.json`，按信封格式填写；
2. 在 `manifest.json` 的 `collections`（或 `singletons` / `configs`）登记文件名与 `seqKey`；
3. 若为新集合：
   - 在 `src/mock/data.js` 增加同名导出（`col('xxx')`）；
   - 在 `src/mock/db.js` 的 `DEFAULT_SEQ` 增加序列键；
   - 在 `src/mock/index.js` 增加对应路由；
4. 若为页面配置：在 `configStore` 对应文件中补充字段，并在本规范第 4 节登记；
5. 前端通过 `getConfig('<name>')` 读取，禁止在组件内硬编码；
6. 运行 `npm run build` 与 `npm test` 验证。

---

## 7. 验证清单（对应需求 6）

| 验证项 | 方法 |
| --- | --- |
| 渲染完全依赖 JSON | 修改 `data/core/plots.json` 中地块名称 → 页面表格无需刷新自动更新 |
| 写操作回写文件 | 页面新增/编辑记录 → `data/` 对应文件出现该记录（检查 `_meta.updatedAt`） |
| 外部变更监听 | 文本编辑器修改 JSON → dev server 终端出现写入日志 → 浏览器页面自动重渲染 |
| 多模块联动 | 新增地块后，设备/农事下拉与看板统计同步变化 |
| 版本一致性 | `GET /__data/health` 的 `version/savedAt` 与 `manifest.json` 一致 |
| 静态降级 | `npm run build && npm run preview`：数据来自打包内置 JSON，写操作回退 localStorage |

---

## 8. 禁止事项

- 禁止在 `src/views`、`src/components` 中硬编码业务枚举、演示数据、统计数字、页面配置；
- 禁止直接读写 `localStorage` 业务数据（仅 `db.js` 静态降级时允许）；
- 禁止绕过 mock 接口直接修改 `data/` 文件后依赖页面缓存；
- 禁止在 JSON 中使用注释、尾逗号、单引号等非标准语法；
- 禁止新增未在 manifest 登记的数据文件（服务端白名单会拒绝写入）。
