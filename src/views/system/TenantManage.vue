<script setup>
/** 页面 51 · 租户/园区管理页：多园区独立使用、数据隔离、资源配额配置 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, StatCard } from '@/components/ui'
import { sysApi } from '@/api'
import { disabledPastDate, notPastValidator } from '@/utils/dateRule'

const QUOTA_OPTIONS = ['20GB', '30GB', '50GB', '100GB']
/** '62.5GB' → 62.5；非数字按 0 处理 */
function toGb(v) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const tableRef = ref(null)
const formRef = ref(null)
const createRef = ref(null)
const editVisible = ref(false)
const createVisible = ref(false)
const submitting = ref(false)
const allTenants = ref([])
const form = reactive({ id: null, name: '', admin: '', quota: '', used: '', status: '正常', expire: '' })
const createForm = reactive({ name: '', admin: '', quota: '20GB', expire: '' })
/** 打开弹窗时的原配额：用于区分「改小配额」与「历史数据本就超额、仅改其它字段」 */
const originalQuota = ref('')

const usedGb = computed(() => toGb(form.used))
const quotaBelowUsed = computed(() => usedGb.value > 0 && toGb(form.quota) < usedGb.value)
function quotaUnavailable(q) {
  return usedGb.value > 0 && toGb(q) < usedGb.value
}
const rules = {
  name: [{ required: true, message: '请输入园区名称', trigger: 'blur' }],
  admin: [{ required: true, message: '请输入管理员', trigger: 'blur' }],
  expire: [notPastValidator('服务到期不能早于今天')],
}
const createRules = {
  name: [{ required: true, message: '请输入园区名称', trigger: 'blur' }],
  admin: [{ required: true, message: '请输入管理员', trigger: 'blur' }],
  expire: [{ required: true, message: '请选择服务到期日', trigger: 'change' }, notPastValidator('服务到期不能早于今天')],
}

const kpi = computed(() => {
  const list = allTenants.value
  const sum = (k) => list.reduce((s, t) => s + (Number(t[k]) || 0), 0)
  return { parks: list.length, plots: sum('plots'), devices: sum('devices'), users: sum('users') }
})

async function loadAll() {
  try {
    const res = await sysApi.tenants({ page: 1, size: 1000 })
    allTenants.value = res.list
  } catch (e) {
    console.warn('[TenantManage]', e?.message || e)
  }
}
onMounted(loadAll)

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

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '园区名称 / 管理员' },
]

