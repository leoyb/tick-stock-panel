// A股看板的演示数据（数据日 2026-09-10，快照日 2026-09-11）。
// 数据来源：演示整理稿第 6 章「A股看板」逐秒 OCR 稿。
// 两条硬原则（与中国债券看板 mock/cnBond.ts 一致）：
//   1) 页面上出现的读数、口径说明与脚注逐字照抄整理稿，不做换算、不做美化，
//      这样「页面上写了什么」与「稿子上写了什么」永远能对上，便于人工复核；
//   2) 整理稿只给了区间/量级、没有逐点数值的曲线（长历史走势、水下回撤、波动率、两融），
//      一律用 lib/mock.ts 的确定性生成器 + 少量锚点插值造形状——同 seed 每次刷新一致，
//      也避免读者把 mock 形状误当成真实历史路径。
import { SNAPSHOT_DATE, mulberry32, seededWalk, yearlyBars } from '../lib/mock'

// ============================================================
// 通用小工具：月度日期网格 / 锚点插值（形态数据用）
// ============================================================

type Anchor = [x: number, value: number]

/** 日期 → 小数年（锚点插值用 x 坐标） */
function fractionalYear(iso: string): number {
  const date = new Date(`${iso}T00:00:00Z`)
  return date.getUTCFullYear() + date.getUTCMonth() / 12
}

/**
 * 按月推进的日期网格（左闭右闭，末点强制对齐 endISO）。
 * 起始日是 31 号时 JS 会把「6 月 31 日」进位成 7 月 1 日，因此显式把日号夹到目标月最后一天。
 */
function monthGrid(startISO: string, endISO: string): string[] {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  const out: string[] = []
  for (let k = 0; k < 500; k += 1) {
    const year = start.getUTCFullYear()
    const month = start.getUTCMonth() + k
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const date = new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)))
    if (date > end) break
    out.push(date.toISOString().slice(0, 10))
  }
  if (out[out.length - 1] !== endISO) out.push(endISO)
  return out
}

/** 按锚点线性插值出序列；落在锚点上的点精确等于锚点值，其余点叠确定性噪声 */
function interpolate(keys: number[], anchors: Anchor[], seed: number, volatility = 0.02): number[] {
  const rnd = mulberry32(seed)
  const sorted = [...anchors].sort((a, b) => a[0] - b[0])
  return keys.map(key => {
    let lo = sorted[0]
    let hi = sorted[sorted.length - 1]
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (key >= sorted[i][0] && key <= sorted[i + 1][0]) {
        lo = sorted[i]
        hi = sorted[i + 1]
        break
      }
    }
    const span = hi[0] - lo[0] || 1
    const ratio = Math.min(1, Math.max(0, (key - lo[0]) / span))
    const base = lo[1] + (hi[1] - lo[1]) * ratio
    const atAnchor = ratio === 0 || ratio === 1
    const noise = atAnchor ? 0 : (rnd() - 0.5) * 2 * volatility * Math.max(Math.abs(base), 0.05)
    return Number((base + noise).toFixed(4))
  })
}

function zip(dates: string[], values: number[]): Array<[string, number]> {
  return dates.map((date, index) => [date, values[index]])
}

/** KPI 卡片统一形状（与 cnBond 的 CnKpi 同构） */
export type AShareKpi = {
  label: string
  value: string
  unit?: string
  delta?: string
  deltaValue?: number
  source?: string
  hint?: string
}

// ============================================================
// 1. 市场信号摘要（关键读数）：读数逐字照抄整理稿 t=85s
// ============================================================

export const A_SHARE_OVERVIEW_KPIS: AShareKpi[] = [
  {
    label: '沪深300',
    value: '3,934.40',
    source: '新浪财经 · 2026-09-10',
    hint: '市场信号摘要 · 点位。',
  },
  {
    label: '沪深300 市盈率',
    value: '13.62',
    source: '中证指数公司',
    hint: '当前 13.62 倍，处于 2011 年以来 63.7% 分位、近 5 年 70.8% 分位。',
  },
  {
    label: '两融余额',
    value: '26,463.69',
    unit: '亿元',
    source: '东方财富（沪深交易所汇总）',
    hint: '占流通市值 2.626019%，处于 2010 年以来 96.7% 分位。融资余额是市场情绪的直接温度计。',
  },
  {
    label: '全市场成交额',
    value: '15,982.97',
    unit: '亿元',
    source: '东方财富 · 2026-09-10',
    hint: '较近 60 日均值 24,570 亿缩量 34.9%。',
  },
  {
    label: '上证综指距历史高点',
    value: '-35.42%',
    source: '新浪财经',
    hint: '最近一次新高在 2007-10-16，此后已过 4,597 个交易日，当前较高点 -35.42%。',
  },
  {
    label: '中证全指 长期年化',
    value: '+8.56%',
    source: '新浪财经、中证指数公司',
    hint: '年化波动 25.58% · 夏普 0.28（夏普按 1.5% 无风险利率近似）。',
  },
]

