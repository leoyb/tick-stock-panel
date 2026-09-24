// 演示数据生成工具。
// 重要：本模块（macro-views）**全部数据都是 mock**，只用于把「微观 Value · 百年尺度，
// 宏观看板集」的页面结构跑通看效果；页面上必须显式标注「演示数据」。真实数据接入时，
// 只需把各 mock/*.ts 换成走 lib/api.ts 的查询，组件层不用改。
import { useEffect, useState } from 'react'

/** 页面统一标注的快照日期（与演示视频中页面右上角一致） */
export const SNAPSHOT_DATE = '2026-09-11'

/** 确定性伪随机：同一 seed 每次渲染得到同一条曲线，避免刷新页面时数据乱跳 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isoDate(base: string, offsetDays: number): string {
  const date = new Date(`${base}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

interface WalkOptions {
  /** 曲线起点值 */
  start: number
  /** 曲线终点值（最后一点会被精确落在该值上，方便对着视频里的读数演示） */
  end: number
  /** 采样点数 */
  points: number
  /** 随机种子 */
  seed: number
  /** 噪声幅度（相对值的比例），默认 0.05 */
  volatility?: number
  /** 最后一点日期，默认 SNAPSHOT_DATE */
  endDate?: string
  /** 相邻点间隔天数，默认 30（月频） */
  stepDays?: number
}

/** 生成一条带噪声、但起止值可控的时间序列（[日期, 数值] 形式，直接喂 ECharts time 轴） */
export function seededWalk(options: WalkOptions): Array<[string, number]> {
  const { start, end, points, seed, volatility = 0.05, endDate = SNAPSHOT_DATE, stepDays = 30 } = options
  const rnd = mulberry32(seed)
  const out: Array<[string, number]> = []
  let value = start
  for (let i = 0; i < points; i += 1) {
    const progress = points <= 1 ? 1 : i / (points - 1)
    const target = start + (end - start) * progress
    const noise = (rnd() - 0.5) * 2 * volatility * Math.max(Math.abs(target), 1e-6)
    value = i === points - 1 ? end : target + noise
    out.push([isoDate(endDate, -(points - 1 - i) * stepDays), Number(value.toFixed(4))])
  }
  return out
}

/** 年度柱状数据（年份区间固定、数值在 [min,max] 内确定性抖动） */
export function yearlyBars(years: number[], seed: number, min: number, max: number): Array<{ year: number; value: number }> {
  const rnd = mulberry32(seed)
  return years.map(year => ({ year, value: Number((min + rnd() * (max - min)).toFixed(2)) }))
}

/** 行列矩阵（热力图/矩阵表用），确定性抖动 */
export function seededMatrix(rowLabels: string[], colLabels: string[], seed: number, min: number, max: number): number[][] {
  const rnd = mulberry32(seed)
  return rowLabels.map(() => colLabels.map(() => Number((min + rnd() * (max - min)).toFixed(2))))
}

/**
 * 模拟一次数据加载（默认 260ms）。
 * 为什么需要：仓库要求每个页面覆盖「加载/空/错误」等状态，纯静态 mock 会让加载态永远看不到，
 * 因此各页面统一用这个 hook 过一遍加载态，便于人工检查骨架屏效果。
 */
export function useMockLoad(delayMs = 260): boolean {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])
  return loading
}
