<script setup>
/** 页面 14 · 视频监控：1/4/9/16 画面分割、录像回放（时间轴）、截图抓拍 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { deviceApi } from '@/api'

const cameras = ref([])
const split = ref(4) // 1 | 4 | 9 | 16
const mode = ref('live') // live | playback
const playing = ref(true)
const progress = ref(38)
const shots = ref([])
let playTimer = null
let idxTimer = null
const animIdx = ref(0)

const gridClass = computed(() => `g-${split.value}`)
const activeCams = computed(() => {
  const n = split.value
  const list = [...cameras.value]
  while (list.length < n) list.push(null)
  return list.slice(0, n)
})

async function snapshot(cam, i) {
  if (!cam) return
  const shot = { id: Date.now() + i, name: `${cam.name}_抓拍_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}.jpg`, cam: cam.name, time: new Date().toLocaleString('zh-CN', { hour12: false }) }
  shots.value.unshift(shot)
  if (shots.value.length > 8) shots.value.pop()
  ElMessage.success(`已抓拍：${shot.name}`)
}

function togglePlay() {
  playing.value = !playing.value
  if (playing.value) startPlay()
  else clearInterval(playTimer)
}
function startPlay() {
  clearInterval(playTimer)
  playTimer = setInterval(() => {
    progress.value = (progress.value + 0.5) % 100
  }, 300)
}
function seek(p) {
  progress.value = p
}

onMounted(async () => {
  try {
    const all = await deviceApi.all()
    cameras.value = all.filter((d) => d.type === 'camera')
  } catch { /* fallback below */ }
  if (!cameras.value.length) {
    cameras.value = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `摄像头-${i + 1}`, code: `CAM-300${i}`, status: 'online' }))
  }
  startPlay()
  idxTimer = setInterval(() => (animIdx.value = (animIdx.value + 1) % 1000), 3000)
})
</script>

<template>
  <div class="page">
    <PageHeader title="视频监控" desc="多路摄像头实时预览（1/4/9/16 画面分割）、录像回放与截图抓拍">
      <template #actions>
        <el-radio-group v-model="mode" size="small">
          <el-radio-button value="live">实时预览</el-radio-button>
          <el-radio-button value="playback">录像回放</el-radio-button>
        </el-radio-group>
        <el-segmented
          v-model="split"
          :options="[1, 4, 9, 16]"
          size="small"
          style="--el-border-radius-base: 6px"
          aria-label="画面分割"
        />
      </template>
    </PageHeader>

    <div class="video-layout">
      <!-- 主画面 -->
      <div class="ag-card anim-up main-panel">
        <div class="video-grid" :class="gridClass">
          <div
            v-for="(cam, i) in activeCams"
            :key="i"
            class="v-cell"
            :class="{ empty: !cam, fault: cam?.status === 'fault' }"
          >
            <template v-if="cam">
              <!-- 模拟视频画面：动态渐变 + 扫描线 -->
              <div class="v-screen" :style="{ animationDelay: (i % 5) * 0.7 + 's' }">
                <div class="v-noise" :style="{ backgroundPosition: `${(animIdx * 7 + i * 13) % 100}px 0` }"></div>
                <div class="v-label">
                  <span class="pulse-dot is-on"></span>
                  <span class="v-name">{{ cam.name }}</span>
                  <span class="v-code">{{ cam.code }}</span>
                </div>
                <div class="v-rec" v-if="mode === 'live' && playing">● REC</div>
                <div class="v-time mono-num" v-if="mode === 'playback'">{{ new Date(Date.now() - (100 - progress) * 864000).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) }}</div>
                <button class="v-shot" :aria-label="`抓拍 ${cam.name}`" @click="snapshot(cam, i)">
                  <el-icon><Camera /></el-icon>
                </button>
              </div>
            </template>
            <div v-else class="v-empty"><el-icon><VideoCameraFilled /></el-icon> 无信号</div>
          </div>
        </div>

        <!-- 回放时间轴 -->
        <div v-if="mode === 'playback'" class="timeline">
          <div class="tl-head">
            <el-button size="small" circle :icon="playing ? 'VideoPause' : 'VideoPlay'" @click="togglePlay" :aria-label="playing ? '暂停' : '播放'" />
            <span class="tl-date">2026-11-02</span>
            <el-tag size="small" type="info">白天全量录像</el-tag>
            <span class="mono-num tl-pos">{{ Math.floor(progress / 100 * 24) }}:{{ String(Math.floor((progress * 60 / 100) % 60)).padStart(2, '0') }}</span>
          </div>
          <div
            class="tl-track"
            role="slider"
            aria-label="回放进度"
            :aria-valuenow="Math.round(progress)"
            aria-valuemin="0"
            aria-valuemax="100"
            tabindex="0"
            @click="(e) => seek(Math.round((e.offsetX / e.target.clientWidth) * 100))"
            @keydown.left.prevent="seek(Math.max(0, progress - 2))"
            @keydown.right.prevent="seek(Math.min(100, progress + 2))"
          >
            <div class="tl-fill" :style="{ width: progress + '%' }"></div>
            <div v-for="h in [6, 12, 18]" :key="h" class="tl-mark" :style="{ left: (h / 24) * 100 + '%' }"><span>{{ h }}:00</span></div>
          </div>
        </div>
      </div>

      <!-- 通道列表 + 抓拍记录 -->
      <div class="side-col">
        <div class="ag-card anim-up anim-delay-1">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>摄像头通道</div></div>
          <div class="ag-card__body cam-list">
            <div v-for="cam in cameras" :key="cam.id" class="cam-item">
              <span class="pulse-dot" :class="cam.status"></span>
              <span class="cam-name">{{ cam.name }}</span>
              <el-tag size="small" type="info" effect="plain">CH{{ cam.channel || '-' }}</el-tag>
            </div>
          </div>
        </div>

        <div class="ag-card anim-up anim-delay-2">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>截图抓拍记录</div></div>
          <div class="ag-card__body">
            <transition-group name="list" tag="div" class="shot-list">
              <div v-for="s in shots" :key="s.id" class="shot-item">
                <el-icon color="#699C78"><Camera /></el-icon>
                <div class="shot-meta">
                  <div class="shot-name">{{ s.name }}</div>
                  <div class="text-dim">{{ s.time }}</div>
                </div>
              </div>
            </transition-group>
            <el-empty v-if="!shots.length" description="点击画面右上角相机按钮抓拍" :image-size="56" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.video-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  align-items: start;
}
.main-panel {
  padding: 14px;
}
.video-grid {
  display: grid;
  gap: 8px;
}
.g-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.g-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.g-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
.g-16 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
.video-grid.g-1 { height: 560px; }
.video-grid.g-4 { height: 560px; }
.video-grid.g-9 { height: 660px; }
.video-grid.g-16 { height: 760px; }

