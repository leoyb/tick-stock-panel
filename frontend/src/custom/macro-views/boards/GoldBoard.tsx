// 黄金看板（Au）：把演示视频里的 8 个分区按同一套版式复刻出来。
// 为什么把「演示状态」开关放在数据来源面板：那一格本来就在讲各数据源的取数结果，
// 把 正常/空态/错误态 三个分支挂在它旁边，人工检查四态时不用改代码、也不用翻别的页面。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { GoldReportSupplements } from './ReportSupplements'
import { BOARDS } from '../lib/boards'
import { SNAPSHOT_DATE, useMockLoad } from '../lib/mock'
import { seriesColor } from '../lib/palette'
import {
  goldFiscalOption,
  goldOpportunityOption,
  goldPercentileOption,
  goldPriceOption,
  goldRiskMirrorOption,
  goldStockStructureOption,
} from './charts/gold'
import {
  GOLD_FISCAL_KPIS,
  GOLD_FOOTNOTE,
  GOLD_FRAMEWORK,
  GOLD_OPPORTUNITY_ASSETS,
  GOLD_OPPORTUNITY_SUBTITLE,
  GOLD_PERCENTILES,
  GOLD_PRICE_METRICS,
  GOLD_PRICE_SUBTITLE,
  GOLD_RISK_KPIS,
  GOLD_RISK_ROWS,
  GOLD_RISK_SUBTITLE,
  GOLD_SOURCE_NOTES,
  GOLD_SOURCES,
  GOLD_STOCK_MARKET_CAP,
  GOLD_STOCK_STRUCTURE,
  GOLD_STOCK_TOTAL,
  type GoldRiskRow,
  type GoldSourceRow,
} from '../mock/gold'

const board = BOARDS.find(item => item.key === 'gold')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'price', label: '金价走势', hint: '7 个指标' },
  { id: 'percentile', label: '历史分位', hint: '9 个分位' },
  { id: 'stock', label: '地上存量', hint: '225,724 吨' },
  { id: 'opportunity', label: '机会成本', hint: '6 只 ETF' },
  { id: 'fiscal', label: '财政与信用', hint: '3 个指标' },
  { id: 'risk', label: '风险温度', hint: '8 个指标' },
  { id: 'framework', label: '分析框架', hint: '21 个节点' },
  { id: 'sources', label: '数据来源', hint: '8 个来源' },
  { id: 'rmb-log', label: '人民币金价走势', hint: '补绘' },
  { id: 'liquidity', label: '美元与流动性', hint: '未接通' },
  { id: 'inflation', label: '通胀与增长', hint: '未接通' },
]

/** 演示状态：只为人工检查页面四态，不参与任何计算 */
const DEMO_STATES = [
  { key: 'ok', label: '正常' },
  { key: 'empty', label: '空态' },
  { key: 'error', label: '错误态' },
] as const

type DemoState = (typeof DEMO_STATES)[number]['key']

/** 取数状态的文字色：状态不是涨跌，所以不用红绿，避免与「红涨绿跌」混淆 */
const STATUS_CLASS: Record<GoldSourceRow['tone'], string> = {
  ok: 'text-accent',
  warn: 'text-warning',
  pending: 'text-muted',
}

