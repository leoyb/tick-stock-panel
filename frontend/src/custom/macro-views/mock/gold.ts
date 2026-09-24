// 黄金看板（Au）的演示数据。
// 数值一律照抄演示视频的逐秒读数（快照日 2026-09-11），只有曲线形状是 mock 生成器造的：
// 视频里读不出曲线，若让形状也手写，一旦要改读数就得改两处，所以曲线只保留「起止值 + 波动率」，
// 由 seededWalk 确定性生成，保证同一 seed 刷新后形状不变。
import { SNAPSHOT_DATE, seededWalk } from '../lib/mock'
/** 快照日期的年月显示（面板脚注用） */
export const GOLD_FOOTNOTE = `数据截至 ${SNAPSHOT_DATE} ｜ 价格源：东财`

// ===== 1. 金价走势 =====

export type GoldPriceMetric = {
  key: string
  label: string
  /** 主读数（字符串保持视频里的千分位与货币符号，不重算） */
  value: string
  unit?: string
  /** 卡片上高亮的区间涨跌 */
  delta: string
  /** 用于红涨绿跌着色 */
  deltaValue: number
  /** 完整区间标签（5日 / 20日 / 3月 / 同比） */
  deltaLabels: string
  source: string
  /** 口径说明（照抄面板副标题） */
  note: string
}

export const GOLD_PRICE_METRICS: GoldPriceMetric[] = [
  {
    key: 'international',
    label: '国际金价（现货）',
    value: '$4,318.82',
    unit: '美元/盎司',
    delta: '-6.20%',
    deltaValue: -6.2,
    deltaLabels: '5日 -2.52% ｜ 20日 -6.20% ｜ 3月 +2.37% ｜ 同比 +18.84%',
    source: '东财 · 2026-09-11',
    note: '现货金价（COMEX/伦敦市场口径）。近 20 日 -6.20%，近一年 +18.84%。',
  },
  {
    key: 'rmb',
    label: '人民币金价',
    value: '¥931.84',
    unit: '/克',
    delta: '-6.34%',
    deltaValue: -6.34,
    deltaLabels: '5日 -2.47% ｜ 20日 -6.34% ｜ 3月 +1.58% ｜ 同比 +12.13%',
    source: '派生 · 2026-09-11',
    note: '人民币金价 = 国际金价 × 美元兑人民币 ÷ 31.1035。国内投资者实际承受的价格，同时受金价与汇率双重影响。',
  },
  {
    key: 'spread',
    label: '上海金 vs 伦敦金价差',
    value: '-4.69%',
    delta: '+0.95pp',
    deltaValue: 0.95,
    deltaLabels: '5日 -0.61pp ｜ 20日 +0.95pp ｜ 3月 +0.92pp ｜ 同比 -0.03pp',
    source: '派生 · 2026-09-11',
    note: '负值 -4.69%：国内价格低于国际，说明国内需求偏弱或进口配额宽松。',
  },
]

/** 面板副标题（照抄视频文案，说明该面板覆盖 7 个指标而读数只读出 3 组） */
export const GOLD_PRICE_SUBTITLE =
  '黄金本身的价格结构：国际金价、人民币金价、上海金溢价、白银与原油，以及与矿业股和年化收益的对照。'

/** 1998→2026 的国际金价月度长线：终点精确落在最新读数上，起点取 1998 年的量级 */
export const GOLD_INTL_PRICE_POINTS = seededWalk({
  start: 292,
  end: 4318.82,
  points: 340,
  seed: 1998,
  volatility: 0.06,
})

/** 上海金 vs 伦敦金价差（pp）；右轴范围与视频里的 2.00 … -10.00 刻度一致 */
export const GOLD_SPREAD_POINTS = seededWalk({
  start: -0.35,
  end: -4.69,
  points: 340,
  seed: 1999,
  volatility: 0.45,
})

// ===== 2. 历史分位 =====

export type GoldPercentile = {
  key: string
  label: string
  note: string
  values: Array<{ window: string; value: number }>
}

export const GOLD_PERCENTILES: GoldPercentile[] = [
  {
    key: 'international',
    label: '国际金价',
    note: '10 年分位 94%，处在窗口上沿。',
    values: [
      { window: '1y', value: 43 },
      { window: '3y', value: 81 },
      { window: '10y', value: 94 },
    ],
  },
  {
    key: 'rmb',
    label: '人民币金价',
    note: '按当日在岸汇率折算；同时承载金价与汇率两重信息。',
    values: [
      { window: '1y', value: 30 },
      { window: '3y', value: 59 },
      { window: '10y', value: 59 },
    ],
  },
  {
    key: 'spread',
    label: '上海金 vs 伦敦金价差',
    note: '价差 10 年分位 34%，溢价处于历史偏低位置。',
    values: [
      { window: '1y', value: 50 },
      { window: '3y', value: 34 },
      { window: '10y', value: 34 },
    ],
  },
]

