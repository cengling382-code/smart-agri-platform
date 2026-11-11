<script setup>
/** 页面 60 · 移动端实时环境数据页：空气/土壤/水体实时数据查看、趋势简表 */
import { ref, computed, onMounted } from 'vue'
import { plotApi, deviceApi } from '@/api'
import { onDataChange } from '@/composables/useDataVersion'

const plots = ref([])
const devices = ref([])
const activeId = ref(null)
const loading = ref(true)

const activePlot = computed(() => plots.value.find((p) => p.id === activeId.value))

/* 指标卡按地块类型取对应环境项：水产业看水体指标，畜禽舍看氨气/硫化氢，其余看设施环境 */
const CARDS = computed(() => {
  const e = activePlot.value?.env || {}
  const type = activePlot.value?.type
  if (type === '水产') {
    return [
      { label: '水体温度', value: e.waterT ?? '—', unit: '℃', color: 'var(--ag-warning)', icon: 'Sunny' },
      { label: '溶解氧', value: e.oxygen ?? '—', unit: 'mg/L', color: 'var(--ag-blue-600)', icon: 'Drizzling' },
      { label: 'PH 值', value: e.ph ?? '—', unit: '', color: 'var(--ag-rose)', icon: 'Odometer' },
      { label: '氨氮', value: e.ammonia ?? '—', unit: 'mg/L', color: 'var(--ag-green-600)', icon: 'Sunrise' },
    ]
  }
  if (type === '畜禽') {
    return [
      { label: '舍内温度', value: e.temp ?? '—', unit: '℃', color: 'var(--ag-warning)', icon: 'Sunny' },
      { label: '空气湿度', value: e.hum ?? '—', unit: '%', color: 'var(--ag-blue-600)', icon: 'Drizzling' },
      { label: '氨气浓度', value: e.nh3 ?? '—', unit: 'ppm', color: 'var(--ag-rose)', icon: 'Cloudy' },
      { label: '硫化氢', value: e.h2s ?? '—', unit: 'ppm', color: 'var(--ag-green-600)', icon: 'Sunrise' },
    ]
  }
  return [
    { label: '空气温度', value: e.temp ?? '—', unit: '℃', color: 'var(--ag-warning)', icon: 'Sunny' },
    { label: '空气湿度', value: e.hum ?? '—', unit: '%', color: 'var(--ag-blue-600)', icon: 'Drizzling' },
    { label: 'CO₂ 浓度', value: e.co2 ?? '—', unit: 'ppm', color: 'var(--ag-rose)', icon: 'Cloudy' },
    { label: '光照强度', value: e.light ?? '—', unit: 'klx', color: 'var(--ag-green-600)', icon: 'Sunrise' },
  ]
})

const simpleTrend = ref([])

/** 按当前地块查找温度传感器并重新拉取趋势，保证地块切换后数据实时变化 */
async function loadTrend() {
  try {
    const list = devices.value.filter((d) => d.plotId === activeId.value && d.type === 'sensor')
    const dev = list.find((d) => d.params?.includes('temp')) || list[0]
    if (!dev) {
      simpleTrend.value = []
      return
    }
    const r = await deviceApi.series(dev.id, 'temp', 24)
    simpleTrend.value = (r?.series || []).slice(-8)
  } catch (e) {
    console.warn('[MobileEnv] 趋势加载失败', e?.message || e)
  }
}
function selectPlot(id) {
  activeId.value = id
  loadTrend()
}

