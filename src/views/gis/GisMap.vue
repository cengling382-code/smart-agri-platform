<script setup>
/** 页面 21 · GIS 园区地图总览：地块/大棚/传感器点位地图展示、点击弹窗查看实时数据 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { PageHeader, StatusTag } from '@/components/ui'
import { plotApi, deviceApi } from '@/api'

const router = useRouter()
const plots = ref([])
const devices = ref([])
const loading = ref(true)
const activePlot = ref(null)
const popupPos = ref([0, 0])

/* 图层开关 */
const layers = reactive({ plots: true, devices: true, weather: true, labels: true })
const basemap = ref('satellite') // satellite | standard

const TYPE_COLOR = {
  设施大棚: '#699C78', 大田: '#D4B95E', 果园: '#E89552', 水产: '#4C6983', 畜禽: '#B17179',
}
const TYPE_FILL = {
  设施大棚: 'rgba(105,156,120,.28)', 大田: 'rgba(234,179,8,.24)', 果园: 'rgba(232,149,82,.24)', 水产: 'rgba(76,105,131,.24)', 畜禽: 'rgba(177,113,121,.24)',
}

const points = computed(() =>
  devices.value
    .filter((d) => d.plotId && d.plotId !== undefined)
    .map((d) => {
      const p = plots.value.find((x) => x.id === d.plotId)
      if (!p) return null
      const shape = p.shape || []
      const cx = shape.length ? shape.reduce((s, pt) => s + pt[0], 0) / shape.length : 50
      const cy = shape.length ? shape.reduce((s, pt) => s + pt[1], 0) / shape.length : 50
      // 在地块内散布点位
      const seed = d.id % 7
      return { ...d, x: cx + (seed - 3) * 1.1, y: cy + ((d.id * 3) % 5 - 2) * 1.1 }
    })
    .filter(Boolean)
)

function polygon(shape) {
  return shape.map((pt) => pt.join(',')).join(' ')
}

function clickPlot(p, evt) {
  activePlot.value = p
  const rect = evt?.target?.ownerSVGElement?.getBoundingClientRect?.()
  popupPos.value = [p.shape?.[0]?.[0] || 10, p.shape?.[0]?.[1] || 10]
}
function closePopup() {
  activePlot.value = null
}

const plotDevices = computed(() =>
  activePlot.value ? devices.value.filter((d) => d.plotId === activePlot.value.id) : []
)

