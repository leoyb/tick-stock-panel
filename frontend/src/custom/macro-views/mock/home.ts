// 首页（星轨导航页）的演示数据。
// 数值取自演示视频画面（快照日 2026-09-11），仅用于版式演示。

export interface HubMetric {
  value: string
  label: string
}

/** 页面中央的四组大号数字（视频里叠在星轨中心） */
export const HUB_METRICS: HubMetric[] = [
  { value: '15组数据源', label: '数据源' },
  { value: '8个市场', label: '覆盖市场' },
  { value: '8 个入口', label: '看板入口' },
  { value: '125年的历史数据', label: '历史长度' },
]

/** 底部指标横条（与看板注册表里的读数一致，这里只排顺序） */
export const TICKER_KEYS = ['gold', 'us-equity', 'us-treasury', 'a-share', 'cn-bond']

export interface WorkEntry {
  label: string
  note: string
}

/** 「作品墙」里的其它作品入口：本仓库未实现，按禁用态展示（覆盖 disabled 状态检查） */
export const WORK_ENTRIES: WorkEntry[] = [
  { label: '个人理财工作台', note: '未在本仓库实现' },
  { label: '斩题刷题', note: '未在本仓库实现' },
  { label: '招标工作台', note: '未在本仓库实现' },
  { label: '长期资产资料库', note: '未在本仓库实现' },
  { label: '职场工作台', note: '未在本仓库实现' },
  { label: '周报代码助手', note: '未在本仓库实现' },
]
