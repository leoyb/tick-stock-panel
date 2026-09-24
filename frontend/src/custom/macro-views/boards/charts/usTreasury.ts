// 美债看板各面板的 ECharts option 构造函数（与 charts/gold.ts 同一组织方式）。
// 为什么把 option 单独放这里：option 要以 useChartTheme() 的颜色重建，
// 抽出来后页面组件只关心「哪个面板画哪张图」，版式不会被上百行的配置对象淹没。
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { DOWN, GOLD, UP, seriesColor } from '../../lib/palette'
import {
  RED_QUEEN_DEBT_GROWTH_FINAL,
  RED_QUEEN_GDP_GROWTH_FINAL,
  RED_QUEEN_YEARS,
  US_CLOCK_KPIS,
  US_DEFICIT_ALT_DATE,
  US_DEFICIT_ALT_READING,
  US_DEFICIT_POINTS,
  US_DEBT_GDP_RATIO,
  US_DEBT_GDP_TODAY_POINTS,
  US_DEBT_GDP_WAR_POINTS,
  US_FED_RESERVES,
  US_FED_RRP,
  US_FED_TGA,
  US_FLOW_LINKS,
  US_FLOW_NODES,
  US_HOLDERS_STRUCTURE,
  US_INTEREST_BARS,
  US_MATURITY_BARS,
  US_MATURITY_PEAK_YEAR,
  US_PANEL_COUNT_BARS,
} from '../../mock/usTreasury'

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

function categoryAxis(theme: ChartTheme) {
  return {
    type: 'category' as const,
    axisLabel: { color: theme.text, fontSize: 10 },
    axisLine: { lineStyle: { color: theme.border } },
    axisTick: { show: false },
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
    valueFormatter: (value: unknown) => Number(value).toFixed(digits),
  }
}

function itemTooltip(theme: ChartTheme) {
  return {
    trigger: 'item' as const,
    confine: true,
    backgroundColor: theme.tooltipBg,
    borderColor: theme.tooltipBorder,
    textStyle: { color: theme.tooltipText, fontSize: 11 },
  }
}

/** 1. 国债时钟：债务/GDP 仪表盘（0→150%，指针 122.6） */
export function usDebtGaugeOption(theme: ChartTheme): EChartsOption {
  // 正值按约定用红系，但这里换 #f59e0b 警示色：读数不是涨跌，避免与「红涨绿跌」混淆
  const warn = '#f59e0b'
  return {
    animation: false,
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 150,
        // 量程刻度 50% 一档，和「3% 警戒线」「100% 分界」这类整数参照对齐
        splitNumber: 3,
        itemStyle: { color: warn },
        progress: { show: true, width: 12 },
        pointer: { length: '58%', width: 4, itemStyle: { color: warn } },
        axisLine: { lineStyle: { width: 12, color: [[1, theme.grid]] } },
        axisTick: { distance: -12, splitNumber: 5, lineStyle: { color: theme.border, width: 1 } },
        splitLine: { distance: -12, length: 12, lineStyle: { color: theme.border, width: 1 } },
        axisLabel: { distance: 18, color: theme.text, fontSize: 9 },
        title: { show: false },
        detail: {
          valueAnimation: false,
          formatter: '{value}%',
          color: theme.textStrong,
          fontSize: 18,
          offsetCenter: [0, '62%'],
        },
        data: [{ value: US_DEBT_GDP_RATIO, name: '债务/GDP' }],
      },
    ],
  }
}

/** 2. 债务/GDP 长期趋势：二战后（降）vs 今天（升）两段折线 */
export function usDebtGdpOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 46, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 1),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '债务/GDP %'),
    series: [
      {
        name: '二战后（1946→1981）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: DOWN },
        itemStyle: { color: DOWN },
        data: US_DEBT_GDP_WAR_POINTS,
      },
      {
        name: '今天（2008→2026）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: UP },
        itemStyle: { color: UP },
        areaStyle: { opacity: 0.08, color: UP },
        data: US_DEBT_GDP_TODAY_POINTS,
      },
    ],
  }
}