onMounted(async () => {
  try {
    const [ps, ds] = await Promise.all([plotApi.all(), deviceApi.all()])
    plots.value = ps.map((p) => ({ ...p }))
  } catch (e) {
    console.warn('[GisMap]', e?.message || e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page">
    <PageHeader title="GIS 园区地图总览" desc="地块、大棚、传感器设备点位地图可视化，点击地块查看实时环境数据">
      <template #actions>
        <el-radio-group v-model="basemap" size="small">
          <el-radio-button value="satellite">遥感影像</el-radio-button>
          <el-radio-button value="standard">标准地图</el-radio-button>
        </el-radio-group>
        <el-button :icon="'FullScreen'" @click="router.push('/screens/overview')">大屏模式</el-button>
      </template>
    </PageHeader>

    <div class="gis-layout">
      <!-- 地图主体 -->
      <div class="ag-card map-card anim-up" v-loading="loading">
        <svg class="gis-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="园区地图：地块与设备点位分布">
          <defs>
            <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M 4 0 L 0 0 0 4" fill="none" :stroke="basemap === 'satellite' ? 'rgba(255,255,255,.05)' : 'rgba(100,116,139,.1)'" stroke-width="0.15" />
            </pattern>
            <filter id="soft"><feDropShadow dx="0" dy="0.3" stdDeviation="0.5" flood-opacity="0.25" /></filter>
          </defs>
          <rect width="100" height="100" :fill="basemap === 'satellite' ? '#22321f' : '#eef4ee'" />
          <rect width="100" height="100" fill="url(#grid)" />

          <!-- 道路 -->
          <path d="M 0 42 L 100 40" stroke="rgba(255,255,255,.25)" stroke-width="1.2" fill="none" stroke-dasharray="2 1.2" />
          <path d="M 52 0 L 54 100" stroke="rgba(255,255,255,.25)" stroke-width="1.2" fill="none" stroke-dasharray="2 1.2" />

          <!-- 地块 -->
          <g v-if="layers.plots">
            <polygon
              v-for="p in plots"
              :key="p.id"
              :points="polygon(p.shape || [])"
              :fill="TYPE_FILL[p.type] || 'rgba(148,163,184,.2)'"
              :stroke="activePlot?.id === p.id ? '#9FC3DD' : TYPE_COLOR[p.type]"
              stroke-width="activePlot?.id === p.id ? 0.7 : 0.35"
              class="plot-poly"
              :class="{ selected: activePlot?.id === p.id }"
              tabindex="0"
              role="button"
              :aria-label="`地块 ${p.name}，点击查看详情`"
              @click="clickPlot(p, $event)"
              @keyup.enter="clickPlot(p, $event)"
            />
          </g>

          <!-- 标签 -->
          <g v-if="layers.labels">
            <text
              v-for="p in plots"
              :key="'lb' + p.id"
              :x="(p.shape?.[0]?.[0] || 0) + 1"
              :y="(p.shape?.[0]?.[1] || 0) + 3"
              class="plot-label"
            >
              {{ p.name }}
            </text>
          </g>

          <!-- 设备点位 -->
          <g v-if="layers.devices">
            <g v-for="d in points" :key="'d' + d.id" class="dev-point" :class="d.status">
              <circle :cx="d.x" :cy="d.y" r="1.9" class="dev-halo" />
              <circle :cx="d.x" :cy="d.y" r="0.85" class="dev-dot" />
              <title>{{ d.name }} · {{ d.code }}（{{ d.status === 'online' ? '在线' : d.status === 'offline' ? '离线' : '故障' }}）</title>
            </g>
          </g>
        </svg>

        <!-- 图层控制浮层 -->
        <div class="layer-panel">
          <div class="lp-title">图层</div>
          <label class="lp-item"><el-switch v-model="layers.plots" size="small" /> 地块图层</label>
          <label class="lp-item"><el-switch v-model="layers.devices" size="small" /> 设备图层</label>
          <label class="lp-item"><el-switch v-model="layers.weather" size="small" /> 气象图层</label>
          <label class="lp-item"><el-switch v-model="layers.labels" size="small" /> 名称标签</label>
        </div>

        <!-- 地块弹窗 -->
        <transition name="pop">
          <div v-if="activePlot" class="plot-popup" role="dialog" :aria-label="`地块 ${activePlot.name} 详情`">
            <div class="pp-head">
              <b>{{ activePlot.name }}</b>
              <button class="pp-close" aria-label="关闭弹窗" @click="closePopup"><el-icon><Close /></el-icon></button>
            </div>
            <div class="pp-tags">
              <el-tag size="small" effect="plain">{{ activePlot.type }}</el-tag>
              <el-tag size="small" type="success" effect="plain">{{ activePlot.crop }}</el-tag>
              <el-tag size="small" type="info" effect="plain">{{ activePlot.areaMu }} 亩</el-tag>
            </div>
            <div class="pp-env" v-if="activePlot.env">
              <div class="pp-e"><span>空气温度</span><b class="mono-num">{{ activePlot.env.temp ?? activePlot.env.waterT ?? '—' }}</b></div>
              <div class="pp-e"><span>湿度/溶氧</span><b class="mono-num">{{ activePlot.env.hum ?? activePlot.env.oxygen ?? '—' }}</b></div>
              <div class="pp-e"><span>光照</span><b class="mono-num">{{ activePlot.env.light ?? '—' }}</b></div>
              <div class="pp-e"><span>PH</span><b class="mono-num">{{ activePlot.env.ph ?? '—' }}</b></div>
            </div>
            <div class="pp-devices">
              <span class="text-dim">设备 {{ plotDevices.length }} 台 ·
                在线 {{ plotDevices.filter((d) => d.status === 'online').length }} ·
                离线 {{ plotDevices.filter((d) => d.status === 'offline').length }}
              </span>
            </div>
            <div class="pp-actions">
              <el-button size="small" type="primary" @click="router.push('/gis/plots')">地块档案</el-button>
              <el-button size="small" @click="router.push('/iot/sensors')">环境数据</el-button>
            </div>
          </div>
        </transition>

        <!-- 图例 -->
        <div class="legend">
          <div v-for="(c, t) in TYPE_COLOR" :key="t" class="lg-item"><i :style="{ background: c }"></i>{{ t }}</div>
          <div class="lg-item"><i class="lg-dev"></i>设备点位</div>
        </div>
      </div>

      <!-- 右侧统计 -->
      <div class="side">
        <div class="ag-card anim-up anim-delay-1 stat-side">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>空间统计</div></div>
          <div class="ag-card__body">
            <div class="s-row"><span>地块总数</span><b class="mono-num">{{ plots.length }}</b></div>
            <div class="s-row"><span>种植总面积</span><b class="mono-num">{{ plots.reduce((s, p) => s + p.areaMu, 0).toFixed(1) }} 亩</b></div>
            <div class="s-row"><span>设施大棚</span><b class="mono-num">{{ plots.filter((p) => p.type === '设施大棚').length }} 个</b></div>
            <div class="s-row"><span>设备点位</span><b class="mono-num">{{ points.length }} 个</b></div>
            <div class="crop-dist">
              <div class="cd-title text-dim">作物分布</div>
              <div v-for="(cnt, crop) in plots.reduce((m, p) => ({ ...m, [p.crop]: (m[p.crop] || 0) + 1 }), {})" :key="crop" class="cd-row">
                <span>{{ crop }}</span>
                <el-progress :percentage="Math.round((cnt / plots.length) * 100)" :stroke-width="7" :show-text="false" color="#699C78" style="flex: 1" />
                <span class="mono-num">{{ cnt }} 块</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ag-card anim-up anim-delay-2">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>气象图层</div></div>
          <div class="ag-card__body" v-if="layers.weather">
            <div class="w-row"><el-icon color="#E89552"><Sunny /></el-icon><span>当前温度</span><b class="mono-num">19℃</b></div>
            <div class="w-row"><el-icon color="#4C6983"><Drizzling /></el-icon><span>湿度</span><b class="mono-num">58%</b></div>
            <div class="w-row"><el-icon color="#699C78"><WindPower /></el-icon><span>风速</span><b class="mono-num">3.2 m/s</b></div>
            <div class="w-row"><el-icon color="#B17179"><Umbrella /></el-icon><span>降雨量</span><b class="mono-num">0 mm</b></div>
          </div>
          <el-empty v-else description="气象图层已关闭" :image-size="48" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gis-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  align-items: start;
}
.map-card {
  position: relative;
  padding: 0;
  overflow: hidden;
  height: 620px;
}
.gis-svg {
  width: 100%;
  height: 100%;
  display: block;
}
.plot-poly {
  cursor: pointer;
  transition: filter 0.25s, transform 0.25s;
  stroke-width: 0.35;
  outline: none;
}
.plot-poly:hover {
  filter: brightness(1.2);
  transform: translateY(-0.3px);
}
.plot-poly.selected {
  stroke-width: 0.8;
  filter: drop-shadow(0 0 1px rgba(159, 195, 221, 0.9));
}
.plot-poly:focus-visible {
  stroke: #9FC3DD;
  stroke-width: 0.8;
}
.plot-label {
  font-size: 1.6px;
  fill: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  pointer-events: none;
}
.dev-point {
  cursor: pointer;
}
.dev-dot {
  fill: #7DC383;
}
.dev-halo {
  fill: rgba(125, 195, 131, 0.2);
  animation: agRadar 2.4s ease-out infinite;
}
.dev-point.offline .dev-dot { fill: #9AA4AE; }
.dev-point.offline .dev-halo { fill: rgba(148, 163, 184, 0.15); animation: none; }
.dev-point.fault .dev-dot { fill: #E84A5F; }
.dev-point.fault .dev-halo { fill: rgba(232, 74, 95, 0.22); animation-duration: 1.2s; }

.layer-panel {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(6px);
  border-radius: var(--ag-radius-lg); /* 决策依据：地图图层面板为浮层，对齐浮层档 14px */
  box-shadow: var(--ag-shadow);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 5;
}
.lp-title {
  font-weight: 700;
  font-size: 13px;
}
.lp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ag-text-2);
  cursor: pointer;
}
.plot-popup {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 250px;
  background: rgba(255, 255, 255, 0.97);
  border-radius: var(--ag-radius-lg); /* 决策依据：地块信息弹窗属浮层，token 化为浮层档 14px（值不变） */
  box-shadow: var(--ag-shadow-lg);
  padding: 14px 16px;
  z-index: 6;
}
.pp-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.pp-close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--ag-text-4);
  padding: 2px;
  border-radius: 4px;
}
.pp-close:hover {
  color: var(--ag-danger);
  background: var(--ag-bg-hover);
}
.pp-tags {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}
.pp-env {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  padding: 10px;
  background: var(--ag-green-50);
  border-radius: var(--ag-radius); /* 决策依据：弹窗内环境信息块属卡片类，token 化为卡片档 10px（值不变） */
  margin-bottom: 10px;
}
.pp-e {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.pp-e span {
  color: var(--ag-text-3);
}
.pp-e b {
  color: var(--ag-green-700);
}
.pp-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.pp-actions .el-button {
  flex: 1;
}
.legend {
  position: absolute;
  bottom: 14px;
  left: 14px;
  background: rgba(255, 255, 255, 0.94);
  border-radius: var(--ag-radius-lg); /* 决策依据：地图图例为浮层，对齐浮层档 14px */
  padding: 10px 14px;
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  box-shadow: var(--ag-shadow);
  z-index: 5;
}
.lg-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--ag-text-2);
}
.lg-item i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}
.lg-dev {
  background: #7DC383 !important;
  border-radius: 50% !important;
}
.pop-enter-active {
  transition: all 0.25s var(--ag-ease-spring);
}
.pop-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

.side {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.s-row {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed var(--ag-border-light);
  font-size: 13px;
}
.s-row b {
  color: var(--ag-green-700);
}
.crop-dist {
  margin-top: 12px;
}
.cd-title {
  margin-bottom: 8px;
}
.cd-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  padding: 4px 0;
}
.cd-row > span:first-child {
  width: 44px;
}
.w-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--ag-border-light);
}
.w-row:last-child {
  border-bottom: none;
}
.w-row span {
  flex: 1;
  color: var(--ag-text-2);
}
.w-row b {
  color: var(--ag-text-1);
}
@media (max-width: 1100px) {
  .gis-layout { grid-template-columns: 1fr; }
}
</style>
