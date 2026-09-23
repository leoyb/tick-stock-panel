# TickFlow 综合增强项目规划

## 1. 文档定位

- **文档状态**：方案规划，尚未代表功能已经实现。
- **基座项目**：`/Users/leo/PycharmProjects/tickflow-stock-panel`
- **规划日期**：2026-08-31
- **目标**：在不破坏 TickFlow 现有数据、策略、回测和多市场能力的前提下，分阶段引入趋势分析、期权分析、统一数据源管理和更强的 AI 单资产分析。
- **明确原则**：复用能力，不整体复制项目；先建立 TickFlow 内部契约，再接入外部算法或 Agent。

本规划基于以下本地项目的当前代码和文档进行拆分：

| 项目 | 本规划中的定位 |
| --- | --- |
| `trendtool` | 趋势信号、缠论、量价分析的算法参考/迁移来源 |
| `Vibe-Trading` | Options Lab 和数据源优先级管理的参考来源 |
| `finn-agent` | Agent runtime、Skill、SSE 和运行状态的参考来源 |
| `Vibe-Research` | 单资产深度研究、证据链和研究报告的参考来源 |
| `tickflow-stock-panel` | 产品主仓库、数据/指标/回测/前端主骨架 |

## 2. 产品目标与非目标

### 2.1 产品目标

最终形成一个以 K 线和量化分析为入口的多市场研究工作台：

1. 一套统一行情数据、指标和数据源管理体系。
2. K 线中同时展示传统指标、趋势信号、缠论结构和量价结论。
3. 右侧面板解释“当前出现了什么信号、依据是什么、风险是什么”。
4. 支持 Options Lab 的期权链、组合收益、情景分析和 Greeks。
5. AI 能够基于同一份结构化行情和研究证据完成单资产深度分析。
6. 所有分析结果可追溯到数据源、时间窗口、算法版本和模型运行状态。

### 2.2 非目标

第一阶段不做以下内容：

- 不复制 `trendtool` 的独立 HTTP 服务、静态 HTML 和数据抓取器。
- 不把 Vibe-Trading 的券商连接、自动下单、复制交易整体带入 TickFlow。
- 不在 K 线请求链路中直接调用 LLM。
- 不建设一套与 TickFlow 并行的行情缓存、代码格式或复权口径。
- 不把“买入/卖出信号”包装成自动交易指令；结果定位为研究信号。

## 3. 当前基线与关键判断

### 3.1 TickFlow 已具备的基础

TickFlow 已有完整的主数据流：

```text
Provider / 数据插件
  -> 同步、标准化和校验
  -> DataStore / KlineRepository / Parquet
  -> enriched 指标流水线
  -> 策略 / 监控 / 回测 / 分析服务
  -> FastAPI / SSE
  -> React + TanStack Query + ECharts
```

主要实现位置：

- Provider 契约：`backend/app/data_providers/`
- 指标流水线：`backend/app/indicators/pipeline.py`
- K 线 API：`backend/app/api/kline.py`
- 日 K 页面：`frontend/src/components/StockDailyKChart.tsx`
- K 线绘图：`frontend/src/components/EChartsCandlestick.tsx`
- 策略和信号：`backend/app/strategy/`
- 回测：`backend/app/backtest/`
- 数据源配置页面：`frontend/src/pages/settings/DataSources.tsx`、`DataSourceEditor.tsx`

### 3.2 需要提前解决的事实

TickFlow 当前 Provider 契约主要覆盖 `instruments`、`daily`、`adj_factor`、`minute`、`realtime`、`financial`。趋势量价分析还可能需要：

- `fund_flow`：资金流向和超大单等数据。
- `market_breadth`：上涨/下跌家数、市场宽度等数据。
- `index_daily`：用于相对指数、偏离度和市场环境判断。
- 更明确的成交量单位和数据来源 provenance。

这些能力应先定义为可选标准数据集，再让 Provider 实现；禁止让算法模块直接访问腾讯、东方财富或其他供应商接口。

### 3.3 不应忽略的授权问题

`trendtool` 当前目录未发现明确的开源 LICENSE，且存在 `license_core.py`、`data/license.dat` 和启动授权流程；其文档还描述了受保护算法的分析/重构过程。因此：

- 在版权和再分发许可未确认前，只能作为本地研究参考。
- 不直接复制 `trendtool` 的启动器、授权文件、数据抓取器或静态页面。
- 若获得明确授权，也应将算法重写成 TickFlow 内部模块，并保留来源和版本记录。

