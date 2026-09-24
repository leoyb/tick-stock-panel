// 宏观看板集的图表配色。
// 为什么在这里单独定义：ECharts 画布不消费 CSS 变量，Tailwind 的语义 token（accent 等）
// 无法直接传给 series/style，因此像 lib/theme.ts 的 useChartTheme 一样，把图表用的
// 语义色集中在一处，避免各页面各写一套色值。

/** 多系列折线/柱状默认色序（与「微观 Value」看板的金色主色呼应） */
export const SERIES = ['#d4a441', '#38bdf8', '#a78bfa', '#f59e0b', '#34d399', '#f43f5e', '#22d3ee', '#fb7185'] as const

/** 主色（黄金看板与首页星轨使用） */
export const GOLD = '#d4a441'

/** 国内习惯：红涨绿跌（仅用于价格/涨跌幅语义，不用于 UI 状态） */
export const UP = '#ef4444'
export const DOWN = '#22c55e'
export const FLAT = '#94a3b8'

/** 热力图色阶：负→正（绿→黄→红） */
export const HEAT = ['#166534', '#22c55e', '#84cc16', '#facc15', '#fb923c', '#ef4444', '#991b1b'] as const

export function seriesColor(index: number): string {
  return SERIES[index % SERIES.length]
}

export function deltaColor(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return FLAT
  if (value > 0) return UP
  if (value < 0) return DOWN
  return FLAT
}

/** 涨跌对应的 Tailwind 文本色类（表格里少写 inline style 时用） */
export function deltaClass(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'text-muted'
  if (value > 0) return 'text-bull'
  if (value < 0) return 'text-bear'
  return 'text-muted'
}

/** 把 -100..100 的数值映射到 HEAT 色阶（用于热力图/色块） */
export function heatColor(value: number, min = -30, max = 30): string {
  const ratio = (Math.max(min, Math.min(max, value)) - min) / (max - min || 1)
  const index = Math.round(ratio * (HEAT.length - 1))
  return HEAT[index]
}
