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
[data-tone='green'] .icon-box { background: rgba(7, 76, 224, 0.10); color: var(--ag-green-700); }
[data-tone='blue'] .icon-box { background: rgba(76, 105, 131, 0.14); color: var(--ag-blue-600); }
[data-tone='cyan'] .icon-box { background: rgba(110, 147, 176, 0.16); color: var(--ag-cyan-600); }
[data-tone='amber'] .icon-box { background: rgba(201, 128, 62, 0.14); color: var(--ag-warning); }
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
  font-size: 32px;                    /* 大号核心数值：参照基准的指标层级 */
  letter-spacing: -0.8px;
  font-family: var(--ag-font-num);
  font-variant-numeric: tabular-nums;
  color: var(--ag-text-1);
  line-height: 1.15;
}
.unit,
.suffix {
  font-size: var(--ag-fs-caption);
  letter-spacing: var(--ag-ls-caption);
  color: var(--ag-text-3);
}
/* 环比标注：低透明度同色胶囊徽章（参照基准的涨跌徽章形制） */
.trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--ag-fs-micro);
  letter-spacing: var(--ag-ls-micro);
  font-weight: 600;
  margin-top: 6px;
  padding: 2px 8px;
  border-radius: var(--ag-radius-pill);
}
.trend.up { color: var(--ag-success); background: rgba(85, 129, 98, 0.12); }
.trend.down { color: var(--ag-danger); background: rgba(232, 74, 95, 0.10); }
.trend-label {
  color: var(--ag-text-4);
  font-weight: 400;
  margin-left: 2px;
}
</style>