export function GoldBoard() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  const [demoState, setDemoState] = useState<DemoState>('ok')

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const priceOption = useMemo(() => goldPriceOption(theme), [theme])
  const percentileOption = useMemo(() => goldPercentileOption(theme), [theme])
  const stockOption = useMemo(() => goldStockStructureOption(theme), [theme])
  const opportunityOption = useMemo(() => goldOpportunityOption(theme), [theme])
  const fiscalOption = useMemo(() => goldFiscalOption(theme), [theme])
  const riskOption = useMemo(() => goldRiskMirrorOption(theme), [theme])

  const riskColumns = useMemo<Array<Column<GoldRiskRow>>>(
    () => [
      { key: 'metric', label: '指标', mono: false },
      { key: 'value', label: '最新', align: 'right' },
      { key: 'window', label: '区间 / 分位', align: 'right', narrowHidden: true },
      { key: 'note', label: '说明', mono: false, narrowHidden: true },
    ],
    [],
  )

  const sourceColumns = useMemo<Array<Column<GoldSourceRow>>>(
    () => [
      { key: 'source', label: '来源', mono: false },
      {
        key: 'channel',
        label: '原始出处（通道）',
        mono: false,
        narrowHidden: true,
        render: row => row.channel,
      },
      {
        key: 'status',
        label: '取数状态',
        align: 'right',
        render: row => <span className={STATUS_CLASS[row.tone]}>{row.status}</span>,
      },
    ],
    [],
  )

  const activeStateLabel = DEMO_STATES.find(item => item.key === demoState)?.label ?? '正常'

  return (
    <BoardShell
      board={board}
      meta={['数据 23 个指标 · 构建 2026-09-11', '价格源：东财', `快照 ${SNAPSHOT_DATE}`]}
      sections={SECTIONS}
    >
      {/* 1. 金价走势 */}
      <Panel
        id="price"
        title="金价走势"
        subtitle={GOLD_PRICE_SUBTITLE}
        corner="日频 · 7 个指标"
        footer={`${GOLD_FOOTNOTE}。面板内 7 个指标依次为：国际金价、人民币金价、上海金 vs 伦敦金价差、白银、原油、金矿股与年化收益；后四项在演示数据里没有读到读数，因此只保留 3 张读数卡。`}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GOLD_PRICE_METRICS.map(metric => (
            <KpiCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              unit={metric.unit}
              delta={metric.delta}
              deltaValue={metric.deltaValue}
              source={metric.source}
              hint={
                <>
                  <span className="font-mono tabular-nums">{metric.deltaLabels}</span>
                  <br />
                  {metric.note}
                </>
              }
            />
          ))}
        </div>
        <ChartBox
          className="mt-3"
          option={priceOption}
          height={290}
          loading={loading}
          note="1998 → 2026 月度长线：左轴国际金价（美元/盎司，终点对齐 $4,318.82），右轴上海金 vs 伦敦金价差（pp，终点对齐 -4.69%）。曲线为演示形状。"
        />
      </Panel>

      {/* 2. 历史分位 */}
      <Panel
        id="percentile"
        title="历史分位"
        subtitle="同一读数在 1 年 / 3 年 / 10 年窗口里的位置：0% 表示窗口最低，100% 表示窗口最高。"
        corner="分位"
        footer="分位越高说明该读数在对应窗口里越靠上沿；人民币金价的 10 年分位沿用视频里读到的同一读数 59%。"
      >
        <ChartBox
          option={percentileOption}
          height={210}
          loading={loading}
          note="横向条越长说明读数在窗口里越靠上沿：国际金价 10 年分位 94%，上海金价差 10 年分位 34%。"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {GOLD_PERCENTILES.map(item => (
            <div key={item.key} className="rounded-card border border-border bg-base/30 p-3">
              <div className="text-[11px] text-foreground">{item.label}</div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-muted">
                {item.values.map(value => (
                  <span key={value.window}>
                    {value.window}
                    <span className="ml-1 text-secondary">{value.value}%</span>
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">{item.note}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* 3. 全球地上黄金存量 */}
      <Panel
        id="stock"
        title="全球地上黄金存量"
        subtitle="人类历史上开采出来并仍在地上的黄金总量，以及它在金饰、投资、央行储备与其他用途之间的分布。"
        corner="存量"
        footer="存量吨数与市值均为演示读数（快照 2026-09-11）。"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard
            label="全球地上黄金存量"
            value={GOLD_STOCK_TOTAL}
            source="世界黄金协会 WGC（官网端点 403，走回填通道）"
            hint="含金饰、投资、央行储备与其他四类用途。"
          />
          <KpiCard
            label="地上存量市值（估算）"
            value={GOLD_STOCK_MARKET_CAP}
            source="按最新金价折算的量级估算"
            hint="存量吨数 × 最新金价；仅用于量级参照。"
          />
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <ChartBox
            option={stockOption}
            height={250}
            loading={loading}
            empty={demoState === 'empty'}
            emptyTitle="存量结构尚未就绪"
            emptyHint="演示空态：把「数据来源」面板里的演示状态切回「正常」即可恢复。"
            note="环形图为地上存量的用途占比，四项合计 100%。"
          />
          <div className="space-y-2 self-center">
            {GOLD_STOCK_STRUCTURE.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seriesColor(index) }} />
                <span className="w-10 shrink-0 text-secondary">{item.name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated/60">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: seriesColor(index) }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-foreground">{item.value}%</span>
              </div>
            ))}
            <p className="pt-1 text-[10px] leading-relaxed text-muted">
              占比条与环形图共用同一色序，方便对照；结构比例合计 100%。
            </p>
          </div>
        </div>
      </Panel>

      {/* 4. 机会成本 */}
      <Panel
        id="opportunity"
        title="机会成本"
        subtitle={GOLD_OPPORTUNITY_SUBTITLE}
        corner="6 只 ETF"
        footer="卡片涨跌取视频里读到的那一档（5 日 / 20 日 / 3 月 / 同比）；对比曲线按各 ETF 的同比读数归一化到起点 100。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GOLD_OPPORTUNITY_ASSETS.map(asset => (
            <KpiCard
              key={asset.key}
              label={asset.label}
              value={asset.value}
              delta={asset.delta}
              deltaValue={asset.deltaValue}
              source={asset.source}
              hint={asset.note}
            />
          ))}
        </div>
        <ChartBox
          className="mt-3"
          option={opportunityOption}
          height={260}
          loading={loading}
          note="6 只 ETF 的一年期相对表现（起点 = 100）：短期国债几乎横盘，长久期国债与股票波动更大。曲线为演示形状。"
        />
      </Panel>

      {/* 5. 财政与信用 */}
      <Panel
        id="fiscal"
        title="财政与信用"
        subtitle="赤字、债务、付息压力与央行购金、美元储备份额——黄金最长期、最核心的定价锚在这里。"
        corner="3 个指标"
        footer="国债总规模为财政部 Debt to the Penny 日频口径；美元储备占比来自 IMF COFER。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GOLD_FISCAL_KPIS.map(kpi => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              delta={kpi.delta}
              deltaValue={kpi.deltaValue}
              source={kpi.source}
              hint={kpi.note}
            />
          ))}
        </div>
        <ChartBox
          className="mt-3"
          option={fiscalOption}
          height={240}
          loading={loading}
          note="左轴美国国债总规模（万亿美元，1999 → 2026），右轴美元在全球已分配外汇储备中的占比（%）。曲线为演示形状，终点分别对齐 $40.074T 与 57.13%。"
        />
      </Panel>

      {/* 6. 风险温度 */}
      <Panel
        id="risk"
        title="风险温度"
        subtitle={GOLD_RISK_SUBTITLE}
        corner="8 个指标"
        footer="COT 为周频数据（每周更新）；表中未读出读数的 4 个指标只保留字段名，不填演示数值。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {GOLD_RISK_KPIS.map(kpi => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              delta={kpi.delta}
              deltaValue={kpi.deltaValue}
              source={kpi.source}
              hint={kpi.note}
            />
          ))}
        </div>
        <ChartBox
          className="mt-3"
          option={riskOption}
          height={240}
          loading={loading}
          empty={demoState === 'empty'}
          emptyTitle="COT 持仓数据尚未就绪"
          emptyHint="演示空态：把「数据来源」面板里的演示状态切回「正常」即可恢复。"
          error={
            demoState === 'error'
              ? '演示错误态：CFTC COT 通道超时（正常状态下该面板会显示镜像关系图）。'
              : null
          }
          note="周频 COT 持仓：管理基金净多头与它的对手方 Swap Dealers 净头寸分居零轴上下，构成镜像关系。曲线为演示形状，终点分别对齐 140,811 手与 -232,136 手。"
        />
        <DataTable
          className="mt-3"
          columns={riskColumns}
          rows={GOLD_RISK_ROWS}
          rowKey={row => row.key}
          maxHeight="320px"
          emptyHint="演示空态：风险温度子表已清空。"
        />
      </Panel>

      {/* 7. 分析框架 */}
      <Panel
        id="framework"
        title="分析框架"
        subtitle="四层拓扑：宏观驱动 → 中观传导 → 市场结构 → 综合输出。点任一节点看它如何影响金价（演示页只做静态展示）。"
        corner="21 个节点"
        footer="节点数：宏观驱动 5 + 中观传导 6 + 市场结构 6 + 综合输出 4 = 21。"
      >
        <div className="grid gap-3 xl:grid-cols-4">
          {GOLD_FRAMEWORK.map((layer, index) => (
            <div key={layer.key} className="relative rounded-card border border-border bg-base/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-foreground">{layer.layer}</span>
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">
                  {layer.nodes.length} 个节点
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-muted">{layer.sub}</div>
              <ul className="mt-2 space-y-1">
                {layer.nodes.map(node => (
                  <li
                    key={node}
                    className="rounded-btn border border-border/70 bg-surface px-2 py-1 text-[11px] text-secondary"
                  >
                    {node}
                  </li>
                ))}
              </ul>
              {index < GOLD_FRAMEWORK.length - 1 ? (
                <span
                  className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-muted xl:block"
                  aria-hidden="true"
                >
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      {/* 8. 数据来源与取数状态 */}
      <Panel
        id="sources"
        title="数据来源与取数状态"
        subtitle="本看板每个数字的来源、通道与取数状态。原始源优先，被拦截的少数序列明确标注。"
        corner="8 个来源"
      >
        <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border bg-base/30 p-2">
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

        <DataTable
          className="mt-3"
          columns={sourceColumns}
          rows={demoState === 'empty' ? [] : GOLD_SOURCES}
          rowKey={row => row.key}
          maxHeight="360px"
          emptyHint={loading ? '数据加载中…' : '演示空态：来源清单已清空，切回「正常」即可恢复。'}
        />

        <div className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-muted">
          {GOLD_SOURCE_NOTES.map(note => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </Panel>
      <GoldReportSupplements loading={loading} />
    </BoardShell>
  )
}
