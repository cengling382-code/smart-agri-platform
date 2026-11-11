<script setup>
/** 页面 11 · 设备总览：网关/传感器/执行器列表、在线离线状态、搜索筛选、分组统计 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag } from '@/components/ui'
import { deviceApi, plotApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const router = useRouter()
const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const plots = ref([])
const stats = ref(null)
const activeType = ref('')

const TYPE_META = cfg.deviceTypeMeta
const STATUS_MAP = cfg.deviceStatusMap

const form = reactive({ id: null, code: '', name: '', type: 'sensor', subtype: '', model: '', plotId: null, gatewayCode: '' })
const rules = {
  code: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
}

const columns = [
  { prop: 'code', label: '设备编号', width: 120 },
  { prop: 'name', label: '设备名称', minWidth: 170 },
  { prop: 'type', label: '类型', width: 90, align: 'center' },
  { prop: 'model', label: '型号', width: 110 },
  { prop: 'status', label: '状态', width: 84, align: 'center' },
  { prop: 'signal', label: '信号', width: 90, align: 'center' },
  { prop: 'battery', label: '电量', width: 90, align: 'center' },
  { prop: 'lastReport', label: '最近上报', width: 160 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '编号 / 名称 / 型号' },
  { key: 'type', label: '类型', type: 'select', options: Object.entries(TYPE_META).map(([v, m]) => ({ label: m.label, value: v })) },
  { key: 'status', label: '状态', type: 'select', options: Object.entries(STATUS_MAP).map(([v, l]) => ({ label: l, value: v })) },
  { key: 'group', label: '分组', type: 'select', options: cfg.deviceGroupOptions.map((g) => ({ label: g, value: g })) },
]

async function fetchPage(params) {
  if (!plots.value.length) plotApi.all().then((p) => (plots.value = p))
  const res = await deviceApi.page(params)
  // 顶部分组统计
  const all = await deviceApi.all()
  const byType = {}
  all.forEach((d) => {
    byType[d.type] = byType[d.type] || { total: 0, online: 0, offline: 0, fault: 0 }
    byType[d.type].total++
    byType[d.type][d.status]++
  })
  stats.value = byType
  return res
}

/** 点击顶部分类卡片：真正写入 ProTable 的 type 筛选条件并刷新列表 */
function filterByType(type) {
  activeType.value = activeType.value === type ? '' : type
  const q = tableRef.value?.query
  if (!q) return
  q.type = activeType.value
  tableRef.value.reload()
}
function plotName(row) {
  return plots.value.find((p) => p.id === row.plotId)?.name || '—'
}
function signalPct(v) {
  return v >= 80 ? 'var(--ag-success)' : v >= 50 ? '#c9803e' : 'var(--ag-danger)'
}

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, code: '', name: '', type: 'sensor', subtype: '', model: '', plotId: plots.value[0]?.id, gatewayCode: '' })
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
    if (isEdit.value) await deviceApi.update(form.id, form)
    else await deviceApi.create(form)
    ElMessage.success(isEdit.value ? '设备已更新' : '设备接入成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除设备「${row.name}」吗？删除后历史数据保留。`, '删除确认', { type: 'error' })
    await deviceApi.remove(row.id)
    ElMessage.success('设备已删除')
    tableRef.value?.reload(true)
  } catch (e) {
    if (e !== 'cancel') e?.message && ElMessage.error(e.message)
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="设备总览" desc="网关、传感器、执行器与摄像头统一管理，支持分组统计与状态监控">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">设备接入</el-button>
      </template>
    </PageHeader>

    <!-- 分组统计 -->
    <div class="type-stats stagger" v-if="stats">
      <div v-for="(t, k) in TYPE_META" :key="k" class="t-card ag-card ag-card--hover" :class="{ active: activeType === k }" role="button" tabindex="0" :aria-label="`只看${t.label}设备`" @click="filterByType(k)" @keyup.enter="filterByType(k)">
        <div class="t-icon" :class="'ic-' + k"><el-icon :size="20"><component :is="t.icon" /></el-icon></div>
        <div class="t-meta">
          <div class="t-name">{{ t.label }}<span class="t-total mono-num">{{ stats[k]?.total || 0 }}</span></div>
          <div class="t-status">
            <span class="ts ts-on">在线 {{ stats[k]?.online || 0 }}</span>
            <span class="ts ts-off">离线 {{ stats[k]?.offline || 0 }}</span>
            <span class="ts ts-fault">故障 {{ stats[k]?.fault || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="fetchPage" :filters="filters" action-width="230">
      <template #col-type="{ row }">
        <el-tag size="small" :type="TYPE_META[row.type]?.tag" effect="plain">{{ TYPE_META[row.type]?.label }}</el-tag>
      </template>
      <template #col-status="{ row }">
        <span class="dev-status">
          <span class="pulse-dot" :class="row.status"></span>{{ STATUS_MAP[row.status] }}
        </span>
      </template>
      <template #col-signal="{ row }">
        <el-progress :percentage="row.signal" :stroke-width="6" :show-text="false" :color="signalPct(row.signal)" style="width: 60px" />
      </template>
      <template #col-battery="{ row }">
        <span class="mono-num" :style="{ color: row.battery < 30 ? 'var(--ag-danger)' : 'var(--ag-text-2)' }">{{ row.type === 'camera' || row.type === 'gateway' ? '—' : row.battery + '%' }}</span>
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="router.push(`/iot/devices/${row.id}`)">详情</el-button>
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button v-if="row.type !== 'gateway'" link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑设备' : '设备接入注册'" :rules="rules" :model="form" :submit-loading="submitting" width="540px" @submit="handleSubmit">
      <el-form-item label="设备类型" prop="type">
        <el-radio-group v-model="form.type">
          <el-radio-button v-for="(t, k) in TYPE_META" :key="k" :value="k">{{ t.label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="设备编号" prop="code">
        <el-input v-model="form.code" :disabled="isEdit" placeholder="如 SN-1024" />
      </el-form-item>
      <el-form-item label="设备名称" prop="name">
        <el-input v-model="form.name" placeholder="如 1号棚空气温湿度传感器" />
      </el-form-item>
      <el-form-item label="设备型号">
        <el-input v-model="form.model" placeholder="如 RS485-Pro" />
      </el-form-item>
      <el-form-item label="所属地块">
        <el-select v-model="form.plotId" style="width: 100%">
          <el-option v-for="p in plots" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.type-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.t-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  cursor: pointer;
  outline: none;
}
.t-card.active {
  border-color: var(--ag-green-600);
  box-shadow: 0 0 0 2px var(--ag-green-50);
}
.t-card:focus-visible {
  box-shadow: 0 0 0 2px var(--ag-green-600);
}
.t-icon {
  width: 46px;
  height: 46px;
  border-radius: var(--ag-radius); /* 决策依据：46px 设备图标块非控件，token 化为卡片档 10px（值不变） */
  display: grid;
  place-items: center;
  flex: none;
}
.ic-gateway { background: rgba(201, 128, 62, 0.12); color: #c9803e; }
.ic-sensor { background: rgba(7, 76, 224, 0.10); color: #074ce0; }
.ic-actuator { background: #D6E6F2; color: #4C6983; }
.ic-camera { background: #E3EEF6; color: #4C6983; }
.t-name {
  font-weight: 600;
  display: flex;
  gap: 8px;
  align-items: center;
}
.t-total {
  color: var(--ag-text-1);
}
.t-status {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.ts {
  font-size: 11px;
}
.ts-on { color: var(--ag-success); }
.ts-off { color: var(--ag-text-4); }
.ts-fault { color: var(--ag-danger); }
.dev-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}
@media (max-width: 1100px) {
  .type-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
