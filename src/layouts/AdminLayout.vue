<script setup>
/** 管理端布局：左侧菜单 + 顶部导航 + 标签页 + 主内容区（说明书规定的经典后台布局） */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { menuGroups } from '@/router/menus'
import { alarmApi } from '@/api'
import ErrorBoundary from '@/components/ui/ErrorBoundary.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const app = useAppStore()

const pendingAlarms = ref(0)
let alarmTimer = null

/** 滚动边缘效果：内容滚动时顶栏/标签栏才投下阴影，静止时页面保持扁平 */
const mainScrolled = ref(false)
function onMainScroll(e) {
  mainScrolled.value = e.target.scrollTop > 4
}

/** 按角色过滤后的菜单树（RBAC：无权限菜单自动隐藏；工作台单独渲染，不重复入组） */
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
const activeGroup = computed(() => {
  const g = visibleMenus.value.find((x) => x.children.some((c) => c.route === route.name))
  return g?.key || ''
})

/** 面包屑 */
const breadcrumb = computed(() => {
  const g = visibleMenus.value.find((x) => x.children.some((c) => c.route === route.name))
  const items = [{ title: '首页', path: '/dashboard' }]
  if (g) items.push({ title: g.title })
  items.push({ title: route.meta.title || '' })
  return items
})

/** 标签页 */
watch(
  () => route.path,
  () => app.addTag(route)
)
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

