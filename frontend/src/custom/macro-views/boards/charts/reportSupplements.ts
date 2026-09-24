import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { DOWN, FLAT, GOLD, UP, heatColor, seriesColor } from '../../lib/palette'
import {
  A_ANNUAL_DRAWDOWN, A_FINANCING_NET, A_MONTH_RETURNS, A_MONTH_YEARS, A_PE, A_ROLLING_5Y,
  A_TURNOVER, CN_RRR, DR_BREADTH, DR_SECTOR_FLOW, DR_SENTIMENT_RATES, DR_SOUTHBOUND, DR_VOLUME, GOLD_RMB_LOG,
  LA_GOLD_REAL, LA_US_CURVES, MONTHS, US_EPS, US_ISSUANCE, US_MONTH_RETURNS,
  US_MONTH_YEARS, US_TOPOLOGY_LINKS, US_TOPOLOGY_NODES,
} from '../../mock/reportSupplements'
import { A_SHARE_ANNUAL } from '../../mock/aShare'

function tooltip(theme: ChartTheme): EChartsOption['tooltip'] {
  return { trigger: 'axis', confine: true, backgroundColor: theme.tooltipBg, borderColor: theme.tooltipBorder, textStyle: { color: theme.tooltipText, fontSize: 11 } }
}

function xTime(theme: ChartTheme) {
  return { type: 'time' as const, axisLabel: { color: theme.text, fontSize: 9, hideOverlap: true }, axisLine: { lineStyle: { color: theme.border } }, splitLine: { show: false } }
}

function xCategory(theme: ChartTheme, data: string[]) {
  return { type: 'category' as const, data, axisLabel: { color: theme.text, fontSize: 9, hideOverlap: true }, axisLine: { lineStyle: { color: theme.border } } }
}

function yValue(theme: ChartTheme, name: string, max?: number) {
  return { type: 'value' as const, name, max, nameTextStyle: { color: theme.text, fontSize: 9 }, axisLabel: { color: theme.text, fontSize: 9 }, splitLine: { lineStyle: { color: theme.grid } } }
}

function line(theme: ChartTheme, data: Array<[string, number]>, name: string, axisName: string, log = false): EChartsOption {
  return {
    animation: false, grid: { left: 55, right: 20, top: 28, bottom: 28 }, tooltip: tooltip(theme),
    xAxis: xTime(theme), yAxis: { ...yValue(theme, axisName), type: log ? 'log' : 'value' },
    series: [{ name, type: 'line', showSymbol: false, data, lineStyle: { width: 1.8, color: GOLD }, itemStyle: { color: GOLD } }],
  }
}

function heatmap(theme: ChartTheme, years: string[], matrix: number[][]): EChartsOption {
  const data = matrix.flatMap((row, y) => row.map((value, x) => ({ value: [x, y, value], itemStyle: { color: heatColor(value, -18, 18) } })))
  return {
    animation: false, grid: { left: 48, right: 12, top: 12, bottom: 50 },
    tooltip: { trigger: 'item', confine: true, backgroundColor: theme.tooltipBg, borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 11 },
      formatter: (params: unknown) => { const [x, y, v] = (params as { value: number[] }).value; return `${years[y]} · ${MONTHS[x]}：${v.toFixed(2)}%（mock）` },
    },
    visualMap: { show: false, min: -18, max: 18, inRange: { color: [DOWN, '#facc15', UP] } },
    xAxis: xCategory(theme, MONTHS),
    yAxis: { type: 'category', data: years, axisLabel: { color: theme.text, fontSize: 9 }, axisLine: { lineStyle: { color: theme.border } } },
    series: [{ type: 'heatmap', data, label: { show: false }, itemStyle: { borderColor: theme.border, borderWidth: 1 } }],
  }
}

export const goldRmbOption = (theme: ChartTheme) => line(theme, GOLD_RMB_LOG, '人民币金价', '元/克（对数）', true)
export const usEpsOption = (theme: ChartTheme) => line(theme, US_EPS, '标普500 每股收益', '美元/股')
export const usMonthlyOption = (theme: ChartTheme) => heatmap(theme, US_MONTH_YEARS, US_MONTH_RETURNS)
export const cnRrrOption = (theme: ChartTheme) => line(theme, CN_RRR, '大型金融机构存款准备金率', '%')
export const aMonthlyOption = (theme: ChartTheme) => heatmap(theme, A_MONTH_YEARS, A_MONTH_RETURNS)
export const aRollingOption = (theme: ChartTheme) => line(theme, A_ROLLING_5Y, '滚动5年年化收益', '%')
export const aPeOption = (theme: ChartTheme) => line(theme, A_PE, '沪深300 PE', '倍')
export const aTurnoverOption = (theme: ChartTheme) => line(theme, A_TURNOVER, '全市场成交额', '亿元')
export const laGoldRealOption = (theme: ChartTheme) => line(theme, LA_GOLD_REAL, '黄金实际价格', '1967年美元（对数）', true)

export function aAnnualDrawdownOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false, grid: { left: 48, right: 18, top: 28, bottom: 28 }, tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 } },
    xAxis: xCategory(theme, A_SHARE_ANNUAL.map(item => String(item.year))), yAxis: yValue(theme, '%'),
    series: [
      { name: '全年涨幅', type: 'bar', data: A_SHARE_ANNUAL.map(item => ({ value: item.value, itemStyle: { color: item.value >= 0 ? UP : DOWN } })) },
      { name: '年内最大回撤', type: 'line', data: A_ANNUAL_DRAWDOWN.map(item => item.value), showSymbol: false, lineStyle: { color: seriesColor(1), width: 1.7 }, itemStyle: { color: seriesColor(1) } },
    ],
  }
}

