// 全球市场周报（Weekly）的演示数据。
// 数值一律照抄整理稿（ch0809_briefing.md 第 8 章）的逐秒读数，报告期 2026-09-23：
// 明细表三行真实读数来自整理稿逐日明细（科创50/道琼斯工业/黄金），其余行整理稿未读出，
// 按〔演示〕标注补齐，避免把演示值误当真实读数。
// 说明：本模块全部数据都是 mock，只用于跑通版式，不构成投资建议。

/** 九宫格行情表的一行（资产 | 开盘 | 收盘 | 涨跌幅） */
export type WeeklyGridRow = {
  key: string
  asset: string
  open: string
  close: string
  /** 涨跌幅展示文本（照抄或演示补齐） */
  pct: string
  /** 用于红涨绿跌着色；null 表示不着色 */
  pctValue: number | null
  /** 整理稿未读出、按演示补齐的行 */
  demo: boolean
}

/** 报告期 2026-09-23 · 资产自选·九大类逐日明细（资产 | 开盘 | 收盘 | 涨跌幅） */
export const WEEK_GRID_ROWS: WeeklyGridRow[] = [
  { key: 'kc50', asset: '科创50', open: '1,615.53', close: '1,553.39', pct: '-1.52%', pctValue: -1.52, demo: false },
  { key: 'djia', asset: '道琼斯工业', open: '52,786.07', close: '52,573.29', pct: '-1.57%', pctValue: -1.57, demo: false },
  { key: 'gold', asset: '黄金', open: '4,504.10', close: '4,348.35', pct: '-3.77%', pctValue: -3.77, demo: false },
  { key: 'ssec', asset: '上证综指', open: '3,936.52', close: '3,920.95', pct: '-0.40%', pctValue: -0.4, demo: true },
  { key: 'wti', asset: 'WTI', open: '87.03', close: '83.40', pct: '-4.20%', pctValue: -4.2, demo: true },
  { key: 'brent', asset: '布伦特', open: '90.11', close: '86.55', pct: '-3.95%', pctValue: -3.95, demo: true },
  { key: 'dxy', asset: '美元指数', open: '103.2', close: '102.4', pct: '-0.78%', pctValue: -0.78, demo: true },
  { key: 'us10y', asset: '10Y 美债', open: '4.32%', close: '4.38%', pct: '+6bp', pctValue: 6, demo: true },
  { key: 'hsi', asset: '恒生指数', open: '17,900', close: '17,620', pct: '-1.56%', pctValue: -1.56, demo: true },
  { key: 'hs300', asset: '沪深300', open: '3,934.40', close: '3,920.95', pct: '-0.34%', pctValue: -0.34, demo: true },
  { key: 'eurusd', asset: 'EUR/USD', open: '1.16', close: '1.159', pct: '-0.09%', pctValue: -0.09, demo: true },
]

/** 九宫格行情表脚注 */
export const WEEK_GRID_NOTE = '九大类资产逐日明细 · 红涨绿跌一眼扫完 · 历史可回溯'

// ===== 2. 本周综述要点 =====

/** 综述要点：dotValue 决定色点颜色（正=红、负=绿、0=中性灰） */
export type WeeklySummaryPoint = {
  key: string
  text: string
  dotValue: number
}

export const WEEK_SUMMARY_POINTS: WeeklySummaryPoint[] = [
  { key: 'oil', text: '布伦特/WTI 双双破百：美伊油轮互袭与胡塞袭沙特设施推升油价，9/10 双双站上百元。', dotValue: 1 },
  { key: 'inflation', text: '美国 8 月 PPI +5.4%、CPI 核心超预期，9 月加息概率升至 58%。', dotValue: 1 },
  { key: 'us30y', text: '30Y 美债创 2007 年来新高。', dotValue: 1 },
  { key: 'black', text: '国内黑色系领跌（螺纹 -1.21%、铁矿 -1.71%）。', dotValue: -1 },
  { key: 'soybean', text: 'CBOT 大豆 -2.48%。', dotValue: -1 },
  { key: 'cu', text: '沪铜 -2.86%。', dotValue: -1 },
  { key: 'sw', text: '申万石油石化 +3.68%、房地产 +2.02%、钢铁 +1.93% 领涨。', dotValue: 1 },
  { key: 'food', text: '8 月全球食品价格指数 133.3，创 2022 年 12 月以来新高。', dotValue: 1 },
  { key: 'copper', text: '铜价最高 14,635 美元/吨，创历史新高。', dotValue: 1 },
  { key: 'risk-on-off', text: '日韩存储链狂欢、港股五连跌、A股放量失守。', dotValue: -1 },
]

// ===== 3. 市场量能 =====

