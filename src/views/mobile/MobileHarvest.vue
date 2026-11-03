<script setup>
/** 页面 66 · 移动端采收登记：采收产量录入、拍照上传、分级选择 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { farmApi, plotApi } from '@/api'

const plots = ref([])
const loading = ref(true)
const form = ref({ plotId: null, crop: '', date: '', qty: 100, grade: '一级' })
const photos = ref(0)
const submitting = ref(false)

const GRADES = ['特级', '一级', '二级']

const activePlot = computed(() => plots.value.find((p) => p.id === form.value.plotId))

onMounted(async () => {
  try {
    plots.value = await plotApi.all()
    form.value.plotId = plots.value[0]?.id
    form.value.crop = plots.value[0]?.crop
  } finally {
    loading.value = false
  }
})

function pickPlot() {
  form.value.crop = activePlot.value?.crop
}

async function submit() {
  if (!form.value.plotId) return ElMessage.warning('请选择地块')
  if (!form.value.date) return ElMessage.warning('请选择采收日期')
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
  <div class="m-harvest" v-loading="loading">
    <div class="mh-head"><h2>采收登记</h2><span class="text-dim">采收产量录入 · 拍照上传 · 分级选择</span></div>

    <div class="form-card">
      <label>采收地块</label>
      <select v-model="form.plotId" @change="pickPlot" aria-label="选择采收地块">
        <option v-for="p in plots" :key="p.id" :value="p.id">{{ p.name }}（{{ p.crop }}）</option>
      </select>

      <label>采收日期</label>
      <input v-model="form.date" type="date" aria-label="采收日期" />

      <label>采收产量（kg）</label>
      <div class="qty-row">
        <button @click="form.qty = Math.max(1, form.qty - 10)" aria-label="减少">−</button>
        <input v-model.number="form.qty" type="number" min="1" aria-label="产量公斤数" />
        <button @click="form.qty += 10" aria-label="增加">＋</button>
      </div>
      <div class="qty-chips">
        <button v-for="q in [50, 100, 200, 500]" :key="q" @click="form.qty = q">{{ q }}kg</button>
      </div>

      <label>分级</label>
      <div class="grade-row">
        <button v-for="g in GRADES" :key="g" :class="{ on: form.grade === g }" @click="form.grade = g">{{ g }}</button>
      </div>

      <label>现场照片（点击添加，最多 4 张）</label>
      <div class="photo-boxes">
        <div v-for="i in Math.max(0, photos)" :key="i" class="ph" :style="{ background: `linear-gradient(${110 + i * 55}deg, hsl(${95 + i * 14},48%,66%), hsl(${125 + i * 9},52%,44%))` }">
          <span>照片 {{ i }}</span>
        </div>
        <button v-if="photos < 4" class="ph add" @click="photos++" aria-label="添加照片"><el-icon :size="20"><Plus /></el-icon></button>
      </div>

      <button class="m-btn primary big" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : `提交采收登记（${form.qty}kg）` }}
      </button>
    </div>

    <div class="tip-card">
      <el-icon color="#E89552"><InfoFilled /></el-icon>
      <span>登记后自动同步农事台账与采收统计，管理员可在验收后生成溯源批次</span>
    </div>
  </div>
</template>

<style scoped>
.m-harvest {
  padding: 16px;
  min-height: 100%;
}
.mh-head h2 {
  margin: 0 0 3px;
  font-size: 18px;
}
.form-card {
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：表单容器属大块面板，对齐浮层档 14px */
  padding: 18px 16px;
  box-shadow: var(--ag-shadow-sm);
  margin-top: 14px;
}
label {
  display: block;
  font-size: 12px;
  color: var(--ag-text-3);
  margin: 14px 0 7px;
}
label:first-child {
  margin-top: 0;
}
select,
input[type='date'],
input[type='number'] {
  width: 100%;
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius-sm); /* 决策依据：下拉/日期输入属控件，对齐控件档 6px */
  padding: 11px 13px;
  font-size: 14px;
  outline: none;
  background: #fff;
  font-family: inherit;
}
select:focus,
input:focus {
  border-color: var(--ag-green-500);
}
.qty-row {
  display: flex;
  gap: 9px;
}
.qty-row button {
  width: 48px;
  height: 44px;
  border: none;
  background: var(--ag-bg-hover);
  border-radius: var(--ag-radius-sm); /* 决策依据：数量加减按钮属小控件，对齐控件档 6px */
  font-size: 20px;
  cursor: pointer;
  color: var(--ag-text-2);
}
.qty-row input {
  flex: 1;
  text-align: center;
  font-weight: 700;
}
.qty-chips {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.qty-chips button {
  flex: 1;
  border: 1px solid var(--ag-border);
  background: #fff;
  border-radius: var(--ag-radius-sm); /* 决策依据：数量快捷 chip 属小控件，对齐控件档 6px */
  font-size: 12px;
  padding: 6px 0;
  cursor: pointer;
  color: var(--ag-text-2);
}
.grade-row {
  display: flex;
  gap: 8px;
}
.grade-row button {
  flex: 1;
  border: 1.5px solid var(--ag-border);
  background: #fff;
  border-radius: var(--ag-radius-sm); /* 决策依据：等级选择按钮属小控件，对齐控件档 6px */
  padding: 10px 0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.grade-row button.on {
  border-color: var(--ag-green-600);
  background: var(--ag-green-50);
  color: var(--ag-green-700);
  font-weight: 700;
}
.photo-boxes {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}
.ph {
  width: 72px;
  height: 72px;
  border-radius: var(--ag-radius); /* 决策依据：72px 照片缩略块属卡片类，对齐卡片档 10px */
  display: grid;
  place-items: end;
  overflow: hidden;
}
.ph span {
  width: 100%;
  font-size: 9px;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
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
.m-btn.primary {
  border: none;
  /* 决策依据：主按钮渐变属纯装饰、不承载信息，按简约高级规范改为单色实底 */
  background: var(--ag-green-700);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  border-radius: var(--ag-radius-sm); /* 决策依据：全宽提交按钮属控件，对齐控件档 6px */
  padding: 13px;
  cursor: pointer;
  margin-top: 18px;
  width: 100%;
}
.m-btn.primary:disabled {
  opacity: 0.6;
}
.tip-card {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 14px;
  background: #FFF1BC;
  border-radius: var(--ag-radius); /* 决策依据：提示条属卡片类容器，对齐卡片档 10px */
  padding: 12px 14px;
  font-size: 11.5px;
  color: #8A6D3B;
  line-height: 1.6;
}
</style>
