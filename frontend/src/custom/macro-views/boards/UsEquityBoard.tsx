// 美股看板（US）：把演示视频里的 9 个分区按同一套版式复刻出来。
// 为什么沿用黄金看板的骨架：BoardShell 管「页眉 + 目录 + 免责声明」，Panel/KpiCard/DataTable/ChartBox
// 各管一块，页面只决定「哪个分区放哪些面板、读数从 mock 取哪条」；读数与口径文案逐字照抄
// 演示整理稿第 3 章（ch03_us_equity.md），曲线形状由 mock 生成器确定性构造。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { UsEquityReportSupplements } from './ReportSupplements'
import { BOARDS } from '../lib/boards'
import { useMockLoad } from '../lib/mock'
import { deltaColor } from '../lib/palette'
import {
  usAnnualOption,
  usBuffettOption,
  usCenturyOption,
  usDecomposeOption,
  usDrawdownOption,
  usVixOption,
} from './charts/usEquity'
import {
  US_ANNUAL_SAMPLE_ROWS,
  US_DECOMPOSE_KPIS,
  US_META,
  US_PANEL_FOOTNOTE,
  US_PANEL_GROUPS,
  US_VALUATION_KPIS,
} from '../mock/usEquity'

const board = BOARDS.find(item => item.key === 'us-equity')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'valuation', label: '估值与波动', hint: '8 个指标' },
  { id: 'century', label: '百年走势', hint: '1914 → 2026' },
  { id: 'annual', label: '年度涨跌幅', hint: '1928 → 2025' },
  { id: 'decompose', label: '回报分解', hint: '1999-2025' },
  { id: 'drawdown', label: '纳指100自高点回撤', hint: '谷底 -82.9%' },
  { id: 'vix', label: '恐慌指数与标普500', hint: '双轴' },
  { id: 'buffett', label: '巴菲特指标', hint: '季频' },
  { id: 'panels', label: '面板规模', hint: '27 + 17 + 2' },
  { id: 'us-monthly', label: '月度涨跌矩阵', hint: '补绘' },
  { id: 'us-eps', label: '每股收益走势', hint: '补绘' },
]

