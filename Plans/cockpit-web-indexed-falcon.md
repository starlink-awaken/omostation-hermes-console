# cockpit-ui 第三轮深度迭代 — 信息架构重组 + 导航修复 + 页面补全

> 日期：2026-09-02 | 分支 main | 三份 Explore 报告综合
> 任务：修复 IA 混乱、导航消失、路由切换、页面缺失问题

## Context

用户反馈 cockpit-ui 经过 Phase 1/2/3 重构后：
1. **信息架构和组织太乱** — 分组过大、hidden 页面仍显示、双 SSOT
2. **比之前的版本少了很多页面** — 14 条旧路径被重定向，侧边栏不再显示
3. **路由切换有问题** — 双层路由 + 重定向导致双重导航
4. **左侧导航没有了** — Sidebar 背景色与容器相同，视觉上不可见

**根因分析**：不是页面"缺失"（49 条路由全部存在），而是导航结构重组后产生的问题：
- Dashboard.tsx ROUTE_CONFIG（60 条）与 routes.tsx ROUTES（49 条）双 SSOT 不同步
- Sidebar 使用 `ROUTES` 而非 `getVisibleRoutes()`，显示 8 个隐藏页面
- Sidebar 背景色 `--color-surface-0` 与容器完全相同，视觉上"消失"
- 无 responsive 处理，小屏下 sidebar 挤压
- 大分组（治理 9 条、知识 9 条）缺少折叠机制

---

## Phase 1: 导航视觉修复（P0）

### 1.1 Sidebar 背景色修复
- 文件：`src/components/dashboard-layout.css`
- 将 `.sidebar` 背景从 `--color-surface-0` 改为 `--color-surface-1`（#161618）
- 增强 border-right 对比度（从 `--color-border-subtle` 改为 `--color-border-default`）

### 1.2 Tailwind 类名修复
- 文件：`src/components/Dashboard.tsx`
- 将 `text-primary` 改为 `text-accent`（与 @theme token 一致）

### 1.3 CSS 变量冲突清理
- 文件：`src/styles/design-tokens.css`
- 将 `//` 注释改为 `/* */` 标准 CSS 注释
- 删除与 `theme.css` 重复的变量定义，保留单一 SSOT

### 1.4 Responsive 处理
- 文件：`src/components/dashboard-layout.css`
- 添加 `@media (max-width: 1024px)` 断点，小屏下 sidebar 折叠
- 添加 hamburger 菜单按钮（接入 `sidebarCollapsed` 状态）

---

## Phase 2: 信息架构重组（P0）

### 2.1 统一 SSOT：删除 Dashboard.tsx ROUTE_CONFIG
- 文件：`src/components/Dashboard.tsx`
- 删除 ROUTE_CONFIG 数组（60 条，含 11 条死代码路径）
- 统一使用 routes.tsx 的 ROUTES + getVisibleRoutes()
- 消除双 SSOT 不同步问题

### 2.2 Sidebar 过滤 hidden 路由
- 文件：`src/components/Dashboard.tsx`
- 将 `ROUTES.reduce(...)` 改为 `getVisibleRoutes().reduce(...)`
- 侧边栏只显示 41 个可见路由，隐藏 8 个工作台页面

### 2.3 大分组折叠机制
- 文件：`src/components/Dashboard.tsx`
- 为超过 5 个条目的分组添加折叠/展开功能
- 默认折叠大分组（治理与合规、知识与研究）

### 2.4 导航语义化
- 文件：`src/components/Dashboard.tsx`
- 将导航 `<button>` 改为 React Router `<NavLink>`
- 利用 NavLink 的 active 类管理高亮

---

## Phase 3: 路由架构修复（P1）

### 3.1 消除双层路由
- 文件：`src/App.tsx` + `src/components/Dashboard.tsx`
- 简化 App.tsx 的路由配置，移除重定向（已在 Dashboard 内部处理）
- 或：将重定向逻辑统一到 Dashboard 内部

### 3.2 清理重复懒加载声明
- 文件：`src/components/Dashboard.tsx`
- 删除重复的懒加载组件声明（routes.tsx 已声明）
- 统一从 routes.tsx 导入

---

## Phase 4: 页面内容补全（P1）

### 4.1 薄页面补全
- `src/components/bcos/BcosDashboard.tsx` — 添加 demo fallback + 丰富子组件
- `src/components/p74/PulseView.tsx` — 添加趋势图 + 历史视图
- `src/components/harness/HarnessDashboard.tsx` — 补充内容深度

### 4.2 硬编码数据修复
- `src/components/OverviewPage.tsx` — 移除硬编码假数据，接入 API
- `src/components/GBrain/GBrainDashboard.tsx` — 移除 `isAuthenticated = true`

### 4.3 Demo 数据标记
- `src/components/chain/ChainStudio.tsx` — 添加 "demo data" badge 或降级提示

---

## Phase 5: 死代码清理（P2）

### 5.1 清理旧页面组件
- 删除已重定向且不再使用的组件：Wave2DashboardView、C2GStrategyView 等
- 或移动到 `.omo/_archive/` 目录

### 5.2 清理 PlaceholderView
- 删除 `src/components/PlaceholderView.tsx`（已未被引用）

---

## 关键文件

| 文件 | 修改类型 |
|------|---------|
| `src/components/dashboard-layout.css` | 背景色 + responsive |
| `src/components/Dashboard.tsx` | SSOT 统一 + 导航修复 + 分组折叠 |
| `src/App.tsx` | 路由简化 |
| `src/styles/design-tokens.css` | CSS 注释修复 |
| `src/components/bcos/BcosDashboard.tsx` | 内容补全 |
| `src/components/p74/PulseView.tsx` | 内容补全 |
| `src/components/OverviewPage.tsx` | 硬编码修复 |
| `src/components/GBrain/GBrainDashboard.tsx` | auth 修复 |

## 验证

```bash
cd /Users/xiamingxing/Workspace/projects/cockpit-ui
bun run typecheck        # 类型检查
bun run build            # 构建
bun run test:unit        # 单元测试
bun run test:e2e         # E2E 冒烟（38/38 通过目标）
bun run preview --port 4173  # 手动验证 sidebar 可见 + 路由切换
```
