<script setup>
/** 页面 23 · 图层管理：底图切换、遥感图层、设备图层、气象图层开关管理 */
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { plotApi, deviceApi } from '@/api'
import { onMounted } from 'vue'

const basemap = ref('satellite')
const opacity = ref(70)
const plots = ref([])
const devices = ref([])

const layerGroups = reactive([
  {
    key: 'plots', name: '地块图层', icon: 'Place', desc: '地块边界、作物类型着色、种植状态', enabled: true, locked: false,
    items: [{ name: '地块边界', on: true }, { name: '作物着色', on: true }, { name: '种植状态标注', on: false }],
  },
  {
    key: 'devices', name: '设备图层', icon: 'Cpu', desc: '传感器、执行器、摄像头点位', enabled: true, locked: false,
    items: [{ name: '传感器点位', on: true }, { name: '执行器点位', on: true }, { name: '摄像头点位', on: true }, { name: '在线状态标识', on: true }],
  },
  {
    key: 'weather', name: '气象图层', icon: 'Cloudy', desc: '气象站数据、降雨云图、风向箭头', enabled: true, locked: false,
    items: [{ name: '气象站点', on: true }, { name: '降雨云图', on: false }, { name: '风向箭头', on: true }],
  },
  {
    key: 'remote', name: '遥感影像图层', icon: 'Picture', desc: '卫星遥感影像、NDVI 植被指数', enabled: false, locked: false,
    items: [{ name: '最新遥感影像', on: true }, { name: 'NDVI 植被指数', on: false }],
  },
])

const TYPE_COLOR = { 设施大棚: '#074ce0', 大田: '#D4B95E', 果园: '#c9803e', 水产: '#4C6983', 畜禽: '#B17179' }

async function load() {
  try {
    plots.value = await plotApi.all()
    const all = await deviceApi.all()
    devices.value = all.filter((d) => d.plotId)
  } catch (e) {
    console.warn('[LayerManage]', e?.message || e)
  }
}
onMounted(load)

function toggleGroup(g) {
  ElMessage.success(`「${g.name}」已${g.enabled ? '开启' : '关闭'}`)
}
function resetLayers() {
  layerGroups.forEach((g) => {
    g.enabled = ['plots', 'devices', 'weather'].includes(g.key)
    g.items.forEach((it) => (it.on = ['plots', 'devices', 'weather'].includes(g.key)))
  })
  opacity.value = 70
  basemap.value = 'satellite'
  ElMessage.success('已恢复默认图层配置')
}

function polygon(shape) {
  return (shape || []).map((pt) => pt.join(',')).join(' ')
}
</script>