## 4. 总体架构

```text
                    ┌────────────────────────────┐
                    │ React 工作台                 │
                    │ K线 / Options Lab / AI报告  │
                    └──────────────┬─────────────┘
                                   │ API / SSE
                    ┌──────────────▼─────────────┐
                    │ TickFlow 应用服务层          │
                    │ Kline / Trend / Options     │
                    │ Research / Source Settings  │
                    └───────┬───────────┬────────┘
                            │           │
             ┌──────────────▼───┐   ┌──▼────────────────┐
             │ 统一领域数据层    │   │ 异步 Agent/研究层  │
             │ Provider          │   │ Finn runtime       │
             │ Normalizer        │   │ Vibe-Research      │
             │ Repository        │   │ Report/Evidence    │
             └──────────────┬───┘   └───────────────────┘
                            │
             ┌──────────────▼─────────────────────────┐
             │ 日线 / 分钟线 / 实时 / 资金流 / 期权链 │
             └────────────────────────────────────────┘
```

### 4.1 分层原则

- **数据层**只负责来源、标准化、缓存和 provenance。
- **分析层**只接收标准化数据，不感知供应商。
- **展示层**只消费结构化结果，不在组件中重算指标。
- **Agent 层**通过只读数据工具获取数据，不能绕过 Provider 直接读文件或请求外部数据源。
- **研究报告**记录输入快照、证据、计算结果、限制和运行状态。

## 5. 第一阶段：量化与期权工作台增强

### 5.1 第一阶段目标

交付一个可以从个股 K 线直接进入的增强分析体验：

1. K 线叠加趋势买卖点、趋势线、关键价位和缠论结构。
2. 右侧面板展示信号分级、触发条件、时间、数据依据和风险提示。
3. 增加 Options Lab，复用 Vibe-Trading 已验证的期权数学能力。
4. 统一数据源配置、能力声明和每个市场的 fallback 优先级。

### 5.2 方向 A：trendtool 能力迁移

#### A1. 算法适配边界

建议新增 TickFlow 原生的趋势分析模块，例如：

```text
backend/app/analysis/trend/
  contracts.py       # 输入、输出、版本和状态
  indicators.py      # 只放经过验证的计算
  signals.py         # 趋势/量价/突破信号
  chanlun.py         # 缠论结构
  adapter.py         # TickFlow 数据 -> 分析输入
```

第一版只迁移经过授权和测试确认的算法：

- 趋势方向与趋势阶段。
- 高低点、趋势线和突破/跌破。
- 缠论的分型、笔、线段、中枢等结构化结果。
- 量价配合、放量/缩量、价量背离等结论。
- 买卖点或观察点，但必须带 `signal_type`、`confidence`、`reason_codes` 和 `as_of`。

#### A2. 输入契约

分析器输入应来自 TickFlow 的标准 K 线和可选上下文：

```text
TrendAnalysisInput
  symbol
  market
  interval
  bars[]: date, open, high, low, close, volume, amount
  price_basis: adjusted | raw
  index_bars[]: optional
  fund_flow[]: optional
  market_breadth: optional
  source_provenance[]
```

必须明确：

- 技术指标默认使用前复权价格。
- 涨跌停和交易规则判断使用原始价及交易日规则。
- `volume`、`amount`、`turnover_rate` 的单位沿用 TickFlow 契约，不采用 trendtool 的隐式转换。
- 分钟数据不足时返回 `degraded`，不能用日线静默替代。

#### A3. 输出契约

```text
TrendAnalysisResult
  status: ok | degraded | not_available | error
  algorithm_version
  data_as_of
  signals[]
  overlays[]
  structures[]
  summary
  limitations[]
  provenance[]
```

其中：

- `signals[]` 用于右侧面板和监控。
- `overlays[]` 用于 K 线标记、线段、区间和价格线。
- `structures[]` 用于缠论节点、笔、线段、中枢等可解释对象。
- `status` 用于区分数据不足、算法失败和正常无信号。

#### A4. API 与前端

建议新增独立接口，而不是污染现有 `/api/kline` 返回结构：

```text
GET /api/analysis/trend/{symbol}
  ?market=cn&interval=1d&start=...&end=...
```