/** 沪深两市成交（万亿）；柱值照抄整理稿柱顶标注 */
export const WEEK_VOLUME_BARS: Array<{ date: string; value: number }> = [
  { date: '9/7', value: 1.95 },
  { date: '9/8', value: 1.96 },
  { date: '9/9', value: 1.86 },
  { date: '9/10', value: 1.65 },
  { date: '9/11', value: 1.97 },
]

// ===== 4. 重大事件线 =====

export type WeeklyEventItem = {
  actor: string
  text: string
}

export type WeeklyEventGroup = {
  date: string
  items: WeeklyEventItem[]
}

/** 重大事件线：9/7、9/8、9/9 逐日主线，文案照抄整理稿 */
export const WEEK_EVENTS: WeeklyEventGroup[] = [
  {
    date: '9/9',
    items: [
      {
        actor: '国家统计局',
        text: '8月CPI同比 +0.8%（前值 +0.5%）、核心CPI +1.0%；PPI同比 +3.8%（前值 +3.5%），环比由降转涨。',
      },
      {
        actor: '物价温和修复',
        text: '能源（汽油同比 +9.3%）与消费电子（平板 +21.5%）为主要拉动；A股煤炭/航运/有色/电力走强。',
      },
      {
        actor: '伊朗革命卫队',
        text: '称打击 2 艘美国军舰与 8 艘油轮，另打击 10 艘违规船只；美军中央司令部称摧毁 5 艘伊朗油轮；布伦特自 7 月 24 日以来首次重回 100 美元上方（收 101.74），WTI 收 96.67。',
      },
      {
        actor: '北京市',
        text: '印发《北京市「十五五」时期数字经济发展规划》，提出推动算电协同绿色转型、新建智算中心 100% 使用绿电；算电协同概念走强，闽东电力两连板，申万电力指数 +0.48%。',
      },
    ],
  },
  {
    date: '9/8',
    items: [
      {
        actor: '也门胡塞武装',
        text: '称对沙特南部军事和石油设施发动大规模导弹与无人机袭击，沙特宣布部分能源设施停产；布油逼近 100 美元（收 99.33），WTI 收 94.25；红海—曼德海峡通航继续承压。',
      },
      {
        actor: 'A股风格切换',
        text: '申万石油石化 +3.68%、房地产 +2.02%、钢铁 +1.93% 领涨；世界气象组织确认超强厄尔尼诺，8 月全球食品价格指数 133.3 创 2022 年 12 月以来最高；上证 +0.20% 但创业板 -1.15%。',
      },
    ],
  },
  {
    date: '9/7',
    items: [
      {
        actor: '美伊周末互袭油轮',
        text: '伊朗革命卫队称打击 3 艘油轮及多艘美方关联船只，并称将宣布海峡外新「限制区」；国际油价跳涨（WTI 盘中重返 92 美元、布油触及 96.9 美元），避险与通胀预期同步升温。',
      },
      {
        actor: 'OpenAI/存储',
        text: '发布新一代大模型 GPT-6 Astra（上周五），叠加全球 DRAM 二季度营收同比 +385%，AI 存储与算力链情绪爆发；日经225 +2.12%（软银 +11.22%）、KOSPI +4.61%（三星 +5.68%、SK海力士 +8.26%）。',
      },
      {
        actor: '韩国关税厅',
        text: '今年累计出口额 7,094 亿美元超过去年全年历史纪录，前 8 月半导体出口 2,812 亿美元、同比 +169.6%（占比 40.6%）；KOSPI 单日暴涨 4.61%，为本周全球最强主要股指。',
      },
      {
        actor: 'LME 铜',
        text: '三个月期铜盘中突破今年 1 月高点，创历史新高（最高 14,635 美元/吨）；A股有色铜板块拉升。',
      },
    ],
  },
]

// ===== 5. 风险提示 =====

export type WeeklyRiskItem = {
  title: string
  text: string
}

/** 风险提示：照抄整理稿要点列表 */
export const WEEK_RISKS: WeeklyRiskItem[] = [
  {
    title: '中东局势反复',
    text: '9/14 阿曼磋商霍尔木兹通航为关键节点，若谈判破裂布油或再度冲高（美银情景 95-120 美元/桶）。',
  },
  {
    title: '9月15-16日 FOMC 议息',
    text: 'CME 显示加息 25bp 概率 88.8%，若落地为 2023 年以来首次加息，全球风险资产将面临重定价。',
  },
  {
    title: '美债长端风险',
    text: '30Y 已至 5.354%（2007 年 6 月以来新高），10Y 逼近 5%，若突破 5% 或触发美股 5-8% 级别回调。',
  },
  {
    title: 'A股量能持续萎缩',
    text: '本周连续 5 个交易日成交额低于 2 万亿，9/10 创下半年新低 1.65 万亿，存量博弈下题材轮动加剧。',
  },
  {
    title: '黄金高位巨震',
    text: '现货金周内 4,292-4,443 美元宽幅震荡，国内金饰一周下调 40 元/克，追涨杀跌风险高。',
  },
]