.v-cell {
  border-radius: var(--ag-radius); /* 决策依据：视频窗口格属面板类，token 化为卡片档 10px（值不变） */
  overflow: hidden;
  position: relative;
  background: #182636;
  min-height: 90px;
}
.v-empty {
  height: 100%;
  min-height: 90px;
  display: grid;
  place-items: center;
  color: #33445a;
  gap: 6px;
  font-size: 12px;
  grid-auto-flow: row;
}
.v-screen {
  height: 100%;
  min-height: 90px;
  position: relative;
  /* 决策依据：视频占位多段渐变属纯装饰、不承载信息，按简约高级规范改为单一深色实底 */
  background: #1c2a3c;
  /* 决策依据：原 camSway 用于平移渐变背景，背景改单色后动画已无可见效果，
     却仍每帧占用合成开销，故连同 keyframes 一并移除（纹理由 .v-noise 承担） */
  overflow: hidden;
}
.v-noise {
  position: absolute;
  inset: 0;
  opacity: 0.06;
  background-image: repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px);
  transition: background-position 2s;
}
.v-label {
  position: absolute;
  top: 8px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #d9f3e5;
  font-size: 12px;
  z-index: 2;
}
.v-code {
  color: rgba(217, 243, 229, 0.55);
  font-size: 10px;
}
.v-rec {
  position: absolute;
  top: 8px;
  right: 12px;
  color: #E84A5F;
  font-size: 11px;
  letter-spacing: 1px;
  animation: agBlink 1.6s infinite;
}
.v-time {
  position: absolute;
  top: 8px;
  right: 12px;
  color: #9FC3DD;
  font-size: 11px;
}
.v-shot {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 28px;
  height: 28px;
  border-radius: var(--ag-radius-sm); /* 决策依据：28px 截图图标按钮属小控件，对齐控件档 6px */
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  backdrop-filter: blur(3px);
  transition: all 0.2s;
}
.v-shot:hover {
  background: rgba(255, 255, 255, 0.32);
  /* 决策依据：hover 放大属装饰性动效，按简约高级规范移除 transform；:active 按压反馈保留 */
}
.v-shot:active {
  transform: scale(0.9);
}

/* 时间轴 */
.timeline {
  margin-top: 14px;
}
.tl-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}
.tl-date {
  font-weight: 600;
}
.tl-pos {
  margin-left: auto;
  color: var(--ag-green-700);
  font-weight: 700;
}
.tl-track {
  position: relative;
  height: 26px;
  border-radius: var(--ag-radius-sm); /* 决策依据：时间轴轨道属控件，对齐控件档 6px */
  background: #eef2f7;
  cursor: pointer;
  overflow: hidden;
}
.tl-fill {
  height: 100%;
  /* 决策依据：进度条双色渐变不承载进度以外的信息、属纯装饰，按简约高级规范改为单色 */
  background: var(--ag-green-600);
  border-radius: var(--ag-radius-sm); /* 决策依据：时间轴填充属控件，对齐控件档 6px */
  transition: width 0.3s linear;
  position: relative;
}
.tl-fill::after {
  content: '';
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--ag-green-600);
}
.tl-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px dashed rgba(100, 116, 139, 0.5);
}
.tl-mark span {
  position: absolute;
  top: 3px;
  left: 4px;
  font-size: 10px;
  color: var(--ag-text-4);
}

/* 侧栏 */
.side-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.cam-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow: auto;
}
.cam-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 4px;
  border-bottom: 1px dashed var(--ag-border-light);
  font-size: 13px;
}
.cam-item:last-child {
  border-bottom: none;
}
.cam-name {
  flex: 1;
}
.shot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}
.shot-item {
  display: flex;
  gap: 10px;
  align-items: center;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：抓拍记录行属卡片类，token 化为卡片档 10px（值不变） */
  padding: 8px 12px;
}
.shot-name {
  font-size: 12px;
  font-weight: 500;
}
.list-enter-active {
  transition: all 0.3s var(--ag-ease);
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-14px);
}

@media (max-width: 1100px) {
  .video-layout { grid-template-columns: 1fr; }
}
</style>
