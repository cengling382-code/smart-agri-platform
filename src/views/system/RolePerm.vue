<script setup>
/** 页面 9 · 角色权限配置页：权限树勾选（菜单权限 / 按钮权限 / 数据权限） */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { sysApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const route = useRoute()

const roles = ref([])
const activeRole = ref(null)
const menuTree = ref([])
const checkedMenu = ref([])
const halfMenu = ref([])
const treeRef = ref(null)
const saving = ref(false)
const dirty = ref(false)

const BUTTON_PERMS = cfg.roleButtonPerms
const checkedBtn = ref(['btn-add', 'btn-edit'])
const dataScope = ref('本园区数据')
const DATA_SCOPES = cfg.roleDataScopes

const activeRoleName = computed(() => roles.value.find((r) => r.id === activeRole.value)?.name || '')
const suppressDirty = ref(false)

/** 默认角色 → 菜单映射（演示预置，接口无历史权限时兜底） */
const ROLE_DEFAULT_MENUS = cfg.roleDefaultMenus

/** 只取叶子节点，父级由 el-tree 根据子节点自动推导半选/全选，避免父级 id 误选全部子项 */
function leafIds(ids) {
  const parentIds = new Set(menuTree.value.map((g) => g.id))
  return ids.filter((id) => !parentIds.has(id))
}
function defaultMenus(roleId) {
  const role = roles.value.find((r) => r.id === roleId)
  const conf = ROLE_DEFAULT_MENUS[role?.code]
  if (!conf) return []
  return conf === 'all' ? leafIds(collectAll()) : conf
}
function collectAll() {
  const out = []
  menuTree.value.forEach((g) => {
    out.push(g.id)
    ;(g.children || []).forEach((c) => out.push(c.id))
  })
  return out
}

async function loadRolePerms(id) {
  if (!id) return
  suppressDirty.value = true
  const role = roles.value.find((r) => r.id === id)
  dataScope.value = role?.dataScope || '本园区数据'
  checkedBtn.value = Array.isArray(role?.buttonPerms) ? role.buttonPerms : ['btn-add', 'btn-edit']
  try {
    const res = await sysApi.roleMenus(id)
    const saved = res?.ids || []
    checkedMenu.value = saved.length ? saved : defaultMenus(id)
    await nextTick()
    treeRef.value?.setCheckedKeys([])
    treeRef.value?.setCheckedKeys(leafIds(checkedMenu.value), false)
    dirty.value = false
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    suppressDirty.value = false
  }
}
watch(activeRole, loadRolePerms)
watch(checkedMenu, () => {
  if (!suppressDirty.value) dirty.value = true
}, { deep: true })
watch([dataScope, checkedBtn], () => {
  if (!suppressDirty.value) dirty.value = true
}, { deep: true })
function onTreeCheck() {
  if (!suppressDirty.value) dirty.value = true
}

const treeProps = { label: 'name', children: 'children' }

async function savePerms() {
  if (!activeRole.value) return
  saving.value = true
  try {
    const ids = [
      ...(treeRef.value?.getCheckedKeys(false) || []),
      ...(treeRef.value?.getHalfCheckedKeys() || []),
    ].sort((a, b) => a - b)
    await Promise.all([
      sysApi.saveRoleMenus(activeRole.value, ids),
      sysApi.updateRole(activeRole.value, { dataScope: dataScope.value, buttonPerms: [...checkedBtn.value] }),
    ])
    const role = roles.value.find((r) => r.id === activeRole.value)
    if (role) {
      role.dataScope = dataScope.value
      role.buttonPerms = [...checkedBtn.value]
    }
    dirty.value = false
    ElMessage.success(`角色「${activeRoleName.value}」权限已更新`)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    saving.value = false
  }
}
function resetPerms() {
  loadRolePerms(activeRole.value)
  ElMessage.info('已还原为当前保存的权限')
}

onMounted(async () => {
  try {
    const [rs, tree] = await Promise.all([sysApi.allRoles(), sysApi.menuTree()])
    roles.value = rs
    menuTree.value = tree
    const qid = Number(route.query.roleId)
    activeRole.value = rs.find((r) => r.id === qid)?.id ?? rs[0]?.id
  } catch (e) {
    console.warn('[RolePerm]', e?.message || e)
  }
})
</script>

<template>
  <div class="page">
    <PageHeader title="角色权限配置" desc="按角色勾选菜单权限、按钮级权限与数据权限范围，保存后立即生效" />

    <div class="perm-layout">
      <!-- 角色选择 -->
      <aside class="ag-card role-list anim-left">
        <div class="rl-head">选择角色</div>
        <div class="rl-body">
          <button
            v-for="r in roles"
            :key="r.id"
            class="rl-item"
            :class="{ active: activeRole === r.id }"
            @click="activeRole = r.id"
          >
            <el-icon><Stamp /></el-icon>
            <div class="rl-meta">
              <b>{{ r.name }}</b>
              <span>{{ r.users }} 人 · {{ r.dataScope }}</span>
            </div>
          </button>
        </div>
      </aside>

      <!-- 权限配置 -->
      <div class="ag-card perm-main anim-up anim-delay-1">
        <div class="perm-head">
          <div>
            <b>{{ activeRoleName }}</b>
            <span class="text-dim"> — 勾选该角色可访问的菜单与按钮权限</span>
          </div>
          <div class="flex gap-8">
            <el-button :icon="'RefreshLeft'" @click="resetPerms">还原</el-button>
            <el-button type="primary" :loading="saving" :icon="'Check'" @click="savePerms">保存权限</el-button>
          </div>
        </div>

        <el-alert v-if="dirty" type="warning" :closable="false" show-icon title="权限配置已修改但尚未保存" class="mb-12" />

        <el-tabs model-value="menu">
          <el-tab-pane label="菜单权限" name="menu">
            <el-tree
              ref="treeRef"
              :data="menuTree"
              :props="treeProps"
              show-checkbox
              node-key="id"
              default-expand-all
              class="perm-tree"
              @check="onTreeCheck"
            />
          </el-tab-pane>

          <el-tab-pane label="按钮权限" name="btn">
            <div class="btn-perms">
              <el-checkbox-group v-model="checkedBtn">
                <el-checkbox v-for="b in BUTTON_PERMS" :key="b.id" :value="b.id" border>{{ b.label }}</el-checkbox>
              </el-checkbox-group>
            </div>
            <p class="text-dim mt-12">按钮级权限控制页面内操作按钮的可见性（如「删除」「审批」「设备控制」）</p>
          </el-tab-pane>

          <el-tab-pane label="数据权限" name="data">
            <el-radio-group v-model="dataScope">
              <el-radio v-for="s in DATA_SCOPES" :key="s" :value="s" border>{{ s }}</el-radio>
            </el-radio-group>
            <el-descriptions :column="1" border class="mt-16" size="small">
              <el-descriptions-item label="全部数据">系统管理员专用，可查看所有园区数据</el-descriptions-item>
              <el-descriptions-item label="本园区数据">仅查看本租户/园区下的地块、设备与业务数据</el-descriptions-item>
              <el-descriptions-item label="本人数据">仅查看本人负责的地块、工单与个人工时</el-descriptions-item>
              <el-descriptions-item label="溯源相关数据">仅可查看溯源批次、检测报告与公开统计</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<style scoped>
.perm-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 18px;
  align-items: start;
}
.role-list {
  overflow: hidden;
}
.rl-head {
  padding: 14px 18px 10px;
  font-weight: 600;
  border-bottom: 1px solid var(--ag-border-light);
}
.rl-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rl-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: var(--ag-radius); /* 决策依据：角色列表行属卡片类，token 化为卡片档 10px（值不变） */
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s var(--ag-ease);
}
.rl-item:hover {
  background: var(--ag-bg-hover);
}
.rl-item.active {
  background: var(--ag-green-50);
  border-color: var(--ag-green-300);
}
.rl-item :deep(.el-icon) {
  color: var(--ag-green-600);
}
.rl-meta {
  display: flex;
  flex-direction: column;
}
.rl-meta b {
  font-size: 14px;
  color: var(--ag-text-1);
}
.rl-meta span {
  font-size: 11px;
  color: var(--ag-text-4);
}
.perm-main {
  padding: 18px 22px;
}
.perm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.perm-tree {
  max-height: 430px;
  overflow: auto;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：权限树面板属面板类，token 化为卡片档 10px（值不变） */
  padding: 12px;
}
.btn-perms :deep(.el-checkbox) {
  margin-right: 14px;
  margin-bottom: 16px;
}
</style>
