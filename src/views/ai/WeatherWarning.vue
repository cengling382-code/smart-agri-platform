<script setup>
/** 页面 36 · 气象与灾害预警：暴雨/高温/霜冻预警展示、预警推送记录 */
import { ref, computed, onMounted } from 'vue'
import { PageHeader, ChartCard } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { aiApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const weather = ref(null)
const loading = ref(true)
const loadError = ref(false)

const WARN_LEVEL = cfg.weatherWarnLevel

/** 预警记录由气象接口返回的 warnings 派生，不维护硬编码记录 */
const pushRecords = computed(() =>
  (weather.value?.warnings || []).map((w, i) => ({
    id: i,
    time: weather.value?.updatedAt || weather.value?.date || '—',
    type: `${w.level}${w.type}预警`,
    source: w.publish || '—',
    content: w.content,
    status: '已发布',
  }))
)

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

const ICONS = cfg.weatherIcons

onMounted(async () => {
  try {
    weather.value = await aiApi.weather()
  } catch (e) {
    console.warn('[WeatherWarning]', e?.message || e)
    weather.value = null
    loadError.value = true
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
        <template v-if="weather">
          <div class="cw-main">
            <el-icon :size="46" color="#c9803e"><Sunny /></el-icon>
            <div>
              <div class="cw-temp mono-num">{{ weather.temp }}℃</div>
              <div class="cw-cond">{{ weather.city }} · {{ weather.cond }}</div>
            </div>
          </div>
          <div class="cw-grid">
            <div class="cw-item"><span>湿度</span><b class="mono-num">{{ weather.humidity }}%</b></div>
            <div class="cw-item"><span>风力</span><b>{{ weather.wind }}</b></div>
            <div class="cw-item"><span>空气质量</span><b class="mono-num">AQI {{ weather.aqi }}</b></div>
          </div>
        </template>
        <el-empty v-else description="暂无天气数据" :image-size="80" />
      </div>

      <!-- 7日预报 -->
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>7 日预报</div></div>
        <div class="ag-card__body">
          <el-empty v-if="!weather?.forecast?.length" description="暂无预报数据" :image-size="80" />
          <div v-else class="forecast-row stagger">
            <div v-for="f in weather.forecast" :key="f.day" class="f-card">
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
    <div class="ag-card warn-empty" v-else-if="!loading">
      <el-empty :description="loadError ? '气象数据加载失败，暂无法获取预警' : '暂无灾害预警'" :image-size="80" />
    </div>

    <div class="bottom-grid">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>气温趋势（未来 7 日）</div></div>
        <div class="ag-card__body"><ChartCard :options="forecastOptions" :height="280" /></div>
      </div>

      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>预警推送记录</div></div>
        <div class="ag-card__body push-list">
          <el-empty v-if="!pushRecords.length" description="暂无预警记录" :image-size="80" />
          <el-timeline v-else>
            <el-timeline-item v-for="p in pushRecords" :key="p.id" :timestamp="p.time" placement="top" type="primary">
              <div class="push-item ag-card ag-card--hover">
                <div class="pi-head">
                  <b>{{ p.type }}</b>
                  <el-tag size="small" type="success" effect="light">{{ p.status }}</el-tag>
                </div>
                <div class="text-dim">来源：{{ p.source }}</div>
                <div class="pi-content">{{ p.content }}</div>
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
.warn-empty {
  margin-bottom: 16px;
  padding: 6px 0;
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
.pi-content {
  margin-top: 4px;
  color: var(--ag-text-2);
  font-size: 12px;
  line-height: 1.6;
}
@media (max-width: 1100px) {
  .weather-layout, .bottom-grid { grid-template-columns: 1fr; }
  .forecast-row { grid-template-columns: repeat(4, 1fr); }
}
</style>