前端先复用 `EChartsCandlestick` 已有的 markers、markLine、markArea 能力。右侧信号面板可以作为个股分析页面的正式布局能力；当前 `stock-preview.footer` 只适合底部附加内容，不能硬塞成右侧面板。若要在日 K 主页面长期支持右侧面板，应对核心布局做一次聚焦的 L3 修改，并补充响应式和异常隔离测试。

#### A5. 第一阶段 A 的验收

- 同一输入 K 线重复计算结果稳定。
- 无资金流或市场宽度数据时，趋势/缠论基础结果仍可用，依赖项显示 `degraded`。
- 算法不直接发起外部 HTTP 请求。
- 复权价、原始价、成交量单位和交易日窗口测试通过。
- K 线标记与信号列表使用同一份 API 结果，不出现口径分叉。
- 信号可定位到触发日期、窗口和算法版本。
- 不会把未来 K 线用于历史信号计算，回测与实时模式均通过未来函数测试。

### 5.3 方向 B：Vibe-Trading Options Lab

Vibe-Trading 当前 Options Lab 的可复用能力包括：

- 期权链展示。
- 多腿到期收益图。
- Spot × IV 情景矩阵。
- 组合 Greeks。
- 期权定价和 payoff 计算。
- 已有测试覆盖的 options/quantlib 计算模块。

建议采用“数学内核适配 + TickFlow 页面重做”的方式：

1. 先确认 Vibe-Trading 相关代码和依赖的许可证。
2. 将经过确认的纯计算能力封装成 TickFlow 内部只读服务。
3. 期权链通过 TickFlow Provider 新增 `options_chain` 可选数据集接入。
4. 期权链数据与 payoff/Greeks 计算分离，避免把缺失行情伪装成计算结果。
5. 前端新增独立 `OptionsLab` 页面，不把期权逻辑塞进 K 线组件。

建议的最小领域契约：

```text
OptionChain
  underlying
  expiry
  strike
  option_type: call | put
  bid / ask / last
  implied_volatility
  volume / open_interest
  quote_time
  source_provenance

OptionLeg
  option_id
  side: buy | sell
  quantity
  entry_price
  implied_volatility: optional

OptionsAnalysisResult
  payoff_curve
  breakevens
  greeks
  scenario_matrix
  status
  limitations
```

第一阶段不接入下单，不做实盘组合同步，不把券商账户作为 Options Lab 的前置依赖。

### 5.4 方向 C：数据源统一管理和优先级调整

Vibe-Trading 的可借鉴点是：按市场展示已注册数据源，允许只调整 fallback 顺序，保存到市场级配置，并拒绝随意新增/删除来源。

TickFlow 的实现建议：

```text
DataSourceRegistry
  source_id
  display_name
  markets[]
  datasets[]
  default_priority
  health
  config_schema

DataSourcePolicy
  market
  dataset
  ordered_source_ids[]
  updated_at
  version
```

规则：

- 只允许调整已注册且支持该市场/数据集的来源顺序。
- 无用户覆盖时继续使用默认顺序。
- 不能把没有能力的 Provider 排在前面。
- 变更需校验并持久化，失败时保持旧配置。
- 每次实际命中的来源、单位、复权方式和时间戳进入 provenance。
- 单个来源故障只影响该来源，不得导致其他来源和应用启动失败。

建议优先覆盖 `daily`、`minute`、`realtime`、`options_chain`；`fund_flow` 和 `market_breadth` 作为第二批数据集。

## 6. 第二阶段：AI Agent 与单资产深度分析

### 6.1 第二阶段目标

用户从 K 线或信号面板点击“深度分析”后，系统能够：

1. 锁定资产身份、市场、时间范围和数据快照。
2. 按计划调用行情、财务、新闻和趋势分析工具。
3. 流式展示运行阶段和可恢复状态。
4. 生成结构化单资产报告，并保留证据、计算和限制。
5. 在数据不足或工具失败时明确降级，不生成看似完整的虚假结论。

### 6.2 Finn-agent runtime 能力迁移

Finn-agent 适合作为运行时设计参考，而不是整体复制。建议只抽取以下边界：

- Skill 注册和版本化。
- Agent 选择、计划和 deadline。
- 工具白名单与只读权限。
- typed runtime result。
- SSE 事件顺序和运行状态。
- RunStore、取消、恢复和错误诊断。
- 报告适配器与前端渲染边界。

建议在 TickFlow 中形成最小 runtime contract：

