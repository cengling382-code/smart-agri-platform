<script setup>
/** 页面 30 · 人员管理：园区农户/工人档案、技能标签、工时统计 */
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag, StatCard } from '@/components/ui'
import { farmApi } from '@/api'

const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)

const SKILLS = ['播种', '施肥', '打药', '采收', '嫁接', '修剪', '滴灌维护', '大棚管理', '农机操作', '水产养殖']
const ROLES = ['农户', '工人', '技术员']

const form = reactive({ id: null, name: '', gender: '男', role: '农户', phone: '', skills: [], area: '', status: '在岗', joinDate: '' })
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const columns = [
  { prop: 'name', label: '姓名', width: 100 },
  { prop: 'gender', label: '性别', width: 70, align: 'center' },
  { prop: 'role', label: '角色', width: 90, align: 'center' },
  { prop: 'phone', label: '手机号', width: 125 },
  { prop: 'skills', label: '技能标签', minWidth: 220 },
  { prop: 'area', label: '负责区域', width: 100 },
  { prop: 'workHours', label: '累计工时(h)', width: 110, align: 'right' },
  { prop: 'tasks', label: '完成任务', width: 95, align: 'center' },
  { prop: 'status', label: '状态', width: 80, align: 'center' },
  { prop: 'joinDate', label: '入职日期', width: 110 },
]

const filters = [
  { key: 'keyword', label: '关键字', placeholder: '姓名 / 手机号 / 区域' },
  { key: 'role', label: '角色', type: 'select', options: ROLES.map((r) => ({ label: r, value: r })) },
  { key: 'status', label: '状态', type: 'select', options: [{ label: '在岗', value: '在岗' }, { label: '休假', value: '休假' }] },
]

const summary = ref({ total: 0, hours: 0, avgHours: 0 })
async function loadTable(params) {
  const res = await farmApi.personnel(params)
  summary.value.total = res.total
  return res
}
farmApi.personnel({ page: 1, size: 100 }).then((res) => {
  const hours = res.list.reduce((s, p) => s + p.workHours, 0)
  summary.value = { total: res.total, hours, avgHours: Math.round(hours / Math.max(1, res.total)) }
}).catch((e) => console.warn('[Personnel]', e?.message || e))

function openCreate() {
  isEdit.value = false
  Object.assign(form, { id: null, name: '', gender: '男', role: '农户', phone: '', skills: [], area: '', status: '在岗', joinDate: '' })
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
    ElMessage.success(isEdit.value ? '人员档案已更新' : '人员档案创建成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } finally {
    submitting.value = false
  }
}
async function viewHours(row) {
  ElMessageBox.alert(
    `<div style="font-size:13px;line-height:2">
      <b>${row.name}</b>（${row.role} · ${row.area}）<br/>
      累计工时：<b style="color:#074ce0">${row.workHours} 小时</b><br/>
      完成任务：<b>${row.tasks} 项</b><br/>
      入职日期：${row.joinDate}<br/>
      技能：${row.skills.join('、')}
    </div>`,
    '工时与工作量统计',
    { dangerouslyUseHTMLString: true, confirmButtonText: '知道了' }
  ).catch(() => {})
}
</script>

<template>
  <div class="page">
    <PageHeader title="人员管理" desc="园区农户/工人档案、技能标签管理与工时工作量统计">
      <template #actions>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新增人员</el-button>
      </template>
    </PageHeader>

    <div class="kpi-grid stagger">
      <StatCard label="在册人员" :value="summary.total" unit="人" icon="UserFilled" tone="green" />
      <StatCard label="累计工时" :value="summary.hours" unit="h" icon="Timer" tone="blue" />
      <StatCard label="人均工时" :value="summary.avgHours" unit="h" icon="DataLine" tone="cyan" />
    </div>

    <ProTable ref="tableRef" :columns="columns" :fetch="loadTable" :filters="filters" action-width="190">
      <template #col-name="{ row }">
        <span class="p-name"><span class="p-avatar">{{ row.name.slice(0, 1) }}</span>{{ row.name }}</span>
      </template>
      <template #col-role="{ row }">
        <el-tag size="small" :type="row.role === '技术员' ? 'primary' : row.role === '工人' ? 'warning' : 'success'" effect="plain">{{ row.role }}</el-tag>
      </template>
      <template #col-skills="{ row }">
        <el-tag v-for="s in row.skills" :key="s" size="small" type="info" effect="plain" style="margin-right: 4px">{{ s }}</el-tag>
      </template>
      <template #col-workHours="{ row }">
        <span class="mono-num">{{ row.workHours }}</span>
      </template>
      <template #col-status="{ row }"><StatusTag :value="row.status" /></template>
      <template #col-action="{ row }">
        <el-button link type="primary" @click="viewHours(row)">工时</el-button>
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
      </template>
    </ProTable>

    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑人员档案' : '新增人员档案'" :rules="rules" :model="form" :submit-loading="submitting" width="560px" @submit="handleSubmit">
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" style="width: 200px" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="form.gender">
          <el-radio value="男">男</el-radio>
          <el-radio value="女">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="角色" prop="role">
        <el-radio-group v-model="form.role">
          <el-radio-button v-for="r in ROLES" :key="r" :value="r">{{ r }}</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" maxlength="11" style="width: 200px" />
      </el-form-item>
      <el-form-item label="技能标签">
        <el-select v-model="form.skills" multiple style="width: 100%" placeholder="选择掌握的技能">
          <el-option v-for="s in SKILLS" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="负责区域">
        <el-input v-model="form.area" placeholder="如：1号棚 / 东大田" style="width: 200px" />
      </el-form-item>
      <el-form-item label="入职日期">
        <el-date-picker v-model="form.joinDate" type="date" value-format="YYYY-MM-DD" style="width: 200px" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 20px;
}
.p-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.p-avatar {
  width: 26px;
  height: 26px;
  border-radius: var(--ag-radius); /* 决策依据：26px 头像小块非控件，按卡片档归 10px */
  /* 决策依据：头像装饰性渐变底属"发光方块"，按简约高级规范改为同色系低透明度实色 + 语义色文字 */
  background: rgba(7, 76, 224, 0.1);
  color: var(--ag-green-700);
  font-size: 12px;
  display: grid;
  place-items: center;
  font-weight: 700;
}
</style>
