<script setup>
/**
 * 页面 53 · 工作台首页（数据总览）v2 —— 沉浸式工作台
 * 视觉彻底重构：告别「PageHeader + StatCard 网格」的通用后台样式，
 * 改为「墨色 Hero（问候 + 快捷入口）→ 白色 KPI 分栏条 → 便当格数据区」的
 * 三段式沉浸布局。数据源（statsApi.dashboard）与全部跳转逻辑保持不变。
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ChartCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { statsApi } from '@/api'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const data = ref(null)
const range = ref('week') // day | week | month
const alarmIdx = ref(0)
let carouselTimer = null

/* ---------- 问候语：按时段变化 ---------- */
const hour = new Date().getHours()
const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
const dateText = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

/* ---------- 趋势曲线 ---------- */
const trendOptions = computed(() => {
  if (!data.value) return {}
  const rows = data.value.weekTrend
  const x = rows.map((r) => r.day)
  const mk = (key, name, color) => ({
    name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data: rows.map((r) => r[key]),
    lineStyle: { width: 2.5, color },
    itemStyle: { color },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '33' }, { offset: 1, color: color + '02' }] } },
  })
  return {
    color: CHART_COLORS,
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, textStyle: { color: '#6E7883' } },
    grid: { left: 10, right: 16, top: 36, bottom: 4, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: x, axisLine: { lineStyle: { color: '#E7E9E8' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#F0F1F1' } } },
    series: [mk('temp', '温度(℃)', CHART_COLORS[0]), mk('hum', '湿度(%)', CHART_COLORS[1]), mk('light', '光照(klx)', CHART_COLORS[2])],
  }
})

const deviceOptions = computed(() => {
  if (!data.value) return {}
  const rows = data.value.deviceTypes
  return {
    tooltip: { trigger: 'item', formatter: '{b}<br/>在线 {c} / 总数 {d}台' },
    legend: { bottom: 0, textStyle: { color: '#6E7883' }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: rows.map((r, i) => ({ name: r.name, value: r.total, itemStyle: { color: CHART_COLORS[i] } })),
    }],
  }
})

const orderOptions = computed(() => {
  if (!data.value) return {}
  const rows = data.value.workOrderStatus
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#6E7883' }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'], roseType: 'radius',
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: rows.map((r, i) => ({ name: r.name, value: r.value, itemStyle: { color: CHART_COLORS[(i + 2) % CHART_COLORS.length] } })),
    }],
  }
})

const statusText = { pending: '未处理', confirmed: '已确认', resolved: '已处置', archived: '已归档' }
const levelTag = { 1: 'info', 2: 'warning', 3: 'danger' }
const levelText = { 1: '一般', 2: '重要', 3: '紧急' }

/* ---------- KPI 分栏条：与旧 StatCard 同数据，不同形制 ---------- */
const kpis = computed(() => {
  if (!data.value) return []
  return [
    { label: '园区总数', value: data.value.parks, unit: '个', trend: 8, icon: 'OfficeBuilding' },
    { label: '设备总数', value: data.value.devices, unit: '台', trend: 5, icon: 'Cpu' },
    { label: '设备在线率', value: data.value.onlineRate, unit: '%', trend: 2, icon: 'Connection' },
    { label: '今日未处理告警', value: data.value.todayAlarms, unit: '条', trend: -12, icon: 'Bell', goodWhenDown: true },
    { label: '本月产量', value: data.value.monthYield, unit: 'kg', trend: 16, icon: 'Cherry' },
  ]
})

/* ---------- 快捷入口（Hero 内玻璃胶囊） ---------- */
const QUICK = [
  { title: '设备控制', icon: 'SwitchButton', path: '/iot/control' },
  { title: '数据监测', icon: 'TrendCharts', path: '/iot/sensors' },
  { title: '视频监控', icon: 'VideoCamera', path: '/iot/video' },
  { title: '农事工单', icon: 'Tickets', path: '/farm/orders' },
  { title: '溯源批次', icon: 'Postcard', path: '/trace/batches' },
  { title: '总览大屏', icon: 'Monitor', path: '/screens/overview' },
]

