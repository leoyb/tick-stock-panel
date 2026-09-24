// ECharts 实例托管 hook：初始化 / setOption / 尺寸自适应 / 销毁。
// 为什么不用 echarts-for-react：仓库内既有页面（custom/us-market、pages/backtest）都走
// 自建 hook + ResizeObserver 的路子，且 echarts-for-react 在全仓零使用（见 CONTRIBUTING
// 「不新增依赖、不引入平行实现」），这里沿用同一约定，避免同一仓库出现两种图表接法。
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'

export function useChart(option: EChartsOption | null) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 用 ResizeObserver 而不是 window.resize：侧栏折叠、栅格换列时容器尺寸变化
    // 不一定伴随窗口尺寸变化，只监听 window 会导致图表被压扁。
    const observer = new ResizeObserver(() => chartRef.current?.resize())
    observer.observe(el)
    return () => {
      observer.disconnect()
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
