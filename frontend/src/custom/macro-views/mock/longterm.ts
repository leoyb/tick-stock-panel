// 全球长期资产收益工作台（LongTermAssets）的演示数据。
// 数值一律照抄整理稿（ch07_longterm_assets.md 第 7 章）的逐秒读数，快照至 2026-09：
// 热力图只有行/列与色阶口径来自整理稿（红正绿负、-30..30），格内数值为确定性 mock，
// 由 seededMatrix 生成，保证同一 seed 刷新后形状不变。
// 说明：本模块全部数据都是 mock，只用于跑通版式，不构成投资建议。
import { seededMatrix } from '../lib/mock'

// ===== 1. 跨市场锚点 =====

export type LaAnchorKpi = {
  key: string
  label: string
  value: string
  delta?: string
  deltaValue?: number
  source?: string
}

/** 关键读数·跨市场锚点（构建时快照） */
export const LA_ANCHOR_KPIS: LaAnchorKpi[] = [
  { key: 'hs300tr', label: '沪深300全收益', value: '6,825.04', delta: '+9.23%', deltaValue: 9.23, source: '年化·含分红 · 2025-12-31' },
  { key: 'csitotalbond', label: '中证全债', value: '267.45', delta: '+4.65%', deltaValue: 4.65, source: '年化·含票息 · 2026-08' },
  { key: 'csidividend', label: '中证红利全收益', value: '12.23%', delta: '+4.01pp', deltaValue: 4.01, source: '年化·分红贡献 · 交叉反推' },
  { key: 'gold', label: '黄金', value: '$4,365', delta: '-0.1%', deltaValue: -0.1, source: '年内 · USD/oz' },
  { key: 'us10y', label: '美债 10Y', value: '4.95%', delta: '+0.91pp', deltaValue: 0.91, source: '同比 · 一年前 4.04%' },
  { key: 'cn10y', label: '中债 10Y', value: '1.847%', source: '2025-12-31 到期收益率' },
  { key: 'eurusd', label: 'EUR/USD', value: '1.1593', source: '汇率 · 欧元/美元' },
  { key: 'usdcny', label: 'USD/CNY', value: '6.7360', source: '汇率 · 美元/人民币' },
  { key: 'cape', label: 'CAPE', value: '40.58', source: '周期调整市盈率' },
  { key: 'global-gdp', label: '全球 GDP', value: '2.9%', source: '2025 · 世界银行口径' },
]

// ===== 2. SBBI 中国 2005-2024 =====

/** SBBI 中国版年化收益（2005-2024，名义，%） */
export const LA_SBBI_BARS: Array<{ name: string; value: number }> = [
  { name: 'A股整体', value: 9.63 },
  { name: '大盘股', value: 9.18 },
  { name: '小盘股', value: 10.04 },
  { name: '黄金（上海金价）', value: 8.6 },
  { name: '长期国债', value: 4.53 },
  { name: '短期国债', value: 2.49 },
  { name: '通胀', value: 2.24 },
]

/** 用 type 而不是 interface：DataTable 的泛型约束是 Record<string, unknown>，interface 缺隐式索引签名会报错 */
export type LaSbbi2007Row = {
  key: string
  name: string
  value: string
}

/** 2007-2024 区间（18 年）补充口径，数据从 2006 年底中债高信用等级新财富 7-10 年指数起始日算起 */
export const LA_SBBI_2007_ROWS: LaSbbi2007Row[] = [
  { key: 'credit', name: '长期信用债', value: '5.47%' },
  { key: 'govt', name: '相同久期国债', value: '4.10%' },
  { key: 'bill', name: '短期国债', value: '2.53%' },
  { key: 'cpi', name: '通货膨胀', value: '2.30%' },
]

// ===== 3. 各指数长期年化（图4） =====

/** 图4·各指数长期年化收益率横向对比（至 2026-09-10，%） */
export const LA_INDEX_BARS: Array<{ name: string; value: number }> = [
  { name: '中证500', value: 9.95 },
  { name: '中证1000', value: 9.85 },
  { name: '中证2000', value: 9.41 },
  { name: '中证全指', value: 8.57 },
  { name: '中证红利', value: 8.43 },
  { name: '沪深300', value: 7.32 },
  { name: '科创50', value: 6.96 },
  { name: '中证100', value: 6.95 },
  { name: '上证50', value: 5.96 },
  { name: '上证红利', value: 5.88 },
]

// ===== 4. 年度收益率热力图（图3） =====

/** 热力图 y 轴：10 个指数（与图4 同序，图里自上而下） */
export const LA_HEAT_INDICES = LA_INDEX_BARS.map(item => item.name)

/** 热力图 x 轴：2005..2025 每 2 年取一档 */
export const LA_HEAT_YEARS = Array.from({ length: 11 }, (_, i) => String(2005 + i * 2))

