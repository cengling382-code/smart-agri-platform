<script setup>
/** 页面 6+7 · 用户列表 + 用户新增/编辑弹窗：RBAC 用户管理 */
import { reactive, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag } from '@/components/ui'
import { sysApi } from '@/api'

const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const selected = ref([])

const rolesList = ref([])
const form = reactive({ id: null, username: '', name: '', phone: '', email: '', role: 'farmer', dept: '', password: '' })
const formRef = ref(null)

const rules = computed(() => ({
  username: [
    { required: true, message: '请输入登录账号', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]{3,15}$/, message: '4-16 位字母开头', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  password: isEdit.value ? [] : [{ required: true, min: 6, max: 20, message: '初始密码 6-20 位', trigger: 'blur' }],
}))

const columns = [
  { prop: 'username', label: '登录账号', width: 110 },
  { prop: 'name', label: '姓名', width: 90 },
  { prop: 'roleName', label: '角色', width: 110 },
  { prop: 'phone', label: '手机号', width: 125 },
  { prop: 'email', label: '邮箱', minWidth: 150 },
  { prop: 'dept', label: '部门', width: 110 },
  { prop: 'status', label: '状态', width: 80, align: 'center' },
  { prop: 'createdAt', label: '创建时间', width: 165 },
  { prop: 'lastLogin', label: '最近登录', width: 165 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '账号 / 姓名 / 手机号' },
  { key: 'role', label: '角色', type: 'select' },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '启用', value: '启用' }, { label: '禁用', value: '禁用' }] },
]

async function fetchPage(params) {
  if (!rolesList.value.length) {
    sysApi.allRoles().then((roles) => {
      rolesList.value = roles
      const f = filters.find((x) => x.key === 'role')
      if (f) f.options = roles.map((r) => ({ label: r.name, value: r.code }))
    })
  }
  return sysApi.userPage(params)
}

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, username: '', name: '', phone: '', email: '', role: 'farmer', dept: '', password: '' })
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  Object.assign(form, { ...row, password: '' })
  dialogVisible.value = true
}

async function handleSubmit() {
  submitting.value = true
  try {
    if (isEdit.value) await sysApi.updateUser(form.id, form)
    else await sysApi.createUser(form)
    ElMessage.success(isEdit.value ? '用户信息已更新' : '用户新增成功')
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
  try {
    await ElMessageBox.confirm(`确定要${target}用户「${row.name}」吗？${target === '禁用' ? '禁用后该账号将无法登录。' : ''}`, '敏感操作确认', { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
    await sysApi.updateUser(row.id, { status: target })
    ElMessage.success(`已${target}`)
    tableRef.value?.reload(true)
  } catch (e) {
    if (e !== 'cancel') e?.message && ElMessage.error(e.message)
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`删除后不可恢复，确定删除用户「${row.name}」吗？`, '删除确认', { type: 'error', confirmButtonText: '删除', cancelButtonText: '取消' })
    await sysApi.removeUser(row.id)
    ElMessage.success('用户已删除')
    tableRef.value?.reload(true)
  } catch (e) {
    if (e !== 'cancel') e?.message && ElMessage.error(e.message)
  }
}

async function batchDisable() {
  if (!selected.value.length) {
    ElMessage.warning('请先勾选用户')
    return
  }
  await ElMessageBox.confirm(`确定禁用选中的 ${selected.value.length} 个账号吗？`, '批量操作', { type: 'warning' })
  for (const u of selected.value) {
    await sysApi.updateUser(u.id, { status: '禁用' })
  }
  ElMessage.success('批量禁用完成')
  tableRef.value?.reload(true)
}
</script>

<template>
  <div class="page">
    <PageHeader title="用户管理" desc="平台账号全生命周期管理：新增、编辑、禁用与角色分配（RBAC）">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新增用户</el-button>
        <el-button :icon="'CircleClose'" @click="batchDisable">批量禁用</el-button>
      </template>
    </PageHeader>

    <ProTable
      ref="tableRef"
      :columns="columns"
      :fetch="fetchPage"
      :filters="filters"
      :page-size="10"
      selectable
      action-width="200"
      @selection-change="(v) => (selected = v)"
    >
      <template #col-roleName="{ row }">
        <el-tag size="small" :type="row.role === 'admin' ? 'danger' : row.role === 'manager' ? 'warning' : row.role === 'tech' ? 'primary' : 'success'" effect="plain">
          {{ row.roleName }}
        </el-tag>
      </template>
      <template #col-status="{ row }">
        <StatusTag :value="row.status" />
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link :type="row.status === '启用' ? 'warning' : 'success'" @click="toggleStatus(row)">
          {{ row.status === '启用' ? '禁用' : '启用' }}
        </el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <FormDialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      :rules="rules"
      :model="form"
      :submit-loading="submitting"
      width="560px"
      @submit="handleSubmit"
    >
      <el-form-item label="登录账号" prop="username">
        <el-input v-model="form.username" :disabled="isEdit" placeholder="字母开头，4-16 位" />
      </el-form-item>
      <el-form-item v-if="!isEdit" label="初始密码" prop="password">
        <el-input v-model="form.password" type="password" show-password placeholder="6-20 位，首次登录建议修改" />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" placeholder="真实姓名" />
      </el-form-item>
      <el-form-item label="角色" prop="role">
        <el-select v-model="form.role" style="width: 100%">
          <el-option v-for="r in rolesList" :key="r.code" :label="r.name" :value="r.code" />
        </el-select>
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" maxlength="11" placeholder="用于告警通知" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="选填" />
      </el-form-item>
      <el-form-item label="部门">
        <el-input v-model="form.dept" placeholder="如：种植一组" />
      </el-form-item>
    </FormDialog>
  </div>
</template>
