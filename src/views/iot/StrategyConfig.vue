<script setup>
/** 页面 15 · 策略联动配置：自动控制规则新增编辑、阈值设置、定时任务、场景模板 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, FormDialog, StatusTag } from '@/components/ui'
import { strategyApi, taskApi, plotApi } from '@/api'
import { getConfig } from '@/data/configStore'

const cfg = getConfig('constants')

const tableRef = ref(null)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const plots = ref([])
const activeScene = ref(localStorage.getItem('agri-active-scene') || '')

const form = reactive({
  id: null, name: '', plotId: null, trigger: 'threshold',
  condition: '', action: '', enabled: true, scene: '',
})
const rules = {
  name: [{ required: true, message: '请输入策略名称', trigger: 'blur' }],
  plotId: [{ required: true, message: '请选择地块', trigger: 'change' }],
  condition: [{ required: true, message: '请配置触发条件', trigger: 'blur' }],
  action: [{ required: true, message: '请填写执行动作', trigger: 'blur' }],
}

const TRIGGER_META = cfg.strategyTriggerMeta

/* 阈值条件构造器 */
const threshold = reactive({ param: 'soilH', op: '<', value: 45, duration: 15 })
const combo = reactive({ p1: 'temp', op1: '>', v1: 30, logic: '且', p2: 'co2', op2: '<', v2: 600, time: '02:00-06:00' })
const PARAMS = cfg.strategyParams
const PARAM_LABEL = Object.fromEntries(PARAMS.map((p) => [p.v, p.l]))

function buildCondition(trigger) {
  if (trigger === 'threshold') return `${PARAM_LABEL[threshold.param]} ${threshold.op} ${threshold.value} 持续 ${threshold.duration} 分钟`
  if (trigger === 'combo') return `${combo.time ? combo.time + ' 且 ' : ''}${PARAM_LABEL[combo.p1]} ${combo.op1} ${combo.v1} ${combo.logic} ${PARAM_LABEL[combo.p2]} ${combo.op2} ${combo.v2}`
  return form.condition
}

const columns = [
  { prop: 'name', label: '策略名称', width: 180 },
  { prop: 'trigger', label: '类型', width: 110, align: 'center' },
  { prop: 'plotId', label: '适用地块', width: 150 },
  { prop: 'condition', label: '触发条件', minWidth: 230 },
  { prop: 'action', label: '执行动作', minWidth: 210 },
  { prop: 'times', label: '触发次数', width: 90, align: 'center' },
  { prop: 'enabled', label: '状态', width: 90, align: 'center' },
  { prop: 'updatedAt', label: '更新时间', width: 165 },
]

const filters = computed(() => [
  { key: 'keyword', label: '关键字', placeholder: '策略名称 / 条件 / 动作' },
  {
    key: 'trigger', label: '触发类型', type: 'select',
    options: Object.entries(TRIGGER_META).map(([value, v]) => ({ label: v.label, value })),
  },
  {
    key: 'enabled', label: '启用状态', type: 'select',
    options: cfg.statusOptionGroups.strategyEnabled,
  },
  {
    key: 'plotId', label: '适用地块', type: 'select',
    options: plots.value.map((p) => ({ label: p.name, value: p.id })),
  },
])

const plotName = (id) => plots.value.find((p) => p.id === id)?.name || '—'

async function fetchPage(params) {
  if (!plots.value.length) plots.value = await plotApi.all()
  return strategyApi.page(params)
}

