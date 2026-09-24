// 中国债券看板（债市）：从资金面到利率曲线，看清钱的价格。
// 版式与黄金看板同一套骨架：BoardShell（页眉/目录/免责声明）+ Panel（标题/副标题/角标/脚注）
// + KpiCard / ChartBox / DataTable。全部数据来自 mock/cnBond.ts，页面不加工数值，只决定「怎么摆」。
// 为什么把「演示错误态」开关放在数据来源面板：那一格本来就在讲各数据源的取数结果，
// 人工检查错误态时不用改代码，也不用翻别的页面。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { CnBondReportSupplements } from './ReportSupplements'
import { BOARDS } from '../lib/boards'
import { useMockLoad } from '../lib/mock'
import {
  cnCoferOption,
  cnCurveFamilyOption,
  cnFundingOption,
  cnLprOption,
  cnOmoOption,
  cnTermSpreadOption,
  cnUsSpreadOption,
} from './charts/cnBond'
import {
  CN_COFER_FOOTER,
  CN_COFER_KPIS,
  CN_COFER_NOTE,
  CN_COFER_OTHERS,
  CN_CURVE_AXIS,
  CN_CURVE_FOOTER,
  CN_CURVE_META,
  CN_CURVE_NOTE,
  CN_FUNDING_FOOTER,
  CN_FUNDING_KPIS,
  CN_FUNDING_NOTE,
  CN_LPR_FOOTNOTE,
  CN_LPR_KPIS,
  CN_OMO_FOOTER,
  CN_OMO_KPIS,
  CN_OMO_NOTE,
  CN_OMO_RECENT,
  CN_PAGE_META,
  CN_READING_KPIS,
  CN_SOURCES,
  CN_SOURCES_FOOTER,
  CN_SOURCES_NOTE,
  CN_SPREAD_NOTE,
  CN_SPREAD_FOOTER,
  CN_SPREAD_KPIS,
  CN_SPREAD_TABLE,
  CN_SPREAD_TABLE_FOOTER,
  CN_TERM_SPREAD_KPIS,
  type CnOmoRow,
  type CnSourceRow,
  type CnSpreadRow,
} from '../mock/cnBond'

const board = BOARDS.find(item => item.key === 'cn-bond')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'overview', label: '关键读数' },
  { id: 'curve', label: '收益率曲线', hint: '505 点' },
  { id: 'spread', label: '期限利差与中美利差' },
  { id: 'funding', label: '资金面 DR007/R007' },
  { id: 'omo', label: '7天逆回购' },
  { id: 'lpr', label: 'LPR 1Y' },
  { id: 'cofer', label: '人民币占比 COFER' },
  { id: 'sources', label: '数据来源与口径' },
  { id: 'rrr', label: '存款准备金率', hint: '补绘' },
]

/** 取数状态的文字色：状态不是涨跌，所以不用红绿，避免与「红涨绿跌」混淆 */
const STATUS_CLASS: Record<string, string> = {
  正常: 'text-accent',
}

/** KPI 卡片统一渲染：CnKpi 的 hint 走 KpiCard 的 hint（口径与黄金看板一致） */
function KpiGrid({ kpis }: { kpis: ReadonlyArray<{ label: string; value: string; hint?: string; delta?: string; deltaValue?: number }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map(kpi => (
        <KpiCard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          delta={kpi.delta}
          deltaValue={kpi.deltaValue}
          hint={kpi.hint}
        />
      ))}
    </div>
  )
}

