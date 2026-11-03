<script setup>
/** 统计指标卡：图标 + 标签 + 数值 + 趋势 */
import CountUp from './CountUp.vue'

defineProps({
  label: String,
  value: { type: Number, default: 0 },
  unit: { type: String, default: '' },
  icon: { type: String, default: 'DataLine' },
  tone: { type: String, default: 'green' }, // green | blue | cyan | amber | red
  trend: { type: Number, default: 0 },     // 正=上升 负=下降
  trendLabel: { type: String, default: '较昨日' },
  decimals: { type: Number, default: 0 },
  suffix: { type: String, default: '' },
})
</script>

<template>
  <div class="stat-card ag-card ag-card--hover" :data-tone="tone">
    <div class="icon-box">
      <el-icon :size="24"><component :is="icon" /></el-icon>
    </div>
    <div class="meta">
      <div class="label">{{ label }}</div>
      <div class="value-row">
        <CountUp :value="value" :decimals="decimals" class="value" />
        <span v-if="unit" class="unit">{{ unit }}</span>
        <span v-if="suffix" class="suffix">{{ suffix }}</span>
      </div>
      <div v-if="trend" class="trend" :class="trend >= 0 ? 'up' : 'down'">
        <el-icon :size="12"><component :is="trend >= 0 ? 'Top' : 'Bottom'" /></el-icon>
        <span>{{ Math.abs(trend) }}%</span>
        <span class="trend-label">{{ trendLabel }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--ag-space-4);
  padding: var(--ag-space-5) var(--ag-space-6);
}
/* 图标底：原为 5 组 135° 渐变 + 同色 16px 投影——5 张卡并排就是
   10 层装饰。改为低透明度同色系色块 + 同色图标：仍能区分维度，
   但不再有"发光的方块"。色块承担分类，阴影只留给卡片本身的层级。 */
.icon-box {
  width: 48px;
  height: 48px;
  border-radius: var(--ag-radius);
  display: grid;
  place-items: center;
  flex: none;
}
[data-tone='green'] .icon-box { background: rgba(105, 156, 120, 0.14); color: var(--ag-green-700); }
[data-tone='blue'] .icon-box { background: rgba(76, 105, 131, 0.14); color: var(--ag-blue-600); }
[data-tone='cyan'] .icon-box { background: rgba(110, 147, 176, 0.16); color: var(--ag-cyan-600); }
[data-tone='amber'] .icon-box { background: rgba(232, 149, 82, 0.16); color: var(--ag-warning); }
[data-tone='red'] .icon-box { background: rgba(232, 74, 95, 0.12); color: var(--ag-danger); }

.label {
  font-size: var(--ag-fs-caption);
  letter-spacing: var(--ag-ls-caption);
  color: var(--ag-text-3);
}
.value-row {
  display: flex;
  align-items: baseline;
  gap: var(--ag-space-1);
}
.value {
  font-size: 28px;                    /* 大数字：负字距收拢，避免数字间发散 */
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
  color: var(--ag-text-1);
  line-height: 1.2;
}
.unit,
.suffix {
  font-size: var(--ag-fs-caption);
  letter-spacing: var(--ag-ls-caption);
  color: var(--ag-text-3);
}
.trend {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: var(--ag-fs-micro);
  letter-spacing: var(--ag-ls-micro);
  margin-top: 2px;
}
.trend.up { color: var(--ag-success); }
.trend.down { color: var(--ag-danger); }
.trend-label { color: var(--ag-text-4); }
</style>
