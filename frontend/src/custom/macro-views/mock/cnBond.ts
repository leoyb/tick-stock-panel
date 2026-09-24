// 中国债券看板的演示数据（快照日 2026-09-11，官方曲线数据日 2026-09-10）。
// 数据来源：演示整理稿第 4 章「中国债券看板」逐秒 OCR 稿。
// 两条硬原则（为什么这么定）：
//   1) 页面上出现的读数、口径说明与脚注逐字照抄整理稿，不做换算、不做美化，
//      这样「页面上写了什么」与「稿子上写了什么」永远能对上，便于人工复核；
//   2) 整理稿只给了坐标轴、没有逐点数值的曲线（形态演变、DR007、逆回购量、LPR 阶梯等），
//      一律用 lib/mock.ts 的确定性生成器 + 少量锚点插值造形状——同 seed 每次刷新一致，
//      也避免读者把 mock 形状误当成真实历史路径。
import { SNAPSHOT_DATE, mulberry32, seededWalk } from '../lib/mock'

/** 看板上所有 KPI 卡片的统一形状（note 走 KpiCard 的 hint） */
export type CnKpi = {
  label: string
  value: string
  hint?: string
  delta?: string
  deltaValue?: number
}

// ============================================================
// 通用小工具：锚点插值 / 日期网格
// ============================================================

type Anchor = [x: number, value: number]

/** 按锚点线性插值出序列；落在锚点上的点精确等于锚点值，其余点叠确定性噪声 */
function interpolate(keys: number[], anchors: Anchor[], seed: number, volatility = 0.01): number[] {
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

/**
 * 按月推进的日期网格（左闭右闭）。
 * 为什么不用 Date.setUTCMonth 直接加：起始日是 31 号时，JS 会把「6 月 31 日」自动进位成 7 月 1 日，
 * 季度网格会整体错位，因此这里显式把日号夹到目标月的最后一天。
 * 另外总是把 endISO 补成最后一个点，保证末尾读数能精确落位。
 */
function monthGrid(startISO: string, endISO: string, stepMonths = 1): string[] {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  const out: string[] = []
  for (let k = 0; k < 600; k += 1) {
    const year = start.getUTCFullYear()
    const month = start.getUTCMonth() + k * stepMonths
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const date = new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDay)))
    if (date > end) break
    out.push(date.toISOString().slice(0, 10))
  }
  if (out[out.length - 1] !== endISO) out.push(endISO)
  return out
}

/** 日期 → 小数年（锚点插值用 x 坐标） */
function fractionalYear(iso: string): number {
  const date = new Date(`${iso}T00:00:00Z`)
  return date.getUTCFullYear() + date.getUTCMonth() / 12
}

function zip(dates: string[], values: number[]): Array<[string, number]> {
  return dates.map((date, index) => [date, values[index]])
}

