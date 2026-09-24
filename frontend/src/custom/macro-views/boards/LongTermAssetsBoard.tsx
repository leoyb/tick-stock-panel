// 全球长期资产收益工作台（LongTermAssets）：跨市场锚点 + 中国模块（SBBI/指数/热力图/点位）+ 国际来源 + 矩阵表。
// 数值照抄整理稿（ch07_longterm_assets.md 第 7 章）读数，快照至 2026-09；热力图格内数值为确定性 mock。
// 与黄金看板同版式：演示状态开关收在第一个面板里，人工检查加载/空/错误三态时不用改代码。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { LongTermReportSupplements } from './ReportSupplements'
import { BOARDS } from '../lib/boards'
import { useMockLoad } from '../lib/mock'
import {
  laHeatmapOption,
  laIndexOption,
  laSbbiOption,
} from './charts/longterm'
import {
  LA_ANCHOR_KPIS,
  LA_GLOBAL_ROWS,
  type LaGlobalRow,
  LA_MODULES,
  type LaModuleRow,
  LA_RATE_ROWS,
  type LaRateRow,
  LA_ROLLING_ROWS,
  type LaRollingRow,
  LA_SBBI_2007_ROWS,
  type LaSbbi2007Row,
  LA_TABLE1_ROWS,
  type LaTable1Row,
} from '../mock/longterm'

const board = BOARDS.find(item => item.key === 'longterm-assets')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'anchors', label: '跨市场锚点', hint: '10 项读数' },
  { id: 'cn-sbbi', label: 'SBBI 中国', hint: '2005-2024' },
  { id: 'cn-indices', label: '指数长期年化', hint: '10 个指数' },
  { id: 'heatmap', label: '年度收益率热力图', hint: '10 × 11' },
  { id: 'table1', label: '年末点位抽样', hint: '4 个读数' },
  { id: 'global', label: '国际长期资产', hint: '5 个来源' },
  { id: 'rates', label: '收益率矩阵', hint: '3 个年末' },
  { id: 'rolling', label: '滚动持有期', hint: '2 组抽样' },
  { id: 'modules', label: '模块清单', hint: '15 个模块' },
  { id: 'gold-real', label: '黄金实际价格', hint: '补绘' },
  { id: 'us-curve', label: '美债曲线族', hint: '补绘' },
]

/** 演示状态：只为人工检查页面四态，不参与任何计算 */
const DEMO_STATES = [
  { key: 'ok', label: '正常' },
  { key: 'empty', label: '空态' },
  { key: 'error', label: '错误态' },
] as const

type DemoState = (typeof DEMO_STATES)[number]['key']

