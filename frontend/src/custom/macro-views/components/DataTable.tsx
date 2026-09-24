// 通用数据表：宏观看板里大量「指标 × 数值」表格（领涨板块榜、年末点位矩阵、龙虎榜等）共用。
// 为什么不用现成的表格组件：仓库里 watchlist/screener 的表格绑定各自的列配置与虚拟滚动契约，
// 这里只需要「小尺寸、可着色、可横向滚动」的静态表，独立实现更简单，也不触碰那些热点文件。
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { deltaColor } from '../lib/palette'

export interface Column<T> {
  /** 列 key（用于 React key 与 aria） */
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  /** 自定义渲染；不传则直接取 row[key] */
  render?: (row: T) => ReactNode
  /** 返回数值用于红涨绿跌着色（仅对数字列有意义） */
  delta?: (row: T) => number | null | undefined
  /** 是否用等宽数字（默认 true，数值列建议保持） */
  mono?: boolean
  /** 窄屏隐藏该列 */
  narrowHidden?: boolean
}

interface Props<T> {
  columns: Array<Column<T>>
  rows: T[]
  /** 行 key 提取（默认取 index） */
  rowKey?: (row: T, index: number) => string
  /** 表格最大高度，超出滚动；默认不限制 */
  maxHeight?: string
  /** 斑马纹 + 更紧凑的行高 */
  dense?: boolean
  /** 空态文案 */
  emptyHint?: string
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  maxHeight,
  dense = true,
  emptyHint = '暂无数据',
  className,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className={cn('rounded-card border border-dashed border-border p-6 text-center text-[11px] text-muted', className)}>
        {emptyHint}
      </div>
    )
  }

  return (
    <div className={cn('tw overflow-auto rounded-card border border-border', className)} style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            {columns.map(column => (
              <th
                key={column.key}
                className={cn(
                  'sticky top-0 z-[1] whitespace-nowrap border-b border-border bg-elevated px-2 py-1.5 text-left font-medium text-secondary',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                  column.narrowHidden && 'hidden md:table-cell',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row, index) : String(index)} className="odd:bg-surface even:bg-surface/40">
              {columns.map(column => {
                const deltaValue = column.delta ? column.delta(row) : undefined
                const raw = column.render ? column.render(row) : (row[column.key] as ReactNode)
                return (
                  <td
                    key={column.key}
                    className={cn(
                      'border-b border-border/60 px-2 text-secondary',
                      dense ? 'py-1' : 'py-1.5',
                      (column.mono ?? true) && 'font-mono tabular-nums',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.narrowHidden && 'hidden md:table-cell',
                    )}
                    style={deltaValue === undefined || deltaValue === null ? undefined : { color: deltaColor(deltaValue) }}
                  >
                    {raw ?? '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
