<script setup>
/** 页面 51 · 租户/园区管理页：多园区独立使用、数据隔离、资源配额配置 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { PageHeader, ProTable, StatCard } from '@/components/ui'
import { sysApi } from '@/api'

const tableRef = ref(null)
const editVisible = ref(false)
const form = reactive({ id: null, name: '', admin: '', quota: '', status: '正常', expire: '' })
const rules = {
  name: [{ required: true, message: '请输入园区名称', trigger: 'blur' }],
  admin: [{ required: true, message: '请输入管理员', trigger: 'blur' }],
}

const columns = [
  { prop: 'name', label: '园区/租户', minWidth: 220 },
  { prop: 'admin', label: '管理员', width: 110 },
  { prop: 'plots', label: '地块', width: 75, align: 'center' },
  { prop: 'devices', label: '设备', width: 75, align: 'center' },
  { prop: 'users', label: '用户', width: 75, align: 'center' },
  { prop: 'used', label: '资源用量', width: 150 },
  { prop: 'quota', label: '配额', width: 85 },
  { prop: 'status', label: '状态', width: 95, align: 'center' },
  { prop: 'expire', label: '服务到期', width: 110 },
]

function openEdit(row) {
  Object.assign(form, { ...row })
  editVisible.value = true
}
async function handleSave() {
  await sysApi.updateTenant(form.id, form)
  ElMessage.success('租户配置已保存')
  editVisible.value = false
  tableRef.value?.reload(true)
}
function usagePct(row) {
  const used = parseFloat(row.used)
  const total = parseFloat(row.quota)
  return Math.min(100, Math.round((used / total) * 100))
}
</script>

<template>
  <div class="page">
    <PageHeader title="租户/园区管理" desc="多园区独立使用、数据隔离与资源配额配置（多租户 SaaS 模式）" />

    <div class="kpi-grid stagger">
      <StatCard label="入驻园区" :value="4" unit="个" icon="OfficeBuilding" tone="green" />
      <StatCard label="覆盖地块" :value="29" unit="块" icon="Place" tone="blue" />
      <StatCard label="接入设备" :value="168" unit="台" icon="Cpu" tone="cyan" />
      <StatCard label="平台用户" :value="50" unit="人" icon="UserFilled" tone="amber" />
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="sysApi.tenants" action-width="110">
      <template #col-name="{ row }">
        <span class="t-name">
          <span class="t-icon"><el-icon><OfficeBuilding /></el-icon></span>
          <div class="t-meta">
            <b>{{ row.name }}</b>
            <span class="text-dim">创建于 {{ row.createdAt }}</span>
          </div>
        </span>
      </template>
      <template #col-used="{ row }">
        <div class="usage">
          <el-progress :percentage="usagePct(row)" :stroke-width="7" :show-text="false" :color="usagePct(row) > 80 ? '#E84A5F' : usagePct(row) > 60 ? '#E89552' : '#699C78'" />
          <span class="text-dim mono-num">{{ row.used }} / {{ row.quota }}</span>
        </div>
      </template>
      <template #col-status="{ row }">
        <el-tag size="small" :type="row.status === '正常' ? 'success' : 'warning'">{{ row.status }}</el-tag>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="openEdit(row)">配额配置</el-button>
      </template>
    </ProTable>

    <el-dialog v-model="editVisible" title="租户/园区配额配置" width="500px" destroy-on-close>
      <el-form :model="form" label-width="90px">
        <el-form-item label="园区名称">
          <el-input v-model="form.name" disabled />
        </el-form-item>
        <el-form-item label="管理员">
          <el-input v-model="form.admin" />
        </el-form-item>
        <el-form-item label="存储配额">
          <el-radio-group v-model="form.quota">
            <el-radio-button v-for="q in ['20GB', '30GB', '50GB', '100GB']" :key="q" :value="q">{{ q }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="服务到期">
          <el-date-picker v-model="form.expire" type="date" value-format="YYYY-MM-DD" style="width: 200px" />
        </el-form-item>
        <el-alert type="info" :closable="false" show-icon title="数据隔离说明：各租户数据物理隔离，仅租户管理员可见本园区数据" />
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSave">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.t-name {
  display: flex;
  align-items: center;
  gap: 10px;
}
.t-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--ag-radius); /* 决策依据：36px 图标块非控件，token 化为卡片档 10px（值不变） */
  background: var(--ag-green-50);
  color: var(--ag-green-600);
  display: grid;
  place-items: center;
  flex: none;
}
.t-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}
.usage {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
</style>
