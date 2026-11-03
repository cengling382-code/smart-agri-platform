<script setup>
/** 页面 54 · 智慧农业总览大屏：园区概况、种植面积、设备状态、告警数量、产量汇总、GIS 地图点位 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import CountUp from '@/components/ui/CountUp.vue'
import { darkBase, darkAxis, SCREEN_COLORS } from '@/utils/screenCharts'

const stats = ref(null)
const alarms = ref([])
const alarmIdx = ref(0)
let timers = []

const mapPlots = [
  { name: '1号智能大棚', shape: [[18, 12], [34, 12], [34, 26], [18, 26]], color: '#7DC383' },
  { name: '2号智能大棚', shape: [[36, 12], [52, 12], [52, 26], [36, 26]], color: '#7DC383' },
  { name: '3号育苗棚', shape: [[18, 28], [34, 28], [34, 40], [18, 40]], color: '#9FC3DD' },
  { name: '东大田A区', shape: [[56, 10], [88, 10], [88, 34], [56, 34]], color: '#FFB37B' },
  { name: '东大田B区', shape: [[56, 36], [88, 36], [88, 58], [56, 58]], color: '#FFB37B' },
  { name: '西山坡果园', shape: [[10, 44], [50, 44], [50, 72], [10, 72]], color: '#E89552' },
  { name: '南湖1号塘', shape: [[56, 62], [88, 62], [88, 84], [56, 84]], color: '#8FB3CC' },
  { name: '牧场1号舍', shape: [[12, 76], [48, 76], [48, 92], [12, 92]], color: '#B17179' },
]
const mapDevices = Array.from({ length: 26 }, (_, i) => ({
  x: 12 + ((i * 37) % 78), y: 10 + ((i * 53) % 84), fault: i % 9 === 4,
}))

const deviceOptions = computed(() => {
  const rows = stats.value?.deviceTypes || []
  return {
    ...darkBase,
    tooltip: { ...darkBase.tooltip, trigger: 'item' },
    legend: { ...darkBase.legend, bottom: 0 },
    series: [{
      type: 'pie', radius: ['46%', '70%'], center: ['50%', '44%'],
      itemStyle: { borderColor: 'rgba(6,25,42,.9)', borderWidth: 2 }, label: { show: false },
      data: rows.map((r, i) => ({ name: r.name, value: r.total, itemStyle: { color: SCREEN_COLORS[i % SCREEN_COLORS.length] } })),
    }],
  }
})

const yieldOptions = computed(() => {
  const months = ['6月', '7月', '8月', '9月', '10月', '11月']
  const data = [12400, 15800, 18600, 15200, 26800, 29600]
  return {
    ...darkBase,
    tooltip: { ...darkBase.tooltip, trigger: 'axis' },
    grid: { left: 8, right: 10, top: 28, bottom: 0, containLabel: true },
    xAxis: darkAxis({ type: 'category', data: months }),
    yAxis: darkAxis({ type: 'value' }),
    series: [{
      type: 'bar', barWidth: 16,
      data: data.map((v, i) => ({
        value: v,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#7DC383' }, { offset: 1, color: 'rgba(159,195,221,.15)' }] }, borderRadius: [4, 4, 0, 0] },
      })),
    }],
  }
})

const totalArea = 353.4
const HEAD_METRICS = computed(() => [
  { label: '园区总数', value: stats.value?.parks ?? 4, unit: '个', color: '#9FC3DD' },
  { label: '种植面积', value: totalArea, unit: '亩', color: '#7DC383', decimals: 1 },
  { label: '在线设备', value: stats.value?.online ?? 0, unit: `台 / 共${stats.value?.devices ?? 0}台`, color: '#FFB37B' },
  { label: '今日告警', value: stats.value?.todayAlarms ?? 0, unit: '条', color: '#E84A5F' },
  { label: '年度产量', value: 118400, unit: 'kg', color: '#B17179' },
])

onMounted(async () => {
  try {
  const { statsApi, alarmApi } = await import('@/api')
  const [d, al] = await Promise.all([statsApi.dashboard(), alarmApi.page({ status: 'pending', page: 1, size: 6 })])
  stats.value = d
  alarms.value = al.list
  } catch (e) {
    console.warn('[ScreenOverview]', e?.message || e)
  }
  timers.push(setInterval(() => {
    if (alarms.value.length) alarmIdx.value = (alarmIdx.value + 1) % alarms.value.length
  }, 3500))
})
onBeforeUnmount(() => timers.forEach(clearInterval))
</script>

<template>
  <div class="screen-overview">
    <!-- 顶部核心指标 -->
    <div class="head-metrics">
      <div v-for="m in HEAD_METRICS" :key="m.label" class="hm-item screen-panel">
        <span class="hm-value mono-num" :style="{ color: m.color }">
          <CountUp :value="m.value" :decimals="m.decimals || 0" />
        </span>
        <span class="hm-label">{{ m.label }} <i>{{ m.unit }}</i></span>
      </div>
    </div>

    <!-- 三栏主体 -->
    <div class="main-grid">
      <!-- 左列 -->
      <div class="col">
        <div class="screen-panel panel">
          <div class="p-title">设备状态分布</div>
          <div class="p-chart" style="height: 200px">
            <v-chart-dummy :options="deviceOptions" />
          </div>
        </div>
        <div class="screen-panel panel">
          <div class="p-title">产量汇总（月度 / kg）</div>
          <div class="p-chart" style="height: 210px">
            <v-chart-dummy :options="yieldOptions" />
          </div>
        </div>
      </div>

      <!-- 中列：GIS 地图 -->
      <div class="col center-col">
        <div class="screen-panel panel map-panel">
          <div class="p-title">园区 GIS 总览（地块 / 设备点位）</div>
          <svg class="gis-map" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="园区地块与设备点位大屏地图">
            <defs>
              <radialGradient id="mapGlow" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stop-color="rgba(159,195,221,.10)" />
                <stop offset="100%" stop-color="transparent" />
              </radialGradient>
            </defs>
            <rect width="100" height="100" fill="url(#mapGlow)" />
            <path d="M 0 42 L 100 40" stroke="rgba(143,182,216,.25)" stroke-width="0.5" stroke-dasharray="2 1.5" fill="none" />
            <path d="M 52 0 L 54 100" stroke="rgba(143,182,216,.25)" stroke-width="0.5" stroke-dasharray="2 1.5" fill="none" />
            <polygon
              v-for="p in mapPlots" :key="p.name"
              :points="p.shape.map((pt) => pt.join(',')).join(' ')"
              :fill="p.color + '30'" :stroke="p.color" stroke-width="0.35"
            />
            <text v-for="p in mapPlots" :key="'t' + p.name" :x="p.shape[0][0] + 1" :y="p.shape[0][1] + 3" font-size="1.9" fill="rgba(226,243,255,.8)">{{ p.name }}</text>
            <g v-for="(d, i) in mapDevices" :key="'d' + i">
              <circle :cx="d.x" :cy="d.y" r="1.6" :fill="d.fault ? 'rgba(232,74,95,.25)' : 'rgba(159,195,221,.2)'">
                <animate attributeName="r" values="1.2;2.2;1.2" :dur="2 + (i % 5) * 0.4 + 's'" repeatCount="indefinite" />
              </circle>
              <circle :cx="d.x" :cy="d.y" r="0.7" :fill="d.fault ? '#E84A5F' : '#9FC3DD'" />
            </g>
          </svg>
          <div class="map-legend">
            <span v-for="p in mapPlots" :key="p.name"><i :style="{ background: p.color }"></i>{{ p.name }}</span>
          </div>
        </div>
      </div>

      <!-- 右列 -->
      <div class="col">
        <div class="screen-panel panel">
          <div class="p-title">实时告警</div>
          <transition name="fade" mode="out-in">
            <div v-if="alarms.length" :key="alarmIdx" class="alarm-item">
              <div class="ai-head">
                <span class="ai-level" :style="{ background: alarms[alarmIdx].level === 3 ? '#E84A5F' : alarms[alarmIdx].level === 2 ? '#FFB37B' : '#8FB3CC' }">
                  {{ alarms[alarmIdx].level === 3 ? '紧急' : alarms[alarmIdx].level === 2 ? '重要' : '一般' }}
                </span>
                <span class="ai-type">{{ alarms[alarmIdx].type }}</span>
              </div>
              <p class="ai-content">{{ alarms[alarmIdx].content }}</p>
              <span class="ai-time mono-num">{{ alarms[alarmIdx].time }}</span>
            </div>
            <div v-else class="ai-empty">暂无待处理告警</div>
          </transition>
          <div class="alarm-dots">
            <i v-for="(a, i) in alarms" :key="a.id" :class="{ on: i === alarmIdx }"></i>
          </div>
        </div>

        <div class="screen-panel panel">
          <div class="p-title">地块作物概况</div>
          <div class="plot-stats">
            <div v-for="(p, i) in mapPlots.slice(0, 6)" :key="p.name" class="ps-row">
              <span class="ps-name">{{ p.name }}</span>
              <div class="ps-bar"><i :style="{ width: 92 - i * 11 + '%', background: p.color }"></i></div>
              <span class="ps-val mono-num">{{ (353.4 * (1 - i * 0.13)).toFixed(0) }} 亩</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/** 大屏内联轻量图表：options 变化时重绘（复用 echarts） */
