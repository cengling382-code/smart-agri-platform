<script setup>
/** 页面 59 · 移动端工作台：待办工单、告警消息、快捷设备控制入口 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { farmApi, alarmApi, deviceApi, statsApi } from '@/api'
import { getConfig } from '@/data/configStore'
import { onDataChange } from '@/composables/useDataVersion'

const cfg = getConfig('mobile')

const router = useRouter()
const auth = useAuthStore()
const orders = ref([])
const pendingAlarms = ref(0)
const dash = ref(null)
const devices = ref([])

const G = cfg.greeting
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < G.nightUntil ? G.night : h < G.morningUntil ? G.morning : h < G.afternoonUntil ? G.afternoon : G.evening
})

const QUICK = cfg.quickEntries

onMounted(load)
onDataChange(load, { debounce: 400 })
async function load() {
  try {
    const [o, a, d, dv] = await Promise.all([
      farmApi.orderPage({ page: 1, size: 20 }),
      alarmApi.page({ status: 'pending', page: 1, size: 1 }),
      statsApi.dashboard(),
      deviceApi.all(),
    ])
    orders.value = o.list.filter((x) => x.status === '待接单' || x.status === '进行中').slice(0, cfg.orderPreviewLimit)
    pendingAlarms.value = a.total
    dash.value = d
    devices.value = dv.filter((x) => x.type === 'actuator' && x.status === 'online').slice(0, cfg.devicePreviewLimit)
  } catch { /* 静默 */ }
}
</script>

<template>
  <div class="m-page m-home">
    <!-- ① 墨色 Hero：与 PC 工作台 .hero 同形（问候 + 标题 + 摘要） -->
    <section class="hero" aria-label="工作台概览">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-main">
        <p class="hero-hello">{{ greeting }}，{{ auth.displayName }}</p>
        <h1 class="hero-title">智慧农业工作台</h1>
        <p class="hero-sub">
          <span>{{ auth.roleName }}</span>
          <i class="hero-sep" aria-hidden="true"></i>
          <span>今日 {{ orders.length }} 个待办工单</span>
        </p>
      </div>
    </section>

    <!-- ② 快捷入口：白色面板压住 Hero 下缘，沿用 PC「白条压墨」的层次手法 -->
    <div class="quick-card">
      <button v-for="q in QUICK" :key="q.path" class="q-btn" @click="router.push(q.path)">
        <span class="q-ico" :style="{ background: q.color + '1a', color: q.color }">
          <el-icon :size="20"><component :is="q.icon" /></el-icon>
        </span>
        <span class="q-t">{{ q.title }}</span>
      </button>
    </div>

    <!-- ③ 待办工单 -->
    <section class="m-card">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>待办工单</div>
        <button class="m-link" @click="router.push('/m/orders')">全部 →</button>
      </div>
      <div class="m-card-body">
        <div v-for="o in orders" :key="o.id" class="order-row" @click="router.push('/m/orders')">
          <span class="m-tag">{{ o.type }}</span>
          <div class="o-main">
            <b>{{ o.plotName }}</b>
            <span class="text-dim">{{ o.planDate }} · {{ o.assignee }}</span>
          </div>
          <span class="o-status" :class="{ doing: o.status === '进行中' }">{{ o.status }}</span>
        </div>
        <div v-if="!orders.length" class="m-empty">暂无待办工单</div>
      </div>
    </section>

    <!-- ④ 告警消息 -->
    <section class="m-card">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>告警消息</div>
        <button class="m-link" @click="router.push('/m/alarms')">全部 →</button>
      </div>
      <div class="m-card-body">
        <button class="alarm-row" @click="router.push('/m/alarms')">
          <el-icon :size="16" class="alarm-ico"><Bell /></el-icon>
          <span>待处理告警 <b class="mono-num">{{ pendingAlarms }}</b> 条</span>
          <el-icon :size="14" class="row-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
    </section>

    <!-- ⑤ 快捷设备控制 -->
    <section class="m-card">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>快捷设备控制</div>
        <button class="m-link" @click="router.push('/m/control')">全部 →</button>
      </div>
      <div class="m-card-body">
        <div class="dev-grid">
          <div v-for="d in devices" :key="d.id" class="dev-cell">
            <span class="pulse-dot" :class="d.running ? 'is-on' : 'is-off'"></span>
            <span class="dev-t">{{ d.subtype }}</span>
            <span class="text-dim">{{ d.running ? '运行中' : '停止' }}</span>
          </div>
        </div>
        <div v-if="!devices.length" class="m-empty">暂无在线可控设备</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Hero：与 PC .hero 同源（深墨底 + 右上电光蓝光晕），仅按 390px 收敛留白与字号 */
