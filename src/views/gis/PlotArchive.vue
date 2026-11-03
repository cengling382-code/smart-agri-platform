<script setup>
/** 页面 22 · 地块档案管理：地块列表、新增地块、绘制边界、档案信息编辑 */
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { plotApi } from '@/api'

const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const detailVisible = ref(false)
const detailRow = ref(null)

const CROPS = ['番茄', '黄瓜', '生菜', '草莓', '水稻', '小麦', '柑橘', '淡水鱼', '生猪']
const TYPES = ['设施大棚', '大田', '果园', '水产', '畜禽']

const form = reactive({
  id: null, code: '', name: '', type: '设施大棚', crop: '番茄', areaMu: 3, manager: '',
  startDate: '', endDate: '', status: '种植中', lat: 30.51, lng: 114.31,
})
const rules = {
  code: [{ required: true, message: '请输入地块编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入地块名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择地块类型', trigger: 'change' }],
  areaMu: [{ required: true, message: '请输入面积', trigger: 'blur' }],
}

/* 模拟边界绘制 */
const drawing = ref(false)
const drawPoints = ref([[30, 20], [60, 20], [60, 55], [30, 55]])
function addPoint(evt) {
  if (!drawing.value) return
  const svg = evt.currentTarget
  const rect = svg.getBoundingClientRect()
  const x = +(((evt.clientX - rect.left) / rect.width) * 100).toFixed(1)
  const y = +(((evt.clientY - rect.top) / rect.height) * 100).toFixed(1)
  drawPoints.value.push([x, y])
}
function resetDraw() {
  drawPoints.value = []
}
function autoShape() {
  const cx = 30 + Math.random() * 30
  const cy = 25 + Math.random() * 25
  const w = 10 + Math.random() * 18
  const h = 8 + Math.random() * 16
  drawPoints.value = [[cx, cy], [cx + w, cy], [cx + w, cy + h], [cx, cy + h]]
}