export function CnBondBoard() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  // 演示错误态：默认关闭；只挂到 sources 面板上方的中美利差图上，不影响其它面板
  const [demoError, setDemoError] = useState(false)

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const curveOption = useMemo(() => cnCurveFamilyOption(theme), [theme])
  const termSpreadOption = useMemo(() => cnTermSpreadOption(theme), [theme])
  const usSpreadOption = useMemo(() => cnUsSpreadOption(theme), [theme])
  const fundingOption = useMemo(() => cnFundingOption(theme), [theme])
  const omoOption = useMemo(() => cnOmoOption(theme), [theme])
  const lprOption = useMemo(() => cnLprOption(theme), [theme])
  const coferOption = useMemo(() => cnCoferOption(theme), [theme])

  /** 利差表：数值列按 delta 着色（红正绿负）；「最新」列也参与着色，负值（倒挂）一眼可见 */
  const spreadColumns = useMemo<Array<Column<CnSpreadRow>>>(
    () => [
      { key: 'name', label: '期限', mono: false },
      { key: 'latest', label: '最新', align: 'right', delta: row => row.latest },
      { key: 'm1', label: '1月', align: 'right', delta: row => row.m1 },
      { key: 'm3', label: '3月', align: 'right', delta: row => row.m3 },
      { key: 'm6', label: '6月', align: 'right', delta: row => row.m6 },
    ],
    [],
  )

  const omoColumns = useMemo<Array<Column<CnOmoRow>>>(
    () => [
      { key: 'date', label: '操作日期' },
      { key: 'term', label: '期限', align: 'center' },
      { key: 'rate', label: '中标利率', align: 'right' },
      { key: 'amount', label: '中标量', align: 'right' },
      { key: 'note', label: '备注', mono: false, narrowHidden: true, render: row => (row.note ? row.note : '—') },
    ],
    [],
  )

  const coferColumns = useMemo<Array<Column<(typeof CN_COFER_OTHERS)[number]>>>(
    () => [
      { key: 'name', label: '币种', mono: false },
      { key: 'value', label: '占比', align: 'right' },
      { key: 'change', label: '同比变动', align: 'right' },
    ],
    [],
  )

  const sourceColumns = useMemo<Array<Column<CnSourceRow>>>(
    () => [
      { key: 'name', label: '来源', mono: false },
      { key: 'channel', label: '通道', mono: false, narrowHidden: true },
      { key: 'cadence', label: '频率', align: 'center', narrowHidden: true },
      {
        key: 'status',
        label: '状态',
        align: 'right',
        render: row => (
          <span className={STATUS_CLASS[row.status] ?? 'text-muted'}>{row.status}</span>
        ),
      },
    ],
    [],
  )

  return (
    <BoardShell board={board} meta={CN_PAGE_META} sections={SECTIONS}>
      {/* 1. 关键读数：4 张定价锚卡片 */}
      <Panel
        id="overview"
        title="关键读数"
        subtitle="10Y 是国内资产定价之锚，1Y 贴着资金面，30Y 看久期偏好；10Y−1Y 是衡量曲线陡峭程度的常用代理。"
        corner="日频 · 4 张卡"
      >
        <KpiGrid kpis={CN_READING_KPIS} />
      </Panel>

      {/* 2. 全期限国债收益率与形态演变 */}
      <Panel
        id="curve"
        title="全期限国债收益率与形态演变"
        subtitle={CN_CURVE_NOTE}
        corner={`官方 505 点 · 抽样 ${CN_CURVE_META.sampledTerms} 刻度`}
        footer={CN_CURVE_FOOTER}
      >
        <ChartBox
          option={curveOption}
          height={280}
          loading={loading}
          note={`${CN_CURVE_META.source} · 横轴为期限（${CN_CURVE_AXIS.join(' / ')}），金色加粗线为最新一条（2026），灰色渐弱线为历史各年末形态（演示形状）。`}
        />
      </Panel>

      {/* 3. 期限利差与中美利差：上下两块——先期限利差，再中美利差 */}
      <Panel
        id="spread"
        title="期限利差与中美利差"
        subtitle={CN_SPREAD_NOTE}
        corner="月频 · 7 条线"
        footer={`${CN_SPREAD_FOOTER} 利差表：${CN_SPREAD_TABLE_FOOTER}`}
      >
        <div>
          <KpiGrid kpis={CN_TERM_SPREAD_KPIS} />
        </div>
        <ChartBox
          className="mt-3"
          option={termSpreadOption}
          height={240}
          loading={loading}
          note="期限利差四条线（10Y-1Y / 10Y-2Y / 30Y-10Y / 5Y-2Y），终点对齐整理稿最新读数：+51.01 / +43.76 / +45.93 / +17.05bp。"
        />
        <div className="mt-3">
          <KpiGrid kpis={CN_SPREAD_KPIS} />
        </div>
        <ChartBox
          className="mt-3"
          option={usSpreadOption}
          height={260}
          loading={loading}
          error={demoError ? '演示错误态：上游数据不可达（mock）' : null}
          note="左轴：中国 10Y（金）与美国 10Y（蓝）；右轴：中美利差（虚线，百分点），终点对齐 -3.2703。"
        />
        <DataTable
          className="mt-3"
          columns={spreadColumns}
          rows={CN_SPREAD_TABLE}
          rowKey={row => row.name}
          dense
          emptyHint="暂无利差表数据"
        />
      </Panel>

      {/* 4. 资金面：DR007 / R007 与分层 */}
      <Panel
        id="funding"
        title="资金面 DR007 / R007"
        subtitle={CN_FUNDING_NOTE}
        corner="日频 · 361 点"
        footer={CN_FUNDING_FOOTER}
      >
        <KpiGrid kpis={CN_FUNDING_KPIS} />
        <ChartBox
          className="mt-3"
          option={fundingOption}
          height={250}
          loading={loading}
          note="左轴：DR007（金）/ R007（蓝）；右轴：R007−DR007 分层（浅紫面积，百分点）。分层走阔通常出现在税期、季末与跨年时点。"
        />
      </Panel>

      {/* 5. 7 天逆回购：价（政策利率）与量（公开市场操作力度） */}
      <Panel
        id="omo"
        title="7 天逆回购：价与量"
        subtitle={CN_OMO_NOTE}
        corner="日频 · 60 个交易日"
        footer={CN_OMO_FOOTER}
      >
        <KpiGrid kpis={CN_OMO_KPIS} />
        <ChartBox
          className="mt-3"
          option={omoOption}
          height={260}
          loading={loading}
          note="柱：中标量（亿元），灰色半透明柱为当日未开展（画 0）；阶梯线：中标利率（%）。量＝力度，价＝信号。"
        />
        <DataTable
          className="mt-3"
          columns={omoColumns}
          rows={CN_OMO_RECENT}
          rowKey={row => row.date}
          dense
          emptyHint="暂无操作日明细"
        />
      </Panel>

      {/* 6. LPR 1Y：阶梯线 + 官方调整事件圆点 */}
      <Panel
        id="lpr"
        title="LPR 1Y"
        subtitle="阶梯线表示利率在两次调整之间保持不变；圆点为官方调整事件（含 mock 插入的中间调整日）。"
        corner="月频 · 1997 起"
        footer={CN_LPR_FOOTNOTE}
      >
        <KpiGrid kpis={CN_LPR_KPIS} />
        <ChartBox
          className="mt-3"
          option={lprOption}
          height={250}
          loading={loading}
          note="金色的阶梯线为 LPR 1Y（终点 3.00%）；蓝色圆点为调整事件（逐次叠加散点）。"
        />
      </Panel>

      {/* 7. 人民币占比 / IMF COFER */}
      <Panel
        id="cofer"
        title="人民币占比 / IMF COFER"
        subtitle={CN_COFER_NOTE}
        corner="季频 · 2016 起"
        footer={CN_COFER_FOOTER}
      >
        <KpiGrid kpis={CN_COFER_KPIS} />
        <ChartBox
          className="mt-3"
          option={coferOption}
          height={240}
          loading={loading}
          note="左轴：人民币占比（%，金色面积）；右轴：美元占比（%，蓝色虚线）对照。"
        />
        <DataTable
          className="mt-3"
          columns={coferColumns}
          rows={CN_COFER_OTHERS}
          rowKey={row => row.name}
          dense
          emptyHint="暂无币种占比数据"
        />
      </Panel>

      {/* 8. 数据来源与口径：四态的人工检查开关也挂在这里 */}
      <Panel
        id="sources"
        title="数据来源与口径"
        subtitle={CN_SOURCES_NOTE}
        corner={`${CN_SOURCES.length} 个来源`}
        footer={CN_SOURCES_FOOTER}
      >
        <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border bg-base/30 p-2">
          <span className="text-[10px] text-muted">演示错误态（只影响上方中美利差图，不参与计算）</span>
          <button
            type="button"
            onClick={() => setDemoError(value => !value)}
            aria-pressed={demoError}
            className={cn(
              'h-6 rounded-btn border px-2 text-[10px] transition-colors',
              demoError
                ? 'border-danger/50 bg-danger/10 text-danger'
                : 'border-border bg-surface text-secondary hover:text-foreground',
            )}
          >
            {demoError ? '错误态：开' : '错误态：关'}
          </button>
        </div>

        <DataTable
          className="mt-3"
          columns={sourceColumns}
          rows={CN_SOURCES}
          rowKey={row => row.name}
          maxHeight="320px"
          dense
          emptyHint="暂无来源数据"
        />
      </Panel>
      <CnBondReportSupplements loading={loading} />
    </BoardShell>
  )
}