/** 3. 联邦赤字趋势与赤字率：折线 + 平衡线/警戒线 + 两个标注点（-5.8 与 -2.4%） */
export function usDeficitOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 46, right: 24, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 1),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '赤字/GDP %'),
    series: [
      {
        name: '赤字/GDP',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(3) },
        itemStyle: { color: seriesColor(3) },
        areaStyle: { opacity: 0.08, color: seriesColor(3) },
        data: US_DEFICIT_POINTS,
        markLine: {
          symbol: 'none',
          silent: true,
          lineStyle: { width: 1, type: 'dashed' },
          label: { color: theme.text, fontSize: 9, position: 'insideEndTop' },
          data: [
            // y=0 平衡线：预算平衡的分界
            { yAxis: 0, lineStyle: { color: theme.border }, label: { formatter: '平衡线 0%' } },
            // y=-3 警戒线：欧盟《马斯特里赫特条约》3% 赤字率标准
            { yAxis: -3, lineStyle: { color: '#f59e0b' }, label: { formatter: '警戒线 -3%', color: '#f59e0b' } },
          ],
        },
        markPoint: {
          symbolSize: 44,
          label: { color: '#fff', fontSize: 9 },
          itemStyle: { color: seriesColor(3) },
          data: [
            { type: 'min', name: '赤字/GDP -5.8' },
            // 整理稿里另一处读数「赤字/GDP：-2.4%」（口径/年份不同，照抄标注）
            {
              coord: [US_DEFICIT_ALT_DATE, US_DEFICIT_ALT_READING],
              name: '赤字/GDP：-2.4%',
              symbolSize: 40,
            },
          ],
        },
      },
    ],
  }
}

/** 4. 2025 年美国财政支出流向：桑基图（左收入 → 中联邦总收入 → 右支出） */
export function usFlowOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    tooltip: {
      ...itemTooltip(theme),
      formatter: (params: unknown) => {
        const p = params as { dataType?: string; name?: string; value?: unknown }
        if (p.dataType === 'edge') {
          return `${p.name ?? ''}<br/>${Number(p.value).toFixed(2)} 万亿美元`
        }
        return `${p.name ?? ''}`
      },
    },
    series: [
      {
        type: 'sankey',
        left: 12,
        right: 96,
        top: 12,
        bottom: 12,
        nodeWidth: 14,
        nodeGap: 10,
        // 环形引用会把布局卡死；本图严格单向，关掉只为防御。
        // circulatory 在 echarts 的 TS 类型里缺声明，只能以字面量断言绕过（EChartsOption 的 series
        // 联合类型收窄后不含该字段），运行时 ECharts 是认的。
        ...({ circulatory: false } as object),
        // label 放右侧节点外侧，中文节点名不与流线重叠
        label: { color: theme.textStrong, fontSize: 10, position: 'right' },
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', opacity: 0.35, curveness: 0.5 },
        itemStyle: { borderColor: theme.border, borderWidth: 1 },
        data: US_FLOW_NODES.map(node => ({ name: node.name, itemStyle: { color: node.color } })),
        links: US_FLOW_LINKS.map(link => ({
          source: link.source,
          target: link.target,
          value: link.value,
        })),
      },
    ],
  }
}

/** 5. 美债每年到期规模：2026→2035 十根柱，峰值 7.2 标注 */
export function usMaturityOption(theme: ChartTheme): EChartsOption {
  const peak = US_MATURITY_BARS.find(bar => bar.year === US_MATURITY_PEAK_YEAR)
  return {
    animation: false,
    grid: { left: 52, right: 20, top: 34, bottom: 26 },
    tooltip: tooltip(theme, 1),
    xAxis: {
      ...categoryAxis(theme),
      data: US_MATURITY_BARS.map(bar => String(bar.year)),
    },
    yAxis: valueAxis(theme, '万亿美元'),
    series: [
      {
        name: '到期规模',
        type: 'bar',
        barWidth: '52%',
        itemStyle: { color: GOLD, borderRadius: [3, 3, 0, 0] },
        data: US_MATURITY_BARS.map(bar => ({
          value: bar.value,
          // 只有峰值那根柱换警示色并标读数，其余保持金色——强调「$7.2T」这个读数
          itemStyle: bar.year === US_MATURITY_PEAK_YEAR ? { color: '#f59e0b', borderRadius: [3, 3, 0, 0] } : undefined,
        })),
        label: {
          show: true,
          position: 'top',
          color: theme.text,
          fontSize: 9,
          // 只给峰值标数值，其余柱不标：十根柱全标会互相打架
          formatter: (params: unknown) => {
            const p = params as { dataIndex: number }
            return US_MATURITY_BARS[p.dataIndex]?.year === US_MATURITY_PEAK_YEAR ? `${peak?.value}T` : ''
          },
        },
      },
    ],
  }
}

