// 美股看板（US）的演示数据（快照日 2026-09-11）。
// 两条硬原则（沿用 cnBond / gold 的做法）：
//   1) 页面上的读数、口径说明与脚注逐字照抄演示整理稿第 3 章（ch03_us_equity.md），
//      不做换算、不做美化，保证「页面写了什么」与「稿子上写了什么」能逐字对上；
//   2) 整理稿只给了端点读数 / 轴刻度的曲线，用 lib/mock.ts 的确定性生成器造形状——
//      同 seed 每次刷新一致，避免读者把 mock 形状误当成真实历史路径。
import { SNAPSHOT_DATE, seededWalk, yearlyBars } from '../lib/mock'

/** 页眉状态标记（与演示视频右上角的快照标记一致） */
export const US_META = [`数据 ${SNAPSHOT_DATE} · T-8`, '左栏共 46 个面板（旁白称 47）', '中 / EN']

/** 面板规模表的脚注（照抄整理稿口径：27 + 17 + 2 = 46，旁白称 47） */
export const US_PANEL_FOOTNOTE = '左栏合计 46 个面板 + 隐藏分组，旁白称 47'

/** KPI 卡片的统一形状（hint 走 KpiCard 的 hint；读数字符串不重算） */
export type UsKpi = {
  key: string
  label: string
  value: string
  unit?: string
  delta?: string
  deltaValue?: number
  source?: string
  hint?: string
}

// ============================================================
// 1. 估值与波动（valuation）
// ============================================================

export const US_VALUATION_KPIS: UsKpi[] = [
  {
    key: 'shiller-pe',
    label: 'SHILLER PE',
    value: '40.7',
    delta: '近12月 +14.2% ｜ 距历史高点 -0.6%',
    hint: '席勒市盈率：两个区间读数一正一负，不按涨跌着色。',
  },
  {
    key: 'vix',
    label: 'VIX 恐慌指数',
    value: '16.46',
    source: '数据日期 2026-09-09',
  },
  {
    key: 'vixeq',
    label: 'VIXEQ 个股（等权）波动率',
    value: '36.37',
    source: '数据日期 2026-09-10',
    hint: 'CBOE 2014.6 起（起点 2014-06-19）。',
  },
  {
    key: 'gap',
    label: '等权 − 市值',
    value: '+19.91',
    hint: '等权波动率显著高于市值（个股层面恐慌）。',
  },
  {
    key: 'erp',
    label: '隐含风险溢价',
    value: '-691',
    unit: 'bps',
    hint: '预测股票年化 − 10y 国债。负值 = 现金更优。',
  },
  {
    key: 'sp500',
    label: '标普500 最新',
    value: '52,380.66',
    source: '更新时间 2026-09-09',
  },
  {
    key: 'origin',
    label: '起点',
    value: '54.63',
    delta: '1914-12-31',
    hint: '用起始月度点位给长周期一个基准。',
  },
  {
    key: 'cagr',
    label: '复合增速',
    value: '6.34%',
    hint: '按起点到当前月度点位计算的长期 CAGR。',
  },
]

// ============================================================
// 2. 标普500 百年走势（century）
// ============================================================

/**
 * 标普500 百年长线：两端读数来自整理稿信息卡（起点 1914-12-31 ｜ 54.63，最新 52,380.66）。
 * 1360 × 30 天 ≈ 1914-12-31 → 2026-09-11 的跨度（points≈1350，取整到能对齐起点读数），
 * 终点精确落在最新读数上，中段为确定性噪声。
 */
export const US_CENTURY_POINTS = seededWalk({
  start: 54.63,
  end: 52380.66,
  points: 1360,
  seed: 1914,
  volatility: 0.04,
  stepDays: 30,
})

/** 衰退阴影灰带（NBER/FRED US recession 指标）：演示只画四段最有代表性的区间 */
export const US_RECESSION_RANGES: Array<[string, string]> = [
  ['1929-08-01', '1933-03-01'],
  ['2000-03-01', '2001-11-01'],
  ['2007-12-01', '2009-06-01'],
  ['2020-02-01', '2020-04-01'],
]

// ============================================================
// 3. 标普500 年度涨跌幅（annual）
// ============================================================

export type UsAnnualBar = { year: number; value: number }

const ANNUAL_YEARS = Array.from({ length: 2025 - 1928 + 1 }, (_, index) => 1928 + index)

/**
 * 1928 → 2025 的年度柱：先用 yearlyBars 造形状，再强制覆盖整理稿里读到的 4 个真实读数
 * （2008 = -38.5、2022 = -19.4、2021 = +26.9、2023 = +54.86），其余年份保持演示值。
 */
