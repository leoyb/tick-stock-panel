// 全球市场周报（Weekly）：九大类资产逐日明细 + 综述要点 + 市场量能 + 事件线 + 风险提示。
// 数值照抄整理稿（ch0809_briefing.md 第 8 章）读数，报告期 2026-09-23；曲线形状为 mock。
// 与黄金看板同版式：演示状态开关收在第一个面板里，人工检查加载/空/错误三态时不用改代码。
import { useMemo, useState } from 'react'
import { useChartTheme } from '@/lib/theme'
import { cn } from '@/lib/cn'
import { BoardShell, type BoardSection } from '../components/BoardShell'
import { ChartBox } from '../components/ChartBox'
import { DataTable, type Column } from '../components/DataTable'
import { Panel } from '../components/Panel'
import { BOARDS } from '../lib/boards'
import { useMockLoad } from '../lib/mock'
import { deltaColor } from '../lib/palette'
import { weekVolumeOption } from './charts/weekly'
import {
  WEEK_EVENTS,
  WEEK_GRID_NOTE,
  WEEK_GRID_ROWS,
  type WeeklyGridRow,
  WEEK_RISKS,
  WEEK_SUMMARY_POINTS,
  WEEK_VOLUME_BARS,
} from '../mock/weekly'

const board = BOARDS.find(item => item.key === 'weekly')!

/** 左侧目录；每个 id 都必须能在下面找到同名的 Panel，否则锚点会跳空 */
const SECTIONS: BoardSection[] = [
  { id: 'grid', label: '九宫格行情', hint: '11 项明细' },
  { id: 'summary', label: '本周综述', hint: '10 条要点' },
  { id: 'volume', label: '市场量能', hint: '5 个交易日' },
  { id: 'events', label: '重大事件线', hint: '9/7 – 9/9' },
  { id: 'risk', label: '风险提示', hint: '5 条' },
]

/** 演示状态：只为人工检查页面四态，不参与任何计算 */
const DEMO_STATES = [
  { key: 'ok', label: '正常' },
  { key: 'empty', label: '空态' },
  { key: 'error', label: '错误态' },
] as const

type DemoState = (typeof DEMO_STATES)[number]['key']

