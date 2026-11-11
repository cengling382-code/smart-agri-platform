<script setup>
/** 页面 65 · 移动端地块信息查看：负责地块列表、地块详情、环境数据 */
import { ref, computed, onMounted } from 'vue'
import { plotApi } from '@/api'
import { getConfig } from '@/data/configStore'
import { onDataChange } from '@/composables/useDataVersion'

const constants = getConfig('constants')

const plots = ref([])
const activeId = ref(null)
const loading = ref(true)

const activePlot = computed(() => {
  const p = plots.value.find((x) => x.id === activeId.value)
  // 手动新增的地块可能缺少 env / sensors 等字段，这里补默认值，避免详情区渲染报错
  return p ? { env: {}, sensors: 0, ...p } : null
})

/** 地块类型标识色：统一取 JSON 配置的 plotTypeColors，不在组件内硬编码 */
function plotTone(type) {
  return constants.plotTypeColors[type] || 'var(--ag-text-4)'
}

async function load() {
  try {
    plots.value = await plotApi.all()
    // 保留用户当前选中的地块，只有已不存在的选中项才回落到第一个
    if (!plots.value.some((x) => x.id === activeId.value)) activeId.value = plots.value[0]?.id ?? null
  } catch (e) {
    console.warn('[MobilePlots]', e?.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
onDataChange(load, { debounce: 400 })
</script>

<template>
  <div class="m-page m-plots" v-loading="loading">
    <div class="m-page-head">
      <div>
        <h1 class="m-page-title">我的地块</h1>
        <p class="m-page-desc">共 {{ plots.length }} 个地块 · 环境与档案信息</p>
      </div>
    </div>

    <div class="plot-list">
      <button
        v-for="p in plots"
        :key="p.id"
        class="m-card plot-card"
        :class="{ on: p.id === activeId }"
        @click="activeId = p.id"
      >
        <span class="p-color" :style="{ background: plotTone(p.type) }"></span>
        <div class="p-info">
          <b>{{ p.name }}</b>
          <span class="text-dim">{{ p.type }} · {{ p.crop }} · {{ p.areaMu }} 亩</span>
        </div>
        <span class="m-tag">{{ p.status }}</span>
      </button>
      <div v-if="!loading && !plots.length" class="m-empty">暂无负责地块</div>
    </div>

    <!-- 详情 -->
    <section v-if="activePlot" class="m-card detail">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>{{ activePlot.name }}</div>
        <el-tag size="small" effect="plain">{{ activePlot.type }}</el-tag>
      </div>
      <div class="m-card-body">
        <div class="env-grid">
          <div class="env-cell" v-if="activePlot.env.temp !== undefined"><span>空气温度</span><b class="mono-num">{{ activePlot.env.temp }}℃</b></div>
          <div class="env-cell" v-if="activePlot.env.hum !== undefined"><span>空气湿度</span><b class="mono-num">{{ activePlot.env.hum }}%</b></div>
          <div class="env-cell" v-if="activePlot.env.soilH !== undefined"><span>土壤湿度</span><b class="mono-num">{{ activePlot.env.soilH }}%</b></div>
          <div class="env-cell" v-if="activePlot.env.oxygen !== undefined"><span>溶解氧</span><b class="mono-num">{{ activePlot.env.oxygen }}mg/L</b></div>
          <div class="env-cell" v-if="activePlot.env.ph !== undefined"><span>PH 值</span><b class="mono-num">{{ activePlot.env.ph }}</b></div>
          <div class="env-cell" v-if="activePlot.env.nh3 !== undefined"><span>氨气浓度</span><b class="mono-num">{{ activePlot.env.nh3 }}ppm</b></div>
        </div>
        <div class="rows">
          <div class="m-row"><span class="m-row-label">负责人</span><b class="m-row-value">{{ activePlot.manager }}</b></div>
          <div class="m-row"><span class="m-row-label">种植周期</span><b class="m-row-value mono-num">{{ activePlot.startDate }} ~ {{ activePlot.endDate }}</b></div>
          <div class="m-row"><span class="m-row-label">传感器</span><b class="m-row-value mono-num">{{ activePlot.sensors }} 台</b></div>
          <div class="m-row"><span class="m-row-label">经纬度</span><b class="m-row-value mono-num">{{ activePlot.lat }}, {{ activePlot.lng }}</b></div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.plot-list {
  display: flex;
  flex-direction: column;
  gap: var(--ag-space-3);
}
.plot-card {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  width: 100%;
  padding: var(--ag-space-3) var(--ag-space-4);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--ag-dur) var(--ag-ease), transform var(--ag-dur-fast) var(--ag-ease);
}
.plot-card:active {
  transform: scale(0.99);
}
.plot-card.on {
  border-color: var(--ag-green-600);
}
/* 类型标识：3px 竖条（PC 用左侧竖条承担分组，不用彩色顶条） */
.p-color {
  width: 3px;
  height: 32px;
  flex: none;
  border-radius: var(--ag-radius-pill);
}
.p-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.p-info b {
  font-size: var(--ag-fs-caption);
  font-weight: 600;
  color: var(--ag-text-1);
}
.detail {
  margin-top: var(--ag-space-3);
}
.env-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--ag-space-2);
}
.env-cell {
  padding: var(--ag-space-3) var(--ag-space-2);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-bg-hover);
  text-align: center;
}
.env-cell span {
  display: block;
  font-size: 10px;
  color: var(--ag-text-3);
}
.env-cell b {
  font-size: var(--ag-fs-body);
  font-weight: 600;
  color: var(--ag-text-1);
}
.rows {
  margin-top: var(--ag-space-3);
}
</style>
