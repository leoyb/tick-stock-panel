// A股盘后日报（daily-review）：把演示整理稿第 9 章的「先给结论 → 板块与题材 → 情绪资金 → 口径」
// 版式按同一套面板结构复刻出来（版式基准：GoldBoard.tsx，图表构造：charts/cnBond.ts 的做法）。
// 三态约定与黄金看板一致：加载态由 useMockLoad 260ms 自动结束；
// 空态/错误态由页首的演示开关触发（本地 state，默认关，不参与任何计算）。
// 报告日 2026-09-23（周三），数据时点 盘后 19:55，读数照抄整理稿第 9 章。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { DailyReportSupplements } from './ReportSupplements'
import { BOARDS } from '../lib/boards'
import { useMockLoad } from '../lib/mock'
import { dailyHeatmapOption, dailyThemesOption } from './charts/dailyReview'
import {
  DR_CAPITAL_KPIS,
  DR_CAPITAL_NOTE,
  DR_CALIBER_NOTES,
  DR_CONCLUSION_KPIS,
  DR_DRAGON_ROWS,
  DR_HEATMAP_NOTE,
  DR_LADDER,
  DR_LADDER_FOOTNOTE,
  DR_LEADER_ROWS,
  DR_META,
  DR_SENTIMENT,
  DR_SUMMARY,
  DR_THEME_STOCKS,
  DR_VOLUME_NOTE,
  type DrDragonRow,
  type DrLeaderRow,
  type DrThemeStock,
} from '../mock/dailyReview'
const board = BOARDS.find(item => item.key === 'daily-review')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'conclusion', label: '先给结论', hint: '6 卡读数' },
  { id: 'heatmap', label: '板块热力图', hint: '15 个板块' },
  { id: 'leaders', label: '领涨板块榜', hint: '11 行' },
  { id: 'themes', label: '热点题材归因', hint: 'TOP15 · 8 股' },
  { id: 'ladder', label: '连板梯队', hint: '12 家 · 最高 4 板' },
  { id: 'dragon', label: '龙虎榜', hint: '上榜 35 家' },
  { id: 'capital', label: '资金流向', hint: '南向 +34.48亿' },
  { id: 'notes', label: '口径说明', hint: '红涨绿跌' },
  { id: 'breadth-volume', label: '市场宽度与量能', hint: '补绘' },
  { id: 'sector-flow', label: '板块资金流向', hint: '补绘' },
  { id: 'sentiment-rates', label: '情绪温度计', hint: '补绘' },
  { id: 'southbound-trend', label: '南向资金趋势', hint: '补绘' },
]

/** 演示状态：只为人工检查页面四态，不参与任何计算 */
const DEMO_STATES = [
  { key: 'ok', label: '正常' },
  { key: 'empty', label: '空态' },
  { key: 'error', label: '错误态' },
] as const

type DemoState = (typeof DEMO_STATES)[number]['key']

