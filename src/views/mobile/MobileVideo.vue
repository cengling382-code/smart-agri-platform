<script setup>
/** 页面 61 · 移动端视频预览页：实时视频流预览、截图抓拍 */
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { deviceApi } from '@/api'

const cameras = ref([])
const activeIdx = ref(0)
const shots = ref([])

onMounted(async () => {
  try {
    const all = await deviceApi.all()
    cameras.value = all.filter((d) => d.type === 'camera')
  } catch { /* fallback */ }
  if (!cameras.value.length) cameras.value = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `摄像头-${i + 1}`, code: `CAM-30${i}`, status: 'online' }))
})

const active = () => cameras.value[activeIdx.value]

function snapshot() {
  const c = active()
  const s = { id: Date.now(), name: `${c.name}_抓拍_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}.jpg`, time: new Date().toLocaleString('zh-CN', { hour12: false }) }
  shots.value.unshift(s)
  ElMessage.success(`已抓拍：${s.name}`)
}
</script>

<template>
  <div class="m-video">
    <!-- 主画面 -->
    <div class="mv-screen">
      <div class="mv-video" :key="activeIdx">
        <div class="mv-noise"></div>
        <div class="mv-label">
          <span class="pulse-dot is-on"></span>
          {{ active()?.name }}
        </div>
        <div class="mv-rec">● LIVE</div>
      </div>
      <button class="mv-shot" aria-label="截图抓拍" @click="snapshot"><el-icon :size="18"><Camera /></el-icon> 抓拍</button>
    </div>

    <!-- 抓拍记录 -->
    <div class="m-card">
      <div class="sec-title">截图抓拍记录</div>
      <div class="shot-list">
        <div v-for="s in shots" :key="s.id" class="shot-row">
          <el-icon color="#699C78"><Camera /></el-icon>
          <div class="s-meta">
            <b>{{ s.name }}</b>
            <span class="text-dim">{{ s.time }}</span>
          </div>
        </div>
        <div v-if="!shots.length" class="m-empty">点击右上角「抓拍」按钮留存现场画面</div>
      </div>
    </div>

    <!-- 通道切换 -->
    <div class="chips">
      <button v-for="(c, i) in cameras" :key="c.id" :class="{ on: i === activeIdx }" @click="activeIdx = i">
        CH{{ i + 1 }} · {{ c.name.slice(0, 6) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.m-video {
  padding: 16px;
  min-height: 100%;
}
.mv-screen {
  position: relative;
  border-radius: var(--ag-radius-lg); /* 决策依据：视频播放屏属大块面板，对齐浮层档 14px */
  overflow: hidden;
  background: #182636;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.35);
}
.mv-video {
  height: 220px;
  /* 决策依据：视频占位多段渐变属纯装饰、不承载信息，按简约高级规范改为单一深色实底 */
  background: #1c2a3c;
  /* 决策依据：原 camSway 用于平移渐变背景，背景改单色后动画已无可见效果，
     却仍每帧占用合成开销，故连同 keyframes 一并移除（纹理由 .mv-noise 承担） */
  position: relative;
}
.mv-noise {
  position: absolute;
  inset: 0;
  opacity: 0.07;
  background-image: repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px);
}
.mv-label {
  position: absolute;
  top: 12px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #d9f3e5;
  font-size: 13px;
}
.mv-rec {
  position: absolute;
  top: 12px;
  right: 14px;
  color: #E84A5F;
  font-size: 11px;
  animation: agBlink 1.6s infinite;
}
.mv-shot {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 12px;
  padding: 7px 13px;
  border-radius: var(--ag-radius-sm); /* 决策依据：截图浮层按钮属小控件，对齐控件档 6px */
  cursor: pointer;
  transition: transform 0.2s;
}
.mv-shot:active {
  transform: scale(0.92);
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
  margin-bottom: 10px;
}
.shot-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  max-height: 200px;
  overflow: auto;
}
.shot-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：截图记录行属卡片类，对齐卡片档 10px */
  padding: 9px 12px;
}
.s-meta {
  display: flex;
  flex-direction: column;
}
.s-meta b {
  font-size: 12px;
}
.m-empty {
  text-align: center;
  color: var(--ag-text-4);
  font-size: 12px;
  padding: 16px 0;
}
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-top: 14px;
  padding-bottom: 4px;
}
.chips button {
  flex: none;
  border: 1px solid var(--ag-border);
  background: #fff;
  color: var(--ag-text-2);
  font-size: 12px;
  padding: 7px 12px;
  border-radius: var(--ag-radius-sm); /* 决策依据：通道切换 chip 属小控件，对齐控件档 6px */
  cursor: pointer;
}
.chips button.on {
  background: var(--ag-green-600);
  border-color: var(--ag-green-600);
  color: #fff;
  font-weight: 600;
}
</style>
