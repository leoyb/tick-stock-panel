// 黄金看板各面板的 ECharts option 构造函数。
// 为什么把 option 单独放这里：echarts 的 option 要以 useChartTheme() 的颜色重建，
// 页面组件里再堆 6 个上百行的对象会看不清版式；抽出来后页面只关心「哪个面板画哪张图」。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { DOWN, GOLD, UP, seriesColor } from '../../lib/palette'
import {
  GOLD_FISCAL_DEBT_POINTS,
  GOLD_FISCAL_RESERVE_POINTS,
  GOLD_INTL_PRICE_POINTS,
  GOLD_OPPORTUNITY_SERIES,
  GOLD_PERCENTILES,
  GOLD_RISK_MANAGED_MONEY,
  GOLD_RISK_SWAP_DEALERS,
  GOLD_SPREAD_POINTS,
  GOLD_STOCK_STRUCTURE,
} from '../../mock/gold'

/** 各面板共用的时间轴样式：画布不吃 CSS 变量，颜色只能来自 theme */
function timeAxis(theme: ChartTheme) {
  return {
    type: 'time' as const,
    boundaryGap: false,
    axisLabel: { color: theme.text, fontSize: 10, hideOverlap: true },
    axisLine: { lineStyle: { color: theme.border } },
    axisTick: { show: false },
    splitLine: { show: false },
  }
}

function valueAxis(theme: ChartTheme, name: string, options: { showSplitLine?: boolean } = {}) {
  return {
    type: 'value' as const,
    name,
    nameTextStyle: { color: theme.text, fontSize: 9 },
    axisLabel: { color: theme.text, fontSize: 9 },
    axisLine: { show: false },
    splitLine: { show: options.showSplitLine ?? true, lineStyle: { color: theme.grid } },
  }
}

function tooltip(theme: ChartTheme, digits = 2) {
  return {
    trigger: 'axis' as const,
    confine: true,
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    textStyle: { color: theme.tooltipText, fontSize: 11 },
    // 统一小数位：默认的数值格式化会把 4318.82 显示成 4318.8200000001 之类的浮点尾巴
    valueFormatter: (value: unknown) => Number(value).toFixed(digits),
  }
}

/** 1. 金价走势：左轴国际金价（美元/盎司）＋ 右轴上海金 vs 伦敦金价差（pp） */
export function goldPriceOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 54, right: 56, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: {
      top: 0,
      textStyle: { color: theme.text, fontSize: 10 },
      itemWidth: 10,
      itemHeight: 6,
    },
    xAxis: timeAxis(theme),
    yAxis: [
      valueAxis(theme, '美元/盎司'),
      valueAxis(theme, '价差 pp', { showSplitLine: false }),
    ],
    series: [
      {
        name: '国际金价（现货）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: GOLD },
        itemStyle: { color: GOLD },
        areaStyle: { opacity: 0.08, color: GOLD },
        data: GOLD_INTL_PRICE_POINTS,
      },
      {
        name: '上海金 vs 伦敦金价差',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 1.2, color: seriesColor(3) },
        itemStyle: { color: seriesColor(3) },
        data: GOLD_SPREAD_POINTS,
      },
    ],
  }
}

/** 2. 历史分位：横向条，1y / 3y / 10y 三组并排，方便一眼比较窗口差异 */
export function goldPercentileOption(theme: ChartTheme): EChartsOption {
  const windows = ['1y', '3y', '10y']
  return {
    animation: false,
    grid: { left: 96, right: 40, top: 26, bottom: 22 },
    tooltip: tooltip(theme, 0),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: theme.text, fontSize: 9, formatter: '{value}%' },
      splitLine: { lineStyle: { color: theme.grid } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: GOLD_PERCENTILES.map(item => item.label),
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    series: windows.map((window, index) => ({
      name: window,
      type: 'bar' as const,
      barWidth: 8,
      itemStyle: { color: seriesColor(index), borderRadius: 2 },
      label: {
        show: true,
        position: 'right' as const,
        color: theme.text,
        fontSize: 9,
        formatter: '{c}%',
      },
      data: GOLD_PERCENTILES.map(item => item.values.find(value => value.window === window)?.value ?? 0),
    })),
  }
}

/** 3. 全球地上黄金存量结构：环形图（金饰/投资/央行/其他） */
export function goldStockStructureOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 11 },
      formatter: '{b}：{c}%',
    },
    legend: {
      bottom: 0,
      textStyle: { color: theme.text, fontSize: 10 },
      itemWidth: 10,
      itemHeight: 6,
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: theme.border, borderWidth: 1 },
        label: { color: theme.textStrong, fontSize: 10, formatter: '{b} {d}%' },
        labelLine: { lineStyle: { color: theme.border } },
        data: GOLD_STOCK_STRUCTURE.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: seriesColor(index) },
        })),
      },
    ],
  }
}

/** 4. 机会成本：6 只 ETF 归一化到 100 的对比曲线 */
export function goldOpportunityOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 46, right: 18, top: 34, bottom: 26 },
    tooltip: tooltip(theme),
    legend: {
      top: 0,
      textStyle: { color: theme.text, fontSize: 10 },
      itemWidth: 10,
      itemHeight: 6,
    },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '起点 = 100'),
    series: GOLD_OPPORTUNITY_SERIES.map((item, index) => ({
      name: item.label,
      type: 'line' as const,
      showSymbol: false,
      lineStyle: { width: 1.3, color: seriesColor(index) },
      itemStyle: { color: seriesColor(index) },
      data: item.points,
    })),
  }
}

/** 5. 财政与信用：左轴美国国债总规模（万亿美元）＋ 右轴美元储备占比（%） */
export function goldFiscalOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 52, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: [
      valueAxis(theme, '万亿美元'),
      valueAxis(theme, '美元储备占比 %', { showSplitLine: false }),
    ],
    series: [
      {
        name: '美国国债总规模',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(4) },
        itemStyle: { color: seriesColor(4) },
        areaStyle: { opacity: 0.1, color: seriesColor(4) },
        data: GOLD_FISCAL_DEBT_POINTS,
      },
      {
        name: '美元储备占比（IMF COFER）',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 1.3, color: seriesColor(5) },
        itemStyle: { color: seriesColor(5) },
        data: GOLD_FISCAL_RESERVE_POINTS,
      },
    ],
  }
}

/** 6. 风险温度：管理基金净多 vs Swap Dealers 净头寸的镜像关系（同一数值轴，正负分居上下） */
export function goldRiskMirrorOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 58, right: 22, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 0),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: {
      ...valueAxis(theme, '手'),
      axisLabel: { color: theme.text, fontSize: 9, formatter: (value: number) => `${Math.round(value / 1000)}k` },
    },
    series: [
      {
        name: '管理基金净多头',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: UP },
        itemStyle: { color: UP },
        data: GOLD_RISK_MANAGED_MONEY,
      },
      {
        name: 'Swap Dealers 净头寸',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: DOWN },
        itemStyle: { color: DOWN },
        data: GOLD_RISK_SWAP_DEALERS,
      },
      {
        // 零轴参照线：没有它看不出「镜像」是相对零轴翻转的
        name: '零轴',
        type: 'line',
        silent: true,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dashed', color: theme.border },
        // 零轴参照线横跨整段样本：起点取 COT 序列的第一天，避免另算一个日期
        data: [
          [GOLD_RISK_MANAGED_MONEY[0][0], 0],
          [GOLD_RISK_MANAGED_MONEY[GOLD_RISK_MANAGED_MONEY.length - 1][0], 0],
        ],
        legendHoverLink: false,
      },
    ],
  }
}