// ===== 3. 全球地上黄金存量 =====

export const GOLD_STOCK_TOTAL = '225,724 吨'
export const GOLD_STOCK_MARKET_CAP = '$31.3 万亿'

/** 地上存量结构（金饰 44% / 投资 23% / 央行 18% / 其他 15%），结构比例直接喂环形图 */
export const GOLD_STOCK_STRUCTURE: Array<{ name: string; value: number }> = [
  { name: '金饰', value: 44 },
  { name: '投资', value: 23 },
  { name: '央行', value: 18 },
  { name: '其他', value: 15 },
]

// ===== 4. 机会成本（6 只 ETF 代理） =====

export type GoldOpportunityAsset = {
  key: string
  label: string
  value: string
  delta: string
  deltaValue: number
  /** 归一化对比曲线的终点（起点统一 100），取自各 ETF 的同比读数 */
  endIndex: number
  seed: number
  note: string
  source: string
}

export const GOLD_OPPORTUNITY_ASSETS: GoldOpportunityAsset[] = [
  {
    key: 'ief',
    label: '7-10 年期美国国债 ETF',
    value: '$91.18',
    delta: '5日 -1.77%',
    deltaValue: -1.77,
    endIndex: 122.04,
    seed: 1071,
    note: '与实际收益率互为镜像：价格上涨意味着实际利率下行。',
    source: '新浪财经 · 2026-09-11',
  },
  {
    key: 'tlt',
    label: '20+ 年期美国国债 ETF',
    value: '$80.78',
    delta: '20日 -1.55%',
    deltaValue: -1.55,
    endIndex: 116.19,
    seed: 1072,
    note: '20 年期以上美国国债 ETF，对利率最敏感的长久期资产。',
    source: '新浪财经 · 2026-09-11',
  },
  {
    key: 'shv',
    label: '短期美国国债 ETF',
    value: '$110.12',
    delta: '5日 -0.01%',
    deltaValue: -0.01,
    endIndex: 99.87,
    seed: 1073,
    note: '0-1 年短期国债 ETF，是「持有现金」的近似代理，也是黄金最直接的机会成本参照。',
    source: '新浪财经 · 2026-09-11',
  },
  {
    key: 'spy',
    label: '标普500 ETF',
    value: '$757.83',
    delta: '2026-09-10 +1.03%',
    deltaValue: 1.03,
    endIndex: 122.04,
    seed: 1074,
    note: '风险资产的代表，用于衡量黄金与股票的相关性弱。',
    source: '新浪财经 · 2026-09-10',
  },
  {
    key: 'qqq',
    label: '纳斯达克100 ETF',
    value: '$708.69',
    delta: '20日 -0.67%',
    deltaValue: -0.67,
    endIndex: 116.19,
    seed: 1075,
    note: '成长股代理，用于观察黄金与长久期风险资产的分化。',
    source: '新浪财经 · 2026-09-11',
  },
  {
    key: 'gld',
    label: '黄金 ETF（GLD 价格代理）',
    value: '$396.36',
    delta: '3月 +2.54%',
    deltaValue: 2.54,
    endIndex: 118.22,
    seed: 1076,
    note: '全球最大黄金 ETF 价格。ETF 持仓变化是衡量西方机构与个人投资者黄金需求的关键指标。',
    source: '新浪财经 · 2026-09-11',
  },
]

/** 归一化（起点 = 100）的一年期对比曲线，6 条 series 共用同一横轴 */
export const GOLD_OPPORTUNITY_SERIES: Array<{ key: string; label: string; points: Array<[string, number]> }> =
  GOLD_OPPORTUNITY_ASSETS.map(asset => ({
    key: asset.key,
    label: asset.label,
    points: seededWalk({
      start: 100,
      end: asset.endIndex,
      points: 252,
      seed: asset.seed,
      volatility: 0.03,
      stepDays: 1,
    }),
  }))

/** 机会成本面板副标题（照抄视频文案） */
export const GOLD_OPPORTUNITY_SUBTITLE =
  '持有黄金的核心代价是放弃生息资产。实际收益率、盈亏平衡通胀与替代资产的相对表现共同决定黄金的性价比。'

// ===== 5. 财政与信用 =====

export type GoldFiscalKpi = {
  key: string
  label: string
  value: string
  unit?: string
  delta: string
  deltaValue: number
  source: string
  note: string
}

