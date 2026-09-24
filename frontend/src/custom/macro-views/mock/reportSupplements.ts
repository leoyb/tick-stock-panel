// 视频逐秒报告中可见、原看板尚未绘制的图表。除明确注明的画面读数外，序列均为确定性 mock。
import { mulberry32, seededMatrix, seededWalk, yearlyBars } from '../lib/mock'
import { A_SHARE_ANNUAL } from './aShare'
import { DR_LEADER_ROWS } from './dailyReview'

export const GOLD_RMB_LOG = seededWalk({ start: 68, end: 931.84, points: 340, seed: 2201, volatility: 0.07 })

export const US_EPS = seededWalk({ start: 3, end: 235, points: 112, seed: 3301, volatility: 0.1, stepDays: 365 })
export const US_MONTH_YEARS = Array.from({ length: 16 }, (_, i) => String(2010 + i))
export const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
export const US_MONTH_RETURNS = seededMatrix(US_MONTH_YEARS, MONTHS, 3302, -12, 12)

export const CN_RRR = seededWalk({ start: 17, end: 8, points: 96, seed: 4401, volatility: 0.025, stepDays: 60 })

export const US_ISSUANCE = yearlyBars(Array.from({ length: 11 }, (_, i) => 2016 + i), 5501, 4, 12)
export const US_TOPOLOGY_NODES = ['财政部', '国债市场', '美联储', '银行', '家庭与基金', '企业', '海外持有者']
export const US_TOPOLOGY_LINKS = [
  ['财政部', '国债市场'], ['国债市场', '美联储'], ['国债市场', '银行'],
  ['国债市场', '家庭与基金'], ['国债市场', '海外持有者'],
  ['银行', '企业'], ['企业', '家庭与基金'], ['家庭与基金', '财政部'],
]

export const A_MONTH_YEARS = Array.from({ length: 11 }, (_, i) => String(2015 + i))
export const A_MONTH_RETURNS = seededMatrix(A_MONTH_YEARS, MONTHS, 6601, -18, 18)
export const A_ROLLING_5Y = seededWalk({ start: 4, end: 6, points: 144, seed: 6602, volatility: 1.7, stepDays: 30 })
export const A_PE = seededWalk({ start: 14, end: 13.62, points: 180, seed: 6603, volatility: 0.28, stepDays: 30 })
export const A_ANNUAL_DRAWDOWN = A_SHARE_ANNUAL.map(({ year, value }) => ({
  year, value: Number(Math.min(-5, value - 13 - (year % 6) * 2).toFixed(2)),
}))
export const A_FINANCING_NET = yearlyBars(Array.from({ length: 13 }, (_, i) => 2014 + i), 6604, -700, 700)
export const A_TURNOVER = seededWalk({ start: 1300, end: 15982.97, points: 96, seed: 6605, volatility: 0.34, stepDays: 30 })

export const LA_GOLD_REAL = seededWalk({ start: 55, end: 790, points: 60, seed: 7701, volatility: 0.14, stepDays: 365 })
export const LA_US_CURVES = [
  { year: '1990', values: [6.63, 7.15, 7.68, 8.08, 8.26] },
  { year: '2000', values: [5.89, 5.11, 4.99, 5.12, 5.46] },
  { year: '2005', values: [4.08, 4.41, 4.35, 4.39, null] },
]

export const DR_BREADTH = [
  { name: '上涨', value: 1774 }, { name: '下跌', value: 3366 }, { name: '平盘', value: 87 },
]
export const DR_VOLUME = [{ name: '昨日', value: 21354 }, { name: '今日', value: 17650 }]
export const DR_SENTIMENT_RATES = [
  { name: '封板率', value: 66.2 }, { name: '连板晋级率', value: 48.9 }, { name: '炸板率', value: 33.8 },
]
export const DR_SECTOR_FLOW = [...DR_LEADER_ROWS]
  .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  .slice(0, 10)
  .map(({ name, net }) => ({ name, value: net }))
export const DR_SOUTHBOUND = (() => {
  const random = mulberry32(9901)
  return Array.from({ length: 60 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 8, 23 - (59 - i))).toISOString().slice(0, 10),
    value: i === 59 ? 34.48 : Number((random() * 240 - 80).toFixed(2)),
  }))
})()
