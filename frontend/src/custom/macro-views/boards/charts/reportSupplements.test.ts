import { expect, it } from 'vitest'
import { chartTheme } from '@/lib/theme'
import { aMonthlyOption, usMonthlyOption } from './reportSupplements'
import { A_MONTH_RETURNS, DR_SOUTHBOUND, GOLD_RMB_LOG, LA_US_CURVES, US_MONTH_RETURNS } from '../../mock/reportSupplements'

it('补绘热力图有 ECharts 必需的 visualMap，矩阵尺寸与时间锚点稳定', () => {
  const theme = chartTheme('dark')
  expect(usMonthlyOption(theme).visualMap).toBeTruthy()
  expect(aMonthlyOption(theme).visualMap).toBeTruthy()
  expect(US_MONTH_RETURNS).toHaveLength(16)
  expect(A_MONTH_RETURNS).toHaveLength(11)
  expect(US_MONTH_RETURNS.every(row => row.length === 12)).toBe(true)
  expect(A_MONTH_RETURNS.every(row => row.length === 12)).toBe(true)
  expect(GOLD_RMB_LOG.at(-1)?.[1]).toBe(931.84)
  expect(DR_SOUTHBOUND.at(-1)).toEqual({ date: '2026-09-23', value: 34.48 })
  expect(LA_US_CURVES[2].values.at(-1)).toBeNull()
})
