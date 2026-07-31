# cockpit-ui 现代化审计报告

> 审计日期: 2026-07-31
> 范围: `projects/cockpit-ui/src/` (116 TS/TSX, 64,398 行)
> 方法: frontend-design skill + 结构分析

## 1. 技术栈现状

| 项目 | 当前 | 最新 | 状态 |
|------|------|------|------|
| React | 19.2.6 | 19.2.6 | ✅ 最新 |
| Vite | 8.0.12 | 8.0.12 | ✅ 最新 |
| TypeScript | 6.0.2 | 6.0.2 | ✅ 最新 |
| UI 库 | 无 (vanilla CSS) | — | ⚠️ 自建 |
| 路由 | 无 (hash 导航) | — | ⚠️ 自建 |
| 状态管理 | 无 (local state) | — | ⚠️ 无全局状态 |
| 测试 | Vitest 4.1.9 | 4.1.9 | ✅ 最新 |
| CSS | 自定义 design tokens | — | ✅ 有体系 |

## 2. 设计系统审计

### 2.1 色彩体系 — ✅ 有特色

**Cyberpunk 主题**，自定义 CSS 变量：
- 主色: `#00f2fe` (Cyber Neon Cyan)
- 成功: `#05f3a2` (Neon Green)
- 警告: `#ffb800` (Amber)
- 错误: `#ff4757` (Vermilion)
- 背景: `#060913` → `#0a0e1c` (Deep Cosmic Blue)

**评价**: 配色有辨识度，符合运维控制台的"赛博朋克"审美。有完整的 design token 体系（`--antd-*` 前缀）。但变量命名仍保留 `antd-` 前缀，建议统一为 `cockpit-`。

### 2.2 排版 — ⚠️ 单一

- 字体: Inter (系统字体栈兜底)
- 无 display/body 字体区分
- 无明确的 type scale（标题/正文/辅助文字的字号层级）

**建议**: 引入 JetBrains Mono 作为等宽字体（代码/终端场景），Inter 保持为 UI 字体。

### 2.3 组件库 — ⚠️ 自建但不完整

自建组件：
- `.antd-btn` / `.antd-btn-primary` / `.antd-btn-danger`
- `.antd-input`
- `.antd-card`

**缺失**: Modal, Dropdown, Tabs, Tooltip, Toast, Skeleton, Empty State

### 2.4 布局系统 — ⚠️ 无统一体系

- 无 Grid/Flex 布局工具类
- 各组件自行实现布局
- 响应式断点不统一（有的用 1024px，有的用 768px）

## 3. 架构审计

### 3.1 组件粒度 — 🔴 严重问题

**超大组件** (500+ 行):

| 组件 | 行数 | 问题 |
|------|------|------|
| Dashboard.tsx | **6,196** | God component, 包含导航/状态/渲染/逻辑 |
| Dashboard.css | **10,222** | 单文件 CSS, 无法维护 |
| SystemMapView.tsx | 5,131 | 地图+拓扑+交互全在一个文件 |
| HomePage.tsx | 3,392 | 首页聚合了 6+ 个子组件 |
| CockpitGuideView.tsx | 3,065 | 引导页 |
| TaskCenterPage.tsx | 2,795 | 任务中心 |

**建议**: Dashboard.tsx 应拆分为：
- `DashboardLayout.tsx` (布局骨架)
- `DashboardNav.tsx` (侧边栏导航)
- `DashboardContent.tsx` (内容区路由)
- `DashboardHeader.tsx` (顶部栏)

### 3.2 路由 — ⚠️ 自建 hash 导航

当前使用 `parseNavigationHash()` + `writeNavigationHash()` 实现页面切换，无 React Router。

**问题**:
- 无 URL 参数支持
- 无嵌套路由
- 无代码分割路由级 lazy loading
- 浏览器前进/后退行为不标准

**建议**: 引入 React Router v7 (或 TanStack Router)，支持：
- 嵌套路由
- 路由级 lazy loading
- URL 参数
- 浏览器历史

