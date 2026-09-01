# cockpit-ui 第二轮全景式重构计划 — 架构收敛 + Tailwind v4 + 6 大能力域 + 全量验收

> 覆盖上一任务（cockpit CLI 升级，已完成合并 PR#110/#2902）。本计划为新任务。
> 状态：grilling 三轮访谈已完成，全部用户决策已定；Plan agent 细节设计进行中，本文件为已定稿骨架 + 可执行细节。

## Context

用户经 /grill-me 提出对 cockpit-ui（projects/cockpit-ui，独立仓 omostation-hermes-console）做第二轮全景式重构与升级，9 大目标：架构清晰边界聚焦 / 风格统一收敛 / 交互友好功能健全 / 对标业内提升 UI / 抽象沉淀利扩展 / 功能可用有价值 / 功能引导易用性 / 覆盖所有已有功能聚合管理 / 测试验证验收。

**已核实的现状问题**（三份 Explore 报告，2026-09-01）：

| 维度 | 问题 |
|---|---|
| IA | 51 路由 7 分组；「智能与知识」14 页臃肿、「工作台」9 页未消化；路由元数据**三处漂移**（routes.tsx 51 vs cockpitPageRegistry.ts 35 vs cockpitNavigation.ts TAB_TO_ROUTE mesh 路径不一致） |
| 运行时风险 | 全仓裸 `.map(` 201 处 + 裸 `.length` 197 处；上轮 9 个运行时错误只修了 3 个点，其余 398 处是同类错误温床；4 处轮询 interval cleanup 未专项核查 |
| API 层 | `src/api/fetch.ts` @deprecated 双轨未收口（timeout/abort 逻辑 5 处重复）；Guide/SystemMap 页仍裸 fetch；`hooks.ts` 2703 行 god-file |
| 巨型组件 | >300 行组件 20+：DomainAppsView 1767 / ProtocolWorkbench 1132 / ResearchHub 1057 等（上轮只拆了 3 个） |
| 样式 | 无 tailwind、每组件 raw CSS、**两套 token 并存**（index.css Cybertech `--antd-*` vs DESIGN.md `--bg-primary` 系）、魔法色值 200+ 处（单文件最多 58 处）、App.tsx 有硬编码 `bg-[#0a0a0f]` |
| 测试 | vitest ~17 文件覆盖不均（DomainAppsView 0 测试）；**零 E2E**（上轮 Puppeteer 一次性脚本未入库）；tsc --noEmit 不在任何 script |
| 依赖 | lucide-react ^1.17.0 版本异常、@types/react-router-dom v5 stub 与 v7 运行时错配、postcss 误入 dependencies |
| 能力 gap | CLI 升级为 **96 命令 / 18 分类**（实测 COMMAND_CATALOG）+ chain + 评分卡，UI **零反射面**：命令全景 / chain DAG / command-audit 看板 / 能力全景缺 CLI+workflows+skills 维度 / resident 监控 / BCOS+P74 |

**技术栈**：React 19 + TS ~6.0 + Vite 8 + bun；react-router-dom v7、@tanstack/react-query v5、zustand v5、recharts v3、reactflow v11。后端经 vite proxy `/api → localhost:8090`（cockpit 仓 dashboard_server + `src/cockpit/web/` 50+ api_*.py，~206 端点）。

## 用户决策（grilling 三轮确认）

| # | 决策点 | 选择 |
|---|--------|------|
| 1 | 范围策略 | **全量三阶段推进**（地基修复 → 能力覆盖 → 存量迁移+引导+验收），一个特性分支、每阶段一个 PR |
| 2 | IA 力度 | **功能域重组 ~42 路由**（对齐 CLI 18 分类 → 7 个功能域），合并瘦页面，三处元数据统一单一 SSOT |
| 3 | 能力覆盖 | **6 域全建**（含 cockpit 仓新增只读代理端点） |
| 4 | 风格对标 | **Linear 式克制深色**：降饱和降噪点，层级靠间距/字重/边框，数据色仅状态语义（绿ok/黄warn/红err），其余灰阶+单一主色 |
| 5 | 样式底座 | **Tailwind v4 全量迁移**，三阶段穿插（阶段1 基建+公共层；阶段2 新页直用；阶段3 存量 ~55 页全迁+删旧 CSS） |
| 6 | 验收标准 | **E2E Puppeteer 入库 + 四层验证**（全页冒烟+console error 捕获 / tsc 入 script / vitest 补齐 / PR 附验证清单） |
| 7 | 拆分深度 | **>500 行全拆**（hooks.ts + ~10 个巨型 View）；300-500 行"改到才拆" |
| 8 | 引导体系 | **四层**：registry 全量补齐+SSOT 统一 / CommandPalette 升级全局导航 / 新页内置场景引导 / EmptyState 统一模式 |
| 9 | 交付粒度 | **cockpit 仓后端端点 PR 先行** + cockpit-ui 每阶段 1 PR（共 3）；harness agent workflow 并行 worker（lead 预埋挂载点模式） |
| 10 | 阶段2 顺序 | **数据现成 4 个先行**（命令全景 96/18 /chain/评分卡/能力全景补全），后端依赖 3 个后行（resident/BCOS/P74） |

