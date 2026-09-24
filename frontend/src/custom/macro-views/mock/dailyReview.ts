// A股盘后日报（daily-review）的演示数据（报告日 2026-09-23，周三，数据时点 盘后 19:55）。
// 数据来源：演示整理稿第 9 章「A股盘后日报」逐秒 OCR 稿。
// 硬原则与其它 mock 相同：
//   1) 页面上的读数与口径说明逐字照抄整理稿，不做换算、不做美化；
//   2) 整理稿未读出、分组不明确或残缺的行，一律标〔推断〕／〔演示〕／留空（—），不虚构读数。

/** 页眉元信息条（照抄整理稿页眉；「完整盘后版（全日口径）」为 OCR 疑读的还原） */
export const DR_META = [
  '报告日期 2026-09-23（周三）',
  '数据时点 盘后 19:55',
  '同花顺行情接口（thsdk）',
  '完整盘后版（全日口径）',
] as const

/** 【今日盘面】一句话摘要（照抄整理稿） */
export const DR_SUMMARY =
  '上证-0.40%，上涨1774家/下跌3366家。两市成交 17650.0亿，较昨日-3704.0亿（82.7%）；涨停51家/跌停14家'

/** 量能说明行（照抄整理稿） */
export const DR_VOLUME_NOTE =
  '量能比 82.7%：缩量3704.0亿。北向：陆股通实时净买入自2024年8月起停止披露，量能以两市成交额观察。'

/** 情绪周期判断条（照抄整理稿「技术指标快照•情绪温度计」结论文本） */
export const DR_SENTIMENT = '情绪周期判断：回暖/分歧期（晋级率40%~60%，可参与但需控仓）'

// ============================================================
// 1. 先给结论：结论读数卡
// ============================================================

/** 看板上读数卡的统一形状（与 CnKpi 同构；muted 用于待披露/无读数卡片降权） */
export type DrKpi = {
  key: string
  label: string
  value: string
  unit?: string
  delta?: string
  deltaValue?: number
  hint?: string
  muted?: boolean
}

export const DR_CONCLUSION_KPIS: DrKpi[] = [
  { key: 'sh', label: '上证指数', value: '3936.52', delta: '-0.40% · 成交 8341.0 亿', deltaValue: -0.4 },
  { key: 'breadth', label: '上涨 / 下跌', value: '1774 / 3366', hint: '平盘 87 家 · 共 5227 只 · 上涨占比 33.9%' },
  { key: 'amount', label: '两市成交', value: '17650.0 亿', delta: '较昨日 -3704.0 亿 · 量能比 82.7%', deltaValue: -3704 },
  { key: 'limit', label: '涨停 / 跌停', value: '51 / 14', hint: '问财非ST口径' },
  { key: 'face', label: '大面 / 连板', value: '58 / 12', hint: '大面 = 今日跌幅 >7% 个股' },
  { key: 'rate', label: '封板率 / 晋级率', value: '66.2% / 48.9%', hint: '晋级率 = 昨日涨停（非ST）今日继续涨停占比' },
]

// ============================================================
// 2. 板块热力图：面积 = 成交额，色 = 涨跌幅（红涨绿跌）
// ============================================================

export type DrSector = {
  key: string
  name: string
  /** 涨跌幅 %（着色用，红涨绿跌） */
  pct: number
  /** 成交额（亿）＝ treemap 面积 */
  amountYi: number
  /** 整理稿只给出了板块名与涨跌幅，成交额为演示补足 */
  demo?: boolean
}

