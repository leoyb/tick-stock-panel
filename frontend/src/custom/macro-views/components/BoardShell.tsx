// 看板页外壳：页眉（徽标/看板名/定位语/快照标记）+ 演示提示 + 左侧目录 + 内容区 + 底部看板导航 + 免责声明。
// 为什么做成外壳：9 个看板页的页眉、目录、免责声明完全同构，收在一处可以保证
// 「数据快照日期」「演示数据」标记不漏写，也让各页只关心自己的面板与图表。
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/cn'
import { BOARDS, HOME_PATH, type BoardMeta } from '../lib/boards'
import { SNAPSHOT_DATE } from '../lib/mock'
import { DemoNotice } from './DemoNotice'

export interface BoardSection {
  id: string
  label: string
  /** 目录里显示的额外说明，如「7 个指标」 */
  hint?: string
}

interface Props {
  board: BoardMeta
  /** 页面顶部状态标记，如「数据 23 个指标 · 构建 2026-09-11」 */
  meta?: string[]
  /** 左侧目录（锚点跳转用）；不传则不显示目录栏 */
  sections?: BoardSection[]
  /** 是否显示底部的其它看板导航（默认显示） */
  showBoardNav?: boolean
  children: ReactNode
}

export function BoardShell({ board, meta = [], sections, showBoardNav = true, children }: Props) {
  return (
    <>
      <PageHeader
        title={board.label}
        titleExtra={
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-accent">{board.badge}</span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">演示数据</span>
          </span>
        }
        subtitle={board.subtitle}
        right={
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-muted md:inline">
              数据快照 {SNAPSHOT_DATE}
            </span>
            <Link
              to={HOME_PATH}
              className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-elevated px-2.5 text-xs text-secondary transition-colors hover:bg-elevated/80 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回星轨
            </Link>
          </div>
        }
      />

      <div className="space-y-4 overflow-auto p-5">
        <DemoNotice scope={board.label} />

        {meta.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
            {meta.map(item => (
              <span key={item} className="rounded-full border border-border bg-surface px-2 py-0.5">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        {/* 看板导航放在页面顶部：进页先选看板，不用滚到页尾才能切换 */}
        {showBoardNav ? <OtherBoards currentKey={board.key} /> : null}

        <div className="flex items-start gap-4">
          {sections && sections.length > 0 ? (
            <nav className="sticky top-2 hidden w-44 shrink-0 space-y-0.5 xl:block" aria-label="本页目录">
              {sections.map(section => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-baseline justify-between gap-2 rounded-btn px-2 py-1 text-[11px] text-secondary transition-colors hover:bg-elevated hover:text-foreground"
                >
                  <span className="truncate">{section.label}</span>
                  {section.hint ? <span className="shrink-0 text-[9px] text-muted">{section.hint}</span> : null}
                </a>
              ))}
            </nav>
          ) : null}

          <div className="min-w-0 flex-1 space-y-4">{children}</div>
        </div>

        <div className="rounded-card border border-border bg-surface p-4 text-[10px] leading-relaxed text-muted">
          <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-accent" />
            关于本模块
          </div>
          <p className="mt-1.5">
            本模块是「微观 Value · 百年尺度，宏观看板集」的界面复刻，用于验证版式、图表与交互；
            所有数值与曲线均为离线模拟数据（快照日 {SNAPSHOT_DATE}），不接真实行情、不构成投资建议。
            接入真实数据时，只需把各 <code className="text-secondary">mock/*.ts</code> 换成走 <code className="text-secondary">lib/api.ts</code> 的查询，页面组件无需改动。
          </p>
        </div>
      </div>
    </>
  )
}

/** 底部看板导航：把 8 个看板以卡片形式列出，当前页高亮（对应视频底部的看板指标条） */
export function OtherBoards({ currentKey }: { currentKey: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {BOARDS.map(item => {
        const active = item.key === currentKey
        return (
          <Link
            key={item.key}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-card border p-3 transition-colors',
              active ? 'border-accent/40 bg-accent/5' : 'border-border bg-surface hover:border-accent/30 hover:bg-elevated/40',
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] text-foreground">
              <span className="rounded bg-elevated px-1 py-0.5 font-mono text-[9px] text-accent">{item.badge}</span>
              <span className="truncate">{item.label}</span>
            </div>
            <div className="mt-1.5 font-mono text-sm tabular-nums text-foreground">{item.metric.value}</div>
            <div className="text-[10px] text-muted">{item.metric.note}</div>
          </Link>
        )
      })}
    </div>
  )
}
