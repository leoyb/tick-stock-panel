// 全球长期资产收益工作台各面板的 ECharts option 构造函数。
// 与其他看板一致：option 依赖 useChartTheme() 的画布色（明/暗主题切换时整体重建），
// 抽出来后页面组件只关心「哪个面板画哪张图」。数值来自 ../../mock/longterm.ts，不做加工。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { HEAT } from '../../lib/palette'
import {
  LA_HEAT_INDICES,
  LA_HEAT_MATRIX,
  LA_HEAT_YEARS,
  LA_INDEX_BARS,
  LA_SBBI_BARS,
} from '../../mock/longterm'

/** 各面板共用的 tooltip 样式：画布不吃 CSS 变量，颜色只能来自 theme */
function tooltip(theme: ChartTheme) {
  return {
    trigger: 'item' as const,
    confine: true,
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    textStyle: { color: theme.tooltipText, fontSize: 11 },
  }
}

/**
 * 横向条形图共用骨架：类别轴放 y 上。
 * ECharts 默认把第一个类别画在最底部，这里把数组反转，让数据的第一项落在最上面（与整理稿图序一致）。
 */
function horizontalBarOption(theme: ChartTheme, labels: string[], values: number[], name: string): EChartsOption {
  const reversedLabels = [...labels].reverse()
  const reversedValues = [...values].reverse()
  return {
    animation: false,
    grid: { left: 92, right: 52, top: 12, bottom: 24 },
    tooltip: {
      ...tooltip(theme),
      valueFormatter: (value: unknown) => `${Number(value).toFixed(2)}%`,
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: theme.text, fontSize: 9, formatter: '{value}%' },
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: theme.grid } },
    },
    yAxis: {
      type: 'category',
      data: reversedLabels,
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    series: [
      {
        name,
        type: 'bar',
        barWidth: '58%',
        itemStyle: { color: HEAT[HEAT.length - 1], opacity: 0.85 },
        label: {
          show: true,
          position: 'right',
          color: theme.text,
          fontSize: 10,
          formatter: (params: unknown) => {
            const { value } = params as { value: number | string }
            return `${Number(value).toFixed(2)}%`
          },
        },
        data: reversedValues,
      },
    ],
  }
}

/** 2. SBBI 中国版：2005-2024 年化收益（名义，%）横向条形 */
export function laSbbiOption(theme: ChartTheme): EChartsOption {
  return horizontalBarOption(
    theme,
    LA_SBBI_BARS.map(item => item.name),
    LA_SBBI_BARS.map(item => item.value),
    '年化收益',
  )
}

/** 3. 图4·各指数长期年化收益率横向对比（至 2026-09-10，%） */
export function laIndexOption(theme: ChartTheme): EChartsOption {
  return horizontalBarOption(
    theme,
    LA_INDEX_BARS.map(item => item.name),
    LA_INDEX_BARS.map(item => item.value),
    '长期年化',
  )
}

/** 4. 图3·10 个指数年度收益率热力图：红正绿负，颜色越深幅度越大 */
export function laHeatmapOption(theme: ChartTheme): EChartsOption {
  const data: Array<[number, number, number]> = []
  LA_HEAT_MATRIX.forEach((row, yIndex) => {
    row.forEach((value, xIndex) => {
      data.push([xIndex, yIndex, value])
    })
  })
  return {
    animation: false,
    grid: { left: 78, right: 24, top: 12, bottom: 58 },
    tooltip: {
      ...tooltip(theme),
      formatter: (params: unknown) => {
        const [xIndex, yIndex, value] = (params as { value: [number, number, number] }).value
        return `${LA_HEAT_INDICES[yIndex]} · ${LA_HEAT_YEARS[xIndex]}：${value.toFixed(2)}%`
      },
    },
    xAxis: {
      type: 'category',
      data: LA_HEAT_YEARS,
      axisLabel: { color: theme.text, fontSize: 9 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      splitArea: { show: false },
    },
    yAxis: {
      type: 'category',
      data: [...LA_HEAT_INDICES].reverse(),
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      splitArea: { show: false },
    },
    visualMap: {
      min: -30,
      max: 30,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 12,
      itemHeight: 90,
      text: ['+30%', '-30%'],
      textStyle: { color: theme.text, fontSize: 9 },
      inRange: { color: [...HEAT] },
    },
    series: [
      {
        name: '年度收益率',
        type: 'heatmap',
        // y 轴已反转，数据里的 y 序号也要跟着反转才能对上行名
        data: data.map(([xIndex, yIndex, value]) => [xIndex, LA_HEAT_INDICES.length - 1 - yIndex, value]),
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: theme.tooltipBorder } },
      },
    ],
  }
}
