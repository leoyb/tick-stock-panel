// 美债看板（US）：按黄金看板（GoldBoard）的版式复刻整理稿第 5 章；原有 9 个面板，补绘 2 个。
// 为什么把「演示错误态」开关放在结构面板：那一格本来就在讲全部分区与面板清单，
// 把错误态演示挂在它旁边，人工检查四态时不用改代码、也不用翻别的页面。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { UsTreasuryReportSupplements } from './ReportSupplements'
import { BOARDS } from '../lib/boards'
import { SNAPSHOT_DATE, useMockLoad } from '../lib/mock'
import { SERIES } from '../lib/palette'
import {
  usDebtGaugeOption,
  usDebtGdpOption,
  usDeficitOption,
  usFedAccountsOption,
  usFlowOption,
  usHoldersOption,
  usInterestOption,
  usMaturityOption,
  usPanelCountOption,
  usRedQueenOption,
} from './charts/usTreasury'
 import {
   RED_QUEEN_GAP_NOW,
   US_CLOCK_KPIS,
   US_DEBT_GDP_RATIO,
   US_HOLDERS_STRUCTURE,
   US_MATURITY_BARS,
   US_MATURITY_FOOTNOTE,
   US_NOTE_DEFICIT,
   US_NOTE_DEBTGDP,
   US_NOTE_FED,
   US_NOTE_FLOW,
   US_NOTE_INTEREST,
   US_NOTE_MATURITY,
   US_NOTE_REDQUEEN,
   US_PANEL_INDEX_ROWS,
   type UsPanelIndexRow,
 } from '../mock/usTreasury'

const board = BOARDS.find(item => item.key === 'us-treasury')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'clock', label: '国债时钟', hint: '3 张读数卡' },
  { id: 'debtgdp', label: '债务/GDP 长期趋势', hint: '122.6%' },
  { id: 'deficit', label: '联邦赤字趋势', hint: '警戒线 -3%' },
  { id: 'flow', label: '财政支出流向', hint: '桑基图' },
  { id: 'maturity', label: '未来到期规模', hint: '峰值 $7.2T' },
  { id: 'interest', label: '利息支出构成', hint: '2025 · 6 类' },
  { id: 'fed', label: '美联储三账户', hint: '准备金/TGA/RRP' },
  { id: 'redqueen', label: '红皇后跑步机', hint: '差距 +2.0%' },
  { id: 'holders', label: '美债持有结构', hint: '国内 · 8 类' },
  { id: 'structure', label: '面板清单与口径', hint: '26 个面板' },
  { id: 'topology', label: '美债拓扑结构', hint: '补绘' },
  { id: 'issuance', label: '发行量', hint: '补绘' },
]


