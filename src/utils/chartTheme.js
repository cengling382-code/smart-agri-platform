/** ECharts 公共主题（dp 设计系统：电光蓝导出 + 灰阶辅助，语义红保留） */
export const CHART_COLORS = ['#074ce0', '#454c58', '#5c85f5', '#9aa2ae', '#16191f', '#e84a5f', '#c6cbd4']

export const chartBase = {
  color: CHART_COLORS,
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(22, 25, 31, 0.92)', borderWidth: 0, textStyle: { color: '#fcfcfd', fontSize: 12 } },
  grid: { left: 8, right: 18, top: 40, bottom: 4, containLabel: true },
}

/**
 * 极简轻量图表主题（注册到 echarts.init 的第二参数）。
 * 决策依据：dp 图表规范——极简轻量、网格线弱化到几乎不可见、
 * 坐标轴不画轴线/刻度、文字用最浅一级灰度；色板只用电光蓝 + 灰阶
 * （避免引入无关强调色），任何视图里显式传入的配置仍然优先生效。
 */
export const AGRI_SOFT_THEME = {
  color: CHART_COLORS,
  textStyle: { fontFamily: "'Instrument Sans Variable', 'Instrument Sans', 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif" },
  grid: chartBase.grid,
  categoryAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#9aa2ae', fontSize: 11 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#9aa2ae', fontSize: 11 },
    splitLine: { show: true, lineStyle: { color: '#eef0f3', width: 1 } },
  },
  timeAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#9aa2ae', fontSize: 11 },
    splitLine: { show: false },
  },
  logAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#9aa2ae', fontSize: 11 },
    splitLine: { show: true, lineStyle: { color: '#eef0f3', width: 1 } },
  },
  tooltip: chartBase.tooltip,
}