onMounted(async () => {
  try {
    data.value = await statsApi.dashboard()
  } catch (e) {
    console.warn('[Workbench]', e?.message || e)
  } finally {
    loading.value = false
  }
  carouselTimer = setInterval(() => {
    if (data.value?.pendingAlarms?.length) alarmIdx.value = (alarmIdx.value + 1) % data.value.pendingAlarms.length
  }, 4000)
})
onBeforeUnmount(() => clearInterval(carouselTimer))
</script>

<template>
  <div class="page wb" v-loading="loading">
    <!-- ========== ① 墨色 Hero：问候 + 快捷入口 ========== -->
    <section class="hero" aria-label="工作台概览">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-main">
        <p class="hero-hello">{{ greeting }}，{{ auth.displayName }}</p>
        <h1 class="hero-title">园区运营总览</h1>
        <p class="hero-sub">
          <span>{{ dateText }}</span>
          <i class="hero-sep" aria-hidden="true"></i>
          <span>武汉 19℃ 多云</span>
          <template v-if="data">
            <i class="hero-sep" aria-hidden="true"></i>
            <span class="hero-alarm" role="link" tabindex="0" @click="router.push('/iot/alarms')" @keyup.enter="router.push('/iot/alarms')">
              <span class="hero-alarm-dot" aria-hidden="true"></span>
              待处理告警 <b class="mono-num">{{ data.todayAlarms }}</b> 条
            </span>
          </template>
        </p>
        <!-- 快捷入口：玻璃胶囊 -->
        <div class="hero-quick" role="navigation" aria-label="快捷入口">
          <button v-for="q in QUICK" :key="q.path" class="hq-chip" @click="router.push(q.path)">
            <el-icon :size="15"><component :is="q.icon" /></el-icon>
            <span>{{ q.title }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ========== ② KPI 分栏条：白色面板压住 Hero 下缘 ========== -->
    <section v-if="data" class="kpi-strip" aria-label="核心指标">
      <div v-for="(k, i) in kpis" :key="k.label" class="kpi-cell" :class="{ 'kpi-divide': i > 0 }">
        <div class="kpi-top">
          <el-icon :size="15" class="kpi-icon"><component :is="k.icon" /></el-icon>
          <span class="kpi-label">{{ k.label }}</span>
        </div>
        <div class="kpi-value">
          <span class="kpi-num mono-num">{{ k.value }}</span>
          <span class="kpi-unit">{{ k.unit }}</span>
        </div>
        <span class="kpi-trend" :class="k.trend >= 0 !== !!k.goodWhenDown ? 'up' : 'down'">
          {{ k.trend >= 0 ? '▲' : '▼' }} {{ Math.abs(k.trend) }}%
          <em>较上周</em>
        </span>
      </div>
    </section>

    <!-- ========== ③ 便当格数据区 ========== -->
    <div class="bento-a" v-if="data">
      <!-- 环境趋势 -->
      <article class="ag-card bento-card">
        <div class="ag-card__head">
          <div class="ag-card__title"><span class="dot"></span>环境趋势曲线（温湿度 / 光照）</div>
          <el-radio-group v-model="range" size="small">
            <el-radio-button value="day">日</el-radio-button>
            <el-radio-button value="week">周</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
          </el-radio-group>
        </div>
        <div class="ag-card__body">
          <ChartCard :options="trendOptions" :height="290" />
        </div>
      </article>

      <!-- 告警处置 -->
      <article class="ag-card bento-card">
        <div class="ag-card__head">
          <div class="ag-card__title"><span class="dot"></span>待处理告警</div>
          <el-button link type="primary" @click="router.push('/iot/alarms')">全部告警 →</el-button>
        </div>
        <div class="ag-card__body">
          <transition name="fade" mode="out-in">
            <div v-if="data.pendingAlarms.length" :key="alarmIdx" class="alarm-carousel">
              <div class="alarm-top">
                <el-tag :type="levelTag[data.pendingAlarms[alarmIdx].level]" effect="dark" size="small">
                  {{ levelText[data.pendingAlarms[alarmIdx].level] }}
                </el-tag>
                <span class="alarm-type">{{ data.pendingAlarms[alarmIdx].type }}</span>
                <span class="alarm-time mono-num">{{ data.pendingAlarms[alarmIdx].time }}</span>
              </div>
              <p class="alarm-content">{{ data.pendingAlarms[alarmIdx].content }}</p>
              <div class="alarm-foot">
                <span class="text-dim">来源：{{ data.pendingAlarms[alarmIdx].source }}</span>
                <el-button size="small" type="primary" @click="router.push('/iot/alarms')">立即处置</el-button>
              </div>
            </div>
            <el-empty v-else description="暂无待处理告警" :image-size="80" />
          </transition>
          <el-divider />
          <div class="env-mini">
            <div v-for="(e, i) in data.env" :key="i" class="env-item">
              <span class="env-name">{{ e.name }}</span>
              <span class="env-val mono-num">{{ e.temp }}℃ / {{ e.hum }}%</span>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div class="bento-b" v-if="data">
      <!-- 设备状态 -->
      <article class="ag-card bento-card">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>设备状态分布</div></div>
        <div class="ag-card__body">
          <ChartCard :options="deviceOptions" :height="250" />
        </div>
      </article>
      <!-- 工单 -->
      <article class="ag-card bento-card">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>农事工单状态</div></div>
        <div class="ag-card__body">
          <ChartCard :options="orderOptions" :height="250" />
        </div>
      </article>
      <!-- 环境实时 -->
      <article class="ag-card bento-card">
        <div class="ag-card__head">
          <div class="ag-card__title"><span class="dot"></span>环境实时数据</div>
          <el-button link type="primary" @click="router.push('/iot/sensors')">详情 →</el-button>
        </div>
        <div class="ag-card__body env-list">
          <div v-for="(e, i) in data.env" :key="i" class="env-row">
            <span class="pulse-dot is-on"></span>
            <span class="env-plot">{{ e.name }}</span>
            <span class="mono-num env-t">{{ e.temp }}℃</span>
            <span class="mono-num env-h">{{ e.hum }}%</span>
          </div>
          <div class="env-legend text-dim">
            <span><i class="lg lg-t"></i>温度</span><span><i class="lg lg-h"></i>湿度</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* ========== ① 墨色 Hero ========== */
.hero {
  position: relative;
  overflow: hidden;
  margin-bottom: -44px; /* KPI 条上叠 44px，形成「白条压墨」的层次 */
  padding: 40px 36px 76px;
  border-radius: var(--ag-radius);
  background: linear-gradient(135deg, var(--ag-navy-800) 0%, var(--ag-navy-900) 58%, #101a33 100%);
  color: #fff;
}
/* 右上角电光蓝光晕：唯一的彩色强调，呼应 accent */
.hero-glow {
  position: absolute;
  top: -140px;
  right: -80px;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(7, 76, 224, 0.45), transparent 70%);
  pointer-events: none;
}
.hero-hello {
  margin: 0 0 6px;
  font-size: var(--ag-fs-caption);
  letter-spacing: var(--ag-ls-caption);
  color: rgba(232, 238, 244, 0.62);
}
.hero-title {
  margin: 0;
  font-family: var(--ag-font-display);
  font-size: var(--ag-fs-display);
  font-weight: 700;
  letter-spacing: var(--ag-ls-display);
  line-height: var(--ag-lh-display);
  color: #fff; /* 显式声明：全局 h1 的墨色会压过 .hero 的继承白色 */
}
.hero-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 12px 0 0;
  font-size: var(--ag-fs-caption);
  color: rgba(232, 238, 244, 0.72);
}
.hero-sep {
  width: 1px;
  height: 12px;
  background: rgba(232, 238, 244, 0.24);
}
.hero-alarm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: var(--ag-radius-pill);
  background: rgba(232, 74, 95, 0.16);
  color: #ffb9c1;
  cursor: pointer;
  transition: background var(--ag-dur) var(--ag-ease);
}
.hero-alarm:hover {
  background: rgba(232, 74, 95, 0.28);
}
.hero-alarm b {
  font-weight: 700;
}
.hero-alarm-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ag-danger-light);
  animation: alarm-blink 1.6s ease-in-out infinite;
}
@keyframes alarm-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
/* 快捷入口：玻璃胶囊横排 */
.hero-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}
.hq-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--ag-radius-pill);
  background: rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.92);
  font: inherit;
  font-size: var(--ag-fs-micro);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--ag-dur) var(--ag-ease), border-color var(--ag-dur) var(--ag-ease),
    transform 0.1s ease-out;
}
.hq-chip:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.28);
}
.hq-chip:active {
  transform: scale(0.95);
}