export function UsTreasuryBoard() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  const [demoError, setDemoError] = useState(false)

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const gaugeOption = useMemo(() => usDebtGaugeOption(theme), [theme])
  const debtGdpOption = useMemo(() => usDebtGdpOption(theme), [theme])
  const deficitOption = useMemo(() => usDeficitOption(theme), [theme])
  const flowOption = useMemo(() => usFlowOption(theme), [theme])
  const maturityOption = useMemo(() => usMaturityOption(theme), [theme])
  const interestOption = useMemo(() => usInterestOption(theme), [theme])
  const fedOption = useMemo(() => usFedAccountsOption(theme), [theme])
  const redQueenOption = useMemo(() => usRedQueenOption(theme), [theme])
  const holdersOption = useMemo(() => usHoldersOption(theme), [theme])
  const panelCountOption = useMemo(() => usPanelCountOption(theme), [theme])

  const indexColumns = useMemo<Array<Column<UsPanelIndexRow>>>(
    () => [
      { key: 'zone', label: '分区', mono: false },
      { key: 'count', label: '面板数', align: 'right' },
      { key: 'panels', label: '面板名', mono: false, narrowHidden: true },
    ],
    [],
  )

  // 到期柱的峰值读数（$7.2T 那根）与未来 3 年合计，脚注里直接引用，避免两处各写一个数
  const maturityPeak = US_MATURITY_BARS.reduce((a, b) => (b.value > a.value ? b : a))
  const maturityFront3 = US_MATURITY_BARS.slice(0, 3).reduce((sum, bar) => sum + bar.value, 0)

  return (
    <BoardShell
      board={board}
      meta={[
        '2026-09-11 · T-8 · 可能延迟',
        '美国国债 25 面板宏观分析',
        '本页实现 11 个面板',
        `快照 ${SNAPSHOT_DATE}`,
      ]}
      sections={SECTIONS}
    >
      {/* 1. 国债时钟 */}
      <Panel
        id="clock"
        title="美国国债时钟"
        subtitle="精确到美元的国债总额、日频总规模与债务/GDP：债务时钟是本页所有面板的起点。"
        corner="U.S. Treasury"
        footer="美国国债总规模（日频，财政部 Debt to the Penny）。债务总量已远超 GDP，进入历史未有区间。"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {US_CLOCK_KPIS.map(kpi => (
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
          option={gaugeOption}
          height={240}
          loading={loading}
          note={`债务/GDP 仪表盘（量程 0→150%）：指针指向 ${US_DEBT_GDP_RATIO}%。正值本应用红系，这里换 #f59e0b 警示色，避免与「红涨绿跌」的涨跌语义混淆。`}
        />
      </Panel>

      {/* 2. 债务/GDP 长期趋势 */}
      <Panel
        id="debtgdp"
        title="债务/GDP 长期趋势"
        subtitle="两条线对比「二战后」与「今天」：同样是去杠杆/加杠杆，起点、速度与所处条件完全不同。"
        corner="1940→2026"
        footer="二战后（1946→1981）从 118% 降到 35%，用了 35 年；今天（2008→2026）从 62% 升到 122.6%。曲线为演示形状。"
      >
        <ChartBox
          option={debtGdpOption}
          height={260}
          loading={loading}
          empty={demoError}
          emptyTitle="债务/GDP 序列尚未就绪"
          emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
          note={US_NOTE_DEBTGDP}
        />
      </Panel>

      {/* 3. 联邦赤字趋势与赤字率 */}
      <Panel
        id="deficit"
        title="联邦赤字趋势与赤字率"
        subtitle="赤字/GDP：3% 是欧盟《马斯特里赫特条约》的财政纪律标准；超过 5% 历史上通常只在战争或危机期出现。"
        corner="赤字率"
        footer="曲线终点对齐赤字/GDP -5.8；图内另标注整理稿同一面板读到的「赤字/GDP：-2.4%」（口径/年份不同，照抄并标注）。"
      >
        <ChartBox
          option={deficitOption}
          height={260}
          loading={loading}
          note={US_NOTE_DEFICIT}
        />
      </Panel>

      {/* 4. 2025 年美国财政支出流向 */}
      <Panel
        id="flow"
        title="2025 年美国财政支出流向了哪里？"
        subtitle="从税收来源到政府支出去向的全景流向图：左（收入来源）→ 中（联邦总收入）→ 右（支出去向）。"
        corner="桑基图"
        footer="收入端约 $5.23 万亿、支出端约 $7.01 万亿，差额即 FY2025 约 $1.78 万亿的赤字缺口。数值为量级示意（比例大致合理）。"
      >
        <ChartBox
          option={flowOption}
          height={320}
          loading={loading}
          empty={demoError}
          emptyTitle="财政流向数据尚未就绪"
          emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
          note={US_NOTE_FLOW}
        />
      </Panel>

      {/* 5. 美债每年到期规模 */}
      <Panel
        id="maturity"
        title="美债每年到期规模"
        subtitle={`未来几年有多少债务要还？未来 3 年合计约 $${maturityFront3.toFixed(1)} 万亿，峰值 $${maturityPeak.value}T（${maturityPeak.year} 年）。`}
        corner="2026→2035"
         footer={US_MATURITY_FOOTNOTE}
      >
        <ChartBox
          option={maturityOption}
          height={260}
          loading={loading}
          empty={demoError}
          emptyTitle="到期规模数据尚未就绪"
          emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
          note={US_NOTE_MATURITY}
        />
      </Panel>

      {/* 6. 各类国债利息支出构成 */}
      <Panel
        id="interest"
        title="各类国债利息支出构成"
        subtitle="按 Marketable（Bills/Notes/Bonds/TIPS/FRN）和 Non-marketable 拆分的利息支出（2025 年）。"
        corner="2025 · 十亿美元"
        footer="Notes 占比约 40%、Bonds 约 25%；Non-Marketable 利息不计入「净利息支出」，但影响政府间基金余额。"
      >
        <ChartBox
          option={interestOption}
          height={240}
          loading={loading}
          empty={demoError}
          emptyTitle="利息构成数据尚未就绪"
          emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
          note={US_NOTE_INTEREST}
        />
      </Panel>

      {/* 7. 美联储资产负债表三账户 */}
      <Panel
        id="fed"
        title="美联储资产负债表三账户"
        subtitle="银行准备金 / TGA / ON RRP：三个账户加起来近似系统总盘子；零和池——一条线上升必有另一条线下降。"
        corner="2003→2026"
        footer="ON RRP 2022 年峰值 $2.55T → 现在约 $2bn。曲线为演示形状，终点分别对齐 3.2T / 0.8T / 0.002T。"
      >
        <ChartBox
          option={fedOption}
          height={280}
          loading={loading}
          empty={demoError}
          emptyTitle="美联储账户数据尚未就绪"
          emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
          note={US_NOTE_FED}
        />
      </Panel>

      {/* 8. 红皇后跑步机 */}
      <Panel
        id="redqueen"
        title="红皇后跑步机"
        subtitle="维持现状需要跑多快？债务/GDP 要稳住，名义 GDP 必须跑得和债务一样快。看看美国跑得够不够快。"
         corner={
           <span className="flex items-center gap-1.5">
             <span className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">当前差距 {RED_QUEEN_GAP_NOW}</span>
             {/* 整理稿结论徽标：差距为正 = 利息负担跑赢增长，落在「死亡螺旋」一侧 */}
             <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[9px] text-danger">当前在死亡螺旋一侧</span>
           </span>
         }
      >
        <ChartBox
          option={redQueenOption}
          height={280}
          loading={loading}
          empty={demoError}
          emptyTitle="红皇后序列尚未就绪"
          emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
          note={US_NOTE_REDQUEEN}
        />
      </Panel>

      {/* 9. 美债持有结构（国内） */}
      <Panel
        id="holders"
        title="美债持有结构（国内）：美国人自己持有多少国债？"
        subtitle="美联储、银行、货币基金、养老金与保险、家庭、共同基金、州与地方政府等国内部门的相对占比（比例示意）。"
        corner="国内 · 8 类"
        footer="占比合计 100%，为整理稿口径的示意比例，非逐项精确读数。"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartBox
            option={holdersOption}
            height={280}
            loading={loading}
            empty={demoError}
            emptyTitle="持有结构数据尚未就绪"
            emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
            note="环形图为国内持有者占比，八项合计 100%。"
          />
          <div className="space-y-2 self-center">
            {US_HOLDERS_STRUCTURE.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SERIES[index % SERIES.length] }} />
                <span className="w-24 shrink-0 text-secondary">{item.name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated/60">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${item.value}%`, backgroundColor: SERIES[index % SERIES.length] }}
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

      {/* 10. 面板清单与口径 */}
      <Panel
        id="structure"
        title="面板清单与口径"
        subtitle="整理稿第 5 章左栏目录的完整面板清单：分区、面板数与面板名，另加「达里奥框架」一行。"
        corner="口径表"
        footer="面板名截断处（…）为整理稿 OCR 视野截断，按原样保留。"
      >
        <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border bg-base/30 p-2">
          <span className="text-[10px] text-muted">演示状态（人工检查错误态用，不参与计算）</span>
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
            演示错误态
          </button>
          <span className="text-[10px] text-muted">
            当前：{demoError ? '错误态' : '正常'}（加载态由页面挂载后 260ms 自动结束）
          </span>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <DataTable
            columns={indexColumns}
            rows={US_PANEL_INDEX_ROWS}
            rowKey={row => row.key}
            maxHeight="360px"
            emptyHint="演示空态：面板清单已清空。"
          />
          <ChartBox
            option={panelCountOption}
            height={220}
            loading={loading}
            empty={demoError}
            emptyTitle="分区面板数尚未就绪"
            emptyHint="演示空态：关闭「演示错误态」开关即可恢复。"
            error={demoError ? '演示错误态：上游数据不可达（mock）' : null}
            note="各分区面板数（总览 2 / 收支 8 / 债务 9 / 成本与供需 7）。"
          />
        </div>
      </Panel>
      <UsTreasuryReportSupplements loading={loading} />
    </BoardShell>
  )
}
