// 图表容器：统一处理「加载中 / 空数据 / 出错 / 正常」四态 + 固定高度 + 底部图例说明。
// 为什么需要它：仓库要求每个页面覆盖加载/空/错误态，把四态收在一个组件里，
// 各看板页只需要给出 ECharts option，避免每页重复写三套分支。
import type { EChartsOption } from 'echarts'
import type { LucideIcon } from 'lucide-react'
import { LineChart } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { useChart } from '../lib/useChart'

interface Props {
  option: EChartsOption | null
  /** 图表高度（px），默认 220 */
  height?: number
  loading?: boolean
  /** 空数据态 */
  empty?: boolean
  emptyTitle?: string
  emptyHint?: string
  emptyIcon?: LucideIcon
  /** 错误态文案；传了字符串就展示错误态 */
  error?: string | null
  /** 图表下方的图例/口径说明 */
  note?: string
  className?: string
}

export function ChartBox({
  option,
  height = 220,
  loading = false,
  empty = false,
  emptyTitle = '暂无数据',
  emptyHint,
  emptyIcon,
  error = null,
  note,
  className,
}: Props) {
  // 非正常态时传 null，图表实例不渲染数据；hook 调用顺序保持一致
  const ref = useChart(loading || empty || error ? null : option)

  return (
    <div className={className}>
      {error ? (
        <div
          className="grid place-items-center rounded-card border border-danger/30 bg-danger/5 text-[11px] text-secondary"
          style={{ height }}
        >
          {error}
        </div>
      ) : loading ? (
        <div className="animate-pulse rounded-card border border-border bg-elevated/60" style={{ height }} />
      ) : empty ? (
        <div className="grid place-items-center rounded-card border border-dashed border-border" style={{ height }}>
          <EmptyState icon={emptyIcon ?? LineChart} title={emptyTitle} hint={emptyHint} />
        </div>
      ) : (
        <div ref={ref} className="w-full min-w-0" style={{ height }} />
      )}
      {note ? <p className="mt-2 text-[10px] leading-relaxed text-muted">{note}</p> : null}
    </div>
  )
}