export const US_ANNUAL_BARS: UsAnnualBar[] = (() => {
  const overrides: Record<number, number> = { 2008: -38.5, 2022: -19.4, 2021: 26.9, 2023: 54.86 }
  return yearlyBars(ANNUAL_YEARS, 1928, -45, 52).map(bar =>
    bar.year in overrides ? { ...bar, value: overrides[bar.year] } : bar,
  )
})()

/** 年度涨跌抽样行（照抄整理稿 t=38s 的「年内最大回撤 / 全年涨跌」读数） */
export type UsAnnualSampleRow = {
  key: string
  year: string
  drawdown: string
  annual: string
  annualValue: number
}

export const US_ANNUAL_SAMPLE_ROWS: UsAnnualSampleRow[] = [
  { key: '1943', year: '1943', drawdown: '-13.1%', annual: '+19.4%', annualValue: 19.4 },
  { key: '1944', year: '1944', drawdown: '-6.9%', annual: '+13.8%', annualValue: 13.8 },
  { key: '2008', year: '2008', drawdown: '-48.0%', annual: '-38.5%', annualValue: -38.5 },
  { key: '2022', year: '2022', drawdown: '-25.4%', annual: '-19.4%', annualValue: -19.4 },
]

// ============================================================
// 4. 标普500 回报分解（decompose）
// ============================================================

const DECOMPOSE_YEARS = Array.from({ length: 2025 - 1999 + 1 }, (_, index) => 1999 + index)

export type UsDecomposeBar = {
  year: number
  price: number
  dividend: number
  buyback: number
  total: number
}

/**
 * 价格 / 股息 / 净回购三段先用 yearlyBars 造形状；总回报恒等于三段之和（恒等式，不另造一条线）。
 * 极值年份对齐整理稿读数：最佳 2023 总回报 +54.86%、最差 2008 总回报 -41.73%，
 * 差额塞回价格段，保证「三段之和 ≈ 总回报」在每一年都成立。
 */
export const US_DECOMPOSE_BARS: UsDecomposeBar[] = (() => {
  const price = yearlyBars(DECOMPOSE_YEARS, 1999, -25, 45)
  const dividend = yearlyBars(DECOMPOSE_YEARS, 2000, 0.4, 1.2)
  const buyback = yearlyBars(DECOMPOSE_YEARS, 2001, 0.2, 1.1)
  const forcedTotals = new Map<number, number>([
    [2023, 54.86],
    [2008, -41.73],
  ])
  return DECOMPOSE_YEARS.map((year, index) => {
    let p = price[index].value
    const d = dividend[index].value
    const b = buyback[index].value
    const forced = forcedTotals.get(year)
    if (forced !== undefined) p += forced - (p + d + b)
    p = Number(p.toFixed(2))
    return { year, price: p, dividend: d, buyback: b, total: Number((p + d + b).toFixed(2)) }
  })
})()

/** 回报分解面板的均值读数（照抄整理稿 KPI 卡） */
export const US_DECOMPOSE_KPIS: UsKpi[] = [
  { key: 'price-mean', label: '价格回报均值', value: '11.88%', hint: '看指数点位本身的年度涨跌。' },
  { key: 'dividend-mean', label: '股息回报均值', value: '0.75%', hint: '现金分红贡献。' },
  { key: 'buyback-mean', label: '净回购均值', value: '0.69%', hint: '用净回购近似股本收缩贡献。' },
  { key: 'total-mean', label: '总回报均值', value: '12.63%', hint: '正收益 21/27 年。' },
  { key: 'best-worst', label: '最佳 / 最差（2023 / 2008）', value: '54.86% / -41.73%' },
]

// ============================================================
// 5. 纳斯达克100 自高点回撤（drawdown）
// ============================================================

/**
 * 每个采样日距历史最高点的跌幅（负值，%）：seededWalk 造 0 → -5 的浅水基线
 * （692 × 14 天 ≈ 2000-03 → 2026-09-11 的跨度），再把 2000-03 → 2002-12 的点
 * 按抛物线压深、缩放到谷底精确等于整理稿读数 -82.9%。
 */
