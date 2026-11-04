<script setup>
/** 页面 16 · 设备控制：手动启停、分组批量控制、操作日志（含安全确认与追溯） */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { PageHeader, ProTable, StatusTag } from '@/components/ui'
import { deviceApi, controlApi, plotApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const actuators = ref([])
const plots = ref([])
const loading = ref(true)
const batchTarget = ref(null)
const batchDialog = ref(false)
const logTableRef = ref(null)

const ACT_ICON = {
  水泵: 'Pouring', 电磁阀: 'Odometer', 风机: 'WindPower', 卷帘机: 'Sort', 补光灯: 'Sunny',
  加温设备: 'Sunny', 增氧机: 'Sugar', 遮阳帘: 'Umbrella',
}

const groupStats = computed(() => {
  const map = {}
  actuators.value.forEach((a) => {
    const key = plots.value.find((p) => p.id === a.plotId)?.type || '其他'
    map[key] = map[key] || { total: 0, running: 0 }
    map[key].total++
    if (a.running) map[key].running++
  })
  return Object.entries(map).map(([type, s]) => ({ type, ...s }))
})

const logColumns = [
  { prop: 'time', label: '操作时间', width: 165 },
  { prop: 'operator', label: '操作人', width: 110 },
  { prop: 'source', label: '来源', width: 90, align: 'center' },
  { prop: 'device', label: '设备', minWidth: 170 },
  { prop: 'action', label: '动作', width: 120 },
  { prop: 'result', label: '结果', width: 110, align: 'center' },
]

async function load() {
  loading.value = true
  try {
    const [all, ps] = await Promise.all([deviceApi.all(), plotApi.all()])
    plots.value = ps
    actuators.value = all.filter((d) => d.type === 'actuator')
  } finally {
    loading.value = false
  }
}

/** 手动控制（敏感操作二次确认） */
async function toggleDevice(dev) {
  const action = dev.running ? '关闭' : '开启'
  const online = dev.status === 'online'
  const { value } = await ElMessageBox.confirm(
    `确定要${action}「${dev.name}」吗？${online ? '' : '该设备当前离线，指令可能无法送达。'}`,
    `${action}设备 · 安全确认`,
    { type: 'warning', confirmButtonText: `确认${action}`, cancelButtonText: '取消' }
  ).catch(() => ({ value: false }))
  if (!value) return
  try {
    const res = await deviceApi.control(dev.id, { action: dev.running ? 'off' : 'on', operator: auth.displayName, source: 'manual' })
    dev.running = res.running
    ElMessage[online ? 'success' : 'warning'](res.msg || `已${action}`)
    logTableRef.value?.reload(true)
  } catch (e) {
    ElMessage.error(e.message)
  }
}

/** 分组批量控制 */
function openBatch(groupType) {
  batchTarget.value = groupType
  batchDialog.value = true
}
async function confirmBatch(on) {
  const targets = actuators.value.filter((a) => (plots.value.find((p) => p.id === a.plotId)?.type || '其他') === batchTarget.value)
  const action = on ? 'on' : 'off'
  for (const t of targets) {
    await deviceApi.control(t.id, { action, operator: auth.displayName, source: 'manual' })
    t.running = on
  }
  ElMessage.success(`已${on ? '开启' : '关闭'} ${batchTarget.value} 分组下 ${targets.length} 台设备`)
  batchDialog.value = false
  logTableRef.value?.reload(true)
}

const logFilters = [
  { key: 'keyword', label: '关键字', placeholder: '操作人 / 设备' },
  { key: 'source', label: '来源', type: 'select', options: [{ label: '手动', value: 'manual' }, { label: '自动策略', value: 'auto' }] },
  { key: 'result', label: '结果', type: 'select', options: [{ label: '成功', value: '成功' }, { label: '失败', value: '失败' }] },
]

onMounted(load)
</script>

<template>
  <div class="page">
    <PageHeader title="设备控制" desc="手动启停水泵、风机、补光灯等执行设备，支持分组批量控制，操作全程留痕可追溯">
      <template #actions>
        <el-button :icon="'Refresh'" circle @click="load" aria-label="刷新设备状态" />
      </template>
    </PageHeader>

    <!-- 分组统计 + 批量控制 -->
    <div class="group-row stagger" v-loading="loading">
      <div v-for="g in groupStats" :key="g.type" class="g-card ag-card">
        <div class="g-meta">
          <b>{{ g.type }}</b>
          <span class="text-dim">{{ g.running }}/{{ g.total }} 运行中</span>
        </div>
        <el-progress :percentage="Math.round((g.running / g.total) * 100)" :stroke-width="8" :show-text="false" color="#074ce0" style="width: 110px" />
        <div class="g-ops">
          <el-button size="small" type="primary" plain @click="openBatch(g.type)">批量控制</el-button>
        </div>
      </div>
    </div>

    <!-- 设备卡片 -->
    <div class="dev-grid stagger" v-loading="loading">
      <div v-for="d in actuators" :key="d.id" class="d-card ag-card ag-card--hover" :class="{ running: d.running, offline: d.status !== 'online' }">
        <div class="d-head">
          <span class="d-icon" :class="{ run: d.running }">
            <el-icon :size="22"><component :is="ACT_ICON[d.subtype] || 'SwitchButton'" /></el-icon>
          </span>
          <StatusTag :value="d.status" />
        </div>
        <div class="d-name" :title="d.name">{{ d.name }}</div>
        <div class="d-code text-dim">{{ d.code }} · {{ d.model }}</div>
        <div class="d-foot">
          <span class="d-state" :class="{ on: d.running }">
            <span class="pulse-dot" :class="d.running ? 'is-on' : 'is-off'"></span>
            {{ d.running ? '运行中' : '已停止' }}
          </span>
          <el-button
            size="small"
            :type="d.running ? 'warning' : 'primary'"
            :disabled="d.status === 'offline'"
            @click="toggleDevice(d)"
          >
            {{ d.running ? '停止' : '启动' }}
          </el-button>
        </div>
      </div>
      <el-empty v-if="!loading && !actuators.length" description="暂无执行器设备" style="grid-column: 1/-1" />
    </div>

    <!-- 操作日志 -->
    <div class="mt-16">
      <ProTable ref="logTableRef" :columns="logColumns" :fetch="controlApi.logs" :filters="logFilters" :page-size="10">
        <template #col-source="{ row }">
          <el-tag size="small" :type="row.source === 'manual' ? 'primary' : 'success'" effect="plain">
            {{ row.source === 'manual' ? '手动' : '自动策略' }}
          </el-tag>
        </template>
        <template #col-result="{ row }">
          <StatusTag :value="row.result" />
        </template>
      </ProTable>
    </div>

    <!-- 批量确认弹窗 -->
    <el-dialog v-model="batchDialog" :title="`批量控制 · ${batchTarget}`" width="420px">
      <el-alert type="warning" :closable="false" show-icon title="批量操作将同时下发指令到分组内全部设备，请确认现场安全。" class="mb-16" />
      <div class="batch-btns">
        <el-button type="success" size="large" @click="confirmBatch(true)">全部开启</el-button>
        <el-button type="danger" size="large" @click="confirmBatch(false)">全部关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.group-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}
