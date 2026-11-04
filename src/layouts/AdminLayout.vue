<script setup>
/**
 * 管理端布局 v2 —— 「指挥条 + 悬浮 Dock + 更多窗口」架构
 * 彻底取代「左侧菜单栏 + 右侧内容区」的经典分栏：
 *  —— 顶部指挥条：半透明玻璃材质，承载层级路径与全局状态（告警/天气/用户）
 *  —— 底部 Dock：一级模块悬浮胶囊，向下滚动隐、向上滚动现（可打断）
 *  —— 更多窗口：全部页面的统一跳转入口，取代侧栏树
 * 内容区为自由画布：页面在画布上直接铺开，不再被分栏框住。
 * 保留原有全部业务逻辑（RBAC 过滤、告警轮询、访问记录、登出等）。
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { menuGroups } from '@/router/menus'
import { alarmApi } from '@/api'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'
import DockNav from '@/components/nav/DockNav.vue'
import MoreSheet from '@/components/nav/MoreSheet.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const pendingAlarms = ref(0)
let alarmTimer = null

/** 滚动边缘效果：内容滚动时指挥条才投下阴影，静止时页面保持扁平 */
const mainScrolled = ref(false)
/** 滚动方向驱动的 Dock 显隐（ios-design：可打断，transition 不锁输入） */
const dockHidden = ref(false)
let lastScrollTop = 0
function onMainScroll(e) {
  const st = e.target.scrollTop
  mainScrolled.value = st > 4
  if (st > 80 && st > lastScrollTop + 4) dockHidden.value = true
  else if (st < lastScrollTop - 4 || st <= 80) dockHidden.value = false
  lastScrollTop = st
}

/** 按角色过滤后的模块树（RBAC：无权限模块自动隐藏；工作台单独渲染） */
const visibleMenus = computed(() =>
  menuGroups
    .map((g) => {
      if (g.key === 'dashboard') return null
      if (!hasPerm(g.roles)) return null
      const children = (g.children || []).filter((c) => hasPerm(c.roles))
      return { ...g, children }
    })
    .filter(Boolean)
)
function hasPerm(roles) {
  return !roles || roles.length === 0 || roles.includes(auth.role)
}

/** Dock 模块：每组入口为该组第一个可见页面 */
const dockModules = computed(() =>
  visibleMenus.value
    .filter((g) => g.children.length)
    .map((g) => ({ key: g.key, title: g.title, icon: g.icon, entry: g.children[0].route }))
)

/** 当前激活模块（Dock 高亮） */
const activeGroup = computed(() => {
  const g = visibleMenus.value.find((x) => x.children.some((c) => c.route === route.name))
  return g?.key || ''
})
const dockActiveKey = computed(() => (route.name === 'Workbench' ? 'dashboard' : activeGroup.value))

/** 当前层级路径（指挥条中央）：模块 → 页面 */
const currentGroup = computed(() => visibleMenus.value.find((x) => x.key === activeGroup.value))

/** 「更多」窗口数据：按模块分组的全部可访问页面（含工作台 / 个人中心 / 移动端演示） */
const moreSheetOpen = ref(false)
const moreGroups = computed(() => {
  const groups = [
    { key: 'dashboard', title: '数据面板', icon: 'Odometer', children: [{ title: '工作台首页', to: { name: 'Workbench' } }] },
    ...visibleMenus.value.map((g) => ({
      key: g.key,
      title: g.title,
      icon: g.icon,
      children: g.children.map((c) => ({ title: c.title, to: { name: c.route } })),
    })),
  ]
  if (hasPerm(['admin', 'manager', 'tech'])) {
    groups.push({
      key: 'account',
      title: '个人中心',
      icon: 'User',
      children: [
        { title: '基本资料', to: { name: 'Profile' } },
        { title: '修改密码', to: { name: 'Password' } },
      ],
    })
  }
  groups.push({ key: 'other', title: '其他', icon: 'Iphone', children: [{ title: '移动端演示', to: '/m/home' }] })
  return groups
})

watch(
  () => route.path,
  async (p) => {
    if (p === '/iot/alarms') {
      pendingAlarms.value = 0
    }
  }
)

async function fetchPending() {
  try {
    const res = await alarmApi.page({ status: 'pending', page: 1, size: 1 })
    pendingAlarms.value = res.total || 0
  } catch { /* 忽略 */ }
}

