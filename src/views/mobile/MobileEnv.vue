<script setup>
/** 页面 60 · 移动端实时环境数据页：空气/土壤/水体实时数据查看、趋势简表 */
import { ref, computed, onMounted } from 'vue'
import { plotApi, deviceApi } from '@/api'

const plots = ref([])
const activeId = ref(null)
const series = ref([])
const loading = ref(true)

const activePlot = computed(() => plots.value.find((p) => p.id === activeId.value))

const CARDS = computed(() => {
  const e = activePlot.value?.env || {}
  return [
    { label: '空气温度', value: e.temp ?? e.waterT ?? '—', unit: '℃', color: '#E89552', icon: 'Sunny' },
    { label: '空气湿度', value: e.hum ?? e.oxygen ?? '—', unit: e.hum ? '%' : 'mg/L', color: '#4C6983', icon: 'Drizzling' },
    { label: 'CO₂ / PH', value: e.co2 ?? e.ph ?? '—', unit: e.co2 ? 'ppm' : '', color: '#B17179', icon: 'Cloudy' },
    { label: '光照强度', value: e.light ?? e.nh3 ?? '—', unit: e.light ? 'klx' : 'ppm', color: '#699C78', icon: 'Sunrise' },
  ]
})

const simpleTrend = ref([])

onMounted(async () => {
  try {
    plots.value = await plotApi.all()
    activeId.value = plots.value[0]?.id
    const res = await Promise.all([deviceApi.series(51, 'temp', 24), deviceApi.series(52, 'hum', 24)])
    series.value = res
    simpleTrend.value = res[0].arr.slice(-12)
  } catch (e) {
    console.warn('[MobileEnv]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="m-env" v-loading="loading">
    <div class="me-head">
      <h2>实时环境数据</h2>
      <div class="plot-chips">
        <button v-for="p in plots.slice(0, 5)" :key="p.id" :class="{ on: p.id === activeId }" @click="activeId = p.id">
          {{ p.name.replace('号', '#').slice(0, 6) }}
        </button>
      </div>
    </div>

    <!-- 实时卡 -->
    <div class="env-cards">
      <div v-for="c in CARDS" :key="c.label" class="e-card" :style="{ '--c': c.color }">
        <div class="e-top">
          <el-icon :size="16"><component :is="c.icon" /></el-icon>
          {{ c.label }}
        </div>
        <div class="e-val mono-num">{{ c.value }}<i>{{ c.unit }}</i></div>
      </div>
    </div>

    <!-- 24h 简表 -->
    <div class="m-card">
      <div class="sec-title">近 24 小时温度走势（每 2 小时）</div>
      <div class="mini-chart">
        <div v-for="(pt, i) in simpleTrend" :key="i" class="mc-col">
          <div class="mc-bar" :style="{ height: (pt[1] / 35) * 70 + 'px' }"></div>
          <span class="mc-v mono-num">{{ pt[1] }}°</span>
          <span class="mc-t">{{ new Date(pt[0]).getHours() }}时</span>
        </div>
      </div>
    </div>

    <div class="m-card">
      <div class="sec-title">{{ activePlot?.name }} · 地块概览</div>
      <div class="info-rows">
        <div class="ir"><span>作物类型</span><b>{{ activePlot?.crop }}</b></div>
        <div class="ir"><span>地块面积</span><b class="mono-num">{{ activePlot?.areaMu }} 亩</b></div>
        <div class="ir"><span>传感器数量</span><b class="mono-num">{{ activePlot?.sensors }} 台</b></div>
        <div class="ir"><span>种植状态</span><b>{{ activePlot?.status }}</b></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m-env {
  padding: 0 16px 24px;
  min-height: 100%;
}
.me-head {
  position: sticky;
  top: 0;
  /* 决策依据：页头藏青段承载白色筛选文字，改绿-600 后 12px 白字对比度不足，按规范升级为绿-700 */
  background: var(--ag-green-700);
  margin: 0 -16px;
  padding: 20px 16px 16px;
  z-index: 3;
}
.me-head h2 {
  margin: 0 0 12px;
  color: #fff;
  font-size: 18px;
}
.plot-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.plot-chips button {
  flex: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: var(--ag-radius-sm); /* 决策依据：地块筛选 chip 属小控件，对齐控件档 6px */
  cursor: pointer;
}
.plot-chips button.on {
  background: #fff;
  color: var(--ag-green-700);
  font-weight: 700;
}
.env-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.e-card {
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：环境数据小卡属卡片类，对齐卡片档 10px */
  padding: 13px 15px;
  box-shadow: var(--ag-shadow-sm);
  border-top: 3px solid var(--c);
}
.e-top {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ag-text-3);
}
.e-val {
  font-size: 25px;
  font-weight: 800;
  color: var(--c);
  margin-top: 4px;
}
.e-val i {
  font-style: normal;
  font-size: 11px;
  color: var(--ag-text-4);
  margin-left: 3px;
}
.m-card {
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：区块卡片属卡片类，对齐卡片档 10px */
  padding: 15px;
  margin-top: 14px;
  box-shadow: var(--ag-shadow-sm);
}
.sec-title {
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
}
.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 110px;
}
.mc-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  height: 100%;
  justify-content: flex-end;
}
.mc-bar {
  width: 70%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #FFB37B, #E8955233);
  transition: height 0.6s var(--ag-ease);
}
.mc-v {
  font-size: 9px;
  color: var(--ag-text-3);
}
.mc-t {
  font-size: 8px;
  color: var(--ag-text-4);
}
.info-rows {
  display: flex;
  flex-direction: column;
}
.ir {
  display: flex;
  justify-content: space-between;
  padding: 9px 2px;
  font-size: 13px;
  border-bottom: 1px dashed var(--ag-border-light);
}
.ir:last-child {
  border-bottom: none;
}
.ir span {
  color: var(--ag-text-3);
}
</style>