function closeTag(t) {
  const next = app.removeTag(t.path)
  if (route.path === t.path && next) router.push(next.path)
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
  app.addTag(route)
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
    <!-- ========== 侧边栏 ========== -->
    <aside class="sidebar" :class="{ collapsed: app.sidebarCollapsed }">
      <div class="logo" @click="router.push('/dashboard')" role="link" aria-label="回到工作台">
        <svg viewBox="0 0 48 48" class="logo-icon" aria-hidden="true">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#7DC383" /><stop offset="1" stop-color="#558162" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#lg)" />
          <path d="M24 38c0-9 3-16 12-21 1 12-4 19-12 21zm0 0c0-7-2.5-12.5-9.5-16.5C13.6 30.5 18 36.2 24 38z" fill="#fff" opacity=".95" />
        </svg>
        <transition name="fade">
          <div v-show="!app.sidebarCollapsed" class="logo-text">
            <div class="logo-title">智慧农业平台</div>
            <div class="logo-sub">SMART AGRICULTURE</div>
          </div>
        </transition>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="route.name"
          :collapse="app.sidebarCollapsed"
          :collapse-transition="false"
          class="side-menu"
          unique-opened
        >
          <el-menu-item index="Workbench" @click="router.push({ name: 'Workbench' })">
            <el-icon><Odometer /></el-icon><template #title>工作台首页</template>
          </el-menu-item>
          <el-sub-menu v-for="g in visibleMenus" :key="g.key" :index="g.key">
            <template #title>
              <el-icon><component :is="g.icon" /></el-icon>
              <span>{{ g.title }}</span>
            </template>
            <el-menu-item v-for="c in g.children" :key="c.route" :index="c.route" @click="router.push({ name: c.route })">
              {{ c.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu v-if="hasPerm(['admin', 'manager', 'tech'])" index="profile-group">
            <template #title>
              <el-icon><UserFilled /></el-icon>
              <span>个人中心</span>
            </template>
            <el-menu-item index="Profile" @click="router.push({ name: 'Profile' })">基本资料</el-menu-item>
            <el-menu-item index="Password" @click="router.push({ name: 'Password' })">修改密码</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>

      <div class="sidebar-foot" v-show="!app.sidebarCollapsed">
        <div class="foot-entry" @click="router.push('/m/home')" role="link" tabindex="0" @keyup.enter="router.push('/m/home')">
          <el-icon><Iphone /></el-icon> 移动端演示
        </div>
      </div>
    </aside>

    <!-- ========== 右侧 ========== -->
    <div class="right" :class="{ collapsed: app.sidebarCollapsed }">
      <header class="header" :class="{ scrolled: mainScrolled }">
        <div class="header-left">
          <button class="icon-btn" :aria-label="app.sidebarCollapsed ? '展开菜单' : '收起菜单'" @click="app.toggleSidebar()">
            <el-icon :size="18"><Expand v-if="app.sidebarCollapsed" /><Fold v-else /></el-icon>
          </button>
          <el-breadcrumb separator="/" aria-label="面包屑导航">
            <el-breadcrumb-item v-for="(b, i) in breadcrumb" :key="i" :to="b.path ? { path: b.path } : undefined">
              {{ b.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <div class="weather-chip" aria-label="当前天气">
            <el-icon color="#7DC383"><Sunny /></el-icon>
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
                <el-dropdown-item divided command="" @click="handleLogout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 标签页 -->
      <nav v-if="!route.meta.hideTag" class="tags" :class="{ scrolled: mainScrolled }" aria-label="页签导航">
        <router-link
          v-for="t in app.visitedTags"
          :key="t.path"
          :to="t.path"
          custom
          v-slot="{ navigate }"
        >
          <span class="tag" :class="{ active: route.path === t.path }" @click="navigate">
            {{ t.title }}
            <el-icon v-if="app.visitedTags.length > 1" class="tag-close" @click.stop="closeTag(t)"><Close /></el-icon>
          </span>
        </router-link>
      </nav>

      <main class="main" :class="{ 'no-tags': route.meta.hideTag }" @scroll.passive="onMainScroll">
        <!-- 页面级错误边界：单页异常仅替换主内容区，侧栏/导航/标签页保持可用 -->
        <ErrorBoundary :route-key="route.fullPath">
          <router-view v-slot="{ Component }">
            <transition name="route" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </transition>
          </router-view>
        </ErrorBoundary>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ---------- 侧边栏 ----------
   决策依据：原三段式竖向渐变是"AI 生成感"的重灾区——渐变没有任何
   信息量，只为让深色块不那么平。侧栏右侧并无内容经过，做毛玻璃
   也透不出东西，因此用单一实色 + 1px 内侧发丝线分隔，靠明度差分层。 */
.sidebar {
  width: var(--ag-sidebar-width);
  background: var(--ag-navy-900);
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  flex: none;
  transition: width var(--ag-dur) var(--ag-ease);
  z-index: 20;
}
.sidebar.collapsed {
  width: var(--ag-sidebar-collapsed);
}
.logo {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  padding: var(--ag-space-4);
  cursor: pointer;
  overflow: hidden;
  min-height: 60px;
}
.logo-icon {
  width: 34px;
  height: 34px;
  flex: none;
  /* 原 filter: drop-shadow 绿光已移除：图标自身已有渐变，再打光属双重装饰 */
}
.logo-title {
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  letter-spacing: 0.5px;      /* 原 1px：中文标题过松会散 */
}
.logo-sub {
  color: rgba(255, 255, 255, 0.42);
  font-size: 9px;
  letter-spacing: 1.6px;
  white-space: nowrap;
}
.menu-scroll {
  flex: 1;
}
.side-menu {
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: rgba(214, 230, 242, 0.85);
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.07);
  --el-menu-active-color: #8fbf9a;
  padding: var(--ag-space-2);
}
.side-menu:not(.el-menu--collapse) {
  width: 100%;
}
/* 激活态：单一半透明底 + 左侧指示条。原"左浓右淡的绿色渐变"
   是典型的装饰性渐变——它不指示任何状态差异，只制造光晕感。 */
.side-menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.09);
  border-radius: var(--ag-radius-sm);
  position: relative;
  font-weight: 600;
}
.side-menu :deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 22%;
  height: 56%;
  width: 2px;                 /* 3px → 2px：更细的指示条更利落 */
  border-radius: 1px;
  background: var(--ag-green-400);
}
.side-menu :deep(.el-menu-item),
.side-menu :deep(.el-sub-menu__title) {
  border-radius: var(--ag-radius-sm);
  height: 44px;
  line-height: 44px;
  margin: 2px 0;
  transition: background var(--ag-dur-fast) var(--ag-ease), color var(--ag-dur-fast) var(--ag-ease);
}
.side-menu :deep(.el-sub-menu .el-menu-item) {
  padding-left: 44px !important;
  font-size: 13px;
}
.sidebar-foot {
  padding: var(--ag-space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.foot-entry {
  display: flex;
  align-items: center;
  gap: var(--ag-space-2);
  color: rgba(226, 243, 255, 0.75);
  font-size: 13px;
  padding: 9px 12px;
  border-radius: var(--ag-radius-sm);
  cursor: pointer;
  transition: background var(--ag-dur-fast) var(--ag-ease), color var(--ag-dur-fast) var(--ag-ease);
}
.foot-entry:hover {
  background: rgba(255, 255, 255, 0.07);
  color: var(--ag-green-400);
}

/* ---------- 右侧 ---------- */
.right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  transition: margin-left var(--ag-dur) var(--ag-ease);
}
/* 顶栏：实色 + 发丝线。决策依据——顶栏与滚动区是并列的 flex 兄弟，
   内容并不会从它底下经过，做 backdrop-filter 毛玻璃透不出任何东西，
   属"滤镜表演"。真正的层次靠 1px 发丝线 + 内容留白表达。 */
.header {
  height: var(--ag-header-height);
  background: var(--ag-bg-surface);
  border-bottom: 1px solid var(--ag-border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--ag-space-5);
  flex: none;
  position: relative;
  z-index: 10;
  transition: box-shadow var(--ag-dur) var(--ag-ease);
}
/* 滚动边缘效果（scroll-edge）：内容一旦开始滚动，顶栏/标签栏才投下
   极轻的阴影——层级是"用到时才出现"的，静止时页面保持完全扁平。 */
.header.scrolled,
.tags.scrolled {
  box-shadow: 0 10px 20px -16px rgba(48, 56, 65, 0.45);
}
.header-left {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
}
.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: var(--ag-radius-sm);
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--ag-text-2);
  transition: background var(--ag-dur-fast) var(--ag-ease), color var(--ag-dur-fast) var(--ag-ease),
    transform var(--ag-dur-fast) var(--ag-ease);
}
.icon-btn:hover {
  background: var(--ag-bg-hover);
  color: var(--ag-green-600);
}
.icon-btn:active {
  transform: scale(0.94);      /* 0.92 → 0.94：按压要可感，但不至于"塌陷" */
}
.header-right {
  display: flex;
  align-items: center;
  gap: var(--ag-space-2);
}
/* 天气：唯一的暖色点缀，用于打破整条冷色顶栏的单调（人性化细节）。
   形状从 20px 胶囊改为 6px 圆角——胶囊是 AI 模板的默认形。 */