```text
AnalysisRun
  run_id
  symbol / market
  analysis_type
  status: queued | running | completed | degraded | failed | cancelled
  started_at / finished_at
  plan_version
  events[]
  report_id: optional
  diagnostics[]
```

Agent 不得直接操作：

- Provider 私有客户端。
- 交易执行接口。
- 任意文件路径。
- 未注册的网络工具。
- TickFlow 内部数据库写操作。

第一版应先支持一个固定的“单资产深度分析”流程，不先建设通用多 Agent 编排平台。

### 6.3 Vibe-Research 单资产深度分析

建议借鉴 Vibe-Research 的研究产物和证据链，而不是复制其桌面/编排运行时。报告最小结构：

```text
asset-report/
  report.md
  manifest.json
  evidence.json
  calculations.json
  conflicts.json
```

报告至少包含：

- 资产身份和查询时间。
- 行情与趋势分析摘要。
- 缠论/量价分析结果。
- 财务与估值结果（若数据可用）。
- 新闻/事件证据（若数据可用）。
- 风险、冲突证据和未覆盖项。
- 数据源、时间范围、算法版本、模型和提示词版本。

报告状态必须区分：

- `completed`：必要证据和计算完整。
- `degraded`：部分数据源或模块失败，但仍有明确可用范围。
- `not_runnable`：缺少关键输入，不能生成完整结论。
- `failed`：运行过程失败且没有可靠结果。

### 6.4 第二阶段验收

- Agent 只能通过注册工具读取统一数据层。
- SSE 事件顺序、终态和 RunStore 记录一致。
- 刷新页面可以恢复已完成或中断的运行状态。
- 报告中的价格、指标和结论均能追溯到证据或计算结果。
- 工具失败不会被包装成成功；缺少数据不会自动填零或编造。
- 同一资产、同一时间窗口、同一数据快照能够复现同一确定性计算部分。
- LLM 只负责解释和综合，技术指标、期权 Greeks、回测指标由确定性代码计算。

## 7. 依赖关系与里程碑

```text
M0 基线和契约冻结
  ↓
M1 趋势分析核心 + K线叠加 + 右侧信号面板
  ↓
M2 Options Lab 数学内核 + 期权链
  ↓
M3 数据源统一管理 + 市场级优先级
  ↓
M4 Agent runtime 最小闭环
  ↓
M5 单资产深度分析 + 证据报告
```

### M0：基线和契约冻结

- 固定 TickFlow 基线 commit/tag。
- 记录四个来源项目的 commit/tag、许可证和可迁移文件清单。
- 冻结 OHLCV、复权、成交量、日期、市场和 provenance 契约。
- 建立跨项目代码不得直接依赖的检查规则。

### M1：趋势分析 MVP

- 趋势分析输入/输出类型。
- 日线算法适配。
- K 线标记、趋势线、区间。
- 右侧信号面板。
- 正常、数据不足、算法失败和未来函数测试。

### M2：Options Lab MVP

- 期权计算内核适配。
- 期权链 Provider 契约。
- payoff、breakeven、Greeks、情景矩阵。
- 独立页面和最小数据缺失提示。

### M3：数据源控制面

- Provider registry 与能力矩阵。
- 市场/数据集级优先级配置。
- 设置页排序交互。
- 实际命中来源和健康状态展示。

### M4：Agent runtime MVP

- 单一分析流程。
- 工具注册和只读权限。
- RunStore + SSE。
- 取消、超时、失败和恢复。

### M5：单资产深度分析

- 技术、趋势、基本面、新闻和风险模块编排。
- 证据清单和计算清单。
- Markdown/JSON 报告产物。
- 从 K 线页进入分析、查看历史报告。

## 8. 粗略工作量

以下是单人熟悉代码后的工程估算，不包含等待外部数据源授权、供应商开通和大规模数据重算：

| 交付项 | 估算 |
| --- | ---: |
| M0 契约、来源清单和测试骨架 | 2–4 人日 |
| M1 趋势/缠论/量价 + K 线/右侧面板 | 8–15 人日 |
| M2 Options Lab | 8–15 人日 |
| M3 数据源统一与优先级 | 5–10 人日 |
| M4 Agent runtime MVP | 8–15 人日 |
| M5 单资产深度分析与报告 | 10–20 人日 |
| 联调、回归、文档和发布 | 5–10 人日 |

