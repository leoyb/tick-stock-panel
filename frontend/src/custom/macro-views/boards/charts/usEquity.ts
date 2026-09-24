// 美股看板各面板的 ECharts option 构造函数。
// 为什么把 option 单独放这里：option 依赖 useChartTheme() 的画布色（明/暗主题切换时整体重建），
// 页面组件里堆 6 个上百行的对象会看不清版式；抽出来后页面只关心「哪个面板画哪张图」。
// 全部数据来自 ../mock/usEquity.ts，这里不做任何数值加工，只决定「怎么画」。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { DOWN, UP, seriesColor } from '../../lib/palette'
import {
  US_ANNUAL_BARS,
  US_BUFFETT_POINTS,
  US_CENTURY_POINTS,
  US_DECOMPOSE_BARS,
  US_DRAWDOWN_POINTS,
  US_RECESSION_RANGES,
  US_VIX_MARK_RANGES,
  US_VIX_POINTS,
} from '../../mock/usEquity'

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
    // 统一小数位：默认格式化会出现浮点尾巴（同黄金/美债看板的做法）
    valueFormatter: (value: unknown) => `${Number(value).toFixed(digits)}%`,
  }
}

/** 1. 标普500 百年走势：对数轴长线（1914 → 2026）＋ 衰退阴影 markArea（NBER/FRED 灰带） */
export function usCenturyOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 60, right: 20, top: 30, bottom: 26 },
    tooltip: {
      ...tooltip(theme),
      // 绝对点位不带 % 后缀，单独覆盖
      valueFormatter: (value: unknown) => Number(value).toLocaleString('en-US'),
    },
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: {
      ...valueAxis(theme, '点位（对数）'),
      // 对数轴看复利斜率：价格看绝对点位，对数看增速
      type: 'log',
      min: 40,
      logBase: 10,
      axisLabel: { color: theme.text, fontSize: 9, formatter: (value: number) => value.toLocaleString('en-US') },
      splitLine: { show: true, lineStyle: { color: theme.grid } },
    },
    series: [
      {
        name: '标普500',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(0) },
        itemStyle: { color: seriesColor(0) },
        areaStyle: { opacity: 0.08, color: seriesColor(0) },
        // 淡灰色衰退区间挂在主 series 上（series markArea 与 time 轴自动对齐）
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(148,163,184,0.12)' },
          label: { show: false },
          data: US_RECESSION_RANGES.map(([from, to]) => [{ xAxis: from }, { xAxis: to }]),
        },
        data: US_CENTURY_POINTS,
      },
    ],
  }
}

/** 2. 标普500 年度涨跌幅：柱按值判色（红涨绿跌），其余年份为演示形状（见 mock 层注释） */
export function usAnnualOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 44, right: 16, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 2),
    xAxis: {
      type: 'category',
      data: US_ANNUAL_BARS.map(bar => String(bar.year)),
      axisLabel: { color: theme.text, fontSize: 9, hideOverlap: true },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    yAxis: valueAxis(theme, '%'),
    series: [
      {
        name: '年度涨跌幅',
        type: 'bar',
        barWidth: '62%',
        // 正柱红 / 负柱绿（国内习惯）：按值逐柱给 itemStyle，避免依赖回调参数的类型签名
        data: US_ANNUAL_BARS.map(bar => ({
          value: bar.value,
          itemStyle: { color: bar.value >= 0 ? UP : DOWN },
        })),
      },
    ],
  }
}


