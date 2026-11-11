<script setup>
/** 页面 28 · 农资入库/出库单：入库单、出库单创建与管理、库存流水记录 */
import { reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { farmApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)
const stockType = ref('in')
const materials = ref([])

const form = reactive({ type: 'in', materialId: null, qty: 1, operator: '', supplier: '', relatedOrder: '', remark: '' })
const selectedMaterial = computed(() => materials.value.find((m) => m.id === form.materialId))
const rules = {
  materialId: [{ required: true, message: '请选择农资', trigger: 'change' }],
  qty: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  operator: [{ required: true, message: '请输入经办人', trigger: 'blur' }],
}

const columns = [
  { prop: 'code', label: '单据编号', width: 130 },
  { prop: 'type', label: '类型', width: 85, align: 'center' },
  { prop: 'materialName', label: '农资名称', minWidth: 190 },
  { prop: 'qty', label: '数量', width: 85, align: 'right' },
  { prop: 'unit', label: '单位', width: 65, align: 'center' },
  { prop: 'operator', label: '经办人', width: 90 },
  { prop: 'supplier', label: '供应商/去向', minWidth: 140 },
  { prop: 'relatedOrder', label: '关联单据', width: 120 },
  { prop: 'time', label: '时间', width: 160 },
  { prop: 'remark', label: '备注', minWidth: 110 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '单号 / 农资 / 经办人' },
  { key: 'type', label: '类型', type: 'select', options: cfg.statusOptionGroups.stockType },
]

async function loadMats() {
  try {
    const res = await farmApi.materialPage({ page: 1, size: 50 })
    materials.value = res.list
  } catch (e) {
    console.warn('[StockRecord]', e?.message || e)
  }
}

function openDialog(type) {
  stockType.value = type
  Object.assign(form, { type, materialId: null, qty: 1, operator: '', supplier: type === 'in' ? '金穗农资有限公司' : '', relatedOrder: '', remark: '' })
  loadMats()
  dialogVisible.value = true
}

async function handleSubmit() {
  const mat = selectedMaterial.value
  const qty = Number(form.qty)
  if (!mat) {
    ElMessage.warning('请选择农资')
    return
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    ElMessage.warning('数量必须大于 0')
    return
  }
  if (form.type === 'out' && qty > mat.stock) {
    ElMessage.warning(`库存不足，当前仅剩 ${mat.stock} 单位`)
    return
  }
  submitting.value = true
  try {
    await farmApi.createStock({ ...form, materialName: mat.name, unit: mat.unit || '袋', supplier: form.type === 'in' ? form.supplier : '—' })
    ElMessage.success(form.type === 'in' ? '入库登记成功，库存已更新' : '出库登记成功，库存已扣减')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}

function sumByType(rows) {
  const inSum = rows.filter((r) => r.type === 'in').reduce((s, r) => s + r.qty, 0)
  const outSum = rows.filter((r) => r.type === 'out').reduce((s, r) => s + r.qty, 0)
  return { inSum, outSum }
}
</script>

<template>
  <div class="page">
    <PageHeader title="农资出入库单" desc="入库单、出库单创建与管理，全程库存流水记录，可关联采购与工单">
      <template #actions>
        <el-button type="success" :icon="'Download'" @click="openDialog('in')">入库登记</el-button>
        <el-button type="warning" :icon="'Upload'" @click="openDialog('out')">出库登记</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="farmApi.stockPage" :filters="filters" :page-size="12">
      <template #toolbar>
        <span class="text-dim">库存流水全部留痕，出库自动扣减库存并校验余量</span>
      </template>
      <template #col-code="{ row }">
        <span class="mono-num" :class="row.type === 'in' ? 'in-code' : 'out-code'">{{ row.code }}</span>
      </template>
      <template #col-type="{ row }">
        <el-tag size="small" :type="row.type === 'in' ? 'success' : 'warning'" effect="light">
          {{ row.type === 'in' ? '↓ 入库' : '↑ 出库' }}
        </el-tag>
      </template>
      <template #col-qty="{ row }">
        <span class="mono-num" :style="{ color: row.type === 'in' ? 'var(--ag-success)' : 'var(--ag-warning)', fontWeight: 700 }">
          {{ row.type === 'in' ? '+' : '−' }}{{ row.qty }}
        </span>
      </template>
    </ProTable>

    <FormDialog
      v-model="dialogVisible"
      :title="stockType === 'in' ? '农资入库登记' : '农资出库登记'"
      :rules="rules"
      :model="form"
      :submit-loading="submitting"
      width="560px"
      @submit="handleSubmit"
    >
      <el-form-item label="农资" prop="materialId">
        <el-select v-model="form.materialId" filterable style="width: 100%" placeholder="选择农资（可搜索）">
          <el-option v-for="m in materials" :key="m.id" :label="`${m.name}（当前库存 ${m.stock}${m.unit}）`" :value="m.id" />
        </el-select>
      </el-form-item>
      <el-form-item :label="stockType === 'in' ? '入库数量' : '出库数量'" prop="qty">
        <div class="qty-line">
          <el-input-number v-model="form.qty" :min="1" :max="stockType === 'out' ? 999 : 9999" style="width: 200px" />
          <span class="qty-unit">{{ selectedMaterial?.unit || '—' }}</span>
        </div>
      </el-form-item>
      <el-form-item v-if="stockType === 'in'" label="供应商">
        <el-input v-model="form.supplier" placeholder="供货供应商" />
      </el-form-item>
      <el-form-item v-if="stockType === 'out'" label="关联工单">
        <el-input v-model="form.relatedOrder" placeholder="如 WO-2026-0205（选填）" />
      </el-form-item>
      <el-form-item label="经办人" prop="operator">
        <el-input v-model="form.operator" placeholder="仓管/经办人姓名" style="width: 200px" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="验收情况 / 领用用途" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.in-code { color: var(--ag-success); }
.out-code { color: var(--ag-warning); }
.qty-line { display: flex; align-items: center; gap: 8px; }
.qty-unit { font-size: 13px; color: var(--ag-text-3); min-width: 32px; }
</style>
