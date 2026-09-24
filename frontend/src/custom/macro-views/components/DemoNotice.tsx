// 「演示数据」提示条。
// 为什么单独成组件：仓库明令禁止把 mock 数据伪装成真实行情，因此每个看板页顶部
// 都必须出现这条醒目提示，统一组件可以避免某页漏写。
import { FlaskConical } from 'lucide-react'

export function DemoNotice({ scope, extra }: { scope: string; extra?: string }) {
  return (
    <div className="rounded-card border border-accent/25 bg-accent/5 px-4 py-3 text-xs leading-relaxed text-secondary">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <FlaskConical className="h-3.5 w-3.5 text-accent" />
        演示数据（mock）· {scope}
      </div>
      <p className="mt-1.5">
        本页是「微观 Value · 百年尺度，宏观看板集」的界面复刻，页面上的数值与曲线均为<strong className="text-foreground">离线模拟数据</strong>，
        仅用于查看版式与图表效果，不代表真实行情，也不构成任何投资建议。
        {extra ? ` ${extra}` : ''}
      </p>
    </div>
  )
}