/* ========== ② KPI 分栏条 ========== */
.kpi-strip {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  margin-bottom: var(--ag-space-5);
  padding: 18px 8px;
  border-radius: var(--ag-radius);
  background: var(--ag-bg-surface);
  border: 1px solid var(--ag-border);
  box-shadow: var(--ag-shadow);
}
.kpi-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 20px;
  min-width: 0;
}
.kpi-divide {
  border-left: 1px solid var(--ag-border-light);
}
.kpi-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.kpi-icon {
  color: var(--ag-green-600);
}
.kpi-label {
  font-size: var(--ag-fs-micro);
  letter-spacing: var(--ag-ls-micro);
  color: var(--ag-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.kpi-num {
  font-family: var(--ag-font-num);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.8px;
  line-height: 1.1;
  color: var(--ag-text-1);
}
.kpi-unit {
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-4);
}
.kpi-trend {
  font-size: var(--ag-fs-micro);
  font-family: var(--ag-font-num);
}
.kpi-trend em {
  font-style: normal;
  color: var(--ag-text-4);
  margin-left: 4px;
}
.kpi-trend.up {
  color: var(--ag-success);
}
.kpi-trend.down {
  color: var(--ag-danger);
}

/* ========== ③ 便当格 ========== */
.bento-a {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: var(--ag-space-5);
  margin-bottom: var(--ag-space-5);
}
.bento-b {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--ag-space-5);
}
.bento-card {
  min-width: 0;
}