.hero {
  position: relative;
  overflow: hidden;
  margin-bottom: -32px;
  padding: var(--ag-space-5) var(--ag-space-5) 56px;
  border-radius: var(--ag-radius);
  background: linear-gradient(135deg, var(--ag-navy-800) 0%, var(--ag-navy-900) 58%, #101a33 100%);
  color: #fff;
}
.hero-glow {
  position: absolute;
  top: -120px;
  right: -70px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(7, 76, 224, 0.45), transparent 70%);
  pointer-events: none;
}
.hero-main {
  position: relative;
  z-index: 1;
}
.hero-hello {
  margin: 0 0 4px;
  font-size: var(--ag-fs-caption);
  letter-spacing: var(--ag-ls-caption);
  color: rgba(232, 238, 244, 0.62);
}
.hero-title {
  margin: 0;
  font-family: var(--ag-font-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.6px;
  line-height: 1.2;
  color: #fff;
}
.hero-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--ag-space-2);
  margin: 10px 0 0;
  font-size: var(--ag-fs-micro);
  color: rgba(232, 238, 244, 0.72);
}
.hero-sep {
  width: 1px;
  height: 11px;
  background: rgba(232, 238, 244, 0.24);
}

/* 快捷入口面板：压在 Hero 下缘，视觉层次与 PC KPI 条一致 */
.quick-card {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--ag-space-2);
  padding: var(--ag-space-4) var(--ag-space-2);
  background: var(--ag-bg-surface);
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius);
  box-shadow: var(--ag-shadow);
}
.q-btn {
  border: none;
  background: none;
  padding: 2px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
/*
 * 图标底：对齐 PC StatCard 的 .icon-box 处理
 * （48px 同色系低透明度色块 + 同色图标，不用渐变与彩色投影）
 */
.q-ico {
  width: 44px;
  height: 44px;
  border-radius: var(--ag-radius);
  display: grid;
  place-items: center;
  transition: transform var(--ag-dur-fast) var(--ag-ease);
}
.q-btn:active .q-ico {
  transform: scale(0.94);
}
.q-t {
  font-size: 11px;
  letter-spacing: var(--ag-ls-micro);
  color: var(--ag-text-2);
  white-space: nowrap;
}

/* 区块卡片间距 */
.m-home > .m-card {
  margin-top: var(--ag-space-3);
}

/* 待办工单行：13px + 发丝虚线，与 PC 表格行同节奏 */
.order-row {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  padding: var(--ag-space-3) 0;
  border-bottom: 1px dashed var(--ag-border-light);
  cursor: pointer;
}
.order-row:first-child {
  padding-top: 0;
}
.order-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}
.o-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.o-main b {
  font-size: var(--ag-fs-caption);
  font-weight: 600;
  color: var(--ag-text-1);
}
.o-status {
  flex: none;
  font-size: var(--ag-fs-micro);
  color: var(--ag-warning);
}
.o-status.doing {
  color: var(--ag-green-600);
}

/* 告警行 */
.alarm-row {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--ag-fs-caption);
  color: var(--ag-text-2);
  cursor: pointer;
}
.alarm-ico {
  color: var(--ag-danger);
}
.alarm-row b {
  color: var(--ag-danger);
  font-weight: 700;
}
.row-arrow {
  margin-left: auto;
  color: var(--ag-text-4);
}

/* 快捷设备：2×2 信息格，复用 PC 内嵌信息块的 bg-hover 形制 */
.dev-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ag-space-2);
}
.dev-cell {
  display: flex;
  align-items: center;
  gap: var(--ag-space-2);
  padding: var(--ag-space-3);
  border: 1px solid var(--ag-border-light);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-bg-hover);
  font-size: var(--ag-fs-micro);
}
.dev-t {
  font-size: var(--ag-fs-caption);
  font-weight: 600;
  color: var(--ag-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