/** 前 11 个为领涨板块榜读数；后 4 个为补足资金流出侧的演示板块 */
export const DR_SECTORS: DrSector[] = [
  { key: 'fcl', name: '非金属材料', pct: 2.21, amountYi: 80.0 },
  { key: 'cw', name: '厨卫电器', pct: 1.53, amountYi: 13.0 },
  { key: 'yj', name: '元件', pct: 1.5, amountYi: 1233.0 },
  { key: 'bdt', name: '半导体', pct: 1.35, amountYi: 2286.0 },
  { key: 'dzhcp', name: '电子化学品', pct: 1.31, amountYi: 404.0 },
  { key: 'swzp', name: '生物制品', pct: 1.31, amountYi: 214.0 },
  { key: 'qtdz', name: '其他电子', pct: 1.28, amountYi: 171.0 },
  { key: 'tysb', name: '通用设备', pct: 0.95, amountYi: 566.0 },
  { key: 'ylfw', name: '医疗服务', pct: 0.9, amountYi: 360.0 },
  { key: 'qtshfw', name: '其他社会服务', pct: 0.75, amountYi: 48.0 },
  { key: 'ylqx', name: '医疗器械', pct: 0.64, amountYi: 206.0 },
  { key: 'txsb', name: '通信设备', pct: -0.67, amountYi: 1830.0, demo: true },
  { key: 'rjkf', name: '软件开发', pct: -1.4, amountYi: 1560.0, demo: true },
  { key: 'dl', name: '电力', pct: -1.9, amountYi: 2140.0, demo: true },
  { key: 'fdc', name: '房地产', pct: 0.2, amountYi: 392.0, demo: true },
]

/** 热力图口径（照抄整理稿图例 + 右上角标） */
export const DR_HEATMAP_NOTE =
  '色块=涨跌幅（红涨绿跌）· 面积=成交额 · 覆盖上涨与资金流出板块（非全市场）· 取成交额前 20 个板块 · 上涨 25/90 个板块 · 显示前 15'

// ============================================================
// 3. 领涨板块榜
// ============================================================

export type DrLeaderRow = {
  key: string
  name: string
  /** 涨跌幅 %（着色用） */
  pct: number
  pctText: string
  /** 「涨停」列在整理稿逐帧稿中未识别出读数，页面以 — 占位 */
  limitText: string
  /** 涨/跌家数（如 12/5） */
  upDown: string
  amountYi: number
  amountText: string
  /** 主力净流入（亿，着色用） */
  net: number
  netText: string
}

/** 领涨板块榜 11 行，读数照抄整理稿 t=118–119s（f_119–f_120） */
export const DR_LEADER_ROWS: DrLeaderRow[] = [
  { key: 'fcl', name: '非金属材料', pct: 2.21, pctText: '+2.21%', limitText: '—', upDown: '12/5', amountYi: 80.0, amountText: '80.0', net: 1.53, netText: '+1.53' },
  { key: 'cw', name: '厨卫电器', pct: 1.53, pctText: '+1.53%', limitText: '—', upDown: '5/4', amountYi: 13.0, amountText: '13.0', net: 0.64, netText: '+0.64' },
  { key: 'yj', name: '元件', pct: 1.5, pctText: '+1.50%', limitText: '—', upDown: '44/19', amountYi: 1233.0, amountText: '1233.0', net: -1.05, netText: '-1.05' },
  { key: 'bdt', name: '半导体', pct: 1.35, pctText: '+1.35%', limitText: '—', upDown: '121/66', amountYi: 2286.0, amountText: '2286.0', net: -32.13, netText: '-32.13' },
  { key: 'dzhcp', name: '电子化学品', pct: 1.31, pctText: '+1.31%', limitText: '—', upDown: '35/7', amountYi: 404.0, amountText: '404.0', net: -3.14, netText: '-3.14' },
  { key: 'swzp', name: '生物制品', pct: 1.31, pctText: '+1.31%', limitText: '—', upDown: '31/23', amountYi: 214.0, amountText: '214.0', net: -1.92, netText: '-1.92' },
  { key: 'qtdz', name: '其他电子', pct: 1.28, pctText: '+1.28%', limitText: '—', upDown: '23/11', amountYi: 171.0, amountText: '171.0', net: 1.02, netText: '+1.02' },
  { key: 'tysb', name: '通用设备', pct: 0.95, pctText: '+0.95%', limitText: '—', upDown: '135/114', amountYi: 566.0, amountText: '566.0', net: 5.68, netText: '+5.68' },
  { key: 'ylfw', name: '医疗服务', pct: 0.9, pctText: '+0.90%', limitText: '—', upDown: '34/21', amountYi: 360.0, amountText: '360.0', net: -10.33, netText: '-10.33' },
  { key: 'qtshfw', name: '其他社会服务', pct: 0.75, pctText: '+0.75%', limitText: '—', upDown: '23/16', amountYi: 48.0, amountText: '48.0', net: 0.66, netText: '+0.66' },
  { key: 'ylqx', name: '医疗器械', pct: 0.64, pctText: '+0.64%', limitText: '—', upDown: '79/60', amountYi: 206.0, amountText: '206.0', net: -2.62, netText: '-2.62' },
]