建议第一阶段控制在 **23–44 人日**，第二阶段控制在 **23–45 人日**。如果直接整体复制 Vibe-Trading/Finn-agent 的运行时，工作量和升级冲突会显著增加，不建议采用。

## 9. 质量、数据和安全门禁

### 9.1 数据正确性

- 明确 adjusted/raw price 的使用边界。
- 明确成交量、成交额和换手率单位。
- 明确交易日、时区和分钟线归属。
- 每条分析结果记录 `as_of` 和 provenance。
- Provider fallback 不得改变字段语义。

### 9.2 算法正确性

- 使用固定 fixture 与独立参考实现比对。
- 缠论边界案例单独测试：缺口、同高同低、停牌、数据不足。
- 趋势信号验证历史窗口，禁止未来函数。
- Options Lab 验证 put-call parity、到期收益、零波动和非有限输入。

### 9.3 Agent 正确性

- 测试工具白名单和未授权工具拒绝。
- 测试工具错误、超时、取消和重启恢复。
- 测试空证据、冲突证据和部分完成报告。
- 报告不得将 `degraded` 或 `not_runnable` 伪装成完成。

### 9.4 工程验证

每个里程碑至少执行：

```bash
cd /Users/leo/PycharmProjects/tickflow-stock-panel/backend
uv run --frozen pytest -q
uv run --frozen ruff check app tests

cd /Users/leo/PycharmProjects/tickflow-stock-panel/frontend
pnpm build

cd /Users/leo/PycharmProjects/tickflow-stock-panel
git diff --check
git status --short --branch
```

实时 LLM、真实 Provider 和浏览器流程要单独标记为 live 验证，不能用静态测试或“页面能打开”替代。

## 10. 版本、分支和合并策略

1. 在 TickFlow 中建立独立功能分支，按 M0–M5 分阶段提交。
2. 每个来源项目记录不可变 commit/tag，不跟踪其开发分支头部。
3. 算法、Options Lab、数据源设置、Agent runtime 分开提交，避免形成不可回滚的大合并。
4. 新增数据集或公共 API 时同步更新前端类型、文档和契约测试。
5. 任何直接修改核心 K 线布局、Provider 契约或运行时主链的改动，都标记为 L3 并增加升级复核记录。
6. 不覆盖当前工作区已有修改；当前已知未跟踪文件包括 `frontend/pnpm-workspace.yaml`，本规划不处理它。

## 11. 首批建议任务清单

### P0：先做，不写业务功能

- [ ] 确认 `trendtool` 算法授权和可再分发范围。
- [ ] 确认 Vibe-Trading Options Lab 纯计算模块及其依赖许可证。
- [ ] 为四个来源项目记录 commit/tag 和来源文件清单。
- [ ] 建立统一数据集、单位、复权和 provenance 表。
- [ ] 建立趋势分析 fixture 和参考结果。

### P1：第一阶段 MVP

- [ ] 新增趋势分析输入/输出契约。
- [ ] 适配 TickFlow 日线数据到趋势分析器。
- [ ] 新增趋势分析 API。
- [ ] 在 K 线上渲染 markers、趋势线和中枢区间。
- [ ] 新增右侧信号面板。
- [ ] 新增 Options Lab 计算服务和页面骨架。
- [ ] 扩展 `options_chain` Provider 能力。
- [ ] 新增数据源能力矩阵和优先级配置。

### P2：第二阶段 MVP

- [ ] 建立只读 Agent runtime contract。
- [ ] 接入单资产分析工具集。
- [ ] 建立 SSE/RunStore 运行闭环。
- [ ] 建立 evidence/calculation/report 产物。
- [ ] 从 K 线信号面板启动单资产深度分析。
- [ ] 完成失败、降级、恢复和权限测试。

## 12. 最终决策

本项目采用以下组合策略：

> **TickFlow 做产品和数据骨架；trendtool 提供经过授权和验证的趋势分析能力；Vibe-Trading 提供 Options Lab 和数据源优先级设计参考；finn-agent 提供受控 Agent runtime 参考；Vibe-Research 提供单资产研究和证据报告模型。**

第一阶段优先交付“看得懂、算得准、来源可追踪”的 K 线增强和期权分析；第二阶段再接入 Agent。这样可以把确定性数据/算法和不确定性的 LLM 解耦，降低上线风险，也保留后续合并上游和替换数据源的空间。
