<script setup>
/**
 * 路由级降级页（/route-error）
 * 仅在「首屏动态资源加载失败、且站内无任何可用页面」时展示。
 * 本组件为静态导入（打进主包），自身不会出现加载失败。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { classifyRouterError } from '@/utils/routerError'
import { getErrorLog } from '@/utils/errorReport'

const route = useRoute()
const router = useRouter()
const retrying = ref(false)
const retryCount = ref(0)

const from = computed(() => String(route.query.from || '/'))
const msg = computed(() => String(route.query.msg || '页面资源加载失败'))
const kind = computed(() => classifyRouterError(new Error(msg.value)))
const kindText = { chunk: '页面资源（JS 分包）加载失败，多为网络波动或站点刚更新所致', chunk404: '页面资源不存在（404），可能站点已更新，刷新即可恢复', nav: '页面导航被中断', unknown: '发生未知导航错误' }

const recent = ref([])
onMounted(() => {
  recent.value = getErrorLog().slice(0, 5)
})

async function retry() {
  retrying.value = true
  retryCount.value++
  try {
    await router.replace(from.value)
  } catch {
    // 重试仍失败 → 建议硬刷新
    retrying.value = false
  }
  retrying.value = false
}
function goHome() {
  router.replace('/dashboard').catch(() => router.replace('/login'))
}
function hardReload() {
  window.location.replace(from.value || '/')
}
</script>

<template>
  <div class="route-error">
    <div class="re-card anim-zoom">
      <div class="re-icon" aria-hidden="true">📡</div>
      <h1>页面加载失败</h1>
      <p class="re-desc">{{ kindText[kind] || kindText.unknown }}</p>
      <p class="re-msg mono-num">{{ msg }}</p>

      <div class="re-actions">
        <el-button type="primary" size="large" :loading="retrying" :icon="'RefreshRight'" @click="retry">
          重试进入目标页面
        </el-button>
        <el-button size="large" :icon="'Refresh'" @click="hardReload">刷新站点</el-button>
        <el-button size="large" :icon="'House'" @click="goHome">前往登录 / 工作台</el-button>
      </div>

      <p class="re-tip" v-if="retryCount > 1">多次重试仍失败，建议点击「刷新站点」清除缓存的旧资源。</p>

      <div v-if="recent.length" class="re-log">
        <b>近期错误记录</b>
        <ul>
          <li v-for="(l, i) in recent" :key="i">
            <span class="mono-num">{{ l.time }}</span> [{{ l.context }}] {{ l.message }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.route-error {
  min-height: 100vh;
  display: grid;
  place-items: center;
  /* 决策依据：原为装饰性光斑（两层 radial-gradient 氛围光），按简约高级规范改为平底 */
  background: var(--ag-bg-page);
  padding: 24px;
}
.re-card {
  width: min(620px, 100%);
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：错误页主卡片属大块面板，对齐浮层档 14px */
  box-shadow: var(--ag-shadow-lg);
  padding: 46px 48px;
  text-align: center;
}
.re-icon {
  font-size: 52px;
}
h1 {
  font-size: 26px;
  margin: 12px 0 6px;
}
.re-desc {
  color: var(--ag-text-2);
  font-size: 14px;
  margin: 0 0 10px;
}
.re-msg {
  font-size: 11px;
  color: var(--ag-text-4);
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius-sm); /* 决策依据：行内错误码 chip 属小控件，对齐控件档 6px */
  padding: 5px 12px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 0 22px;
}
.re-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.re-tip {
  margin-top: 16px;
  font-size: 12px;
  color: var(--ag-warning);
}
.re-log {
  margin-top: 22px;
  text-align: left;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：日志块属卡片类容器，对齐卡片档 10px */
  padding: 12px 16px;
  font-size: 11px;
}
.re-log b {
  color: var(--ag-text-3);
  font-size: 12px;
}
.re-log ul {
  margin: 6px 0 0;
  padding-left: 16px;
  color: var(--ag-text-2);
  line-height: 1.9;
}
</style>
