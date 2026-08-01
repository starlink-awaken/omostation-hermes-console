# Changelog

> 所有显著更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [0.5.0] - 2026-08-01

### 新增
- React Router v7 接入 — URL 驱动导航，浏览器原生后退/前进
- Zustand 全局状态管理 — navigation/search/preferences
- `src/routes.tsx` — 26 个路由配置，React.lazy 按需加载
- `src/api/gbrain.ts` — GBrain cookie auth 适配器
- `src/api/endpoints.ts` — 30+ 端点全覆盖 (含 GBrain 14 个)
- `src/api/hooks.ts` — 18 个 React Query hooks
- `RouteErrorBoundary` — 路由级崩溃显示 "Try again" 友好错误
- `useDeliveryJourney` — DeliveryJourneyView 的 React Query hook
- `DELIVERY_JOURNEY_ENDPOINTS` — 端点常量

### 变更
- Dashboard.tsx — useState 导航 → useNavigate/useLocation (React Router)
- Dashboard.css — 2032 行拆分为 3 模块 (layout/components/views)
- GBrain 5 组件迁移到共享适配器
- DeliveryJourneyView — 手动 fetch + useState 迁移到 React Query hook，去掉 `any` 类型
- RouteConfig — 新增 `subtitle` 字段，30 个路由填入描述

### 修复
- vitest 4.x 兼容性 — vi.mocked polyfill + happy-dom 环境
- 测试通过率 0/35 → 19/20

### 删除
- GBrain/api.ts (旧独立 API 客户端)
- AlertFeedSectionWithQuery.tsx, RecentTasksSectionWithQuery.tsx (旧组件)

---

## [未发布]

### 新增
- 初始化项目

---

