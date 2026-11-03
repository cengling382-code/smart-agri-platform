<script setup>
/** 页面 62 · 移动端设备远程控制：一键启停水泵、风机、补光灯等设备 */
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deviceApi } from '@/api'

const devices = ref([])
const loading = ref(true)

const ICONS = { 水泵: 'Pouring', 电磁阀: 'Odometer', 风机: 'WindPower', 卷帘机: 'Sort', 补光灯: 'Sunny', 加温设备: 'Sunny', 增氧机: 'Sugar', 遮阳帘: 'Umbrella' }

onMounted(async () => {
  try {
    const all = await deviceApi.all()
    devices.value = all.filter((d) => d.type === 'actuator')
  } catch (e) {
    console.warn('[MobileControl]', e?.message || e)
  } finally {
    loading.value = false
  }
})

async function toggle(d) {
  const action = d.running ? '关闭' : '开启'
  try {
    await ElMessageBox.confirm(`确定要${action}「${d.name}」吗？`, `${action}设备`, { type: 'warning', confirmButtonText: `确认${action}` })
  } catch {
    return
  }
  const online = d.status === 'online'
  const res = await deviceApi.control(d.id, { action: d.running ? 'off' : 'on', operator: '移动端用户' })
  d.running = res.running
  if (online) ElMessage.success(`「${d.name}」已${action}`)
  else ElMessage.warning('设备离线，指令下发失败')
}
</script>

<template>
  <div class="m-control" v-loading="loading">
    <div class="mc-head">
      <h2>设备远程控制</h2>
      <span class="text-dim">操作即点即达 · 全程留痕</span>
    </div>

    <div class="dev-list">
      <div v-for="d in devices" :key="d.id" class="dev-card" :class="{ run: d.running, off: d.status !== 'online' }">
        <span class="d-ico" :class="{ run: d.running }">
          <el-icon :size="22"><component :is="ICONS[d.subtype] || 'SwitchButton'" /></el-icon>
        </span>
        <div class="d-info">
          <b>{{ d.name }}</b>
          <span class="text-dim mono-num">{{ d.code }}</span>
        </div>
        <div class="d-state">
          <span class="d-st" :class="{ on: d.running }">{{ d.running ? '运行中' : '已停止' }}</span>
          <button class="switch" :class="{ on: d.running }" :disabled="d.status === 'offline'" role="switch" :aria-checked="d.running" :aria-label="`${d.running ? '关闭' : '开启'}设备 ${d.name}`" @click="toggle(d)">
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
.m-control {
  padding: 16px;
  min-height: 100%;
}
.mc-head {
  margin-bottom: 14px;
}
.mc-head h2 {
  margin: 0 0 3px;
  font-size: 18px;
}
.dev-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dev-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：设备列表卡片属卡片类，对齐卡片档 10px */
  padding: 14px;
  box-shadow: var(--ag-shadow-sm);
  border: 1px solid transparent;
  transition: all 0.25s;
}
.dev-card.run {
  border-color: var(--ag-green-300);
}
.dev-card.off {
  opacity: 0.55;
}
.d-ico {
  width: 44px;
  height: 44px;
  border-radius: var(--ag-radius); /* 决策依据：44px 设备图标块非控件，对齐卡片档 10px */
  background: var(--ag-bg-hover);
  color: var(--ag-text-4);
  display: grid;
  place-items: center;
  flex: none;
  transition: all 0.3s var(--ag-ease-spring);
}
.d-ico.run {
  /* 决策依据：图标块装饰性渐变底属"发光方块"，按简约高级规范改为同色系低透明度实色 + 语义色图标（同 StatCard 已清理样式） */
  background: rgba(105, 156, 120, 0.14);
  color: var(--ag-green-700);
  /* 决策依据：agCountGlow 已改为一次性淡入，保留 infinite 会令图标不停闪烁，故移除该动画 */
}
.d-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.d-info b {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.d-state {
  display: flex;
  align-items: center;
  gap: 10px;
}
.d-st {
  font-size: 11px;
  color: var(--ag-text-4);
}
.d-st.on {
  color: var(--ag-green-600);
  font-weight: 700;
}
.switch {
  width: 46px;
  height: 26px;
  border-radius: var(--ag-radius-lg); /* 决策依据：开关需胶囊形大圆角，token 化为浮层档 14px（值不变） */
  border: none;
  background: #D5D8D6;
  position: relative;
  cursor: pointer;
  transition: background 0.25s;
}
.switch.on {
  background: var(--ag-green-500);
}
.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.25s var(--ag-ease-spring);
}
.switch.on i {
  transform: translateX(20px);
}
.m-empty {
  text-align: center;
  color: var(--ag-text-4);
  padding: 30px 0;
}
.safe-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  background: var(--ag-blue-50);
  color: var(--ag-blue-700);
  border-radius: var(--ag-radius); /* 决策依据：安全提示条属卡片类容器，对齐卡片档 10px */
  padding: 11px 14px;
  font-size: 12px;
}
</style>
