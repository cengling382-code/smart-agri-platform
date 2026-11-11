<script setup>
/** 页面 18 · 告警统计分析：类型统计、趋势图表、处理效率分析（ECharts） */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ChartCard, StatCard, ProTable, FormDialog } from '@/components/ui'
import { CHART_COLORS } from '@/utils/chartTheme'
import { alarmApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const stats = ref(null)
const loading = ref(true)

/* ---------- 实时告警明细（只展示未处理，处理或删除后自动移出列表） ---------- */
const tableRef = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)

const LEVELS = cfg.alarmLevels
const ALARM_TYPES = cfg.alarmTypes

const form = reactive({ level: 1, type: '环境超限', content: '', source: '' })
const rules = {
  level: [{ required: true, message: '请选择告警级别', trigger: 'change' }],
  type: [{ required: true, message: '请选择告警类型', trigger: 'change' }],
  content: [{ required: true, message: '请填写告警内容', trigger: 'blur' }],
}

const columns = [
  { prop: 'code', label: '告警编号', width: 135 },
  { prop: 'level', label: '级别', width: 78, align: 'center' },
  { prop: 'type', label: '类型', width: 110 },
  { prop: 'content', label: '告警内容', minWidth: 240 },
  { prop: 'source', label: '来源', width: 115 },
  { prop: 'time', label: '告警时间', width: 165 },
]

/** 列表只取未处理告警：处理（置为已处置）或删除后该条目即从这个列表消失 */
const fetchPending = (params) => alarmApi.page({ ...params, status: 'pending' })

async function loadStats() {
  try {
    stats.value = await alarmApi.stats()
  } catch (e) {
    console.warn('[AlarmStats]', e?.message || e)
  } finally {
    loading.value = false
  }
}

/** 统计与明细同源（同一个 JSON 集合），任一端变更后一起刷新，保证画面一致 */
async function refreshAll() {
  await loadStats()
  tableRef.value?.reload()
}

function openCreate() {
  Object.assign(form, { level: 1, type: '环境超限', content: '', source: '' })
  dialogVisible.value = true
}

async function submitAlarm() {
  submitting.value = true
  try {
    await alarmApi.create({
      level: form.level,
      type: form.type,
      content: form.content.trim(),
      source: form.source.trim(),
    })
    ElMessage.success('告警已新增，统计已同步更新')
    dialogVisible.value = false
    await refreshAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

async function handleAlarm(row) {
  try {
    await ElMessageBox.confirm(`确认处置告警「${row.code}」吗？处置后该条目将从待处理列表移出。`, '处置告警', { type: 'warning' })
  } catch {
    return
  }
  await alarmApi.update(row.id, { status: 'resolved', handler: '当前用户' })
  ElMessage.success('告警已处置')
  await refreshAll()
}

async function removeAlarm(row) {
  try {
    await ElMessageBox.confirm(`确定删除告警「${row.code}」吗？删除后不可恢复。`, '删除告警', { type: 'error' })
  } catch {
    return
  }
  await alarmApi.remove(row.id)
  ElMessage.success('告警已删除')
  await refreshAll()
}

const typeOptions = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#6b7380' }, itemWidth: 10, itemHeight: 10 },
  series: [{
    type: 'pie', radius: ['42%', '70%'], center: ['50%', '42%'],
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    data: stats.value?.byType?.map((t, i) => ({ name: t.name, value: t.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })) || [],
  }],
}))

const levelOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: stats.value?.byLevel?.map((l) => l.name) || [], axisLine: { lineStyle: { color: '#dde0e6' } } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    type: 'bar', barWidth: 42, data: stats.value?.byLevel?.map((l, i) => ({
      value: l.value,
      itemStyle: { color: ['#9AA4AE', '#FFB37B', '#E84A5F'][i], borderRadius: [6, 6, 0, 0] },
    })) || [],
  }],
}))

const trendOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 34, bottom: 4, containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: stats.value?.byDay?.map((d) => d.day) || [] },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    name: '告警数量', type: 'line', smooth: true, data: stats.value?.byDay?.map((d) => d.count) || [],
    lineStyle: { width: 2.5, color: CHART_COLORS[0] },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(7,76,224,.15)' }, { offset: 1, color: 'rgba(7,76,224,.02)' }] } },
  }],
}))

const channelOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 10, right: 16, top: 30, bottom: 4, containLabel: true },
  xAxis: { type: 'category', data: stats.value?.channels?.map((c) => c.name) || [] },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef0f3' } } },
  series: [{
    type: 'bar', barWidth: 36,
    data: stats.value?.channels?.map((c, i) => ({ value: c.count, itemStyle: { color: CHART_COLORS[i], borderRadius: [6, 6, 0, 0] } })) || [],
  }],
}))

onMounted(loadStats)
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="告警统计分析" desc="告警类型、级别、趋势与处理效率多维度分析（ECharts 可视化）" />

    <div class="kpi-grid stagger" v-if="stats">
      <StatCard label="告警总数" :value="stats.total" unit="条" icon="Bell" tone="blue" />
      <StatCard label="待处理" :value="stats.pending" unit="条" icon="WarningFilled" tone="red" />
      <StatCard label="闭环率" :value="stats.resolveRate" unit="%" icon="CircleCheck" tone="green" />
      <StatCard label="平均处置时长" :value="stats.avgHours" unit="h" icon="Timer" tone="amber" :decimals="1" />
    </div>

    <div class="chart-grid">
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>告警类型分布</div></div>
        <div class="ag-card__body"><ChartCard :options="typeOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>告警级别分布</div></div>
        <div class="ag-card__body"><ChartCard :options="levelOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>告警趋势（近 7 日）</div></div>
        <div class="ag-card__body"><ChartCard :options="trendOptions" :height="300" /></div>
      </div>
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head"><div class="ag-card__title"><span class="dot"></span>通知渠道触达量</div></div>
        <div class="ag-card__body"><ChartCard :options="channelOptions" :height="300" /></div>
      </div>
    </div>

    <!-- 实时告警明细：与上方统计同源，直接读写本地 JSON 快照 -->
    <ProTable ref="tableRef" :columns="columns" :fetch="fetchPending" action-width="150" class="alarm-list">
      <template #toolbar>
        <el-button type="primary" size="small" :icon="'Plus'" @click="openCreate">新增告警</el-button>
        <span class="text-dim list-tip">仅显示未处理告警 · 新增 / 处理 / 删除后统计与列表实时同步</span>
      </template>
      <template #col-level="{ row }">
        <el-tag :type="LEVELS[row.level]?.tag" size="small" effect="dark">{{ LEVELS[row.level]?.text }}</el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button link type="success" @click="handleAlarm(row)">处理</el-button>
        <el-button link type="danger" @click="removeAlarm(row)">删除</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" title="新增告警" :rules="rules" :model="form" :submit-loading="submitting" @submit="submitAlarm">
      <el-form-item label="告警级别" prop="level">
        <el-select v-model="form.level" style="width: 100%">
          <el-option v-for="(m, k) in LEVELS" :key="k" :label="m.text" :value="Number(k)" />
        </el-select>
      </el-form-item>
      <el-form-item label="告警类型" prop="type">
        <el-select v-model="form.type" style="width: 100%">
          <el-option v-for="t in ALARM_TYPES" :key="t" :label="t" :value="t" />
        </el-select>
      </el-form-item>
      <el-form-item label="告警内容" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="3" maxlength="120" show-word-limit placeholder="如：3号育苗棚空气温度超过阈值上限 35℃" />
      </el-form-item>
      <el-form-item label="告警来源" prop="source">
        <el-input v-model="form.source" maxlength="40" placeholder="地块 / 设备编号，留空默认「手工录入」" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.alarm-list {
  margin-top: 20px;
}
.list-tip {
  font-size: 12px;
}
@media (max-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-grid { grid-template-columns: 1fr; }
}
</style>