/** 数据版本变更时重新取数；保留用户当前选中的地块，避免刷新打断操作 */
async function load() {
  try {
    const [p, d] = await Promise.all([plotApi.all(), deviceApi.all()])
    plots.value = p
    devices.value = d
    if (!plots.value.some((x) => x.id === activeId.value)) activeId.value = plots.value[0]?.id ?? null
    await loadTrend()
  } catch (e) {
    console.warn('[MobileEnv]', e?.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
onDataChange(load, { debounce: 400 })
</script>

<template>
  <div class="m-page m-env" v-loading="loading">
    <div class="m-page-head">
      <div>
        <h1 class="m-page-title">实时环境数据</h1>
        <p class="m-page-desc">空气 / 土壤 / 水体实时监测 · 温度趋势</p>
      </div>
    </div>

    <!-- 地块筛选：对应 PC el-radio-button 选中态 -->
    <div class="m-seg plot-chips">
      <button v-for="p in plots" :key="p.id" :class="{ on: p.id === activeId }" @click="selectPlot(p.id)">
        {{ p.name.replace('号', '#').slice(0, 6) }}
      </button>
    </div>

    <!-- 实时卡：白卡 + 语义色图标，数值统一墨色（与 PC StatCard 同形制） -->
    <div class="env-grid">
      <div v-for="c in CARDS" :key="c.label" class="m-card e-card">
        <div class="e-top">
          <el-icon :size="14" :style="{ color: c.color }"><component :is="c.icon" /></el-icon>
          {{ c.label }}
        </div>
        <div class="e-val mono-num">{{ c.value }}<i>{{ c.unit }}</i></div>
      </div>
    </div>

    <!-- 温度走势简表 -->
    <section class="m-card">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>近 16 小时温度走势（每 2 小时）</div>
      </div>
      <div class="m-card-body">
        <div v-if="simpleTrend.length" class="mini-chart">
          <div v-for="(pt, i) in simpleTrend" :key="i" class="mc-col">
            <div class="mc-bar" :style="{ height: (pt[1] / 35) * 70 + 'px' }"></div>
            <span class="mc-v mono-num">{{ pt[1] }}°</span>
            <span class="mc-t">{{ new Date(pt[0]).getHours() }}时</span>
          </div>
        </div>
        <div v-else class="m-empty">该地块暂无温度传感器数据</div>
      </div>
    </section>

    <!-- 地块概览 -->
    <section class="m-card">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>{{ activePlot?.name }} · 地块概览</div>
      </div>
      <div class="m-card-body">
        <div class="m-row"><span class="m-row-label">作物类型</span><b class="m-row-value">{{ activePlot?.crop }}</b></div>
        <div class="m-row"><span class="m-row-label">地块面积</span><b class="m-row-value mono-num">{{ activePlot?.areaMu }} 亩</b></div>
        <div class="m-row"><span class="m-row-label">传感器数量</span><b class="m-row-value mono-num">{{ activePlot?.sensors }} 台</b></div>
        <div class="m-row"><span class="m-row-label">种植状态</span><b class="m-row-value">{{ activePlot?.status }}</b></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.plot-chips {
  margin-bottom: var(--ag-space-3);
}

/* 实时卡：2×2 网格 */
.env-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ag-space-3);
}
.e-card {
  padding: var(--ag-space-3) var(--ag-space-4);
}
.e-top {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-3);
}
/* 数值：墨色 + 显示数字字体，与 PC .stat-card .value 同层级 */
.e-val {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.6px;
  line-height: 1.2;
  color: var(--ag-text-1);
}
.e-val i {
  margin-left: 3px;
  font-style: normal;
  font-size: var(--ag-fs-micro);
  font-weight: 400;
  color: var(--ag-text-4);
}

.m-env > .m-card {
  margin-top: var(--ag-space-3);
}

/* 柱状图：单色 accent，去除旧橙黄渐变 */
.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  min-height: 110px;
}
.mc-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
}
.mc-bar {
  width: 70%;
  border-radius: 2px 2px 0 0;
  background: var(--ag-green-500);
  transition: height var(--ag-dur-slow) var(--ag-ease);
}
.mc-v {
  font-size: 9px;
  color: var(--ag-text-3);
}
.mc-t {
  font-size: 8px;
  color: var(--ag-text-4);
}
</style>