<template>
  <div class="page">
    <PageHeader title="图层管理" desc="底图切换、遥感图层、设备图层与气象图层的开启管理与透明度调节">
      <template #actions>
        <el-button :icon="'RefreshLeft'" @click="resetLayers">恢复默认</el-button>
      </template>
    </PageHeader>

    <div class="layer-layout">
      <!-- 图层配置 -->
      <div class="config-side">
        <div class="ag-card anim-left">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>底图设置</div></div>
          <div class="ag-card__body">
            <el-radio-group v-model="basemap" class="base-switch">
              <el-radio-button value="satellite"><el-icon><Picture /></el-icon> 遥感影像</el-radio-button>
              <el-radio-button value="standard"><el-icon><MapLocation /></el-icon> 标准地图</el-radio-button>
            </el-radio-group>
            <div class="opacity-row">
              <span class="text-dim">底图透明度</span>
              <el-slider v-model="opacity" :max="100" style="flex: 1" />
              <span class="mono-num">{{ opacity }}%</span>
            </div>
          </div>
        </div>

        <div
          v-for="(g, i) in layerGroups"
          :key="g.key"
          class="ag-card layer-card anim-up"
          :class="{ off: !g.enabled }"
          :style="{ animationDelay: i * 0.06 + 's' }"
        >
          <div class="lc-head">
            <span class="lc-icon"><el-icon><component :is="g.icon" /></el-icon></span>
            <div class="lc-meta">
              <b>{{ g.name }}</b>
              <span class="text-dim">{{ g.desc }}</span>
            </div>
            <el-switch v-model="g.enabled" @change="toggleGroup(g)" :aria-label="`${g.name}开关`" />
          </div>
          <transition name="collapse">
            <div v-if="g.enabled" class="lc-items">
              <el-checkbox v-for="it in g.items" :key="it.name" v-model="it.on" size="small">{{ it.name }}</el-checkbox>
            </div>
          </transition>
        </div>
      </div>

      <!-- 预览 -->
      <div class="ag-card preview-card anim-up anim-delay-1">
        <div class="ag-card__head">
          <div class="ag-card__title"><span class="dot"></span>图层效果预览</div>
          <span class="text-dim">开启的图层实时叠加显示</span>
        </div>
        <div class="pv-body">
          <svg class="pv-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="图层叠加预览">
            <rect width="100" height="100" :fill="basemap === 'satellite' ? '#22321f' : '#eef0f3'" :opacity="opacity / 100" />
            <!-- 地块图层 -->
            <g v-if="layerGroups[0].enabled">
              <polygon v-for="p in plots" :key="p.id" :points="polygon(p.shape)" :fill="layerGroups[0].items[1].on ? (TYPE_COLOR[p.type] + '44') : 'rgba(148,163,184,.25)'" :stroke="TYPE_COLOR[p.type]" stroke-width="0.3" />
            </g>
            <!-- 设备图层 -->
            <g v-if="layerGroups[1].enabled">
              <circle v-for="d in devices.slice(0, 40)" :key="d.id" :cx="40 + (d.id % 9) * 2.4" :cy="20 + ((d.id * 7) % 60)" r="0.8" :fill="d.type === 'camera' ? '#4C6983' : d.type === 'actuator' ? '#4C6983' : '#074ce0'" />
            </g>
            <!-- 气象图层 -->
            <g v-if="layerGroups[2].enabled && layerGroups[2].items[2].on">
              <path d="M 6 10 Q 30 4 52 9 T 94 8" stroke="#8FB3CC" stroke-width="0.5" fill="none" marker-end="url(#arrow)" />
              <text x="6" y="7.5" font-size="2.2" fill="#8FB3CC">东南风 3.2 m/s</text>
            </g>
            <g v-if="layerGroups[2].enabled && layerGroups[2].items[1].on">
              <ellipse cx="70" cy="70" rx="18" ry="10" fill="rgba(56,189,248,.25)" />
              <ellipse cx="55" cy="80" rx="12" ry="7" fill="rgba(56,189,248,.18)" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layer-layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  align-items: start;
}
.config-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.base-switch {
  width: 100%;
}
.base-switch .el-radio-button {
  flex: 1;
}
.base-switch :deep(.el-radio-button__inner) {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.opacity-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
}
.layer-card {
  padding: 14px 16px;
  transition: opacity 0.3s;
}
.layer-card.off {
  opacity: 0.62;
}
.lc-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.lc-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--ag-radius); /* 决策依据：38px 图标块非控件，token 化为卡片档 10px（值不变） */
  background: var(--ag-green-50);
  color: var(--ag-green-600);
  display: grid;
  place-items: center;
  flex: none;
}
.lc-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}
.lc-meta b {
  font-size: 14px;
}
.lc-meta .text-dim {
  font-size: 11px;
}
.lc-items {
  padding: 10px 4px 0 50px;
  display: flex;
  gap: 4px 16px;
  flex-wrap: wrap;
}
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s var(--ag-ease);
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 120px;
}
.preview-card {
  position: sticky;
  top: 12px;
}
.pv-body {
  padding: 14px 18px 18px;
}
.pv-svg {
  width: 100%;
  aspect-ratio: 16/10;
  border-radius: var(--ag-radius); /* 决策依据：预览画布块属卡片类，对齐卡片档 10px */
  border: 1px solid var(--ag-border-light);
}
@media (max-width: 1100px) {
  .layer-layout { grid-template-columns: 1fr; }
}
</style>
