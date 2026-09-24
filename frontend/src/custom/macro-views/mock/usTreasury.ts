// 美债看板（US）的演示数据。
// 数值一律照抄「微观 Value」演示视频第 5 章（t=58–68s）的逐秒 OCR 整理稿，不自己编；
// 曲线形状用 lib/mock.ts 的确定性生成器造：读数照抄、形状 mock，二者分离——
// 改读数不用重调曲线，同一 seed 刷新后形状也不变。
import { SNAPSHOT_DATE, seededWalk, yearlyBars } from '../lib/mock'

// ===== 1. 国债时钟 =====

export type UsClockKpi = {
  key: string
  label: string
  /** 主读数（字符串保持整理稿里的千分位与货币符号，不重算） */
  value: string
  unit?: string
  delta?: string
  deltaValue?: number
  source: string
  note: string
}

export const US_CLOCK_KPIS: UsClockKpi[] = [
  {
    key: 'total',
    label: '美国国债总额',
    // 精确到美元的读数照抄整理稿（$38,680,462,730,466）
    value: '$38,680,462,730,466',
    delta: '每秒 +$75,000',
    deltaValue: 75000,
    source: 'U.S. Treasury',
    note: '国债时钟的精确读数，每秒增加约 $75,000。',
  },
  {
    key: 'daily',
    label: '国债总规模（日频）',
    value: '$40.074T',
    delta: '+0.10%',
    deltaValue: 0.1,
    source: 'U.S. Treasury · Debt to the Penny · 2026-09-11',
    note: '日频总规模，来源 Debt to the Penny；与黄金看板「财政与信用」面板同源。',
  },
  {
    key: 'ratio',
    label: '债务 / GDP',
    value: '122.6%',
    delta: '2000 年：57.9%',
    source: 'U.S. Treasury Fiscal Data API',
    note: '债务总量已远超 GDP，进入历史未有区间。',
  },
]

/** 债务/GDP 仪表盘的指针读数（0→150% 量程） */
export const US_DEBT_GDP_RATIO = 122.6

// ===== 2. 债务/GDP 长期趋势（二战 vs 今天） =====

/** 二战后 1946→1981：从 118% 降到 35%（终点精确落值，seed 固定） */
export const US_DEBT_GDP_WAR_POINTS = seededWalk({
  start: 118,
  end: 35,
  points: 36,
  seed: 5101,
  volatility: 0.05,
  stepDays: 365,
  endDate: '1981-12-31',
})

/** 今天 2008→2026：从 62% 升到 122.6% */
export const US_DEBT_GDP_TODAY_POINTS = seededWalk({
  start: 62,
  end: 122.6,
  points: 19,
  seed: 5102,
  volatility: 0.06,
  stepDays: 365,
  endDate: SNAPSHOT_DATE,
})

export const US_NOTE_DEBTGDP =
  '二战后美国用了 35 年将债务/GDP 从 118% 降到 35%，靠的是高速经济增长 ＋ 温和通胀 ＋ 财政纪律。' +
  '今天的条件已经完全不同——经济增速放缓、人口老龄化、强制性支出刚性增长。'

// ===== 3. 联邦赤字趋势与赤字率 =====

/** 赤字/GDP（%）：终点 -5.8（照抄整理稿「赤字/GDP -5.8」），形状 mock */
export const US_DEFICIT_POINTS = seededWalk({
  start: -2.0,
  end: -5.8,
  points: 24,
  seed: 5103,
  volatility: 0.22,
  stepDays: 365,
  endDate: SNAPSHOT_DATE,
})

/** 整理稿里另一处标注「赤字/GDP：-2.4%」（不同口径/年份，照抄并标注） */
export const US_DEFICIT_ALT_READING = -2.4

/** 图内第二个标注点落的日期（取曲线中段，只作标注锚点） */
export const US_DEFICIT_ALT_DATE = US_DEFICIT_POINTS[8][0]

export const US_NOTE_DEFICIT =
  '经济学家通常用「赤字率」（赤字/GDP）来衡量财政健康程度。3% 被广泛视为一条警戒线；' +
  '欧盟《马斯特里赫特条约》就以此作为成员国的财政纪律标准。历史上，赤字率超过 5% 通常只发生在战争或严重经济危机期间。' +
  '在和平时期和经济增长期维持如此高的赤字率，美国正在创造一个没有先例的财政试验。'