/** 3. 标普500 回报分解：堆叠柱（价格/股息/净回购）＋ 折线（总回报 = 三段之和） */
export function usDecomposeOption(theme: ChartTheme): EChartsOption {
  const years = US_DECOMPOSE_BARS.map(bar => String(bar.year))
  const stack = [
    { key: 'price' as const, name: '价格回报', color: seriesColor(0) },
    { key: 'dividend' as const, name: '股息回报', color: seriesColor(1) },
    { key: 'buyback' as const, name: '净回购收益率', color: seriesColor(2) },
  ]
  return {
    animation: false,
    grid: { left: 44, right: 16, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 2),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: {
      type: 'category',
      data: years,
      axisLabel: { color: theme.text, fontSize: 9, hideOverlap: true },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    yAxis: valueAxis(theme, '%'),
    series: [
      ...stack.map(part => ({
        name: part.name,
        type: 'bar' as const,
        stack: 'total',
        barWidth: '62%',
        itemStyle: { color: part.color, opacity: 0.85 },
        data: US_DECOMPOSE_BARS.map(bar => bar[part.key]),
      })),
      {
        name: '总回报',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: theme.textStrong },
        itemStyle: { color: theme.textStrong },
        data: US_DECOMPOSE_BARS.map(bar => bar.total),
      },
    ],
  }
}

/** 4. 纳斯达克100 自高点回撤：负值面积图（起点为 0 的负区），谷底精确落在 -82.9% */
export function usDrawdownOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 44, right: 16, top: 20, bottom: 26 },
    tooltip: tooltip(theme, 1),
    xAxis: timeAxis(theme),
    yAxis: {
      ...valueAxis(theme, '距高点 %'),
      min: -90,
      max: 0,
      axisLabel: { color: theme.text, fontSize: 9, formatter: '{value}%' },
    },
    series: [
      {
        name: '纳斯达克100 自高点回撤',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.3, color: DOWN },
        itemStyle: { color: DOWN },
        // 起点为 0 的负区：origin 定在 0，填充只出现在曲线下方
        areaStyle: { origin: 'start', opacity: 0.16, color: DOWN },
        data: US_DRAWDOWN_POINTS,
      },
    ],
  }
}

/** 5. 恐慌指数与标普500：左轴标普500（对数），右轴 VIX；VIX > 30 的两段恐慌用 markArea 红带标出 */
export function usVixOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 56, right: 46, top: 30, bottom: 26 },
    tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: [
      {
        ...valueAxis(theme, '点位（对数）'),
        type: 'log',
        min: 20,
        logBase: 10,
        axisLabel: { color: theme.text, fontSize: 9, formatter: (value: number) => value.toLocaleString('en-US') },
        splitLine: { show: true, lineStyle: { color: theme.grid } },
      },
      {
        ...valueAxis(theme, 'VIX', { showSplitLine: false }),
        min: 0,
        max: 90,
      },
    ],
    series: [
      {
        name: '标普500',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.5, color: seriesColor(0) },
        itemStyle: { color: seriesColor(0) },
        data: US_CENTURY_POINTS,
      },
      {
        name: 'VIX',
        type: 'line',
        yAxisIndex: 1,
        showSymbol: false,
        lineStyle: { width: 1.2, color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        // 红带挂在 VIX series 上：markArea 与「VIX > 30」的两段恐慌窗口语义对应
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(239,68,68,0.08)' },
          label: { show: false },
          data: US_VIX_MARK_RANGES.map(([from, to]) => [{ xAxis: from }, { xAxis: to }]),
        },
        data: US_VIX_POINTS,
      },
    ],
  }
}

/** 6. 巴菲特指标（改良版）：单折线，1960 → 2026（季度末终点）；演示形状，不标具体读数 */
export function usBuffettOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 50, right: 16, top: 20, bottom: 26 },
    tooltip: {
      ...tooltip(theme),
      // 估值比率不带 % 后缀重复，tooltip 里补一次即可
      valueFormatter: (value: unknown) => `${Number(value).toFixed(2)}%`,
    },
    xAxis: timeAxis(theme),
    yAxis: {
      ...valueAxis(theme, '估值比率 %'),
      max: 250,
      axisLabel: { color: theme.text, fontSize: 9, formatter: '{value}%' },
    },
    series: [
      {
        name: '改良版 TMC/（GDP+TA）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(0) },
        itemStyle: { color: seriesColor(0) },
        areaStyle: { opacity: 0.1, color: seriesColor(0) },
        data: US_BUFFETT_POINTS,
      },
    ],
  }
}
