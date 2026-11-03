/** ECharts 公共主题（管理端统一配色：鼠尾草绿 × 雾蓝灰 × 暖点缀） */
export const CHART_COLORS = ['#699c78', '#4c6983', '#ffb37b', '#e84a5f', '#7dc383', '#b17179', '#8fb3cc']

export const chartBase = {
  color: CHART_COLORS,
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(48, 56, 65, 0.92)', borderWidth: 0, textStyle: { color: '#f5f5f5', fontSize: 12 } },
  grid: { left: 12, right: 18, top: 42, bottom: 8, containLabel: true },
}