// ===== 4. 2025 年美国财政支出流向（桑基图） =====

/**
 * 桑基图节点：左（收入来源）→ 中（联邦总收入）→ 右（支出去向）。
 * 数值为量级示意（单位：万亿美元）：收入约 $5.23T、支出约 $7.01T，与整理稿口径一致；
 * 整理稿里去向侧的百分比 OCR 残缺严重，因此按「比例大致合理」处理，不逐项照抄。
 */
export type UsFlowNode = { name: string; color: string }

export const US_FLOW_NODES: UsFlowNode[] = [
  { name: '个人所得税', color: '#d4a441' },
  { name: '企业所得税', color: '#d4a441' },
  { name: '社会保险税', color: '#d4a441' },
  { name: '其他收入', color: '#d4a441' },
  { name: '联邦总收入', color: '#f59e0b' },
  { name: '社会保障', color: '#38bdf8' },
  { name: '医疗保健', color: '#38bdf8' },
  { name: '国防', color: '#38bdf8' },
  { name: '净利息', color: '#38bdf8' },
  { name: '其他强制', color: '#38bdf8' },
  { name: '自由裁量', color: '#38bdf8' },
]

export type UsFlowLink = { source: string; target: string; value: number }

export const US_FLOW_LINKS: UsFlowLink[] = [
  // 收入侧：合计 5.23（万亿美元）
  { source: '个人所得税', target: '联邦总收入', value: 2.6 },
  { source: '社会保险税', target: '联邦总收入', value: 1.7 },
  { source: '企业所得税', target: '联邦总收入', value: 0.55 },
  { source: '其他收入', target: '联邦总收入', value: 0.38 },
  // 支出侧：合计 7.01，与收入差额 $1.78T 即年度赤字缺口（FY2025）
  { source: '联邦总收入', target: '社会保障', value: 1.62 },
  { source: '联邦总收入', target: '医疗保健', value: 1.55 },
  { source: '联邦总收入', target: '国防', value: 0.9 },
  { source: '联邦总收入', target: '净利息', value: 1.22 },
  { source: '联邦总收入', target: '其他强制', value: 0.85 },
  { source: '联邦总收入', target: '自由裁量', value: 0.87 },
]

export const US_NOTE_FLOW =
  '左侧是钱从哪来（所得税等），右侧是花到哪去（社会保障、医疗保健、国防等）。流线的宽度代表资金规模。'

// ===== 5. 美债每年到期规模 =====

/**
 * 2026→2035 十根柱（万亿美元口径）。为什么手写而不用 yearlyBars：
 * 三条硬读数必须落准——未来 3 年合计超过 $10 万亿、其中一年峰值 $7.2T（整理稿「$7.2T」）、
 * 峰值那根要单独标注，随机生成器保证不了这三条。
 */
export const US_MATURITY_BARS: Array<{ year: number; value: number }> = [
  { year: 2026, value: 3.4 },
  { year: 2027, value: 3.6 },
  { year: 2028, value: 3.2 },
  { year: 2029, value: 2.8 },
  { year: 2030, value: 4.1 },
  { year: 2031, value: 3.0 },
  { year: 2032, value: 5.2 },
  { year: 2033, value: 7.2 },
  { year: 2034, value: 2.9 },
  { year: 2035, value: 3.1 },
]

/** 峰值所在年份（图内标注 $7.2T 的那根柱） */
export const US_MATURITY_PEAK_YEAR = 2033

export const US_NOTE_MATURITY =
  '未来 3 年内将有超过 $10 万亿的国债集中到期，这些到期债务需要政府发行新债来偿还（即「再融资」），' +
  '如果当时市场利率高于原来的发行利率，再融资成本就会上升，进一步加重利息负担。' +
  '这就是为什么短期债务占比过高是一个风险信号——它让政府暴露在利率上行的风险中。'

