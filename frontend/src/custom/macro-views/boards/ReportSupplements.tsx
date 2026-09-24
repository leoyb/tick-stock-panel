// 与视频逐秒报告对照后补绘的图表。全部只消费确定性 mock，不接真实行情。
import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type { ChartTheme } from '@/lib/theme'
import { useChartTheme } from '@/lib/theme'
import { ChartBox } from '../components/ChartBox'
import { Panel } from '../components/Panel'
import {
  aAnnualDrawdownOption, aFinancingNetOption, aMonthlyOption, aPeOption, aRollingOption, aTurnoverOption,
  cnRrrOption, dailyBreadthOption, dailySectorFlowOption, dailySentimentOption, dailySouthboundOption,
  dailyVolumeOption, goldRmbOption, laGoldRealOption, laUsCurveOption, usEpsOption,
  usIssuanceOption, usMonthlyOption, usTopologyOption,
} from './charts/reportSupplements'

function MockChart({ option, loading, height = 250, note }: {
  option: (theme: ChartTheme) => EChartsOption; loading: boolean; height?: number; note: string
}) {
  const theme = useChartTheme()
  const chartOption = useMemo(() => option(theme), [option, theme])
  return <ChartBox option={chartOption} loading={loading} height={height} note={note} />
}

export function GoldReportSupplements({ loading }: { loading: boolean }) {
  return <>
    <Panel id="rmb-log" title="人民币金价走势（对数）" subtitle="视频黄金看板「历史洞察」中的人民币计价长序列。" corner="补绘 · mock">
      <MockChart option={goldRmbOption} loading={loading} note="终点 ¥931.84/克取自视频；此前路径为确定性 mock，不代表历史行情。" />
    </Panel>
    {['美元与流动性', '通胀与增长'].map((title, i) => <Panel key={title} id={i ? 'inflation' : 'liquidity'} title={title} corner="数据未接通">
      <p className="rounded-card border border-dashed border-border p-4 text-[11px] text-muted">视频中该分区标记为数据源尚未接通；没有可辨认的序列，保留缺数据状态，不用 mock 冒充已取数。</p>
    </Panel>)}
  </>
}

export function UsEquityReportSupplements({ loading }: { loading: boolean }) {
  return <>
    <Panel id="us-monthly" title="标普500 月度涨跌矩阵" subtitle="报告第 3 章画面出现的「年份 × 月份」回报结构。" corner="补绘 · mock">
      <MockChart option={usMonthlyOption} loading={loading} height={370} note="格内涨跌幅均为确定性 mock；红涨绿跌，不作为历史回报使用。" />
    </Panel>
    <Panel id="us-eps" title="标普500 每股收益走势" subtitle="与价格走势分开看盈利增长，避免把估值扩张误读为利润增长。" corner="补绘 · mock">
      <MockChart option={usEpsOption} loading={loading} note="逐年 EPS 路径为确定性 mock；视频只确认了该图表标题，未提供完整序列。" />
    </Panel>
  </>
}

export function CnBondReportSupplements({ loading }: { loading: boolean }) {
  return <Panel id="rrr" title="存款准备金率政策" subtitle="报告第 4 章政策与流动性分区的准备金率历史轨迹。" corner="补绘 · mock">
    <MockChart option={cnRrrOption} loading={loading} note="大型金融机构准备金率的演示形状；逐次调整值未由视频完整读出。" />
  </Panel>
}

export function UsTreasuryReportSupplements({ loading }: { loading: boolean }) {
  return <>
    <Panel id="topology" title="美债所处的拓扑结构" subtitle="财政融资、货币政策传导、银行与私人部门、海外持有者的关系示意。" corner="补绘 · 结构图">
      <MockChart option={usTopologyOption} loading={loading} height={310} note="节点与连线只表达视频中的部门关系，不表达资金流向或金额。" />
    </Panel>
    <Panel id="issuance" title="美债发行量激增" subtitle="报告第 5 章债务分区中，发行量与再融资压力的面板。" corner="补绘 · mock">
      <MockChart option={usIssuanceOption} loading={loading} note="年度发行量均为确定性 mock；视频未提供可复原的完整序列。" />
    </Panel>
  </>
}

