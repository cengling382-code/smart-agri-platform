<script setup>
/** 页面 69 · 溯源详情页（消费者端）：产地信息、生长周期、农事记录、环境数据、检测报告、企业信息 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { traceApi } from '@/api'

const route = useRoute()
const loading = ref(true)
const detail = ref(null)
const activeTab = ref('story')
let spinTimer = null
const spin = ref(0)

const TABS = [
  { key: 'story', label: '产地故事', icon: 'Promotion' },
  { key: 'farm', label: '生长周期', icon: 'Calendar' },
  { key: 'env', label: '产地环境', icon: 'Sunny' },
  { key: 'report', label: '检测报告', icon: 'Document' },
  { key: 'company', label: '企业信息', icon: 'OfficeBuilding' },
]

onMounted(async () => {
  try {
    detail.value = await traceApi.publicDetail(route.params.code)
  } catch {
    // 演示兜底
    detail.value = { batch: { code: route.params.code, crop: '番茄', plotName: '1号智能大棚', qty: '1860kg' }, plot: {}, farmRecords: [], report: null, company: null }
  } finally {
    loading.value = false
  }
  spinTimer = setInterval(() => (spin.value = (spin.value + 1) % 100), 3000)
})
onBeforeUnmount(() => clearInterval(spinTimer))
</script>

<template>
  <div class="trace-detail" v-loading="loading">
    <template v-if="detail">
      <!-- 顶部产品头 -->
      <header class="td-hero">
        <div class="td-bg"></div>
        <span class="td-badge">✓ 平台认证 · 一物一码</span>
        <div class="td-product">
          <div class="td-img">🍅</div>
          <div class="td-info">
            <h1>{{ detail.batch?.crop }} · {{ detail.plot?.name || detail.batch?.plotName }}</h1>
            <p class="mono-num">溯源码 {{ detail.batch?.code }}</p>
            <div class="td-chips">
              <span>🌱 绿色种植</span>
              <span>🧪 检测{{ detail.report ? '合格' : '待上传' }}</span>
              <span>📡 全程监控</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Tab 导航 -->
      <nav class="td-tabs">
        <button v-for="t in TABS" :key="t.key" :class="{ on: activeTab === t.key }" @click="activeTab = t.key">
          <el-icon :size="14"><component :is="t.icon" /></el-icon>{{ t.label }}
        </button>
      </nav>

      <div class="td-body">
        <!-- 产地故事 -->
        <section v-show="activeTab === 'story'" class="td-card anim-up">
          <h3>产地故事</h3>
          <p class="story">
            本批次 {{ detail.batch?.crop }} 产自{{ detail.plot?.name || detail.batch?.plotName }}，全生长期采用水肥一体化智能灌溉与绿色防控技术，
            农事操作全程数字化记录并上链存证。采收后经专业机构农残检测，合格后上市销售。
            扫一扫下方溯源码，见证它从一粒种子到餐桌的全过程。
          </p>
          <div class="story-stats">
            <div><b class="mono-num">{{ detail.batch?.records?.farm || 12 }}</b><span>条农事记录</span></div>
            <div><b class="mono-num">{{ detail.batch?.records?.env || 520 }}</b><span>条环境数据</span></div>
            <div><b class="mono-num">{{ detail.batch?.records?.tests || 1 }}</b><span>份检测报告</span></div>
          </div>
        </section>

        <!-- 生长周期 -->
        <section v-show="activeTab === 'farm'" class="td-card anim-up">
          <h3>生长周期 · 农事记录</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(r, i) in detail.farmRecords"
              :key="i"
              :timestamp="r.time"
              :type="i === 0 ? 'success' : 'primary'"
              placement="top"
            >
              <b>{{ r.type }}</b> · {{ r.note }} <span class="text-dim">（{{ r.operator }}）</span>
            </el-timeline-item>
          </el-timeline>
        </section>

        <!-- 产地环境 -->
        <section v-show="activeTab === 'env'" class="td-card anim-up">
          <h3>产地环境数据（实时）</h3>
          <div class="env-grid">
            <div class="e-cell"><span>空气温度</span><b class="mono-num">{{ detail.env?.temp ?? detail.env?.waterT ?? '—' }}℃</b></div>
            <div class="e-cell"><span>空气湿度</span><b class="mono-num">{{ detail.env?.hum ?? detail.env?.oxygen ?? '—' }}%</b></div>
            <div class="e-cell"><span>光照强度</span><b class="mono-num">{{ detail.env?.light ?? '—' }}klx</b></div>
            <div class="e-cell"><span>土壤湿度</span><b class="mono-num">{{ detail.env?.soilH ?? '—' }}%</b></div>
            <div class="e-cell"><span>PH 值</span><b class="mono-num">{{ detail.env?.ph ?? '—' }}</b></div>
            <div class="e-cell"><span>CO₂</span><b class="mono-num">{{ detail.env?.co2 ?? '—' }}ppm</b></div>
          </div>
          <div class="env-note">
            <el-icon color="#699C78"><Sunny /></el-icon>
            数据来自产地部署的物联网传感器，每 5 分钟自动更新，全程可追溯。
          </div>
        </section>

        <!-- 检测报告 -->
        <section v-show="activeTab === 'report'" class="td-card anim-up">
          <h3>农残检测报告</h3>
          <template v-if="detail.report">
            <div class="report-row">
              <span class="rr-result">✓ 检测合格</span>
              <span class="mono-num">{{ detail.report.code }}</span>
            </div>
            <div class="rows">
              <div><span>检测项目</span><b>{{ detail.report.item }}</b></div>
              <div><span>检测机构</span><b>{{ detail.report.org }}</b></div>
              <div><span>检测日期</span><b class="mono-num">{{ detail.report.date }}</b></div>
              <div><span>报告文件</span><b>{{ detail.report.file }}</b></div>
            </div>
          </template>
          <el-empty v-else description="检测报告整理中，发布后将在此展示" :image-size="70" />
        </section>

        <!-- 企业信息 -->
        <section v-show="activeTab === 'company'" class="td-card anim-up">
          <h3>生产企业信息</h3>
          <div class="rows">
            <div><span>企业名称</span><b>{{ detail.company?.name }}</b></div>
            <div><span>统一信用代码</span><b class="mono-num">{{ detail.company?.license }}</b></div>
            <div><span>基地地址</span><b>{{ detail.company?.address }}</b></div>
            <div><span>联系电话</span><b class="mono-num">{{ detail.company?.phone }}</b></div>
          </div>
          <div class="certs">
            <span v-for="c in detail.company?.certs || []" :key="c">🏅 {{ c }}</span>
          </div>
        </section>
      </div>

      <footer class="td-foot">
        <span>数据由 智慧农业综合管理平台 提供区块链存证</span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.trace-detail {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 30px;
}
.td-hero {
  position: relative;
  padding: 26px 20px 56px;
  overflow: hidden;
}
.td-bg {
  position: absolute;
  inset: 0;
  /* 决策依据：hero 多段渐变属纯装饰、不承载信息，按简约高级规范改为单一深色实底 */
  background: #22334a;
}
.td-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  /* 决策依据：原为叠在深色 hero 上的局部高光光斑（radial-gradient），按简约高级规范删除该声明，其余属性保留 */
}
.td-badge {
  position: relative;
  display: inline-block;
  background: rgba(255, 255, 255, 0.16);
  color: #DCEBE0;
  font-size: 11px;
  padding: 4px 12px;
  border-radius: var(--ag-radius-sm); /* 决策依据：溯源徽标属标签类小控件，对齐控件档 6px */
  letter-spacing: 1px;
  backdrop-filter: blur(4px);
}
.td-product {
  position: relative;
  display: flex;
  gap: 20px;
  align-items: center;
  margin-top: 18px;
}
.td-img {
  width: 78px;
  height: 78px;
  border-radius: var(--ag-radius-lg); /* 决策依据：78px 产品图块属大圆角块面，归浮层档 14px */
  background: rgba(255, 255, 255, 0.14);
  display: grid;
  place-items: center;
  font-size: 38px;
  backdrop-filter: blur(4px);
  /* 决策依据：agFloat 无限浮动属装饰性动画，按简约高级规范移除，元素与其余样式保留 */
}
.td-info h1 {
  color: #fff;
  font-size: 20px;
  margin: 0 0 4px;
}
.td-info p {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  margin: 0 0 8px;
}
.td-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.td-chips span {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 10.5px;
  padding: 3px 9px;
  border-radius: var(--ag-radius-sm); /* 决策依据：属性 chip 属小控件，对齐控件档 6px */
}
.td-tabs {
  display: flex;
  gap: 6px;
  padding: 14px 16px 0;
  overflow-x: auto;
  position: relative;
  margin-top: -30px;
}
.td-tabs button {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: #fff;
  color: var(--ag-text-2);
  font-size: 12.5px;
  padding: 9px 15px;
  border-radius: var(--ag-radius-sm); /* 决策依据：页签按钮属小控件，对齐控件档 6px */
  cursor: pointer;
  box-shadow: var(--ag-shadow-sm);
  transition: all 0.22s var(--ag-ease);
}
.td-tabs button.on {
  background: var(--ag-green-600);
  color: #fff;
  font-weight: 700;
  box-shadow: var(--ag-shadow); /* 决策依据：绿色投影属刻意堆砌的光影，改为中性 --ag-shadow */
}
.td-body {
  padding: 14px 16px;
}
.td-card {
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：内容主卡片属大块面板，对齐浮层档 14px */
  padding: 18px;
  box-shadow: var(--ag-shadow-sm);
}
.td-card h3 {
  margin: 0 0 12px;
  font-size: 15px;
  padding-left: 9px;
  border-left: 3px solid var(--ag-green-600);
}
.story {
  color: var(--ag-text-2);
  font-size: 13.5px;
  line-height: 2;
  margin: 0 0 16px;
  text-align: justify;
}
.story-stats {
  display: flex;
  justify-content: space-around;
  background: var(--ag-green-50);
  border-radius: var(--ag-radius); /* 决策依据：故事统计块属卡片类容器，对齐卡片档 10px */
  padding: 14px 0;
}
.story-stats div {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.story-stats b {
  font-size: 20px;
  color: var(--ag-green-700);
}
.story-stats span {
  font-size: 11px;
  color: var(--ag-text-3);
}
.env-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  margin-bottom: 16px;
}
.e-cell {
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：环境数据格属卡片类，对齐卡片档 10px */
  padding: 12px 6px;
  text-align: center;
}
.e-cell span {
  font-size: 10.5px;
  color: var(--ag-text-3);
  display: block;
  margin-bottom: 3px;
}
.e-cell b {
  font-size: 17px;
  color: var(--ag-green-700);
}
.env-note {
  display: flex;
  gap: 8px;
  font-size: 11.5px;
  color: var(--ag-text-3);
  line-height: 1.7;
  background: #F3F8F4;
  border-radius: var(--ag-radius); /* 决策依据：环境说明块属卡片类，对齐卡片档 10px */
  padding: 10px 12px;
}
.report-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #F3F8F4;
  border-radius: var(--ag-radius); /* 决策依据：检测报告行属卡片类，对齐卡片档 10px */
  padding: 13px 15px;
  margin-bottom: 16px;
}
.rr-result {
  color: var(--ag-green-700);
  font-weight: 800;
  font-size: 15px;
}
.rows > div {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--ag-border-light);
}
.rows span {
  color: var(--ag-text-3);
}
.certs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.certs span {
  background: #FFF9E6;
  color: #854d0e;
  font-size: 11.5px;
  padding: 5px 12px;
  border-radius: var(--ag-radius-sm); /* 决策依据：证书标签属标签类小控件，对齐控件档 6px */
}
.td-foot {
  text-align: center;
  color: var(--ag-text-4);
  font-size: 10.5px;
  padding: 22px 0 0;
}
@media (max-width: 420px) {
  .env-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
