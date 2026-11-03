<script setup>
/** 页面 27 · 农资档案：种子/化肥/农药档案维护、供应商管理 */
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { farmApi } from '@/api'

const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

const CATEGORIES = ['种子', '化肥', '农药', '地膜']
const SUPPLIERS = ['金穗农资有限公司', '绿丰种业', '丰收化肥厂', '生物农药科技', '兴农地膜制品', '川农供应链']

const CAT_META = { 种子: { icon: 'Cherry', color: '#699C78' }, 化肥: { icon: 'Box', color: '#E89552' }, 农药: { icon: 'WarningFilled', color: '#E84A5F' }, 地膜: { icon: 'Crop', color: '#4C6983' } }

const form = reactive({ id: null, code: '', name: '', category: '种子', spec: '', unit: '袋', supplier: SUPPLIERS[0], price: 0, stock: 0, safeStock: 10 })
const rules = {
  code: [{ required: true, message: '请输入农资编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入农资名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
}

const columns = [
  { prop: 'code', label: '编号', width: 95 },
  { prop: 'name', label: '农资名称', minWidth: 190 },
  { prop: 'category', label: '类别', width: 85, align: 'center' },
  { prop: 'spec', label: '规格', width: 110 },
  { prop: 'unit', label: '单位', width: 70, align: 'center' },
  { prop: 'supplier', label: '供应商', minWidth: 150 },
  { prop: 'price', label: '单价(元)', width: 95, align: 'right' },
  { prop: 'stock', label: '库存', width: 95, align: 'center' },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '编号 / 名称 / 供应商' },
  { key: 'category', label: '类别', type: 'select', options: CATEGORIES.map((c) => ({ label: c, value: c })) },
]

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, code: '', name: '', category: '种子', spec: '', unit: '袋', supplier: SUPPLIERS[0], price: 0, stock: 0, safeStock: 10 })
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
    if (isEdit.value) await farmApi.updateMaterial(form.id, form)
    else await farmApi.createMaterial(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除农资「${row.name}」档案吗？历史出入库记录将保留。`, '删除确认', { type: 'error' })
  await farmApi.removeMaterial(row.id)
  ElMessage.success('删除成功')
  tableRef.value?.reload(true)
}
</script>

<template>
  <div class="page">
    <PageHeader title="农资档案" desc="种子、化肥、农药、地膜档案维护与供应商管理，出入库记录关联农事工单">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新增农资</el-button>
      </template>
    </PageHeader>

    <!-- 供应商速览 -->
    <div class="supplier-row stagger">
      <div v-for="s in SUPPLIERS" :key="s" class="s-card ag-card ag-card--hover">
        <el-icon :size="20" color="var(--ag-green-600)"><OfficeBuilding /></el-icon>
        <div class="s-meta">
          <b>{{ s }}</b>
          <span class="text-dim">正常合作 · {{ 2 + (s.length % 4) }} 种农资</span>
        </div>
      </div>
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="farmApi.materialPage" :filters="filters" action-width="200">
      <template #col-name="{ row }">
        <span class="m-name">
          <el-icon :size="15" :color="CAT_META[row.category]?.color"><component :is="CAT_META[row.category]?.icon || 'Box'" /></el-icon>
          {{ row.name }}
        </span>
      </template>
      <template #col-category="{ row }">
        <el-tag size="small" :type="row.category === '农药' ? 'danger' : row.category === '化肥' ? 'warning' : 'success'" effect="plain">{{ row.category }}</el-tag>
      </template>
      <template #col-price="{ row }">
        <span class="mono-num">¥{{ row.price }}</span>
      </template>
      <template #col-stock="{ row }">
        <span class="mono-num" :class="{ 'low-stock': row.stock < row.safeStock }">{{ row.stock }}</span>
        <span v-if="row.stock < row.safeStock" class="stock-warn">低于安全线</span>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑农资档案' : '新增农资档案'" :rules="rules" :model="form" :submit-loading="submitting" width="560px" @submit="handleSubmit">
      <el-form-item label="农资编号" prop="code">
        <el-input v-model="form.code" :disabled="isEdit" placeholder="如 MZ-009" />
      </el-form-item>
      <el-form-item label="农资名称" prop="name">
        <el-input v-model="form.name" placeholder="如 番茄种子（浙粉702）" />
      </el-form-item>
      <el-form-item label="类别" prop="category">
        <el-radio-group v-model="form.category">
          <el-radio-button v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="规格">
        <div class="flex gap-8">
          <el-input v-model="form.spec" placeholder="如 50kg/袋" style="width: 200px" />
          <el-select v-model="form.unit" style="width: 90px">
            <el-option v-for="u in ['袋', '瓶', '卷', '箱', 'kg']" :key="u" :label="u" :value="u" />
          </el-select>
        </div>
      </el-form-item>
      <el-form-item label="供应商">
        <el-select v-model="form.supplier" style="width: 100%">
          <el-option v-for="s in SUPPLIERS" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="单价(元)" prop="price">
        <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 200px" />
      </el-form-item>
      <el-form-item label="安全库存">
        <el-input-number v-model="form.safeStock" :min="0" style="width: 200px" />
        <span class="text-dim" style="margin-left: 8px">低于此值触发库存预警</span>
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.supplier-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
.s-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}
.s-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.s-meta b {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.m-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}
.low-stock {
  color: var(--ag-danger);
  font-weight: 700;
}
.stock-warn {
  font-size: 10px;
  color: var(--ag-danger);
  background: #FBEDED;
  padding: 1px 6px;
  border-radius: var(--ag-radius-sm); /* 决策依据：库存预警标签属小控件，对齐控件档 6px */
  margin-left: 6px;
}
@media (max-width: 1200px) {
  .supplier-row { grid-template-columns: repeat(3, 1fr); }
}
</style>
