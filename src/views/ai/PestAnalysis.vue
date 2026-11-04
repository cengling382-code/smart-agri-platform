<script setup>
/** 页面 35 · 病虫害分析：AI 识别记录、病害知识库、防治方案推荐 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ProTable, StatCard, StatusTag } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { aiApi } from '@/api'

const tableRef = ref(null)
const records = ref([])
const stats = ref(null)
const active = ref(null)

/* 病虫害知识库 */
const KNOWLEDGE = [
  { name: '番茄晚疫病', type: '真菌病害', symptom: '叶片出现水浸状暗绿色病斑，湿度大时背面有白色霉层', condition: '低温高湿（15-23℃、RH>85%）易发', prevention: '控制棚内湿度，发病初期喷施霜脲氰·锰锌或氟菌·霜霉威，连续 2-3 次' },
  { name: '黄瓜霜霉病', type: '真菌病害', symptom: '叶面出现多角形黄褐色病斑，背面有灰黑色霉层', condition: '高湿夜凉（16-22℃）易流行', prevention: '加强通风降湿，喷施烯酰吗啉或代森锰锌预防' },
  { name: '白粉虱', type: '虫害', symptom: '成虫、若虫群集叶背吸汁，分泌蜜露诱发煤污病', condition: '温室全年发生，繁殖极快', prevention: '黄板诱杀成虫 + 释放丽蚜小蜂，严重时喷施吡虫啉/噻虫嗪' },
  { name: '蚜虫', type: '虫害', symptom: '群集嫩叶吸汁致叶片卷缩，传播病毒病', condition: '干旱温暖条件爆发快', prevention: '银灰膜避蚜 + 黄板诱杀，喷施吡虫啉 800 倍液' },
  { name: '红蜘蛛', type: '螨害', symptom: '叶面出现灰白小点，严重时叶片枯焦脱落', condition: '高温干燥（25-30℃、RH<70%）', prevention: '增加湿度，喷施阿维菌素或联苯肼酯，注意轮换用药' },
  { name: '灰霉病', type: '真菌病害', symptom: '花、果出现灰褐色霉层，组织软腐', condition: '低温高湿、通风不良', prevention: '及时摘除病果，喷施腐霉利或嘧霉胺，加强通风' },
]
const activeKB = ref(KNOWLEDGE[0])

const pestOptions = computed(() => {
  const count = {}
  records.value.forEach((r) => (count[r.pest] = (count[r.pest] || 0) + 1))
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
  { key: 'status', label: '状态', type: 'select', options: [{ label: '待处理', value: '待处理' }, { label: '已处理', value: '已处理' }] },
]

async function loadTable(params) {
  const res = await aiApi.pests(params)
  records.value = res.list
  return res
}
aiApi.pests({ page: 1, size: 100 }).then((res) => {
  stats.value = {
    total: res.total, pending: res.list.filter((r) => r.status === '待处理').length,
    avgConf: Math.round(res.list.reduce((s, r) => s + r.conf, 0) / Math.max(1, res.list.length)),
  }
}).catch((e) => console.warn('[PestAnalysis]', e?.message || e))

function showSuggestion(row) {
  active.value = row
  const kb = KNOWLEDGE.find((k) => row.pest.includes(k.name.slice(0, 3)))
  if (kb) activeKB.value = kb
}
function markHandled(row) {
  aiApi.updatePest(row.id, { status: '已处理' }).then(() => {
    ElMessage.success('已标记为处理完成')
    tableRef.value?.reload(true)
  })
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
