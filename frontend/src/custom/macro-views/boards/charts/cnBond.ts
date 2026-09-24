// 中国债券看板各面板的 ECharts option 构造函数。
// 为什么把 option 单独放这里：option 依赖 useChartTheme() 的画布色（明/暗主题切换时整体重建），
// 页面组件里堆 7 个上百行的对象会看不清版式；抽出来后页面只关心「哪个面板画哪张图」。
// 全部数据来自 ../mock/cnBond.ts，这里不做任何数值加工，只决定「怎么画」。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { GOLD, seriesColor } from '../../lib/palette'
import {
  CN_10Y,
  CN_COFER_CNY,
  CN_COFER_USD,
  CN_CURVE_AXIS,
  CN_CURVE_FAMILY,
  CN_CURVE_LATEST_YEAR,
  CN_DR007,
  CN_LPR_EVENTS,
  CN_LPR_STEPS,
  CN_OMO_DAYS,
  CN_OMO_RATE_STEPS,
  CN_R007,
  CN_R007_DIFF,
  CN_SPREAD_10Y_1Y,
  CN_SPREAD_10Y_2Y,
  CN_SPREAD_30Y_10Y,
  CN_SPREAD_5Y_2Y,
  CN_SPREAD_US_10Y,
  CN_US_SPREAD,
} from '../../mock/cnBond'

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
    // 统一小数位：默认格式化会出现浮点尾巴（同黄金看板的做法）
    valueFormatter: (value: unknown) => Number(value).toFixed(digits),
  }
}

/** 历史曲线的弱化灰：两条主题下都不刺眼的中性灰，透明度按年份由远及近增强 */
const HIST_GRAY = '#71717A'

/** 1. 全期限国债收益率与形态演变：横轴期限（类别轴），每一年年末一条曲线 */
export function cnCurveFamilyOption(theme: ChartTheme): EChartsOption {
  // 13 条曲线放图例太挤，只靠「最新一条金色加粗」的视觉层级区分，年份见 tooltip
  const historyCount = CN_CURVE_FAMILY.length - 1
  return {
    animation: false,
    grid: { left: 46, right: 20, top: 20, bottom: 26 },
    tooltip: tooltip(theme),
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: CN_CURVE_AXIS,
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: valueAxis(theme, '收益率 %'),
    series: CN_CURVE_FAMILY.map((item, index) => {
      const latest = item.year === CN_CURVE_LATEST_YEAR
      // 越近的历史年份越实、越远的越淡：一眼能看出「曲线整体下移」的演变方向
      const fade = 0.22 + 0.6 * (index / Math.max(1, historyCount - 1))
      return {
        name: `${item.year} 年末`,
        type: 'line' as const,
        showSymbol: false,
        lineStyle: {
          width: latest ? 2.2 : 1,
          color: latest ? GOLD : HIST_GRAY,
          opacity: latest ? 1 : fade,
        },
        itemStyle: { color: latest ? GOLD : HIST_GRAY },
        emphasis: { focus: 'none' as const },
        data: item.values,
      }
    }),
  }
}

/** 2a. 期限利差：10Y-1Y / 10Y-2Y / 30Y-10Y / 5Y-2Y 四条线（time 轴，%） */
export function cnTermSpreadOption(theme: ChartTheme): EChartsOption {
  const series = [
    { name: '10Y-1Y', data: CN_SPREAD_10Y_1Y },
    { name: '10Y-2Y', data: CN_SPREAD_10Y_2Y },
    { name: '30Y-10Y', data: CN_SPREAD_30Y_10Y },
    { name: '5Y-2Y', data: CN_SPREAD_5Y_2Y },
  ]
  return {
    animation: false,
    grid: { left: 50, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '利差 %'),
    series: series.map((item, index) => ({
      name: item.name,
      type: 'line' as const,
      showSymbol: false,
      lineStyle: { width: 1.4, color: seriesColor(index) },
      itemStyle: { color: seriesColor(index) },
      data: item.data,
    })),
  }
}

/** 2b. 中美利差：左轴中/美 10Y 收益率双线，右轴中美利差（虚线，百分点） */
export function cnUsSpreadOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 56, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: [
      valueAxis(theme, '收益率 %'),
      valueAxis(theme, '利差 百分点', { showSplitLine: false }),
    ],
    series: [
      {
        name: '中国 10Y',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: GOLD },
        itemStyle: { color: GOLD },
        data: CN_10Y,
      },
      {
        name: '美国 10Y',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.4, color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        data: CN_SPREAD_US_10Y,
      },
      {
        name: '中美利差（中国 − 美国）',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 1.3, type: 'dashed', color: seriesColor(2) },
        itemStyle: { color: seriesColor(2) },
        data: CN_US_SPREAD,
      },
    ],
  }
}