export function LongTermAssetsBoard() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  const [demoState, setDemoState] = useState<DemoState>('ok')

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const sbbiOption = useMemo(() => laSbbiOption(theme), [theme])
  const indexOption = useMemo(() => laIndexOption(theme), [theme])
  const heatmapOption = useMemo(() => laHeatmapOption(theme), [theme])

  const sbbi2007Columns = useMemo<Array<Column<LaSbbi2007Row>>>(
    () => [
      { key: 'name', label: '2007-2024 区间（18 年）', mono: false },
      { key: 'value', label: '年化收益', align: 'right' },
    ],
    [],
  )

  const table1Columns = useMemo<Array<Column<LaTable1Row>>>(
    () => [
      { key: 'index', label: '指数', mono: false },
      { key: 'year', label: '年末', align: 'center' },
      { key: 'close', label: '收盘点位', align: 'right' },
    ],
    [],
  )

  const globalColumns = useMemo<Array<Column<LaGlobalRow>>>(
    () => [
      { key: 'source', label: '来源', mono: false },
      { key: 'metric', label: '指标', mono: false },
      { key: 'value', label: '读数', align: 'right' },
      { key: 'note', label: '口径 / 说明', mono: false, narrowHidden: true },
    ],
    [],
  )

  const rateColumns = useMemo<Array<Column<LaRateRow>>>(
    () => [
      { key: 'year', label: '年份', align: 'center' },
      { key: 'y1', label: '1Y', align: 'right' },
      { key: 'y2', label: '2Y', align: 'right' },
      { key: 'y5', label: '5Y', align: 'right' },
      { key: 'y10', label: '10Y', align: 'right' },
      { key: 'y30', label: '30Y', align: 'right' },
      { key: 'spread', label: '10Y-1Y', align: 'right' },
    ],
    [],
  )

  const rollingColumns = useMemo<Array<Column<LaRollingRow>>>(
    () => [
      { key: 'asset', label: '资产', mono: false },
      { key: 'period', label: '持有期', align: 'center' },
      { key: 'samples', label: '样本数', align: 'right' },
      { key: 'positive', label: '正收益概率', align: 'right' },
      { key: 'median', label: '年化中位数', align: 'right', narrowHidden: true },
      { key: 'worst', label: '最差', align: 'right', narrowHidden: true },
      { key: 'best', label: '最好', align: 'right', narrowHidden: true },
    ],
    [],
  )

  const moduleColumns = useMemo<Array<Column<LaModuleRow>>>(
    () => [
      { key: 'group', label: '分组', mono: false },
      { key: 'name', label: '模块', mono: false },
      { key: 'en', label: '英文源', mono: false, narrowHidden: true },
    ],
    [],
  )

  const activeStateLabel = DEMO_STATES.find(item => item.key === demoState)?.label ?? '正常'
  const empty = demoState === 'empty'
  const error = demoState === 'error'

  return (
    <BoardShell
      board={board}
      meta={['15 个模块 · 59 张图 · 快照至 2026-09', '155 年 · 1871-2026 · 9 个官方数据源']}
      sections={SECTIONS}
    >
      {/* 1. 跨市场锚点 */}
      <Panel
        id="anchors"
        title="关键读数 · 跨市场锚点"
        subtitle="先看跨市场的长期结论，再按模块下钻到每一份原始数据。"
        corner="构建时快照"
        footer="读数与口径照抄整理稿；涨跌着色仅作扫读提示，不构成投资建议。"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-btn border border-border bg-base/30 p-2">
          <span className="text-[10px] text-muted">演示状态（人工检查加载 / 空 / 错误三态用，不参与计算）</span>
          {DEMO_STATES.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDemoState(item.key)}
              aria-pressed={demoState === item.key}
              className={cn(
                'h-6 rounded-btn border px-2 text-[10px] transition-colors',
                demoState === item.key
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-border bg-surface text-secondary hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          ))}
          <span className="text-[10px] text-muted">
            当前：{activeStateLabel}（加载态由页面挂载后 260ms 自动结束）
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {LA_ANCHOR_KPIS.map(kpi => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              deltaValue={kpi.deltaValue}
              source={kpi.source}
            />
          ))}
        </div>
      </Panel>

      {/* 2. SBBI 中国 2005-2024 年化 */}
      <Panel
        id="cn-sbbi"
        title="SBBI 中国版"
        subtitle="2005-2024 年化收益（名义，%）：有知有行 × 陈鹏 × Roger G. Ibbotson 官方数据，数值全部取自年报原文。"
        corner="2005-2024"
        footer="长期结论（整理稿原文）：股票收益最好，股票高于债券，小盘高于大盘，长期国债高于短期国债，股票与长期国债可跑赢通胀。"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartBox
            option={sbbiOption}
            height={250}
            loading={loading}
            empty={empty}
            emptyTitle="SBBI 年化数据尚未就绪"
            emptyHint="演示空态：把「跨市场锚点」面板里的演示状态切回「正常」即可恢复。"
            note="A股整体 9.63、大盘 9.18、小盘 10.04、黄金 8.60、长期国债 4.53、短期国债 2.49、通胀 2.24（%，名义年化）。"
          />
          <div className="space-y-3">
            <DataTable<LaSbbi2007Row>
              columns={sbbi2007Columns}
              rows={empty ? [] : LA_SBBI_2007_ROWS}
              rowKey={row => row.key}
              emptyHint={loading ? '数据加载中…' : '演示空态：2007-2024 区间表已清空。'}
            />
            <p className="text-[10px] leading-relaxed text-muted">
              2007-2024 区间补充：长期信用债 5.47%、相同久期国债 4.10%、短期国债 2.53%、通货膨胀 2.30%
              （数据从 2006 年底中债高信用等级新财富 7-10 年指数起始日算起）。
            </p>
          </div>
        </div>
      </Panel>

      {/* 3. 图4 各指数长期年化 */}
      <Panel
        id="cn-indices"
        title="各指数长期年化收益率横向对比"
        subtitle="图4 · 至 2026-09-10 的 10 个中证/上证指数长期年化（价格与口径见整理稿）。"
        corner="横向条形"
        footer="条长代表年化幅度；上证红利 5.88% 为年化而非点位（整理稿口径）。"
      >
        <ChartBox
          option={indexOption}
          height={280}
          loading={loading}
          empty={empty}
          emptyTitle="指数年化数据尚未就绪"
          emptyHint="演示空态：把「跨市场锚点」面板里的演示状态切回「正常」即可恢复。"
          error={error ? '演示错误态：指数年化通道超时（正常状态下该面板会显示横向条形图）。' : null}
          note="中证500 9.95、中证1000 9.85、中证2000 9.41、中证全指 8.57、中证红利 8.43、沪深300 7.32、科创50 6.96、中证100 6.95、上证50 5.96、上证红利 5.88（%）。"
        />
      </Panel>

      {/* 4. 图3 年度收益率热力图 */}
      <Panel
        id="heatmap"
        title="10 个指数年度收益率热力图"
        subtitle="图3 · 2005-2025 每 2 年取一档；红正绿负，颜色越深幅度越大。"
        corner="ECharts heatmap"
        footer="色阶 -30..30（%），visualMap 同色序；格内数值为确定性演示值，行/列口径照抄整理稿。"
      >
        <ChartBox
          option={heatmapOption}
          height={360}
          loading={loading}
          empty={empty}
          emptyTitle="热力图数据尚未就绪"
          emptyHint="演示空态：把「跨市场锚点」面板里的演示状态切回「正常」即可恢复。"
          note="红色为正收益、绿色为负收益，颜色越深幅度越大；悬停查看具体数值。"
        />
      </Panel>

      {/* 5. 表1 年末收盘点位抽样 */}
      <Panel
        id="table1"
        title="表1 · 年末收盘点位抽样"
        subtitle="表1·年末收盘点位（2005-2025，含 2026 最新）的四个代表读数。"
        corner="4 行抽样"
        footer="上证红利 5.88% 为年化而非点位（整理稿口径），故未列入本表；完整 21 行矩阵见整理稿原文。"
      >
        <DataTable<LaTable1Row>
          columns={table1Columns}
          rows={empty ? [] : LA_TABLE1_ROWS}
          rowKey={row => row.key}
          emptyHint={loading ? '数据加载中…' : '演示空态：年末点位抽样表已清空，切回「正常」即可恢复。'}
        />
      </Panel>

      {/* 6. 国际长期资产 */}
      <Panel
        id="global"
        title="国际长期资产"
        subtitle="LBMA 黄金 · Shiller 数据集 · 美债收益率曲线 · 英格兰银行千年数据 · 世界银行面板，5 个官方来源的关键读数。"
        corner="5 个来源"
        footer="每项数值均可回溯到整理稿对应模块；口径提醒：「价格指数 × 全收益」「收益率曲线 × 回报」不要跨页混用。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="LBMA 黄金（2026-09-10）" value="$4,365" delta="-0.1%" deltaValue={-0.1} source="年内 · USD/oz" />
          <KpiCard label="Shiller S&P（2026-09）" value="7,631" source="名义价格指数" />
          <KpiCard label="美债 10Y 全样本均值" value="4.25%" source="1990 至今算术平均" />
          <KpiCard label="英格兰银行千年数据" value="22,487" unit="条观测" source="65 变量 · 1086-2016" />
          <KpiCard label="世界银行 · 全球 GDP" value="2.9%" source="2025 · 实际增速" />
        </div>
        <DataTable
          className="mt-3"
          columns={globalColumns}
          rows={empty ? [] : LA_GLOBAL_ROWS}
          rowKey={row => row.key}
          maxHeight="420px"
          emptyHint={loading ? '数据加载中…' : '演示空态：国际长期资产明细已清空，切回「正常」即可恢复。'}
        />
      </Panel>

      {/* 7. 表1 年末关键期限收益率矩阵 */}
      <Panel
        id="rates"
        title="表1 · 年末关键期限收益率矩阵抽样"
        subtitle="美国国债关键期限年末收益率（%）与 10Y-短端 利差（pp）。"
        corner="3 个年末"
        footer="整理稿原始口径为 3M（利差 = 10Y − 3M）；2005 年 30Y 列在整理稿中未读出，以「—」表示。"
      >
        <DataTable
          columns={rateColumns}
          rows={empty ? [] : LA_RATE_ROWS}
          rowKey={row => row.year}
          emptyHint={loading ? '数据加载中…' : '演示空态：收益率矩阵已清空，切回「正常」即可恢复。'}
        />
      </Panel>

      {/* 8. 滚动持有期统计 */}
      <Panel
        id="rolling"
        title="滚动持有期统计"
        subtitle="正收益概率与极值（%）：同一资产在不同持有期下的胜率与回报分布抽样。"
        corner="2 组抽样"
        footer="A股整体 10 年滚动 12 个样本全为正收益；小盘股 1 年波动极大（最差 -59.19%、最好 +203.10%）。"
      >
        <DataTable
          columns={rollingColumns}
          rows={empty ? [] : LA_ROLLING_ROWS}
          rowKey={row => row.key}
          emptyHint={loading ? '数据加载中…' : '演示空态：滚动持有期表已清空，切回「正常」即可恢复。'}
        />
      </Panel>

      {/* 9. 模块清单 */}
      <Panel
        id="modules"
        title="数据模块清单"
        subtitle="中国市场数据 5 个模块 + 国际长期资产数据 10 个模块，共 15 个模块、59 张图。"
        corner="15 个模块"
        footer="全部采用可免费获取的完整真实数据重建：KPI、图表与数据表均来自原始数据文件，每项数值均可溯源（整理稿口径）。"
      >
        <DataTable
          columns={moduleColumns}
          rows={empty ? [] : LA_MODULES}
          rowKey={row => row.key}
          maxHeight="420px"
          emptyHint={loading ? '数据加载中…' : '演示空态：模块清单已清空，切回「正常」即可恢复。'}
        />
        <p className="mt-3 rounded-btn border border-warning/30 bg-warning/5 p-2 text-[10px] leading-relaxed text-muted">
          本页为演示数据，不构成投资建议。涨跌配色遵循国内习惯：红涨 / 绿跌；快照至 2026-09，口径见各面板副标题与脚注。
        </p>
      </Panel>
      <LongTermReportSupplements loading={loading} />
    </BoardShell>
  )
}
