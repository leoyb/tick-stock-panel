// 看板「面板」卡片：标题 + 副标题（口径说明）+ 右上角角标 + 内容 + 底部脚注。
// 对应演示视频里每个面板的固定结构（标题大字、下面一行灰色口径说明、右上角频率/来源角标）。
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  title: string
  /** 口径说明，对应页面上那行浅灰小字 */
  subtitle?: ReactNode
  /** 右上角角标，如「日频」「月频」「推断：折线图」 */
  corner?: ReactNode
  /** 底部脚注（数据来源、样本区间等） */
  footer?: ReactNode
  className?: string
  /** 供左侧目录锚点跳转使用 */
  id?: string
  children: ReactNode
}

export function Panel({ title, subtitle, corner, footer, className, id, children }: Props) {
  return (
    <section id={id} className={cn('scroll-mt-4 rounded-card border border-border bg-surface p-4', className)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-[10px] leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
        {corner ? (
          <span className="shrink-0 rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">{corner}</span>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
      {footer ? <div className="mt-2 text-[10px] leading-relaxed text-muted">{footer}</div> : null}
    </section>
  )
}
