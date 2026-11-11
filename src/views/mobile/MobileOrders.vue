<script setup>
/** 页面 64 · 移动端农事工单执行页：查看工单、现场打卡、上传照片、工时记录 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { farmApi } from '@/api'
import { onDataChange } from '@/composables/useDataVersion'

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

async function load() {
  try {
    const res = await farmApi.orderPage({ page: 1, size: 30 })
    orders.value = Array.isArray(res?.list) ? res.list : []
    // 打卡抽屉打开时重新绑定新数据，不打断用户填写
    if (checkinOrder.value) {
      const id = checkinOrder.value.id
      checkinOrder.value = orders.value.find((o) => o.id === id) || null
    }
  } catch (e) {
    console.warn('[MobileOrders]', e?.message || e)
  }
}
onMounted(load)
onDataChange(load, { debounce: 400 })

async function accept(o) {
  try {
    await farmApi.updateOrder(o.id, { status: '进行中' })
    o.status = '进行中'
    ElMessage.success('已接单，开始作业吧！')
  } catch (e) {
    ElMessage.error(e?.message || '接单失败')
  }
}

function openCheckin(o) {
  checkinOrder.value = o
  photos.value = 0
  hours.value = 4
  remark.value = ''
}
function addPhoto() {
  photos.value = Math.min(4, photos.value + 1)
}

async function checkin(o) {
  if (!photos.value) {
    ElMessage.warning('请至少添加 1 张现场照片后再提交')
    return
  }
  submitting.value = true
  try {
    await farmApi.updateOrder(o.id, {
      status: '待验收',
      checkin: {
        time: new Date().toLocaleString('zh-CN', { hour12: false }),
        location: `${o.plotName}入口`,
        photos: photos.value,
        hours: hours.value,
        remark: remark.value || '作业现场已完成',
      },
    })
    o.status = '待验收'
    ElMessage.success('打卡成功！现场照片与工时已记录，等待验收')
    checkinOrder.value = null
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="m-page m-orders">
    <div class="m-page-head">
      <div>
        <h1 class="m-page-title">工单执行</h1>
        <p class="m-page-desc">接单 · 现场打卡 · 验收流转</p>
      </div>
    </div>

    <div class="m-seg mo-tabs">
      <button :class="{ on: activeTab === 'todo' }" @click="activeTab = 'todo'">进行中</button>
      <button :class="{ on: activeTab === 'done' }" @click="activeTab = 'done'">已完成</button>
    </div>

    <div class="order-list">
      <div v-for="o in filtered" :key="o.id" class="m-card order-card">
        <div class="oc-top">
          <span class="m-tag">{{ o.type }}</span>
          <span class="o-status" :class="{ doing: o.status === '进行中' }">{{ o.status }}</span>
        </div>
        <b class="oc-plot">{{ o.plotName }}</b>
        <div class="oc-meta">
          <span><el-icon><Calendar /></el-icon>{{ o.planDate }}</span>
          <span><el-icon><User /></el-icon>{{ o.assignee }}</span>
        </div>
        <div v-if="o.checkin" class="oc-checkin">
          <el-icon><CircleCheck /></el-icon>
          已打卡 · {{ o.checkin.time }} · {{ o.checkin.hours }}h · {{ o.checkin.photos }} 张照片
        </div>
        <div class="oc-ops">
          <button v-if="o.status === '待接单'" class="m-btn m-btn-mini" @click="accept(o)">接单</button>
          <button v-if="o.status === '进行中'" class="m-btn m-btn-primary m-btn-mini" @click="openCheckin(o)">现场打卡</button>
          <span v-if="o.status === '待验收'" class="wait-tip">等待管理员验收</span>
        </div>
      </div>
      <div v-if="!filtered.length" class="m-empty">暂无工单</div>
    </div>

    <!-- 打卡抽屉 -->
    <transition name="sheet">
      <div v-if="checkinOrder" class="m-sheet-mask" @click.self="checkinOrder = null">
        <div class="m-sheet">
          <div class="m-sheet-head">
            <h2 class="m-sheet-title">现场打卡 · {{ checkinOrder.plotName }}</h2>
            <button class="m-icon-btn" @click="checkinOrder = null" aria-label="关闭"><el-icon><Close /></el-icon></button>
          </div>

          <div class="f-block">
            <span class="m-label">现场照片（已添加 {{ photos }} 张）</span>
            <div class="photo-boxes">
              <div v-for="i in photos" :key="i" class="ph">
                <span>现场 {{ i }}</span>
              </div>
              <button v-if="photos < 4" class="ph add" aria-label="添加现场照片" @click="addPhoto"><el-icon :size="20"><Plus /></el-icon></button>
            </div>
            <p v-if="!photos" class="photo-hint">尚未添加照片，点击「+」模拟上传现场照片</p>
          </div>

          <div class="f-block">
            <span class="m-label">工时记录：{{ hours }} 小时</span>
            <el-slider v-model="hours" :min="0.5" :max="12" :step="0.5" show-stops />
          </div>

          <div class="f-block">
            <span class="m-label">作业说明</span>
            <textarea v-model="remark" rows="2" class="m-textarea" placeholder="作业完成情况说明（选填）"></textarea>
          </div>

          <button class="m-btn m-btn-primary m-btn-block" :disabled="submitting" @click="checkin(checkinOrder)">
            {{ submitting ? '提交中…' : '提交打卡' }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.mo-tabs {
  margin-bottom: var(--ag-space-3);
}
.order-list {
  display: flex;
  flex-direction: column;
  gap: var(--ag-space-3);
}
.order-card {
  padding: var(--ag-space-4);
}
.oc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ag-space-2);
  margin-bottom: var(--ag-space-2);
}
.o-status {
  font-size: var(--ag-fs-micro);
  color: var(--ag-warning);
}
.o-status.doing {
  color: var(--ag-green-600);
  font-weight: 600;
}
.oc-plot {
  display: block;
  font-size: var(--ag-fs-body);
  font-weight: 600;
  color: var(--ag-text-1);
}
.oc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ag-space-4);
  margin-top: var(--ag-space-2);
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-3);
}
.oc-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
/* 打卡信息条：对齐 PC 卡片内 bg-hover 信息块 */
.oc-checkin {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--ag-space-3);
  padding: var(--ag-space-2) var(--ag-space-3);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-green-50);
  font-size: var(--ag-fs-micro);
  color: var(--ag-green-700);
}
.oc-ops {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--ag-space-2);
  margin-top: var(--ag-space-3);
}
.oc-ops:empty {
  display: none;
}
.wait-tip {
  font-size: var(--ag-fs-micro);
  color: var(--ag-text-4);
}

/* 打卡抽屉 */
.f-block {
  margin-bottom: var(--ag-space-4);
}
.photo-boxes {
  display: flex;
  gap: var(--ag-space-2);
  flex-wrap: wrap;
}
/* 照片占位：中性灰阶，避免旧版绿色渐变装饰 */
.ph {
  width: 74px;
  height: 74px;
  border-radius: var(--ag-radius);
  background: linear-gradient(135deg, #e6e9ee, #cfd5dd);
  position: relative;
  display: grid;
  place-items: end;
  overflow: hidden;
}
.ph span {
  width: 100%;
  padding: 2px 0;
  text-align: center;
  font-size: 9px;
  color: #fff;
  background: rgba(22, 25, 31, 0.55);
}
.ph.add {
  border: 1px dashed var(--ag-border);
  background: var(--ag-bg-hover);
  color: var(--ag-text-4);
  cursor: pointer;
  display: grid;
  place-items: center;
  align-items: center;
}
.photo-hint {
  margin: var(--ag-space-2) 0 0;
  font-size: 11px;
  color: var(--ag-text-4);
}

.sheet-enter-active {
  transition: opacity var(--ag-dur-slow) var(--ag-ease);
}
.sheet-enter-from {
  opacity: 0;
}
</style>