export function UsEquityBoard() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  // 错误态演示：只影响「面板规模」图表，默认关闭
  const [demoError, setDemoError] = useState(false)

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const centuryOption = useMemo(() => usCenturyOption(theme), [theme])
  const annualOption = useMemo(() => usAnnualOption(theme), [theme])
  const decomposeOption = useMemo(() => usDecomposeOption(theme), [theme])
  const drawdownOption = useMemo(() => usDrawdownOption(theme), [theme])
  const vixOption = useMemo(() => usVixOption(theme), [theme])
  const buffettOption = useMemo(() => usBuffettOption(theme), [theme])

  const annualColumns = useMemo<Array<Column<(typeof US_ANNUAL_SAMPLE_ROWS)[number]>>>(
    () => [
      { key: 'year', label: '年份' },
      { key: 'drawdown', label: '年内最大回撤', align: 'right', narrowHidden: true },
      {
        key: 'annual',
        label: '全年涨跌',
        align: 'right',
        render: row => <span style={{ color: deltaColor(row.annualValue) }}>{row.annual}</span>,
      },
    ],
    [],
  )

  const panelColumns = useMemo<Array<Column<(typeof US_PANEL_GROUPS)[number]>>>(
    () => [
      { key: 'group', label: '分组', mono: false },
      { key: 'count', label: '面板数', align: 'right' },
      { key: 'samples', label: '代表面板（摘录）', mono: false, narrowHidden: true },
    ],
    [],
  )

  return (
    <BoardShell board={board} meta={US_META} sections={SECTIONS}>
      {/* 1. 估值与波动 */}
      <Panel
        id="valuation"
        title="估值与波动"
        subtitle="估值锚（席勒 PE）、恐慌温度（VIX / VIXEQ）与股票相对现金的风险补偿（隐含风险溢价），加上长周期基准与复合增速。"
        corner="8 个指标"
        footer="席勒 PE 两个区间读数一正一负（近12月 +14.2% / 距历史高点 -0.6%），故不按涨跌着色；隐含风险溢价 -691 bps 为负值 = 现金更优。"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {US_VALUATION_KPIS.map(kpi => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              delta={kpi.delta}
              source={kpi.source}
              hint={kpi.hint}
            />
          ))}
        </div>
      </Panel>

      {/* 2. 百年走势 */}
      <Panel
        id="century"
        title="标普500 百年走势"
        subtitle="1914-12-31 起点 54.63 → 最新 52,380.66（更新时间 2026-09-09），长期复合增速 6.34%。对数轴下直线 = 复利恒定，灰带为衰退期。"
        corner="对数轴 · 1914 → 2026"
        footer="起点 1914-12-31 ｜ 54.63；最新 52,380.66；复合增速 6.34%（按起点到当前月度点位计算的长期 CAGR）。"
      >
        <ChartBox
          option={centuryOption}
          height={300}
          loading={loading}
          note="价格看绝对点位，对数看复利斜率，百分比看自起点累计涨幅。淡灰色区间基于 NBER/FRED 的 US recession 指标（衰退阴影已启用）。"
        />
      </Panel>

      {/* 3. 年度涨跌幅 */}
      <Panel
        id="annual"
        title="标普500 年度涨跌幅"
        subtitle="1928 年以来年度涨跌幅 · 用年度颗粒度看长期风险收益分布"
        corner="年度 · 1928 → 2025"
        footer="抽样行照抄整理稿的「年内最大回撤 / 全年涨跌」读数；其余年份为演示形状。"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ChartBox option={annualOption} height={280} loading={loading} note="正柱红 / 负柱绿（国内习惯）。2008 = -38.5%、2022 = -19.4%、2021 = +26.9%、2023 = +54.86% 为整理稿真实读数，其余年份为演示形状。" />
          <div className="space-y-2 self-start">
            <DataTable
              columns={annualColumns}
              rows={US_ANNUAL_SAMPLE_ROWS}
              rowKey={row => row.key}
              maxHeight="240px"
              emptyHint="演示数据未就绪"
            />
            <p className="text-[10px] leading-relaxed text-muted">
              年内最大回撤与全年涨跌常常方向相反（如 1943 年回撤 -13.1% 仍收涨 +19.4%）：
              回撤是路径风险，全年涨跌是结果——两者一起看才能避免只凭年度结果低估持有体验。
            </p>
          </div>
        </div>
      </Panel>

      {/* 4. 回报分解 */}
      <Panel
        id="decompose"
        title="标普500 回报分解"
        subtitle="1999-2025年年度拆解 · 总回报 = 价格回报 ＋ 股息回报 ＋ 净回购收益率"
        corner="年度 · 27 年"
        footer="读数照抄整理稿 KPI：价格回报均值 11.88% / 股息回报均值 0.75% / 净回购均值 0.69%（用净回购近似股本收缩贡献）/ 总回报均值 12.63%（正收益 21/27 年）/ 最佳 2023 +54.86%、最差 2008 -41.73%。"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {US_DECOMPOSE_KPIS.map(kpi => (
            <KpiCard key={kpi.key} label={kpi.label} value={kpi.value} hint={kpi.hint} />
          ))}
        </div>
        <ChartBox
          className="mt-3"
          option={decomposeOption}
          height={280}
          loading={loading}
          note="堆叠柱三段 = 价格回报 + 股息回报 + 净回购收益率；折线为总回报（三段之和）。柱形为演示形状，极值年份 2023（+54.86%）与 2008（-41.73%）对齐整理稿读数。"
        />
      </Panel>

      {/* 5. 纳斯达克100 自高点回撤 */}
      <Panel
        id="drawdown"
        title="纳斯达克100 自高点回撤"
        subtitle="每个交易日距历史最高点的跌幅 · 互联网泡沫 2000-2002 累计回撤 -82.9%，用时 4,775 天（13 年）才再创新高"
        corner="样本区间 2000-2026"
      >
        <ChartBox
          option={drawdownOption}
          height={280}
          loading={loading}
          note="每个交易日距历史最高点的跌幅 · 互联网泡沫 2000-2002 累计回撤 -82.9%，用时 4,775 天（13 年）才再创新高；样本区间 2000-2026。"
        />
      </Panel>

      {/* 6. 恐慌指数与标普500 */}
      <Panel
        id="vix"
        title="恐慌指数与标普500"
        subtitle="左轴标普500（对数），右轴 VIX；红色区间为 VIX 持续高于 30 的恐慌阶段（2008、2020）。"
        corner="日频 · 双轴"
        footer="VIX 最新 16.46（数据日期 2026-09-09）；VIXEQ 最新 36.37（数据日期 2026-09-10），等权波动率显著高于市值（个股层面恐慌）。"
      >
        <ChartBox
          option={vixOption}
          height={280}
          loading={loading}
          note="标普500使用对数坐标 · 红色区间为 VIX 持续高于30的恐慌阶段"
        />
      </Panel>

      {/* 7. 巴菲特指标 */}
      <Panel
        id="buffett"
        title="巴菲特指标"
        subtitle="股市总市值/（GDP+美联储资产） 改良版巴菲特指标"
        corner="季频 · 滞后约 10 周"
        footer="更新节奏：季频 ｜ 滞后约 10 周；Z.1 报告每季度发布一次，下次刷新约 7 月初。"
      >
        <ChartBox
          option={buffettOption}
          height={260}
          loading={loading}
          note="原版指标（TMC/GDP）是巴菲特2001年提出的『评估市场估值的最佳单一指标』。改良版在分母加入美联储总资产，吸收 QE 影响。Z.1 报告每季度发布一次，下次刷新约 7 月初。曲线为演示形状（终点取季度末），不标注具体读数。"
        />
      </Panel>

      {/* 8. 面板规模 + 错误态演示 */}
      <Panel
        id="panels"
        title="面板规模：一共 47 个面板"
        subtitle="左栏目录分三组：标普500（27 个面板）、纳斯达克100与道琼斯（17 个面板）、风格ETF（2 个面板）。"
        corner="旁白口径 47"
        footer={US_PANEL_FOOTNOTE}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-btn border border-border bg-base/30 p-2">
          <span className="text-[10px] text-muted">演示状态（人工检查错误态用，不参与计算）</span>
          <button
            type="button"
            onClick={() => setDemoError(value => !value)}
            aria-pressed={demoError}
            className={cn(
              'h-6 rounded-btn border px-2 text-[10px] transition-colors',
              demoError
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border bg-surface text-secondary hover:text-foreground',
            )}
          >
            演示错误态
          </button>
          <span className="text-[10px] text-muted">当前：{demoError ? '错误态' : '正常'}（加载态由页面挂载后 260ms 自动结束）</span>
        </div>
        <ChartBox
          option={null}
          height={200}
          loading={loading}
          error={demoError ? '演示错误态：上游数据不可达（mock）' : null}
          note="旁白称 47 个面板：左栏三组合计 46（27 + 17 + 2），另有隐藏分组未计入。"
        />
        <DataTable
          className="mt-3"
          columns={panelColumns}
          rows={US_PANEL_GROUPS}
          rowKey={row => row.key}
          maxHeight="320px"
          emptyHint="演示数据未就绪"
        />
      </Panel>
      <UsEquityReportSupplements loading={loading} />
    </BoardShell>
  )
}