// ============================================================
// 4. 热点题材归因 TOP15（涨停原因聚类）
// ============================================================

export type DrTheme = { key: string; name: string; count: number }

/** 15 个聚类簇，只数照抄整理稿 t=117s（f_118）聚类列表 */
export const DR_THEMES: DrTheme[] = [
  { key: 'hua', name: '“华”字辈', count: 7 },
  { key: 'yjzz', name: '业绩增长', count: 4 },
  { key: 'ccxp', name: '存储芯片', count: 3 },
  { key: 'aiyy', name: 'AI应用', count: 2 },
  { key: 'lqsr', name: '液冷散热', count: 2 },
  { key: 'pcb', name: 'PCB概念', count: 2 },
  { key: 'gtxcs', name: '光通信测试', count: 2 },
  { key: 'xfdz', name: '消费电子', count: 2 },
  { key: 'cxy', name: '创新药', count: 2 },
  { key: 'cjnk', name: '业绩扭亏', count: 2 },
  { key: 'znzz', name: '智能制造', count: 2 },
  { key: 'wlfxy', name: '网络分析仪', count: 1 },
  { key: 'bdcs', name: '半导体测试', count: 1 },
  { key: 'jszn', name: '具身智能', count: 1 },
  { key: 'dzbl', name: '电子玻璃', count: 1 },
]

export type DrThemeStock = {
  key: string
  /** 归入的 TOP15 聚类（概念标签对照明确处填，其余留空由页面显示 —） */
  theme?: string
  stock: string
  industry: string
  tags?: string
}

/** 连板代表个股与其概念标签（照抄整理稿连板梯队与题材归因字段） */
export const DR_THEME_STOCKS: DrThemeStock[] = [
  { key: 'tms', stock: '泰慕士', industry: '纺织服饰', tags: '针织服装+贴牌加工' },
  { key: 'dysx', stock: '大亚圣象', industry: '轻工制造' },
  { key: 'twsx', theme: 'AI应用', stock: '天威视讯', industry: '传媒', tags: '文化传媒+AI应用+数据中心' },
  { key: 'wawj', theme: 'AI应用', stock: '我爱我家', industry: '房地产', tags: '房产经纪+二手房复苏+AI应用' },
  { key: 'jhqc', stock: '江淮汽车', industry: '汽车', tags: '尊界+华为合作' },
  { key: 'ahdz', theme: 'PCB概念', stock: '澳弘电子', industry: '电子', tags: 'PCB+HDI板+AI服务器电源+泰国基地' },
  { key: 'nwrj', theme: 'AI应用', stock: '南威软件', industry: '计算机', tags: 'AI应用出海+政务智能体+算力租赁' },
  { key: 'ajh', theme: '“华”字辈', stock: '奥佳华', industry: '家用电器', tags: '股份转让+健康机器人+按摩椅' },
]

// ============================================================
// 5. 连板梯队（连板 12 家 · 最高 4 板）
// ============================================================

export type DrLadderStock = {
  name: string
  industry: string
  tags?: string
  /** 整理稿未明确该股落在哪个连板分组，分组为推断 */
  inferred?: boolean
}

export type DrLadderGroup = { boards: number; stocks: DrLadderStock[] }

