<script setup>
/** 页面 8 · 角色管理：角色列表、新增角色、查看角色用户数、禁用/启用 */
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag } from '@/components/ui'
import { sysApi } from '@/api'
import { useRouter } from 'vue-router'

const router = useRouter()
const tableRef = ref(null)
const dialogVisible = ref(false)
const submitting = ref(false)
const form = reactive({ id: null, code: '', name: '', desc: '' })
const rules = {
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]{1,19}$/, message: '小写字母开头的英文编码', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  desc: [{ required: true, message: '请填写角色职责描述', trigger: 'blur' }],
}

const columns = [
  { prop: 'name', label: '角色名称', width: 130 },
  { prop: 'code', label: '角色编码', width: 110 },
  { prop: 'desc', label: '职责描述', minWidth: 220 },
  { prop: 'users', label: '用户数', width: 90, align: 'center' },
  { prop: 'dataScope', label: '数据权限', width: 120 },
  { prop: 'status', label: '状态', width: 80, align: 'center' },
]

const filters = [{ key: 'keyword', label: '关键字', placeholder: '角色名称 / 编码' }]

function openCreate() {
  Object.assign(form, { id: null, code: '', name: '', desc: '' })
  dialogVisible.value = true
}
async function handleSubmit() {
  submitting.value = true
  try {
    if (form.id) await sysApi.updateRole(form.id, form)
    else await sysApi.createRole(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function toggleStatus(row) {
  const target = row.status === '启用' ? '禁用' : '启用'
  await ElMessageBox.confirm(`确定${target}角色「${row.name}」吗？禁用后该角色用户无法访问对应功能。`, '敏感操作确认', { type: 'warning' })
  await sysApi.updateRole(row.id, { status: target })
  ElMessage.success(`已${target}`)
  tableRef.value?.reload(true)
}
async function handleDelete(row) {
  try {
    await sysApi.removeRole(row.id)
    ElMessage.success('角色已删除')
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="角色管理" desc="基于 RBAC 模型维护平台角色，查看各角色用户数与数据权限">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新增角色</el-button>
        <el-button :icon="'Key'" @click="router.push({ name: 'RolePerm' })">权限配置</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="sysApi.rolePage" :filters="filters" action-width="240">
      <template #col-name="{ row }">
        <span class="role-name">
          <el-icon :size="14" class="role-ico"><Stamp /></el-icon>{{ row.name }}
          <el-tag v-if="row.builtIn" size="small" type="info" effect="plain" style="margin-left: 6px">内置</el-tag>
        </span>
      </template>
      <template #col-users="{ row }">
        <span class="mono-num">{{ row.users }}</span>
      </template>
      <template #col-status="{ row }">
        <StatusTag :value="row.status" />
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="router.push({ name: 'RolePerm', query: { roleId: row.id } })">配置权限</el-button>
        <el-button link type="primary" @click="Object.assign(form, row); dialogVisible = true">编辑</el-button>
        <el-button link :type="row.status === '启用' ? 'warning' : 'success'" @click="toggleStatus(row)">
          {{ row.status === '启用' ? '禁用' : '启用' }}
        </el-button>
        <el-button v-if="!row.builtIn" link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" :title="form.id ? '编辑角色' : '新增角色'" :rules="rules" :model="form" :submit-loading="submitting" width="520px" @submit="handleSubmit">
      <el-form-item label="角色编码" prop="code">
        <el-input v-model="form.code" :disabled="!!form.id" placeholder="如：inspector" />
      </el-form-item>
      <el-form-item label="角色名称" prop="name">
        <el-input v-model="form.name" placeholder="如：巡检员" />
      </el-form-item>
      <el-form-item label="职责描述" prop="desc">
        <el-input v-model="form.desc" type="textarea" :rows="3" placeholder="描述该角色的核心职责" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.role-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.role-ico {
  color: var(--ag-green-600);
}
</style>