/** 图3·10 个指数年度收益率热力图：格内数值为确定性 mock（-30..30，单位 %） */
export const LA_HEAT_MATRIX = seededMatrix(LA_HEAT_INDICES, LA_HEAT_YEARS, 20050910, -30, 30)

// ===== 5. 表1 年末收盘点位抽样 =====

/** 同上：type 而非 interface，满足 DataTable 的 Record<string, unknown> 约束 */
export type LaTable1Row = {
  key: string
  index: string
  year: string
  close: string
}

/** 表1·年末收盘点位（2005-2025）抽样，数值照抄整理稿 */
export const LA_TABLE1_ROWS: LaTable1Row[] = [
  { key: 'hs300-2005', index: '沪深300', year: '2005', close: '923.45' },
  { key: 'sz50-2008', index: '上证50', year: '2008', close: '1,384.91' },
  { key: 'csi1000-2015', index: '中证1000', year: '2015', close: '10,614.38' },
  { key: 'kc50-2025', index: '科创50', year: '2025', close: '1,344.20' },
]

// ===== 6. 国际长期资产 =====

export type LaGlobalRow = {
  key: string
  source: string
  metric: string
  value: string
  note: string
}

/** 国际长期资产各来源的关键读数，数值照抄整理稿 */
export const LA_GLOBAL_ROWS: LaGlobalRow[] = [
  { key: 'lbma-price', source: 'LBMA 黄金', metric: '最新金价（2026-09-10）', value: '$4,365', note: 'LBMA 下午定盘价 / 盎司 · 年内 -0.1%' },
  { key: 'lbma-nominal', source: 'LBMA 黄金', metric: '名义年化（1968-2025）', value: '8.49%', note: '58 年 · 年化波动 26.9%' },
  { key: 'lbma-real', source: 'LBMA 黄金', metric: '实际年化（扣美国 CPI）', value: '4.36%', note: '折算至 1967 年美元' },
  { key: 'lbma-drawdown', source: 'LBMA 黄金', metric: '最大回撤（日频，名义）', value: '-70.3%', note: '谷底 1999-07-20' },
  { key: 'lbma-cum', source: 'LBMA 黄金', metric: '累计倍数（1968-2025）', value: '104.2x', note: '实际购买力 11.4×' },
  { key: 'shiller-sp', source: 'Shiller 数据集', metric: 'S&P 指数（2026-09）', value: '7,631', note: '名义价格指数 · 最新月度观测' },
  { key: 'shiller-cape', source: 'Shiller 数据集', metric: 'CAPE 周期调整市盈率', value: '40.58', note: '历史区间 4.78（1920）- 44.20（1999）' },
  { key: 'shiller-real', source: 'Shiller 数据集', metric: '实际总收益年化（1871-2025）', value: '7.06%', note: '含股息再投资、经通胀调整' },
  { key: 'shiller-cum', source: 'Shiller 数据集', metric: '累计实际总收益', value: '36,408x', note: '155 年 / 1,869 个月（1871-01 – 2026-09）' },
  { key: 'ust-mean', source: '美债收益率曲线', metric: '10Y 全样本均值', value: '4.25%', note: '1990 至今算术平均' },
  { key: 'ust-low', source: '美债收益率曲线', metric: '10Y 历史最低', value: '0.52%', note: '2020-08-04 · 疫情后零利率时期' },
  { key: 'ust-high', source: '美债收益率曲线', metric: '10Y 历史最高', value: '9.09%', note: '1990-05-02 · 高利率尾声' },
  { key: 'ust-invert', source: '美债收益率曲线', metric: '倒挂交易日占比', value: '12.2%', note: '10Y < 3M · 共 1,122 天' },
  { key: 'ust-sample', source: '美债收益率曲线', metric: '样本跨度', value: '9,179 个交易日', note: '1990-01-02 – 2026-09-10' },
  { key: 'boe-scale', source: '英格兰银行千年数据', metric: '数据集规模', value: '65 变量', note: '22,487 条年度观测 · 1086-2016' },
  { key: 'boe-cpi', source: '英格兰银行千年数据', metric: '消费价格指数 2016', value: '100.7', note: '2015=100 · 序列从 1209 开始' },
  { key: 'boe-gdp', source: '英格兰银行千年数据', metric: '英格兰实际 GDP 2016', value: '1,600,372', note: '2013=100 · 相对 1270 增长 455x' },
  { key: 'boe-consols', source: '英格兰银行千年数据', metric: '长期国债收益率 2016', value: '1.99%', note: 'Consols 序列最后值' },
  { key: 'wb-gdp', source: '世界银行面板', metric: '全球 GDP 增速（2025）', value: '2.9%', note: '实际增速' },
  { key: 'wb-inflation', source: '世界银行面板', metric: '全球通胀（2025）', value: '3.0%', note: 'CPI 同比 · 2022 峰值后回落' },
  { key: 'wb-china', source: '世界银行面板', metric: '中国 GDP 增速（2025）', value: '5.0%', note: '美国同期 2.2%' },
  { key: 'wb-cap', source: '世界银行面板', metric: '全球股市市值/GDP（2025）', value: '149%', note: '中国 80% · 美国 224%' },
  { key: 'wb-cn-gdp', source: '世界银行面板', metric: '中国 GDP 总量（2025）', value: '$19.50万亿', note: '现价美元' },
  { key: 'wb-us-gdp', source: '世界银行面板', metric: '美国 GDP 总量（2025）', value: '$30.77万亿', note: '现价美元' },
  { key: 'wb-cn-capita', source: '世界银行面板', metric: '中国人均 GDP（2025）', value: '$13,793', note: '2015 年不变价美元' },
]