export const GOLD_FISCAL_KPIS: GoldFiscalKpi[] = [
  {
    key: 'debt',
    label: '美国国债总规模（日频）',
    value: '$40.074T',
    delta: '+0.10%',
    deltaValue: 0.1,
    source: 'U.S. Treasury · Debt to the Penny · 2026-09-11',
    note: '美国国债总规模（日频，财政部 Debt to the Penny）。债务总量已远超 GDP，进入历史未有区间。',
  },
  {
    key: 'central-bank',
    label: '央行净购金',
    value: '863',
    unit: '吨',
    delta: '同比 -20.24%',
    deltaValue: -20.24,
    source: '世界黄金协会 WGC（官网端点 403，走回填通道）',
    note: '全球央行年净购金 863 吨。央行持续购金反映各国对美元储备体系的担忧，是黄金需求的结构性支撑。',
  },
  {
    key: 'reserve-share',
    label: '美元储备占比',
    value: '57.13%',
    delta: '+0.53pp',
    deltaValue: 0.53,
    source: 'IMF COFER',
    note: '美元在全球已分配外汇储备中的占比 57.13%。份额下降意味着货币体系正在碎片化，黄金作为中性储备资产的地位上升。',
  },
]

/** 财政与信用面板的双轴曲线：左轴债务总额（万亿美元），右轴美元储备占比（%） */
export const GOLD_FISCAL_DEBT_POINTS = seededWalk({
  start: 5.66,
  end: 40.074,
  points: 28,
  seed: 2026,
  volatility: 0.02,
  stepDays: 365,
})
export const GOLD_FISCAL_RESERVE_POINTS = seededWalk({
  start: 71.19,
  end: 57.13,
  points: 28,
  seed: 2027,
  volatility: 0.015,
  stepDays: 365,
})

// ===== 6. 风险温度 =====

export type GoldRiskKpi = {
  key: string
  label: string
  value: string
  unit?: string
  delta?: string
  deltaValue?: number
  source: string
  note: string
}

export const GOLD_RISK_KPIS: GoldRiskKpi[] = [
  {
    key: 'managed-money',
    label: '管理基金净多头',
    value: '140,811',
    unit: '手',
    delta: '1 年分位 85%',
    source: 'CFTC COT · 2026-09-09',
    note: '4周 +6.35% ／ 13周 +26.47% ／ 52周 -16.61%。投机头寸处于拥挤区间，极端多头意味着短期回调风险加大。',
  },
  {
    key: 'swap-dealers',
    label: 'Swap Dealers 净头寸',
    value: '-232,136',
    unit: '手',
    delta: '1周 +6.08%',
    deltaValue: 6.08,
    source: 'CFTC COT · 2026-09-09',
    note: 'Swap Dealers（投行/做市商）通常站在投机资金的对手方，与管理基金呈镜像关系。',
  },
  {
    key: 'gvz',
    label: 'GVZ 黄金隐含波动率',
    value: '27.79%',
    delta: '高波动区间',
    source: 'CBOE',
    note: '黄金波动率 27.79%，处于高波动区间，市场分歧加大。',
  },
  {
    key: 'gld',
    label: '黄金 ETF 持仓（GLD 价格代理）',
    value: '$396.36',
    delta: '3月 +2.54%',
    deltaValue: 2.54,
    source: '新浪财经 · 2026-09-11',
    note: '同比 +18.22%。',
  },
]

/**
 * 风险温度面板的 8 个指标里，有 4 个（COMEX 总持仓与三条均线动量）
 * 在演示视频里只出现了字段名、没有读数，这里单独列成表并标注「未读出」，
 * 而不是编一个数塞进 KPI 卡——页面上不能出现来路不明的数字。
 */
export type GoldRiskRow = {
  key: string
  metric: string
  value: string
  window: string
  note: string
}

export const GOLD_RISK_ROWS: GoldRiskRow[] = [
  { key: 'managed-money', metric: '管理基金净多头', value: '140,811 手', window: '1 年分位 85%', note: '4周 +6.35% ／ 13周 +26.47% ／ 52周 -16.61%' },
  { key: 'swap-dealers', metric: 'Swap Dealers 净头寸', value: '-232,136 手', window: '1周 +6.08%', note: '与管理基金呈镜像关系' },
  { key: 'gvz', metric: 'GVZ 黄金隐含波动率', value: '27.79%', window: '高波动区间', note: 'CBOE 黄金波动率指数' },
  { key: 'gld', metric: '黄金 ETF 持仓（GLD）', value: '$396.36', window: '3月 +2.54%', note: '同比 +18.22%' },
  { key: 'comex-oi', metric: 'COMEX 黄金期货总持仓', value: '—', window: '未读出', note: '视频仅出现字段名' },
  { key: 'mom-20', metric: '金价动量 · 20 日均线', value: '—', window: '未读出', note: '视频仅出现字段名' },
  { key: 'mom-60', metric: '金价动量 · 60 日均线', value: '—', window: '未读出', note: '视频仅出现字段名' },
  { key: 'mom-200', metric: '金价动量 · 200 日均线', value: '—', window: '未读出', note: '视频仅出现字段名' },
]