/** 6. 各类国债利息支出构成（2025）：横向条形图，Non-Marketable 为 0 也要露出行 */
export function usInterestOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 128, right: 56, top: 16, bottom: 22 },
    tooltip: tooltip(theme, 0),
    xAxis: {
      type: 'value',
      axisLabel: { color: theme.text, fontSize: 9 },
      splitLine: { lineStyle: { color: theme.grid } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: US_INTEREST_BARS.map(bar => bar.name),
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    series: [
      {
        name: '利息支出（十亿美元）',
        type: 'bar',
        barWidth: 12,
        itemStyle: { color: GOLD, borderRadius: [0, 2, 2, 0] },
        label: {
          show: true,
          position: 'right',
          color: theme.text,
          fontSize: 9,
          formatter: (params: unknown) => `$${Number((params as { value: number }).value)}B`,
        },
        data: US_INTEREST_BARS.map(bar => bar.value),
      },
    ],
  }
}

/** 7. 美联储资产负债表三账户：准备金 / TGA / ON RRP 三条线（2003→2026） */
export function usFedAccountsOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 46, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 2),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: timeAxis(theme),
    yAxis: valueAxis(theme, '万亿美元'),
    series: [
      {
        name: '银行准备金',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(0) },
        itemStyle: { color: seriesColor(0) },
        data: US_FED_RESERVES,
      },
      {
        name: 'TGA（财政部账户）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.3, color: seriesColor(3) },
        itemStyle: { color: seriesColor(3) },
        data: US_FED_TGA,
      },
      {
        name: 'ON RRP（逆回购）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.6, color: seriesColor(1) },
        itemStyle: { color: seriesColor(1) },
        data: US_FED_RRP,
      },
    ],
  }
}

/** 8. 红皇后跑步机：柱=债务增速，折线=名义 GDP 增速（2003→2026） */
export function usRedQueenOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 44, right: 20, top: 30, bottom: 26 },
    tooltip: tooltip(theme, 1),
    legend: { top: 0, textStyle: { color: theme.text, fontSize: 10 }, itemWidth: 10, itemHeight: 6 },
    xAxis: {
      ...categoryAxis(theme),
      data: RED_QUEEN_YEARS.map(year => String(year)),
    },
    yAxis: valueAxis(theme, '增速 %'),
    series: [
      {
        name: '债务增速（年末值同比）',
        type: 'bar',
        barWidth: '58%',
        itemStyle: { color: UP, opacity: 0.75, borderRadius: [2, 2, 0, 0] },
        data: RED_QUEEN_DEBT_GROWTH_FINAL.map(row => row.value),
      },
      {
        name: '名义 GDP 增速（含通胀）',
        type: 'line',
        showSymbol: false,
        lineStyle: { width: 1.8, color: GOLD },
        itemStyle: { color: GOLD },
        data: RED_QUEEN_GDP_GROWTH_FINAL.map(row => row.value),
      },
    ],
  }
}

/** 9. 美债持有结构（国内）：环形图，八类国内持有者 */
export function usHoldersOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    tooltip: {
      ...itemTooltip(theme),
      formatter: '{b}：{c}%',
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: theme.text, fontSize: 10 },
      itemWidth: 10,
      itemHeight: 6,
    },
    series: [
      {
        type: 'pie',
        radius: ['46%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: theme.border, borderWidth: 1 },
        label: { color: theme.textStrong, fontSize: 10, formatter: '{b} {d}%' },
        labelLine: { lineStyle: { color: theme.border } },
        data: US_HOLDERS_STRUCTURE.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: seriesColor(index) },
        })),
      },
    ],
  }
}

/** 10. 面板清单与口径：分区面板数柱状图（结构表用 DataTable 展示） */
export function usPanelCountOption(theme: ChartTheme): EChartsOption {
  return {
    animation: false,
    grid: { left: 84, right: 40, top: 12, bottom: 22 },
    tooltip: tooltip(theme, 0),
    xAxis: {
      type: 'value',
      axisLabel: { color: theme.text, fontSize: 9 },
      splitLine: { lineStyle: { color: theme.grid } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: US_PANEL_COUNT_BARS.map(row => row.zone),
      axisLabel: { color: theme.text, fontSize: 10 },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    series: [
      {
        name: '面板数',
        type: 'bar',
        barWidth: 10,
        itemStyle: { color: GOLD, borderRadius: [0, 2, 2, 0] },
        label: {
          show: true,
          position: 'right',
          color: theme.text,
          fontSize: 9,
          formatter: '{c} 个',
        },
        data: US_PANEL_COUNT_BARS.map(row => row.count),
      },
    ],
  }
}

/** 供面板脚注引用：国债时钟 KPI 数量（页眉 meta 用） */
export const US_CLOCK_KPI_COUNT = US_CLOCK_KPIS.length
