// A股盘后日报各面板的 ECharts option 构造函数。
// 为什么把 option 单独放这里：option 依赖 useChartTheme() 的画布色（明/暗主题切换时整体重建），
// 抽出来后页面组件只关心「哪个面板画哪张图」（同 cnBond.ts 的做法）。
// 全部数据来自 ../mock/dailyReview.ts，这里不做任何数值加工，只决定「怎么画」。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { GOLD, heatColor } from '../../lib/palette'
import { DR_SECTORS, DR_THEMES } from '../../mock/dailyReview'

/** 面板共用的 tooltip 样式：画布不吃 CSS 变量，颜色只能来自 theme */
function itemTooltip(theme: ChartTheme) {
  return {
    trigger: 'item' as const,
    confine: true,
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    textStyle: { color: theme.tooltipText, fontSize: 11 },
  }
}

/** 涨跌幅着色窗口：板块涨跌幅在 -2.7%~+2.21% 之间，取 ±3% 让红绿对比不糊成一片 */
const PCT_WINDOW = 3

/**
 * 板块热力图：treemap，面积 = 成交额（亿），色 = 涨跌幅（红涨绿跌）。
 * 板块名 + 涨跌幅直接写进节点名（label 显示 {b}），tooltip 默认展示成交额。
 */
export function dailyHeatmapOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    tooltip: {
      ...itemTooltip(theme),
      valueFormatter: (value: unknown) => `${Number(value).toFixed(1)} 亿`,
    },
    series: [
      {
        type: 'treemap' as const,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        itemStyle: { borderColor: theme.border, borderWidth: 1, gapWidth: 1 },
        label: {
          show: true,
          formatter: '{b}',
          fontSize: 10,
          color: '#ffffff',
          overflow: 'truncate' as const,
        },
        data: DR_SECTORS.map(sector => ({
          name: `${sector.name} ${sector.pct > 0 ? '+' : ''}${sector.pct.toFixed(2)}%`,
          value: sector.amountYi,
          itemStyle: { color: heatColor(sector.pct, -PCT_WINDOW, PCT_WINDOW) },
        })),
      },
    ],
  }
}

/** 热点题材归因 TOP15：横向条形图（题材 / 命中只数），只数多的排在上沿 */
export function dailyThemesOption(theme: ChartTheme): EChartsOption {
  // 类目轴自下而上排布，倒序后最大的「“华”字辈」落在最上沿
  const rows = [...DR_THEMES].reverse()
  return {
    animation: false,
    grid: { left: 88, right: 36, top: 8, bottom: 24 },
    tooltip: {
      ...itemTooltip(theme),
      valueFormatter: (value: unknown) => `${Number(value).toFixed(0)} 只`,
    },
    xAxis: {
      type: 'value' as const,
      name: '命中只数',
      nameTextStyle: { color: theme.text, fontSize: 9 },
      axisLabel: { color: theme.text, fontSize: 9 },
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: theme.grid } },
    },
    yAxis: {
      type: 'category' as const,
      data: rows.map(item => item.name),
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar' as const,
        barWidth: '58%',
        itemStyle: { color: GOLD, opacity: 0.85 },
        label: {
          show: true,
          position: 'right' as const,
          formatter: '{c}',
          fontSize: 10,
          color: theme.textStrong,
        },
        data: rows.map(item => item.count),
      },
    ],
  }
}