/** 镜像关系图：管理基金净多（上行）与 Swap Dealers 净头寸（下行） */
export const GOLD_RISK_MANAGED_MONEY = seededWalk({
  start: 85_000,
  end: 140_811,
  points: 120,
  seed: 4091,
  volatility: 0.11,
  stepDays: 7,
})
export const GOLD_RISK_SWAP_DEALERS = seededWalk({
  start: -150_000,
  end: -232_136,
  points: 120,
  seed: 4092,
  volatility: 0.11,
  stepDays: 7,
})

/** 风险温度面板副标题（照抄视频文案） */
export const GOLD_RISK_SUBTITLE =
  '仓位拥挤度与波动率：ETF 持仓、CFTC 投机净多、黄金隐含波动率与均线动量，反映短期情绪的冷热。'

// ===== 7. 分析框架（四层 21 个节点） =====

export type GoldFrameworkLayer = {
  key: string
  layer: string
  /** 层内子标签，如「财政 · 信用」 */
  sub: string
  nodes: string[]
}

/** 5 + 6 + 6 + 4 = 21 个节点，与视频「分析框架 21 个节点」一致 */
export const GOLD_FRAMEWORK: GoldFrameworkLayer[] = [
  {
    key: 'macro',
    layer: '宏观驱动',
    sub: '财政 · 信用',
    nodes: ['财政赤字/GDP', '债务/GDP', '净利息支出/收入', '央行净购金', '美元储备占比'],
  },
  {
    key: 'transmission',
    layer: '中观传导',
    sub: '利率 · 美元 · 通胀',
    nodes: ['5Y TIPS', '10Y TIPS', '金融条件指数', '核心PCE', '制造业指数', '失业率'],
  },
  {
    key: 'structure',
    layer: '市场结构',
    sub: '持仓 · 波动',
    nodes: ['黄金ETF', 'CFTC 净多头', 'GVZ', '20 日动量', '60 日动量', '200 日动量'],
  },
  {
    key: 'output',
    layer: '综合输出',
    sub: '读数 · 分位',
    nodes: ['价格中枢', '趋势强弱', '波动率', '配置价值'],
  },
]

// ===== 8. 数据来源与取数状态 =====

/** 取数状态语义：ok 正常 / warn 部分或降级 / pending 未取到（配色不用红绿，红绿只留给涨跌） */
export type GoldSourceRow = {
  key: string
  source: string
  channel: string
  status: string
  tone: 'ok' | 'warn' | 'pending'
}

export const GOLD_SOURCES: GoldSourceRow[] = [
  {
    key: 'fred',
    source: 'FRED',
    channel: '联邦储备经济数据（圣路易斯联储）',
    status: '正常',
    tone: 'ok',
  },
  {
    key: 'nfci',
    source: 'Chicago Fed NFCI',
    channel: '芝加哥联储全国金融条件指数（经 FRED 分发）',
    status: '未取到',
    tone: 'pending',
  },
  {
    key: 'eastmoney',
    source: '东方财富',
    channel: 'COMEX 现货金价、白银、原油、美元指数、美元兑人民币、人民币金价代理（替代被拦截的 Yahoo Finance）',
    status: '6/6 正常',
    tone: 'ok',
  },
  {
    key: 'sina',
    source: '新浪财经',
    channel: '美股 ETF 长历史日线（GLD/GDX/SPY/QQQ/TLT/IEF/SHV）',
    status: '成功 8/8',
    tone: 'ok',
  },
  {
    key: 'cftc',
    source: 'CFTC',
    channel: 'Disaggregated Commitments of Traders Report',
    status: '正常',
    tone: 'ok',
  },
  {
    key: 'cofer',
    source: 'IMF COFER',
    channel: '官方外汇储备货币构成',
    status: '正常',
    tone: 'ok',
  },
  {
    key: 'wgc',
    source: '世界黄金协会 WGC',
    channel: '央行净购金（官方下载端点 403，走回填通道）',
    status: '403 · 回填',
    tone: 'warn',
  },
  {
    key: 'treasury',
    source: 'U.S. Treasury',
    channel: 'Debt to the Penny（日频国债总规模）',
    status: '正常',
    tone: 'ok',
  },
]

/** 口径与免责说明（照抄视频文案） */
export const GOLD_SOURCE_NOTES: string[] = [
  `数据口径：日频指标每日更新，周频指标（CFTC COT、NFCI）每周更新，季频指标（赤字/GDP、债务/GDP）每季更新。构建期抓取并落盘，页面不做实时请求。`,
  '配色约定：涨跌配色遵循国内习惯：红涨/绿跌。状态色不参与涨跌语义，只用于标识取数结果。',
  '本页数据来自公开官方渠道（FRED、LBMA、COMEX、WGC、CBOE、美国财政部）。本看板仅供学习和研究参考，不构成任何投资建议。',
]
