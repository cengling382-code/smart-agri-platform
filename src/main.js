import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
import './styles/base.css'
import './styles/mobile.css'
import { installGlobalErrorHandlers } from './utils/errorReport'
import { startLiveSync } from './composables/useDataVersion'

const app = createApp(App)
const pinia = createPinia()

// 全局注册 Element Plus 图标（按需使用 <el-icon><component :is="..."/></el-icon>）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 全局异常兜底：组件渲染/生命周期/事件异常、window 错误、未处理 Promise 拒绝
// 任何单点异常只记录与提示，绝不导致整站崩溃
installGlobalErrorHandlers(app)

app.mount('#app')

// 首屏导航若因资源加载失败而未就绪，router.onError 已兜底跳转 /route-error
router.isReady().catch(() => { /* 已由路由错误处理器接管 */ })

// 启动本地 JSON 数据服务监听：外部修改 data/*.json 时推送变更，页面自动重渲染
// 静态部署（build 产物）无该服务，内部会自动降级，不产生影响
startLiveSync().catch(() => { /* 静态模式跳过实时同步 */ })