// ============================================================
// 2. 长历史走势：上证综指 1993 → 2026，对数轴（100 → 3400 量级，演示形状）
// ============================================================

export const A_SHARE_TREND: Array<[string, number]> = seededWalk({
  start: 100,
  end: 3400,
  points: 402,
  seed: 1993,
  volatility: 0.06,
})

// ============================================================
// 3. 年度回报：1993 → 2026 共 34 年；2006/2008 为整理稿强制锚点
// ============================================================

export type AShareAnnualPoint = { year: number; value: number }

const ANNUAL_YEARS = Array.from({ length: 2026 - 1993 + 1 }, (_, index) => 1993 + index)

export const A_SHARE_ANNUAL: AShareAnnualPoint[] = yearlyBars(ANNUAL_YEARS, 20260910, -30, 30).map(point => {
  if (point.year === 2006) return { year: point.year, value: 130.43 }
  if (point.year === 2008) return { year: point.year, value: -65.39 }
  return point
})

/** 年度回报 KPI（整理稿 t=71s） */
export const A_SHARE_ANNUAL_KPIS: AShareKpi[] = [
  { label: '样本年数', value: '34', hint: '1993-2026' },
  { label: '上涨年份占比', value: '17/34', hint: '50%' },
  {
    label: '最好的一年',
    value: '+130.43%',
    delta: '+130.43%',
    deltaValue: 130.43,
    hint: '2006',
  },
  {
    label: '最差的一年',
    value: '-65.39%',
    delta: '-65.39%',
    deltaValue: -65.39,
    hint: '2008',
  },
]

/** 整理稿点名出现的年份：2006 / 2008 强制锚点 + 2020 / 2024 / 2025 演示值 */
const ANNUAL_SAMPLE_YEARS = [2006, 2008, 2020, 2024, 2025]
export const A_SHARE_ANNUAL_SAMPLE: AShareAnnualPoint[] = ANNUAL_SAMPLE_YEARS
  .map(year => A_SHARE_ANNUAL.find(point => point.year === year))
  .filter((point): point is AShareAnnualPoint => point !== undefined)

// ============================================================
// 4. 月度统计：2月胜率 73% / 12月胜率 45% / 8月均值 +3.16% / 1月均值 -0.77% 为整理稿读数
// ============================================================

export const A_SHARE_MONTHLY_KPIS: AShareKpi[] = [
  { label: '历史上涨概率最高', value: '73%', hint: '2月 · 33 次样本' },
  { label: '历史上涨概率最低', value: '45%', hint: '12月 · 33 次样本' },
  { label: '平均涨幅最高', value: '+3.16%', delta: '+3.16%', deltaValue: 3.16, hint: '8月' },
  { label: '平均跌幅最深', value: '-0.77%', delta: '-0.77%', deltaValue: -0.77, hint: '1月' },
]

export type AShareMonthlyRow = { month: string; winRate: number; avg: number }

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

/** 整理稿读到的真实读数（其余月份为演示值，页面上会注明） */
const MONTH_REAL: Record<string, { winRate?: number; avg?: number }> = {
  '1月': { avg: -0.77 },
  '2月': { winRate: 73 },
  '8月': { avg: 3.16 },
  '12月': { winRate: 45 },
}

const monthlyRnd = mulberry32(20260910)

export const A_SHARE_MONTHLY_ROWS: AShareMonthlyRow[] = MONTH_LABELS.map(month => {
  const real = MONTH_REAL[month] ?? {}
  return {
    month,
    winRate: real.winRate ?? Math.round(35 + monthlyRnd() * 30),
    avg: real.avg ?? Number((monthlyRnd() * 4 - 2).toFixed(2)),
  }
})

