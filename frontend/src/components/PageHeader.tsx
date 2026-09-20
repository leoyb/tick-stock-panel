import { cn } from '@/lib/cn'

interface Props {
  title: string
  subtitle?: React.ReactNode
  /** 标题右侧、subtitle 之前的额外节点(如状态徽标) */
  titleExtra?: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, titleExtra, right, className }: Props) {
  return (
    <header
      className={cn(
        // 移动端: 标题行与右侧控件换行堆叠; 副标题窄屏隐藏 (信息密度优先级最低)
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-3 pb-2 border-b border-border sm:px-5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="shrink-0 text-lg font-semibold tracking-tight">{title}</h1>
        {titleExtra}
        {subtitle && <span className="hidden text-xs text-muted sm:inline">{subtitle}</span>}
      </div>
      {right}
    </header>
  )
}
