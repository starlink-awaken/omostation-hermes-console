# Cockpit UI 全面重构计划

## Context

cockpit-ui 是 eCOS v6 的 L3 统一 Web 入口，当前存在：17 个路由不可达、超大组件文件（SystemMapView 5638 行）、API 迁移未完成（20+ 组件仍用 raw fetch）、双 fetch 客户端、硬编码 API key、搜索/图标/面包屑等交互问题。

使用 **Team 编排** 并行推进重构，分为 6 个 Phase，每个 Phase 由专门的 executor agent 执行。

---

## Team 编排策略

### Phase 0: Foundation (安全 + 基础设施)

**Worker**: 1 executor
**文件**:
- `vite.config.ts` — 移除硬编码 API key → 环境变量
- `.env.local` — 创建（加入 .gitignore）
- `src/App.css` — 删除 Vite 模板残留
- `src/api/client.ts` — 统一为唯一 fetch 客户端
- `src/api/fetch.ts` — 标记废弃
- `src/index.css` — 补充 design tokens (spacing, z-index, animation)

**验证**: `bun run build` 通过

### Phase 1: 路由与信息架构

**Worker**: 1 executor
**文件**:
- `src/routes.tsx` — 添加 `hidden`/`parentId` 字段
- `src/components/Dashboard.tsx` — 补 17 个缺失 Route，修复 ICON_MAP
- `src/components/common/Breadcrumb.tsx` — 修复 hash → React Router

**验证**: 所有路由可访问

### Phase 2: API 迁移

**Worker**: 2 executors (并行)
**Worker-2a**: 迁移 raw fetch 组件
- `ComputeView.tsx`, `OverviewPage.tsx`, `TopologyView.tsx`
- `DomainAppsView.tsx`, home sections

**Worker-2b**: 补充缺失 hooks + 迁移 workbench
- `src/api/hooks.ts` — 添加缺失 hooks
- 9 个 *Workbench.tsx 组件

**验证**: 零 raw fetch() 调用

### Phase 3: 交互修复

**Worker**: 1 executor
**文件**:
- `src/components/Dashboard.tsx` — 搜索栏接入 CommandPalette
- `src/components/common/UserMenu.tsx` — 新建用户菜单组件
- `src/components/charts/` — 修复 tooltip 深色主题
- `src/store.ts` — 添加 user/notifications slice

**验证**: 搜索可用、图表可读、用户信息动态

### Phase 4: 组件分解

**Worker**: 2 executors (并行)
**Worker-4a**: 分解 SystemMapView.tsx (5638 行)
- 提取: SystemMapGraph, SystemMapFilters, SystemMapDetailPanel, SystemMapToolbar

**Worker-4b**: 分解 GBrain/Agents.tsx (28.1K) + CockpitGuideView.tsx (3065 行)
- 提取: AgentList, AgentDetail, AgentForm
- 提取: GuideSection, GuideTaskList, GuidePlaybook

**验证**: 无组件超 500 行

### Phase 5: 设计系统 + 测试

**Worker**: 1 executor
**文件**:
- CSS 架构整理
- 新建共享组件: PageHeader, DataTable, StatusBadge, LoadingSkeleton
- 补充单元测试

**验证**: `bun test` 通过

---

## 依赖图

```
Phase 0 (Foundation)
  ├── 安全: API key → env
  ├── 统一 fetch client
  └── Design tokens
        │
        ▼
Phase 1 (Routes) ←──→ Phase 3 (Interactions)  [可并行]
  ├── 17 路由修复          ├── 搜索/图标/面包屑
  └── ICON_MAP             └── 图表主题
        │                        │
        ▼                        ▼
Phase 2 (API Migration) ←─────────┘
  ├── 迁移 raw fetch
  └── 补充 hooks
        │
        ▼
Phase 4 (Decomposition)
  ├── SystemMapView
  └── Agents + Guide
        │
        ▼
Phase 5 (Polish)
  ├── CSS 整理
  └── 测试
```

---

## 关键文件清单

| 路径 | 用途 |
|------|------|
| `src/routes.tsx` | 53 路由定义 |
| `src/components/Dashboard.tsx` | 主布局 + Route 绑定 |
| `src/components/SystemMapView.tsx` | 需拆分 (5638 行) |
| `src/components/GBrain/Agents.tsx` | 需拆分 (28.1K) |
| `src/api/client.ts` | 统一 API 客户端 |
| `src/api/hooks.ts` | React Query hooks (2630 行) |
| `src/index.css` | Design tokens |
| `src/store.ts` | Zustand 状态 |
| `vite.config.ts` | 代理 + API key |

## 验证标准

1. `bun run build` — TypeScript + Vite 构建通过
2. `bun test` — vitest 测试通过
3. `bun run dev` — 手动验证:
   - 所有路由可访问
   - 搜索功能正常
   - 图表 tooltip 深色主题
   - 导航/面包屑正确
   - 无 raw fetch() 调用
   - 硬编码 secret 已移除