export function WeeklyReport() {
  const loading = useMockLoad()
  const theme = useChartTheme()
  const [demoState, setDemoState] = useState<DemoState>('ok')

  // option 依赖 theme：切换明/暗主题时重建颜色，避免画布上留下上一套主题的轴色
  const volumeOption = useMemo(() => weekVolumeOption(theme), [theme])

  const gridColumns = useMemo<Array<Column<WeeklyGridRow>>>(
    () => [
      {
        key: 'asset',
        label: '资产',
        mono: false,
        render: row => (
          <span>
            {row.asset}
            {row.demo ? <span className="ml-1 text-[9px] text-muted">〔演示〕</span> : null}
          </span>
        ),
      },
      { key: 'open', label: '开盘', align: 'right' },
      { key: 'close', label: '收盘', align: 'right' },
      {
        key: 'pct',
        label: '涨跌幅',
        align: 'right',
        delta: row => row.pctValue,
      },
    ],
    [],
  )

  const activeStateLabel = DEMO_STATES.find(item => item.key === demoState)?.label ?? '正常'

  return (
    <BoardShell
      board={board}
      meta={['每周更新 · 报告期 2026-09-23', 'GLOBAL MARKETS · WEEKLY TERMINAL', '九大类资产逐日明细']}
      sections={SECTIONS}
    >
      {/* 1. 九宫格行情：资产 | 开盘 | 收盘 | 涨跌幅 */}
      <Panel
        id="grid"
        title="资产自选 · 九大类"
        subtitle="逐日明细（资产 | 开盘 | 收盘 | 涨跌幅）；整理稿读出三行真实数据，其余按演示补齐并标注。"
        corner="11 项"
        footer={`${WEEK_GRID_NOTE}。前 3 行为整理稿逐日明细读数；〔演示〕标记行数值为演示补齐。`}
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
        <DataTable
          columns={gridColumns}
          rows={demoState === 'empty' ? [] : WEEK_GRID_ROWS}
          rowKey={row => row.key}
          maxHeight="420px"
          emptyHint={loading ? '数据加载中…' : '演示空态：九宫格明细已清空，切回「正常」即可恢复。'}
        />
      </Panel>

      {/* 2. 本周综述要点：色点 + 文字 */}
      <Panel
        id="summary"
        title="本周综述要点"
        subtitle="一句话脉络：美伊互袭推油价 → 双双破百 → PPI/CPI 超预期 → 加息重定价 → 30Y 美债新高 → 日韩狂欢、港股五连跌、A股放量失守。"
        corner="10 条要点"
        footer="色点红=偏涨/上行、绿=偏跌/下行，仅作扫读提示，不构成投资建议。"
      >
        <div className="grid gap-2 xl:grid-cols-2">
          {WEEK_SUMMARY_POINTS.map(point => (
            <div key={point.key} className="flex items-start gap-2 rounded-card border border-border bg-base/30 p-2.5">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: deltaColor(point.dotValue) }}
              />
              <p className="text-[11px] leading-relaxed text-secondary">{point.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* 3. 市场量能：沪深两市成交柱状 */}
      <Panel
        id="volume"
        title="市场量能"
        subtitle="沪深两市逐日成交额（万亿）；9/10 创下半年新低 1.65 万亿，9/11 放量回升。"
        corner="日频 · 5 个交易日"
        footer="柱顶数值为当日成交（万亿）；柱色按环比红涨绿跌。"
      >
        <ChartBox
          option={volumeOption}
          height={220}
          loading={loading}
          empty={demoState === 'empty'}
          emptyTitle="量能数据尚未就绪"
          emptyHint="演示空态：把「九宫格」面板里的演示状态切回「正常」即可恢复。"
          error={demoState === 'error' ? '演示错误态：量能通道超时（正常状态下该面板会显示成交柱状图）。' : null}
          note="市场量能 · 沪深两市成交（万亿）：9/7=1.95、9/8=1.96、9/9=1.86、9/10=1.65、9/11=1.97。"
        />
      </Panel>

      {/* 4. 重大事件线：按日期分组的时间线 */}
      <Panel
        id="events"
        title="重大事件线"
        subtitle="按日期分组的事件流：事件方/主题 + 一句正文。"
        corner="9/7 – 9/9"
        footer="文案照抄整理稿逐日主线；地缘与政策表述为整理稿原意，本页仅作信息整理。"
      >
        <div className="space-y-3">
          {WEEK_EVENTS.map(group => (
            <div key={group.date} className="flex gap-3">
              <span className="mt-0.5 w-9 shrink-0 rounded bg-elevated px-1.5 py-0.5 text-center font-mono text-[10px] text-accent">
                {group.date}
              </span>
              <div className="min-w-0 flex-1 space-y-2 border-l border-border pl-3">
                {group.items.map(item => (
                  <div key={item.actor} className="rounded-card border border-border/70 bg-base/30 p-2.5">
                    <div className="text-[11px] font-medium text-foreground">{item.actor}</div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-secondary">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 5. 风险提示 */}
      <Panel
        id="risk"
        title="风险提示"
        subtitle="整理稿风险要点列表；本页为演示数据，不构成投资建议。"
        corner="5 条"
      >
        <div className="space-y-2">
          {WEEK_RISKS.map(risk => (
            <div key={risk.title} className="rounded-card border border-border bg-base/30 p-2.5">
              <div className="text-[11px] font-medium text-foreground">{risk.title}</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-secondary">{risk.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-btn border border-warning/30 bg-warning/5 p-2 text-[10px] leading-relaxed text-muted">
          本页为演示数据，不构成投资建议。报告期 {WEEK_VOLUME_BARS[0].date} – {WEEK_VOLUME_BARS[WEEK_VOLUME_BARS.length - 1].date}，快照口径见页眉。
        </p>
      </Panel>
    </BoardShell>
  )
}