### 3.3 状态管理 — ⚠️ 纯 local state

6,196 行的 Dashboard.tsx 使用大量 `useState` 管理全局状态（当前页面、侧边栏展开、搜索等）。

**问题**:
- 状态提升到顶层导致不必要的重渲染
- 子组件通过 props 传递回调，prop drilling 严重
- 无法持久化状态

**建议**: 引入 Zustand (轻量) 或 Jotai (原子化)，管理：
- 当前页面/导航状态
- 用户偏好（主题、布局）
- 全局搜索状态

### 3.4 测试覆盖 — ✅ 有基础

- 46 个测试文件, 13,925 行测试代码
- 覆盖率约 40% (46/116 组件有测试)
- 使用 Vitest + @testing-library/react

**缺失**: 无 E2E 测试, 无视觉回归测试

## 4. 性能审计

### 4.1 代码分割 — ✅ 已做

Dashboard.tsx 使用 `lazy()` + `Suspense` 做了路由级代码分割：
```tsx
const SandboxTerminal = lazy(() => import('./SandboxTerminal'));
const EnginesView = lazy(() => import('./EnginesView'));
// ... 15+ lazy imports
```

### 4.2 Bundle 大小 — ⚠️ 需检查

- 无 bundle analyzer 配置
- lucide-react 图标库全量引入（30+ 图标）
- 无 tree-shaking 验证

**建议**: 添加 `vite-plugin-visualizer` 做 bundle 分析。

### 4.3 渲染性能 — ⚠️ 潜在问题

Dashboard.tsx 6,196 行意味着：
- 单组件渲染路径过长
- 状态变化可能触发大范围重渲染
- 无 React.memo / useMemo 优化

## 5. 可访问性 (a11y) 审计

### 5.1 已做 — ✅

- `*:focus-visible` 全局样式
- 键盘快捷键支持 (`useKeyboardShortcuts`)
- Command Palette (⌘K)

### 5.2 缺失 — ⚠️

- 无 ARIA landmark 标注
- 无 screen reader 测试
- 颜色对比度可能不足（cyan on dark bg）
- 无 reduced-motion 媒体查询

## 6. 现代化优先级

### P0 — 必须做 (影响可维护性)

| # | 项目 | 工作量 | 收益 |
|---|------|--------|------|
| 1 | **Dashboard.tsx 拆分** | 大 | 可维护性 ↑↑↑ |
| 2 | **Dashboard.css 拆分** | 中 | 可维护性 ↑↑ |
| 3 | **design token 前缀统一** | 小 | 一致性 ↑ |

### P1 — 建议做 (影响开发效率)

| # | 项目 | 工作量 | 收益 |
|---|------|--------|------|
| 4 | **引入 React Router** | 中 | URL 标准化, 代码分割 |
| 5 | **引入 Zustand** | 中 | 状态管理, 减少 prop drilling |
| 6 | **组件库补齐** | 大 | Modal/Tabs/Toast 等 |

### P2 — 可选做 (影响体验)

| # | 项目 | 工作量 | 收益 |
|---|------|--------|------|
| 7 | **a11y 增强** | 中 | 可访问性 |
| 8 | **E2E 测试** | 大 | 回归保障 |
| 9 | **bundle 分析** | 小 | 性能优化 |

## 7. 推荐的下一步

1. **先做 P0-1 (Dashboard 拆分)** — 这是最大的架构债，拆分后其他改进才有基础
2. **同步做 P0-3 (token 前缀)** — 小改动，立即提升一致性
3. **P1-4 (Router)** — 拆分后自然需要路由，顺手引入

## 8. 结论

cockpit-ui 的技术栈是最新的（React 19 + Vite 8 + TS 6），设计系统有特色（Cyberpunk 主题），但组件架构有严重的粒度问题。Dashboard.tsx 6,196 行是最大的 tech debt，建议优先拆分。测试覆盖 40% 可接受，但需要补充 E2E 测试。

**整体评分**: 6/10 (技术栈 9/10, 架构 4/10, 设计 7/10, 测试 6/10)