// ============================================================
// 5. 涨跌幅分布：8 桶（≤-30% … ≥30%），桶高为演示值，负桶绿、正桶红
// ============================================================

export type AShareDistributionBucket = { label: string; count: number; sign: 1 | -1 }

const DISTRIBUTION_SPEC: Array<[label: string, sign: 1 | -1]> = [
  ['≤-30%', -1],
  ['-30%~-20%', -1],
  ['-20%~-10%', -1],
  ['-10%~0%', -1],
  ['0%~10%', 1],
  ['10%~20%', 1],
  ['20%~30%', 1],
  ['≥30%', 1],
]

/** 34 年样本在 8 桶间的演示分布（合计 34；两端桶分别容纳 2008 与 2006） */
const DISTRIBUTION_COUNTS = [3, 2, 3, 5, 8, 6, 4, 3]

export const A_SHARE_DISTRIBUTION: AShareDistributionBucket[] = DISTRIBUTION_SPEC.map(
  ([label, sign], index) => ({ label, count: DISTRIBUTION_COUNTS[index], sign }),
)

// ============================================================
// 6. 历史回撤（水下曲线）：1993 → 2026，最深 -71.98%（2007-08 段），终点 -35.42%
// ============================================================

const DRAWDOWN_ANCHORS: Anchor[] = [
  [1993.05, 0],
  [1994.5, -60],
  [1995.5, -35],
  [1997.5, -25],
  [1999.4, -22],
  [2001.5, -45],
  [2003.0, -42],
  [2004.5, -35],
  [2005.4, -42],
  [2007.05, -20],
  // 整理稿：最深 -71.98%（2007-08 段，区间 2007-10-16 - 2008-11-04）
  [2007.55, -71.98],
  [2008.9, -71.98],
  [2009.7, -35],
  [2010.9, -25],
  [2012.9, -20],
  [2014.5, -8],
  [2015.85, -45],
  [2016.9, -30],
  [2017.95, -27],
  [2019.3, -12],
  [2020.2, -14],
  [2021.1, -8],
  [2022.4, -22],
  [2024.1, -27],
  [2024.6, -12],
  [2025.3, -18],
  // 整理稿：当前较高点 -35.42%
  [2026.7, -35.42],
]

export const A_SHARE_DRAWDOWN: Array<[string, number]> = zip(
  monthGrid('1993-01-29', SNAPSHOT_DATE),
  interpolate(
    monthGrid('1993-01-29', SNAPSHOT_DATE).map(fractionalYear),
    DRAWDOWN_ANCHORS,
    20071016,
    0.03,
  ).map(value => Math.max(-71.98, Math.min(0, value))),
)

/** 各指数历史最大回撤表（整理稿 t=77s，读数照抄） */
export type AShareDrawdownRow = {
  name: string
  maxDrawdown: number
  start: string
  end: string
  days: string
  fromPeak: number
}

export const A_SHARE_DRAWDOWN_ROWS: AShareDrawdownRow[] = [
  { name: '上证综指', maxDrawdown: -71.98, start: '2007-10-16', end: '2008-11-04', days: '385天', fromPeak: -35.42 },
  { name: '沪深300', maxDrawdown: -72.3, start: '2007-10-16', end: '2008-11-04', days: '385天', fromPeak: -22.61 },
  { name: '中证1000', maxDrawdown: -72.35, start: '2015-06-12', end: '2018-10-18', days: '1224天', fromPeak: -49.44 },
  { name: '创业板指', maxDrawdown: -69.74, start: '2015-06-03', end: '2018-10-18', days: '1233天', fromPeak: -23.64 },
  { name: '中证全指', maxDrawdown: -71.48, start: '2008-01-14', end: '2008-11-04', days: '295天', fromPeak: -26.71 },
]

// ============================================================
// 7. 实现波动率：20日 / 60日年化双线（2005 → 2026），2015 段抬到 60+
// ============================================================

const VOL_GRID = monthGrid('2005-01-28', SNAPSHOT_DATE)

