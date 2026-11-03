<script setup>
/** 页面 57 · 设备运维大屏：设备在线率、故障统计、运维工单进度 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ScreenChart from '@/components/ui/ScreenChart.vue'
import CountUp from '@/components/ui/CountUp.vue'
import { darkBase, darkAxis, SCREEN_COLORS } from '@/utils/screenCharts'
import { deviceApi, controlApi } from '@/api'

const devices = ref([])
const logs = ref([])
let timer = null

const total = computed(() => devices.value.length)
const online = computed(() => devices.value.filter((d) => d.status === 'online').length)
const offline = computed(() => devices.value.filter((d) => d.status === 'offline').length)
const fault = computed(() => devices.value.filter((d) => d.status === 'fault').length)
const rate = computed(() => (total.value ? Math.round((online.value / total.value) * 100) : 0))

const statusOptions = computed(() => ({
  ...darkBase,
  tooltip: { ...darkBase.tooltip, trigger: 'item' },
  legend: { ...darkBase.legend, bottom: 0 },
  series: [{
    type: 'pie', radius: ['52%', '74%'], center: ['50%', '44%'],
    itemStyle: { borderColor: 'rgba(6,25,42,.9)', borderWidth: 2 }, label: { show: false },
    data: [
      { name: '在线', value: online.value, itemStyle: { color: '#7DC383' } },
      { name: '离线', value: offline.value, itemStyle: { color: '#6E7883' } },
      { name: '故障', value: fault.value, itemStyle: { color: '#E84A5F' } },
    ],
  }],
}))

const typeOptions = computed(() => {
  const types = { gateway: '网关', sensor: '传感器', actuator: '执行器', camera: '摄像头' }
  return {
    ...darkBase,
    tooltip: { ...darkBase.tooltip, trigger: 'axis' },
    legend: { ...darkBase.legend, top: 0 },
    grid: { left: 8, right: 14, top: 34, bottom: 0, containLabel: true },
    xAxis: darkAxis({ type: 'category', data: Object.values(types) }),
    yAxis: darkAxis({ type: 'value' }),
    series: [
      { name: '在线', type: 'bar', stack: 'a', barWidth: 26, data: Object.keys(types).map((t) => devices.value.filter((d) => d.type === t && d.status === 'online').length), itemStyle: { color: '#7DC383', borderRadius: [0, 0, 0, 0] } },
      { name: '离线', type: 'bar', stack: 'a', data: Object.keys(types).map((t) => devices.value.filter((d) => d.type === t && d.status === 'offline').length), itemStyle: { color: '#6E7883' } },
      { name: '故障', type: 'bar', stack: 'a', data: Object.keys(types).map((t) => devices.value.filter((d) => d.type === t && d.status === 'fault').length), itemStyle: { color: '#E84A5F', borderRadius: [4, 4, 0, 0] } },
    ],
  }
})

const WORK_ORDERS = [
  { code: 'WO-2026-0211', device: '牧场氨气传感器', issue: '通信异常，疑似网关掉线', status: '处理中', pct: 60 },
  { code: 'WO-2026-0208', device: '大棚2号球机', issue: '画面模糊，需调整焦距', status: '待派单', pct: 10 },
  { code: 'WO-2026-0205', device: '鱼塘增氧机', issue: '例行保养，更换滤芯', status: '已完成', pct: 100 },
  { code: 'WO-2026-0203', device: '土壤PH传感器#A03', issue: '数据漂移，重新标定', status: '已完成', pct: 100 },
]

const KPI = computed(() => [
  { label: '设备总数', value: total.value, unit: '台', color: '#9FC3DD' },
  { label: '在线率', value: rate.value, unit: '%', color: '#7DC383' },
  { label: '离线设备', value: offline.value, unit: '台', color: '#6E7883' },
  { label: '故障设备', value: fault.value, unit: '台', color: '#E84A5F' },
])

async function load() {
  try {
    devices.value = await deviceApi.all()
    const lg = await controlApi.logs({ page: 1, size: 8 })
    logs.value = lg.list
  } catch (e) {
    console.warn('[ScreenDevice]', e?.message || e)
  }
}

onMounted(async () => {
  await load()
  timer = setInterval(load, 30000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="screen-device">
    <div class="kpi-row">
      <div v-for="k in KPI" :key="k.label" class="screen-panel kpi-item">
        <span class="k-val mono-num" :style="{ color: k.color }"><CountUp :value="k.value" /></span>
        <span class="k-label">{{ k.label }} <i>{{ k.unit }}</i></span>
      </div>
    </div>

    <div class="main-grid">
      <!-- 左：状态环形 + 类型柱状 -->
      <div class="col">
        <div class="screen-panel panel">
          <div class="p-title">设备状态占比</div>
          <div class="chart-wrap" style="height: 220px"><ScreenChart :options="statusOptions" /></div>
        </div>
        <div class="screen-panel panel">
          <div class="p-title">分类状态统计</div>
          <div class="chart-wrap" style="height: 230px"><ScreenChart :options="typeOptions" /></div>
        </div>
      </div>

      <!-- 中：在线率仪表 + 故障清单 -->
      <div class="col">
        <div class="screen-panel panel">
          <div class="p-title">综合在线率</div>
          <div class="gauge-center">
            <div class="gauge-ring" :style="{ '--p': rate }">
              <span class="g-val mono-num">{{ rate }}<i>%</i></span>
            </div>
            <div class="g-legend">
              <span><i style="background:#7DC383"></i>在线 {{ online }}</span>
              <span><i style="background:#6E7883"></i>离线 {{ offline }}</span>
              <span><i style="background:#E84A5F"></i>故障 {{ fault }}</span>
            </div>
          </div>
        </div>
        <div class="screen-panel panel">
          <div class="p-title">运维工单进度</div>
          <div class="wo-list">
            <div v-for="w in WORK_ORDERS" :key="w.code" class="wo-row">
              <div class="wo-head">
                <span class="wo-code mono-num">{{ w.code }}</span>
                <span class="wo-status" :class="{ done: w.status === '已完成' }">{{ w.status }}</span>
              </div>
              <div class="wo-dev">{{ w.device }} — {{ w.issue }}</div>
              <div class="wo-bar"><i :style="{ width: w.pct + '%', background: w.status === '已完成' ? '#7DC383' : w.status === '处理中' ? '#FFB37B' : '#8FB3CC' }"></i></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：实时指令流 -->
      <div class="screen-panel panel">
        <div class="p-title">设备指令实时流（30s 刷新）</div>
        <transition-group name="log" tag="div" class="log-stream">
          <div v-for="(l, i) in logs" :key="l.id + '-' + i" class="log-row">
            <span class="lg-dot" :class="l.result === '成功' ? 'ok' : 'fail'"></span>
            <span class="lg-time mono-num">{{ l.time.slice(11) }}</span>
            <span class="lg-dev">{{ l.device }}</span>
            <span class="lg-action">{{ l.action }}</span>
            <span class="lg-src">{{ l.source === 'manual' ? '手动' : '自动' }}</span>
          </div>
        </transition-group>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen-device {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  flex: none;
}
.kpi-item {
  padding: 14px 18px;
}
.k-val {
  font-size: 30px;
  font-weight: 800;
  display: block;
}
.k-label {
  font-size: 12px;
  color: var(--ag-screen-text-dim);
}
.k-label i {
  font-style: normal;
  font-size: 11px;
}
.main-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.1fr 1fr;
  gap: 14px;
  min-height: 0;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.panel {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.p-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ag-screen-text);
  letter-spacing: 2px;
  padding-left: 10px;
  border-left: 3px solid var(--ag-screen-amber);
  margin-bottom: 12px;
  flex: none;
}
.chart-wrap {
  flex: 1;
  min-height: 0;
}
.gauge-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.gauge-ring {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: conic-gradient(var(--ag-screen-green) calc(var(--p) * 1%), rgba(143, 182, 216, 0.12) 0);
  display: grid;
  place-items: center;
  position: relative;
  /* 决策依据：agCountGlow 已改为一次性淡入，保留 infinite 会令仪表环不停闪烁，故移除该动画 */
}
.gauge-ring::before {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: #22334A;
}
.g-val {
  position: relative;
  font-size: 34px;
  font-weight: 800;
  color: var(--ag-screen-green);
}
.g-val i {
  font-style: normal;
  font-size: 14px;
}
.g-legend {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: var(--ag-screen-text-dim);
}
.g-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.g-legend i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.wo-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 6px;
}
.wo-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.wo-code {
  color: var(--ag-screen-cyan);
}
.wo-status {
  color: var(--ag-screen-amber);
}
.wo-status.done {
  color: var(--ag-screen-green);
}
.wo-dev {
  font-size: 11px;
  color: var(--ag-screen-text-dim);
  margin: 3px 0 5px;
}
.wo-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(143, 182, 216, 0.12);
  overflow: hidden;
}
.wo-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
}
.log-stream {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.log-row {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  background: rgba(13, 46, 76, 0.4);
  border-radius: var(--ag-radius); /* 决策依据：日志行属卡片类，对齐卡片档 10px */
  padding: 7px 10px;
}
.lg-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.lg-dot.ok { background: var(--ag-screen-green); }
.lg-dot.fail { background: var(--ag-screen-red); }
.lg-time {
  color: rgba(143, 182, 216, 0.7);
  flex: none;
}
.lg-dev {
  flex: 1;
  color: var(--ag-screen-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lg-action {
  color: var(--ag-screen-text-dim);
  flex: none;
}
.lg-src {
  font-size: 10px;
  color: var(--ag-screen-cyan);
  flex: none;
}
.log-enter-active {
  transition: all 0.4s var(--ag-ease);
}
.log-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.log-move {
  transition: transform 0.4s var(--ag-ease);
}
</style>