function goTo(name) {
  if (name) router.push({ name })
}

const now = ref(new Date())
let clockTimer = null
const timeText = computed(() => now.value.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }))

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning', confirmButtonText: '退出', cancelButtonText: '取消' })
    await auth.logout()
    ElMessage.success('已安全退出')
    router.push('/login')
  } catch { /* 取消 */ }
}

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen()
  else await document.documentElement.requestFullscreen()
}

onMounted(() => {
  fetchPending()
  alarmTimer = setInterval(fetchPending, 60000)
  clockTimer = setInterval(() => (now.value = new Date()), 30000)
})
onBeforeUnmount(() => {
  clearInterval(alarmTimer)
  clearInterval(clockTimer)
})
</script>

<template>
  <div class="admin-layout">
    <!-- ========== 顶部指挥条（玻璃材质，悬浮于内容之上） ========== -->
    <header class="command-bar" :class="{ scrolled: mainScrolled }">
      <div class="bar-side bar-left">
        <div class="logo" role="link" aria-label="回到工作台" tabindex="0" @click="router.push('/dashboard')" @keyup.enter="router.push('/dashboard')">
          <svg viewBox="0 0 48 48" class="logo-icon" aria-hidden="true">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#074ce0" /><stop offset="1" stop-color="#063cb4" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#lg)" />
            <path d="M24 38c0-9 3-16 12-21 1 12-4 19-12 21zm0 0c0-7-2.5-12.5-9.5-16.5C13.6 30.5 18 36.2 24 38z" fill="#fff" opacity=".95" />
          </svg>
          <span class="logo-title">智慧农业平台</span>
        </div>

        <!-- 层级路径：模块（可点击） › 当前页面 -->
        <nav class="crumb" aria-label="层级路径">
          <template v-if="currentGroup">
            <button class="crumb-group" @click="goTo(currentGroup.children[0].route)">
              {{ currentGroup.title }}
            </button>
            <span class="crumb-sep" aria-hidden="true">›</span>
          </template>
          <span class="crumb-page">{{ route.meta.title || '' }}</span>
        </nav>
      </div>

      <div class="bar-side bar-right">
        <span class="clock" aria-label="当前时间">{{ timeText }}</span>
        <div class="weather-chip" aria-label="当前天气">
          <el-icon color="#5c85f5"><Sunny /></el-icon>
          <span>武汉 19℃ 多云</span>
        </div>
        <button class="icon-btn alarm-btn" aria-label="告警消息" @click="router.push('/iot/alarms')">
          <el-badge :value="pendingAlarms" :hidden="pendingAlarms === 0" :max="99">
            <el-icon :size="18"><Bell /></el-icon>
          </el-badge>
        </button>
        <button class="icon-btn" aria-label="全屏切换" @click="toggleFullscreen">
          <el-icon :size="18"><FullScreen /></el-icon>
        </button>
        <el-dropdown trigger="click" @command="(cmd) => cmd && router.push({ name: cmd })">
          <div class="user-chip" role="button" tabindex="0" aria-label="用户菜单">
            <span class="avatar">{{ auth.avatarText }}</span>
            <div class="user-meta">
              <span class="user-name">{{ auth.displayName }}</span>
              <span class="user-role">{{ auth.roleName }}</span>
            </div>
            <el-icon :size="12"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="Profile"><el-icon><User /></el-icon>基本资料</el-dropdown-item>
              <el-dropdown-item command="Password"><el-icon><Key /></el-icon>修改密码</el-dropdown-item>
              <el-dropdown-item divided command="" @click="router.push('/m/home')"><el-icon><Iphone /></el-icon>移动端演示</el-dropdown-item>
              <el-dropdown-item divided command="" @click="handleLogout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- ========== 内容画布：页面自由铺开，无分栏束缚 ========== -->
    <main class="main" @scroll.passive="onMainScroll">
      <div class="page-canvas">
        <!-- 页面级错误边界：单页异常仅替换画布内容，指挥条/Dock 保持可用 -->
        <ErrorBoundary :route-key="route.fullPath">
          <router-view v-slot="{ Component }">
            <transition name="route" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </transition>
          </router-view>
        </ErrorBoundary>
      </div>
    </main>

    <!-- ========== 底部悬浮 Dock ========== -->
    <DockNav
      :modules="dockModules"
      :active-key="dockActiveKey"
      :hidden="dockHidden"
      @go="goTo"
      @more="moreSheetOpen = true"
    />
    <MoreSheet
      :open="moreSheetOpen"
      :groups="moreGroups"
      @close="moreSheetOpen = false"
    />
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: var(--ag-bg-ground);
  /* 细噪点底纹：4.5% 透明度灰阶颗粒，消除大面积纯底的「塑料感」，视觉上几乎不可察 */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
}

