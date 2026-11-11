<script setup>
/** 页面 63 · 移动端告警消息列表：告警消息列表、告警详情、处理确认 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { alarmApi } from '@/api'
import { getConfig } from '@/data/configStore'
import { onDataChange } from '@/composables/useDataVersion'

const cfg = getConfig('mobile')

const alarms = ref([])
const activeTab = ref('all')
const detail = ref(null)
const loading = ref(true)

const LEVEL = cfg.alarmLevelStyle

const filtered = computed(() => {
  if (activeTab.value === 'all') return alarms.value
  return alarms.value.filter((a) => a.status === activeTab.value)
})

const LEVEL_FALLBACK = { color: '#8FB3CC', text: '未知' }
function levelStyle(level) {
  return LEVEL[level] || LEVEL_FALLBACK
}

async function load() {
  try {
    const res = await alarmApi.page({ page: 1, size: 30 })
    alarms.value = Array.isArray(res?.list) ? res.list : []
    // 详情抽屉打开时重新绑定新数据，避免显示旧状态；不关闭抽屉
    if (detail.value) {
      const id = detail.value.id
      detail.value = alarms.value.find((a) => a.id === id) || null
    }
  } catch (e) {
    console.warn('[MobileAlarms]', e?.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
onDataChange(load, { debounce: 400 })

async function confirmAlarm(a) {
  // 取消确认框属正常操作，不再让 reject 冒泡到 ErrorBoundary
  const ok = await ElMessageBox.confirm('确认处理该告警吗？确认后进入处置流程。', '处理确认', { type: 'warning' }).catch(() => false)
  if (!ok) return
  try {
    await alarmApi.update(a.id, { status: 'confirmed', handler: '当前用户' })
    a.status = 'confirmed'
    ElMessage.success('告警已确认')
    detail.value = null
  } catch (e) {
    ElMessage.error(e?.message || '告警确认失败')
  }
}
</script>

<template>
  <div class="m-page m-alarms" v-loading="loading">
    <div class="m-page-head">
      <div>
        <h1 class="m-page-title">告警消息</h1>
        <p class="m-page-desc">环境与设备告警 · 处置闭环跟踪</p>
      </div>
    </div>

    <div class="m-seg ma-tabs">
      <button :class="{ on: activeTab === 'all' }" @click="activeTab = 'all'">全部</button>
      <button :class="{ on: activeTab === 'pending' }" @click="activeTab = 'pending'">未处理</button>
      <button :class="{ on: activeTab === 'resolved' }" @click="activeTab = 'resolved'">已处置</button>
      <button :class="{ on: activeTab === 'archived' }" @click="activeTab = 'archived'">已归档</button>
    </div>

    <div class="alarm-list">
      <button
        v-for="a in filtered"
        :key="a.id"
        class="m-card alarm-card"
        :class="{ urgent: a.level === 3 && a.status === 'pending' }"
        @click="detail = a"
      >
        <span class="al-level" :style="{ background: levelStyle(a.level).color }">{{ levelStyle(a.level).text }}</span>
        <div class="al-main">
          <b>{{ a.type }}</b>
          <span class="al-content">{{ a.content }}</span>
          <span class="al-time mono-num">{{ a.time }}</span>
        </div>
        <el-icon :size="14" class="al-arrow"><ArrowRight /></el-icon>
      </button>
      <div v-if="!filtered.length" class="m-empty">该分类下暂无告警</div>
    </div>

    <!-- 告警详情 -->
    <transition name="sheet">
      <div v-if="detail" class="m-sheet-mask" @click.self="detail = null">
        <div class="m-sheet">
          <div class="m-sheet-head">
            <span class="al-level" :style="{ background: LEVEL[detail.level].color }">{{ LEVEL[detail.level].text }}</span>
            <h2 class="m-sheet-title">{{ detail.type }}</h2>
            <button class="m-icon-btn" aria-label="关闭" @click="detail = null"><el-icon><Close /></el-icon></button>
          </div>
          <p class="sheet-content">{{ detail.content }}</p>
          <div class="sheet-rows">
            <div class="m-row"><span class="m-row-label">告警编号</span><b class="m-row-value mono-num">{{ detail.code }}</b></div>
            <div class="m-row"><span class="m-row-label">告警时间</span><b class="m-row-value mono-num">{{ detail.time }}</b></div>
            <div class="m-row"><span class="m-row-label">告警来源</span><b class="m-row-value">{{ detail.source }}</b></div>
            <div class="m-row"><span class="m-row-label">处理人</span><b class="m-row-value">{{ detail.handler || '待处理' }}</b></div>
            <div v-if="detail.handleNote" class="m-row"><span class="m-row-label">处置记录</span><b class="m-row-value">{{ detail.handleNote }}</b></div>
          </div>
          <button v-if="detail.status === 'pending'" class="m-btn m-btn-primary m-btn-block" @click="confirmAlarm(detail)">确认处理</button>
          <div v-else class="done-tip">
            <el-icon><CircleCheck /></el-icon>
            该告警已进入闭环流程（{{ detail.status === 'pending' ? '未处理' : detail.status === 'confirmed' ? '已确认' : detail.status === 'resolved' ? '已处置' : '已归档' }}）
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ma-tabs {
  margin-bottom: var(--ag-space-3);
}
.alarm-list {
  display: flex;
  flex-direction: column;
  gap: var(--ag-space-3);
}
.alarm-card {
  display: flex;
  align-items: center;
  gap: var(--ag-space-3);
  width: 100%;
  padding: var(--ag-space-3) var(--ag-space-4);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--ag-dur) var(--ag-ease), transform var(--ag-dur-fast) var(--ag-ease);
}
/* 按压反馈发生在 pointer-down（ios-design） */
.alarm-card:active {
  transform: scale(0.99);
}
/* 紧急告警：仅用 danger 低透明度描边，替代旧粉色硬编码 */
.alarm-card.urgent {
  border-color: rgba(232, 74, 95, 0.42);
}
.al-level {
  flex: none;
  padding: 2px var(--ag-space-2);
  border-radius: var(--ag-radius-sm);
  font-size: var(--ag-fs-micro);
  font-weight: 600;
  line-height: 1.4;
  color: #fff;
}
.al-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.al-main b {
  font-size: var(--ag-fs-caption);
  font-weight: 600;
  color: var(--ag-text-1);
}
.al-content {
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.al-time {
  font-size: 11px;
  color: var(--ag-text-4);
}
.al-arrow {
  flex: none;
  color: var(--ag-text-4);
}

/* 抽屉内容块：与 PC 卡片内信息块同形制 */
.sheet-content {
  margin: 0 0 var(--ag-space-3);
  padding: var(--ag-space-3) var(--ag-space-4);
  border-radius: var(--ag-radius);
  background: var(--ag-bg-hover);
  font-size: var(--ag-fs-caption);
  line-height: 1.8;
  color: var(--ag-text-2);
}
.sheet-rows {
  margin-bottom: var(--ag-space-4);
}
.done-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--ag-space-2);
  font-size: var(--ag-fs-caption);
  color: var(--ag-success);
}

/* 抽屉过渡：与 PC 浮层一致的短透明度 + 位移淡入 */
.sheet-enter-active {
  transition: opacity var(--ag-dur-slow) var(--ag-ease);
}
.sheet-enter-from {
  opacity: 0;
}
</style>