// ===== 7. 年末关键期限收益率矩阵（表1） =====

export type LaRateRow = {
  year: string
  y1: string
  y2: string
  y5: string
  y10: string
  y30: string
  spread: string
}

/** 年末关键期限收益率矩阵抽样；整理稿原始口径为 3M（利差=10Y−3M），2005 年 30Y 未读出 */
export const LA_RATE_ROWS: LaRateRow[] = [
  { year: '1990', y1: '6.63%', y2: '7.15%', y5: '7.68%', y10: '8.08%', y30: '8.26%', spread: '+1.45pp' },
  { year: '2000', y1: '5.89%', y2: '5.11%', y5: '4.99%', y10: '5.12%', y30: '5.46%', spread: '-0.77pp' },
  { year: '2005', y1: '4.08%', y2: '4.41%', y5: '4.35%', y10: '4.39%', y30: '—', spread: '+0.31pp' },
]

// ===== 8. 滚动持有期统计 =====

export type LaRollingRow = {
  key: string
  asset: string
  period: string
  samples: string
  positive: string
  median: string
  worst: string
  best: string
}

/** 滚动持有期统计抽样（正收益概率与极值），数值照抄整理稿 */
export const LA_ROLLING_ROWS: LaRollingRow[] = [
  { key: 'a10y', asset: 'A股整体', period: '10年', samples: '12', positive: '100.0%', median: '+6.58%', worst: '+0.77%', best: '+21.56%' },
  { key: 'small1y', asset: '小盘股', period: '1年', samples: '21', positive: '57.1%', median: '+17.64%', worst: '-59.19%', best: '+203.10%' },
]

// ===== 9. 模块清单 =====

export type LaModuleRow = {
  key: string
  group: string
  name: string
  en: string
}

/** 数据模块清单：中国 5 模块 + 国际 10 模块 */
export const LA_MODULES: LaModuleRow[] = [
  { key: 'cn-1', group: '中国市场数据', name: 'SBBI 中国版', en: '有知有行 × Ibbotson 体系' },
  { key: 'cn-2', group: '中国市场数据', name: '中证指数（价格）', en: 'China Securities Index Co.' },
  { key: 'cn-3', group: '中国市场数据', name: '中债收益率曲线', en: 'ChinaBond Pricing Center' },
  { key: 'cn-4', group: '中国市场数据', name: '中证全收益指数', en: 'CSIndex Total Return' },
  { key: 'cn-5', group: '中国市场数据', name: '中证债券指数总回报', en: 'CSIndex Bond Index' },
  { key: 'intl-1', group: '国际长期资产数据', name: 'UBS 投资回报年鉴', en: 'UBS Investment Return Yearbook' },
  { key: 'intl-2', group: '国际长期资产数据', name: 'Shiller 数据集', en: 'Yale ie_data' },
  { key: 'intl-3', group: '国际长期资产数据', name: 'JST 宏观金融史', en: 'Jorda-Schularick-Taylor Macrohistory' },
  { key: 'intl-4', group: '国际长期资产数据', name: 'French 因子数据', en: 'Dartmouth / Ken French Fama-French' },
  { key: 'intl-5', group: '国际长期资产数据', name: 'Damodaran 历史收益', en: 'NYU Stern / Damodaran' },
  { key: 'intl-6', group: '国际长期资产数据', name: 'LBMA 黄金长序列', en: 'LBMA' },
  { key: 'intl-7', group: '国际长期资产数据', name: '英格兰银行千年数据', en: 'Bank of England Millennium Dataset' },
  { key: 'intl-8', group: '国际长期资产数据', name: '美国国债收益率曲线', en: 'U.S. Treasury / Daily Yield Curve' },
  { key: 'intl-9', group: '国际长期资产数据', name: '汇率（欧元/人民币）', en: 'ECB / 市场报价' },
  { key: 'intl-10', group: '国际长期资产数据', name: '世界银行面板', en: 'World Bank Open Data' },
]
