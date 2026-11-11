<script setup>
/** 页面 31 · 采收管理：采收批次登记、产量录入、分级记录、品质检测 */
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { farmApi, plotApi } from '@/api'
import { disabledFutureDate, notFutureValidator } from '@/utils/dateRule'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)
const isEdit = ref(false)
const plots = ref([])

const GRADES = cfg.grades
const QUALITIES = cfg.qualities

const form = reactive({
  id: null, batchCode: '', plotId: null, crop: '', date: '', qty: 100,
  grade: '一级', inspector: '', quality: '良', status: '待登记',
})
const rules = {
  plotId: [{ required: true, message: '请选择采收地块', trigger: 'change' }],
  date: [
    { required: true, message: '请选择采收日期', trigger: 'change' },
    notFutureValidator('采收日期不能晚于今天'),
  ],
  qty: [{ required: true, message: '请录入产量', trigger: 'blur' }],
  grade: [{ required: true, message: '请选择分级', trigger: 'change' }],
}

const columns = [
  { prop: 'batchCode', label: '批次编号', width: 130 },
  { prop: 'plotName', label: '采收地块', minWidth: 130 },
  { prop: 'crop', label: '作物', width: 85 },
  { prop: 'date', label: '采收日期', width: 105 },
  { prop: 'qty', label: '产量(kg)', width: 100, align: 'right' },
  { prop: 'grade', label: '分级', width: 80, align: 'center' },
  { prop: 'quality', label: '品质检测', width: 95, align: 'center' },
  { prop: 'inspector', label: '检测员', width: 90 },
  { prop: 'status', label: '状态', width: 90, align: 'center' },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '批次号 / 地块 / 作物' },
  { key: 'grade', label: '分级', type: 'select', options: GRADES.map((g) => ({ label: g, value: g })) },
  { key: 'status', label: '状态', type: 'select', options: cfg.statusOptionGroups.harvest },
]

async function loadTable(params) {
  if (!plots.value.length) plots.value = await plotApi.all()
  return farmApi.harvestPage(params)
}

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, batchCode: '', plotId: plots.value[0]?.id, crop: plots.value[0]?.crop, date: '', qty: 100, grade: '一级', inspector: '', quality: '良', status: '待登记' })
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  const plot = plots.value.find((p) => p.name === row.plotName)
  Object.assign(form, {
    id: row.id, batchCode: row.batchCode, plotId: plot?.id || row.plotId, crop: row.crop,
    date: row.date, qty: row.qty, grade: row.grade, inspector: row.inspector || '',
    quality: row.quality || '良', status: row.status || '待登记',
  })
  dialogVisible.value = true
}
async function handleSubmit() {
  submitting.value = true
  try {
    const plot = plots.value.find((p) => p.id === form.plotId)
    const payload = {
      plotId: form.plotId, plotName: plot?.name, crop: form.crop, date: form.date,
      qty: form.qty, grade: form.grade, inspector: form.inspector, quality: form.quality,
    }
    if (isEdit.value) await farmApi.updateHarvest(form.id, payload)
    else await farmApi.createHarvest({ ...payload, status: form.status })
    ElMessage.success(isEdit.value ? '采收批次已更新' : '采收批次登记成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
async function confirmStock(row) {
  try {
    await ElMessageBox.confirm(`确认将批次「${row.batchCode}」入库吗？入库后可生成溯源批次。`, '入库确认', { type: 'info' })
  } catch {
    return
  }
  try {
    await farmApi.updateHarvest(row.id, { status: '已入库' })
    ElMessage.success('批次已入库')
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message || '入库失败')
  }
}
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除采收批次「${row.batchCode}」吗？`, '删除确认', { type: 'error' })
  } catch {
    return
  }
  try {
    await farmApi.removeHarvest(row.id)
    ElMessage.success('采收批次已删除')
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="采收管理" desc="采收批次登记、产量录入、分级记录与品质检测，入库后可生成溯源二维码">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">批次登记</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters" action-width="240">
      <template #col-qty="{ row }">
        <span class="mono-num qty">{{ row.qty }}</span>
      </template>
      <template #col-grade="{ row }">
        <el-rate :model-value="row.grade === '特级' ? 3 : row.grade === '一级' ? 2 : 1" disabled :max="3" size="small" />
      </template>
      <template #col-quality="{ row }">
        <el-tag size="small" :type="row.quality === '优' ? 'success' : row.quality === '良' ? 'primary' : 'info'" effect="light">品质{{ row.quality }}</el-tag>
      </template>
      <template #col-status="{ row }">
        <el-tag size="small" :type="row.status === '已入库' ? 'success' : 'warning'" effect="plain">{{ row.status }}</el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button v-if="row.status === '待登记'" link type="success" @click="confirmStock(row)">确认入库</el-button>
        <el-tag v-else size="small" type="info" effect="plain">已入库</el-tag>
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑采收批次' : '采收批次登记'" :rules="rules" :model="form" :submit-loading="submitting" width="580px" @submit="handleSubmit">
      <el-form-item label="采收地块" prop="plotId">
        <el-select v-model="form.plotId" style="width: 100%" @change="() => (form.crop = plots.find((p) => p.id === form.plotId)?.crop)">
          <el-option v-for="p in plots" :key="p.id" :label="`${p.name}（${p.crop}）`" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="采收日期" prop="date">
        <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width: 200px" :disabled-date="disabledFutureDate" />
      </el-form-item>
      <el-form-item label="产量(kg)" prop="qty">
        <el-input-number v-model="form.qty" :min="1" :max="100000" style="width: 200px" />
      </el-form-item>
      <el-form-item label="分级" prop="grade">
        <el-radio-group v-model="form.grade">
          <el-radio-button v-for="g in GRADES" :key="g" :value="g">{{ g }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="品质检测">
        <el-select v-model="form.quality" style="width: 200px">
          <el-option v-for="q in QUALITIES" :key="q" :label="q" :value="q" />
        </el-select>
      </el-form-item>
      <el-form-item label="检测员">
        <el-input v-model="form.inspector" placeholder="品质检测员姓名" style="width: 200px" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.qty {
  font-weight: 700;
  color: var(--ag-green-700);
}
</style>
