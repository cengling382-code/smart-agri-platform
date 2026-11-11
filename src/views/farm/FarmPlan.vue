<script setup>
/** 页面 24 · 农事计划管理：计划列表、新增播种/施肥/打药/采收计划、日历视图、审批 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag } from '@/components/ui'
import { farmApi, plotApi } from '@/api'
import { todayStr, disabledPastDate, rangeValidator, toDateStr } from '@/utils/dateRule'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const view = ref('list') // list | calendar
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const plots = ref([])
const approveDialog = ref(false)
const approveRow = ref(null)

const TYPE_TAG = cfg.farmTypeTag
const FARM_TYPES = cfg.farmTypes

const form = reactive({
  id: null, code: '', type: '播种', plotId: null, crop: '', content: '',
  planDate: '', endDate: '', status: '待审批',
})
const rules = {
  type: [{ required: true, message: '请选择农事类型', trigger: 'change' }],
  plotId: [{ required: true, message: '请选择地块', trigger: 'change' }],
  content: [{ required: true, message: '请填写作业内容', trigger: 'blur' }],
  planDate: [
    { required: true, message: '请选择计划日期', trigger: 'change' },
    {
      // 新建计划不允许倒签到过去；编辑历史计划时保留原日期，不受此限制
      validator: (rule, value, callback) => {
        if (!isEdit.value && value && value < todayStr()) callback(new Error('计划日期不能早于今天'))
        else callback()
      },
      trigger: 'change',
    },
  ],
  endDate: [rangeValidator(() => form.planDate, '完成期限不能早于计划日期')],
}

// 开始日期后移时清掉已失效的完成期限，避免表单里留下倒置区间
watch(() => form.planDate, (v) => {
  if (v && form.endDate && form.endDate < v) form.endDate = ''
})

const columns = [
  { prop: 'code', label: '计划编号', width: 115 },
  { prop: 'type', label: '类型', width: 85, align: 'center' },
  { prop: 'plotName', label: '地块', minWidth: 130 },
  { prop: 'crop', label: '作物', width: 85 },
  { prop: 'content', label: '作业内容', minWidth: 200 },
  { prop: 'planDate', label: '计划日期', width: 105 },
  { prop: 'endDate', label: '完成期限', width: 105 },
  { prop: 'status', label: '状态', width: 90, align: 'center' },
  { prop: 'creator', label: '创建人', width: 120 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '编号 / 地块 / 作物' },
  { key: 'type', label: '类型', type: 'select', options: FARM_TYPES.map((t) => ({ label: t, value: t })) },
  { key: 'status', label: '状态', type: 'select', options: cfg.farmPlanStatuses.map((s) => ({ label: s, value: s })) },
]

/* ---------- 日历视图 ---------- */
const currentMonth = ref(new Date())
const monthKey = computed(() => `${currentMonth.value.getFullYear()}-${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}`)
const calendarDays = computed(() => {
  const y = currentMonth.value.getFullYear()
  const m = currentMonth.value.getMonth()
  const first = new Date(y, m, 1)
  const startPad = (first.getDay() + 6) % 7
  const days = []
  for (let i = 0; i < startPad; i++) days.push(null)
  const last = new Date(y, m + 1, 0).getDate()
  for (let d = 1; d <= last; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr, day: d, plans: [] })
  }
  return days
})
const plansCache = ref([])
const lastParams = ref({})
async function fetchPlans(params) {
  lastParams.value = params
  return farmApi.planPage(params)
}
async function loadCalendarPlans() {
  // 日历沿用列表当前的筛选条件，避免切换视图后筛选失效
  const res = await farmApi.planPage({ ...lastParams.value, page: 1, size: 100 })
  plansCache.value = res.list
  calendarDays.value?.forEach?.(() => {})
  // 挂载
  for (const d of calendarDays.value) {
    if (d) d.plans = plansCache.value.filter((p) => p.planDate === d.date)
  }
}
function prevMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
  loadCalendarPlans()
}
function nextMonth() {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
  loadCalendarPlans()
}

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, code: '', type: '播种', plotId: plots.value[0]?.id, crop: plots.value[0]?.crop || '', content: '', planDate: '', endDate: '', status: '待审批' })
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  Object.assign(form, { ...row, plotId: plots.value.find((p) => p.name === row.plotName)?.id || row.plotId })
  dialogVisible.value = true
}
function onTypeChange(t) {
  const p = plots.value.find((x) => x.id === form.plotId)
  if (p && !isEdit.value) form.crop = p.crop
}
async function handleSubmit() {
  submitting.value = true
  try {
    const plot = plots.value.find((x) => x.id === form.plotId)
    // 只提交业务字段：id / 编号 / 创建人 / 审批人由服务端维护
    const payload = {
      type: form.type,
      plotId: form.plotId,
      plotName: plot?.name,
      crop: form.crop || plot?.crop,
      content: form.content.trim(),
      planDate: form.planDate,
      endDate: form.endDate,
      status: form.status,
    }
    if (isEdit.value) await farmApi.updatePlan(form.id, payload)
    else await farmApi.createPlan(payload)
    ElMessage.success(isEdit.value ? '计划已更新' : '农事计划已提交，等待园区管理员审批')
    dialogVisible.value = false
    tableRef.value?.reload(true)
    loadCalendarPlans()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
function openApprove(row) {
  approveRow.value = row
  approveDialog.value = true
}
async function doApprove(pass) {
  try {
    await farmApi.updatePlan(approveRow.value.id, { status: pass ? '已审批' : '已驳回', approver: pass ? '园区管理员' : '' })
    ElMessage.success(pass ? '已审批通过' : '已驳回，请修改后重新提交')
    approveDialog.value = false
    tableRef.value?.reload(true)
    loadCalendarPlans()
  } catch (e) {
    ElMessage.error(e.message || '审批失败')
  }
}
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除计划「${row.code}」吗？`, '删除确认', { type: 'error' })
  } catch {
    return
  }
  try {
    await farmApi.removePlan(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

watch(view, (v) => { if (v === 'calendar') loadCalendarPlans() })

onMounted(async () => {
  plots.value = await plotApi.all()
  loadCalendarPlans()
})
</script>

<template>
  <div class="page">
    <PageHeader title="农事计划管理" desc="播种、移栽、施肥、打药、除草、灌溉、采收计划创建与审批，支持日历视图">
      <template #actions>
        <el-radio-group v-model="view" size="small">
          <el-radio-button value="list">列表视图</el-radio-button>
          <el-radio-button value="calendar">日历视图</el-radio-button>
        </el-radio-group>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新建计划</el-button>
      </template>
    </PageHeader>

    <!-- 列表视图 -->
    <ProTable v-if="view === 'list'" ref="tableRef" :columns="columns" :fetch="fetchPlans" :filters="filters" action-width="240">
      <template #col-type="{ row }">
        <el-tag size="small" :type="TYPE_TAG[row.type] || 'info'" effect="plain">{{ row.type }}</el-tag>
      </template>
      <template #col-status="{ row }"><StatusTag :value="row.status" /></template>
      <template #col-action="{ row }">
        <el-button v-if="row.status === '待审批'" link type="warning" @click="openApprove(row)">审批</el-button>
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <!-- 日历视图 -->
    <div v-else class="ag-card calendar anim-up">
      <div class="cal-head">
        <el-button circle :icon="'ArrowLeft'" @click="prevMonth" aria-label="上一月" />
        <b class="cal-title">{{ currentMonth.getFullYear() }} 年 {{ currentMonth.getMonth() + 1 }} 月</b>
        <el-button circle :icon="'ArrowRight'" @click="nextMonth" aria-label="下一月" />
        <span class="text-dim" style="margin-left: auto">当月计划 {{ plansCache.filter((p) => p.planDate.startsWith(monthKey)).length }} 项</span>
      </div>
      <div class="cal-grid">
        <div v-for="w in ['周一', '周二', '周三', '周四', '周五', '周六', '周日']" :key="w" class="cal-week">{{ w }}</div>
        <div v-for="(d, i) in calendarDays" :key="i" class="cal-cell" :class="{ empty: !d }">
          <template v-if="d">
            <span class="cal-day mono-num" :class="{ today: d.date === todayStr() }">{{ d.day }}</span>
            <div class="cal-plans">
              <div
                v-for="p in d.plans" :key="p.id" class="cal-plan"
                :data-type="p.type" :title="`${p.type} · ${p.plotName} · ${p.status}`"
                role="button" tabindex="0"
                @click="openApprove(p)" @keyup.enter="openApprove(p)"
              >
                <span class="cp-type">{{ p.type }}</span> {{ p.plotName }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 新增/编辑 -->
    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑农事计划' : '新建农事计划'" :rules="rules" :model="form" :submit-loading="submitting" width="600px" @submit="handleSubmit">
      <el-form-item label="农事类型" prop="type">
        <el-radio-group v-model="form.type" @change="onTypeChange">
          <el-radio-button v-for="t in FARM_TYPES" :key="t" :value="t">{{ t }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="地块" prop="plotId">
        <el-select v-model="form.plotId" style="width: 100%" @change="onTypeChange">
          <el-option v-for="p in plots" :key="p.id" :label="`${p.name}（${p.crop}）`" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="作业内容" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="3" placeholder="如：全棚统一滴灌追肥，使用复合化肥 20kg，预计 2 人 1 天" />
      </el-form-item>
      <el-form-item label="计划日期" prop="planDate">
        <el-date-picker v-model="form.planDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width: 200px" :disabled-date="(d) => !isEdit && disabledPastDate(d)" />
        <span style="margin: 0 8px">至</span>
        <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" placeholder="完成期限" style="width: 200px" :disabled-date="(d) => !!form.planDate && toDateStr(d) < form.planDate" />
      </el-form-item>
    </FormDialog>

    <!-- 审批弹窗 -->
    <el-dialog v-model="approveDialog" title="农事计划审批" width="520px">
      <el-descriptions v-if="approveRow" :column="1" border>
        <el-descriptions-item label="计划编号">{{ approveRow.code }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ approveRow.type }} · {{ approveRow.plotName }}（{{ approveRow.crop }}）</el-descriptions-item>
        <el-descriptions-item label="作业内容">{{ approveRow.content }}</el-descriptions-item>
        <el-descriptions-item label="计划时间">{{ approveRow.planDate }} 至 {{ approveRow.endDate }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ approveRow.creator }}</el-descriptions-item>
        <el-descriptions-item label="状态"><StatusTag :value="approveRow.status" /></el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <template v-if="approveRow?.status === '待审批'">
          <el-button type="danger" plain @click="doApprove(false)">驳 回</el-button>
          <el-button type="primary" @click="doApprove(true)">审批通过</el-button>
        </template>
        <el-button v-else @click="approveDialog = false">关 闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.calendar {
  padding: 18px;
}
.cal-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}
.cal-title {
  font-size: 16px;
  min-width: 140px;
  text-align: center;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.cal-week {
  text-align: center;
  font-size: 12px;
  color: var(--ag-text-3);
  padding: 6px 0;
}
.cal-cell {
  min-height: 92px;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：日历格属卡片类，token 化为卡片档 10px（值不变） */
  padding: 6px 8px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}
.cal-cell:hover {
  border-color: var(--ag-green-300);
}
.cal-cell.empty {
  background: transparent;
}
.cal-day {
  font-size: 12px;
  color: var(--ag-text-3);
  display: inline-block;
  padding: 1px 6px;
  border-radius: var(--ag-radius-sm); /* 决策依据：日期角标属小控件，token 化为控件档 6px（值不变） */
}
.cal-day.today {
  background: var(--ag-green-600);
  color: #fff;
}
.cal-plans {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}
.cal-plan {
  font-size: 10.5px;
  background: #fff;
  border-radius: 5px;
  padding: 2px 6px;
  border-left: 2.5px solid var(--ag-green-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: transform 0.2s;
}
.cal-plan:hover {
  transform: translateX(2px);
}
.cal-plan[data-type='施肥'] { border-left-color: #c9803e; }
.cal-plan[data-type='打药'] { border-left-color: #E84A5F; }
.cal-plan[data-type='采收'] { border-left-color: #074ce0; }
.cal-plan[data-type='灌溉'] { border-left-color: #4C6983; }
.cp-type {
  font-weight: 700;
}
</style>
