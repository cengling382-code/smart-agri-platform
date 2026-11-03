<script setup>
/** 页面 65 · 移动端地块信息查看：负责地块列表、地块详情、环境数据 */
import { ref, computed, onMounted } from 'vue'
import { plotApi, deviceApi } from '@/api'

const plots = ref([])
const activeId = ref(null)
const loading = ref(true)

const activePlot = computed(() => {
  const p = plots.value.find((x) => x.id === activeId.value)
  // 手动新增的地块可能缺少 env / sensors 等字段，这里补默认值，避免详情区渲染报错
  return p ? { env: {}, sensors: 0, ...p } : null
})

onMounted(async () => {
  try {
    plots.value = await plotApi.all()
    activeId.value = plots.value[0]?.id
  } catch (e) {
    console.warn('[MobilePlots]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="m-plots" v-loading="loading">
    <div class="mp-head"><h2>我的地块</h2><span class="text-dim">共 {{ plots.length }} 个地块</span></div>

    <div class="plot-list">
      <button v-for="p in plots" :key="p.id" class="plot-card" :class="{ on: p.id === activeId }" @click="activeId = p.id">
        <span class="p-color" :style="{ background: p.type === '设施大棚' ? '#699C78' : p.type === '水产' ? '#4C6983' : p.type === '畜禽' ? '#B17179' : '#E89552' }"></span>
        <div class="p-info">
          <b>{{ p.name }}</b>
          <span class="text-dim">{{ p.type }} · {{ p.crop }} · {{ p.areaMu }} 亩</span>
        </div>
        <span class="p-status">{{ p.status }}</span>
      </button>
    </div>

    <!-- 详情 -->
    <div v-if="activePlot" class="detail anim-up">
      <div class="dt-head">
        <b>{{ activePlot.name }}</b>
        <el-tag size="small" effect="plain">{{ activePlot.type }}</el-tag>
      </div>
      <div class="env-grid">
        <div class="env-cell" v-if="activePlot.env.temp !== undefined"><span>空气温度</span><b class="mono-num">{{ activePlot.env.temp }}℃</b></div>
        <div class="env-cell" v-if="activePlot.env.hum !== undefined"><span>空气湿度</span><b class="mono-num">{{ activePlot.env.hum }}%</b></div>
        <div class="env-cell" v-if="activePlot.env.soilH !== undefined"><span>土壤湿度</span><b class="mono-num">{{ activePlot.env.soilH }}%</b></div>
        <div class="env-cell" v-if="activePlot.env.oxygen !== undefined"><span>溶解氧</span><b class="mono-num">{{ activePlot.env.oxygen }}mg/L</b></div>
        <div class="env-cell" v-if="activePlot.env.ph !== undefined"><span>PH 值</span><b class="mono-num">{{ activePlot.env.ph }}</b></div>
        <div class="env-cell" v-if="activePlot.env.nh3 !== undefined"><span>氨气浓度</span><b class="mono-num">{{ activePlot.env.nh3 }}ppm</b></div>
      </div>
      <div class="rows">
        <div><span>负责人</span><b>{{ activePlot.manager }}</b></div>
        <div><span>种植周期</span><b class="mono-num">{{ activePlot.startDate }} ~ {{ activePlot.endDate }}</b></div>
        <div><span>传感器</span><b class="mono-num">{{ activePlot.sensors }} 台</b></div>
        <div><span>经纬度</span><b class="mono-num">{{ activePlot.lat }}, {{ activePlot.lng }}</b></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m-plots {
  padding: 16px;
  min-height: 100%;
}
.mp-head {
  margin-bottom: 14px;
}
.mp-head h2 {
  margin: 0 0 3px;
  font-size: 18px;
}
.plot-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.plot-card {
  display: flex;
  align-items: center;
  gap: 11px;
  border: none;
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：地块选择卡片属卡片类，对齐卡片档 10px */
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  box-shadow: var(--ag-shadow-sm);
  transition: all 0.2s;
}
.plot-card.on {
  outline: 2px solid var(--ag-green-500);
}
.p-color {
  width: 10px;
  height: 34px;
  border-radius: 4px;
  flex: none;
}
.p-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.p-info b {
  font-size: 14px;
}
.p-status {
  font-size: 11px;
  color: var(--ag-green-700);
  background: var(--ag-green-50);
  padding: 3px 9px;
  border-radius: var(--ag-radius-sm); /* 决策依据：状态标签属小控件，对齐控件档 6px */
  flex: none;
}
.detail {
  margin-top: 16px;
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：地块详情卡片属卡片类，对齐卡片档 10px */
  padding: 16px;
  box-shadow: var(--ag-shadow-sm);
}
.dt-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.env-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}
.env-cell {
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：环境数据格属卡片类，token 化为卡片档 10px（值不变） */
  padding: 10px 8px;
  text-align: center;
}
.env-cell span {
  font-size: 10px;
  color: var(--ag-text-3);
  display: block;
}
.env-cell b {
  font-size: 15px;
  color: var(--ag-green-700);
}
.rows {
  margin-top: 12px;
}
.rows > div {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--ag-border-light);
}
.rows span {
  color: var(--ag-text-3);
}
</style>
