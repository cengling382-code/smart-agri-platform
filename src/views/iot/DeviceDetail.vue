<script setup>
/** 页面 12 · 设备详情：设备参数、实时数据、历史曲线、通信日志 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PageHeader, ChartCard, StatusTag } from '@/components/ui'
import { deviceApi, controlApi } from '@/api'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const device = ref(null)
const logs = ref([])
const range = ref(48)
const paramKey = ref('temp')

const PARAM_LABEL = {
  temp: '空气温度(℃)', hum: '空气湿度(%)', co2: 'CO₂(ppm)', light: '光照(klx)',
  soilT: '土壤温度(℃)', soilH: '土壤湿度(%)', ph: 'PH值', wind: '风速(m/s)', rain: '降雨量(mm)', oxygen: '溶解氧(mg/L)', nh3: '氨气(ppm)',
}

const series = ref({ arr: [], meta: { name: '', unit: '' } })
const chartLoading = ref(false)

const trendOptions = computed(() => {
  if (!series.value.arr?.length) return {}
  const { meta, arr } = series.value
  return {
    tooltip: { trigger: 'axis', valueFormatter: (v) => v + (meta.unit ? ' ' + meta.unit : '') },
    grid: { left: 10, right: 18, top: 34, bottom: 4, containLabel: true },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: '#dde0e6' } }, axisLabel: { formatter: '{MM}-{dd} {HH}:{mm}' } },
    yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: '#eef0f3' } } },
    dataZoom: [{ type: 'inside' }],
    series: [{
      name: meta.name, type: 'line', smooth: true, showSymbol: false, data: arr,
      lineStyle: { width: 2.5, color: '#074ce0' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(7,76,224,.15)' }, { offset: 1, color: 'rgba(7,76,224,.02)' }] } },
    }],
  }
})

const latest = computed(() => {
  const arr = series.value.arr
  if (!arr?.length) return null
  const v = arr[arr.length - 1][1]
  return { value: v, unit: series.value.meta.unit, name: series.value.meta.name }
})

async function loadSeries() {
  if (!device.value) return
  chartLoading.value = true
  try {
    const key = device.value.params?.[0] || paramKey.value
    const r = await deviceApi.series(device.value.id, key, range.value)
    // 接口返回 { meta, series }，映射为页面使用的 { meta, arr }
    series.value = { meta: r?.meta || { name: key }, arr: r?.series || [] }
  } finally {
    chartLoading.value = false
  }
}

watch(paramKey, loadSeries)
watch(range, loadSeries)

onMounted(async () => {
  try {
    device.value = await deviceApi.detail(route.params.id)
    paramKey.value = device.value.params?.[0] || 'temp'
    const lg = await deviceApi.logs(route.params.id)
    logs.value = lg.list
    await loadSeries()
  } catch (e) {
    console.warn(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader :title="device?.name || '设备详情'" :desc="`设备编号 ${device?.code} · 型号 ${device?.model} · 所属地块 ${device?.plotName || '—'}`">
      <template #actions>
        <el-button :icon="'Back'" @click="router.back()">返回列表</el-button>
      </template>
    </PageHeader>

    <div class="detail-grid" v-if="device">
      <!-- 左：参数信息 -->
      <div class="ag-card anim-left info-card">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>设备参数</div><StatusTag :value="device.status" /></div>
        <div class="ag-card__body">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="设备类型">{{ { gateway: '网关', sensor: '传感器', actuator: '执行器', camera: '摄像头' }[device.type] }}</el-descriptions-item>
            <el-descriptions-item label="设备型号">{{ device.model }}</el-descriptions-item>
            <el-descriptions-item label="所属地块">{{ device.plotName }}（{{ device.plotType }}）</el-descriptions-item>
            <el-descriptions-item v-if="device.gatewayCode" label="接入网关">{{ device.gatewayCode }}</el-descriptions-item>
            <el-descriptions-item label="信号强度">{{ device.signal }}%</el-descriptions-item>
            <el-descriptions-item label="电池电量">{{ device.type === 'sensor' ? device.battery + '%' : '—' }}</el-descriptions-item>
            <el-descriptions-item label="最近上报">{{ device.lastReport }}</el-descriptions-item>
            <el-descriptions-item v-if="device.type === 'gateway'" label="下挂设备">{{ device.childCount }} 台</el-descriptions-item>
          </el-descriptions>

          <!-- 实时值 -->
          <div class="realtime" v-if="latest && device.type === 'sensor'">
            <div class="rt-label">当前读数</div>
            <div class="rt-value mono-num">{{ latest.value }}<small>{{ latest.unit }}</small></div>
            <div class="rt-name">{{ latest.name }}</div>
          </div>
        </div>
      </div>

      <!-- 右：历史曲线 + 日志 -->
      <div class="right-col">
        <div class="ag-card anim-up">
          <div class="ag-card__head">
            <div class="ag-card__title"><span class="dot"></span>历史曲线</div>
            <div class="flex gap-8 items-center">
              <el-select v-if="device.params?.length > 1" v-model="paramKey" size="small" style="width: 140px">
                <el-option v-for="p in device.params" :key="p" :label="PARAM_LABEL[p] || p" :value="p" />
              </el-select>
              <el-radio-group v-model="range" size="small">
                <el-radio-button :value="24">24h</el-radio-button>
                <el-radio-button :value="48">48h</el-radio-button>
                <el-radio-button :value="168">7天</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div class="ag-card__body">
            <ChartCard :options="trendOptions" :height="300" :loading="chartLoading" />
          </div>
        </div>

        <div class="ag-card anim-up anim-delay-1">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>通信日志</div></div>
          <div class="ag-card__body">
            <el-timeline style="max-height: 260px; overflow: auto; padding-left: 4px">
              <el-timeline-item
                v-for="l in logs"
                :key="l.id"
                :timestamp="l.time"
                :type="l.result === '成功' ? 'success' : 'danger'"
                placement="top"
              >
                <b>{{ l.operator }}</b> · {{ l.device }} {{ l.action }}
                <el-tag size="small" :type="l.result === '成功' ? 'success' : 'danger'" style="margin-left: 6px">{{ l.result }}</el-tag>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
  align-items: start;
}
.right-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.info-card {
  position: sticky;
  top: 12px;
}
.realtime {
  margin-top: 18px;
  /* 决策依据：卡片双色淡渐变属纯装饰、不承载信息，按简约高级规范改为单一淡色 */
  background: var(--ag-green-50);
  border-radius: var(--ag-radius); /* 决策依据：实时数据面板属面板类，对齐卡片档 10px */
  padding: 16px;
  text-align: center;
}
.rt-label {
  font-size: 12px;
  color: var(--ag-text-3);
}
.rt-value {
  font-size: 34px;
  color: var(--ag-green-700);
  font-weight: 800;
  line-height: 1.3;
}
.rt-value small {
  font-size: 13px;
  color: var(--ag-text-3);
  margin-left: 4px;
  font-weight: 400;
}
.rt-name {
  font-size: 12px;
  color: var(--ag-text-3);
}
@media (max-width: 1000px) {
  .detail-grid { grid-template-columns: 1fr; }
  .info-card { position: static; }
}
</style>
