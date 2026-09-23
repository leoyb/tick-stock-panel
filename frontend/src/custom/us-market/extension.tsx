import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { Activity, Database, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import type { FrontendExtension } from '@/extensions/types'
import { api, type UsMarketPanel } from '@/lib/api'
import { QK } from '@/lib/queryKeys'
import { useChartTheme } from '@/lib/theme'
import { PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/Toast'

type RangeKey = '1y' | '3y' | '5y' | 'all' | 'custom'
type GroupKey = 'all' | 'macro' | 'leading' | 'gsblbr'

const RANGE_LABELS: Record<RangeKey, string> = {
  '1y': '1年', '3y': '3年', '5y': '5年', all: '全部', custom: '自定义',
}

const GROUP_LABELS: Record<GroupKey, string> = {
  all: '全部', macro: '宏观看板', leading: '领先指标', gsblbr: 'GSBLBR',
}

const SERIES_COLORS = ['#f97316', '#38bdf8', '#a78bfa', '#f59e0b', '#34d399', '#f43f5e']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthOffset(value: string, months: number) {
  const date = new Date(`${value}T00:00:00`)
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

function useMarketChart(option: EChartsOption | null) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)

  useEffect(() => {
    const resize = () => chartRef.current?.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ref.current) return
    if (!chartRef.current) chartRef.current = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    if (option) {
      chartRef.current.setOption(option, { notMerge: true })
      chartRef.current.resize()
    }
  }, [option])

  return ref
}

function PanelChart({ panel }: { panel: UsMarketPanel }) {
  const theme = useChartTheme()
  const option = useMemo<EChartsOption>(() => {
    const hasRightAxis = panel.series.some(item => item.axis === 'right')
    const leftUnit = panel.series.find(item => item.axis === 'left')?.unit ?? ''
    const rightUnit = panel.series.find(item => item.axis === 'right')?.unit ?? ''
    return {
      animation: false,
      grid: { left: 46, right: hasRightAxis ? 46 : 18, top: 22, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 11 },
        formatter: (params: unknown) => {
          const entries = Array.isArray(params)
            ? params as Array<{ seriesName?: string; color?: string; value?: [string | number, number] }>
            : []
          const rawDate = entries[0]?.value?.[0]
          const date = typeof rawDate === 'number' ? new Date(rawDate).toISOString().slice(0, 10) : String(rawDate ?? '')
          return [
            `<strong>${date}</strong>`,
            ...entries
              .filter(entry => entry.value?.[1] != null && Number.isFinite(Number(entry.value[1])))
              .map(entry => `<span style="color:${entry.color ?? '#94a3b8'}">●</span> ${entry.seriesName ?? ''}: <b>${Number(entry.value?.[1]).toFixed(2)}</b>`),
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: { color: theme.text, fontSize: 10, hideOverlap: true },
        axisLine: { lineStyle: { color: theme.border } },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: leftUnit,
          nameTextStyle: { color: theme.text, fontSize: 9 },
          axisLabel: { color: theme.text, fontSize: 9 },
          splitLine: { lineStyle: { color: theme.grid } },
        },
        ...(hasRightAxis ? [{
          type: 'value' as const,
          name: rightUnit,
          nameTextStyle: { color: theme.text, fontSize: 9 },
          axisLabel: { color: theme.text, fontSize: 9 },
          splitLine: { show: false },
        }] : []),
      ],
      dataZoom: [{ type: 'inside' }],
      series: panel.series.map((item, index) => ({
        name: item.label,
        type: 'line' as const,
        data: item.points.map(point => [point.date, point.value]),
        yAxisIndex: item.axis === 'right' && hasRightAxis ? 1 : 0,
        showSymbol: false,
        connectNulls: false,
        lineStyle: { width: index === 0 ? 1.8 : 1.2, color: SERIES_COLORS[index % SERIES_COLORS.length] },
        itemStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
      })),
    }
  }, [panel, theme])
  const ref = useMarketChart(option)

  return <div ref={ref} className="h-56 w-full min-w-0" />
}

function PanelCard({ panel }: { panel: UsMarketPanel }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-semibold text-foreground">{panel.title}</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">{panel.description}</p>
        </div>
        <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">{panel.frequency}</span>
      </div>
      <PanelChart panel={panel} />
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        {panel.series.map((item, index) => (
          <span key={item.key}>
            <i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }} />
            {item.label}{item.unit ? ` (${item.unit})` : ''}
          </span>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-muted">{panel.start ?? '—'} 至 {panel.end ?? '—'}</div>
    </section>
  )
}