.alarm-carousel {
  min-height: 128px;
}
.alarm-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.alarm-type {
  font-weight: 600;
}
.alarm-time {
  margin-left: auto;
  font-size: 12px;
  color: var(--ag-text-4);
}
.alarm-content {
  color: var(--ag-text-2);
  font-size: 13px;
  line-height: 1.8;
  margin: 10px 0;
}
.alarm-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.env-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}
.env-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ag-text-2);
  padding: 3px 0;
}
.env-item .env-val {
  color: var(--ag-green-700);
  font-weight: 600;
}

.env-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.env-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px dashed var(--ag-border-light);
  font-size: 13px;
}
.env-row:last-of-type {
  border-bottom: none;
}
.env-plot {
  flex: 1;
  color: var(--ag-text-2);
}
.env-t {
  color: var(--ag-warning);
  width: 58px;
  text-align: right;
}
.env-h {
  color: var(--ag-blue-600);
  width: 58px;
  text-align: right;
}
.env-legend {
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  padding-top: 8px;
}
.env-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.lg {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.lg-t { background: var(--ag-warning); }
.lg-h { background: var(--ag-blue-600); }

/* ---------- 响应式：三档断点 ---------- */
@media (max-width: 1280px) {
  .kpi-strip {
    grid-template-columns: repeat(3, 1fr);
    row-gap: 16px;
  }
  /* 换行后第二行首个不应继承左边线 */
  .kpi-cell:nth-child(4) {
    border-left: none;
  }
  .bento-a, .bento-b {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .hero {
    padding: 28px 20px 68px;
    margin-bottom: -40px;
  }
  .hero-title {
    font-size: 28px;
  }
  .kpi-strip {
    grid-template-columns: repeat(2, 1fr);
    padding: 14px 4px;
  }
  .kpi-cell {
    padding: 2px 14px;
  }
  .kpi-cell:nth-child(odd) {
    border-left: none;
  }
  .kpi-num {
    font-size: 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero-alarm-dot {
    animation: none;
  }
}
/* 触控设备：快捷入口胶囊放大到 44px 触控标准 */
@media (pointer: coarse) {
  .hq-chip {
    min-height: 44px;
    padding: 10px 18px;
  }
  .hero-alarm {
    min-height: 32px;
  }
}
</style>
