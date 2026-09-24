// A股看板：原有 11 个面板，报告对照补绘 6 个图表面板（关键读数 / 长历史走势 / 年度回报 / 月度统计 / 涨跌幅分布 /
// 历史回撤 / 实现波动率 / 估值分位 / 两融杠杆 / 风险收益平面 / 数据来源）。
// 为什么把「演示错误态」开关放在数据来源面板：那一格本来就在讲各数据源的取数结果，
// 把错误态分支挂在它旁边，人工检查页面三态时不用改代码、也不用翻别的页面。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { AShareReportSupplements } from './ReportSupplements'
import { BOARDS } from '../lib/boards'
import { useMockLoad } from '../lib/mock'
import {
  aShareAnnualOption,
  aShareDistributionOption,
  aShareDrawdownOption,
  aShareMarginOption,
  aShareRiskReturnOption,
  aShareTrendOption,
  aShareVolatilityOption,
} from './charts/aShare'
import {
  A_SHARE_ANNUAL_KPIS,
  A_SHARE_ANNUAL_SAMPLE,
  A_SHARE_DISTRIBUTION,
  A_SHARE_DRAWDOWN_ROWS,
  A_SHARE_MARGIN_KPIS,
  A_SHARE_MONTHLY_KPIS,
  A_SHARE_MONTHLY_ROWS,
  A_SHARE_OVERVIEW_KPIS,
  A_SHARE_SOURCES,
  A_SHARE_SOURCE_NOTES,
  A_SHARE_VALUATION_ROWS,
  A_SHARE_VOLATILITY_KPIS,
  type AShareAnnualPoint,
  type AShareDrawdownRow,
  type AShareMonthlyRow,
  type AShareSourceRow,
  type AShareValuationRow,
} from '../mock/aShare'

const board = BOARDS.find(item => item.key === 'a-share')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'overview', label: '关键读数', hint: '6 个指标' },
  { id: 'trend', label: '长历史走势', hint: '1993 → 2026' },
  { id: 'annual', label: '年度回报', hint: '34 年' },
  { id: 'monthly', label: '月度统计', hint: '12 个月' },
  { id: 'distribution', label: '涨跌幅分布', hint: '8 桶' },
  { id: 'drawdown', label: '历史回撤', hint: '最深 -71.98%' },
  { id: 'volatility', label: '实现波动率', hint: '60日 16.9%' },
  { id: 'valuation', label: '估值分位', hint: '8 个指数' },
  { id: 'leverage', label: '两融杠杆', hint: '26,463.69 亿' },
  { id: 'risk-return', label: '风险收益平面', hint: '9 个指数' },
  { id: 'sources', label: '数据来源', hint: '5 个来源' },
  { id: 'monthly-matrix', label: '月度涨跌矩阵', hint: '补绘' },
  { id: 'rolling-5y', label: '滚动5年收益', hint: '补绘' },
  { id: 'annual-risk', label: '年内回撤 vs 全年', hint: '补绘' },
  { id: 'pe-trend', label: 'PE 走势', hint: '补绘' },
  { id: 'financing-net', label: '融资净买入', hint: '补绘' },
  { id: 'turnover', label: '全市场成交额', hint: '补绘' },
]

/** 取数状态的文字色：状态不是涨跌，所以不用红绿，避免与「红涨绿跌」混淆 */
const STATUS_CLASS: Record<AShareSourceRow['tone'], string> = {
  ok: 'text-accent',
  warn: 'text-warning',
  pending: 'text-muted',
}

