/** 大屏图表深色主题公共配置（藏青底 · 鼠尾草绿/雾蓝/杏橘点缀） */
export const SCREEN_COLORS = ['#7dc383', '#9fc3dd', '#ffb37b', '#e84a5f', '#b17179', '#699c78']

export const darkBase = {
  color: SCREEN_COLORS,
  textStyle: { color: '#8fa3b8' },
  tooltip: {
    backgroundColor: 'rgba(22, 34, 47, 0.92)',
    borderColor: 'rgba(159, 195, 221, 0.35)',
    textStyle: { color: '#e8eef4', fontSize: 12 },
  },
  legend: { textStyle: { color: '#8fa3b8' }, itemWidth: 10, itemHeight: 10 },
}

export function darkAxis(extra = {}) {
  return {
    axisLine: { lineStyle: { color: 'rgba(143, 163, 184, 0.35)' } },
    axisLabel: { color: '#8fa3b8', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(143, 163, 184, 0.14)' } },
    ...extra,
  }
}