export function DailyReview() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  const [demoState, setDemoState] = useState<DemoState>('ok')

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const heatmapOption = useMemo(() => dailyHeatmapOption(theme), [theme])
  const themesOption = useMemo(() => dailyThemesOption(theme), [theme])

  const leaderColumns = useMemo<Array<Column<DrLeaderRow>>>(
    () => [
      { key: 'name', label: '板块', mono: false },
      { key: 'pctText', label: '涨幅', align: 'right', delta: row => row.pct, render: row => row.pctText },
      { key: 'limitText', label: '涨停', align: 'right' },
      { key: 'upDown', label: '涨/跌', align: 'right' },
      { key: 'amountText', label: '成交额(亿)', align: 'right', render: row => row.amountText },
      { key: 'netText', label: '主力净流入(亿)', align: 'right', delta: row => row.net, render: row => row.netText },
    ],
    [],
  )

  const themeStockColumns = useMemo<Array<Column<DrThemeStock>>>(
    () => [
      { key: 'theme', label: '题材', mono: false, render: row => row.theme ?? '—' },
      { key: 'stock', label: '代表个股', mono: false },
      { key: 'industry', label: '行业', mono: false },
      { key: 'tags', label: '概念标签', mono: false, render: row => row.tags ?? '—' },
    ],
    [],
  )

  const dragonColumns = useMemo<Array<Column<DrDragonRow>>>(
    () => [
      { key: 'name', label: '股票', mono: false },
      { key: 'industry', label: '行业', mono: false },
      { key: 'reason', label: '上榜原因', mono: false },
    ],
    [],
  )

  const activeStateLabel = DEMO_STATES.find(item => item.key === demoState)?.label ?? '正常'

  return (
    <BoardShell board={board} meta={[...DR_META]} sections={SECTIONS}>
      {/* 演示状态开关（人工检查加载/空/错误三态用，不参与计算） */}
      <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border bg-surface/60 p-2">
        <span className="text-[10px] text-muted">演示状态（检查加载 / 空 / 错误三态用，不参与计算）</span>
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

      {/* 1. 先给结论：结论读数卡 + 情绪周期判断条 */}
      <Panel
        id="conclusion"
        title="先给结论"
        subtitle="【今日盘面】一句话摘要（指数 + 涨跌家数 + 成交 + 涨停跌停），后面每个面板只负责给证据。"
        corner="报告日期 2026-09-23（周三）"
        footer={`${DR_SUMMARY}。${DR_VOLUME_NOTE}`}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DR_CONCLUSION_KPIS.map(kpi => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta}
              deltaValue={kpi.deltaValue}
              hint={kpi.hint}
            />
          ))}
        </div>
        <div className="mt-3 rounded-btn border border-accent/40 bg-accent/10 px-3 py-2 text-[11px] text-foreground">
          {DR_SENTIMENT}
        </div>
      </Panel>

      {/* 2. 板块热力图：treemap 面积=成交额、色=涨跌幅（红涨绿跌） */}
      <Panel
        id="heatmap"
        title="板块热力图"
        subtitle="红涨绿跌；面积代表成交额量级，色块越红涨幅越大、越绿跌幅越大。"
        corner="上涨 25/90 个板块 · 显示前 15"
        footer="后 4 个资金流出侧板块（通信设备/软件开发/电力/房地产）整理稿只读出板块名与涨跌幅，成交额为演示补足〔演示〕。"
      >
        <ChartBox
          option={heatmapOption}
          height={360}
          loading={loading}
          empty={demoState === 'empty'}
          emptyTitle="板块热力图尚未就绪"
          emptyHint="演示空态：把页首的演示状态切回「正常」即可恢复。"
          error={
            demoState === 'error'
              ? '演示错误态：板块热力图取数通道超时（正常状态下该面板会显示 treemap 色块）。'
              : null
          }
          note={DR_HEATMAP_NOTE}
        />
      </Panel>

      {/* 3. 领涨板块榜 */}
      <Panel
        id="leaders"
        title="领涨板块榜"
        subtitle="涨幅、涨/跌家数、成交额与主力净流入；涨幅与主力净流入列按红涨绿跌着色。"
        corner="11 行 · 红涨绿跌"
        footer="「涨停」列在整理稿逐帧稿中未识别出读数，以 — 占位；涨/跌列为板块内上涨/下跌家数。"
      >
        <DataTable
          columns={leaderColumns}
          rows={demoState === 'empty' ? [] : DR_LEADER_ROWS}
          rowKey={row => row.key}
          maxHeight="360px"
          emptyHint={loading ? '数据加载中…' : '演示空态：领涨板块榜已清空，切回「正常」即可恢复。'}
        />
      </Panel>

      {/* 4. 热点题材归因 TOP15 */}
      <Panel
        id="themes"
        title="热点题材归因 TOP15"
        subtitle="涨停原因聚类：上图为各题材命中只数排行，下表为题材内代表个股与其概念标签。"
        corner="15 簇 · 8 股"
        footer="题材列按概念标签与 TOP15 聚类对照填入〔推断〕，对照不明确处留空；概念标签串照抄整理稿。"
      >
        <ChartBox
          option={themesOption}
          height={300}
          loading={loading}
          error={
            demoState === 'error'
              ? '演示错误态：题材聚类通道超时（正常状态下该面板会显示横向条形图）。'
              : null
          }
          note="“华”字辈以 7 只居首（命中 7 只涨停）；业绩增长 4 只、存储芯片 3 只次之。"
        />
        <DataTable
          className="mt-3"
          columns={themeStockColumns}
          rows={demoState === 'empty' ? [] : DR_THEME_STOCKS}
          rowKey={row => row.key}
          maxHeight="320px"
          emptyHint={loading ? '数据加载中…' : '演示空态：题材归因明细已清空。'}
        />
      </Panel>

      {/* 5. 连板梯队 */}
      <Panel
        id="ladder"
        title="连板梯队"
        subtitle="按连板高度分组的涨停梯队；每项 = 个股 + 行业 + 概念标签串。"
        corner="连板 12 家 · 最高 4 板"
        footer={DR_LADDER_FOOTNOTE}
      >
        <div className="grid gap-3 xl:grid-cols-3">
          {DR_LADDER.map(group => (
            <div key={group.boards} className="rounded-card border border-border bg-base/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-foreground">{group.boards} 连板</span>
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">
                  {group.stocks.length} 家
                </span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {group.stocks.map(stock => (
                  <li
                    key={stock.name}
                    className="rounded-btn border border-border/70 bg-surface px-2 py-1.5 text-[11px]"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-foreground">{stock.name}</span>
                      {stock.inferred ? (
                        <span className="rounded bg-elevated px-1 py-0.5 text-[9px] text-muted">推断</span>
                      ) : null}
                      <span className="text-[10px] text-muted">{stock.industry}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] leading-relaxed text-muted">
                      {stock.tags ?? '概念标签整理稿未读出'}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      {/* 6. 龙虎榜 */}
      <Panel
        id="dragon"
        title="龙虎榜"
        subtitle="榜单日期 20260923 · 上榜 35 家；上榜原因为交易所标准长句。"
        corner="榜单日期 2026-09-23"
        footer="上榜 35 家中整理稿逐帧可读的 2 行（优利德/会稽山）照抄；康强电子/中一科技/电科思仪 3 行为演示补充〔演示〕。"
      >
        <DataTable
          columns={dragonColumns}
          rows={demoState === 'empty' ? [] : DR_DRAGON_ROWS}
          rowKey={row => row.key}
          maxHeight="320px"
          emptyHint={loading ? '数据加载中…' : '演示空态：龙虎榜已清空，切回「正常」即可恢复。'}
        />
      </Panel>

      {/* 7. 资金流向（南向资金） */}
      <Panel
        id="capital"
        title="资金流向"
        subtitle="南向当日净买 +34.48亿；北向净买额自 2024 年 8 月起停止披露。"
        corner="南向 +34.48亿"
        footer={DR_CAPITAL_NOTE}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DR_CAPITAL_KPIS.map(kpi => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              unit={kpi.unit}
              deltaValue={kpi.deltaValue}
              hint={kpi.hint}
              muted={kpi.muted}
            />
          ))}
        </div>
      </Panel>

      {/* 8. 口径说明 */}
      <Panel
        id="notes"
        title="口径说明"
        subtitle="照抄整理稿页脚口径段：每个统计值的口径定义一次讲清。"
        corner="红涨绿跌"
        footer="数据源：同花顺行情接口（thsdk）| 完整盘后版（全日口径）| 生成时间 2026-09-23 19:55:20。"
      >
        <div className="space-y-1.5 rounded-card border border-border bg-base/30 p-3 text-[10px] leading-relaxed text-muted">
          {DR_CALIBER_NOTES.map(note => (
            <p key={note.slice(0, 12)}>{note}</p>
          ))}
        </div>
      </Panel>
      <DailyReportSupplements loading={loading} />
    </BoardShell>
  )
}
