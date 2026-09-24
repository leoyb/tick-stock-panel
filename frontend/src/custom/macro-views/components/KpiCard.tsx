// KPI 数字卡：对应演示视频里「一个大数字 + 一行指标名 + 一行来源/日期」的卡片。
// 值/涨跌都以字符串传入，由调用方决定格式（仓库已有 fmtPct/fmtPrice/fmtBigNum，页面里直接用）。
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { deltaColor } from '../lib/palette'

interface Props {
  /** 指标名（画面上方那行小字） */
  label: string
  /** 主数值（画面上最大的那行） */
  value: string
  /** 单位，如 /克、吨、% */
  unit?: string
  /** 涨跌文本，如 「-6.20%」「+0.95pp」「近一年 +18.84%」 */
  delta?: string
  /** 涨跌方向（用于着色；不传则不按涨跌着色） */
  deltaValue?: number
  /** 来源/日期，如 「东财 · 2026-09-11」 */
  source?: string
  /** 补充说明（口径） */
  hint?: ReactNode
  className?: string
  /** 次级样式：用于把卡片降权（例如「待补数据」占位卡） */
  muted?: boolean
}

export function KpiCard({ label, value, unit, delta, deltaValue, source, hint, className, muted }: Props) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface p-3',
        muted && 'bg-surface/60',
        className,
      )}
    >
      <div className="text-[10px] text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn('font-mono text-lg tabular-nums', muted ? 'text-secondary' : 'text-foreground')}>{value}</span>
        {unit ? <span className="text-[10px] text-muted">{unit}</span> : null}
      </div>
      {delta ? (
        <div className="mt-0.5 font-mono text-[11px] tabular-nums" style={deltaValue === undefined ? undefined : { color: deltaColor(deltaValue) }}>
          {delta}
        </div>
      ) : null}
      {hint ? <div className="mt-1 text-[10px] leading-relaxed text-muted">{hint}</div> : null}
      {source ? <div className="mt-1 text-[10px] text-muted">{source}</div> : null}
    </div>
  )
}
