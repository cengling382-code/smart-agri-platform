<script setup>
/** 页面 43 · 产品上架管理：农产品信息、图片、规格、价格上架管理 */
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog } from '@/components/ui'
import { tradeApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

const IMG_META = cfg.productImgMeta

const form = reactive({ id: null, name: '', crop: '番茄', spec: '', price: 0, stock: 100, status: '上架', img: 'tomato', traceCode: '' })
const rules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  spec: [{ required: true, message: '请输入规格', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
}

const columns = [
  { prop: 'img', label: '图片', width: 90, align: 'center' },
  { prop: 'name', label: '产品名称', minWidth: 190 },
  { prop: 'spec', label: '规格', width: 130 },
  { prop: 'price', label: '售价', width: 100, align: 'right' },
  { prop: 'stock', label: '库存', width: 85, align: 'center' },
  { prop: 'sales', label: '销量', width: 85, align: 'center' },
  { prop: 'traceCode', label: '溯源码', width: 140 },
  { prop: 'status', label: '状态', width: 80, align: 'center' },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '产品名称 / 作物' },
  { key: 'status', label: '状态', type: 'select', options: cfg.statusOptionGroups.product },
]

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, name: '', crop: '番茄', spec: '', price: 0, stock: 100, status: '上架', img: 'tomato', traceCode: '' })
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
    if (isEdit.value) await tradeApi.updateProduct(form.id, form)
    else await tradeApi.createProduct(form)
    ElMessage.success(isEdit.value ? '产品信息已更新' : '产品上架成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function toggleStatus(row) {
  const target = row.status === '上架' ? '下架' : '上架'
  await ElMessageBox.confirm(`确定${target}产品「${row.name}」吗？`, '状态变更', { type: 'warning' })
  await tradeApi.updateProduct(row.id, { status: target })
  ElMessage.success(`已${target}`)
  tableRef.value?.reload(true)
}
</script>

<template>
  <div class="page">
    <PageHeader title="产品上架管理" desc="农产品信息、图片、规格、价格上架管理，绑定溯源码实现一物一码销售">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">上架产品</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="tradeApi.productPage" :filters="filters" action-width="200">
      <template #col-img="{ row }">
        <span class="p-img" :style="{ background: IMG_META[row.img]?.bg }">{{ (row.name || '产')[0] }}</span>
      </template>
      <template #col-price="{ row }">
        <span class="price mono-num">¥{{ row.price }}</span>
      </template>
      <template #col-traceCode="{ row }">
        <el-tag v-if="row.traceCode" size="small" type="success" effect="plain" class="mono-num">{{ row.traceCode }}</el-tag>
        <span v-else class="text-dim">未绑定</span>
      </template>
      <template #col-status="{ row }">
        <el-tag size="small" :type="row.status === '上架' ? 'success' : 'info'">{{ row.status }}</el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link :type="row.status === '上架' ? 'warning' : 'success'" @click="toggleStatus(row)">
          {{ row.status === '上架' ? '下架' : '上架' }}
        </el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑产品' : '产品上架'" :rules="rules" :model="form" :submit-loading="submitting" width="560px" @submit="handleSubmit">
      <el-form-item label="产品名称" prop="name">
        <el-input v-model="form.name" placeholder="如 智慧番茄礼盒（3kg）" />
      </el-form-item>
      <el-form-item label="规格" prop="spec">
        <el-input v-model="form.spec" placeholder="如 3kg/盒 精选果" style="width: 260px" />
      </el-form-item>
      <el-form-item label="售价(元)" prop="price">
        <el-input-number v-model="form.price" :min="0" :precision="1" style="width: 180px" />
      </el-form-item>
      <el-form-item label="库存">
        <el-input-number v-model="form.stock" :min="0" style="width: 180px" />
      </el-form-item>
      <el-form-item label="产品图片">
        <div class="img-picker">
          <button
            v-for="(m, k) in IMG_META"
            :key="k"
            class="ip-item"
            :class="{ active: form.img === k }"
            :style="{ background: m.bg }"
            type="button"
            @click="form.img = k"
          >{{ m.label }}</button>
        </div>
        <div class="text-dim" style="width: 100%">演示环境使用内置占位图，生产环境支持图片上传</div>
      </el-form-item>
      <el-form-item label="绑定溯源码">
        <el-input v-model="form.traceCode" placeholder="如 TR-2026-0700" style="width: 260px" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.p-img {
  width: 46px;
  height: 46px;
  border-radius: 8px; /* 首字符头像 chip：8px 圆角 */
  display: inline-grid;
  place-items: center;
  background: var(--ag-bg-page);
  color: var(--ag-text-2);
  font-family: var(--ag-font-display);
  font-size: 20px;
  font-weight: 600;
  transition: transform 0.25s var(--ag-ease-spring);
}
/* 决策依据：hover 缩放旋转属装饰性动效，按简约高级规范移除（原 .p-img:hover 仅此一条声明） */
.price {
  font-weight: 700;
  color: var(--ag-danger);
}
.img-picker {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-bottom: 4px;
}
.ip-item {
  width: 46px;
  height: 46px;
  border-radius: 8px; /* 与 .p-img 同规格首字 chip */
  border: 2px solid transparent;
  color: var(--ag-text-2);
  font-family: var(--ag-font-display);
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.ip-item.active {
  border-color: var(--ag-green-600);
  /* 决策依据：选中态放大属装饰性动效，按简约高级规范移除 transform，选中描边保留 */
}
</style>
