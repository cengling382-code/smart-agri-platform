<script setup>
/** 页面 62 · 移动端设备远程控制：一键启停水泵、风机、补光灯等设备 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deviceApi } from '@/api'
import { getConfig } from '@/data/configStore'
import { onDataChange } from '@/composables/useDataVersion'

const cfg = getConfig('mobile')

const devices = ref([])
const loading = ref(true)

const ICONS = cfg.controlIcons

async function load() {
  try {
    const all = await deviceApi.all()
    devices.value = all.filter((d) => d.type === 'actuator')
  } catch (e) {
    console.warn('[MobileControl]', e?.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
onDataChange(load, { debounce: 400 })

async function toggle(d) {
  if (d.status !== 'online') {
    ElMessage.warning('设备离线，无法下发控制指令')
    return
  }
  const action = d.running ? '关闭' : '开启'
  try {
    await ElMessageBox.confirm(`确定要${action}「${d.name}」吗？`, `${action}设备`, { type: 'warning', confirmButtonText: `确认${action}` })
  } catch {
    return
  }
  try {
    const res = await deviceApi.control(d.id, { action: d.running ? 'off' : 'on', operator: '移动端用户' })
    d.running = res.running ?? !d.running
    ElMessage.success(`「${d.name}」已${action}`)
  } catch (e) {
    ElMessage.error(`「${d.name}」控制失败：${e.message}`)
  }
}
</script>

<template>
  <div class="m-page m-control" v-loading="loading">
    <div class="m-page-head">
      <div>
        <h1 class="m-page-title">设备远程控制</h1>
        <p class="m-page-desc">操作即点即达 · 全程留痕</p>
      </div>
    </div>

    <div class="dev-list">
      <div v-for="d in devices" :key="d.id" class="m-card dev-card" :class="{ run: d.running, off: d.status !== 'online' }">
        <span class="d-ico" :class="{ run: d.running }">
          <el-icon :size="20"><component :is="ICONS[d.subtype] || 'SwitchButton'" /></el-icon>
        </span>
        <div class="d-info">
          <b>{{ d.name }}</b>
          <span class="text-dim mono-num">{{ d.code }}</span>
        </div>
        <div class="d-state">
          <span class="d-st" :class="{ on: d.running }">{{ d.running ? '运行中' : '已停止' }}</span>
          <button
            class="switch"
            :class="{ on: d.running }"
            :disabled="d.status === 'offline'"
            role="switch"
            :aria-checked="d.running"
            :aria-label="`${d.running ? '关闭' : '开启'}设备 ${d.name}`"
            @click="toggle(d)"
          >
            <i></i>
          </button>
        </div>
      </div>
      <div v-if="!loading && !devices.length" class="m-empty">暂无可控设备</div>
    </div>

    <div class="safe-tip">
      <el-icon><Lock /></el-icon>
      <span>安全锁已开启：手动操作需二次确认，防止自动策略误操作</span>
    </div>
  </div>
</template>

<style scoped>
.dev-list {
  display: flex;
  flex-direction: column;
  gap: var(--ag-space-3);
}
.dev-card {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  padding: var(--ag-space-4);
  transition: border-color var(--ag-dur) var(--ag-ease), opacity var(--ag-dur) var(--ag-ease);
}
/* 运行态仅以 PC 淡蓝描边提示，不做彩色顶条/发光块 */
.dev-card.run {
  border-color: var(--ag-green-300);
}
.dev-card.off {
  opacity: 0.55;
}
/* 图标块：对齐 PC StatCard .icon-box（同色系低透明度底 + 同色图标） */
.d-ico {
  width: 44px;
  height: 44px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--ag-radius);
  background: var(--ag-bg-hover);
  color: var(--ag-text-4);
  transition: background var(--ag-dur) var(--ag-ease), color var(--ag-dur) var(--ag-ease);
}
.d-ico.run {
  background: rgba(7, 76, 224, 0.1);
  color: var(--ag-green-700);
}
.d-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.d-info b {
  font-size: var(--ag-fs-caption);
  font-weight: 600;
  color: var(--ag-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.d-state {
  display: flex;
  align-items: center;
  gap: var(--ag-space-2);
  flex: none;
}
.d-st {
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-4);
}
.d-st.on {
  color: var(--ag-green-600);
  font-weight: 600;
}
/* 开关：胶囊形 + accent 选中色，关闭态取发丝边框色而非旧灰绿 */
.switch {
  width: 46px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--ag-radius-pill);
  background: var(--ag-border);
  position: relative;
  cursor: pointer;
  transition: background var(--ag-dur) var(--ag-ease);
  touch-action: manipulation;
  flex: none;
}
/* 触控热区扩展到 44×44，满足移动端最小点击尺寸 */
.switch::before {
  content: '';
  position: absolute;
  inset: -9px;
  border-radius: var(--ag-radius-pill);
}
.switch.on {
  background: var(--ag-green-600);
}
.switch:disabled {
  cursor: not-allowed;
}
.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--ag-shadow-sm);
  transition: transform var(--ag-dur) var(--ag-ease);
}
.switch.on i {
  transform: translateX(20px);
}
.safe-tip {
  display: flex;
  align-items: flex-start;
  gap: var(--ag-space-2);
  margin-top: var(--ag-space-3);
  padding: var(--ag-space-3) var(--ag-space-4);
  border: 1px solid var(--ag-border-light);
  border-radius: var(--ag-radius);
  background: var(--ag-blue-50);
  color: var(--ag-blue-700);
  font-size: var(--ag-fs-micro);
  line-height: 1.6;
}
</style>
