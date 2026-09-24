// 首页 · 星轨导航页（对应演示视频开场的聚合首页）
// 结构：页眉 → 演示提示 → 星轨区（8 张入口卡片 + 中央四组大号数字 + 悬停说明浮层）
//      → 底部指标横条 → 作品墙（未实现入口，禁用态）→ 模块说明
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/cn'
import { BOARDS, boardByKey } from '../lib/boards'
import { SNAPSHOT_DATE, useMockLoad } from '../lib/mock'
import { HUB_METRICS, TICKER_KEYS, WORK_ENTRIES } from '../mock/home'
import { DemoNotice } from '../components/DemoNotice'
import { GOLD } from '../lib/palette'

export function MacroHome() {
  // 悬停/聚焦哪张卡片，就在中央浮层里显示该看板的定位与标签（复刻视频里的悬停说明卡）
  const [activeKey, setActiveKey] = useState(BOARDS[0].key)
  const activeBoard = boardByKey(activeKey) ?? BOARDS[0]
  const loading = useMockLoad()

  return (
    <>
      <PageHeader
        title="微观 Value · 百年尺度，宏观看板集"
        titleExtra={<span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">演示数据</span>}
        subtitle="以 V 的视角看世界 · SEE THE WORLD THROUGH V"
        right={
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-elevated px-2 py-0.5 font-mono text-[10px] text-muted md:inline">
              数据快照 {SNAPSHOT_DATE}
            </span>
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted">演示中</span>
          </div>
        }
      />

      <div className="space-y-5 overflow-auto p-5">
        <DemoNotice scope="首页 · 星轨导航" extra="八个看板入口均可点开，页面内不再有真实数据。" />

        {/* 星轨区 */}
        <section className="relative overflow-hidden rounded-card border border-border bg-surface p-5">
          {/* 装饰轨道：画面上那圈"星轨"，仅作视觉背景，不承载信息 */}
          <svg className="pointer-events-none absolute inset-0 hidden h-full w-full xl:block" aria-hidden="true">
            <ellipse cx="50%" cy="52%" rx="38%" ry="31%" fill="none" stroke={GOLD} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 7" />
            <ellipse cx="50%" cy="52%" rx="28%" ry="22%" fill="none" stroke={GOLD} strokeOpacity="0.1" strokeWidth="1" />
          </svg>

          <div className="relative flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Compass className="h-3.5 w-3.5 text-accent" />
              把面板放到星轨上 · 点击任一入口进入对应看板
            </div>

            {/* 中央数字 + 悬停说明浮层 */}
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-card border border-border bg-base/40 p-4">
                {loading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {HUB_METRICS.map(metric => (
                      <div key={metric.label} className="animate-pulse rounded-btn bg-elevated/60 p-3">
                        <div className="h-5 w-24 rounded bg-elevated" />
                        <div className="mt-2 h-2.5 w-12 rounded bg-elevated" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {HUB_METRICS.map(metric => (
                      <div key={metric.label} className="rounded-btn border border-border/70 bg-surface p-3">
                        <div className="font-mono text-base text-foreground">{metric.value}</div>
                        <div className="mt-0.5 text-[10px] text-muted">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-card border border-accent/25 bg-accent/5 p-4" aria-live="polite">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-accent">{activeBoard.badge}</span>
                  <span className="text-sm text-foreground">{activeBoard.label}</span>
                  {activeBoard.key === 'daily-review' ? (
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">每交易日 16:10</span>
                  ) : null}
                  {activeBoard.key === 'weekly' ? (
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">每周更新</span>
                  ) : null}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-secondary">{activeBoard.subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeBoard.tags.map(tag => (
                    <span key={tag} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  to={activeBoard.path}
                  className="mt-3 inline-flex h-7 items-center gap-1 rounded-btn bg-accent px-2.5 text-[11px] text-white transition-opacity hover:opacity-90"
                >
                  进入看板
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* 8 张入口卡片 */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {BOARDS.map(board => (
                <Link
                  key={board.key}
                  to={board.path}
                  onMouseEnter={() => setActiveKey(board.key)}
                  onFocus={() => setActiveKey(board.key)}
                  onTouchStart={() => setActiveKey(board.key)}
                  aria-current={board.key === activeKey ? 'true' : undefined}
                  className={cn(
                    'group rounded-card border p-3 transition-all',
                    board.key === activeKey
                      ? 'border-accent/50 bg-accent/5'
                      : 'border-border bg-base/30 hover:border-accent/30 hover:bg-base/50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-accent">{board.badge}</span>
                    <span className="text-[12px] text-foreground">{board.label}</span>
                  </div>
                  <div className="mt-2 font-mono text-[15px] tabular-nums text-foreground">{board.metric.value}</div>
                  <div className="text-[10px] text-muted">{board.metric.note}</div>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted group-hover:text-accent">
                    进入看板
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 底部指标横条 */}
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-xs font-semibold text-foreground">看板指标条</h2>
          <p className="mt-1 text-[10px] text-muted">对应视频底部那条横跨页宽的五组读数（演示值）。</p>
          {loading ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {TICKER_KEYS.map(key => (
                <div key={key} className="h-16 animate-pulse rounded-btn bg-elevated/60" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {TICKER_KEYS.map(key => {
                const board = boardByKey(key)
                if (!board) return null
                return (
                  <Link key={key} to={board.path} className="rounded-btn border border-border/70 bg-base/30 p-3 transition-colors hover:border-accent/30">
                    <div className="text-[10px] text-muted">{board.label}</div>
                    <div className="mt-1 font-mono text-base tabular-nums text-foreground">{board.metric.value}</div>
                    <div className="text-[10px] text-muted">{board.metric.note}</div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* 作品墙 */}
        <section className="rounded-card border border-border bg-surface p-4">
          <h2 className="text-xs font-semibold text-foreground">作品墙</h2>
          <p className="mt-1 text-[10px] text-muted">原首页的其它作品入口，本仓库未实现，这里按禁用态展示，用于覆盖「不可用」状态的视觉检查。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {WORK_ENTRIES.map(entry => (
              <button
                key={entry.label}
                type="button"
                disabled
                title={entry.note}
                className="cursor-not-allowed rounded-btn border border-border bg-elevated/40 px-2.5 py-1 text-[11px] text-muted opacity-60"
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        <div className="rounded-card border border-border bg-surface p-4 text-[10px] leading-relaxed text-muted">
          <div className="text-[11px] font-medium text-foreground">关于这个模块</div>
          <p className="mt-1.5">
            目录：<code className="text-secondary">frontend/src/custom/macro-views/</code>。九个页面（首页 + 八个看板）由扩展机制自动注册到侧栏「宏观看板集」，
            不修改 <code className="text-secondary">router.tsx</code> / <code className="text-secondary">Layout.tsx</code> 等核心热点文件；数据全部为 mock，快照日 {SNAPSHOT_DATE}。
          </p>
        </div>
      </div>
    </>
  )
}