function resetForm(defaults) {
  // 清空上一次编辑残留的 times / updatedAt 等服务端字段
  Object.keys(form).forEach((k) => delete form[k])
  Object.assign(form, defaults)
}
function openCreate() {
  isEdit.value = false
  resetForm({ id: null, name: '', plotId: plots.value[0]?.id, trigger: 'threshold', condition: '', action: '', enabled: true, scene: '' })
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  resetForm({ ...row })
  dialogVisible.value = true
}
async function handleSubmit() {
  submitting.value = true
  try {
    // 仅提交业务字段：id / 触发次数 / 更新时间由服务端维护
    const payload = {
      name: form.name.trim(),
      plotId: form.plotId,
      trigger: form.trigger,
      condition: form.trigger === 'scene' ? form.condition.trim() : buildCondition(form.trigger),
      action: form.action.trim(),
      enabled: !!form.enabled,
      scene: form.trigger === 'scene' ? form.scene : '',
    }
    if (isEdit.value) await strategyApi.update(form.id, payload)
    else await strategyApi.create(payload)
    ElMessage.success(isEdit.value ? '策略已更新' : '策略创建成功')
    dialogVisible.value = false
    tableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
async function toggleEnabled(row) {
  await strategyApi.update(row.id, { enabled: !row.enabled })
  ElMessage.success(row.enabled ? '策略已停用' : '策略已启用')
  tableRef.value?.reload(true)
}
async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除策略「${row.name}」吗？删除后不再执行自动联动。`, '删除确认', { type: 'error' })
  await strategyApi.remove(row.id)
  ElMessage.success('策略已删除')
  tableRef.value?.reload(true)
}

/* ---------- 定时任务 ---------- */
const tasks = ref([])
const taskDialog = ref(false)
const taskForm = reactive({ id: null, name: '', cronText: '', action: '', enabled: true })
const taskRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  cronText: [{ required: true, message: '请输入执行时间（如 每天 06:30）', trigger: 'blur' }],
  action: [{ required: true, message: '请填写执行动作', trigger: 'blur' }],
}
async function loadTasks() {
  tasks.value = (await taskApi.list()).list
}
function openCreateTask() {
  Object.keys(taskForm).forEach((k) => delete taskForm[k])
  Object.assign(taskForm, { id: null, name: '', cronText: '', action: '', enabled: true })
  taskDialog.value = true
}
function openEditTask(row) {
  Object.assign(taskForm, { id: row.id, name: row.name, cronText: row.cronText, action: row.action, enabled: row.enabled })
  taskDialog.value = true
}
async function submitTask() {
  // 不提交 id，避免新建时用 null 覆盖服务端自增 id
  const payload = { name: taskForm.name.trim(), cronText: taskForm.cronText.trim(), action: taskForm.action.trim(), enabled: !!taskForm.enabled }
  if (taskForm.id) await taskApi.update(taskForm.id, payload)
  else await taskApi.create(payload)
  ElMessage.success('定时任务已保存')
  taskDialog.value = false
  loadTasks()
}
async function deleteTask(t) {
  await ElMessageBox.confirm(`确定删除定时任务「${t.name}」吗？`, '删除确认', { type: 'error' })
  await taskApi.remove(t.id)
  loadTasks()
}

/* 场景模板一键应用：真实更新该场景下每条策略的启用态 */
async function applyScene(row) {
  try {
    await ElMessageBox.confirm(`确定切换到「${row.name}」场景吗？将批量应用该场景下的设备控制策略。`, '场景切换', { type: 'info', confirmButtonText: '一键切换' })
  } catch {
    return // 用户取消
  }
  const scene = row.scene || row.name
  try {
    const res = await strategyApi.page({ trigger: 'scene', page: 1, size: 1000 })
    const list = res.list || []
    const targets = list.filter((s) => s.scene === scene)
    if (!targets.length) {
      // 场景为本地配置：持久化当前场景并更新界面
      activeScene.value = scene
      localStorage.setItem('agri-active-scene', scene)
      tableRef.value?.reload(true)
      ElMessage.success(`已切换至「${row.name}」场景`)
      return
    }
    // 逐条启用场景内策略，并关闭其它场景模板，保证同时只有一个生效场景
    await Promise.all(targets.map((s) => strategyApi.update(s.id, { enabled: true })))
    const others = list.filter((s) => s.scene !== scene && s.enabled)
    await Promise.all(others.map((s) => strategyApi.update(s.id, { enabled: false })))
    activeScene.value = scene
    localStorage.setItem('agri-active-scene', scene)
    tableRef.value?.reload(true)
    ElMessage.success(`已切换至「${row.name}」场景，${targets.length} 条策略已启用`)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

onMounted(async () => {
  await Promise.all([fetchPage({ page: 1, size: 1 }), loadTasks()])
})
</script>

<template>
  <div class="page">
    <PageHeader title="策略联动配置" desc="阈值触发、多条件组合、定时任务与场景模板，实现无人值守自动化生产">
      <template #actions>
        <el-tag v-if="activeScene" type="success" effect="plain">当前场景：{{ activeScene }}</el-tag>
        <el-button type="primary" :icon="'Plus'" @click="openCreate">新建策略</el-button>
      </template>
    </PageHeader>

    <ProTable ref="tableRef" :columns="columns" :fetch="fetchPage" :filters="filters" action-width="260">
      <template #col-name="{ row }">
        <span class="st-name">
          <el-icon :size="14" :color="'#074ce0'"><component :is="TRIGGER_META[row.trigger]?.icon || 'Connection'" /></el-icon>
          {{ row.name }}
        </span>
      </template>
      <template #col-trigger="{ row }">
        <el-tag size="small" :type="TRIGGER_META[row.trigger]?.tag" effect="plain">{{ TRIGGER_META[row.trigger]?.label }}</el-tag>
        <el-tag v-if="row.scene" size="small" type="danger" effect="light" style="margin-left: 4px">{{ row.scene }}场景</el-tag>
      </template>
      <template #col-plotId="{ row }">{{ plotName(row.plotId) }}</template>
      <template #col-enabled="{ row }">
        <el-switch :model-value="row.enabled" @change="toggleEnabled(row)" aria-label="策略启用开关" />
      </template>
      <template #col-action="{ row }">
        <el-button v-if="row.trigger === 'scene'" link type="warning" :icon="'MagicStick'" @click="applyScene(row)">一键切换</el-button>
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </ProTable>

    <!-- 定时任务 -->
    <div class="ag-card mt-16 anim-up">
      <div class="ag-card__head">
        <div class="ag-card__title"><span class="dot"></span>定时任务（Cron 计划）</div>
        <el-button size="small" type="primary" :icon="'Plus'" @click="openCreateTask">
          新建定时任务
        </el-button>
      </div>
      <div class="ag-card__body">
        <el-table :data="tasks" stripe>
          <el-table-column prop="name" label="任务名称" min-width="160" />
          <el-table-column prop="cronText" label="执行时间" width="150" />
          <el-table-column prop="action" label="执行动作" min-width="200" />
          <el-table-column prop="nextRun" label="下次执行" width="120" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-switch :model-value="row.enabled" size="small" @change="(v) => taskApi.update(row.id, { enabled: v }).then(loadTasks)" aria-label="任务开关" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditTask(row)">编辑</el-button>
              <el-button link type="danger" @click="deleteTask(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 策略弹窗 -->
    <FormDialog v-model="dialogVisible" :title="isEdit ? '编辑策略' : '新建自动控制策略'" :rules="rules" :model="form" :submit-loading="submitting" width="640px" @submit="handleSubmit">
      <el-form-item label="策略名称" prop="name">
        <el-input v-model="form.name" placeholder="如：番茄棚智能灌溉" />
      </el-form-item>
      <el-form-item label="适用地块" prop="plotId">
        <el-select v-model="form.plotId" style="width: 100%">
          <el-option v-for="p in plots" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="触发类型" prop="trigger">
        <el-radio-group v-model="form.trigger">
          <el-radio-button v-for="(t, k) in TRIGGER_META" :key="k" :value="k">{{ t.label }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <!-- 阈值构造 -->
      <el-form-item v-if="form.trigger === 'threshold'" label="阈值条件" required>
        <div class="threshold-builder">
          <el-select v-model="threshold.param" style="width: 150px">
            <el-option v-for="p in PARAMS" :key="p.v" :label="p.l" :value="p.v" />
          </el-select>
          <el-select v-model="threshold.op" style="width: 72px">
            <el-option v-for="o in ['<', '>', '<=', '>=']" :key="o" :label="o" :value="o" />
          </el-select>
          <el-input-number v-model="threshold.value" :min="0" :max="200" style="width: 100px" />
          <span class="text-dim">持续</span>
          <el-input-number v-model="threshold.duration" :min="1" :max="120" style="width: 90px" />
          <span class="text-dim">分钟</span>
        </div>
      </el-form-item>

      <!-- 组合条件构造 -->
      <el-form-item v-if="form.trigger === 'combo'" label="组合条件" required>
        <div class="combo-builder">
          <div class="cb-row">
            <el-input v-model="combo.time" placeholder="时间段（可选，如 02:00-06:00）" style="width: 180px" />
          </div>
          <div class="cb-row">
            <el-select v-model="combo.p1" style="width: 140px">
              <el-option v-for="p in PARAMS" :key="p.v" :label="p.l" :value="p.v" />
            </el-select>
            <el-select v-model="combo.op1" style="width: 70px">
              <el-option v-for="o in ['<', '>']" :key="o" :label="o" :value="o" />
            </el-select>
            <el-input-number v-model="combo.v1" style="width: 96px" />
            <el-radio-group v-model="combo.logic" size="small">
              <el-radio-button value="且">且</el-radio-button>
              <el-radio-button value="或">或</el-radio-button>
            </el-radio-group>
            <el-select v-model="combo.p2" style="width: 140px">
              <el-option v-for="p in PARAMS" :key="p.v" :label="p.l" :value="p.v" />
            </el-select>
            <el-select v-model="combo.op2" style="width: 70px">
              <el-option v-for="o in ['<', '>']" :key="o" :label="o" :value="o" />
            </el-select>
            <el-input-number v-model="combo.v2" style="width: 96px" />
          </div>
        </div>
      </el-form-item>

      <el-form-item v-if="form.trigger === 'schedule' || form.trigger === 'scene'" label="条件描述" prop="condition">
        <el-input v-model="form.condition" :placeholder="form.trigger === 'schedule' ? '如：每日 06:00-08:00 / 17:30-19:30' : '如：温度 22-26℃ / 湿度 65-75%'" />
      </el-form-item>
      <el-form-item v-if="form.trigger === 'scene'" label="场景名称">
        <el-select v-model="form.scene" style="width: 200px">
          <el-option v-for="s in ['育苗', '开花', '越冬', '采收前']" :key="s" :label="s + '场景'" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="执行动作" prop="action">
        <el-input v-model="form.action" type="textarea" :rows="2" placeholder="如：开启滴灌电磁阀 20 分钟" />
      </el-form-item>
    </FormDialog>

    <!-- 定时任务弹窗 -->
    <FormDialog v-model="taskDialog" :title="taskForm.id ? '编辑定时任务' : '新建定时任务'" :rules="taskRules" :model="taskForm" width="520px" @submit="submitTask">
      <el-form-item label="任务名称" prop="name">
        <el-input v-model="taskForm.name" />
      </el-form-item>
      <el-form-item label="执行时间" prop="cronText">
        <el-input v-model="taskForm.cronText" placeholder="如：每天 06:30（对应 Cron: 0 30 6 * * ?）" />
      </el-form-item>
      <el-form-item label="执行动作" prop="action">
        <el-input v-model="taskForm.action" type="textarea" :rows="2" placeholder="如：开启滴灌 25 分钟" />
      </el-form-item>
    </FormDialog>
  </div>
</template>

<style scoped>
.st-name {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}
.threshold-builder,
.cb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.combo-builder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
