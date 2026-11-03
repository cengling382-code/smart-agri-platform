<script setup>
/** 页面 20 · 网关设备管理：网关注册、连接状态、下属设备数量统计 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag } from '@/components/ui'
import { deviceApi, plotApi } from '@/api'

const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const plots = ref([])
const allDevices = ref([])

const form = reactive({ id: null, code: '', name: '', model: 'AGW-2000 Pro', plotId: null, ip: '' })
const rules = {
  code: [{ required: true, message: '请输入网关编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入网关名称', trigger: 'blur' }],
  ip: [{ pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'IP 格式不正确', trigger: 'blur' }],
}

const columns = [
  { prop: 'code', label: '网关编号', width: 130 },
  { prop: 'name', label: '网关名称', minWidth: 190 },
  { prop: 'model', label: '型号', width: 120 },
  { prop: 'status', label: '连接状态', width: 100, align: 'center' },
  { prop: 'children', label: '下挂设备', width: 100, align: 'center' },
  { prop: 'signal', label: '信号', width: 90, align: 'center' },
  { prop: 'ip', label: 'IP 地址', width: 130 },
  { prop: 'fw', label: '固件版本', width: 90 },
  { prop: 'lastReport', label: '最近心跳', width: 160 },
]

const filters = [{ key: 'keyword', label: '关键字', placeholder: '编号 / 名称' }]

async function fetchPage(params) {
  if (!plots.value.length) {
    const [ps, all] = await Promise.all([plotApi.all(), deviceApi.all()])
    plots.value = ps
    allDevices.value = all
  }
  return deviceApi.page({ ...params, type: 'gateway' })
}
function plotName(row) {
  return plots.value.find((p) => p.id === row.plotId)?.name || '—'
}
function showChildren(row) {
  const list = allDevices.value.filter((d) => d.gatewayCode === row.code)
  ElMessageBox.alert(
    list.length ? list.map((d) => `${d.code} · ${d.name}（${{ sensor: '传感器', actuator: '执行器', camera: '摄像头' }[d.type]}）`).join('<br/>') : '该网关下暂无已接入设备',
    `${row.name} · 下挂设备（${list.length} 台）`,
    { dangerouslyUseHTMLString: true, confirmButtonText: '知道了' }
  ).catch(() => {})
}
function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, code: '', name: '', model: 'AGW-2000 Pro', plotId: plots.value[0]?.id, ip: '' })
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
    else await deviceApi.create({ ...form, type: 'gateway' })
    ElMessage.success(isEdit.value ? '网关已更新' : '网关注册成功，等待设备接入')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function reboot(row) {
  await ElMessageBox.confirm(`确定重启网关「${row.name}」吗？重启期间约 30 秒无法转发数据。`, '重启确认', { type: 'warning', confirmButtonText: '重启' })
  ElMessage.success('重启指令已下发')
}
</script>

<template>
  <div class="page">
    <PageHeader title="网关设备管理" desc="物联网网关注册、连接状态监测与下挂设备统计">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">网关注册</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="fetchPage" :filters="filters" action-width="220">
      <template #col-status="{ row }">
        <span class="gw-status">
          <span class="pulse-dot" :class="row.status"></span>{{ row.status === 'online' ? '已连接' : '离线' }}
        </span>
      </template>
      <template #col-children="{ row }">
        <el-link type="primary" :underline="false" @click="showChildren(row)">{{ row.children }} 台</el-link>
      </template>
      <template #col-signal="{ row }">
        <el-progress :percentage="row.signal" :stroke-width="6" :show-text="false" :color="row.signal >= 80 ? '#699C78' : row.signal >= 50 ? '#E89552' : '#E84A5F'" style="width: 56px" />
      </template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="warning" :icon="'RefreshRight'" @click="reboot(row)">重启</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑网关' : '网关注册'" :rules="rules" :model="form" :submit-loading="submitting" width="520px" @submit="handleSubmit">
      <el-form-item label="网关编号" prop="code">
        <el-input v-model="form.code" :disabled="isEdit" placeholder="如 GW-2026-05" />
      </el-form-item>
      <el-form-item label="网关名称" prop="name">
        <el-input v-model="form.name" placeholder="如 果园物联网网关" />
      </el-form-item>
      <el-form-item label="设备型号">
        <el-input v-model="form.model" />
      </el-form-item>
      <el-form-item label="部署位置">
        <el-select v-model="form.plotId" style="width: 100%">
          <el-option v-for="p in plots" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="IP 地址" prop="ip">
        <el-input v-model="form.ip" placeholder="192.168.1.100" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.gw-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}
</style>
