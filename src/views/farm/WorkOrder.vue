<script setup>
/** 页面 25 · 农事工单管理：工单列表、派单、工单详情、现场打卡照片查看、状态流转 */
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag } from '@/components/ui'
import { farmApi, plotApi } from '@/api'

const tableRef = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)
const detailDrawer = ref(false)
const detailRow = ref(null)
const plots = ref([])

const form = reactive({
  id: null, code: '', type: '播种', plotId: null, assignee: '', phone: '',
  planDate: '', content: '', status: '待接单',
})
const rules = {
  type: [{ required: true, message: '请选择农事类型', trigger: 'change' }],
  plotId: [{ required: true, message: '请选择地块', trigger: 'change' }],
  assignee: [{ required: true, message: '请选择执行人', trigger: 'change' }],
  planDate: [{ required: true, message: '请选择作业日期', trigger: 'change' }],
  content: [{ required: true, message: '请填写作业要求', trigger: 'blur' }],
}

const WORKERS = ['张建国', '李秀兰', '王大富', '刘志强', '陈美凤', '杨春生', '赵德柱', '孙丽娟']
const FARM_TYPES = ['播种', '移栽', '施肥', '打药', '除草', '灌溉', '采收']

const columns = [
  { prop: 'code', label: '工单编号', width: 118 },
  { prop: 'type', label: '类型', width: 82, align: 'center' },
  { prop: 'plotName', label: '地块', minWidth: 120 },
  { prop: 'assignee', label: '执行人', width: 90 },
  { prop: 'phone', label: '联系电话', width: 120 },
  { prop: 'planDate', label: '作业日期', width: 105 },
  { prop: 'materials', label: '物料', width: 90, align: 'center' },
  { prop: 'checkin', label: '打卡', width: 80, align: 'center' },
  { prop: 'status', label: '状态', width: 90, align: 'center' },
  { prop: 'createdAt', label: '派单时间', width: 160 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '工单号 / 地块 / 执行人' },
  { key: 'type', label: '类型', type: 'select', options: FARM_TYPES.map((t) => ({ label: t, value: t })) },
  { key: 'status', label: '状态', type: 'select', options: ['待接单', '进行中', '待验收', '已完成', '已驳回'].map((s) => ({ label: s, value: s })) },
]

const selected = ref([])

