<script setup>
/** 页面 66 · 移动端采收登记：采收产量录入、拍照上传、分级选择 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { farmApi, plotApi } from '@/api'
import { getConfig } from '@/data/configStore'
import { onDataChange } from '@/composables/useDataVersion'

const cfg = getConfig('constants')

const plots = ref([])
const loading = ref(true)
const form = ref({ plotId: null, crop: '', date: '', qty: 100, grade: '一级' })
const photos = ref(0)
const submitting = ref(false)

const GRADES = cfg.grades

const activePlot = computed(() => plots.value.find((p) => p.id === form.value.plotId))

async function load() {
  try {
    plots.value = await plotApi.all()
    // 只在首次加载（或原选中地块已失效）时初始化表单，刷新不覆盖用户已填内容
    if (!form.value.plotId || !plots.value.some((p) => p.id === form.value.plotId)) {
      form.value.plotId = plots.value[0]?.id ?? null
      form.value.crop = plots.value[0]?.crop || ''
    }
  } catch (e) {
    console.warn('[MobileHarvest] 地块加载失败', e?.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
onDataChange(load, { debounce: 400 })

function pickPlot() {
  form.value.crop = activePlot.value?.crop
}

const MAX_HARVEST_QTY = 1000000

async function submit() {
  if (!form.value.plotId) return ElMessage.warning('请选择地块')
  if (!form.value.date) return ElMessage.warning('请选择采收日期')
  // 产量边界校验：v-model.number 遇到非数字会保留字符串，min="1" 在非 form 提交下不会触发原生校验
  const qty = Number(form.value.qty)
  if (!Number.isFinite(qty) || qty <= 0) return ElMessage.warning('采收产量需为大于 0 的数值')
  if (qty > MAX_HARVEST_QTY) return ElMessage.warning(`采收产量超出合理范围（上限 ${MAX_HARVEST_QTY}kg）`)
  submitting.value = true
  try {
    await farmApi.createHarvest({ ...form.value, plotName: activePlot.value?.name, photos: photos.value })
    ElMessage.success(`采收登记成功：${form.value.qty}kg（${form.value.grade}），已上报台账`)
    form.value.qty = 100
    photos.value = 0
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="m-page m-harvest" v-loading="loading">
    <div class="m-page-head">
      <div>
        <h1 class="m-page-title">采收登记</h1>
        <p class="m-page-desc">采收产量录入 · 拍照上传 · 分级选择</p>
      </div>
    </div>

    <div class="m-card form-card">
      <span class="m-label">采收地块</span>
      <select v-model="form.plotId" class="m-select" @change="pickPlot" aria-label="选择采收地块">
        <option v-for="p in plots" :key="p.id" :value="p.id">{{ p.name }}（{{ p.crop }}）</option>
      </select>

      <span class="m-label">采收日期</span>
      <input v-model="form.date" type="date" class="m-input" aria-label="采收日期" />

      <span class="m-label">采收产量（kg）</span>
      <div class="qty-row">
        <button class="qty-btn" @click="form.qty = Math.max(1, form.qty - 10)" aria-label="减少">−</button>
        <input v-model.number="form.qty" type="number" min="1" :max="MAX_HARVEST_QTY" step="1" class="m-input qty-input" aria-label="产量公斤数" />
        <button class="qty-btn" @click="form.qty += 10" aria-label="增加">＋</button>
      </div>
      <div class="qty-chips">
        <button v-for="q in [50, 100, 200, 500]" :key="q" :class="{ on: form.qty === q }" @click="form.qty = q">{{ q }}kg</button>
      </div>

      <span class="m-label">分级</span>
      <div class="grade-row">
        <button v-for="g in GRADES" :key="g" :class="{ on: form.grade === g }" @click="form.grade = g">{{ g }}</button>
      </div>

      <span class="m-label">现场照片（点击添加，最多 4 张）</span>
      <div class="photo-boxes">
        <div v-for="i in Math.max(0, photos)" :key="i" class="ph">
          <span>照片 {{ i }}</span>
        </div>
        <button v-if="photos < 4" class="ph add" @click="photos++" aria-label="添加照片"><el-icon :size="20"><Plus /></el-icon></button>
      </div>

      <button class="m-btn m-btn-primary m-btn-block submit-btn" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : `提交采收登记（${form.qty}kg）` }}
      </button>
    </div>

    <div class="tip-card">
      <el-icon class="tip-ico"><InfoFilled /></el-icon>
      <span>登记后自动同步农事台账与采收统计，管理员可在验收后生成溯源批次</span>
    </div>
  </div>
</template>

<style scoped>
.form-card {
  padding: var(--ag-space-4);
}
/* 表单分块节奏：标签上间距 16px（4pt 网格），首块贴齐卡片内缘 */
.form-card .m-label {
  margin-top: var(--ag-space-4);
}
.form-card .m-label:first-child {
  margin-top: 0;
}
.qty-row {
  display: flex;
  gap: var(--ag-space-2);
}
.qty-btn {
  width: 48px;
  min-height: 44px;
  flex: none;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-bg-hover);
  color: var(--ag-text-2);
  font-size: 18px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.qty-btn:active {
  background: var(--ag-bg-page);
}
.qty-input {
  flex: 1;
  text-align: center;
  font-weight: 700;
}
.qty-chips {
  display: flex;
  gap: var(--ag-space-2);
  margin-top: var(--ag-space-2);
}
/* 快捷数值 chip：与 .m-seg 同形制 */
.qty-chips button {
  flex: 1;
  min-height: 32px;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-bg-surface);
  color: var(--ag-text-2);
  font: inherit;
  font-size: var(--ag-fs-micro);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.qty-chips button.on {
  border-color: var(--ag-green-600);
  background: var(--ag-green-50);
  color: var(--ag-green-700);
  font-weight: 600;
}
.grade-row {
  display: flex;
  gap: var(--ag-space-2);
}
.grade-row button {
  flex: 1;
  min-height: 40px;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-sm);
  background: var(--ag-bg-surface);
  color: var(--ag-text-2);
  font: inherit;
  font-size: var(--ag-fs-caption);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color var(--ag-dur) var(--ag-ease), background var(--ag-dur) var(--ag-ease);
}
.grade-row button.on {
  border-color: var(--ag-green-600);
  background: var(--ag-green-50);
  color: var(--ag-green-700);
  font-weight: 600;
}
.photo-boxes {
  display: flex;
  gap: var(--ag-space-2);
  flex-wrap: wrap;
}
/* 照片占位：中性灰阶，替代旧版绿色渐变装饰 */
.ph {
  width: 72px;
  height: 72px;
  border-radius: var(--ag-radius);
  background: linear-gradient(135deg, #e6e9ee, #cfd5dd);
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
}
.submit-btn {
  margin-top: var(--ag-space-5);
}
/* 提示条：PC 奶油黄点缀色 + 正文文字层级 */
.tip-card {
  display: flex;
  align-items: flex-start;
  gap: var(--ag-space-2);
  margin-top: var(--ag-space-3);
  padding: var(--ag-space-3) var(--ag-space-4);
  border: 1px solid var(--ag-cream);
  border-radius: var(--ag-radius);
  background: var(--ag-cream-light);
  font-size: var(--ag-fs-micro);
  line-height: 1.6;
  color: var(--ag-text-2);
}
.tip-ico {
  color: var(--ag-warning);
  flex: none;
  margin-top: 2px;
}
</style>