/** 3. 资金面：左轴 DR007/R007（%），右轴 R007−DR007 分层（百分点，面积） */
export function cnFundingOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 56, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: [
      valueAxis(theme, '利率 %'),
      valueAxis(theme, '分层 百分点', { showSplitLine: false }),
    ],
    series: [
      {
        name: 'DR007',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: GOLD },
        itemStyle: { color: GOLD },
        data: CN_DR007,
      },
      {
        name: 'R007',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.3, color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        data: CN_R007,
      },
      {
        name: 'R007 − DR007',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 1, color: seriesColor(2) },
        itemStyle: { color: seriesColor(2) },
        areaStyle: { opacity: 0.18, color: seriesColor(2) },
        data: CN_R007_DIFF,
      },
    ],
  }
}

/**
 * 4. 7 天逆回购：柱状为中标量（亿元，未开展日画 0 并标灰），右轴阶梯线为中标利率（%）。
 * 横轴用类别轴（60 个交易日），利率折点按「不晚于该日的最后一次调整」铺到同一网格上，
 * 这样柱与阶梯线天然逐日对齐，不需要双轴时间轴的宽度估算。
 */
function omoRateOn(date: string): number {
  let rate = CN_OMO_RATE_STEPS[0][1]
  for (const [stepDate, value] of CN_OMO_RATE_STEPS) {
    if (stepDate <= date) rate = value
    else break
  }
  return rate
}

export function cnOmoOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 54, right: 50, top: 30, bottom: 26 },
    tooltip: {
      ...tooltip(theme),
      // 柱为量（整数亿）、线为价（两位小数），一个 valueFormatter 表达不了两种口径，这里在 series 里各自 format
      valueFormatter: undefined,
    },
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: {
      type: 'category',
      data: CN_OMO_DAYS.map(day => day.date),
      axisLabel: { color: theme.text, fontSize: 9, hideOverlap: true },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    yAxis: [
      valueAxis(theme, '中标量 亿元'),
      valueAxis(theme, '中标利率 %', { showSplitLine: false }),
    ],
    series: [
      {
        name: '中标量（亿元）',
        type: 'bar',
        barWidth: '62%',
        // 未开展日画 0 并标灰：量＝力度，零操作本身也是信息
        data: CN_OMO_DAYS.map(day => ({
          value: day.amountYi,
          itemStyle: { color: day.skipped ? HIST_GRAY : GOLD, opacity: day.skipped ? 0.5 : 0.85 },
        })),
      },
      {
        name: '中标利率（%）',
        type: 'line',
        yAxisIndex: 1,
        step: 'end',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        data: CN_OMO_DAYS.map(day => omoRateOn(day.date)),
        tooltip: { valueFormatter: (value: unknown) => `${Number(value).toFixed(2)}%` },
      },
    ],
  }
}

/** 5. LPR 1Y：阶梯线（step: 'end'，调整后维持到下次调整）＋ 官方调整事件圆点 */
export function cnLprOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '利率 %'),
    series: [
      {
        name: 'LPR 1Y',
        type: 'line',
        step: 'end',
        showSymbol: false,
        lineStyle: { width: 1.8, color: GOLD },
        itemStyle: { color: GOLD },
        data: CN_LPR_STEPS,
      },
      {
        name: '调整事件',
        type: 'scatter',
        symbolSize: 6,
        itemStyle: { color: seriesColor(1) },
        data: CN_LPR_EVENTS.map(event => [event.date, event.ratePct]),
      },
    ],
  }
}

/** 6. 人民币占比 / IMF COFER：左轴人民币占比（%，面积），右轴美元占比（%，虚线对照） */
export function cnCoferOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 56, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: [
      valueAxis(theme, '人民币 %'),
      valueAxis(theme, '美元 %', { showSplitLine: false }),
    ],
    series: [
      {
        name: '人民币占比',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: GOLD },
        itemStyle: { color: GOLD },
        areaStyle: { opacity: 0.12, color: GOLD },
        data: CN_COFER_CNY,
      },
      {
        name: '美元占比',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 1.3, type: 'dashed', color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        data: CN_COFER_USD,
      },
    ],
  }
}