## 前置 PR（cockpit 仓，feat/web-reflection-endpoints）

6 个只读端点，新建 `src/cockpit/web/api_*.py`，注册方式对齐现有 web 层模式（执行时参照 dashboard_server.py 的注册点）。全部只读、带超时与错误包装、`--json` 输出。

| 端点 | 数据源 | 实现要点 |
|---|---|---|
| `GET /api/commands` | `commands/registry.py` COMMAND_CATALOG（200 条）+ `help_map.py` GROUPS/GUIDE_SECTIONS/SCENARIOS/BLURB_OVERRIDES | import 直读（进程内无 subprocess），响应 `{commands:[{name,summary,category,example,maturity,risk,delegated_target,chain_enabled}],groups,guide_sections,scenarios}` |
| `GET /api/chains` + `GET /api/chains/{id}` + `POST /api/chains/{id}/dry-run` | `cockpit/chain/spec.py` 搜索路径 + `runner.py` dry-run 展开逻辑 | import 复用（spec 解析/dry-run 是纯函数）；响应含 steps 展开后的 command/args/when |
| `GET /api/command-audit/summary` + `GET /api/command-audit/{cmd_path}` | `docs/command-audit/*.yaml`（325 卡）+ `commands/command_audit.py` 聚合逻辑 | import 复用 calc/report 函数；summary 返回 15 维均分+低分 TOP-N+覆盖率 |
| `GET /api/resident` | `omo resident status/roles`（agora tools_resident 即委派 omo，cockpit 直接委派更短） | subprocess + timeout 10s，失败返回 `{error, status:"unreachable"}` |
| `GET /api/bcos` | 北极星/信号/进化引擎（`bin/bc-os/north_star_meter_v2.py --json` 等，执行时验证具体 json flag） | 同上 subprocess 委派 |
| `GET /api/p74` | **无静态文件**（.p74_solidification 是运行时产物）——端点内直接 subprocess 调 `uv run python bin/agent-workflow.py compliance`（复用其解析函数） | 同上 timeout=30 + {available:false} 降级；warn 列表映射 UI |

测试：`src/cockpit/tests/test_web_reflection_endpoints.py`（该项目规则：测试必须 src/cockpit/tests/）。冒烟：起 server 后 curl 6 端点 200 + schema 断言。

## 阶段 1 · 地基（PR：`feat/foundation-ia-tailwind`）

### 1.1 P0 修复
- **数组防御统一模式**：新建 `src/api/selects.ts` 提供 `asArray<T>(d: unknown): T[]`（React Query select 包装统一用），机械替换 398 处裸访问中的数据边界点（接收 API 响应处 select 收窄）；组件内残余改 `?.` 链。验收：E2E 全页冒烟无 "Cannot read properties of undefined"。
- **API 收口**：删除 `src/api/fetch.ts`（**已核实为零引用死代码**，直接删）与 `MIGRATION_GUIDE.md`；裸 fetch 精确定位 `src/views/BrainChat.tsx` 3 处（/history /ask /context，行 46/83/237）——工作量比预估小，改 apiFetch 即可。
- **依赖修复**：lucide-react ^1.17.0 已验证为真实安装版本（**无需处理**）；删 `@types/react-router-dom`（v7 自带类型）；postcss 移 devDependencies（或删除若无用）。
- **轮询 cleanup**（已锁定 4 文件）：GBrainDashboard.tsx / ComputeView.tsx:171（动画） / LogViewerPage.tsx:102（5s） / PerformanceMonitorPage.tsx:75（10s）——逐个核查 useEffect return，缺则补。
- `.env.local` 确认 gitignore。