.g-card {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 18px;
}
.g-meta {
  display: flex;
  flex-direction: column;
  min-width: 90px;
}
.g-ops {
  margin-left: auto;
}
.dev-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 18px;
  min-height: 160px;
}
.d-card {
  padding: 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s var(--ag-ease);
}
.d-card.running {
  border-color: var(--ag-green-300);
  box-shadow: var(--ag-shadow-sm); /* 决策依据：绿色投影属刻意堆砌的光影，改为中性 --ag-shadow-sm */
}
.d-card.offline {
  opacity: 0.62;
}
.d-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.d-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--ag-radius); /* 决策依据：44px 设备图标块非控件，对齐卡片档 10px */
  background: var(--ag-bg-hover);
  color: var(--ag-text-4);
  display: grid;
  place-items: center;
  transition: all 0.35s var(--ag-ease-spring);
}
.d-icon.run {
  /* 决策依据：图标块装饰性渐变底属"发光方块"，按简约高级规范改为同色系低透明度实色 + 语义色图标（同 StatCard 已清理样式） */
  background: rgba(85, 129, 98, 0.12);
  color: var(--ag-green-700);
  /* 决策依据：agCountGlow 已改为一次性淡入，保留 infinite 会令图标不停闪烁，故移除该动画 */
}
.d-name {
  font-weight: 600;
  margin-top: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.d-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}
.d-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ag-text-4);
}
.d-state.on {
  color: var(--ag-success);
}
.batch-btns {
  display: flex;
  gap: 14px;
  justify-content: center;
}
.batch-btns .el-button {
  flex: 1;
}
</style>