export function aFinancingNetOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false, grid: { left: 52, right: 15, top: 16, bottom: 28 }, tooltip: tooltip(theme),
    xAxis: xCategory(theme, A_FINANCING_NET.map(item => String(item.year))), yAxis: yValue(theme, '亿元'),
    series: [{ name: '融资净买入', type: 'bar', data: A_FINANCING_NET.map(item => ({ value: item.value, itemStyle: { color: item.value >= 0 ? UP : DOWN } })) }],
  }
}

export function usTopologyOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    tooltip: { trigger: 'item', confine: true, backgroundColor: theme.tooltipBg, borderColor: theme.tooltipBorder, textStyle: { color: theme.tooltipText } },
    series: [{ type: 'graph', layout: 'circular', circular: { rotateLabel: true }, roam: false,
      data: US_TOPOLOGY_NODES.map((name, i) => ({ name, symbolSize: i < 3 ? 46 : 36, itemStyle: { color: seriesColor(i) } })),
      links: US_TOPOLOGY_LINKS.map(([source, target]) => ({ source, target })),
      label: { show: true, position: 'right', color: theme.textStrong, fontSize: 10 },
      lineStyle: { color: theme.border, width: 1.5, curveness: 0.15 },
    }],
  }
}

export function usIssuanceOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false, grid: { left: 48, right: 18, top: 18, bottom: 28 }, tooltip: tooltip(theme),
    xAxis: xCategory(theme, US_ISSUANCE.map(item => String(item.year))), yAxis: yValue(theme, '万亿美元'),
    series: [{ name: '国债发行量', type: 'bar', data: US_ISSUANCE.map(item => item.value), itemStyle: { color: GOLD } }],
  }
}

export function laUsCurveOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false, grid: { left: 45, right: 15, top: 30, bottom: 28 }, tooltip: tooltip(theme),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 } },
    xAxis: xCategory(theme, ['1Y', '2Y', '5Y', '10Y', '30Y']), yAxis: yValue(theme, '收益率 %'),
    series: LA_US_CURVES.map((row, i) => ({ name: row.year, type: 'line' as const, data: row.values, connectNulls: false,
      lineStyle: { color: seriesColor(i), width: 1.7 }, itemStyle: { color: seriesColor(i) } })),
  }
}

export function dailyBreadthOption(theme: ChartTheme): EChartsOption {
  return { animation: false, tooltip: { trigger: 'item', confine: true }, legend: { bottom: 0, textStyle: { color: theme.text, fontSize: 10 } },
    series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'], label: { color: theme.text, formatter: '{b} {c}' },
      data: DR_BREADTH.map((item, i) => ({ ...item, itemStyle: { color: [UP, DOWN, FLAT][i] } })) }] }
}

export function dailyVolumeOption(theme: ChartTheme): EChartsOption {
  return { animation: false, grid: { left: 48, right: 14, top: 12, bottom: 28 }, tooltip: tooltip(theme),
    xAxis: xCategory(theme, DR_VOLUME.map(item => item.name)), yAxis: yValue(theme, '亿元'),
    series: [{ name: '两市成交额', type: 'bar', barWidth: '45%', data: DR_VOLUME.map((item, i) => ({ value: item.value, itemStyle: { color: i ? DOWN : GOLD } })) }] }
}

export function dailySentimentOption(theme: ChartTheme): EChartsOption {
  return { animation: false, grid: { left: 76, right: 25, top: 12, bottom: 20 }, tooltip: tooltip(theme),
    xAxis: { ...yValue(theme, '%', 100), min: 0 },
    yAxis: { type: 'category', data: DR_SENTIMENT_RATES.map(item => item.name).reverse(), axisLabel: { color: theme.text, fontSize: 10 } },
    series: [{ type: 'bar', barWidth: '48%', data: [...DR_SENTIMENT_RATES].reverse().map(item => item.value), itemStyle: { color: GOLD },
      label: { show: true, position: 'right', formatter: '{c}%', color: theme.textStrong, fontSize: 10 } }] }
}

export function dailySectorFlowOption(theme: ChartTheme): EChartsOption {
  const rows = [...DR_SECTOR_FLOW].reverse()
  return { animation: false, grid: { left: 75, right: 20, top: 14, bottom: 20 }, tooltip: tooltip(theme),
    xAxis: yValue(theme, '亿元'),
    yAxis: { type: 'category', data: rows.map(item => item.name), axisLabel: { color: theme.text, fontSize: 9 }, axisLine: { lineStyle: { color: theme.border } } },
    series: [{ name: '主力净流入', type: 'bar', data: rows.map(item => ({ value: item.value, itemStyle: { color: item.value >= 0 ? UP : DOWN } })) }] }
}

export function dailySouthboundOption(theme: ChartTheme): EChartsOption {
  return { animation: false, grid: { left: 45, right: 16, top: 16, bottom: 27 }, tooltip: tooltip(theme),
    xAxis: xTime(theme), yAxis: yValue(theme, '亿元'),
    series: [{ name: '南向净买额', type: 'bar', data: DR_SOUTHBOUND.map(item => ({ value: [item.date, item.value], itemStyle: { color: item.value >= 0 ? UP : DOWN } })) }] }
}