### 1.2 Tailwind v4 基建
- `bun add -D tailwindcss @tailwindcss/vite`；vite.config.ts 加 `@tailwindcss/vite` 插件。
- 新建 `src/styles/theme.css`（token 唯一 SSOT）：`@import "tailwindcss"; @theme { ... }`。**Linear 式克制深色 token**（初版色值，可微调）：
  ```css
  --color-surface-0: #0e0e12;  /* app 底 */
  --color-surface-1: #16161c;  /* panel */
  --color-surface-2: #1e1e26;  /* raised/card */
  --color-surface-3: #26262e;  /* overlay/悬浮 */
  --color-border-subtle: #26262e;
  --color-border-default: #33333d;
  --color-text-primary: #ececf1;
  --color-text-secondary: #a0a0ab;
  --color-text-tertiary: #6b6b76;
  --color-accent: #5e6ad2;     /* 唯一主色（靛蓝） */
  --color-status-ok: #4cb782; --color-status-warn: #f5a524; --color-status-error: #e5484d;
  --color-chart-1: #5e6ad2; --color-chart-2: #4cb782; --color-chart-3: #f5a524; --color-chart-4: #e5484d; --color-chart-5: #a0a0ab;
  ```
  使用即 `bg-surface-1` / `text-secondary` / `border-subtle` / `text-status-ok`。
- **过渡策略**：index.css 旧 `--antd-*` 变量保留（旧 CSS 还引用），阶段 3 全删；新代码禁用旧 token（lint/review 约定）。
- **迁移示范**：`src/components/ui/` 5 组件 + Dashboard 布局壳 + App.tsx（去 `bg-[#0a0a0f]`）迁 tailwind，作为后续 worker 的模式范本。

### 1.3 IA 重组（51 → ~40 路由，功能域 7 组）
- **单一 SSOT**：`src/routes.tsx` 的 ROUTES 条目扩展为唯一权威源（含 group/title/purpose/whenToUse/icon/order），`cockpitPageRegistry.ts` 与 `cockpitNavigation.ts` 改为从 ROUTES **派生**（删独立清单）；修 mesh 路径不一致。
- **新分组与映射**（合并候选，执行时逐条核对页面职责后微调）：
  | 新功能域 | 承接路由（保留+合并来源） |
  |---|---|
  | 总览与导航 (4) | `/` `/guide` `/system-map` `/capabilities` |
  | 运行与观测 (6) | `/overview` `/mesh` `/topology` `/compute` `/observability` `/logs` ←（workbench/infrastructure-ops、runtime-ops 并入或挂靠） |
  | 治理与合规 (7) | governance 治理工作台 ←（workbench/governance-domain、system-assurance 并入）、`/l4-health` `/debt` `/alerts` + 新 `/command-audit` + 新 `/governance-pulse`（P74）←（wave2/c2g 旧实验页降级合并） |
  | 知识与研究 (8) | `/research` `/knowledge` ←（knowledge-flow、external-resources 并入）、`/knowledge-action` `/engines` `/assets` `/kems` ←（protocol 并入 kems）、`/scene-cards` ←（pilot-review 并入）、`/decision-inbox` |
  | Agent 与链路 (6) | 新 `/commands` 新 `/chain` `/swarm` 新 `/agents`(resident) 新 `/bcos` `/brain` ←（gbrain-admin 并入 brain 子页） |
  | 开发工具 (5) | `/tasks` `/performance` `/sandbox` `/workflows` ←（workbench/ecos-workflow 并入）、domain-apps/quests/digital-brain/journeys 系（delivery-journey/outcomes/journeys/workflow-mesh-operations 归并为「交付与成果」1-2 页） |
  | 配置 (1) | `/settings` ←（workbench/memory-injector、kos、platform-control 等剩余 workbench 页归入对应域或工具组） |
- 被合并路由保留 redirect（react-router v7 `<Route path="old" element={<Navigate to="new"/>}>`），旧链接不断。
- registry 元数据（purpose/whenToUse）随合并全量补齐 ~40 页。

### 1.4 hooks.ts 拆分（2703 行 → 按域 ~12 文件）
`src/api/hooks/` 目录：system / tasks / kems / research / knowledge / governance / observability / workbench / gbrain / swarm / chains(新) / commands(新) 各一文件 + `index.ts` barrel re-export（全仓 import 路径不变，零调用方改动）。endpoints.ts 保持单文件（常量性质，不拆）。

