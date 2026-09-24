// 全球市场周报各面板的 ECharts option 构造函数。
// 与其他看板一致：option 依赖 useChartTheme() 的画布色（明/暗主题切换时整体重建），
// 抽出来后页面组件只关心「哪个面板画哪张图」。数据来自 ../../mock/weekly.ts，不做数值加工。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { DOWN, UP, seriesColor } from '../../lib/palette'
import { WEEK_VOLUME_BARS } from '../../mock/weekly'

/** 各面板共用的 tooltip 样式：画布不吃 CSS 变量，颜色只能来自 theme */
function tooltip(theme: ChartTheme) {
  return {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    textStyle: { color: theme.tooltipText, fontSize: 11 },
  }
}

/** 市场量能：沪深两市成交柱状图（万亿），红涨绿跌按环比着色 */
export function weekVolumeOption(theme: ChartTheme): EChartsOption {
  // 环比涨跌决定柱色：涨=红、跌=绿（首日无环比，用主题系列色兜底）
  const barData = WEEK_VOLUME_BARS.map((bar, index) => {
    const prev = index > 0 ? WEEK_VOLUME_BARS[index - 1].value : null
    const color = prev === null ? seriesColor(0) : bar.value >= prev ? UP : DOWN
    return {
      value: bar.value,
      itemStyle: { color, opacity: 0.85 },
    }
  })
  return {
    animation: false,
    grid: { left: 46, right: 20, top: 26, bottom: 26 },
    tooltip: {
      ...tooltip(theme),
      valueFormatter: (value: unknown) => `${Number(value).toFixed(2)} 万亿`,
    },
    xAxis: {
      type: 'category',
      data: WEEK_VOLUME_BARS.map(bar => bar.date),
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '万亿',
      nameTextStyle: { color: theme.text, fontSize: 9 },
      axisLabel: { color: theme.text, fontSize: 9 },
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: theme.grid } },
    },
    series: [
      {
        name: '沪深两市成交',
        type: 'bar',
        barWidth: '55%',
        label: {
          show: true,
          position: 'top',
          color: theme.text,
          fontSize: 9,
          formatter: (params: unknown) => {
            const { value } = params as { value: number | string }
            return Number(value).toFixed(2)
          },
        },
        data: barData,
      },
    ],
  }
}