export const DR_LADDER: DrLadderGroup[] = [
  {
    boards: 4,
    stocks: [{ name: '泰慕士', industry: '纺织服饰', tags: '针织服装+贴牌加工+广州国资' }],
  },
  {
    boards: 3,
    stocks: [
      { name: '大亚圣象', industry: '轻工制造' },
      { name: '天威视讯', industry: '传媒', tags: '文化传媒+AI应用+数据中心' },
    ],
  },
  {
    boards: 2,
    stocks: [
      { name: '我爱我家', industry: '房地产', tags: '房产经纪+二手房复苏+AI应用' },
      { name: '江淮汽车', industry: '汽车', tags: '尊界+华为合作' },
      { name: '澳弘电子', industry: '电子', tags: 'PCB+HDI板+AI服务器电源+泰国基地' },
      { name: '南威软件', industry: '计算机', tags: 'AI应用出海+政务智能体+算力租赁' },
      { name: '奥佳华', industry: '家用电器', tags: '股份转让+健康机器人+按摩椅+“华”字辈' },
      { name: '新华文轩', industry: '传媒', tags: '拟收购民族出版社+教科书发行+数字教育…', inferred: true },
      { name: '华远控股', industry: '房地产', inferred: true },
      { name: '华丽家族', industry: '房地产', tags: '房地产开发+机器人+创新药+“华”字辈', inferred: true },
    ],
  },
]

/** 连板梯队脚注：可读个股 11 家，另有 1 家整理稿未读出名称 */
export const DR_LADDER_FOOTNOTE =
  '连板 12 家 · 最高 4 板；分组与个股以整理稿可读读数为准，分组不明确的行标〔推断〕，另有 1 家连板个股整理稿未读出名称。'

// ============================================================
// 6. 龙虎榜（榜单日期 20260923 · 上榜 35 家）
// ============================================================

export type DrDragonRow = {
  key: string
  name: string
  industry: string
  reason: string
  /** 演示补充行（整理稿仅残影可读，页面按演示处理） */
  demo?: boolean
}

export const DR_DRAGON_ROWS: DrDragonRow[] = [
  {
    key: 'yld',
    name: '优利德',
    industry: '机械设备',
    reason: '有价格涨跌幅限制的日收盘价格涨幅达到15%的证券',
  },
  { key: 'jjs', name: '会稽山', industry: '食品饮料', reason: '日振幅值达15%的证券' },
  { key: 'kqdz', name: '康强电子', industry: '电子', reason: '日涨幅偏离值达7%的证券', demo: true },
  {
    key: 'zykj',
    name: '中一科技',
    industry: '电力设备',
    reason: '有价格涨跌幅限制的日收盘价格涨幅达到15%的证券',
    demo: true,
  },
  {
    key: 'dksy',
    name: '电科思仪',
    industry: '机械设备',
    reason: '有价格涨跌幅限制的日换手率达到30%的证券',
    demo: true,
  },
]

// ============================================================
// 7. 资金流向（南向资金）
// ============================================================

export const DR_CAPITAL_KPIS: DrKpi[] = [
  {
    key: 'south',
    label: '南向当日净买',
    value: '+34.48',
    unit: '亿',
    deltaValue: 34.48,
    hint: '买入 427.9 亿 · 卖出 393.5 亿 · 成交总额 821.4 亿',
  },
  { key: 'hksh', label: '港股通（沪）', value: '+44.23', unit: '亿', deltaValue: 44.23, hint: '成交 528.8 亿' },
  { key: 'hksz', label: '港股通（深）', value: '-9.75', unit: '亿', deltaValue: -9.75, hint: '成交 292.6 亿' },
  { key: 'north', label: '北向（沪+深）', value: '停披', hint: '仅披露成交总额 2365.1 亿', muted: true },
]

/** 南向资金注文（照抄整理稿） */
export const DR_CAPITAL_NOTE =
  '北向净买额自 2024 年 8 月起停止披露，仅披露成交总额；南向净买额每日正常披露。数据源：东方财富 · 抓取时间 2026-09-23'

// ============================================================
// 8. 口径说明（照抄整理稿页脚口径段 + 免责）
// ============================================================

export const DR_CALIBER_NOTES = [
  '口径：涨停=问财非ST口径；炸板=今日曾涨停但未封住（非ST）；晋级率=昨日涨停（非ST）今日继续涨停占比；大面=今日跌幅>7%个股；北向=陆股通实时净买入2024年8月起停止披露；龙虎榜=榜单日期 20260923（盘后公布，16:00 时当日榜通常未出，自动回退最近可得交易日）；成交额=今日与昨日均为全天口径，可直接对比；尾盘异动=问财不支持14:30时间窗口类查询，该维度通常为 null，如后续接口支持会自动填充。',
  '涨跌配色遵循国内习惯：红涨/绿跌。',
  '仅供复盘参考，不构成投资建议。',
]
