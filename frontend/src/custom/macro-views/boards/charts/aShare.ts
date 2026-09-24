// A股看板各面板的 ECharts option 构造函数。
// 为什么把 option 单独放这里（同黄金/中国债券看板的做法）：option 依赖 useChartTheme() 的
// 画布色（明/暗主题切换时整体重建），页面组件里堆 7 个上百行的对象会看不清版式；
// 抽出来后页面只关心「哪个面板画哪张图」。
// 全部数据来自 ../../mock/aShare.ts，这里不做任何数值加工，只决定「怎么画」。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { DOWN, GOLD, UP, seriesColor } from '../../lib/palette'
import {
  A_SHARE_ANNUAL,
  A_SHARE_DISTRIBUTION,
  A_SHARE_DRAWDOWN,
  A_SHARE_MARGIN,
  A_SHARE_MARGIN_FIN,
  A_SHARE_RISK_POINTS,
  A_SHARE_TREND,
  A_SHARE_VOLATILITY_20D,
  A_SHARE_VOLATILITY_60D,
} from '../../mock/aShare'

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
    // 统一小数位：默认格式化会出现浮点尾巴（同黄金/中国债券看板的做法）
    valueFormatter: (value: unknown) => Number(value).toFixed(digits),
  }
}

/** 2. 长历史走势：上证综指 1993 → 2026，对数轴（对数坐标下相同垂直距离 = 相同涨跌幅） */
export function aShareTrendOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 0),
    xAxis: timeAxis(theme),
    yAxis: {
      type: 'log',
      name: '点位（对数）',
      nameTextStyle: { color: theme.text, fontSize: 9 },
      axisLabel: { color: theme.text, fontSize: 9 },
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: theme.grid } },
    },
    series: [
      {
        name: '上证综指（演示形状）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: GOLD },
        itemStyle: { color: GOLD },
        areaStyle: { opacity: 0.08, color: GOLD },
        data: A_SHARE_TREND,
      },
    ],
  }
}

/** 3. 年度回报：1993 → 2026 柱状，正红负绿（2006/2008 为整理稿强制锚点） */
export function aShareAnnualOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    xAxis: {
      type: 'category',
      data: A_SHARE_ANNUAL.map(point => String(point.year)),
      axisLabel: { color: theme.text, fontSize: 9, hideOverlap: true },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    yAxis: valueAxis(theme, '涨跌幅 %'),
    series: [
      {
        name: '上证综指年度涨跌幅',
        type: 'bar',
        barWidth: '68%',
        data: A_SHARE_ANNUAL.map(point => ({
          value: point.value,
          itemStyle: { color: point.value >= 0 ? UP : DOWN },
        })),
        tooltip: { valueFormatter: (value: unknown) => `${Number(value).toFixed(2)}%` },
      },
    ],
  }
}

/** 5. 涨跌幅分布：8 桶柱状，负桶绿、正桶红（桶高为演示值） */
export function aShareDistributionOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 40, right: 20, top: 30, bottom: 26 },
    tooltip: {
      ...tooltip(theme, 0),
      valueFormatter: (value: unknown) => `${Number(value)} 年`,
    },
    xAxis: {
      type: 'category',
      data: A_SHARE_DISTRIBUTION.map(bucket => bucket.label),
      axisLabel: { color: theme.text, fontSize: 9, hideOverlap: true },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    yAxis: valueAxis(theme, '年数'),
    series: [
      {
        name: '年度涨跌幅落在该桶的年数',
        type: 'bar',
        barWidth: '68%',
        data: A_SHARE_DISTRIBUTION.map(bucket => ({
          value: bucket.count,
          itemStyle: { color: bucket.sign > 0 ? UP : DOWN },
        })),
      },
    ],
  }
}

/** 6. 历史回撤（水下曲线）：恒在 0 轴下方或等于 0，最深 -71.98%（2007-08 段） */
export function aShareDrawdownOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 20, top: 30, bottom: 26 },
    tooltip: {
      ...tooltip(theme),
      valueFormatter: (value: unknown) => `${Number(value).toFixed(2)}%`,
    },
    xAxis: timeAxis(theme),
    yAxis: {
      ...valueAxis(theme, '距历史高点 %'),
      max: 0,
      min: -80,
    },
    series: [
      {
        name: '上证综指回撤（演示形状）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.4, color: DOWN },
        itemStyle: { color: DOWN },
        areaStyle: { opacity: 0.18, color: DOWN },
        data: A_SHARE_DRAWDOWN,
        markPoint: {
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: { color: DOWN },
          label: { color: theme.textStrong, fontSize: 10, formatter: '-71.98%', position: 'top' as const },
          data: [{ name: '最深回撤', type: 'min' as const }],
        },
      },
    ],
  }
}

/** 7. 实现波动率：20 日 / 60 日年化双线（2005 → 2026，2015 段抬到 60+） */
export function aShareVolatilityOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 44, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 1),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '年化波动率 %'),
    series: [
      {
        name: '20日年化波动率',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.2, color: seriesColor(0) },
        itemStyle: { color: seriesColor(0) },
        data: A_SHARE_VOLATILITY_20D,
      },
      {
        name: '60日年化波动率',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        data: A_SHARE_VOLATILITY_60D,
      },
    ],
  }
}

/** 9. 两融杠杆：两融余额 / 融资余额双线（2014 → 2026，终点 26,463.69 亿） */
export function aShareMarginOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 60, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 0),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '亿元'),
    series: [
      {
        name: '两融余额',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: GOLD },
        itemStyle: { color: GOLD },
        data: A_SHARE_MARGIN,
      },
      {
        name: '融资余额',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.3, color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        data: A_SHARE_MARGIN_FIN,
      },
    ],
  }
}

/** 10. 长期风险收益平面：x=年化波动率、y=年化收益，气泡大小=成立时长（9 个宽基指数） */
export function aShareRiskReturnOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 40, top: 30, bottom: 30 },
    tooltip: {
      trigger: 'item' as const,
      confine: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 11 },
    },
    xAxis: { ...valueAxis(theme, '年化波动率（%）'), min: 0 },
    yAxis: { ...valueAxis(theme, '年化收益（%）'), min: 0 },
    series: [
      {
        name: '宽基指数（全历史口径）',
        type: 'scatter',
        data: A_SHARE_RISK_POINTS.map((point, index) => ({
          name: point.name,
          value: [point.vol, point.ret],
          // 气泡大小 = 样本年数（成立时间越长气泡越大）
          symbolSize: 7 + point.years * 0.9,
          itemStyle: { color: seriesColor(index), opacity: 0.7 },
          label: {
            show: true,
            formatter: point.name,
            position: 'right' as const,
            color: theme.text,
            fontSize: 9,
          },
        })),
      },
    ],
  }
}