function openCreate() {
  Object.assign(form, { id: null, code: '', type: '施肥', plotId: plots.value[0]?.id, assignee: WORKERS[0], phone: '', planDate: '', content: '', status: '待接单' })
  dialogVisible.value = true
}
async function handleSubmit() {
  submitting.value = true
  try {
    const plot = plots.value.find((p) => p.id === form.plotId)
    await farmApi.createOrder({ ...form, plotName: plot?.name })
    ElMessage.success('工单派发成功，已通知执行人')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

async function acceptOrder(row) {
  await ElMessageBox.confirm(`确认接受工单「${row.code}」并开始作业吗？`, '接单确认', { type: 'info' })
  await farmApi.updateOrder(row.id, { status: '进行中' })
  ElMessage.success('已接单，工单进入执行中')
  tableRef.value?.reload(true)
}
async function rejectOrder(row) {
  const { value } = await ElMessageBox.prompt('请填写驳回原因：', '驳回工单', { inputPlaceholder: '如：天气原因暂缓作业', type: 'warning' }).catch(() => ({ value: null }))
  if (value === null) return
  await farmApi.updateOrder(row.id, { status: '已驳回', rejectReason: value })
  ElMessage.success('工单已驳回')
  tableRef.value?.reload(true)
}
async function verifyOrder(row) {
  await ElMessageBox.confirm(`确认验收工单「${row.code}」的现场作业情况吗？`, '验收确认', { type: 'info' })
  await farmApi.updateOrder(row.id, { status: '已完成' })
  ElMessage.success('工单验收通过')
  tableRef.value?.reload(true)
}

function showDetail(row) {
  detailRow.value = row
  detailDrawer.value = true
}
function mockPhoto(seed) {
  const hues = [110, 88, 135, 70]
  return `linear-gradient(${135 + seed * 40}deg, hsl(${hues[seed % 4]},45%,72%), hsl(${hues[(seed + 1) % 4]},55%,52%))`
}

const STATUS_STEP = computed(() => {
  const map = { 待接单: 0, 进行中: 1, 待验收: 2, 已完成: 3, 已驳回: -1 }
  return map[detailRow.value?.status] ?? 0
})

onMountedInit()
async function onMountedInit() {
  plots.value = await plotApi.all()
}
</script>

<template>
  <div class="page">
    <PageHeader title="农事工单管理" desc="农事任务派单、执行打卡追踪、验收与状态流转，支持现场照片查看">
      <template #actions>
        <el-button type="primary" :icon="'Position'" @click="openCreate">派发工单</el-button>
      </template>
    </PageHeader>

    <ProTable
      ref="tableRef" :columns="columns" :fetch="farmApi.orderPage" :filters="filters"
      selectable action-width="230" @selection-change="(v) => (selected = v)"
    >
      <template #col-type="{ row }">
        <el-tag size="small" effect="plain">{{ row.type }}</el-tag>
      </template>
      <template #col-materials="{ row }">
        <span v-if="row.materials?.length" class="mat-chip">{{ row.materials.map((m) => `${m.name}×${m.qty}`).join('，') }}</span>
        <span v-else class="text-dim">—</span>
      </template>
      <template #col-checkin="{ row }">
        <el-tag v-if="row.checkin" size="small" type="success" effect="light">
          <el-icon style="vertical-align: -2px"><Camera /></el-icon> 已打卡
        </el-tag>
        <span v-else class="text-dim">未打卡</span>
      </template>
      <template #col-status="{ row }"><StatusTag :value="row.status" /></template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="showDetail(row)">详情</el-button>
        <el-button v-if="row.status === '待接单'" link type="warning" @click="acceptOrder(row)">接单</el-button>
        <el-button v-if="row.status === '待接单'" link type="danger" @click="rejectOrder(row)">驳回</el-button>
        <el-button v-if="row.status === '待验收'" link type="success" @click="verifyOrder(row)">验收</el-button>
      </template>
    </ProTable>

    <!-- 派单弹窗 -->
    <FormDialog v-model="dialogVisible" title="派发农事工单" :rules="rules" :model="form" :submit-loading="submitting" width="580px" @submit="handleSubmit">
      <el-form-item label="农事类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio-button v-for="t in FARM_TYPES" :key="t" :value="t">{{ t }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="作业地块" prop="plotId">
        <el-select v-model="form.plotId" style="width: 100%">
          <el-option v-for="p in plots" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="执行人" prop="assignee">
        <el-select v-model="form.assignee" style="width: 200px" placeholder="选择农户/工人">
          <el-option v-for="w in WORKERS" :key="w" :label="w" :value="w" />
        </el-select>
      </el-form-item>
      <el-form-item label="作业日期" prop="planDate">
        <el-date-picker v-model="form.planDate" type="date" value-format="YYYY-MM-DD" style="width: 200px" />
      </el-form-item>
      <el-form-item label="作业要求" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="3" placeholder="工单作业要求与注意事项" />
      </el-form-item>
    </FormDialog>

    <!-- 工单详情抽屉 -->
    <el-drawer v-model="detailDrawer" :title="`工单详情 · ${detailRow?.code || ''}`" size="460px">
      <template v-if="detailRow">
        <el-steps :active="STATUS_STEP" align-center finish-status="success" style="margin-bottom: 22px">
          <el-step title="待接单" />
          <el-step title="进行中" />
          <el-step title="待验收" />
          <el-step title="已完成" />
        </el-steps>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="类型">{{ detailRow.type }}</el-descriptions-item>
          <el-descriptions-item label="地块">{{ detailRow.plotName }}</el-descriptions-item>
          <el-descriptions-item label="执行人">{{ detailRow.assignee }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ detailRow.phone }}</el-descriptions-item>
          <el-descriptions-item label="作业日期" :span="2">{{ detailRow.planDate }}</el-descriptions-item>
        </el-descriptions>

        <template v-if="detailRow.checkin">
          <div class="checkin-title">现场打卡记录</div>
          <div class="checkin-info">
            <div class="ci-row"><el-icon><Timer /></el-icon><span>打卡时间：{{ detailRow.checkin.time }}</span></div>
            <div class="ci-row"><el-icon><LocationInformation /></el-icon><span>打卡位置：{{ detailRow.checkin.location }}</span></div>
            <div class="ci-row"><el-icon><Clock /></el-icon><span>工时：{{ detailRow.checkin.hours }} 小时</span></div>
            <div class="ci-row"><el-icon><ChatLineSquare /></el-icon><span>{{ detailRow.checkin.remark }}</span></div>
          </div>
          <div class="photo-grid">
            <div v-for="i in detailRow.checkin.photos" :key="i" class="photo" :style="{ background: mockPhoto(i + detailRow.id) }" role="img" :aria-label="`现场照片 ${i}`">
              <span class="photo-tag">现场照片 {{ i }}</span>
            </div>
          </div>
        </template>

        <div v-if="detailRow.materials?.length" class="mt-16">
          <div class="checkin-title">物料消耗</div>
          <el-tag v-for="m in detailRow.materials" :key="m.name" size="small" style="margin-right: 8px">{{ m.name }} × {{ m.qty }}</el-tag>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.mat-chip {
  font-size: 12px;
  color: var(--ag-blue-600);
}
.checkin-title {
  font-weight: 700;
  margin: 18px 0 10px;
  padding-left: 9px;
  border-left: 3px solid var(--ag-green-600);
}
.checkin-info {
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：签到信息块属卡片类容器，对齐卡片档 10px */
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ci-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ag-text-2);
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 12px;
}
.photo {
  aspect-ratio: 4/3;
  border-radius: var(--ag-radius); /* 决策依据：现场照片块属卡片类，token 化为卡片档 10px（值不变） */
  position: relative;
  overflow: hidden;
  transition: transform 0.3s var(--ag-ease);
}
/* 决策依据：hover 放大属装饰性动效，按简约高级规范移除（原 .photo:hover 仅此一条声明） */
.photo-tag {
  position: absolute;
  bottom: 6px;
  left: 6px;
  font-size: 10px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  padding: 1px 7px;
  border-radius: var(--ag-radius-sm); /* 决策依据：照片角标属标签类小控件，对齐控件档 6px */
}
</style>
