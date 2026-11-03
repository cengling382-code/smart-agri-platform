<script setup>
/** 页面 64 · 移动端农事工单执行页：查看工单、现场打卡、上传照片、工时记录 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { farmApi } from '@/api'

const orders = ref([])
const activeTab = ref('todo')
const checkinOrder = ref(null)
const photos = ref(0)
const hours = ref(4)
const remark = ref('')
const submitting = ref(false)

const filtered = computed(() => {
  if (activeTab.value === 'todo') return orders.value.filter((o) => ['待接单', '进行中'].includes(o.status))
  return orders.value.filter((o) => o.status === '已完成')
})

onMounted(async () => {
  try {
    const res = await farmApi.orderPage({ page: 1, size: 30 })
    orders.value = res.list
  } catch (e) {
    console.warn('[MobileOrders]', e?.message || e)
  }
})

async function accept(o) {
  await farmApi.updateOrder(o.id, { status: '进行中' })
  o.status = '进行中'
  ElMessage.success('已接单，开始作业吧！')
}

async function checkin(o) {
  submitting.value = true
  try {
    await farmApi.updateOrder(o.id, { status: '待验收', checkin: { time: new Date().toLocaleString('zh-CN', { hour12: false }), location: `${o.plotName}入口`, photos: photos.value, hours: hours.value, remark: remark.value || '作业现场已完成' } })
    o.status = '待验收'
    ElMessage.success('打卡成功！现场照片与工时已记录，等待验收')
    checkinOrder.value = null
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="m-orders">
    <div class="mo-head">
      <h2>工单执行</h2>
      <div class="tabs">
        <button :class="{ on: activeTab === 'todo' }" @click="activeTab = 'todo'">进行中</button>
        <button :class="{ on: activeTab === 'done' }" @click="activeTab = 'done'">已完成</button>
      </div>
    </div>

    <div class="order-list">
      <div v-for="o in filtered" :key="o.id" class="order-card">
        <div class="oc-top">
          <span class="o-type">{{ o.type }}</span>
          <span class="o-status" :class="{ doing: o.status === '进行中' }">{{ o.status }}</span>
        </div>
        <b class="oc-plot">{{ o.plotName }}</b>
        <div class="oc-meta">
          <span><el-icon><Calendar /></el-icon>{{ o.planDate }}</span>
          <span><el-icon><User /></el-icon>{{ o.assignee }}</span>
        </div>
        <div v-if="o.checkin" class="oc-checkin">
          <el-icon color="#699C78"><CircleCheck /></el-icon>
          已打卡 · {{ o.checkin.time }} · {{ o.checkin.hours }}h · {{ o.checkin.photos }} 张照片
        </div>
        <div class="oc-ops">
          <button v-if="o.status === '待接单'" class="m-btn mini" @click="accept(o)">接单</button>
          <button v-if="o.status === '进行中'" class="m-btn primary mini" @click="checkinOrder = o">现场打卡</button>
          <span v-if="o.status === '待验收'" class="wait-tip">等待管理员验收</span>
        </div>
      </div>
      <div v-if="!filtered.length" class="m-empty">暂无工单</div>
    </div>

    <!-- 打卡抽屉 -->
    <transition name="sheet">
      <div v-if="checkinOrder" class="sheet-mask" @click.self="checkinOrder = null">
        <div class="sheet">
          <div class="sheet-head"><b>现场打卡 · {{ checkinOrder.plotName }}</b><button class="close" @click="checkinOrder = null" aria-label="关闭"><el-icon><Close /></el-icon></button></div>

          <div class="f-block">
            <label>现场照片（演示：点击添加）</label>
            <div class="photo-boxes">
              <div v-for="i in Math.max(1, photos)" :key="i" class="ph" :style="{ background: `linear-gradient(${120 + i * 50}deg, hsl(${100 + i * 12},45%,68%), hsl(${130 + i * 8},50%,46%))` }">
                <span>现场 {{ i }}</span>
              </div>
              <button class="ph add" @click="photos = Math.min(4, photos + 1)"><el-icon :size="20"><Plus /></el-icon></button>
            </div>
          </div>

          <div class="f-block">
            <label>工时记录：{{ hours }} 小时</label>
            <el-slider v-model="hours" :min="0.5" :max="12" :step="0.5" show-stops />
          </div>

          <div class="f-block">
            <label>作业说明</label>
            <textarea v-model="remark" rows="2" placeholder="作业完成情况说明（选填）"></textarea>
          </div>

          <button class="m-btn primary" :disabled="submitting" @click="checkin(checkinOrder)">
            {{ submitting ? '提交中…' : '提交打卡' }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.m-orders {
  padding: 16px;
  min-height: 100%;
}
.mo-head h2 {
  margin: 0 0 12px;
  font-size: 18px;
}
.tabs {
  display: flex;
  gap: 8px;
}
.tabs button {
  border: 1px solid var(--ag-border);
  background: #fff;
  font-size: 12px;
  padding: 6px 16px;
  border-radius: var(--ag-radius-sm); /* 决策依据：页签按钮属小控件，对齐控件档 6px */
  cursor: pointer;
  color: var(--ag-text-2);
}
.tabs button.on {
  background: var(--ag-green-600);
  border-color: var(--ag-green-600);
  color: #fff;
  font-weight: 600;
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-top: 14px;
}
.order-card {
  background: #fff;
  border-radius: var(--ag-radius); /* 决策依据：订单卡片属卡片类，对齐卡片档 10px */
  padding: 14px;
  box-shadow: var(--ag-shadow-sm);
}
.oc-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.o-type {
  background: var(--ag-green-50);
  color: var(--ag-green-700);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: var(--ag-radius-sm); /* 决策依据：订单类型标签属小控件，对齐控件档 6px */
}
.o-status {
  font-size: 11px;
  color: var(--ag-warning);
}
.o-status.doing {
  color: var(--ag-green-600);
}
.oc-plot {
  font-size: 15px;
}
.oc-meta {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--ag-text-3);
}
.oc-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.oc-checkin {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  background: var(--ag-green-50);
  border-radius: var(--ag-radius); /* 决策依据：打卡信息条属卡片类容器，对齐卡片档 10px */
  padding: 7px 10px;
  font-size: 11.5px;
  color: var(--ag-green-700);
}
.oc-ops {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.m-btn {
  border: 1px solid var(--ag-border);
  background: #fff;
  border-radius: var(--ag-radius-sm); /* 决策依据：操作按钮属控件，对齐控件档 6px */
  padding: 7px 18px;
  font-size: 13px;
  cursor: pointer;
}
.m-btn.primary {
  /* 决策依据：主按钮渐变属纯装饰、不承载信息，按简约高级规范改为单色实底 */
  background: var(--ag-green-700);
  border: none;
  color: #fff;
  font-weight: 600;
}
.m-btn.mini {
  padding: 6px 14px;
  font-size: 12px;
}
.wait-tip {
  font-size: 11px;
  color: var(--ag-text-4);
}
.m-empty {
  text-align: center;
  color: var(--ag-text-4);
  padding: 30px 0;
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
  padding: 20px;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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
.f-block {
  margin-bottom: 16px;
}
.f-block label {
  font-size: 12px;
  color: var(--ag-text-2);
  display: block;
  margin-bottom: 8px;
}
.photo-boxes {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}
.ph {
  width: 74px;
  height: 74px;
  border-radius: var(--ag-radius); /* 决策依据：74px 照片缩略块属卡片类，对齐卡片档 10px */
  position: relative;
  display: grid;
  place-items: end;
  overflow: hidden;
}
.ph span {
  font-size: 9px;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  width: 100%;
  text-align: center;
  padding: 2px 0;
}
.ph.add {
  border: 1.5px dashed var(--ag-border);
  background: var(--ag-bg-hover);
  color: var(--ag-text-4);
  cursor: pointer;
  display: grid;
  place-items: center;
}
textarea {
  width: 100%;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-sm); /* 决策依据：多行输入属控件，对齐控件档 6px */
  padding: 9px 11px;
  font-size: 13px;
  resize: none;
  outline: none;
  font-family: inherit;
}
textarea:focus {
  border-color: var(--ag-green-500);
}
.m-btn.primary {
  width: 100%;
}
.sheet-enter-active {
  transition: opacity 0.25s;
}
.sheet-enter-from {
  opacity: 0;
}
</style>