export function AShareReportSupplements({ loading }: { loading: boolean }) {
  return <>
    <Panel id="monthly-matrix" title="月度涨跌矩阵" subtitle="补齐报告第 6 章的年份 × 月份热力图。" corner="补绘 · mock">
      <MockChart option={aMonthlyOption} loading={loading} height={310} note="格内数值为确定性 mock，独立于上方有报告读数锚点的月度统计表。" />
    </Panel>
    <Panel id="rolling-5y" title="滚动5年收益" subtitle="同一资产不同买入时间的五年年化回报路径。" corner="补绘 · mock">
      <MockChart option={aRollingOption} loading={loading} note="整条路径为确定性 mock，不是上证综指真实滚动收益。" />
    </Panel>
    <Panel id="annual-risk" title="年内最大回撤 vs 全年涨幅" subtitle="年度收官收益与年内持有风险并列看，避免只看最终回报。" corner="补绘 · mock">
      <MockChart option={aAnnualDrawdownOption} loading={loading} note="年度回报沿用本页原 mock；年内最大回撤为新增确定性 mock。" />
    </Panel>
    <Panel id="pe-trend" title="市盈率（PE）走势" subtitle="报告第 6 章估值分区的历史序列，终点对齐沪深300 当前 PE 13.62。" corner="补绘 · mock">
      <MockChart option={aPeOption} loading={loading} note="终点读数来自报告；此前 PE 路径为确定性 mock。" />
    </Panel>
    <Panel id="financing-net" title="融资净买入" subtitle="配合现有两融余额折线，补齐报告中的流量柱状视角。" corner="补绘 · mock">
      <MockChart option={aFinancingNetOption} loading={loading} note="年度融资净买入柱为确定性 mock，不可与两融余额数值直接相减核算。" />
    </Panel>
    <Panel id="turnover" title="全市场成交额走势" subtitle="报告第 6 章资金与杠杆分区的量能序列。" corner="补绘 · mock">
      <MockChart option={aTurnoverOption} loading={loading} note="终点 15,982.97 亿元来自报告；此前成交额路径为确定性 mock。" />
    </Panel>
  </>
}

export function LongTermReportSupplements({ loading }: { loading: boolean }) {
  return <>
    <Panel id="gold-real" title="黄金实际价格（1967 年美元）" subtitle="报告第 7 章 LBMA 黄金长序列模块的对数轴展示。" corner="补绘 · mock">
      <MockChart option={laGoldRealOption} loading={loading} note="实际价格曲线是示意 mock，未使用 CPI 扣减计算；不能解读为真实实际金价。" />
    </Panel>
    <Panel id="us-curve" title="美国国债年末收益率曲线族" subtitle="报告第 7 章「图2」：按期限并排比较不同年末的曲线形态。" corner="1990 / 2000 / 2005">
      <MockChart option={laUsCurveOption} loading={loading} note="1990、2000、2005 年各期限点取自报告表1；2005 年 30Y 未读出，保留缺口。" />
    </Panel>
  </>
}

export function DailyReportSupplements({ loading }: { loading: boolean }) {
  return <>
    <Panel id="breadth-volume" title="市场宽度与量能" subtitle="报告第 9 章的涨跌家数分布与昨日/今日成交额对比。" corner="盘后 · 报告读数">
      <div className="grid gap-3 md:grid-cols-2">
        <MockChart option={dailyBreadthOption} loading={loading} note="上涨 1774 / 下跌 3366 / 平盘 87 家，取自报告。" />
        <MockChart option={dailyVolumeOption} loading={loading} note="昨日 21354 亿、今日 17650 亿；昨日值由报告「较昨日 -3704 亿」推得。" />
      </div>
    </Panel>
    <Panel id="sector-flow" title="板块主力资金流向" subtitle="报告第 9 章的净流入/流出横向排行。" corner="报告抽样 · 10 板块">
      <MockChart option={dailySectorFlowOption} loading={loading} height={310} note="取自本页领涨榜可读的板块净流入数据，按绝对值选 10 项；并非报告所述完整 TOP12 双榜。" />
    </Panel>
    <Panel id="sentiment-rates" title="技术指标快照 · 情绪温度计" subtitle="封板率、连板晋级率、炸板率三个比率并排对照。" corner="盘后 · 报告读数">
      <MockChart option={dailySentimentOption} loading={loading} height={180} note="封板率 66.2%、晋级率 48.9%、炸板率 33.8%；视频 OCR 的另一处晋级率约 48.0%，此处采用报告明细读数 48.9%。" />
    </Panel>
    <Panel id="southbound-trend" title="南向净买额趋势" subtitle="报告第 9 章南向资金分区的时间序列视图。" corner="补绘 · mock">
      <MockChart option={dailySouthboundOption} loading={loading} note="末日 +34.48 亿来自报告；此前逐日数据均为确定性 mock。" />
    </Panel>
  </>
}
