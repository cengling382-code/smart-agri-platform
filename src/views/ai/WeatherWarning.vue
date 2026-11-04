<script setup>
/** 页面 36 · 气象与灾害预警：暴雨/高温/霜冻预警展示、预警推送记录 */
import { ref, computed, onMounted } from 'vue'
import { PageHeader, ChartCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { aiApi } from '@/api'

const weather = ref(null)
const loading = ref(true)

const WARN_LEVEL = {
  蓝色: { color: '#5E7F9A', icon: 'Cloudy' },
  黄色: { color: '#c9803e', icon: 'Sunny' },
  橙色: { color: '#ea580c', icon: 'Lightning' },
  红色: { color: '#E84A5F', icon: 'WarningFilled' },
}

/* 预警推送记录（演示数据） */
const pushRecords = [
  { id: 1, time: '2026-11-02 06:30', type: '霜冻蓝色预警', channel: '短信+公众号', targets: '全部园区管理员、农技人员（18 人）', status: '已送达' },
  { id: 2, time: '2026-10-28 14:20', type: '高温橙色预警', channel: '短信', targets: '1/2/3 号棚负责人（3 人）', status: '已送达' },
  { id: 3, time: '2026-10-21 09:05', type: '暴雨黄色预警', channel: '公众号', targets: '全部在线用户（86 人）', status: '已送达' },
  { id: 4, time: '2026-10-15 17:40', type: '大风蓝色预警', channel: '站内消息', targets: '全体用户', status: '已送达' },
]

const forecastOptions = computed(() => ({
  color: CHART_COLORS,
  tooltip: { trigger: 'axis' },
  legend: { top: 0, textStyle: { color: '#6b7380' } },
  grid: { left: 10, right: 16, top: 36, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: weather.value?.forecast?.map((f) => f.day) || [] },
  yAxis: { type: 'value', name: '℃', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [
    { name: '最高温', type: 'line', smooth: true, data: weather.value?.forecast?.map((f) => f.tMax) || [], lineStyle: { color: '#c9803e', width: 2.5 }, itemStyle: { color: '#c9803e' } },
    { name: '最低温', type: 'line', smooth: true, data: weather.value?.forecast?.map((f) => f.tMin) || [], lineStyle: { color: '#4C6983', width: 2.5 }, itemStyle: { color: '#4C6983' } },
  ],
}))

const ICONS = { rain: 'Pouring', sunny: 'Sunny', cloudy: 'Cloudy' }

onMounted(async () => {
  try {
    weather.value = await aiApi.weather()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="气象与灾害预警" desc="对接气象 API，暴雨、高温、霜冻等灾害预警展示与多渠道推送记录" />

    <div class="weather-layout">
      <!-- 当前天气 -->
      <div class="ag-card anim-left current-card">
        <div class="cw-main">
          <el-icon :size="46" color="#c9803e"><Sunny /></el-icon>
          <div>
            <div class="cw-temp mono-num">{{ weather?.temp }}℃</div>
            <div class="cw-cond">{{ weather?.city }} · {{ weather?.cond }}</div>
          </div>
        </div>
        <div class="cw-grid">
          <div class="cw-item"><span>湿度</span><b class="mono-num">{{ weather?.humidity }}%</b></div>
          <div class="cw-item"><span>风力</span><b>{{ weather?.wind }}</b></div>
          <div class="cw-item"><span>空气质量</span><b class="mono-num">AQI {{ weather?.aqi }}</b></div>
        </div>
      </div>

      <!-- 7日预报 -->
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>7 日预报</div></div>
        <div class="ag-card__body">
          <div class="forecast-row stagger">
            <div v-for="f in weather?.forecast" :key="f.day" class="f-card">
              <span class="f-day">{{ f.day }}</span>
              <el-icon :size="22" :color="f.icon === 'rain' ? '#4C6983' : f.icon === 'sunny' ? '#c9803e' : '#9AA4AE'">
                <component :is="ICONS[f.icon]" />
              </el-icon>
              <span class="f-cond">{{ f.cond }}</span>
              <span class="f-temp mono-num">{{ f.tMax }}° / {{ f.tMin }}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 灾害预警横幅 -->
    <div class="warn-banners stagger" v-if="weather?.warnings?.length">
      <div v-for="w in weather.warnings" :key="w.type" class="warn-banner" :style="{ '--wc': WARN_LEVEL[w.level]?.color }">
        <el-icon :size="26"><component :is="WARN_LEVEL[w.level]?.icon" /></el-icon>
        <div class="wb-body">
          <div class="wb-title">{{ w.level }}{{ w.type }}预警 <el-tag size="small" effect="plain">{{ w.publish }}</el-tag></div>
          <p class="wb-content">{{ w.content }}</p>
        </div>
      </div>
    </div>

    <div class="bottom-grid">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>气温趋势（未来 7 日）</div></div>
        <div class="ag-card__body"><ChartCard :options="forecastOptions" :height="280" /></div>
      </div>

      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>预警推送记录</div></div>
        <div class="ag-card__body push-list">
          <el-timeline>
            <el-timeline-item v-for="p in pushRecords" :key="p.id" :timestamp="p.time" placement="top" type="primary">
              <div class="push-item ag-card ag-card--hover">
                <div class="pi-head">
                  <b>{{ p.type }}</b>
                  <el-tag size="small" type="success" effect="light">{{ p.status }}</el-tag>
                </div>
                <div class="text-dim">渠道：{{ p.channel }} · 接收：{{ p.targets }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weather-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
.current-card {
  /* 决策依据：卡片双色淡渐变属纯装饰、不承载信息，按简约高级规范改为单一淡色 */
  background: rgba(76, 105, 131, 0.06);
  padding: 22px;
}
.cw-main {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}
.cw-temp {
  font-size: 42px;
  font-weight: 800;
  line-height: 1.1;
}
.cw-cond {
  color: var(--ag-text-3);
  font-size: 13px;
}
.cw-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.cw-item {
  background: rgba(255, 255, 255, 0.7);
  border-radius: var(--ag-radius); /* 决策依据：天气指标格属卡片类，token 化为卡片档 10px（值不变） */
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: var(--ag-text-3);
}
.cw-item b {
  display: block;
  margin-top: 3px;
  color: var(--ag-text-1);
  font-size: 13px;
}
.forecast-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}
.f-card {
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：预报小卡属卡片类，对齐卡片档 10px */
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  transition: transform 0.25s var(--ag-ease), box-shadow 0.25s;
}
.f-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--ag-shadow);
}
.f-day {
  font-size: 12px;
  color: var(--ag-text-2);
}
.f-cond {
  font-size: 10px;
  color: var(--ag-text-3);
  white-space: nowrap;
}
.f-temp {
  font-size: 11px;
  color: var(--ag-text-1);
}
.warn-banner {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  border-left: 4px solid var(--wc);
  background: color-mix(in srgb, var(--wc) 7%, white);
  border-radius: 0 var(--ag-radius) var(--ag-radius) 0; /* 决策依据：预警横幅属卡片类（仅右侧两角），token 化为卡片档 10px */
  padding: 14px 18px;
  margin-bottom: 16px;
  color: var(--wc);
  animation: agFadeUp 0.5s var(--ag-ease) both;
}
.wb-title {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.wb-content {
  margin: 4px 0 0;
  color: var(--ag-text-2);
  font-size: 13px;
}
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 20px;
}
.push-list {
  max-height: 320px;
  overflow: auto;
}
.push-item {
  padding: 10px 14px;
}
.pi-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}
@media (max-width: 1100px) {
  .weather-layout, .bottom-grid { grid-template-columns: 1fr; }
  .forecast-row { grid-template-columns: repeat(4, 1fr); }
}
</style>
