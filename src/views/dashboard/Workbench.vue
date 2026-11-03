<script setup>
/** 页面 53 · 工作台首页（数据总览）：核心指标 + 环境实时 + 趋势曲线 + 告警轮播 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { PageHeader, StatCard, ChartCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { statsApi } from '@/api'

const router = useRouter()
const loading = ref(true)
const data = ref(null)
const range = ref('week') // day | week | month
const alarmIdx = ref(0)
let carouselTimer = null

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

const QUICK = [
  { title: '设备控制', icon: 'SwitchButton', path: '/iot/control', color: '#699C78' },
  { title: '数据监测', icon: 'TrendCharts', path: '/iot/sensors', color: '#4C6983' },
  { title: '视频监控', icon: 'VideoCamera', path: '/iot/video', color: '#06b6d4' },
  { title: '农事工单', icon: 'Tickets', path: '/farm/orders', color: '#E89552' },
  { title: '溯源批次', icon: 'Postcard', path: '/trace/batches', color: '#B17179' },
  { title: '总览大屏', icon: 'Monitor', path: '/screens/overview', color: '#38556A' },
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
  <div class="page" v-loading="loading">
    <PageHeader title="工作台" desc="园区运营全局视图 · 核心指标、环境实时数据与趋势一览">
      <template #actions>
        <el-radio-group v-model="range" size="small">
          <el-radio-button value="day">今日</el-radio-button>
          <el-radio-button value="week">本周</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
        </el-radio-group>
      </template>
    </PageHeader>

    <!-- 核心指标卡片 -->
    <div class="stat-grid stagger" v-if="data">
      <StatCard label="园区总数" :value="data.parks" unit="个" icon="OfficeBuilding" tone="green" :trend="8" />
      <StatCard label="设备总数" :value="data.devices" unit="台" icon="Cpu" tone="blue" :trend="5" />
      <StatCard label="设备在线率" :value="data.onlineRate" unit="%" icon="Connection" tone="cyan" :trend="2" :decimals="0" />
      <StatCard label="今日未处理告警" :value="data.todayAlarms" unit="条" icon="Bell" tone="red" :trend="-12" />
      <StatCard label="本月产量" :value="data.monthYield" unit="kg" icon="Cherry" tone="amber" :trend="16" />
    </div>

    <!-- 快捷入口 -->
    <div class="quick-row stagger" v-if="data">
      <button v-for="q in QUICK" :key="q.path" class="quick-item" @click="router.push(q.path)">
        <span class="q-icon" :style="{ background: q.color + '18', color: q.color }">
          <el-icon :size="20"><component :is="q.icon" /></el-icon>
        </span>
        <span class="q-label">{{ q.title }}</span>
      </button>
    </div>

    <div class="grid-2-1" v-if="data">
      <!-- 环境趋势 -->
      <div class="ag-card anim-up">
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
      </div>

      <!-- 告警轮播 -->
      <div class="ag-card anim-up anim-delay-1">
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
            <el-empty v-else description="暂无待处理告警 🎉" :image-size="80" />
          </transition>
          <el-divider />
          <div class="env-mini">
            <div v-for="(e, i) in data.env" :key="i" class="env-item">
              <span class="env-name">{{ e.name }}</span>
              <span class="env-val mono-num">{{ e.temp }}℃ / {{ e.hum }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-3" v-if="data">
      <!-- 设备状态 -->
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>设备状态分布</div></div>
        <div class="ag-card__body">
          <ChartCard :options="deviceOptions" :height="250" />
        </div>
      </div>
      <!-- 工单 -->
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>农事工单状态</div></div>
        <div class="ag-card__body">
          <ChartCard :options="orderOptions" :height="250" />
        </div>
      </div>
      <!-- 环境实时 -->
      <div class="ag-card anim-up anim-delay-2">
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.quick-row {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.quick-item {
  flex: 1;
  min-width: 110px;
  border: 1px solid var(--ag-border-light);
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：快捷入口小卡属卡片类，对齐卡片档 10px */
  padding: 13px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: all 0.25s var(--ag-ease);
}
.quick-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--ag-shadow);
  border-color: var(--ag-green-300);
}
.q-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--ag-radius); /* 决策依据：42px 图标块非控件，按卡片档归 10px */
  display: grid;
  place-items: center;
  transition: transform 0.3s var(--ag-ease-spring);
}
/* 决策依据：hover 缩放旋转属装饰性动效，按简约高级规范移除（原 .quick-item:hover .q-icon 仅此一条声明） */
.q-label {
  font-size: 12px;
  color: var(--ag-text-2);
}

.grid-2-1 {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
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
  color: #E89552;
  width: 58px;
  text-align: right;
}
.env-h {
  color: #4C6983;
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
.lg-t { background: #E89552; }
.lg-h { background: #4C6983; }

@media (max-width: 1280px) {
  .stat-grid { grid-template-columns: repeat(3, 1fr); }
  .grid-2-1, .grid-3 { grid-template-columns: 1fr; }
}
</style>