const columns = [
  { prop: 'code', label: '地块编号', width: 100 },
  { prop: 'name', label: '地块名称', minWidth: 140 },
  { prop: 'type', label: '类型', width: 100, align: 'center' },
  { prop: 'crop', label: '作物', width: 90 },
  { prop: 'areaMu', label: '面积(亩)', width: 95, align: 'right' },
  { prop: 'manager', label: '负责人', width: 95 },
  { prop: 'startDate', label: '种植开始', width: 110 },
  { prop: 'endDate', label: '种植结束', width: 110 },
  { prop: 'status', label: '状态', width: 95, align: 'center' },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '编号 / 名称 / 作物 / 负责人' },
  { key: 'type', label: '类型', type: 'select', options: TYPES.map((t) => ({ label: t, value: t })) },
  { key: 'status', label: '状态', type: 'select', options: ['种植中', '育苗期', '接近采收', '挂果期', '养殖中', '休耕'].map((s) => ({ label: s, value: s })) },
]

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, code: '', name: '', type: '设施大棚', crop: '番茄', areaMu: 3, manager: '', startDate: '', endDate: '', status: '种植中', lat: 30.51, lng: 114.31 })
  autoShape()
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  Object.assign(form, { ...row })
  dialogVisible.value = true
}
async function handleSubmit() {
  submitting.value = true
  try {
    if (isEdit.value) await plotApi.update(form.id, form)
    else await plotApi.create(form)
    ElMessage.success(isEdit.value ? '地块档案已更新' : '地块创建成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除地块「${row.name}」吗？关联设备与农事记录将保留。`, '删除确认', { type: 'error' })
  await plotApi.remove(row.id)
  ElMessage.success('地块已删除')
  tableRef.value?.reload(true)
}
function showDetail(row) {
  detailRow.value = row
  detailVisible.value = true
}
</script>

<template>
  <div class="page">
    <PageHeader title="地块档案管理" desc="地块/大棚档案增删改查，记录地理位置、面积、作物类型与种植周期，支持 GIS 边界绘制">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新增地块</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="plotApi.page" :filters="filters" action-width="230">
      <template #col-name="{ row }">
        <el-link type="primary" :underline="false" @click="showDetail(row)">{{ row.name }}</el-link>
      </template>
      <template #col-areaMu="{ row }">
        <span class="mono-num">{{ row.areaMu }}</span>
      </template>
      <template #col-status="{ row }">
        <el-tag size="small" :type="row.status === '种植中' ? 'success' : row.status === '接近采收' ? 'warning' : 'info'" effect="plain">{{ row.status }}</el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="primary" @click="showDetail(row)">档案</el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <!-- 新增/编辑弹窗（含边界绘制） -->
    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑地块档案' : '新增地块（绘制边界）'" :rules="rules" :model="form" :submit-loading="submitting" width="760px" @submit="handleSubmit">
      <div class="form-grid">
        <div class="fg-left">
          <el-form-item label="地块编号" prop="code">
            <el-input v-model="form.code" :disabled="isEdit" placeholder="如 P-B03" />
          </el-form-item>
          <el-form-item label="地块名称" prop="name">
            <el-input v-model="form.name" placeholder="如 东大田C区" />
          </el-form-item>
          <el-form-item label="地块类型" prop="type">
            <el-radio-group v-model="form.type">
              <el-radio-button v-for="t in TYPES" :key="t" :value="t">{{ t }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="作物类型" prop="crop">
            <el-select v-model="form.crop" style="width: 200px">
              <el-option v-for="c in CROPS" :key="c" :label="c" :value="c" />
            </el-select>
          </el-form-item>
          <el-form-item label="面积(亩)" prop="areaMu">
            <el-input-number v-model="form.areaMu" :min="0.5" :max="2000" :precision="1" style="width: 200px" />
          </el-form-item>
          <el-form-item label="负责人">
            <el-input v-model="form.manager" placeholder="地块负责人" style="width: 200px" />
          </el-form-item>
          <el-form-item label="种植周期">
            <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width: 150px" />
            <span style="margin: 0 6px">至</span>
            <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width: 150px" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 200px">
              <el-option v-for="s in ['种植中', '育苗期', '接近采收', '挂果期', '养殖中', '休耕']" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 边界绘制区 -->
        <div class="fg-right">
          <div class="draw-head">
            <span class="text-dim">地图边界绘制</span>
            <div class="flex gap-8">
              <el-button size="small" :type="drawing ? 'danger' : 'primary'" @click="drawing = !drawing">
                {{ drawing ? '完成绘制' : '绘制边界' }}
              </el-button>
              <el-button size="small" @click="resetDraw">清空</el-button>
              <el-button size="small" @click="autoShape">自动生成</el-button>
            </div>
          </div>
          <svg class="draw-svg" viewBox="0 0 100 100" @click="addPoint" role="img" aria-label="地块边界绘制区域，绘制模式下点击添加顶点">
            <rect width="100" height="100" fill="#eef4ee" rx="2" />
            <path d="M 0 50 L 100 48" stroke="rgba(255,255,255,.4)" stroke-width="0.6" stroke-dasharray="1.4 1" />
            <path d="M 50 0 L 52 100" stroke="rgba(255,255,255,.4)" stroke-width="0.6" stroke-dasharray="1.4 1" />
            <polygon
              :points="drawPoints.map((p) => p.join(',')).join(' ')"
              fill="rgba(105,156,120,.25)" stroke="#699C78" stroke-width="0.5"
            />
            <circle v-for="(pt, i) in drawPoints" :key="i" :cx="pt[0]" :cy="pt[1]" r="0.9" fill="#699C78" />
            <text x="3" y="96" font-size="2.4" fill="#9AA4AE">{{ drawing ? '绘制中：点击地图添加顶点' : `已绘制 ${drawPoints.length} 个顶点` }}</text>
          </svg>
          <div class="geo-row">
            <span class="text-dim">经纬度：</span>
            <el-input-number v-model="form.lat" :precision="3" :step="0.001" size="small" style="width: 130px" />
            <el-input-number v-model="form.lng" :precision="3" :step="0.001" size="small" style="width: 130px" />
          </div>
        </div>
      </div>
    </FormDialog>

    <!-- 档案详情 -->
    <el-dialog v-model="detailVisible" :title="`${detailRow?.name || ''} · 地块档案`" width="640px">
      <el-descriptions v-if="detailRow" :column="2" border>
        <el-descriptions-item label="地块编号">{{ detailRow.code }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detailRow.type }}</el-descriptions-item>
        <el-descriptions-item label="作物">{{ detailRow.crop }}</el-descriptions-item>
        <el-descriptions-item label="面积">{{ detailRow.areaMu }} 亩</el-descriptions-item>
        <el-descriptions-item label="负责人">{{ detailRow.manager }}</el-descriptions-item>
        <el-descriptions-item label="传感器数量">{{ detailRow.sensors }} 台</el-descriptions-item>
        <el-descriptions-item label="种植周期">{{ detailRow.startDate }} 至 {{ detailRow.endDate }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detailRow.status }}</el-descriptions-item>
        <el-descriptions-item label="经纬度" :span="2">{{ detailRow.lat }}, {{ detailRow.lng }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
}
.fg-right {
  border: 1px dashed var(--ag-border);
  border-radius: var(--ag-radius); /* 决策依据：绘图侧栏容器属面板类，对齐卡片档 10px */
  padding: 10px;
}
.draw-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.draw-svg {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--ag-radius-sm); /* 决策依据：绘图画布属交互控件，对齐控件档 6px */
  cursor: crosshair;
  border: 1px solid var(--ag-border-light);
}
.geo-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
@media (max-width: 800px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