import * as echarts from 'echarts'
import { defineComponent, h, ref, watch, onMounted, onBeforeUnmount } from 'vue'

const VChartDummy = defineComponent({
  name: 'VChartDummy',
  props: { options: { type: Object, default: () => ({}) } },
  setup(props) {
    const el = ref(null)
    let chart = null
    let ro = null
    onMounted(() => {
      chart = echarts.init(el.value)
      chart.setOption(props.options)
      ro = new ResizeObserver(() => chart?.resize())
      ro.observe(el.value)
    })
    watch(() => props.options, (o) => o && chart?.setOption(o), { deep: true })
    onBeforeUnmount(() => {
      ro?.disconnect()
      chart?.dispose()
    })
    return () => h('div', { ref: el, style: 'width:100%;height:100%' })
  },
})

export default {
  components: { 'v-chart-dummy': VChartDummy },
}
</script>

<style scoped>
.screen-overview {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head-metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  flex: none;
}
.hm-item {
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hm-value {
  font-size: 30px;
  font-weight: 800;
}
.hm-label {
  font-size: 12px;
  color: var(--ag-screen-text-dim);
}
.hm-label i {
  font-style: normal;
  font-size: 11px;
  opacity: 0.7;
}
.main-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
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
  border-left: 3px solid var(--ag-screen-cyan);
  margin-bottom: 10px;
  flex: none;
}
.p-chart {
  flex: 1;
  min-height: 0;
}
.map-panel {
  position: relative;
}
.gis-map {
  flex: 1;
  width: 100%;
  min-height: 0;
}
.map-legend {
  position: absolute;
  bottom: 10px;
  left: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 80%;
}
.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--ag-screen-text-dim);
}
.map-legend i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.alarm-item {
  flex: 1;
  min-height: 0;
}
.ai-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-level {
  font-size: 10px;
  color: #04121e;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--ag-radius-sm); /* 决策依据：AI 级别标签属小控件，对齐控件档 6px */
}
.ai-type {
  color: var(--ag-screen-text);
  font-weight: 600;
}
.ai-content {
  color: var(--ag-screen-text-dim);
  font-size: 12.5px;
  line-height: 1.8;
  margin: 10px 0;
}
.ai-time {
  font-size: 11px;
  color: rgba(143, 182, 216, 0.6);
}
.ai-empty {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--ag-screen-text-dim);
}
.alarm-dots {
  display: flex;
  gap: 5px;
  justify-content: center;
  padding-top: 8px;
  flex: none;
}
.alarm-dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(143, 182, 216, 0.3);
  transition: background 0.3s;
}
.alarm-dots i.on {
  background: var(--ag-screen-cyan);
}
.plot-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.ps-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ps-name {
  width: 86px;
  font-size: 12px;
  color: var(--ag-screen-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ps-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(143, 182, 216, 0.12);
  overflow: hidden;
}
.ps-bar i {
  display: block;
  height: 100%;
  border-radius: 4px;
  transition: width 1s var(--ag-ease);
}
.ps-val {
  width: 58px;
  text-align: right;
  font-size: 12px;
  color: var(--ag-screen-text-dim);
}
</style>