/** 20 日窗口：反应快，尖峰更高 */
const VOL_ANCHORS_20D: Anchor[] = [
  [2005.0, 20],
  [2006.4, 22],
  [2007.4, 30],
  [2008.6, 65],
  [2008.95, 95],
  [2009.5, 42],
  [2010.5, 26],
  [2012.0, 20],
  [2013.2, 14],
  [2014.9, 15],
  [2015.4, 35],
  [2015.85, 60],
  [2015.95, 88],
  [2016.5, 32],
  [2017.4, 13],
  [2018.3, 26],
  [2018.95, 30],
  [2019.5, 24],
  [2020.15, 48],
  [2020.7, 26],
  [2021.3, 17],
  [2022.5, 24],
  [2023.4, 18],
  [2024.3, 32],
  [2024.8, 22],
  [2025.6, 26],
  [2026.7, 14.6],
]

/** 60 日窗口：更稳，2015 段抬到 60+ */
const VOL_ANCHORS_60D: Anchor[] = [
  [2005.0, 18],
  [2006.4, 19],
  [2007.4, 25],
  [2008.6, 48],
  [2008.95, 72],
  [2009.6, 50],
  [2010.6, 32],
  [2012.0, 24],
  [2013.4, 16],
  [2014.9, 14],
  [2015.6, 40],
  [2015.95, 62],
  [2016.4, 58],
  [2017.0, 32],
  [2017.8, 16],
  [2018.6, 25],
  [2019.2, 26],
  [2020.2, 38],
  [2020.8, 28],
  [2021.4, 20],
  [2022.6, 23],
  [2023.6, 19],
  [2024.3, 27],
  [2025.0, 23],
  [2025.8, 24],
  [2026.7, 16.9],
]

/** 夹到整理稿的历史区间 [6.4%, 122.1%] 内 */
const clampVol = (value: number) => Math.min(122.1, Math.max(6.4, value))

const VOL_KEYS = VOL_GRID.map(fractionalYear)

export const A_SHARE_VOLATILITY_20D: Array<[string, number]> = zip(
  VOL_GRID,
  interpolate(VOL_KEYS, VOL_ANCHORS_20D, 20150612, 0.1).map(clampVol),
)

export const A_SHARE_VOLATILITY_60D: Array<[string, number]> = zip(
  VOL_GRID,
  interpolate(VOL_KEYS, VOL_ANCHORS_60D, 20180615, 0.06).map(clampVol),
)

/** 实现波动率 KPI（整理稿 t=78s，读数照抄） */
export const A_SHARE_VOLATILITY_KPIS: AShareKpi[] = [
  { label: '当前 60 日波动率', value: '16.9%', hint: '2026-09-10' },
  { label: '历史分位', value: '37%', hint: '全历史 7,940 个交易日' },
  { label: '历史最高', value: '122.1%', hint: '极端恐慌时点' },
  { label: '历史最低', value: '6.4%', hint: '极度平静时点' },
]

// ============================================================
// 8. 估值分位（读数照抄整理稿 t=80s「分位数明细」）
// ============================================================

export type AShareValuationRow = { name: string; pe: number; pctAll: number; pct5y: number }

export const A_SHARE_VALUATION_ROWS: AShareValuationRow[] = [
  { name: '沪深300', pe: 13.62, pctAll: 63.7, pct5y: 70.8 },
  { name: '中证红利', pe: 8.64, pctAll: 61.6, pct5y: 96 },
  { name: '中证全指', pe: 17.84, pctAll: 62.2, pct5y: 79.1 },
  { name: '上证综指', pe: 14.77, pctAll: 67.9, pct5y: 79.3 },
  { name: '上证50', pe: 11.11, pctAll: 71, pct5y: 69.8 },
  { name: '科创50', pe: 69.82, pctAll: 66.9, pct5y: 81 },
  { name: '中证1000', pe: 30.67, pctAll: 65.2, pct5y: 80.4 },
  { name: '中证500', pe: 26.01, pctAll: 63.1, pct5y: 81.9 },
]

// ============================================================
// 9. 两融杠杆：2014 → 2026（4,000 → 26,463.69 亿，演示形状）
// ============================================================

const MARGIN_GRID = monthGrid('2014-01-29', SNAPSHOT_DATE)
const MARGIN_KEYS = MARGIN_GRID.map(fractionalYear)