### 1.5 巨型 View 拆分（>500 行全拆，~10 个）
按上轮 system-map/ 模式（index + 分区组件 + useData hook）：DomainAppsView(1767) / ProtocolWorkbenchView(1132) / ResearchHubView(1057) / ExternalResourceCatalogView / DeliveryJourneyView / PilotReviewView / OutcomesView / DigitalBrainWorkplaceView / KnowledgeHub 等。每页拆完配 vitest。

### 阶段 1 验收
`bun run lint && bun run test:unit && bun run build`（build 前置 tsc --noEmit，见 §验证）+ E2E 全页冒烟（此时已有 E2E，见下）+ 路由数 ~40 核对 + 合并页 redirect 抽查 + hooks.ts 行数 <300。

## 阶段 2 · 六大能力域页面（PR：`feat/capability-reflection`）

前置：cockpit 仓端点 PR 已合并。全部页面直接用 tailwind + `src/api/hooks/` 各自新建 hooks 文件（零共享冲突）。

| 页面 | 路由/分组 | 组件结构 | 数据源 | 核心交互 |
|---|---|---|---|---|
| ① 命令全景 | `/commands` Agent与链路 | `commands/CommandExplorer.tsx` + CommandCard + GuideSectionsPanel + ScenarioGallery | GET /api/commands | 搜索（名/摘要/类别）+ 12 分类折叠分组 + 命令卡（summary/example 复制/maturity/risk 徽标/delegated_target）+ GUIDE_SECTIONS 选型引导 + SCENARIOS 场景卡 |
| ② Chain 工作室 | `/chain` Agent与链路 | `chain/ChainStudio.tsx` + ChainList + ChainGraph(reactflow) + StepDetail + RunHistory | /api/chains* | 4 条 demo 链列表 → reactflow DAG（steps 节点、条件边、on_failure 标记）→ dry-run 展开模板变量（`{{params.*}}`/`{{steps.n.stdout}}`）→ 运行历史（data/chain-runs state.json）。内置引导：每条 demo 链的场景说明卡 |
| ③ 评分卡看板 | `/command-audit` 治理与合规 | `audit/AuditDashboard.tsx` + DimensionBars + LowScoreTable + ScorecardDetail(15维雷达) | /api/command-audit/* | 15 维均分条形图 + 覆盖率/P0 达标率卡 + 低分 TOP-N 表 → 单命令详情（雷达 + evidence/suggestion） |
| ④ 能力全景补全 | `/capabilities` 总览与导航 | 扩展现有 CapabilityExplorer.tsx | api_capability.py（扩展返回 cli_commands/workflows/skills） | 加 3 个 tab：CLI 200（链到 /commands 详情）、workflows 19、skills 3；四类总量卡 |
| ⑤ Resident 监控 | `/agents` Agent与链路 | `resident/ResidentMonitor.tsx` + RoleCards + EventStream | GET /api/resident | 五类角色（sediment/decision/execute/monitor/heartbeat）状态卡 + daemon/events/sediment/alert/ledger 五面板 + 事件流表；不可达时明确 degraded 态 |
| ⑥ BCOS + P74 | `/bcos` Agent与链路 + `/governance-pulse` 治理与合规 | `bcos/BcosDashboard.tsx`（北极星指标卡+信号路由流+进化四阶段管道）+ `p74/PulseView.tsx`（warn 列表+workflow 分类） | /api/bcos /api/p74 | 北极星趋势图（排除 self-data 说明）+ 信号→提案→评审→批准管道 + P74 沉默工作流清单与 30d/7d/1d 阈值 |

每页：EmptyState 引导文案（四层引导第 3 层）+ vitest 组件测试 + E2E 冒烟条目。

### 阶段 2 验收
后端 6 端点 curl 冒烟（含不可达降级）+ 6 页 E2E 交互冒烟（dry-run 按钮可点、tab 切换、搜索过滤）+ 新 hooks 测试。

## 阶段 3 · 存量迁移 + 引导 + 收尾（PR：`feat/tailwind-completion`）

- **存量 Tailwind 迁移**：~55 页按目录切 worker 批量迁移（每 worker 一个目录树，零冲突）；迁完即删对应 `.css` 文件；最后删 index.css 旧 `--antd-*` token 与旧组件 CSS。验收：`rg -n "#[0-9a-fA-F]{3,8}" src/ --glob '!*.css'` 零命中（CSS 中仅 theme.css 允许色值）。
- **CommandPalette 升级**：全局导航中枢——索引全部路由 + 新能力域动作（如"跳转 chain dry-run"）+ 最近使用（localStorage 已有基础）。
- **EmptyState 统一**：所有空/错/加载态走 ui/EmptyState + LoadingSkeleton（四层引导第 4 层收口）。
- **文档重写**：DESIGN.md 重写为现行架构（tailwind token 表、功能域地图、反射端点清单——按 cockpit-ui CLAUDE.md 规则**不复制后端接口数量/端口**，指向 SSOT）；docs/REDESIGN.md 归档标注历史；README 更新启动/测试命令。
- **分支清理**：29 个 remote-only 分支甄别（18 个未合并）→ 删除建议清单向用户确认后执行（需显式确认，git 红线）。
- **Closeout**（cockpit-ui CLAUDE.md）：`git status --short` + `uv run --with "pyyaml" python ../../bin/doc-ssot-lint.py --json`。

## 验证与验收（贯穿三阶段）

1. **E2E 入库**：`tests/e2e/`（puppeteer-core + 本地 Chrome 无头，复刻上轮一次性脚本模式）：`pages-smoke.mjs`（从 routes SSOT 派生页面矩阵 → 每页断言无 console error + 主容器渲染）+ `interactions.mjs`（关键交互：导航/搜索/tab/dry-run）。package.json 加 `"test:e2e"`；`tests/baseline-check.sh` 扩展为 install→tsc→unit→build→preview→e2e。
2. **类型检查**：`"build": "tsc --noEmit && vite build"`；`"test"` 脚本含 tsc。
3. **单测**：vitest 补齐（新组件 100% 配测；拆分的巨型 View 每个补核心渲染测试；目标：无 0 测试的 >300 行组件）。
4. **每阶段 PR 验证清单**：路由数核对 / E2E 通过截图 / lint+tsc+unit+build 四绿 / 上轮 9 个运行时错误模式回归确认。
5. **回归风险点**：阶段1 IA 合并页的 redirect 完整性；阶段2 后端不可达降级态；阶段3 删旧 CSS 后的视觉回归（E2E 截图对比抽查 10 页）。

## 执行编排（harness agent workflow，Team 并行）

- **lead（主会话）**：预埋共享文件挂载点（routes.tsx 新条目、hooks/index.ts re-export、api endpoints 常量），写 theme.css 与 ui/ 迁移范本，最后统一收口共享文件。
- **worker 切分**（零共享文件冲突）：
  - 阶段1：w-a 拆 hooks.ts → hooks/ 域文件；w-b DomainAppsView 拆分；w-c ProtocolWorkbench+ResearchHub 拆分；w-d P0 修复（fetch.ts 删/依赖/轮询/数组防御 select 层）；w-e 其余巨型 View 拆分；lead 做 tailwind 基建+IA SSOT 重构。
  - 阶段2：每 worker 一页（6 页天然并行）；cockpit 仓端点 PR 由 lead 直接做（跨仓协调敏感）。
  - 阶段3：按目录树切 worker 批量迁移 CSS；lead 做 CommandPalette/EmptyState/文档/分支清理。
- **PR 序**：cockpit 端点 PR → 阶段1 PR → 阶段2 PR → 阶段3 PR（每阶段独立可验收；阶段2 依赖端点 PR 合并）。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Tailwind 迁移量最大（60+ 组件） | 三阶段穿插 + ui/ 范本先行 + 阶段3 按目录 worker 批量 + rg 零魔法色值验收 |
| IA 合并误伤高频页 | 映射表执行时逐条核对页面职责；被合并路由全留 redirect；E2E 矩阵含旧路径 |
| 398 处数组防御机械替换引新错 | 只在 API 边界 select 收窄 + 组件内 `?.`，配 E2E console error 断言兜底 |
| 后端端点 subprocess 慢/挂 | 全部只读 + 10s timeout + 不可达降级态明确展示 |
| hooks 拆分动 import 面 | barrel re-export 保持全仓 import 路径不变 |
| cockpit 仓与 UI 仓节奏耦合 | 端点 PR 最小化先行，阶段2 数据现成 4 页不等后端也能先做骨架 |