/** 面板脚注：整理稿里「gross issuance ≠ 新增债务」的口径说明（照抄） */
export const US_MATURITY_FOOTNOTE =
  'gross issuance ≠ 新增债务：总发行包含短期国债到期后的滚动重发（rollover），占 GDP 8-9%，每月 2 万多亿；' +
  '发行量越大，市场一旦消化不动（需求不足、利率上升），冲击就越剧烈——这正是 2023 年长债拍卖屡屡引发市场紧张的根源。'

// ===== 6. 各类国债利息支出构成（2025） =====

/** 六类读数照抄整理稿：Bills $253B / Notes $494B / Bonds $176B / TIPS $21B / FRN $25B / Non-Marketable $0B */
export const US_INTEREST_BARS: Array<{ key: string; name: string; value: number }> = [
  { key: 'bills', name: 'Bills（短期国债）', value: 253 },
  { key: 'notes', name: 'Notes（中期国债）', value: 494 },
  { key: 'bonds', name: 'Bonds（长期国债）', value: 176 },
  { key: 'tips', name: 'TIPS', value: 21 },
  { key: 'frn', name: 'FRN', value: 25 },
  { key: 'non-marketable', name: 'Non-Marketable', value: 0 },
]

export const US_NOTE_INTEREST =
  'Notes（中期国债）：利息支出最大来源，占比约 40%，因存量规模最大。' +
  'Bonds（长期国债）：存量不如 Notes，但票面利率较高，贡献约 25% 的利息。' +
  'Bills（短期国债）：加息周期中利息支出急剧上升，每次到期再融资都按新利率定价。' +
  'Non-marketable（政府内部持有的特别发行国债）：利息不计入「净利息支出」，但影响政府间基金余额。'

// ===== 7. 美联储资产负债表三账户 =====

/** 银行准备金：2008 前接近 0，之后一路扩到 3.2T（单位：万亿美元） */
export const US_FED_RESERVES = seededWalk({
  start: 0,
  end: 3.2,
  points: 24,
  seed: 5201,
  volatility: 0.18,
  stepDays: 365,
  endDate: '2026-06-30',
})

/** TGA：财政部在央行的支票账户，0.1→0.8T */
export const US_FED_TGA = seededWalk({
  start: 0.1,
  end: 0.8,
  points: 24,
  seed: 5202,
  volatility: 0.6,
  stepDays: 365,
  endDate: '2026-06-30',
})

/**
 * ON RRP：为什么手写——它不是单调趋势，而是 2021–2023 冲高到 2.55T 后回落到约 $2bn（0.002T），
 * seededWalk 的「起止两点」造不出这种峰形，只能逐年给定。
 */
const US_FED_RRP_YEARLY: Array<[number, number]> = [
  [2003, 0], [2004, 0], [2005, 0], [2006, 0], [2007, 0], [2008, 0], [2009, 0], [2010, 0],
  [2011, 0], [2012, 0], [2013, 0.01], [2014, 0.1], [2015, 0.1], [2016, 0.3], [2017, 0.15],
  [2018, 0.35], [2019, 0.25], [2020, 0.05], [2021, 1.6], [2022, 2.55], [2023, 1.2],
  [2024, 0.4], [2025, 0.05], [2026, 0.002],
]

export const US_FED_RRP: Array<[string, number]> = US_FED_RRP_YEARLY.map(
  ([year, value]) => [`${year}-06-30`, value] as [string, number],
)

export const US_NOTE_FED =
  '银行准备金是商业银行存在央行的钱，TGA 是财政部在央行的支票账户，ON RRP 是货币基金「过夜存」在美联储的逆回购工具。' +
  '三个账户加起来近似系统总盘子。有意思的是这是个零和池：央行没新增放水时，TGA 上升必然挤压准备金或 RRP；' +
  '财政部花钱（TGA 下降）会回流到银行（准备金上升）或 RRP（货币基金）。所以看这三条线的相对升降，比看总量更能读出实时的流动性流向。' +
  'ON RRP 从 2022 年峰值 $2.55T 跌到现在约 $2bn——意味着货币基金里「过剩的钱」已经基本被抽光。' +
  '如果未来 TGA 还要补回（财政部发债融资），抽的就是银行准备金。'

// ===== 8. 红皇后跑步机 =====

export const RED_QUEEN_YEARS: number[] = Array.from({ length: 24 }, (_, index) => 2003 + index)