export const US_DRAWDOWN_POINTS: Array<[string, number]> = (() => {
  const raw = seededWalk({
    start: 0,
    end: -5,
    points: 692,
    seed: 20000310,
    volatility: 0.4,
    stepDays: 14,
  })
  const winStart = Date.parse('2000-03-01T00:00:00Z')
  const winEnd = Date.parse('2002-12-31T00:00:00Z')
  const inWindow = (date: string) => {
    const t = Date.parse(`${date}T00:00:00Z`)
    return t >= winStart && t <= winEnd
  }
  // 抛物线挖坑：sin(πt) 在窗口两端为 0、中段为 1，坑外曲线不动
  const dug = raw.map(([date, value]): [string, number] => {
    if (!inWindow(date)) return [date, value]
    const t = (Date.parse(`${date}T00:00:00Z`) - winStart) / (winEnd - winStart)
    const parabola = Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
    return [date, Number((value - 90 * parabola).toFixed(2))]
  })
  // 窗口内整体缩放，让最低点精确落在 -82.9（谷底读数），其余点同比例收缩
  const windowMin = Math.min(...dug.filter(([date]) => inWindow(date)).map(([, value]) => value))
  const factor = -82.9 / windowMin
  return dug.map(([date, value]): [string, number] => [
    date,
    inWindow(date) ? Number((value * factor).toFixed(2)) : value,
  ])
})()

// ============================================================
// 6. 恐慌指数与标普500（vix）
// ============================================================

/** markArea 红带：VIX 持续高于 30 的两段恐慌阶段（2008、2020），颜色 rgba(239,68,68,0.08) 由图表层给 */
export const US_VIX_MARK_RANGES: Array<[string, string]> = [
  ['2008-09-01', '2009-04-01'],
  ['2020-02-20', '2020-06-01'],
]

/**
 * VIX 序列（CBOE 自 1990 年起才有）：seededWalk 造 17 → 16.46 的基线（终点对齐整理稿读数），
 * 两段恐慌窗口手工抬到 30 以上（base + amp·sin(πt)，整段始终 > 30，与 markArea 对齐）。
 */
export const US_VIX_POINTS: Array<[string, number]> = (() => {
  const raw = seededWalk({
    start: 17,
    end: 16.46,
    points: 440,
    seed: 1990,
    volatility: 0.18,
    stepDays: 30,
  })
  const spikes = [
    { from: '2008-09-01', to: '2009-04-01', base: 45, amp: 30 },
    { from: '2020-02-20', to: '2020-06-01', base: 38, amp: 44 },
  ].map(spike => ({
    ...spike,
    fromT: Date.parse(`${spike.from}T00:00:00Z`),
    toT: Date.parse(`${spike.to}T00:00:00Z`),
  }))
  return raw.map(([date, value]): [string, number] => {
    const t0 = Date.parse(`${date}T00:00:00Z`)
    let next = value
    for (const spike of spikes) {
      if (t0 >= spike.fromT && t0 <= spike.toT) {
        const t = (t0 - spike.fromT) / (spike.toT - spike.fromT)
        next = spike.base + spike.amp * Math.sin(Math.PI * t)
      }
    }
    return [date, Number(next.toFixed(2))]
  })
})()

// ============================================================
// 7. 巴菲特指标（buffett）
// ============================================================

/**
 * 改良版巴菲特指标（TMC/（GDP+美联储资产））：整理稿只给口径与轴量级（250%），
 * 没有任何逐点读数，所以 1960 → 2026 只造「40 → 110 区间」的演示形状、不标数值；
 * 终点取季度末（Z.1 报告季频，滞后约 10 周）。
 */
export const US_BUFFETT_POINTS = seededWalk({
  start: 40,
  end: 110,
  points: 67,
  seed: 1960,
  volatility: 0.16,
  stepDays: 365,
  endDate: '2026-06-30',
})

// ============================================================
// 8. 面板规模（panels）
// ============================================================

export type UsPanelGroupRow = {
  key: string
  group: string
  count: string
  samples: string
}

/** 左栏三组（读数照抄整理稿目录：27 / 17 / 2）；代表面板名也取自整理稿目录 */
export const US_PANEL_GROUPS: UsPanelGroupRow[] = [
  {
    key: 'sp500',
    group: '标普500',
    count: '27 个面板',
    samples: '标普500年度回报 · 回报分解 · 自高点回撤 · 席勒市盈率走势 · 成分股全景 · 编制规则 …',
  },
  {
    key: 'ndx-dji',
    group: '纳斯达克100与道琼斯',
    count: '17 个面板',
    samples: '纳斯达克100年度回报 · 跨年持有 · 自高点回撤 · 权重累计 · 成分股集中度 · 道琼斯指数百年走势 …',
  },
  {
    key: 'style-etf',
    group: '风格ETF',
    count: '2 个面板',
    samples: '美股主流风格 ETF 走势 · 风格 ETF 风险收益平面',
  },
]

/** 左栏三组面板数（27 + 17 + 2 = 46；旁白称 47，含隐藏分组） */
export const US_PANEL_COUNTS: Array<{ name: string; value: number }> = [
  { name: '标普500', value: 27 },
  { name: '纳斯达克100与道琼斯', value: 17 },
  { name: '风格ETF', value: 2 },
]
