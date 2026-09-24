// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StockAnalysis } from './StockAnalysis'

vi.mock('@/lib/useLastStock', () => ({
  useLastStock: () => ({ last: { symbol: '600000.SH', name: '浦发银行' }, remember: vi.fn() }),
}))
vi.mock('@/lib/api', () => ({
  api: {
    klineDaily: async () => ({ rows: [
      { date: '2026-09-01', open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
      { date: '2026-09-02', open: 10.5, high: 12, low: 10, close: 11, volume: 120 },
    ] }),
    stockAnalysisLevels: async () => ({ levels: {}, close: 11 }),
    stockTrendAnalysis: async () => ({
      status: 'ok', data_as_of: '2026-09-02', algorithm_version: 'test', limitations: [],
      signals: [
        { signal_type: 'trend', label: 'bullish', confidence: 0.8, reason_codes: [], as_of: '2026-09-02' },
        { signal_type: 'chanlun_buy', label: 'bullish', confidence: 0.7, reason_codes: [], as_of: '2026-09-02' },
      ],
      overlays: [
        { overlay_type: 'trend_line', label: '趋势线', points: [] },
        { overlay_type: 'chanlun_stroke', label: '笔', points: [] },
      ],
      chanlun: { fractals: [], strokes: [], segments: [], centers: [
        { start_date: '2026-09-01', end_date: '2026-09-02', low: 10, high: 11 },
      ] },
    }),
  },
}))
vi.mock('@/components/stock-analysis/AnalysisKChart', () => ({
  AnalysisKChart: ({ markers, trendOverlays, ranges, showChanlun, onToggleChanlun }: {
    markers: { label: string }[]
    trendOverlays: { overlay_type: string }[]
    ranges: unknown[]
    showChanlun: boolean
    onToggleChanlun: () => void
  }) => <div data-testid="chart-controls">
    <button type="button" aria-pressed={showChanlun} onClick={onToggleChanlun}>缠论</button>
    <div data-testid="chart" data-markers={markers.map(item => item.label).join(',')}
      data-overlays={trendOverlays.map(item => item.overlay_type).join(',')} data-ranges={ranges.length} />
  </div>,
}))
vi.mock('@/components/financials/StockFinancialSearch', () => ({ StockFinancialSearch: () => null }))
vi.mock('@/components/StockPreviewDialog', () => ({ StockPreviewDialog: () => null }))
vi.mock('@/components/LastStockChip', () => ({ LastStockChip: () => null }))
vi.mock('@/components/stock-analysis/PriceAlertDialog', () => ({ PriceAlertDialog: () => null }))
vi.mock('@/lib/stockAnalysisStore', () => ({
  loadHistory: vi.fn(), useHistoryReports: () => ({ reports: [], loaded: true }),
  startAnalysis: vi.fn(), findTodayReport: vi.fn(), deleteReport: vi.fn(),
  openHistoryReport: vi.fn(),
}))

let host: HTMLDivElement
let root: Root
let client: QueryClient

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
})

it('keeps Chanlun hidden by default and toggles all its chart and panel elements', async () => {
  await act(async () => root.render(<QueryClientProvider client={client}><StockAnalysis /></QueryClientProvider>))
  for (let i = 0; i < 5; i++) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  }
  const chart = () => host.querySelector<HTMLElement>('[data-testid="chart"]')
  const toggle = host.querySelector<HTMLButtonElement>('[data-testid="chart-controls"] button[aria-pressed]')!
  expect(toggle.textContent?.trim()).toBe('缠论')
  expect(toggle.getAttribute('aria-pressed')).toBe('false')
  expect(chart()?.dataset.markers).toBe('趋势多')
  expect(chart()?.dataset.overlays).toBe('trend_line')
  expect(chart()?.dataset.ranges).toBe('0')
  expect(host.querySelector('[data-testid="chanlun-summary"]')).toBeNull()
  expect(host.textContent).not.toContain('买点观察')

  await act(async () => toggle.click())
  expect(toggle.getAttribute('aria-pressed')).toBe('true')
  expect(chart()?.dataset.markers).toBe('趋势多,买点观察')
  expect(chart()?.dataset.overlays).toBe('trend_line,chanlun_stroke')
  expect(chart()?.dataset.ranges).toBe('1')
  expect(host.querySelector('[data-testid="chanlun-summary"]')).not.toBeNull()
  expect(host.textContent).toContain('买点观察')

  await act(async () => toggle.click())
  expect(chart()?.dataset.markers).toBe('趋势多')
  expect(chart()?.dataset.overlays).toBe('trend_line')
  expect(chart()?.dataset.ranges).toBe('0')
  expect(host.querySelector('[data-testid="chanlun-summary"]')).toBeNull()
})
