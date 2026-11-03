<script setup>
/** 页面 68 · 扫码启动加载页：扫描溯源二维码后跳转的加载页（自动跳转溯源详情） */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const progress = ref(0)
const code = route.params.code || 'TR-2026-0700'
const STEP = ['验证二维码', '加载溯源档案', '关联农事记录', '准备完成']

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    progress.value = Math.min(100, progress.value + Math.random() * 16 + 6)
    if (progress.value >= 100) {
      clearInterval(timer)
      setTimeout(() => router.replace(`/trace/${code}`), 420)
    }
  }, 260)
})
onBeforeUnmount(() => clearInterval(timer))
const stepText = ref('')
</script>

<template>
  <div class="scan-loading">
    <!-- 扫描动画 -->
    <div class="scan-box">
      <div class="scan-frame">
        <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
        <div class="scan-line"></div>
        <svg viewBox="0 0 48 48" class="leaf" aria-hidden="true">
          <path d="M24 38c0-9 3-16 12-21 1 12-4 19-12 21zm0 0c0-7-2.5-12.5-9.5-16.5C13.6 30.5 18 36.2 24 38z" fill="#7DC383" />
        </svg>
      </div>
      <p class="code mono-num">{{ code }}</p>
    </div>

    <h1>智慧农业 · 一物一码溯源</h1>
    <p class="sub">正在为您加载该批农产品从田间到餐桌的全过程信息…</p>

    <!-- 进度 -->
    <div class="progress-wrap">
      <div class="bar"><i :style="{ width: progress + '%' }"></i></div>
      <span class="pct mono-num">{{ Math.round(progress) }}%</span>
    </div>

    <transition name="fade" mode="out-in">
      <p :key="Math.floor(progress / 26)" class="step">
        {{ STEP[Math.min(3, Math.floor(progress / 26))] }}…
      </p>
    </transition>

    <div class="feats">
      <span>🌱 产地环境</span>
      <span>🌾 生长周期</span>
      <span>🧪 检测报告</span>
      <span>🏢 企业信息</span>
    </div>
  </div>
</template>

<style scoped>
.scan-loading {
  min-height: 100vh;
  /* 决策依据：原为装饰性光斑与双色淡渐变，均不承载信息，按简约高级规范改为单一底色 */
  background: #f3f8f4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
}
.scan-box {
  margin-bottom: 30px;
}
.scan-frame {
  width: 150px;
  height: 150px;
  border-radius: var(--ag-radius-lg); /* 决策依据：150px 扫码框属大块面板，对齐浮层档 14px */
  background: #fff;
  box-shadow: var(--ag-shadow); /* 决策依据：绿色投影属刻意堆砌的光影，改为中性 --ag-shadow */
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.corner {
  position: absolute;
  width: 26px;
  height: 26px;
  border: 3.5px solid var(--ag-green-600);
}
.corner.tl { top: 10px; left: 10px; border-right: none; border-bottom: none; border-radius: 8px 0 0 0; }
.corner.tr { top: 10px; right: 10px; border-left: none; border-bottom: none; border-radius: 0 8px 0 0; }
.corner.bl { bottom: 10px; left: 10px; border-right: none; border-top: none; border-radius: 0 0 0 8px; }
.corner.br { bottom: 10px; right: 10px; border-left: none; border-top: none; border-radius: 0 0 8px 0; }
.scan-line {
  position: absolute;
  left: 14px;
  right: 14px;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, transparent, #7DC383, transparent);
  box-shadow: 0 0 12px rgba(125, 195, 131, 0.8);
  animation: scanMove 1.8s ease-in-out infinite;
}
@keyframes scanMove {
  0%, 100% { top: 22px; }
  50% { top: calc(100% - 25px); }
}
.leaf {
  width: 58px;
  height: 58px;
  /* 决策依据：agLeaf 无限循环属装饰性动画，按简约高级规范移除，元素与其余样式保留 */
}
.code {
  margin-top: 14px;
  font-size: 13px;
  color: var(--ag-green-700);
  letter-spacing: 1px;
  background: #fff;
  padding: 5px 16px;
  border-radius: var(--ag-radius-sm); /* 决策依据：溯源码 chip 属小控件，对齐控件档 6px */
  box-shadow: var(--ag-shadow-sm);
}
h1 {
  font-size: 24px;
  margin: 0 0 8px;
  color: var(--ag-text-1);
}
.sub {
  color: var(--ag-text-3);
  font-size: 13px;
  margin: 0 0 30px;
  max-width: 320px;
  line-height: 1.7;
}
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(300px, 80%);
}
.bar {
  flex: 1;
  height: 8px;
  border-radius: 5px;
  background: rgba(105, 156, 120, 0.14);
  overflow: hidden;
}
.bar i {
  display: block;
  height: 100%;
  border-radius: 5px;
  /* 决策依据：进度条双色渐变不承载进度以外的信息、属纯装饰，按简约高级规范改为单色 */
  background: var(--ag-green-600);
  transition: width 0.3s var(--ag-ease);
}
.pct {
  width: 42px;
  text-align: right;
  color: var(--ag-green-700);
  font-weight: 700;
}
.step {
  margin-top: 14px;
  font-size: 13px;
  color: var(--ag-text-2);
}
.feats {
  display: flex;
  gap: 18px;
  margin-top: 34px;
  flex-wrap: wrap;
  justify-content: center;
}
.feats span {
  background: #fff;
  border-radius: var(--ag-radius-sm); /* 决策依据：特性说明 chip 属小控件，对齐控件档 6px */
  padding: 8px 14px;
  font-size: 12px;
  color: var(--ag-text-2);
  box-shadow: var(--ag-shadow-sm);
  animation: agFadeUp 0.6s var(--ag-ease) both;
}
.feats span:nth-child(2) { animation-delay: 0.08s; }
.feats span:nth-child(3) { animation-delay: 0.16s; }
.feats span:nth-child(4) { animation-delay: 0.24s; }
</style>