const MARGIN_ANCHORS: Anchor[] = [
  [2014.0, 4000],
  [2014.6, 5600],
  [2014.95, 10200],
  [2015.5, 22000],
  [2015.85, 9400],
  [2016.5, 8600],
  [2017.9, 10200],
  [2018.9, 7600],
  [2019.9, 12100],
  [2021.0, 16800],
  [2021.9, 18400],
  [2023.0, 15900],
  [2024.1, 14800],
  [2024.95, 18600],
  [2025.6, 23000],
  [2026.7, 26463.69],
]

export const A_SHARE_MARGIN: Array<[string, number]> = zip(
  MARGIN_GRID,
  interpolate(MARGIN_KEYS, MARGIN_ANCHORS, 20140331, 0.02),
)

/** 融资余额 ≈ 两融余额的 95.5%（融券占比小，页面上不单独展示口径） */
export const A_SHARE_MARGIN_FIN: Array<[string, number]> = A_SHARE_MARGIN.map(([date, value]) => [
  date,
  Number((value * 0.955).toFixed(2)),
] as [string, number])

/** 两融 KPI（整理稿 t=81s / t=85s，读数照抄） */
export const A_SHARE_MARGIN_KPIS: AShareKpi[] = [
  {
    label: '两融余额',
    value: '26,463.69',
    unit: '亿元',
    source: '东方财富（沪深交易所汇总） · 2026-09-10',
    hint: '两融余额 = 融资余额 + 融券余额；融资余额是市场情绪的直接温度计。',
  },
  {
    label: '占流通市值',
    value: '2.626019%',
    delta: '历史分位 96.7%',
    hint: '比值 = 融资余额 / 流通市值，处于 2010 年以来 96.7% 分位。',
  },
]

// ============================================================
// 10. 长期风险收益平面：9 个宽基指数（读数照抄整理稿 t=83–85s）
// ============================================================

export type AShareRiskPoint = { name: string; ret: number; vol: number; years: number }

export const A_SHARE_RISK_POINTS: AShareRiskPoint[] = [
  { name: '中证500', ret: 9.94, vol: 28.56, years: 21.7 },
  { name: '中证全指', ret: 8.56, vol: 25.58, years: 21.7 },
  { name: '创业板指', ret: 7.86, vol: 30.53, years: 16.3 },
  { name: '科创50', ret: 6.65, vol: 33.24, years: 6.7 },
  { name: '沪深300', ret: 5.15, vol: 24.28, years: 24.7 },
  { name: '深证成指', ret: 5.64, vol: 29.59, years: 32.9 },
  { name: '上证50', ret: 4.76, vol: 24.5, years: 22.7 },
  { name: '上证综指', ret: 4.79, vol: 27.84, years: 32.9 },
  { name: '中证1000', ret: 1.91, vol: 27.39, years: 11.9 },
]

// ============================================================
// 11. 数据来源与取数状态
// ============================================================

export type AShareSourceRow = {
  key: string
  source: string
  channel: string
  status: string
  tone: 'ok' | 'warn' | 'pending'
}

export const A_SHARE_SOURCES: AShareSourceRow[] = [
  { key: 'sina', source: '新浪财经', channel: '指数日线 / 周线（日线回溯上限 8000 根）', status: '已落盘', tone: 'ok' },
  { key: 'csi', source: '中证指数公司', channel: '中证全指、指数官方 PE（PE 序列自 2011-06-28 起）', status: '已落盘', tone: 'ok' },
  { key: 'east', source: '东方财富（沪深交易所汇总）', channel: '两融余额 / 融资余额 / 全市场成交额', status: '已落盘', tone: 'ok' },
  { key: 'exchange', source: '沪深交易所', channel: '流通市值（两融占比分母）', status: '已落盘', tone: 'ok' },
  { key: 'pipeline', source: '构建期管道', channel: '信号在构建期算好并落盘，页面不做实时请求', status: '构建期', tone: 'warn' },
]

export const A_SHARE_SOURCE_NOTES: string[] = [
  '本页数据来自公开官方渠道（中国人民银行、中债、中国货币网、中证指数公司、东方财富、IMF、新浪财经），构建期抓取并落盘，页面不做实时请求。指标口径见各面板副标题与脚注。',
  '涨跌配色遵循国内习惯：红涨/绿跌。本页仅作信息整理，不构成投资建议。',
  '「信号在构建期算好并落盘」；本模块所有曲线为确定性演示形状，不代表真实历史路径。',
]