function UsMarketPage() {
  const queryClient = useQueryClient()
  const endToday = useMemo(today, [])
  const [range, setRange] = useState<RangeKey>('all')
  const [group, setGroup] = useState<GroupKey>('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState(endToday)

  const queryRange = useMemo(() => {
    if (range === 'custom') return { start: customStart || undefined, end: customEnd || undefined }
    if (range === 'all') return { start: undefined, end: endToday }
    return { start: monthOffset(endToday, range === '1y' ? -12 : range === '3y' ? -36 : -60), end: endToday }
  }, [customEnd, customStart, endToday, range])

  const data = useQuery({
    queryKey: QK.usMarketOverview(queryRange.start, queryRange.end),
    queryFn: () => api.usMarketOverview(queryRange.start, queryRange.end),
    staleTime: 5 * 60 * 1000,
  })
  const refresh = useMutation({
    mutationFn: api.usMarketRefresh,
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: ['us-market-overview'] })
      toast(`美股市场数据已刷新：${result.panels} 个面板`, 'success')
    },
  })

  const panels = useMemo(
    () => (data.data?.panels ?? []).filter(panel => group === 'all' || panel.group === group),
    [data.data?.panels, group],
  )

  return (
    <>
      <PageHeader
        title="美股市场 · 宏观与领先指标"
        titleExtra={<span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">聚合页</span>}
        subtitle="统一读取 hanshu123.com，支持时间参数查询"
        right={(
          <button
            type="button"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-elevated px-2.5 text-xs text-secondary transition-colors hover:bg-elevated/80 hover:text-foreground disabled:opacity-50"
          >
            {refresh.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            刷新上游数据
          </button>
        )}
      />

      <div className="space-y-4 overflow-auto p-5">
        <div className="rounded-card border border-accent/25 bg-accent/5 px-4 py-3 text-xs leading-relaxed text-secondary">
          <div className="flex items-center gap-2 font-medium text-foreground"><Activity className="h-3.5 w-3.5 text-accent" />统一数据层</div>
          <p className="mt-1.5">后端将宏观看板、领先指标和 GSBLBR 的公开数据整理为统一的 panel/series/points 契约。默认只展示截至今天的观测；源站的预测/前移序列仍保留，可通过自定义结束日期查询。</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3">
          <div className="flex gap-1">
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map(key => (
              <button key={key} type="button" onClick={() => setRange(key)} className={`rounded-btn px-2 py-1 text-[10px] ${range === key ? 'bg-accent text-white' : 'bg-elevated text-secondary hover:text-foreground'}`}>
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-[10px] text-muted">
            开始
            <input type="date" value={customStart} onChange={event => { setCustomStart(event.target.value); setRange('custom') }} className="h-7 rounded-btn border border-border bg-base px-1.5 text-[10px] text-foreground" />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-muted">
            结束
            <input type="date" value={customEnd} onChange={event => { setCustomEnd(event.target.value); setRange('custom') }} className="h-7 rounded-btn border border-border bg-base px-1.5 text-[10px] text-foreground" />
          </label>
          <span className="ml-auto text-[10px] text-muted">API: {queryRange.start ?? '最早'} → {queryRange.end ?? '最新'}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {(Object.keys(GROUP_LABELS) as GroupKey[]).map(key => (
            <button key={key} type="button" onClick={() => setGroup(key)} className={`rounded-btn px-2.5 py-1.5 text-[10px] ${group === key ? 'bg-accent text-white' : 'bg-elevated text-secondary hover:text-foreground'}`}>
              {GROUP_LABELS[key]}
            </button>
          ))}
          {data.data && <span className="ml-2 self-center text-[10px] text-muted">{panels.length}/{data.data.total_panels} 个面板</span>}
        </div>

        {data.isLoading && <div className="grid min-h-64 place-items-center text-sm text-muted"><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在读取 hanshu123 数据…</div>}
        {data.isError && !data.isLoading && (
          <div className="rounded-card border border-danger/30 bg-danger/5 p-5 text-sm text-secondary">美股市场数据暂不可用，请点击“刷新上游数据”重试。</div>
        )}
        {!data.isLoading && !data.isError && <div className="grid gap-4 2xl:grid-cols-2">{panels.map(panel => <PanelCard key={panel.id} panel={panel} />)}</div>}

        <div className="rounded-card border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-foreground"><Database className="h-3.5 w-3.5 text-accent" />上游数据源与接口</div>
          <div className="grid gap-2 text-[11px] text-secondary md:grid-cols-2">
            {(data.data?.sources ?? []).map(source => (
              <a key={source.key} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate hover:text-accent">
                <ExternalLink className="h-3 w-3 shrink-0" />{source.key} · {source.publisher}
              </a>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted">后端接口：<code>GET /api/us-market/overview?start=YYYY-MM-DD&amp;end=YYYY-MM-DD</code>；单面板：<code>GET /api/us-market/series/{'{panel_id}'}</code>；强制重新抓取：<code>POST /api/us-market/refresh</code>。最后更新：{data.data?.updated_at ?? '—'}。</p>
        </div>
      </div>
    </>
  )
}

const extension: FrontendExtension = {
  id: 'research.us-market',
  apiVersion: 1,
  routes: [{ id: 'research-us-market', path: '/research/us-market', component: UsMarketPage }],
  navigation: [{ id: 'research-us-market', routeId: 'research-us-market', label: '美股市场', icon: Activity, order: 350 }],
}

export default extension