/** 债务增速（年末值同比，%）：年频柱状，形状 mock（5–12% 区间抖动） */
export const RED_QUEEN_DEBT_GROWTH = yearlyBars(RED_QUEEN_YEARS, 5301, 5, 12)
/** 名义 GDP 增速（含通胀，%）：2–8% 区间抖动 */
export const RED_QUEEN_GDP_GROWTH = yearlyBars(RED_QUEEN_YEARS, 5302, 2, 8)

// 2026 年的读数必须落准（整理稿：当前差距 +0.36%），其余年份保持随机形状
export const RED_QUEEN_DEBT_GROWTH_FINAL = RED_QUEEN_DEBT_GROWTH.map(row =>
  row.year === 2026 ? { ...row, value: 5.9 } : row,
)
export const RED_QUEEN_GDP_GROWTH_FINAL = RED_QUEEN_GDP_GROWTH.map(row =>
  row.year === 2026 ? { ...row, value: 5.54 } : row,
)

/** 关键读数（照抄整理稿）：最近 5 年「红皇后差距」+2.0%；当前 +0.36% */
export const RED_QUEEN_GAP_5Y = '+2.0%'
export const RED_QUEEN_GAP_NOW = '+0.36%'

export const US_NOTE_REDQUEEN =
  '债务/GDP 要稳住，名义 GDP 必须跑得和债务一样快。看看美国跑得够不够快。' +
  `最近 5 年的「红皇后差距」（债务增速 − 名义 GDP 增速）为 ${RED_QUEEN_GAP_5Y}；当前是 ${RED_QUEEN_GAP_NOW}，意味着利率跑赢增速 0.36%。` +
  '如果维持这个 gap，债务/GDP 每年会自动上升 0.36% × 债务存量比例，必须靠初级盈余（不算利息的盈余）补回——而美国目前根本没有初级盈余。'

// ===== 9. 美债持有结构（国内） =====

/** 八类国内持有者的相对比例（示意）：合计 100，比例按整理稿面板口径示意 */
export const US_HOLDERS_STRUCTURE: Array<{ name: string; value: number }> = [
  { name: '美联储', value: 20 },
  { name: '银行', value: 8 },
  { name: '货币基金', value: 8 },
  { name: '养老金与保险', value: 22 },
  { name: '家庭与个人', value: 12 },
  { name: '共同基金', value: 12 },
  { name: '州与地方政府', value: 8 },
  { name: '其他国内', value: 10 },
]

// ===== 10. 面板清单与口径（结构表） =====

export type UsPanelIndexRow = {
  key: string
  zone: string
  count: string
  panels: string
}

/** 分区 / 面板数 / 面板名：照抄整理稿左栏目录（面板名截断处保留「…」） */
export const US_PANEL_INDEX_ROWS: UsPanelIndexRow[] = [
  {
    key: 'overview',
    zone: '总览',
    count: '2',
    panels: '美债所处的拓扑结构、宏观经济五部门',
  },
  {
    key: 'fiscal',
    zone: '收支',
    count: '8',
    panels:
      '联邦财政收入、美国财政收入、联邦财政支出、美国财政支出、强制性 vs 自由裁量支出、2025年美国财政支出流…、联邦赤字趋势、赤字率',
  },
  {
    key: 'debt',
    zone: '债务',
    count: '9',
    panels:
      '美国国债总额、美债里程碑、债务/GDP 长期趋势、美债期限结构、各类国债平均利率、Bills vs Coupons 发行…、美债发行量激增、未来到期规模',
  },
  {
    key: 'cost',
    zone: '成本与供需',
    count: '7',
    panels: '加权平均利率、利息支出及占比、利息支出/财政收入、各类国债利息支出构成、美债供给与需求',
  },
  {
    key: 'dalio',
    zone: '达里奥框架',
    count: '—',
    panels: '长期债务周期框架',
  },
]

/** 各分区面板数（结构表里的「面板数」列，喂给结构面板的小柱状图） */
export const US_PANEL_COUNT_BARS: Array<{ zone: string; count: number }> = [
  { zone: '总览', count: 2 },
  { zone: '收支', count: 8 },
  { zone: '债务', count: 9 },
  { zone: '成本与供需', count: 7 },
]
