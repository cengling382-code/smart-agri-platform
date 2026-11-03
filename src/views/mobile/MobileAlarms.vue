<script setup>
/** 页面 63 · 移动端告警消息列表：告警消息列表、告警详情、处理确认 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { alarmApi } from '@/api'

const alarms = ref([])
const activeTab = ref('all')
const detail = ref(null)
const loading = ref(true)

const LEVEL = { 1: { text: '一般', color: '#6E7883' }, 2: { text: '重要', color: '#E89552' }, 3: { text: '紧急', color: '#E84A5F' } }

const filtered = computed(() => {
  if (activeTab.value === 'all') return alarms.value
  return alarms.value.filter((a) => a.status === activeTab.value)
})

onMounted(async () => {
  try {
    const res = await alarmApi.page({ page: 1, size: 30 })
    alarms.value = res.list
  } catch (e) {
    console.warn('[MobileAlarms]', e?.message || e)
  } finally {
    loading.value = false
  }
})

async function confirmAlarm(a) {
  await ElMessageBox.confirm('确认处理该告警吗？确认后进入处置流程。', '处理确认', { type: 'warning' })
  await alarmApi.update(a.id, { status: 'confirmed', handler: '当前用户' })
  a.status = 'confirmed'
  ElMessage.success('告警已确认')
  detail.value = null
}
</script>

<template>
  <div class="m-alarms" v-loading="loading">
    <div class="ma-head">
      <h2>告警消息</h2>
      <div class="tabs">
        <button :class="{ on: activeTab === 'all' }" @click="activeTab = 'all'">全部</button>
        <button :class="{ on: activeTab === 'pending' }" @click="activeTab = 'pending'">未处理</button>
        <button :class="{ on: activeTab === 'resolved' }" @click="activeTab = 'resolved'">已处置</button>
        <button :class="{ on: activeTab === 'archived' }" @click="activeTab = 'archived'">已归档</button>
      </div>
    </div>

    <div class="alarm-list">
      <button v-for="a in filtered" :key="a.id" class="alarm-card" :class="{ urgent: a.level === 3 && a.status === 'pending' }" @click="detail = a">
        <span class="al-level" :style="{ background: LEVEL[a.level].color }">{{ LEVEL[a.level].text }}</span>
        <div class="al-main">
          <b>{{ a.type }}</b>
          <span class="al-content">{{ a.content }}</span>
          <span class="al-time mono-num">{{ a.time }}</span>
        </div>
        <el-icon color="#D5D8D6"><ArrowRight /></el-icon>
      </button>
      <div v-if="!filtered.length" class="m-empty">该分类下暂无告警</div>
    </div>

    <!-- 告警详情 -->
    <transition name="sheet">
      <div v-if="detail" class="sheet-mask" @click.self="detail = null">
        <div class="sheet">
          <div class="sheet-head">
            <span class="al-level" :style="{ background: LEVEL[detail.level].color }">{{ LEVEL[detail.level].text }}</span>
            <b>{{ detail.type }}</b>
            <button class="close" aria-label="关闭" @click="detail = null"><el-icon><Close /></el-icon></button>
          </div>
          <p class="sheet-content">{{ detail.content }}</p>
          <div class="sheet-rows">
            <div><span>告警编号</span><b class="mono-num">{{ detail.code }}</b></div>
            <div><span>告警时间</span><b class="mono-num">{{ detail.time }}</b></div>
            <div><span>告警来源</span><b>{{ detail.source }}</b></div>
            <div><span>处理人</span><b>{{ detail.handler || '待处理' }}</b></div>
            <div v-if="detail.handleNote"><span>处置记录</span><b>{{ detail.handleNote }}</b></div>
          </div>
          <button v-if="detail.status === 'pending'" class="m-btn primary" @click="confirmAlarm(detail)">确认处理</button>
          <div v-else class="done-tip">
            <el-icon color="#699C78"><CircleCheck /></el-icon>
            该告警已进入闭环流程（{{ detail.status === 'pending' ? '未处理' : detail.status === 'confirmed' ? '已确认' : detail.status === 'resolved' ? '已处置' : '已归档' }}）
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.m-alarms {
  padding: 16px;
  min-height: 100%;
}
.ma-head h2 {
  margin: 0 0 12px;
  font-size: 18px;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.tabs button {
  border: 1px solid var(--ag-border);
  background: #fff;
  color: var(--ag-text-2);
  font-size: 12px;
  padding: 6px 14px;
  border-radius: var(--ag-radius-sm); /* 决策依据：页签按钮属小控件，对齐控件档 6px */
  cursor: pointer;
}
.tabs button.on {
  background: var(--ag-green-600);
  border-color: var(--ag-green-600);
  color: #fff;
  font-weight: 600;
}
.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.alarm-card {
  display: flex;
  align-items: center;
  gap: 11px;
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：告警列表卡片属卡片类，对齐卡片档 10px */
  padding: 13px 14px;
  border: none;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--ag-shadow-sm);
  transition: transform 0.2s;
}
.alarm-card:active {
  transform: scale(0.98);
}
.alarm-card.urgent {
  border: 1px solid #F6C8CC;
}
.al-level {
  font-size: 10px;
  color: #fff;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--ag-radius-sm); /* 决策依据：等级标签属小控件，对齐控件档 6px */
  flex: none;
}
.al-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.al-main b {
  font-size: 14px;
}
.al-content {
  font-size: 11.5px;
  color: var(--ag-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.al-time {
  font-size: 10px;
  color: var(--ag-text-4);
}
.m-empty {
  text-align: center;
  color: var(--ag-text-4);
  padding: 30px 0;
  font-size: 13px;
}
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 30;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: var(--ag-radius-lg) var(--ag-radius-lg) 0 0; /* 决策依据：底部抽屉仅顶部两角，归浮层档 14px */
  padding: 20px 20px 30px;
  animation: sheetUp 0.3s var(--ag-ease-spring);
}
@keyframes sheetUp {
  from { transform: translateY(60%); opacity: 0.5; }
  to { transform: translateY(0); opacity: 1; }
}
.sheet-head {
  display: flex;
  align-items: center;
  gap: 9px;
}
.sheet-head b {
  flex: 1;
  font-size: 16px;
}
.close {
  border: none;
  background: var(--ag-bg-hover);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--ag-text-3);
}
.sheet-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ag-text-2);
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius); /* 决策依据：抽屉内内容块属卡片类，对齐卡片档 10px */
  padding: 12px 14px;
}
.sheet-rows {
  margin: 14px 0;
}
.sheet-rows > div {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed var(--ag-border-light);
  font-size: 13px;
}
.sheet-rows span {
  color: var(--ag-text-3);
}
.m-btn.primary {
  width: 100%;
  border: none;
  /* 决策依据：主按钮渐变属纯装饰、不承载信息，按简约高级规范改为单色实底 */
  background: var(--ag-green-700);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  border-radius: var(--ag-radius-sm); /* 决策依据：全宽主按钮属控件，对齐控件档 6px */
  padding: 12px;
  cursor: pointer;
}
.done-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--ag-green-700);
  font-size: 13px;
  padding: 8px;
}
.sheet-enter-active {
  transition: opacity 0.25s;
}
.sheet-enter-from {
  opacity: 0;
}
</style>
