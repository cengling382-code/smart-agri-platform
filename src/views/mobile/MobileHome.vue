<script setup>
/** 页面 59 · 移动端工作台：待办工单、告警消息、快捷设备控制入口 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { farmApi, alarmApi, deviceApi, statsApi } from '@/api'

const router = useRouter()
const auth = useAuthStore()
const orders = ref([])
const pendingAlarms = ref(0)
const dash = ref(null)
const devices = ref([])

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 6 ? '凌晨好' : h < 12 ? '上午好' : h < 18 ? '下午好' : '晚上好'
})

const QUICK = [
  { title: '实时环境', icon: 'Sunny', path: '/m/env', color: '#E89552' },
  { title: '视频监控', icon: 'VideoCamera', path: '/m/video', color: '#4C6983' },
  { title: '地块信息', icon: 'Place', path: '/m/plots', color: '#699C78' },
  { title: '采收登记', icon: 'Apple', path: '/m/harvest', color: '#B17179' },
]

onMounted(async () => {
  try {
    const [o, a, d, dv] = await Promise.all([
      farmApi.orderPage({ page: 1, size: 20 }),
      alarmApi.page({ status: 'pending', page: 1, size: 1 }),
      statsApi.dashboard(),
      deviceApi.all(),
    ])
    orders.value = o.list.filter((x) => x.status === '待接单' || x.status === '进行中').slice(0, 4)
    pendingAlarms.value = a.total
    dash.value = d
    devices.value = dv.filter((x) => x.type === 'actuator' && x.status === 'online').slice(0, 4)
  } catch { /* 静默 */ }
})
</script>

<template>
  <div class="m-home">
    <!-- 顶部问候 -->
    <header class="mh-head">
      <div>
        <p class="mh-greet">{{ greeting }}，{{ auth.displayName }}</p>
        <p class="mh-sub">{{ auth.roleName }} · 今日有 {{ orders.length }} 个待办工单</p>
      </div>
      <span class="mh-avatar" aria-hidden="true">{{ auth.avatarText }}</span>
    </header>

    <!-- 快捷入口 -->
    <div class="quick-grid">
      <button v-for="q in QUICK" :key="q.path" class="q-btn" @click="router.push(q.path)">
        <span class="q-ico" :style="{ background: q.color + '18', color: q.color }"><el-icon :size="22"><component :is="q.icon" /></el-icon></span>
        <span class="q-t">{{ q.title }}</span>
      </button>
    </div>

    <!-- 待办工单 -->
    <section class="m-section">
      <div class="sec-head">
        <b>待办工单</b>
        <button class="sec-more" @click="router.push('/m/orders')">全部 ›</button>
      </div>
      <div class="order-list">
        <div v-for="o in orders" :key="o.id" class="order-card" @click="router.push('/m/orders')">
          <span class="o-type">{{ o.type }}</span>
          <div class="o-main">
            <b>{{ o.plotName }}</b>
            <span class="text-dim">{{ o.planDate }} · {{ o.assignee }}</span>
          </div>
          <span class="o-status" :class="{ doing: o.status === '进行中' }">{{ o.status }}</span>
        </div>
        <div v-if="!orders.length" class="m-empty">🎉 暂无待办工单，休息一下</div>
      </div>
    </section>

    <!-- 告警消息 -->
    <section class="m-section">
      <div class="sec-head">
        <b>告警消息</b>
        <button class="sec-more" @click="router.push('/m/alarms')">全部 ›</button>
      </div>
      <button class="alarm-banner" @click="router.push('/m/alarms')">
        <el-icon color="#E84A5F"><Bell /></el-icon>
        <span>有 <b class="mono-num">{{ pendingAlarms }}</b> 条未处理告警，点击查看</span>
        <el-icon color="#9AA4AE"><ArrowRight /></el-icon>
      </button>
    </section>

    <!-- 快捷设备控制 -->
    <section class="m-section">
      <div class="sec-head">
        <b>快捷设备控制</b>
        <button class="sec-more" @click="router.push('/m/control')">全部 ›</button>
      </div>
      <div class="dev-row">
        <div v-for="d in devices" :key="d.id" class="dev-chip" :class="{ run: d.running }">
          <span class="pulse-dot" :class="d.running ? 'is-on' : 'is-off'"></span>
          <span class="dev-t">{{ d.subtype }}</span>
          <span class="text-dim">{{ d.running ? '运行中' : '停止' }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.m-home {
  padding: 0 16px 24px;
  /* 决策依据：页头绿→藏青→页面色三段渐变的藏青段不承载文字、属混色装饰，改为绿到页面色的同高硬切 */
  background: linear-gradient(180deg, #699c78 0, #699c78 220px, #f5f5f5 220px);
  min-height: 100%;
}
.mh-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  padding: 22px 4px 40px;
}
.mh-greet {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
}
.mh-sub {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.8;
}
.mh-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--ag-radius); /* 决策依据：44px 头像小块非控件，按卡片档归 10px */
  background: rgba(255, 255, 255, 0.2);
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 700;
  backdrop-filter: blur(4px);
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：快捷入口区块面板属大块面板，对齐浮层档 14px */
  padding: 16px 10px;
  box-shadow: var(--ag-shadow);
  margin-top: -18px;
  position: relative;
}
.q-btn {
  border: none;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.q-ico {
  width: 46px;
  height: 46px;
  border-radius: var(--ag-radius); /* 决策依据：快捷图标块非控件，按卡片档归 10px */
  display: grid;
  place-items: center;
  transition: transform 0.25s var(--ag-ease-spring);
}
.q-btn:active .q-ico {
  transform: scale(0.9);
}
.q-t {
  font-size: 11px;
  color: var(--ag-text-2);
}
.m-section {
  margin-top: 18px;
}
.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.sec-head b {
  font-size: 15px;
}
.sec-more {
  border: none;
  background: none;
  color: var(--ag-text-4);
  font-size: 12px;
  cursor: pointer;
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.order-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：订单列表卡片属卡片类，对齐卡片档 10px */
  padding: 13px 15px;
  cursor: pointer;
  box-shadow: var(--ag-shadow-sm);
  transition: transform 0.2s;
}
.order-card:active {
  transform: scale(0.98);
}
.o-type {
  background: var(--ag-green-50);
  color: var(--ag-green-700);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: var(--ag-radius-sm); /* 决策依据：订单类型标签属小控件，对齐控件档 6px */
  flex: none;
}
.o-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.o-main b {
  font-size: 14px;
}
.o-status {
  font-size: 11px;
  color: var(--ag-warning);
}
.o-status.doing {
  color: var(--ag-green-600);
}
.alarm-banner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #F6C8CC;
  border-radius: var(--ag-radius); /* 决策依据：告警横幅卡片属卡片类，对齐卡片档 10px */
  padding: 13px 15px;
  cursor: pointer;
  font-size: 13px;
  color: var(--ag-text-2);
  box-shadow: var(--ag-shadow-sm);
}
.alarm-banner b {
  color: var(--ag-danger);
}
.m-empty {
  text-align: center;
  color: var(--ag-text-4);
  font-size: 13px;
  padding: 24px 0;
}
.dev-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
}
.dev-chip {
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：设备数据小卡属卡片类，对齐卡片档 10px */
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  box-shadow: var(--ag-shadow-sm);
}
.dev-t {
  font-size: 13px;
  font-weight: 600;
}
</style>