.weather-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ag-fs-micro);
  letter-spacing: var(--ag-ls-micro);
  color: var(--ag-text-3);
  background: var(--ag-cream-light);
  padding: 5px 12px;
  border-radius: var(--ag-radius-sm);
  margin-right: var(--ag-space-2);
}
.alarm-btn :deep(.el-badge__content) {
  border: none;
}
.user-chip {
  display: flex;
  align-items: center;
  gap: var(--ag-space-2);
  padding: 5px 10px;
  border-radius: var(--ag-radius-sm);
  cursor: pointer;
  transition: background var(--ag-dur-fast) var(--ag-ease);
}
.user-chip:hover {
  background: var(--ag-bg-hover);
}
.avatar {
  width: 34px;
  height: 34px;
  /* 方形圆角头像而非圆形：与全站"控件 6px"的语汇一致，
     也避开圆形头像这一最泛滥的默认形 */
  border-radius: var(--ag-radius-sm);
  background: var(--ag-green-600);   /* 原绿→蓝双色渐变：头像是身份标识，不该有装饰性渐变 */
  color: #fff;
  font-weight: 600;
  display: grid;
  place-items: center;
  font-size: 14px;
}
.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ag-text-1);
}
.user-role {
  font-size: 11px;
  color: var(--ag-green-700);
}

/* ---------- 标签页 ---------- */
.tags {
  background: var(--ag-bg-surface);
  border-bottom: 1px solid var(--ag-border-light);
  padding: var(--ag-space-2) var(--ag-space-4);
  display: flex;
  gap: var(--ag-space-2);
  overflow-x: auto;
  flex: none;
}
.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--ag-fs-micro);
  letter-spacing: var(--ag-ls-micro);
  color: var(--ag-text-2);
  background: var(--ag-bg-page);
  border: 1px solid var(--ag-border);
  padding: 4px 10px;
  border-radius: var(--ag-radius-sm);   /* 14px 胶囊 → 6px：与控件同语汇 */
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--ag-dur-fast) var(--ag-ease), border-color var(--ag-dur-fast) var(--ag-ease),
    background var(--ag-dur-fast) var(--ag-ease);
}
.tag:hover {
  color: var(--ag-green-700);
  border-color: var(--ag-green-300);
}
.tag.active {
  background: var(--ag-green-700);
  border-color: var(--ag-green-700);
  color: #fff;
}
.tag-close {
  font-size: 11px;
  border-radius: 50%;
  /* 原 rotate(90deg)：关闭是"消失"语义，用旋转是无意义的装饰动效。
     改为透明度反馈——鼠标移入标签时才显形，减少常驻视觉噪音。 */
  opacity: 0.45;
  transition: opacity var(--ag-dur-fast) var(--ag-ease);
}
.tag:hover .tag-close {
  opacity: 1;
}
.tag-close:hover {
  opacity: 1;
  color: var(--ag-danger);
}

/* ---------- 主内容 ---------- */
.main {
  flex: 1;
  overflow-y: auto;
  position: relative;
  background: var(--ag-bg-page);
}
.main.no-tags {
  border-top: 0;
}

@media (max-width: 1366px) {
  .weather-chip { display: none; }
}
</style>