function openEdit(row) {
  Object.assign(form, { ...row })
  originalQuota.value = row.quota
  editVisible.value = true
}
function openCreate() {
  Object.assign(createForm, { name: '', admin: '', quota: '20GB', expire: '' })
  createVisible.value = true
}
async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (valid === false) return
  // 配额不能低于已占用额度：用户主动调小到已用量以下时明确提示并阻止保存。
  // 历史数据本就超额（如 62.5GB / 50GB）且未改动配额时，仍允许修改管理员/到期日。
  if (quotaBelowUsed.value && form.quota !== originalQuota.value) {
    await ElMessageBox.alert(
      `园区「${form.name}」当前已使用 ${form.used}，将配额改为 ${form.quota} 会低于已占用额度。` +
      '请先清理该园区的存储数据，或选择不小于已用额度的配额（如 100GB）。',
      '配额不可低于已用额度',
      { type: 'warning', confirmButtonText: '我知道了' }
    ).catch(() => false)
    return
  }
  try {
    await sysApi.updateTenant(form.id, { admin: form.admin, quota: form.quota, expire: form.expire })
    ElMessage.success('租户配置已保存')
    editVisible.value = false
    tableRef.value?.reload(true)
    loadAll()
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  }
}
async function handleCreate() {
  const valid = await createRef.value?.validate().catch(() => false)
  if (valid === false) return
  submitting.value = true
  try {
    await sysApi.createTenant({ ...createForm, plots: 0, devices: 0 })
    ElMessage.success('租户创建成功')
    createVisible.value = false
    tableRef.value?.reload(true)
    loadAll()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
function usagePct(row) {
  const used = parseFloat(row.used) || 0
  const total = parseFloat(row.quota) || 1
  return Math.min(100, Math.round((used / total) * 100))
}
</script>

<template>
  <div class="page">
    <PageHeader title="租户/园区管理" desc="多园区独立使用、数据隔离与资源配额配置（多租户 SaaS 模式）">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新增租户</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid stagger">
      <StatCard label="入驻园区" :value="kpi.parks" unit="个" icon="OfficeBuilding" tone="green" />
      <StatCard label="覆盖地块" :value="kpi.plots" unit="块" icon="Place" tone="blue" />
      <StatCard label="接入设备" :value="kpi.devices" unit="台" icon="Cpu" tone="cyan" />
      <StatCard label="平台用户" :value="kpi.users" unit="人" icon="UserFilled" tone="amber" />
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="sysApi.tenants" :filters="filters" action-width="110">
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
          <el-progress :percentage="usagePct(row)" :stroke-width="7" :show-text="false" :color="usagePct(row) > 80 ? '#E84A5F' : usagePct(row) > 60 ? '#c9803e' : '#558162'" />
          <span class="text-dim mono-num">{{ row.used || '0GB' }} / {{ row.quota }}</span>
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="园区名称" prop="name">
          <el-input v-model="form.name" disabled />
        </el-form-item>
        <el-form-item label="管理员" prop="admin">
          <el-input v-model="form.admin" />
        </el-form-item>
        <el-form-item label="存储配额">
          <div class="quota-field">
            <el-radio-group v-model="form.quota">
              <el-radio-button
                v-for="q in QUOTA_OPTIONS"
                :key="q"
                :value="q"
                :disabled="quotaUnavailable(q)"
                :title="quotaUnavailable(q) ? `低于当前已用 ${form.used}` : q"
              >{{ q }}</el-radio-button>
            </el-radio-group>
            <div class="quota-hint" :class="{ warn: quotaBelowUsed }">
              <template v-if="quotaBelowUsed">
                ⚠ 当前配额 {{ form.quota }} 低于已用 {{ form.used }}，请调高配额后再保存
              </template>
              <template v-else>
                当前已用 {{ form.used || '0GB' }}，配额须不低于已用额度；低于用量的选项已禁用
              </template>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="服务到期" prop="expire">
          <el-date-picker v-model="form.expire" type="date" value-format="YYYY-MM-DD" style="width: 200px" :disabled-date="disabledPastDate" />
        </el-form-item>
        <el-alert type="info" :closable="false" show-icon title="数据隔离说明：各租户数据物理隔离，仅租户管理员可见本园区数据" />
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSave">保存配置</el-button>
      </template>
    </el-dialog>

    <!-- 新增租户 -->
    <el-dialog v-model="createVisible" title="新增租户/园区" width="500px" destroy-on-close>
      <el-form ref="createRef" :model="createForm" :rules="createRules" label-width="90px">
        <el-form-item label="园区名称" prop="name">
          <el-input v-model="createForm.name" placeholder="如：东山智慧农场" />
        </el-form-item>
        <el-form-item label="管理员" prop="admin">
          <el-input v-model="createForm.admin" placeholder="负责人姓名" />
        </el-form-item>
        <el-form-item label="存储配额">
          <el-radio-group v-model="createForm.quota">
            <el-radio-button v-for="q in QUOTA_OPTIONS" :key="q" :value="q">{{ q }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="服务到期" prop="expire">
          <el-date-picker v-model="createForm.expire" type="date" value-format="YYYY-MM-DD" style="width: 200px" :disabled-date="disabledPastDate" />
        </el-form-item>
        <el-alert type="info" :closable="false" show-icon title="创建后该园区独立使用，数据与其他租户完全隔离" />
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleCreate">创建租户</el-button>
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
.quota-field {
  width: 100%;
}
.quota-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ag-text-3, #6b7380);
}
.quota-hint.warn {
  color: #b45309;
  background: #fff5e6;
  border: 1px solid #f0c48a;
  border-radius: 8px;
  padding: 6px 10px;
}
</style>
