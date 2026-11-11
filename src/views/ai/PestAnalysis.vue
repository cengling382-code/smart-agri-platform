<script setup>
/** 页面 35 · 病虫害分析：AI 识别记录、病害知识库、防治方案推荐 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ProTable, StatCard, StatusTag } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { aiApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const records = ref([])
const allRecords = ref([])
const stats = ref(null)
const active = ref(null)

/* 病虫害知识库 */
const KNOWLEDGE = cfg.pestKnowledge
const activeKB = ref(KNOWLEDGE[0])

const pestOptions = computed(() => {
  const count = {}
  allRecords.value.forEach((r) => (count[r.pest] = (count[r.pest] || 0) + 1))
  const entries = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 6)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 10, right: 20, top: 20, bottom: 4, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f3' } } },
    yAxis: { type: 'category', data: entries.map((e) => e[0]) },
    series: [{
      type: 'bar', barWidth: 16,
      data: entries.map((e, i) => ({ value: e[1], itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length], borderRadius: [0, 5, 5, 0] } })),
    }],
  }
})

const columns = [
  { prop: 'time', label: '识别时间', width: 160 },
  { prop: 'plotName', label: '地块', minWidth: 120 },
  { prop: 'crop', label: '作物', width: 80 },
  { prop: 'pest', label: '病虫害', width: 120 },
  { prop: 'level', label: '程度', width: 80, align: 'center' },
  { prop: 'conf', label: 'AI置信度', width: 100, align: 'center' },
  { prop: 'source', label: '识别来源', width: 120 },
  { prop: 'status', label: '状态', width: 85, align: 'center' },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '地块 / 病虫害名称' },
  { key: 'status', label: '状态', type: 'select', options: cfg.statusOptionGroups.pestStatus },
]

async function loadTable(params) {
  const res = await aiApi.pests(params)
  records.value = res.list
  return res
}

/** KPI 与发生统计基于全量记录（独立全量请求），不随当前页 8 条变化 */
async function refreshStats() {
  try {
    const res = await aiApi.pests({ page: 1, size: 10000 })
    allRecords.value = res.list || []
    stats.value = {
      total: res.total ?? allRecords.value.length,
      pending: allRecords.value.filter((r) => r.status === '待处理').length,
      avgConf: Math.round(allRecords.value.reduce((s, r) => s + (r.conf || 0), 0) / Math.max(1, allRecords.value.length)),
    }
  } catch (e) {
    console.warn('[PestAnalysis]', e?.message || e)
  }
}

onMounted(refreshStats)

function showSuggestion(row) {
  active.value = row
  const kb = KNOWLEDGE.find((k) => row.pest.includes(k.name.slice(0, 3)))
  if (kb) activeKB.value = kb
}
async function markHandled(row) {
  try {
    await aiApi.updatePest(row.id, { status: '已处理' })
    ElMessage.success('已标记为处理完成')
    await Promise.all([tableRef.value?.reload(true), refreshStats()])
  } catch (e) {
    ElMessage.error(e?.message || '操作失败，请重试')
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="病虫害分析" desc="AI 图像识别病虫害，给出病害名称、置信度与防治方案推荐" />

    <div class="kpi-grid stagger" v-if="stats">
      <StatCard label="累计识别" :value="stats.total" unit="次" icon="Search" tone="green" />
      <StatCard label="待处理" :value="stats.pending" unit="条" icon="WarningFilled" tone="red" />
      <StatCard label="平均置信度" :value="stats.avgConf" unit="%" icon="DataAnalysis" tone="blue" />
    </div>

    <div class="pest-layout">
      <div class="left-col">
        <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters" :page-size="8" action-width="150">
          <template #col-pest="{ row }">
            <b>{{ row.pest }}</b>
          </template>
          <template #col-conf="{ row }">
            <span class="mono-num" :style="{ color: row.conf > 90 ? 'var(--ag-success)' : 'var(--ag-warning)' }">{{ row.conf }}%</span>
          </template>
          <template #col-level="{ row }">
            <el-tag size="small" :type="row.level === '轻度' ? 'info' : 'warning'" effect="light">{{ row.level }}</el-tag>
          </template>
          <template #col-status="{ row }"><StatusTag :value="row.status" /></template>
          <template #col-action="{ row }">
            <el-button link type="primary" @click="showSuggestion(row)">方案</el-button>
            <el-button v-if="row.status === '待处理'" link type="success" @click="markHandled(row)">处理</el-button>
          </template>
        </ProTable>
      </div>

      <div class="right-col">
        <!-- 防治方案 -->
        <div class="ag-card anim-up">
          <div class="ag-card__head">
            <div class="ag-card__title"><span class="dot"></span>防治方案{{ active ? ` · ${active.pest}` : '' }}</div>
          </div>
          <div class="ag-card__body">
            <el-alert
              v-if="active"
              type="warning" :closable="false" show-icon
              :title="`${active.plotName}（${active.crop}）：${active.pest}，${active.level}`"
              :description="active.suggestion"
              class="mb-12"
            />
            <div class="kb-card" :key="activeKB.name">
              <div class="kb-head">
                <b>{{ activeKB.name }}</b>
                <el-tag size="small" :type="activeKB.type.includes('虫') ? 'warning' : 'danger'" effect="plain">{{ activeKB.type }}</el-tag>
              </div>
              <div class="kb-row"><span class="kb-label">识别症状</span><p>{{ activeKB.symptom }}</p></div>
              <div class="kb-row"><span class="kb-label">发生条件</span><p>{{ activeKB.condition }}</p></div>
              <div class="kb-row"><span class="kb-label">防治方案</span><p class="kb-prevention">{{ activeKB.prevention }}</p></div>
            </div>
          </div>
        </div>

        <!-- 知识库 + 统计 -->
        <div class="ag-card anim-up anim-delay-1">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>病虫害知识库</div></div>
          <div class="ag-card__body kb-list">
            <button
              v-for="k in KNOWLEDGE"
              :key="k.name"
              class="kb-item"
              :class="{ active: activeKB.name === k.name }"
              @click="activeKB = k"
            >
              {{ k.name }}
              <span class="text-dim">{{ k.type }}</span>
            </button>
          </div>
        </div>

        <div class="ag-card anim-up anim-delay-2">
          <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>病虫害发生统计</div></div>
          <div class="ag-card__body"><ChartCard :options="pestOptions" :height="230" /></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.pest-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  align-items: start;
}
.right-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.kb-card {
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：知识库卡片属卡片类，对齐卡片档 10px */
  padding: 14px 16px;
  animation: agFadeUp 0.4s var(--ag-ease) both;
}
.kb-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.kb-row {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12.5px;
}
.kb-label {
  flex: none;
  color: var(--ag-text-3);
  width: 58px;
}
.kb-row p {
  margin: 0;
  color: var(--ag-text-2);
  line-height: 1.7;
}
.kb-prevention {
  color: var(--ag-green-700) !important;
  font-weight: 500;
}
.kb-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow: auto;
}
.kb-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--ag-bg-hover);
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：病害条目行属卡片类，token 化为卡片档 10px（值不变） */
  padding: 9px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}
.kb-item:hover {
  border-color: var(--ag-green-300);
}
.kb-item.active {
  background: var(--ag-green-50);
  border-color: var(--ag-green-500);
  color: var(--ag-green-700);
}
@media (max-width: 1200px) {
  .pest-layout { grid-template-columns: 1fr; }
}
</style>
