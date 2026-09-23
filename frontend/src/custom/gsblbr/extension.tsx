import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { Activity, Database, ExternalLink, Info, Loader2, RefreshCw } from 'lucide-react'
import type { FrontendExtension } from '@/extensions/types'
import { api, type GsblbrRow } from '@/lib/api'
import { QK } from '@/lib/queryKeys'
import { useChartTheme } from '@/lib/theme'
import { PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/Toast'

type RangeKey = '1y' | '3y' | '5y' | 'all'

const FACTORS = [
  { key: 'cape_score', label: '估值 · CAPE', raw: 'cape', unit: '倍', color: '#ef4444' },
  { key: 'yield_curve_score', label: '收益率曲线 · 10Y−3M', raw: 'yield_curve', unit: '%', color: '#8b5cf6' },
  { key: 'manufacturing_score', label: '制造业活动代理 · IPMAN', raw: 'manufacturing', unit: '', color: '#0ea5e9' },
  { key: 'private_balance_score', label: '私人部门余额', raw: 'private_balance', unit: '% GDP', color: '#f59e0b' },
  { key: 'core_inflation_score', label: '核心 CPI 同比', raw: 'core_inflation', unit: '%', color: '#ec4899' },
  { key: 'unemployment_score', label: '失业率', raw: 'unemployment', unit: '%', color: '#14b8a6' },
] as const

function formatRaw(value: number, unit: string) {
  const digits = unit === '倍' ? 2 : 2
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`
}

function filterRows(rows: GsblbrRow[], range: RangeKey) {
  if (range === 'all' || rows.length === 0) return rows
  const months = range === '1y' ? 12 : range === '3y' ? 36 : 60
  const last = new Date(`${rows[rows.length - 1].date}T00:00:00`)
  last.setMonth(last.getMonth() - months + 1)
  const cutoff = last.toISOString().slice(0, 7)
  return rows.filter(row => row.date.slice(0, 7) >= cutoff)
}

function useGsblbrChart(option: EChartsOption | null) {
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
    // The chart div is conditionally rendered after the async history query
    // resolves, so the mount-only effect can run before ref.current exists.
    if (!ref.current) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    }
    if (option) {
      chartRef.current.setOption(option, { notMerge: true })
      chartRef.current.resize()
    }
  }, [option])

  return ref
}

function RiskPage() {
  const theme = useChartTheme()
  const queryClient = useQueryClient()
  const [range, setRange] = useState<RangeKey>('all')
  const data = useQuery({
    queryKey: QK.gsblbrHistory(),
    queryFn: () => api.gsblbrHistory(),
    staleTime: 5 * 60 * 1000,
  })
  const refresh = useMutation({
    mutationFn: api.gsblbrRefresh,
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: QK.gsblbrHistory() })
      toast(`GSBLBR 已刷新：${result.rows} 个观测月`, 'success')
    },
  })

  const rows = useMemo(() => filterRows(data.data?.series ?? [], range), [data.data?.series, range])
  const officialSeries = useMemo(() => {
    if (rows.length < 2) return []
    const start = rows[0].date
    const end = rows[rows.length - 1].date
    return (data.data?.official_series ?? []).filter(point => point.date >= start && point.date <= end)
  }, [data.data?.official_series, rows])
  const latest = data.data?.latest
  const chartOption = useMemo<EChartsOption | null>(() => {
    if (rows.length < 2) return null
    const factorSeries = FACTORS.map(factor => ({
      name: factor.label,
      type: 'line' as const,
      data: rows.map(row => [row.date, row[factor.key]]),
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 1, opacity: 0.55, color: factor.color },
      itemStyle: { color: factor.color },
    }))
    const officialLine = {
      name: '高盛原版（公开）',
      type: 'line' as const,
      data: officialSeries.map(point => [point.date, point.value]),
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 1.8, color: '#38bdf8' },
      itemStyle: { color: '#38bdf8' },
      z: 4,
    }
    return {
      animation: false,
      color: ['#f97316', ...FACTORS.map(factor => factor.color)],
      grid: { left: 46, right: 20, top: 28, bottom: 74 },
      legend: { show: false },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.tooltipText, fontSize: 11 },
        formatter: (params: unknown) => {
          const entries = Array.isArray(params) ? params as Array<{ seriesName?: string; value?: [string | number, number] }> : []
          const rawDate = entries[0]?.value?.[0]
          const date = typeof rawDate === 'number' ? new Date(rawDate).toISOString().slice(0, 10) : String(rawDate ?? '')
          const row = rows.find(item => item.date.slice(0, 7) === date.slice(0, 7))
          const officialValue = entries.find(item => item.seriesName === '高盛原版（公开）')?.value?.[1]
          if (!row && officialValue == null) return date
          return [
            `<strong>${date}</strong>`,
            officialValue == null ? '' : `<span style="color:#38bdf8">●</span> 高盛原版：<b>${officialValue.toFixed(2)}</b>`,
            row == null ? '' : `<span style="color:#f97316">●</span> 复刻综合分：<b>${row.score.toFixed(2)}</b>`,
            ...(row == null ? [] : FACTORS.map(factor => `<span style="color:${factor.color}">●</span> ${factor.label}：${row[factor.key].toFixed(2)}`)),
          ].filter(Boolean).join('<br/>')
        },
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: { color: theme.text, fontSize: 10, hideOverlap: true },
        axisLine: { lineStyle: { color: theme.border } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value', min: 0, max: 100, interval: 20,
        name: '风险分', nameTextStyle: { color: theme.text, fontSize: 10 },
        axisLabel: { color: theme.text, fontSize: 10 },
        splitLine: { lineStyle: { color: theme.grid } },
      },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', height: 16, bottom: 16, borderColor: theme.border, fillerColor: theme.zoomFill, textStyle: { color: theme.text, fontSize: 9 } },
      ],
      series: [
        ...(officialSeries.length > 0 ? [officialLine] : []),
        {
          name: '复刻综合分',
          type: 'line',
          data: rows.map(row => [row.date, row.score]),
          showSymbol: false,
          lineStyle: { width: 2.2, color: '#f97316' },
          itemStyle: { color: '#f97316' },
          areaStyle: { color: '#f97316', opacity: 0.08 },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', width: 1, color: '#ef4444', opacity: 0.7 },
            data: [{ yAxis: 70, name: '高危区' }],
            label: { color: '#ef4444', fontSize: 10, formatter: '70 高危' },
          },
        },
        ...factorSeries,
      ],
    }
  }, [officialSeries, rows, theme])
  const chartRef = useGsblbrChart(chartOption)

  return (
    <>
      <PageHeader
        title="GSBLBR 六因子研究复刻"
        titleExtra={<span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">近似版</span>}
        subtitle="等权历史分位风险曲线，不是高盛官方序列"
        right={(
          <button
            type="button"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-elevated px-2.5 text-xs text-secondary transition-colors hover:bg-elevated/80 hover:text-foreground disabled:opacity-50"
          >
            {refresh.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            刷新数据
          </button>
        )}
      />

      <div className="space-y-4 overflow-auto p-5">
        <div className="rounded-card border border-warning/30 bg-warning/5 px-4 py-3 text-xs leading-relaxed text-secondary">
          <div className="flex items-center gap-2 font-medium text-foreground"><Info className="h-3.5 w-3.5 text-warning" />口径说明</div>
          <p className="mt-1.5">文章只公开了计算思路，未公开高盛完整公式。当前实现复刻六项等权百分位；制造业用 IPMAN 工业生产代理替代 PMI，私人部门用 (GPSAVE−GPDI)/GDP 四季度均值并后移两个月。因此曲线用于研究对照，不应标记为官方 GSBLBR。</p>
        </div>

        {data.isLoading && <div className="grid min-h-64 place-items-center text-sm text-muted"><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在加载宏观数据…</div>}
        {data.isError && !data.isLoading && (
          <div className="rounded-card border border-danger/30 bg-danger/5 p-5 text-sm text-secondary">
            <div className="font-medium text-foreground">宏观数据暂不可用</div>
            <p className="mt-1">请检查网络后点击“刷新数据”。接口不会用模拟值填充缺失数据。</p>
          </div>
        )}

        {latest && !data.isLoading && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              <div className="rounded-card border border-border bg-surface p-3">
                <div className="text-[10px] text-muted">最新综合分</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-warning">{latest.score.toFixed(2)}</div>
                <div className="mt-1 text-[10px] text-muted">{latest.date}</div>
              </div>
              {FACTORS.map(factor => (
                <div key={factor.key} className="rounded-card border border-border bg-surface p-3">
                  <div className="truncate text-[10px] text-muted" title={factor.label}>{factor.label}</div>
                  <div className="mt-1 font-mono text-base font-semibold" style={{ color: factor.color }}>{latest[factor.key].toFixed(1)}</div>
                  <div className="mt-1 truncate text-[10px] text-muted">原值 {formatRaw(latest[factor.raw], factor.unit)}</div>
                </div>
              ))}
            </div>

            <div className="rounded-card border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground"><Activity className="h-3.5 w-3.5 text-accent" />复刻综合分与六项分位</div>
                <div className="ml-auto flex gap-1">
                  {(['1y', '3y', '5y', 'all'] as RangeKey[]).map(key => (
                    <button key={key} type="button" onClick={() => setRange(key)} className={`rounded-btn px-2 py-1 text-[10px] ${range === key ? 'bg-accent text-white' : 'bg-elevated text-secondary hover:text-foreground'}`}>
                      {{ '1y': '1年', '3y': '3年', '5y': '5年', all: '全部' }[key]}
                    </button>
                  ))}
                </div>
              </div>
              <div ref={chartRef} className="h-[420px] w-full min-w-0" />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
                {officialSeries.length > 0 && <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />高盛原版（公开日度）</span>}
                <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-warning" />综合分</span>
                {FACTORS.map(factor => <span key={factor.key}><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: factor.color }} />{factor.label}</span>)}
              </div>
            </div>

            <div className="rounded-card border border-border bg-surface p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-foreground"><Database className="h-3.5 w-3.5 text-accent" />数据源</div>
              <div className="grid gap-2 text-[11px] text-secondary md:grid-cols-2">
                {Object.entries(data.data?.sources ?? {}).map(([key, source]) => (
                  <a key={key} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate hover:text-accent">
                    <ExternalLink className="h-3 w-3 shrink-0" />{source.series} · {source.publisher}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted">复刻覆盖 {data.data?.start} 至 {data.data?.end}，共 {data.data?.total} 个月；高盛原版公开值覆盖 {officialSeries[0]?.date ?? '暂无'} 至 {officialSeries[officialSeries.length - 1]?.date ?? '暂无'}。原版后续日期因数据集公开遮罩没有值，不做补值。最后刷新：{data.data?.updated_at}。</p>
            </div>
          </>
        )}
      </div>
    </>
  )
}

const extension: FrontendExtension = {
  id: 'research.gsblbr',
  apiVersion: 1,
  routes: [{ id: 'research-gsblbr', path: '/research/gsblbr', component: RiskPage }],
  navigation: [{ id: 'research-gsblbr', routeId: 'research-gsblbr', label: 'GSBLBR 复刻', icon: Activity, order: 360 }],
}

export default extension
