# 宏观看板集（macro-views）

本目录是一个**前端扩展模块**，把另一个产品「**微观 Value · 百年尺度，宏观看板集**」（一段 132 秒产品演示视频里的
九个页面）用 tickflow 现有技术栈复刻出来，用于验证版式、图表与交互。

> **数据全部是 mock。** 页面上的数值取自演示视频画面（快照日 2026-09-11）以便肉眼比对，
> 曲线形状由 `lib/mock.ts` 的确定性伪随机生成器造出，**不接任何行情接口、不构成投资建议**。
> 每个页面顶部都有醒目的「演示数据（mock）」提示条。

## 为什么放在 `custom/` 而不是 `pages/`

依据 `docs/secondary-development.md`：**新增完整页面必须走扩展机制注册**（routes + navigation），
入口文件名固定为 `src/custom/<namespace>/extension.tsx`，由 `main.tsx` 的 `initializeFrontendExtensions()`
自动发现。这样本模块**不需要修改** `router.tsx` / `components/Layout.tsx` / `lib/api.ts` / `lib/queryKeys.ts`
等核心热点文件，删除本目录即可整体卸载。

与既有 `custom/us-market`（美股市场聚合页）的区别：那一组页面读取真实后端数据、面向实际研究使用；
本模块是**纯前端的界面复刻演示**，独立命名空间 `research.macro-views`，两者不共享数据层，也不互相依赖。

## 页面与路由

侧栏入口：**宏观看板集**（order 320）。八个看板通过首页"星轨"与每页底部的看板导航互跳。

| 页面 | 路由 | 组件 |
|---|---|---|
| 首页 · 星轨导航 | `/research/macro-views` | `boards/MacroHome.tsx` |
| 黄金看板 | `/research/macro-views/gold` | `boards/GoldBoard.tsx` |
| 美股看板 | `/research/macro-views/us-equity` | `boards/UsEquityBoard.tsx` |
| 美债看板 | `/research/macro-views/us-treasury` | `boards/UsTreasuryBoard.tsx` |
| A股看板 | `/research/macro-views/a-share` | `boards/AShareBoard.tsx` |
| 中国债券看板 | `/research/macro-views/cn-bond` | `boards/CnBondBoard.tsx` |
| A股盘后日报 | `/research/macro-views/daily-review` | `boards/DailyReview.tsx` |
| 全球市场周报 | `/research/macro-views/weekly` | `boards/WeeklyReport.tsx` |
| 全球长期资产收益工作台 | `/research/macro-views/longterm-assets` | `boards/LongTermAssetsBoard.tsx` |

## 与逐秒视频报告的图表对照

已按报告的「章节概览」与可辨认的面板标题补绘：黄金的人民币金价对数线；美股的月度矩阵与 EPS；中国债券的准备金率；美债的拓扑关系和发行量；A 股的月度矩阵、滚动五年、年内回撤对照、PE、融资净买入与成交额；长期资产的黄金实际价格示意与美债曲线族；盘后日报的市场宽度、量能、板块资金、情绪比率和南向趋势。首页与周报在报告里没有确定可复原的新图表。

**边界**：逐秒报告多为 OCR 标题和零散读数，不提供 47 个美股面板、59 张长期资产图以及全部逐点序列。新增曲线/矩阵明确标为 `mock`；仅报告中有读数的终点或抽样值做锚点。尚未做成完整 47/59 图目录，也未把「数据源未接通」的黄金美元/通胀分区伪装成有数据。

## 目录结构

```
macro-views/
├── extension.tsx          # 扩展入口：路由 + 侧栏导航（唯一需要注册的文件）
├── lib/
│   ├── boards.ts          # 看板注册表：路由/徽标/定位语/首页读数（首页与底部导航共用一份）
│   ├── palette.ts         # 图表语义色（ECharts 画布不吃 CSS 变量，色值集中在此）
│   ├── useChart.ts        # ECharts 实例托管：init / setOption / ResizeObserver / dispose
│   └── mock.ts            # 演示数据生成器 + 快照日 + 模拟加载 hook
├── components/
│   ├── BoardShell.tsx     # 看板外壳：页眉 + 演示提示 + 左侧目录 + 底部看板导航 + 免责声明
│   ├── Panel.tsx          # 面板卡片（标题 / 口径副标题 / 右上角标 / 脚注）
│   ├── KpiCard.tsx        # KPI 数字卡（值 / 涨跌 / 来源 / 日期）
│   ├── DataTable.tsx      # 小尺寸数据表（支持红涨绿跌着色、横向滚动、窄屏隐藏列）
│   ├── ChartBox.tsx       # 图表容器（加载 / 空 / 错误 / 正常 四态 + 固定高度）
│   └── DemoNotice.tsx     # 「演示数据（mock）」提示条
├── boards/                # 九个页面 + 可选的图表 option 构造函数（boards/charts/*）
└── mock/                  # 各看板的演示数据（每个看板一个文件）
```

## 怎么跑

```bash
cd frontend
pnpm dev          # 或 npm run dev；默认 http://localhost:3011
# 打开侧栏「宏观看板集」，或直接访问 /research/macro-views
```

类型与构建自检（仓库根目录 `frontend/`）：

```bash
./node_modules/.bin/tsc -b                       # 类型检查（测试文件的 vitest 报错是既有问题，忽略）
./node_modules/.bin/vite build                   # 生产构建
```

## 接入真实数据时怎么改

1. **接口层**：不要在本模块新建第二套请求逻辑。在 `lib/api.ts` 末尾追加取数方法、在 `lib/queryKeys.ts`
   末尾追加查询键（这两处是热点文件，按既有尾部追加、不重排）。
2. **页面层**：把 `mock/*.ts` 的静态导出替换为 `useQuery({ queryKey: QK.xxx(...), queryFn: () => api.xxx(...) })`，
   把 `useMockLoad()` 换成 react-query 的 `isLoading` / `isError`（`ChartBox` 已经接好三态入参）。
   组件与版式不用改——这是把四态和图表容器单独抽出来的原因。
3. **口径标注**：把页面顶部的 `DemoNotice` 换成真实的数据来源/更新频率说明；本仓库禁止静默用模拟值
   填充缺失数据，缺数据时要显式标注。

## 新增一个看板

1. 在 `lib/boards.ts` 的 `BOARDS` 里加一条（key / routeId / path / badge / label / subtitle / metric / tags）。
2. 在 `boards/` 下新建页面组件，用 `BoardShell` + `Panel` + `ChartBox` 等既有组件。
3. 在 `extension.tsx` 的 `componentFor()` 里加一个 case（`routes` 会自动补上）。
4. 在 `mock/` 下加数据文件。左侧目录（`sections`）的 id 必须与页面里 `Panel` 的 `id` 对上。

## 设计约定（与仓库一致）

- 颜色用语义 token：`bg-base/surface/elevated`、`border-border`、`text-foreground/secondary/muted`、`text-accent`；
  涨跌色用 `text-bull` / `text-bear`（仅用于价格语义）。
- 圆角：`rounded-card` / `rounded-btn`；数字统一 `font-mono tabular-nums`。
- 图表：ECharts，通过 `<ChartBox>` 渲染；轴与网格颜色取 `useChartTheme()`，不把 Tailwind 类写进画布。
- 注释写「为什么」，界面文案全部中文。
