// 看板注册表：路由、导航、首页卡片和底部导航共用同一份定义，
// 避免「首页列了 8 个入口但路由里少一个」这类漂移。
// 说明：本模块是「微观 Value · 百年尺度，宏观看板集」的界面复刻，数据全部为演示 mock。

export interface BoardMeta {
  /** 稳定 key，同时用作路由 path 的最后一段 */
  key: string
  /** 路由 id，需与 extension.tsx 中注册的 route.id 一致 */
  routeId: string
  /** 路由路径（必须是非根静态路径，满足扩展注册约束） */
  path: `/${string}`
  /** 页眉小徽标（对应视频里的 Au / US / 债 / A股 / LA 等） */
  badge: string
  label: string
  subtitle: string
  /** 首页卡片与底部指标条展示的读数（演示值，取自演示视频画面） */
  metric: { value: string; note: string }
  /** 卡片标签 */
  tags: string[]
}

export const HOME_PATH = '/research/macro-views'

export const BOARDS: BoardMeta[] = [
  {
    key: 'gold',
    routeId: 'research-macro-gold',
    path: `${HOME_PATH}/gold`,
    badge: 'Au',
    label: '黄金看板',
    subtitle: '不预测金价，只帮你看清黄金正在反映什么',
    metric: { value: '$4,318.82', note: '近一年 +18.84%' },
    tags: ['实际利率', '央行购金', 'CFTC 头寸', '美元储备占比'],
  },
  {
    key: 'us-equity',
    routeId: 'research-macro-us-equity',
    path: `${HOME_PATH}/us-equity`,
    badge: 'US',
    label: '美股看板',
    subtitle: 'Big Picture · 百年尺度下的美股',
    metric: { value: '40.7', note: 'SHILLER PE 估值' },
    tags: ['百年走势', '年度涨跌', '席勒 PE', '巴菲特指标'],
  },
  {
    key: 'us-treasury',
    routeId: 'research-macro-us-treasury',
    path: `${HOME_PATH}/us-treasury`,
    badge: '债',
    label: '美债看板',
    subtitle: '不预测利率，只帮你看清美债正在反映什么',
    metric: { value: '$40.07万亿', note: '债务/GDP 122.6%' },
    tags: ['国债时钟', '财政收支', '拍卖供需', '红皇后跑步机'],
  },
  {
    key: 'a-share',
    routeId: 'research-macro-a-share',
    path: `${HOME_PATH}/a-share`,
    badge: 'A股',
    label: 'A股看板',
    subtitle: '不预测涨跌，只帮你看清市场处在什么位置',
    metric: { value: '3,934.40', note: '沪深300 PE 13.62' },
    tags: ['长历史走势', '回报结构', '估值分位', '两融杠杆'],
  },
  {
    key: 'cn-bond',
    routeId: 'research-macro-cn-bond',
    path: `${HOME_PATH}/cn-bond`,
    badge: '债市',
    label: '中国债券看板',
    subtitle: '从资金面到利率曲线，看清钱的价格',
    metric: { value: '1.6797%', note: '10Y 国债收益率' },
    tags: ['收益率曲线', '期限利差', 'DR007', '逆回购'],
  },
  {
    key: 'daily-review',
    routeId: 'research-macro-daily-review',
    path: `${HOME_PATH}/daily-review`,
    badge: '日报',
    label: 'A股盘后日报',
    subtitle: '每交易日 16:10 自动生成的盘后复盘',
    metric: { value: '交易日 16:10', note: '先给结论再给证据' },
    tags: ['情绪温度计', '板块热力图', '题材归因', '龙虎榜'],
  },
  {
    key: 'weekly',
    routeId: 'research-macro-weekly',
    path: `${HOME_PATH}/weekly`,
    badge: '周报',
    label: '全球市场周报',
    subtitle: 'GLOBAL MARKETS · WEEKLY TERMINAL',
    metric: { value: '每周更新', note: '九大类资产逐日明细' },
    tags: ['市场量能', '大类资产', '红涨绿跌', '历史可回溯'],
  },
  {
    key: 'longterm-assets',
    routeId: 'research-macro-longterm',
    path: `${HOME_PATH}/longterm-assets`,
    badge: 'LA',
    label: '全球长期资产收益工作台',
    subtitle: '155 年真实数据，看清各类资产的长期回报',
    metric: { value: '1900-2025 · 15 源', note: '15 个模块 · 59 张图' },
    tags: ['长期年化', '年末点位矩阵', '年度收益率热力图', '滚动持有期'],
  },
]

export function boardByKey(key: string): BoardMeta | undefined {
  return BOARDS.find(board => board.key === key)
}