/* ---------- 顶部指挥条 ----------
   dp 材质：ground 近白底 + 发丝分隔线；滚动后投下柔影（scroll edge effect）。
   内容为玻璃材质（blur + saturate），滚动内容从其下透出——层级靠材质而非色块 */
.command-bar {
  position: relative;
  z-index: 2100;
  flex: none;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: rgba(252, 252, 253, 0.82);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--ag-border-light);
  transition: box-shadow var(--ag-dur) var(--ag-ease);
}
.command-bar.scrolled {
  box-shadow: 0 6px 20px rgba(22, 25, 31, 0.06);
}

.bar-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.bar-right {
  justify-content: flex-end;
}

/* logo：图标 + 文字标 */
.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  flex: none;
  border-radius: 8px;
}
.logo-icon {
  width: 30px;
  height: 30px;
  display: block;
}
.logo-title {
  font-family: var(--ag-font-display);
  font-weight: 700;
  font-size: 15px;
  color: var(--ag-text-1);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

/* 层级路径：模块 › 页面 */
.crumb {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 13px;
  overflow: hidden;
}
.crumb-group {
  border: none;
  background: transparent;
  padding: 3px 6px;
  border-radius: 6px;
  font: inherit;
  color: var(--ag-text-3);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--ag-dur) var(--ag-ease), background var(--ag-dur) var(--ag-ease);
}
@media (hover: hover) and (pointer: fine) {
  .crumb-group:hover {
    color: var(--ag-green-700);
    background: rgba(7, 76, 224, 0.06);
  }
}
.crumb-sep {
  color: var(--ag-text-4);
}
.crumb-page {
  color: var(--ag-text-1);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- 右侧状态区 ---------- */
.clock {
  font-family: var(--ag-font-num);
  font-size: 12px;
  color: var(--ag-text-3);
  white-space: nowrap;
}
.weather-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--ag-border-light);
  background: var(--ag-bg-surface);
  font-size: 12px;
  color: var(--ag-text-2);
  white-space: nowrap;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--ag-text-2);
  cursor: pointer;
  transition: background var(--ag-dur) var(--ag-ease), color var(--ag-dur) var(--ag-ease),
    transform 0.1s ease-out;
}
.icon-btn:active {
  transform: scale(0.92);
}
@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover {
    background: rgba(22, 25, 31, 0.05);
    color: var(--ag-text-1);
  }
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 999px;
  cursor: pointer;
  transition: background var(--ag-dur) var(--ag-ease);
}
@media (hover: hover) and (pointer: fine) {
  .user-chip:hover {
    background: rgba(22, 25, 31, 0.05);
  }
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ag-green-600);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  flex: none;
}
.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.user-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ag-text-1);
}
.user-role {
  font-size: 10px;
  color: var(--ag-text-4);
}

/* ---------- 内容画布 ---------- */
.main {
  flex: 1;
  overflow-y: auto;
  background: var(--ag-bg-ground);
}
.page-canvas {
  /* 全部 49 个管理页自带 .page 容器（32px 4pt 网格留白 + 1680px 上限），
     画布只负责给底部 Dock 让位，不再叠加横向内边距；
     底部预留叠加 iOS 安全区（Home Indicator） */
  padding: 0 0 calc(120px + env(safe-area-inset-bottom));
}

/* ---------- 响应式 ---------- */
@media (max-width: 1100px) {
  .weather-chip,
  .clock {
    display: none;
  }
}
@media (max-width: 860px) {
  .logo-title {
    display: none;
  }
  .user-meta {
    display: none;
  }
}
/* 手机端：指挥条收窄 + 触控目标放大到 44px 触控标准 */
@media (max-width: 768px) {
  .command-bar {
    height: 52px;
    padding: 0 10px;
    gap: 8px;
  }
  .icon-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
  }
  .user-chip {
    padding: 4px;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .command-bar {
    background: var(--ag-bg-surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