/** 交易日网格（跳过周六周日；不处理法定节假日，演示够用） */
function businessDays(endISO: string, count: number): string[] {
  const out: string[] = []
  const cursor = new Date(`${endISO}T00:00:00Z`)
  while (out.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) out.unshift(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return out
}

// ============================================================
// 01 关键读数（overview）：10Y / 1Y / 30Y / 10Y-1Y
// ============================================================

export const CN_READING_KPIS: CnKpi[] = [
  { label: '10Y 国债收益率', value: '1.6797%', hint: '国内资产定价之锚 · 2026-09-10', delta: '最新读数', deltaValue: 0 },
  { label: '1Y 国债收益率', value: '1.337%', hint: '短端，受资金面主导' },
  { label: '30Y 国债收益率', value: '2.267%', hint: '超长端，受久期偏好主导' },
  { label: '10Y-1Y 期限利差', value: '0.5101%', hint: '期限利差（长端 − 短端）' },
]

/** 页眉状态标记：数据点数与构建日 */

export const CN_PAGE_META = [
  '数据 505点@2026-09-10 · 构建 2026-09-11',
  '国债面板共 18 个模块',
  '本页实现 8 个面板',
]

// ============================================================
// 02 全期限国债收益率与形态演变（curve）
// ============================================================

export const CN_CURVE_META = {
  dataDate: '2026-09-10',
  buildDate: SNAPSHOT_DATE,
  /** 官方曲线公布 505 个期限点，覆盖 0 至 30 年（整理稿另注 0~50 年〔疑〕） */
  totalPoints: 505,
  coverage: '0 至 30 年',
  sampledTerms: 8,
  source: '中债（中国债券信息网）',
}

/** 图上抽样的期限刻度（整理稿横轴为 1M…50Y 的对数间隔抽样，这里取 8 个常用关键期限） */
export const CN_CURVE_TERMS = [1, 2, 3, 5, 7, 10, 20, 30]
export const CN_CURVE_AXIS = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y']

/**
 * 最新曲线的形状：三条锚点直接来自页面读数（1Y 1.337%、10Y 1.6797%、30Y 2.267%），
 * 中间期限（2/3/5/7/20Y）用单调插值补齐——整理稿只有那三个读数，不编造更多「精确值」。
 */
const LATEST_ANCHORS: Array<[number, number]> = [
  [1, 1.337],
  [2, 1.437],
  [3, 1.497],
  [5, 1.597],
  [7, 1.657],
  [10, 1.6797],
  [20, 2.0],
  [30, 2.267],
]
export const CN_CURVE_LATEST = LATEST_ANCHORS.map(([, value]) => value)

/** 曲线形态演变：每一年的年底关键期限曲线各一条（横轴期限，纵轴收益率 %） */
export const CN_CURVE_YEARS = [2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026]
export const CN_CURVE_LATEST_YEAR = 2026

/** 相对 10Y 的期限溢价形状（由最新曲线的三锚点反推；只用来给历史年份的示意曲线定形） */
const PREMIUM_SHAPE = CN_CURVE_TERMS.map(term => term - 10).map((gap, index) => ({
  premium: CN_CURVE_LATEST[index] - 1.6797,
  gap,
}))

/** 每年的 10Y 水平：2002 年末 3.18% 走到 2026 年 1.6797%（读数），中间形态由 mock 生成器造 */
const YEAR_GRID_LEVELS = seededWalk({
  start: 3.18,
  end: 1.6797,
  points: CN_CURVE_YEARS.length,
  seed: 20260910,
  volatility: 0.13,
  stepDays: 365,
  endDate: '2026-12-31',
}).map(([, value]) => value)

/** 每年的曲线陡峭度（早年曲线更陡，近年更平——「整体下移 + 变平」的演示形态） */
const YEAR_SHAPE_FACTORS = seededWalk({
  start: 1.55,
  end: 1,
  points: CN_CURVE_YEARS.length,
  seed: 4602,
  volatility: 0.12,
  stepDays: 365,
  endDate: '2026-12-31',
}).map(([, value]) => value)

export const CN_CURVE_FAMILY: Array<{ year: number; values: number[] }> = CN_CURVE_YEARS.map((year, index) => ({
  year,
  values:
    year === CN_CURVE_LATEST_YEAR
      ? CN_CURVE_LATEST
      : PREMIUM_SHAPE.map(point =>
          Number((YEAR_GRID_LEVELS[index] + point.premium * YEAR_SHAPE_FACTORS[index]).toFixed(4)),
        ),
}))

export const CN_CURVE_FOOTER =
  `数据日 ${CN_CURVE_META.dataDate}，官方曲线共 ${CN_CURVE_META.totalPoints} 个期限点（覆盖 ${CN_CURVE_META.coverage}），` +
  `图上按对数间隔抽样 ${CN_CURVE_META.sampledTerms} 个刻度。来源：${CN_CURVE_META.source}。` +
  '整理稿另注「0 至 50 年」〔疑〕，本页按 0 至 30 年展示。'

export const CN_CURVE_NOTE =
  '每一年取当年最后一个交易日的 2/5/10/30 年关键期限收益率，串成一条曲线。拖动下方时间轴，看整条曲线怎么整体抬升、下移'

// ============================================================
// 03 期限利差与中美利差（spread）
// ============================================================

export const CN_SPREAD_KPIS: CnKpi[] = [
  { label: '中国 10Y', value: '1.6797%', hint: '2026-09-10 · 人民币资产的定价锚' },
  { label: '美国 10Y', value: '4.9500%', hint: '2026-09-10 · 全球资产的定价锚' },
  { label: '中美利差', value: '-3.27', hint: '中国 − 美国（百分点），当前 -3.2703', delta: '已倒挂', deltaValue: -1 },
  { label: '利差为负天数', value: '2406 天', hint: '占比 41.7%' },
]

export const CN_TERM_SPREAD_KPIS: CnKpi[] = [
  { label: '10Y-2Y 最新', value: '+43.8bp', hint: '2026-09-10' },
  { label: '10Y-2Y 历史倒挂', value: '14 天', hint: '占比 0.23%' },
  { label: '30Y-10Y 最新', value: '+45.9bp', hint: '超长端溢价' },
  { label: '全段均值（10Y-2Y）', value: '+70.8bp', hint: '2002 年至今' },
]

export type CnSpreadRow = {
  name: string
  latest: number
  m1: number
  m3: number
  m6: number
}

/** 利差表：整理稿底部那张「利差 / 最新 / 1 个月 / 3 个月 / 6 个月」表，数值照抄 */
export const CN_SPREAD_TABLE: CnSpreadRow[] = [
  { name: '10Y-2Y', latest: 0.4376, m1: -2.57, m3: -1.14, m6: -3.43 },
  { name: '10Y-5Y', latest: 0.2671, m1: -3.84, m3: 0.2, m6: 1.52 },
  { name: '30Y-10Y', latest: 0.4593, m1: 0.63, m3: -1.95, m6: -10.12 },
  { name: '5Y-2Y', latest: 0.1705, m1: 1.27, m3: -1.34, m6: -4.95 },
]

export const CN_SPREAD_WINDOW = { cnStart: '2002-01-04', usStart: '1990-12-19', end: '2026-09-10' }

export const CN_SPREAD_NOTE =
  '中国 10Y 是人民币资产的定价锚，美国 10Y 是全球资产的定价锚，两者之差就是跨境资金的「水位差」' +
  `。中国序列自 ${CN_SPREAD_WINDOW.cnStart} 起，美国序列自 ${CN_SPREAD_WINDOW.usStart} 起`

/** 中国 10Y（月频）：锚点为公开口径的年末量级，终点精确落在页面读数 1.6797% */
const CN_10Y_GRID = monthGrid('2002-01-04', '2026-09-10')
const CN_10Y_X = CN_10Y_GRID.map(fractionalYear)
export const CN_10Y: Array<[string, number]> = zip(
  CN_10Y_GRID,
  interpolate(
    CN_10Y_X,
    [
      [2002, 3.2],
      [2005, 3.6],
      [2008, 4.6],
      [2011, 3.9],
      [2014, 4.1],
      [2016, 3.0],
      [2018, 3.6],
      [2020, 3.15],
      [2021, 2.8],
      [2022, 2.9],
      [2024, 2.0],
      [fractionalYear('2026-09-10'), 1.6797],
    ],
    1201,
    0.045,
  ),
)

/** 美国 10Y（月频，序列自 1990-12-19 起）：终点精确落在页面读数 4.9500% */
const US_10Y_GRID = monthGrid('1990-12-19', '2026-09-10')
const US_10Y_X = US_10Y_GRID.map(fractionalYear)
export const CN_SPREAD_US_10Y: Array<[string, number]> = zip(
  US_10Y_GRID,
  interpolate(
    US_10Y_X,
    [
      [1990.95, 8.2],
      [1994, 7.8],
      [2000, 5.1],
      [2003, 4.3],
      [2007, 4.0],
      [2008.95, 2.25],
      [2010, 3.3],
      [2012, 1.75],
      [2016, 2.45],
      [2019, 1.9],
      [2020.7, 0.7],
      [2021, 1.5],
      [2022, 3.9],
      [2024, 4.38],
      [fractionalYear('2026-09-10'), 4.95],
    ],
    1990,
    0.045,
  ),
)

/**
 * 中美利差：按中国序列的采样日对齐到最近的美国 10Y 读数（时间轴按各自交易日绘制）。
 * 因为两条序列的终点都是页面读数，所以利差末点精确等于 -3.2703。
 */
function alignUsValue(dateISO: string): number {
  const target = dateISO.slice(0, 7)
  let picked = CN_SPREAD_US_10Y[0][1]
  for (const [date, value] of CN_SPREAD_US_10Y) {
    if (date.slice(0, 7) <= target) picked = value
    else break
  }
  return picked
}

export const CN_US_SPREAD: Array<[string, number]> = CN_10Y.map(([date, value]) => [
  date,
  Number((value - alignUsValue(date)).toFixed(4)),
])

/** 期限利差序列（月频，2016 起即可看清倒挂与走阔；终点落在整理稿的最新读数上） */
const TERM_SPREAD_GRID = monthGrid('2016-01-31', '2026-09-10')
const TERM_SPREAD_X = TERM_SPREAD_GRID.map(fractionalYear)
const TERM_SPREAD_END = fractionalYear('2026-09-10')

export const CN_SPREAD_10Y_1Y: Array<[string, number]> = zip(
  TERM_SPREAD_GRID,
  interpolate(
    TERM_SPREAD_X,
    [
      [2016, 0.72],
      [2018, 0.52],
      [2020, 0.68],
      [2022, 0.86],
      [2024, 0.45],
      [TERM_SPREAD_END, 0.5101],
    ],
    7731,
    0.06,
  ),
)

export const CN_SPREAD_10Y_2Y: Array<[string, number]> = zip(
  TERM_SPREAD_GRID,
  interpolate(TERM_SPREAD_X, [[2016, 0.62], [2018, 0.42], [2020, 0.55], [2022, 0.78], [2024, 0.36], [TERM_SPREAD_END, 0.4376]], 7732, 0.06),
)

export const CN_SPREAD_30Y_10Y: Array<[string, number]> = zip(
  TERM_SPREAD_GRID,
  interpolate(TERM_SPREAD_X, [[2016, 0.42], [2018, 0.5], [2020, 0.62], [2022, 0.55], [2024, 0.38], [TERM_SPREAD_END, 0.4593]], 7733, 0.06),
)

export const CN_SPREAD_5Y_2Y: Array<[string, number]> = zip(
  TERM_SPREAD_GRID,
  interpolate(TERM_SPREAD_X, [[2016, 0.28], [2018, 0.18], [2020, 0.3], [2022, 0.42], [2024, 0.12], [TERM_SPREAD_END, 0.1705]], 7734, 0.06),
)

export const CN_SPREAD_FOOTER =
  `左轴为收益率（%），右轴为利差（百分点，虚线）。中国序列自 ${CN_SPREAD_WINDOW.cnStart} 起，` +
  `美国序列自 ${CN_SPREAD_WINDOW.usStart} 起，采用时间轴按各自交易日绘制。` +
  '来源：东方财富（中国数据源中债（中国债券信息网）、美国数据源美联储）。'

export const CN_SPREAD_TABLE_FOOTER = '变动列（1/3/6 个月）整理稿未标注单位，推断为 bp〔疑〕，数值照抄。'

// ============================================================
// 04 资金面 DR007 / R007（funding）
// ============================================================

export const CN_FUNDING_KPIS: CnKpi[] = [
  { label: 'DR007', value: '1.42%', hint: '存款类机构 7 天回购 · 2026-09-11', delta: '最新', deltaValue: 0 },
  { label: 'R007', value: '1.42%', hint: '全市场 7 天回购（含非银）' },
  { label: 'R007-DR007', value: '0.0bp', hint: '非银溢价（当前分层）' },
  { label: '区间均值 / 最高', value: '+5.0bp / +37.0bp', hint: '近 1 年 / 2025-09-29 最高' },
]

export const CN_FUNDING_WINDOW = {
  start: '2025-09-16',
  end: SNAPSHOT_DATE,
  limit: '中国货币网接口硬上限 364 天，超出即返回空',
  source: '中国货币网（全国银行间同业拆借中心）',
}

/** DR007：终点精确落在页面读数 1.42%；窗口起点取接口上限（1 年） */
const FUNDING_POINTS = 361
export const CN_DR007: Array<[string, number]> = seededWalk({
  start: 1.62,
  end: 1.42,
  points: FUNDING_POINTS,
  seed: 7411,
  volatility: 0.012,
  stepDays: 1,
  endDate: SNAPSHOT_DATE,
})

/** R007 − DR007（百分点）：末点为 0（0.0bp），并把 2025-09-29 抬到 37bp 以对上「区间最高」读数 */
const FUNDING_DIFF: number[] = seededWalk({
  start: 0.09,
  end: 0,
  points: FUNDING_POINTS,
  seed: 9188,
  volatility: 0.5,
  stepDays: 1,
  endDate: SNAPSHOT_DATE,
}).map(([, value]) => value)
FUNDING_DIFF[13] = 0.37

export const CN_R007_DIFF: Array<[string, number]> = CN_DR007.map(([date], index) => [date, FUNDING_DIFF[index]])
export const CN_R007: Array<[string, number]> = CN_DR007.map(([date, value], index) => [
  date,
  Number((value + FUNDING_DIFF[index]).toFixed(4)),
])

export const CN_FUNDING_NOTE =
  'DR 系列只统计存款类机构（银行），FR 系列覆盖全市场（含非银）。DR007 是资金面最核心的读数，也是货币政策事实上的操作目标'

export const CN_FUNDING_FOOTER =
  '左轴：DR007/R007（%）；右轴：两者之差（百分点，面积）。分层走阔通常出现在税期、季末与跨年时点。' +
  `可回溯区间 ${CN_FUNDING_WINDOW.start} 起（${CN_FUNDING_WINDOW.limit}）。来源：${CN_FUNDING_WINDOW.source}。`

// ============================================================
// 05 7 天逆回购：价与量（omo）
// ============================================================

export type CnOmoRow = {
  date: string
  term: string
  rate: string
  amount: string
  note: string
}

/** 最近 12 个操作日明细（表头「操作日期 / 期限 / 中标利率 / 中标量 / 备注」），数值照抄 */
export const CN_OMO_RECENT: CnOmoRow[] = [
  { date: '2026-09-11', term: '7天', rate: '1.40%', amount: '40亿', note: '' },
  { date: '2026-09-10', term: '7天', rate: '1.40%', amount: '30亿', note: '' },
  { date: '2026-09-09', term: '7天', rate: '未开展', amount: '0亿', note: '零操作' },
  { date: '2026-09-08', term: '7天', rate: '1.40%', amount: '10亿', note: '' },
  { date: '2026-09-07', term: '7天', rate: '1.40%', amount: '5亿', note: '' },
  { date: '2026-09-04', term: '7天', rate: '未开展', amount: '0亿', note: '零操作' },
  { date: '2026-09-03', term: '7天', rate: '未开展', amount: '0亿', note: '零操作' },
  { date: '2026-09-02', term: '7天', rate: '未开展', amount: '0亿', note: '零操作' },
  { date: '2026-09-01', term: '7天', rate: '1.40%', amount: '50亿', note: '' },
  { date: '2026-08-31', term: '7天', rate: '1.40%', amount: '50亿', note: '' },
  { date: '2026-08-28', term: '7天', rate: '1.40%', amount: '200亿', note: '' },
  { date: '2026-08-27', term: '7天', rate: '1.40%', amount: '1,030亿', note: '' },
]

export type CnOmoDay = {
  date: string
  /** 中标量（亿元）；0 表示当日未开展 */
  amountYi: number
  skipped: boolean
}

const OMO_VOLUME_POOL = [5, 10, 30, 50, 80, 100, 200, 300, 500, 800, 1030, 1500, 2000]

/** 最近 60 个交易日：前 48 天由 mock 生成，最后 12 天照抄整理稿明细表 */
export const CN_OMO_DAYS: CnOmoDay[] = (() => {
  const dates = businessDays(SNAPSHOT_DATE, 60)
  const rnd = mulberry32(202609)
  const generated = dates.slice(0, 48).map(date => {
    // 让「有操作天数」对上整理稿出现过的 54 次量级：这 48 天里只留 2 天未开展
    const amount = rnd() < 0.06 ? 0 : OMO_VOLUME_POOL[Math.floor(rnd() * OMO_VOLUME_POOL.length)]
    return { date, amountYi: amount, skipped: amount === 0 }
  })
  const exact = CN_OMO_RECENT.slice()
    .reverse()
    .map(row => ({ date: row.date, amountYi: Number(row.amount.replace(/[^0-9]/g, '')), skipped: row.amount === '0亿' }))
  return [...generated, ...exact]
})()

/** 政策利率阶梯线：折点按公开口径的调整日摆放，当前读数 1.40% 来自页面整理稿 */
export const CN_OMO_RATE_STEPS: Array<[string, number]> = [
  ['2023-08-15', 1.8],
  ['2024-07-22', 1.7],
  ['2024-09-27', 1.5],
  ['2025-05-08', 1.4],
  [SNAPSHOT_DATE, 1.4],
]

export const CN_OMO_KPIS: CnKpi[] = [
  { label: '7 天逆回购中标利率', value: '1.40%', hint: '短端政策利率（价＝信号）' },
  { label: '最新操作量', value: '40亿', hint: '2026-09-11（量＝力度）' },
  { label: '区间最大单日', value: '1,030亿', hint: '2026-08-27' },
  { label: '有操作天数（近 60 个交易日）', value: '54 次', hint: '未开展日按 0 亿计入；次数量级参考整理稿「54 次」' },
]

export const CN_OMO_NOTE = '价（政策利率）与量（公开市场操作）'

export const CN_OMO_FOOTER =
  '上表为最近 12 个操作日。日期取公告正文中的操作日期，而非网站发布目录名——央行会批量补发历史公告，两者可能不同。' +
  '左轴为中标量（亿元，柱），右轴为 7 天逆回购中标利率（%，阶梯线）。来源：中国人民银行。'

// ============================================================
// 06 LPR 1Y（lpr）
// ============================================================

export const CN_LPR_FOOTNOTE =
  '阶梯线：利率在下次调整前保持不变。圆点为官方调整事件。LPR 1Y 序列可回溯至 2013-10-25（贷款基础利率集中报价时期），' +
  '2019-08-20 起为现行 LPR 报价机制；贷款基准利率自 2015-10-24 后未再调整，保留作为历史参考。来源：东方财富。'

/**
 * 阶梯的折点（官方调整事件）：整理稿只给了坐标轴（10.00–2.00，1997/2003/2009/2015/2021），
 * 没有逐点数值，所以这里用少量公开口径锚点 + mock 生成器补出中间调整日，只演示阶梯形态。
 */
const LPR_ANCHOR_DATES: Array<[string, number]> = [
  ['1997-01-01', 10.0],
  ['2002-02-21', 5.31],
  ['2008-12-23', 5.31],
  ['2012-07-06', 6.0],
  ['2015-10-24', 4.35],
  ['2019-08-20', 4.25],
  ['2021-12-20', 3.8],
  ['2024-10-21', 3.1],
  [SNAPSHOT_DATE, 3.0],
]

export const CN_LPR_EVENTS: Array<{ date: string; ratePct: number }> = (() => {
  const rnd = mulberry32(1025)
  const events: Array<{ date: string; ratePct: number }> = []
  for (let i = 0; i < LPR_ANCHOR_DATES.length; i += 1) {
    const [date, rate] = LPR_ANCHOR_DATES[i]
    events.push({ date, ratePct: rate })
    const next = LPR_ANCHOR_DATES[i + 1]
    if (!next) break
    // 两锚点之间插入 1~3 次调整（日期按月份均匀铺开，利率向下一锚点靠拢并贴到 0.05 的整数格）
    const startMs = new Date(`${date}T00:00:00Z`).getTime()
    const endMs = new Date(`${next[0]}T00:00:00Z`).getTime()
    const steps = 1 + Math.floor(rnd() * 3)
    for (let k = 1; k <= steps; k += 1) {
      const at = startMs + ((endMs - startMs) * k) / (steps + 1)
      const raw = rate + ((next[1] - rate) * k) / (steps + 1)
      events.push({
        date: new Date(at).toISOString().slice(0, 10),
        ratePct: Number((Math.round(raw / 0.05) * 0.05).toFixed(2)),
      })
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
})()

/** 阶梯线本体：月频网格上每一点取「不晚于该日的最后一次调整」的利率 */
export const CN_LPR_STEPS: Array<[string, number]> = (() => {
  const grid = monthGrid('1997-01-01', SNAPSHOT_DATE)
  let cursor = 0
  return grid.map(date => {
    while (cursor + 1 < CN_LPR_EVENTS.length && CN_LPR_EVENTS[cursor + 1].date <= date) cursor += 1
    const event = CN_LPR_EVENTS[Math.min(cursor, CN_LPR_EVENTS.length - 1)]
    return [date, event.ratePct] as [string, number]
  })
})()

export const CN_LPR_KPIS: CnKpi[] = [
  { label: 'LPR 1Y（当前）', value: '3.00%', hint: '阶梯线末端（演示值）' },
  { label: '现行报价机制起点', value: '2019-08-20', hint: '此前为贷款基础利率集中报价' },
  { label: '贷款基准利率', value: '4.35%', hint: '2015-10-24 后未再调整，保留作历史参考' },
  { label: '调整事件数（图上圆点）', value: `${CN_LPR_EVENTS.length} 次`, hint: '锚点 + mock 插入的调整日合计' },
]

// ============================================================
// 07 人民币占比 / IMF COFER（cofer）
// ============================================================

export const CN_COFER_KPIS: CnKpi[] = [
  { label: '人民币占比', value: '1.985%', hint: '2026-03-31 · 已分配外汇储备口径' },
  { label: '人民币同比变动', value: '+0.021 个百分点', hint: '卡片口径写作「上升 0.021 个百分点」', delta: '上升', deltaValue: 1 },
  { label: '同期美元', value: '57.131%', hint: '同比 -1.25 个百分点', delta: '下滑', deltaValue: -1 },
  { label: '首期（2016-12-31）', value: '0.997%', hint: '人民币自该日起单独列示' },
]

const COFER_GRID = monthGrid('2016-12-31', '2026-03-31', 3)
const COFER_POINTS = COFER_GRID.length

const CNY_VALUES = seededWalk({
  start: 0.997,
  end: 1.985,
  points: COFER_POINTS,
  seed: 20161231,
  volatility: 0.07,
  endDate: '2026-03-31',
}).map(([, value]) => value)
const USD_VALUES = seededWalk({
  start: 65.3,
  end: 57.131,
  points: COFER_POINTS,
  seed: 5731,
  volatility: 0.02,
  endDate: '2026-03-31',
}).map(([, value]) => value)
// 让「同比变动」与曲线自洽：末点前一整年（4 个季度前）对齐到同比读数
CNY_VALUES[COFER_POINTS - 5] = 1.985 - 0.021
USD_VALUES[COFER_POINTS - 5] = 57.131 + 1.25

export const CN_COFER_CNY: Array<[string, number]> = zip(COFER_GRID, CNY_VALUES)
export const CN_COFER_USD: Array<[string, number]> = zip(COFER_GRID, USD_VALUES)

export const CN_COFER_OTHERS: Array<{ name: string; value: string; change: string }> = [
  { name: '美元', value: '57.13%', change: '同比 -1.25 个百分点' },
  { name: '欧元', value: '20.03%', change: '同比 +0.92 个百分点' },
  { name: '日元', value: '5.44%', change: '同比 -0.32 个百分点' },
  { name: '人民币', value: '1.99%', change: '同比 +0.02 个百分点' },
  { name: '英镑', value: '图例', change: '整理稿只出现在图例中' },
]

export const CN_COFER_NOTE =
  '季度频率，最新数据日 2026-03-31。人民币自 2016-12-31 起单独列示（此前并入『其它货币』）。来源：IMF COFER'

export const CN_COFER_FOOTER =
  '左轴：人民币占比（%，面积）；右轴：美元占比（%，虚线）供对照。季度频率，来源：IMF COFER。'

// ============================================================
// 08 数据来源与口径（sources）
// ============================================================

export type CnSourceRow = {
  name: string
  channel: string
  cadence: string
  status: string
}

export const CN_SOURCES: CnSourceRow[] = [
  { name: '中国人民银行', channel: '公开市场业务公告（逆回购中标利率 / 中标量）', cadence: '日频', status: '正常' },
  { name: '中债（中国债券信息网）', channel: '国债收益率曲线（到期），505 个期限点', cadence: '日频', status: '正常' },
  { name: '中国货币网（全国银行间同业拆借中心）', channel: '回购定盘利率 DR/FR（接口硬上限 1 年）', cadence: '日频', status: '正常' },
  { name: '东方财富', channel: '中美 10 年期国债与利差、LPR 1Y 历史序列', cadence: '日频', status: '正常' },
  { name: 'IMF COFER', channel: '全球央行已分配外汇储备币种构成', cadence: '季频', status: '正常' },
]

export const CN_SOURCES_NOTE =
  '本页数据来自公开官方渠道，构建期抓取并落盘，页面不做实时请求。'

export const CN_SOURCES_FOOTER =
  '本页数据来自公开官方渠道（中国人民银行、中债（中国债券信息网）、中国货币网（全国银行间同业拆借中心）、东方财富、IMF COFER），' +
  '构建期抓取并落盘，页面不做实时请求。指标口径见各面板副标题与脚注。'
