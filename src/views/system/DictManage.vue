<script setup>
/** 页面 48 · 字典管理：数据字典维护（作物类型、农事类型、设备类型等） */
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { sysApi } from '@/api'

const groups = ref([])
const activeType = ref('')
const loading = ref(true)
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({ id: null, label: '', value: '', sort: 1, status: true })
const formRef = ref(null)
const rules = {
  label: [{ required: true, message: '请输入标签名', trigger: 'blur' }],
  value: [{ required: true, message: '请输入键值', trigger: 'blur' }],
}

onMounted(async () => {
  try {
    groups.value = await sysApi.dicts()
    activeType.value = groups.value[0]?.type
  } catch (e) {
    console.warn('[DictManage]', e?.message || e)
  } finally {
    loading.value = false
  }
})

const activeGroup = () => groups.value.find((g) => g.type === activeType.value)

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, label: '', value: '', sort: activeGroup()?.items.length + 1, status: true })
  dialogVisible.value = true
}
function openEdit(item) {
  isEdit.value = true
  Object.assign(form, { ...item })
  dialogVisible.value = true
}
async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  // 只提交字典项自身字段，避免把只读 id / 展示字段回写
  const payload = { label: form.label, value: form.value, sort: form.sort, status: form.status }
  try {
    if (isEdit.value) await sysApi.updateDictItem(activeType.value, form.id, payload)
    else await sysApi.addDictItem(activeType.value, payload)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    groups.value = await sysApi.dicts()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
async function handleDelete(item) {
  try {
    await ElMessageBox.confirm(`确定删除字典项「${item.label}」吗？`, '删除确认', { type: 'error' })
  } catch {
    return
  }
  try {
    await sysApi.removeDictItem(activeType.value, item.id)
    ElMessage.success('删除成功')
    groups.value = await sysApi.dicts()
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>

<template>
  <div class="page" v-loading="loading">
    <PageHeader title="字典管理" desc="数据字典维护：作物类型、农事类型、设备类型、告警类型与计量单位">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate" :disabled="!activeType">新增字典项</el-button>
      </template>
    </PageHeader>

    <div class="dict-layout">
      <!-- 字典分组 -->
      <aside class="ag-card group-list anim-left">
        <div class="gl-head">字典分组</div>
        <div class="gl-body">
          <button
            v-for="g in groups"
            :key="g.type"
            class="gl-item"
            :class="{ active: activeType === g.type }"
            @click="activeType = g.type"
          >
            <el-icon><Collection /></el-icon>
            <div class="gl-meta">
              <b>{{ g.name }}</b>
              <span class="text-dim">{{ g.type }} · {{ g.items.length }} 项</span>
            </div>
          </button>
        </div>
      </aside>

      <!-- 字典项 -->
      <div class="ag-card anim-up anim-delay-1">
        <div class="ag-card__head">
          <div class="ag-card__title"><span class="dot"></span>{{ activeGroup()?.name }}（{{ activeGroup()?.items.length }} 项）</div>
        </div>
        <div class="ag-card__body">
          <el-table :data="activeGroup()?.items" stripe>
            <el-table-column prop="sort" label="排序" width="70" align="center" />
            <el-table-column prop="label" label="标签名" min-width="140" />
            <el-table-column prop="value" label="键值" min-width="120">
              <template #default="{ row }">
                <code class="dict-code">{{ row.value }}</code>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.status ? 'success' : 'info'">{{ row.status ? '启用' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑字典项' : '新增字典项'" width="480px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标签名" prop="label">
          <el-input v-model="form.label" placeholder="显示名称，如：番茄" />
        </el-form-item>
        <el-form-item label="键值" prop="value">
          <el-input v-model="form.value" placeholder="如：crop_1" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="1" style="width: 140px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-text="启用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSubmit">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dict-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  align-items: start;
}
.gl-head {
  padding: 14px 18px 10px;
  font-weight: 600;
  border-bottom: 1px solid var(--ag-border-light);
}
.gl-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: var(--ag-radius); /* 决策依据：字典列表行属卡片类，token 化为卡片档 10px（值不变） */
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}
.gl-item:hover { background: var(--ag-bg-hover); }
.gl-item.active { background: var(--ag-green-50); border-color: var(--ag-green-300); }
.gl-item :deep(.el-icon) { color: var(--ag-green-600); }
.gl-meta { display: flex; flex-direction: column; }
.dict-code {
  background: var(--ag-bg-hover);
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 12px;
  color: var(--ag-blue-700);
}
@media (max-width: 900px) {
  .dict-layout { grid-template-columns: 1fr; }
}
</style>
