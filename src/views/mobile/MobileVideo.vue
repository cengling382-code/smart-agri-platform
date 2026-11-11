<script setup>
/** 页面 61 · 移动端视频预览页：实时视频流预览、截图抓拍 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { deviceApi } from '@/api'
import { onDataChange } from '@/composables/useDataVersion'

const cameras = ref([])
const activeIdx = ref(0)
const shots = ref([])
const sceneRef = ref(null)
let sceneTimer = null
let phase = 0

async function load() {
  try {
    const all = await deviceApi.all()
    const list = all.filter((d) => d.type === 'camera')
    if (list.length) {
      cameras.value = list
      if (activeIdx.value >= list.length) activeIdx.value = 0
    } else if (!cameras.value.length) {
      cameras.value = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `摄像头-${i + 1}`, code: `CAM-30${i}`, status: 'online' }))
    }
  } catch { /* 保留现有画面，不因刷新失败清空 */ }
}
onMounted(async () => {
  await load()
  startScene()
})
onDataChange(load, { debounce: 400 })
onBeforeUnmount(() => clearInterval(sceneTimer))

const active = () => cameras.value[activeIdx.value]

watch(activeIdx, () => {
  phase = 0
  drawScene()
})

/* 用 Canvas 模拟实时视频画面：棚架、作物、移动扫描线、时间戳，可真实抓拍出图 */
function startScene() {
  clearInterval(sceneTimer)
  sceneTimer = setInterval(() => {
    phase = (phase + 1) % 120
    drawScene()
  }, 120)
}
function drawScene() {
  const c = sceneRef.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const w = c.width
  const h = c.height

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#22384d')
  sky.addColorStop(1, '#12202e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // 棚架（雾蓝灰，与 PC 品牌辅色同源）
  ctx.strokeStyle = 'rgba(159, 195, 221, 0.32)'
  ctx.lineWidth = 2
  for (let x = 40; x < w; x += 90) {
    ctx.beginPath()
    ctx.moveTo(x, 40)
    ctx.lineTo(x, h - 30)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(20, 60)
  ctx.lineTo(w - 20, 60)
  ctx.stroke()

  // 地面与作物（画面内容色，非 UI 装饰）
  ctx.fillStyle = '#24412f'
  ctx.fillRect(0, h - 60, w, 60)
  ctx.fillStyle = '#3f7a52'
  for (let i = 0; i < 9; i++) {
    const x = 30 + i * 68
    ctx.beginPath()
    ctx.ellipse(x, h - 62, 22, 12, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 移动扫描线：改用 accent 淡色，与 PC 高亮色统一
  const y = 70 + ((phase / 120) * (h - 140))
  ctx.strokeStyle = 'rgba(147, 176, 247, 0.45)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(w, y)
  ctx.stroke()

  // 时间戳（左下）：避免与右下角「抓拍」浮层按钮重叠
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.fillText(new Date().toLocaleString('zh-CN', { hour12: false }), 20, h - 16)
}

function snapshot() {
  const c = sceneRef.value
  if (!c) return
  const cam = active()
  const img = c.toDataURL('image/jpeg', 0.85)
  const s = {
    id: Date.now(),
    img,
    name: `${cam?.name || '摄像头'}_抓拍_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}.jpg`,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  shots.value.unshift(s)
  ElMessage.success(`已抓拍：${s.name}`)
}
function downloadShot(s) {
  const link = document.createElement('a')
  link.download = s.name
  link.href = s.img
  link.click()
}
</script>

<template>
  <div class="m-page m-video">
    <div class="m-page-head">
      <div>
        <h1 class="m-page-title">视频预览</h1>
        <p class="m-page-desc">实时画面查看 · 截图抓拍留存</p>
      </div>
    </div>

    <!-- 主画面 -->
    <div class="mv-screen">
      <div class="mv-video">
        <canvas ref="sceneRef" width="640" height="340" class="mv-canvas"></canvas>
        <div class="mv-noise"></div>
        <div class="mv-label">
          <span class="pulse-dot is-on"></span>
          {{ active()?.name }}
        </div>
        <div class="mv-rec">● LIVE</div>
      </div>
      <button class="mv-shot" aria-label="截图抓拍" @click="snapshot"><el-icon :size="16"><Camera /></el-icon> 抓拍</button>
    </div>

    <!-- 抓拍记录 -->
    <section class="m-card">
      <div class="m-card-head">
        <div class="m-card-title"><span class="dot"></span>截图抓拍记录</div>
      </div>
      <div class="m-card-body">
        <div class="shot-list">
          <div v-for="s in shots" :key="s.id" class="shot-row" @click="downloadShot(s)">
            <img v-if="s.img" :src="s.img" class="shot-thumb" alt="抓拍画面" />
            <el-icon v-else class="shot-ico"><Camera /></el-icon>
            <div class="s-meta">
              <b>{{ s.name }}</b>
              <span class="text-dim">{{ s.time }} · 点击保存</span>
            </div>
          </div>
          <div v-if="!shots.length" class="m-empty">点击画面右下角「抓拍」按钮留存现场画面</div>
        </div>
      </div>
    </section>

    <!-- 通道切换 -->
    <div class="m-seg ch-chips">
      <button v-for="(c, i) in cameras" :key="c.id" :class="{ on: i === activeIdx }" @click="activeIdx = i">
        CH{{ i + 1 }} · {{ c.name.slice(0, 6) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 视频屏：深色面板 + PC 面板圆角/描边，投影取统一面板阴影 */
.mv-screen {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius);
  background: #182636;
  box-shadow: var(--ag-shadow);
}
.mv-video {
  background: #1c2a3c;
  position: relative;
}
/* 画布按自身比例自适应宽度，避免 object-fit: cover 裁掉左下角时间戳 */
.mv-canvas {
  display: block;
  width: 100%;
  height: auto;
}
.mv-noise {
  position: absolute;
  inset: 0;
  opacity: 0.07;
  background-image: repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px);
  pointer-events: none;
}
.mv-label {
  position: absolute;
  top: 12px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #fff;
  font-size: var(--ag-fs-micro);
}
.mv-rec {
  position: absolute;
  top: 12px;
  right: 14px;
  color: var(--ag-danger);
  font-size: 11px;
  animation: agBlink 1.6s infinite;
}
/* 浮层按钮：与 PC 浮层控件同形（8px 圆角 / 12px 字 / 半透明底） */
.mv-shot {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  padding: 0 var(--ag-space-3);
  border: none;
  border-radius: var(--ag-radius-sm);
  background: rgba(255, 255, 255, 0.18);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  color: #fff;
  font: inherit;
  font-size: var(--ag-fs-micro);
  cursor: pointer;
  transition: transform var(--ag-dur-fast) var(--ag-ease);
}
.mv-shot:active {
  transform: scale(0.94);
}
.m-video > .m-card {
  margin-top: var(--ag-space-3);
}
.shot-list {
  display: flex;
  flex-direction: column;
  gap: var(--ag-space-2);
  max-height: 200px;
  overflow: auto;
}
.shot-row {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  padding: var(--ag-space-2) var(--ag-space-3);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-bg-hover);
  cursor: pointer;
}
.shot-thumb {
  width: 54px;
  height: 32px;
  flex: none;
  object-fit: cover;
  border-radius: 6px;
}
.shot-ico {
  width: 54px;
  flex: none;
  display: grid;
  place-items: center;
  color: var(--ag-text-4);
}
.s-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.s-meta b {
  font-size: var(--ag-fs-micro);
  font-weight: 600;
  color: var(--ag-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-chips {
  margin-top: var(--ag-space-3);
}
</style>
