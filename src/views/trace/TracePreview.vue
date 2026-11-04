<script setup>
/** 页面 40 · 溯源扫码预览页：预览消费者端溯源页面效果（手机模拟器） */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { PageHeader } from '@/components/ui'
import { traceApi } from '@/api'

const router = useRouter()
const batches = ref([])
const activeCode = ref('')
const qrCanvas = ref(null)

onMounted(async () => {
  try {
    const res = await traceApi.page({ page: 1, size: 20, status: '已发布' })
    batches.value = res.list
    if (res.list.length) {
      activeCode.value = res.list[0].code
      renderQr()
    }
  } catch (e) {
    console.warn('[TracePreview]', e?.message || e)
  }
})
async function renderQr() {
  try {
    await qrCanvas.value && QRCode.toCanvas(qrCanvas.value, `${window.location.origin}/trace/${activeCode.value}`, { width: 160, margin: 1 })
  } catch (e) {
    console.warn('[TracePreview] QR:', e?.message || e)
  }
}
function pick(code) {
  activeCode.value = code
  renderQr()
}
</script>

<template>
  <div class="page">
    <PageHeader title="溯源扫码预览" desc="模拟消费者扫码场景，预览溯源页面效果；点击「手机内打开」跳转真实溯源页" />

    <div class="preview-layout">
      <!-- 批次选择 + 二维码 -->
      <div class="left-col">
        <div class="ag-card anim-left">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>已发布批次</div></div>
          <div class="ag-card__body batch-list">
            <button
              v-for="b in batches"
              :key="b.id"
              class="b-item"
              :class="{ active: activeCode === b.code }"
              @click="pick(b.code)"
            >
              <b>{{ b.crop }}</b>
              <span class="text-dim">{{ b.code }} · {{ b.scans }} 次扫码</span>
            </button>
            <el-empty v-if="!batches.length" description="暂无已发布批次" :image-size="70" />
          </div>
        </div>

        <div class="ag-card anim-up anim-delay-1 qr-card">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>扫码入口</div></div>
          <div class="ag-card__body" style="display: flex; flex-direction: column; align-items: center; gap: 10px">
            <canvas ref="qrCanvas" class="pv-qr"></canvas>
            <span class="text-dim">使用手机浏览器或微信扫描体验</span>
            <el-button type="primary" :icon="'Iphone'" @click="router.push(`/trace/${activeCode}`)">在手机模拟器中打开</el-button>
          </div>
        </div>
      </div>

      <!-- 手机预览框 -->
      <div class="phone-mock anim-zoom">
        <div class="pm-notch"></div>
        <div class="pm-screen">
          <div class="pm-hero">
            <span class="pm-tag">智慧农业 · 一物一码</span>
            <h3>扫码成功</h3>
            <p>正在加载溯源信息…</p>
            <div class="pm-load">
              <div class="pm-bar"></div>
            </div>
          </div>
          <div class="pm-feats">
            <div class="pm-feat"><el-icon color="#074ce0"><Place /></el-icon>产地信息</div>
            <div class="pm-feat"><el-icon color="#c9803e"><Calendar /></el-icon>生长周期</div>
            <div class="pm-feat"><el-icon color="#4C6983"><Sunny /></el-icon>环境数据</div>
            <div class="pm-feat"><el-icon color="#B17179"><Document /></el-icon>检测报告</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-layout {
  display: grid;
  grid-template-columns: 360px 300px;
  gap: 20px;
  justify-content: center;
}
.left-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.batch-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow: auto;
}
.b-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  background: var(--ag-bg-hover);
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：批次选择行属卡片类，token 化为卡片档 10px（值不变） */
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.b-item:hover {
  border-color: var(--ag-green-300);
}
.b-item.active {
  border-color: var(--ag-green-600);
  background: var(--ag-green-50);
}
.qr-card :deep(.ag-card__body) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.pv-qr {
  border-radius: var(--ag-radius); /* 决策依据：二维码块属卡片类，token 化为卡片档 10px（值不变） */
}

/* 手机模拟 */
.phone-mock {
  width: 260px;
  background: #1C2A3C;
  border-radius: 36px;
  padding: 12px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);
  position: relative;
  height: fit-content;
}
.pm-notch {
  width: 90px;
  height: 20px;
  background: #1C2A3C;
  border-radius: 10px;
  margin: 0 auto 8px;
}
.pm-screen {
  /* 决策依据：浅色底双色淡渐变属纯装饰、不承载信息，按简约高级规范改为单一淡色 */
  background: #f3f8f4;
  border-radius: 24px;
  overflow: hidden;
}
.pm-hero {
  padding: 34px 20px 26px;
  text-align: center;
  /* 决策依据：hero 双色渐变不承载内容信息、属纯装饰，按简约高级规范改为单色 */
  background: var(--ag-green-600);
  color: #fff;
  position: relative;
  overflow: hidden;
}
.pm-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  /* 决策依据：原为叠在 hero 上的局部高光光斑（radial-gradient），按简约高级规范删除该声明，其余属性保留 */
}
.pm-tag {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 10px;
  border-radius: var(--ag-radius-sm); /* 决策依据：hero 内角标属标签类小控件，对齐控件档 6px */
  letter-spacing: 1px;
}
.pm-hero h3 {
  margin: 12px 0 4px;
  font-size: 20px;
}
.pm-hero p {
  margin: 0;
  font-size: 11px;
  opacity: 0.85;
}
.pm-load {
  width: 120px;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 3px;
  margin: 14px auto 0;
  overflow: hidden;
}
.pm-bar {
  height: 100%;
  width: 40%;
  background: #fff;
  border-radius: 3px;
  animation: loadSlide 1.6s ease-in-out infinite;
}
@keyframes loadSlide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(320%); }
}
.pm-feats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px;
}
.pm-feat {
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：卖点小卡属卡片类，对齐卡片档 10px */
  padding: 12px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ag-text-2);
  box-shadow: var(--ag-shadow-sm);
}
</style>