/** 涨跌幅统一格式：正数带 + 号，两位小数 */
function fmtPct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function AShareBoard() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  // 演示错误态：默认关，只把错误分支挂到「长历史走势」的 ChartBox 上，供人工检查
  const [demoError, setDemoError] = useState(false)

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const trendOption = useMemo(() => aShareTrendOption(theme), [theme])
  const annualOption = useMemo(() => aShareAnnualOption(theme), [theme])
  const distributionOption = useMemo(() => aShareDistributionOption(theme), [theme])
  const drawdownOption = useMemo(() => aShareDrawdownOption(theme), [theme])
  const volatilityOption = useMemo(() => aShareVolatilityOption(theme), [theme])
  const marginOption = useMemo(() => aShareMarginOption(theme), [theme])
  const riskReturnOption = useMemo(() => aShareRiskReturnOption(theme), [theme])

  const annualColumns = useMemo<Array<Column<AShareAnnualPoint>>>(
    () => [
      { key: 'year', label: '年份', align: 'right' },
      {
        key: 'value',
        label: '年度涨跌幅',
        align: 'right',
        render: row => fmtPct(row.value),
        delta: row => row.value,
      },
    ],
    [],
  )

  const monthlyColumns = useMemo<Array<Column<AShareMonthlyRow>>>(
    () => [
      { key: 'month', label: '月份', mono: false },
      { key: 'winRate', label: '上涨概率', align: 'right', render: row => `${row.winRate}%` },
      {
        key: 'avg',
        label: '平均涨跌幅',
        align: 'right',
        render: row => fmtPct(row.avg),
        delta: row => row.avg,
      },
    ],
    [],
  )

  const drawdownColumns = useMemo<Array<Column<AShareDrawdownRow>>>(
    () => [
      { key: 'name', label: '指数', mono: false },
      {
        key: 'maxDrawdown',
        label: '最大回撤',
        align: 'right',
        render: row => fmtPct(row.maxDrawdown),
        delta: row => row.maxDrawdown,
      },
      {
        key: 'start',
        label: '区间',
        align: 'right',
        narrowHidden: true,
        render: row => `${row.start} - ${row.end}`,
      },
      { key: 'days', label: '历时', align: 'right' },
      {
        key: 'fromPeak',
        label: '距历史高点',
        align: 'right',
        render: row => fmtPct(row.fromPeak),
        delta: row => row.fromPeak,
      },
    ],
    [],
  )

  const valuationColumns = useMemo<Array<Column<AShareValuationRow>>>(
    () => [
      { key: 'name', label: '指数', mono: false },
      { key: 'pe', label: '最新 PE', align: 'right', render: row => row.pe.toFixed(2) },
      { key: 'pctAll', label: '全历史分位', align: 'right', render: row => `${row.pctAll}%` },
      {
        key: 'pct5y',
        label: '近 5 年分位',
        align: 'right',
        narrowHidden: true,
        render: row => `${row.pct5y}%`,
      },
    ],
    [],
  )

  const sourceColumns = useMemo<Array<Column<AShareSourceRow>>>(
    () => [
      { key: 'source', label: '来源', mono: false },
      {
        key: 'channel',
        label: '口径 / 通道',
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

  return (
    <BoardShell
      board={board}
      meta={['数据 2026-09-10 · 构建 2026-09-11', '1993 年至今 · 34 年']}
      sections={SECTIONS}
    >
      {/* 1. 市场信号摘要（关键读数） */}
      <Panel
        id="overview"
        title="市场信号摘要"
        subtitle="把上面各维度的关键读数摊在一屏，每条都是「一个数字＋一句话」。它不预测方向，只回答「此刻市场处于什么状态」。"
        corner="概览"
        footer="涨跌配色遵循国内习惯：红涨/绿跌。本页仅作信息整理，不构成投资建议。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {A_SHARE_OVERVIEW_KPIS.map(kpi => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              source={kpi.source}
              hint={kpi.hint}
            />
          ))}
        </div>
      </Panel>

      {/* 2. 长历史走势 */}
      <Panel
        id="trend"
        title="长历史走势"
        subtitle="所有指数在同一起点归一到 100，比较同期强弱（本页以对数轴演示上证综指 1993 年以来的长历史形状）。"
        corner="对数轴"
        footer="起点可切换 2005 起 / 2014 起 / 2019 起 / 2024 起（演示页固定为全历史）。"
      >
        <ChartBox
          option={trendOption}
          height={300}
          loading={loading}
          error={
            demoError ? '演示错误态：新浪财经指数日线通道超时（正常状态下该面板会显示长历史走势曲线）。' : null
          }
          note="数据来源：新浪财经（指数日线/周线，日线回溯上限 8000 根）、中证指数公司（中证全指）。对数坐标下相同的垂直距离代表相同的涨跌幅。曲线为演示形状。"
        />
      </Panel>

      {/* 3. 年度回报 */}
      <Panel
        id="annual"
        title="年度回报"
        subtitle="每个柱是一整年的涨跌幅（当年最后一个交易日对上一年最后一个交易日）。A股的年度分布极不均匀——连续两三年负收益并不罕见。"
        corner="34 年"
        footer="分桶区间固定为 ≤-30% / -30~-20% / -20~-10% / -10~0% / 0~10% / 10~20% / 20~30% / 30~50% / 50~80% / >80%。来源：新浪财经、中证指数公司。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {A_SHARE_ANNUAL_KPIS.map(kpi => (
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
        <ChartBox
          className="mt-3"
          option={annualOption}
          height={260}
          loading={loading}
          note="上证综指年化 +4.79%（1990 年开市以来）。柱体颜色：红涨绿跌；2006（+130.43%）与 2008（-65.39%）为整理稿强制锚点，其余年份为演示形状。"
        />
        <DataTable
          className="mt-3"
          columns={annualColumns}
          rows={A_SHARE_ANNUAL_SAMPLE}
          rowKey={row => String(row.year)}
          dense
          emptyHint="演示空态：年度回报子表已清空。"
        />
      </Panel>

      {/* 4. 月度统计 */}
      <Panel
        id="monthly"
        title="月度统计"
        subtitle="同一列上下扫一眼，就能看出「哪个月份历史上更容易赚钱」。表中 2 / 8 / 12 / 1 月为整理稿读数，其余月份为演示值。"
        corner="33 次样本"
        footer="月度涨跌 = 当月最后一个交易日收盘对上月最后一个交易日收盘。来源：新浪财经、中证指数公司。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {A_SHARE_MONTHLY_KPIS.map(kpi => (
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
        <DataTable
          className="mt-3"
          columns={monthlyColumns}
          rows={A_SHARE_MONTHLY_ROWS}
          rowKey={row => row.month}
          dense
          emptyHint="演示空态：月度统计子表已清空。"
        />
      </Panel>

      {/* 5. 涨跌幅分布 */}
      <Panel
        id="distribution"
        title="涨跌幅分布"
        subtitle="把 34 年的年度涨跌幅按 8 个固定分桶摊开：极端年份稀少、中间年份扎堆。"
        corner="8 桶"
        footer="柱高为演示分布（合计 34 年）；两端桶分别容纳 2008（≤-30%）与 2006（≥30%）。"
      >
        <ChartBox
          option={distributionOption}
          height={230}
          loading={loading}
          note="涨跌不是均匀发生的——弄清楚它的形状，比记住某一个数字有用。"
        />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-muted">
          {A_SHARE_DISTRIBUTION.map(bucket => (
            <span key={bucket.label}>
              {bucket.label}
              <span className="ml-1 text-secondary">{bucket.count} 年</span>
            </span>
          ))}
        </div>
      </Panel>

      {/* 6. 历史回撤（水下曲线） */}
      <Panel
        id="drawdown"
        title="历史回撤（水下曲线）"
        subtitle="曲线永远在 0 轴下方或等于 0——它记录的是「此刻距离历史最高点还差多少」。持有体验的好坏，一半由这张图决定。"
        corner="1993 → 2026"
        footer="「距历史高点」为最新收盘相对历史最高收盘的偏离。回撤以收盘价计算（日线）。来源：新浪财经、中证指数公司。"
      >
        <ChartBox
          option={drawdownOption}
          height={260}
          loading={loading}
          note="最深回撤 -71.98%（2007-08 段，区间 2007-10-16 - 2008-11-04，历时 385 天）；终点对齐当前距高点 -35.42%。曲线为演示形状。"
        />
        <DataTable
          className="mt-3"
          columns={drawdownColumns}
          rows={A_SHARE_DRAWDOWN_ROWS}
          rowKey={row => row.name}
          dense
          emptyHint="演示空态：最大回撤子表已清空。"
        />
      </Panel>

      {/* 7. 实现波动率 */}
      <Panel
        id="volatility"
        title="实现波动率"
        subtitle="20 日窗口反应快、60 日窗口更稳。A股的波动率有明显的「聚集」特征——高波动往往成群出现，而不是随机分布。"
        corner="20 / 60 日"
        footer="波动率按对数收益的标准差计算，20/60 日窗口，按 244 个交易日年化。来源：新浪财经、中证指数公司。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {A_SHARE_VOLATILITY_KPIS.map(kpi => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} />
          ))}
        </div>
        <ChartBox
          className="mt-3"
          option={volatilityOption}
          height={250}
          loading={loading}
          note="2005 → 2026 月度演示形状：2008 与 2015 两段高波动成群出现，当前 60 日年化 16.9%、历史分位 37%。"
        />
      </Panel>

      {/* 8. 估值分位 */}
      <Panel
        id="valuation"
        title="估值分位"
        subtitle="PE = 指数总市值/成分股总盈利。它是「用现在的价格买当下的盈利，贵不贵」的最直接回答；看绝对值不如看它在自己历史上的位置。"
        corner="8 个指数"
        footer="分位=历史上有多少比例的交易日 PE 低于当前值，越低表示相对越便宜。分位为相对度量，不代表绝对低估。来源：中证指数公司，PE 序列自 2011-06-28 起。"
      >
        <DataTable
          columns={valuationColumns}
          rows={A_SHARE_VALUATION_ROWS}
          rowKey={row => row.name}
          dense
          emptyHint={loading ? '数据加载中…' : '演示空态：估值分位子表已清空。'}
        />
      </Panel>

      {/* 9. 两融杠杆 */}
      <Panel
        id="leverage"
        title="两融杠杆"
        subtitle="成交额反映参与度，两融余额反映杠杆意愿。量能是行情的燃料，杠杆是它的放大器。"
        corner="2014 → 2026"
        footer="两融余额与融资余额（亿元，左轴）。比值=融资余额/流通市值，来自东方财富两融口径。相比绝对余额，该比值不受市值膨胀影响，更能反映真实的杠杆意愿。来源：东方财富（沪深交易所汇总）。"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {A_SHARE_MARGIN_KPIS.map(kpi => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              delta={kpi.delta}
              source={kpi.source}
              hint={kpi.hint}
            />
          ))}
        </div>
        <ChartBox
          className="mt-3"
          option={marginOption}
          height={250}
          loading={loading}
          note="2014 → 2026 月度演示形状：终点对齐两融余额 26,463.69 亿元（占流通市值 2.626019%，2010 年以来 96.7% 分位）。"
        />
      </Panel>

      {/* 10. 长期风险收益平面 */}
      <Panel
        id="risk-return"
        title="长期风险收益平面"
        subtitle="横轴是承担的风险（年化波动率），纵轴是拿到的回报（年化收益）。气泡越大代表成立时间越长。"
        corner="9 个指数"
        footer="夏普比率使用 1.5% 的无风险利率近似（参考 1 年期国债）。全历史口径，样本长度因成立时间不同而差异很大，横向比较需谨慎。来源：新浪财经、中证指数公司。"
      >
        <ChartBox
          option={riskReturnOption}
          height={280}
          loading={loading}
          note="「高收益低波动」在长期几乎不存在。读数照抄整理稿：中证500 +9.94/28.56、中证全指 +8.56/25.58、创业板指 +7.86/30.53、科创50 +6.65/33.24、沪深300 +5.15/24.28、深证成指 +5.64/29.59、上证50 +4.76/24.50、上证综指 +4.79/27.84、中证1000 +1.91/27.39（年化收益/年化波动，%）。"
        />
      </Panel>

      {/* 11. 数据来源与取数状态 */}
      <Panel
        id="sources"
        title="数据来源与取数状态"
        subtitle="本看板每个数字的来源、通道与取数状态。原始源优先，被拦截的少数序列明确标注。"
        corner="5 个来源"
      >
        <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border bg-base/30 p-2">
          <span className="text-[10px] text-muted">
            演示错误态（人工检查加载 / 错误两态用，不参与计算；加载态由页面挂载后 260ms 自动结束）
          </span>
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
            {demoError ? '关闭错误态' : '演示错误态'}
          </button>
        </div>

        <DataTable
          className="mt-3"
          columns={sourceColumns}
          rows={A_SHARE_SOURCES}
          rowKey={row => row.key}
          maxHeight="320px"
          dense
          emptyHint="演示空态：来源清单已清空。"
        />

        <div className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-muted">
          {A_SHARE_SOURCE_NOTES.map(note => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </Panel>
      <AShareReportSupplements loading={loading} />
    </BoardShell>
  )
}
