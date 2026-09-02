# cockpit-ui 深度复盘评估 — 9 大目标达成度 + 改进计划

> 评估日期：2026-09-02 | 分支 main | 三份 Explore 报告 + lead 自查
> 覆盖 Phase 1/2/3 全部已合并 PR（#23/#24/#111）

## Context

用户经 /grill-me 提出 cockpit-ui 第二轮全景式重构与升级，9 大目标。Phase 1/2/3 已全部完成并合并（PR #23/#24/#111），E2E 38/38 通过。现需深度复盘：哪些目标达成？哪些仍需推进？

---

## 9 大目标达成度评估

### 目标1: 架构清晰，边界聚焦 — **达成 85%**

| 维度 | 状态 | 证据 |
|---|---|---|
| IA 功能域重组 | ✅ | 51→~42 路由，7 功能域，routes.tsx 单一 SSOT |
| 路由元数据三源合一 | ✅ | cockpitPageRegistry + cockpitNavigation 派生自 ROUTES |
| hooks 按域拆分 | ✅ | 2703 行→11 文件（system/tasks/kems/research/knowledge/governance/observability/workbench/gbrain/swarm + index） |
| 巨型 View 拆分 | ✅ | DomainAppsView 1767→14 / ProtocolWorkbench 1132→8 / ResearchHub 1057→6 |
| 新页面组件分解 | ✅ | 6 个能力域各 3-5 个子组件，<300 行/文件 |
| **不足** | ⚠️ | charts/ 通用组件未被 Phase 2 页面复用（重复建设） |

### 目标2: 风格统一收敛 — **达成 60%** ⚠️

| 维度 | 状态 | 证据 |
|---|---|---|
| Tailwind v4 基建 | ✅ | theme.css @theme token SSOT，build 前置 tsc |
| 旧 CSS 变量重映射 | ✅ | index.css 中 `--antd-*` → `var(--color-*)` |
| 新页面使用 Tailwind | ✅ | commands/chain/agents 用 `bg-surface-1` 等 token |
| **CSS 双系统混用** | ❌ | AuditDashboard 整体用 `var(--antd-error)`/`antd-card`/`antd-btn`（45 处），其他 5 页用 `var(--color-*)` |
| **布局容器不统一** | ❌ | CommandExplorer `max-w-[1400px] mx-auto px-6` vs ResidentMonitor `p-6 space-y-6` vs BcosDashboard `space-y-6` |
| Loading 不一致 | ⚠️ | CommandExplorer 用 SkeletonLines，BcosDashboard 用 animate-pulse，AuditDashboard 用 antd-card+SkeletonLines |

### 目标3: 交互友好，功能健全 — **达成 80%**

| 维度 | 状态 | 证据 |
|---|---|---|
| 新页面三态处理 | ✅ | 全部 6 页有 loading/error/empty |
| 降级兜底 | ✅ | ChainStudio 有 demo 链 fallback，resident/bcos/p74 有 degraded 态 |
| 搜索/过滤 | ✅ | CommandExplorer 搜索+分类折叠，AuditDashboard 低分 TOP-N |
| 子组件 .map 防御 | ❌ | Audit/DimensionBars/LowScoreTable/ScorecardDetail、bcos/SignalFlow、p74/WarnList 直接 `.map()` 无 `?.`/`?? []` |

### 目标4: 对标业内提升 UI — **达成 65%** ⚠️

| 维度 | Linear/Vercel | Cockpit 现状 | 差距 |
|---|---|---|---|
| 设计令牌 | 单一系统 | **两套变量并行** | 显著 |
| 间距系统 | 8px 基准网格 | Tailwind 间距 + 硬编码混用 | 中等 |
| 暗色层级 | 5-6 层 surface | 3 层 + 遗留变量 | 中等 |
| 图表 | 自研极简 | recharts 默认样式 | 中等 |
| 微交互 | 精细 hover/focus | 基本 transition 到位 | 较小 |

### 目标5: 抽象沉淀利扩展 — **达成 75%**

| 维度 | 状态 | 证据 |
|---|---|---|
| 共享 UI 组件 | ✅ | PageHeader/StatusBadge/LoadingSkeleton/EmptyState/DataTable 五件套 |
| hooks 按域拆分 | ✅ | 11 文件 + barrel re-export |
| 统一数据获取 | ✅ | apiFetch + useQuery 模式一致 |
| **不足** | ⚠️ | charts/ 通用封装未被复用；缺少共享 Layout 容器 |

