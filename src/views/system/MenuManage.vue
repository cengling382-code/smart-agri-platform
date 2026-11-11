<script setup>
/** 页面 10 · 菜单权限管理页：菜单树结构管理、新增/编辑/删除菜单项、路由配置 */
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { sysApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tree = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

const form = reactive({ id: null, parentId: null, name: '', path: '', icon: '', sort: 1, perm: '' })
const formRef = ref(null)
const rules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  path: [{ pattern: /^\/[a-zA-Z0-9/\-:]*$/, message: '路由路径以 / 开头', trigger: 'blur' }],
}

const ICONS = cfg.menuIcons

async function load() {
  loading.value = true
  try {
    tree.value = await sysApi.menuTree()
  } catch (e) {
    console.warn('[MenuManage]', e?.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openCreate(parent) {
  isEdit.value = false
  Object.assign(form, { id: null, parentId: parent?.id || null, name: '', path: '', icon: parent ? 'Menu' : 'Folder', sort: (parent?.children?.length || 0) + 1, perm: '' })
  dialogVisible.value = true
}
function openEdit(node, parent) {
  isEdit.value = true
  Object.assign(form, { ...node, parentId: parent?.id || null })
  dialogVisible.value = true
}
async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) await sysApi.updateMenu(form.id, form)
    else await sysApi.createMenu(form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    load()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function handleDelete(node) {
  // 取消 / 关闭确认框是正常用户操作：ElMessageBox.confirm 会 reject('cancel')，
  // 原先 await 写在 try 外，未捕获的 rejection 会冒泡到 ErrorBoundary 导致整页降级。
  const ok = await ElMessageBox.confirm(
    `确定删除菜单「${node.name}」吗？删除后相关角色将立即失去该菜单访问权。`,
    '删除确认', { type: 'error' }
  ).catch(() => false)
  if (!ok) return
  try {
    await sysApi.removeMenu(node.id)
    ElMessage.success('删除成功')
    load()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="菜单权限管理" desc="维护菜单树结构、路由路径与权限标识，支持新增/编辑/删除">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate(null)">新增一级菜单</el-button>
      </template>
    </PageHeader>

    <div class="ag-card" v-loading="loading" style="padding: 18px">
      <el-table :data="tree" row-key="id" border default-expand-all>
        <el-table-column label="菜单名称" min-width="200">
          <template #default="{ row }">
            <span class="m-name">
              <el-icon><component :is="row.icon || 'Menu'" /></el-icon>{{ row.name }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.children" size="small" type="warning">目录</el-tag>
            <el-tag v-else size="small">菜单</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="菜单项数" width="90" align="center">
          <template #default="{ row }">{{ row.children?.length ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" align="center">
          <template #default="{ row }">
            <el-button v-if="Array.isArray(row.children)" link type="primary" :icon="'Plus'" @click="openCreate(row)">添加子项</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider />
      <el-table :data="tree.flatMap((g) => (g.children || []).map((c) => ({ ...c, group: g.name, parentId: g.id })))" row-key="id" border>
        <el-table-column prop="group" label="所属目录" width="140" />
        <el-table-column label="菜单项" min-width="160">
          <template #default="{ row }">
            <span class="m-name"><el-icon><Menu /></el-icon>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row, { id: row.parentId })">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑菜单' : '新增菜单'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="form.name" placeholder="如：设备总览" />
        </el-form-item>
        <el-form-item label="路由路径" prop="path">
          <el-input v-model="form.path" placeholder="/iot/devices" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="form.icon" style="width: 100%">
            <el-option v-for="i in ICONS" :key="i" :label="i" :value="i" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.sort" :min="1" :max="99" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保 存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.m-name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 500;
}
.m-name :deep(.el-icon) {
  color: var(--ag-green-600);
}
</style>