### 目标6: 功能可用有价值 — **达成 80%**

| 维度 | 状态 | 证据 |
|---|---|---|
| 后端端点齐全 | ✅ | 6 个反射端点，11 tests passed |
| 前端调用正确 | ✅ | apiFetch 模式统一，降级处理完备 |
| 能力覆盖 | 🟡 | 6 域页面全建，但 CapabilityExplorer 工作流/技能仍为 **mock 数据**（9 处"接入中"） |

### 目标7: 功能引导易用性 — **达成 70%**

| 维度 | 状态 | 证据 |
|---|---|---|
| 场景引导 | ✅ | ChainStudio 4 条 demo 链 + 场景说明卡（优秀）；CommandExplorer guide_sections+scenarios |
| EmptyState 统一 | ✅ | 6 页全部使用共享 EmptyState |
| 路由元数据 | ✅ | purpose/whenToUse 全量补齐 51 路由 |
| **CommandPalette 偏弱** | ❌ | 仅做页面跳转（32 个匹配中无实际操作命令），未注册"创建任务/刷新数据"等操作 |

### 目标8: 覆盖所有功能聚合管理 — **达成 85%**

| 维度 | 状态 | 证据 |
|---|---|---|
| 6 大能力域 | ✅ | commands/chain/audit/agents/bcos/p74 全覆盖 |
| 能力全景 | 🟡 | MCP/BOS/CLI 真实数据，**工作流 19 + 技能 3 为 mock** |
| 路由重定向 | ✅ | 15 条旧路由→新路由映射 |

### 目标9: 测试验证验收 — **达成 65%** ⚠️

| 维度 | 状态 | 证据 |
|---|---|---|
| 新页面配套测试 | ✅ | 6 页各有测试（commands 6/chain 7/audit 16/bcos 6/p74 7/resident 测试） |
| E2E 入库 | ✅ | tests/e2e/pages-smoke.mjs，38/38 通过 |
| **24 个测试失败** | ❌ | SystemMapView 20 + HomePage 4 + Breadcrumb 3，失败率 8.3% |
| **api/hooks 零覆盖** | ❌ | 2810 行拆分后代码无测试 |
| **E2E 深度不足** | ⚠️ | 仅渲染冒烟，无交互/数据断言 |

---

## 优先级改进清单

| # | 改进项 | 对应目标 | 优先级 | 预估工作量 |
|---|--------|---------|--------|-----------|
| 1 | **AuditDashboard 迁移到 `--color-*` 变量**（消除双系统） | 目标2/4 | **P0** | 0.5d |
| 2 | **修复 24 个失败测试**（SystemMapView triage 回归 + HomePage truthfulness + Breadcrumb Router） | 目标9 | **P0** | 1d |
| 3 | **CapabilityExplorer 工作流/技能接入真实 API** | 目标6/8 | **P0** | 0.5d |
| 4 | **子组件 `.map()` 增加 `?.`/`?? []` 防御** | 目标3 | **P1** | 0.5d |
| 5 | **CommandPalette 升级为操作中枢**（注册实际操作命令） | 目标7 | **P1** | 1d |
| 6 | **统一布局容器**（PageLayout wrapper） | 目标2/4 | **P1** | 0.5d |
| 7 | **api/hooks 补充测试**（gbrain 1142 行 + swarm 417 行优先） | 目标9 | **P1** | 1.5d |
| 8 | **E2E 增加交互/数据断言** | 目标9 | **P2** | 1d |
| 9 | **charts/ 通用组件替代内联 recharts** | 目标5 | **P2** | 0.5d |
| 10 | **HomePage ThoughtStreamSection 移除 inline style** | 目标2 | **P2** | 0.5d |

---

## 执行建议

**第一批（P0，~2天）**：消除 CSS 双系统 + 修复失败测试 + 接入真实 API
- 这是提升项目质量最直接的三件事
- AuditDashboard 变量迁移后，跨页面视觉统一度从 60%→90%
- 测试失败修复后，通过率从 91.4%→100%

**第二批（P1，~3.5天）**：防御性编程 + CommandPalette 升级 + 布局统一 + hooks 测试
- 这些是长期可维护性的基础

**第三批（P2，~2天）**：E2E 深化 + charts 复用 + inline style 清理
- 锦上添花

## 验证方式

```bash
bun run typecheck        # 必须通过
bun run build            # 必须通过
bun run test:unit        # 目标 0 失败
bun run test:e2e         # 38/38 通过
bun run lint             # ruff 全过
```
