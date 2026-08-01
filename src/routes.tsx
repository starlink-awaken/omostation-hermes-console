/**
 * Route configuration for cockpit-ui.
 *
 * Maps tab IDs to URL paths and lazy-loaded components.
 * Replaces the custom hash navigation with React Router.
 */

import React from 'react';
import { lazy } from 'react';

// Lazy-loaded view components
// eslint-disable-next-line react-refresh/only-export-components
const HomePage = lazy(() => import('./components/HomePage'));
// eslint-disable-next-line react-refresh/only-export-components
const OverviewPage = lazy(() => import('./components/OverviewPage'));
// eslint-disable-next-line react-refresh/only-export-components
const McpMeshView = lazy(() => import('./components/McpMeshView'));
// eslint-disable-next-line react-refresh/only-export-components
const TopologyView = lazy(() => import('./components/TopologyView'));
// eslint-disable-next-line react-refresh/only-export-components
const ComputeView = lazy(() => import('./components/ComputeView'));
// eslint-disable-next-line react-refresh/only-export-components
const EnginesView = lazy(() => import('./components/EnginesView'));
// eslint-disable-next-line react-refresh/only-export-components
const AssetsView = lazy(() => import('./components/AssetsView'));
// eslint-disable-next-line react-refresh/only-export-components
const KemsWorkbench = lazy(() => import('./components/KemsWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const BrainChat = lazy(() => import('./views/BrainChat'));
// eslint-disable-next-line react-refresh/only-export-components
const WorkflowsView = lazy(() => import('./components/WorkflowsView'));
// eslint-disable-next-line react-refresh/only-export-components
const AlertCenterPage = lazy(() => import('./components/AlertCenterPage'));
// eslint-disable-next-line react-refresh/only-export-components
const L4HealthView = lazy(() => import('./components/L4HealthView'));
// eslint-disable-next-line react-refresh/only-export-components
const DebtView = lazy(() => import('./components/DebtView'));
// eslint-disable-next-line react-refresh/only-export-components
const ObservabilityView = lazy(() => import('./components/ObservabilityView'));
// eslint-disable-next-line react-refresh/only-export-components
const C2GStrategyView = lazy(() => import('./components/C2GStrategyView'));
// eslint-disable-next-line react-refresh/only-export-components
const Wave2DashboardView = lazy(() => import('./components/Wave2DashboardView'));
// eslint-disable-next-line react-refresh/only-export-components
const QuestBoard = lazy(() => import('./components/QuestBoard'));
// eslint-disable-next-line react-refresh/only-export-components
const KnowledgeFlow = lazy(() => import('./components/KnowledgeFlow'));
// eslint-disable-next-line react-refresh/only-export-components
const LogViewerPage = lazy(() => import('./components/LogViewerPage'));
// eslint-disable-next-line react-refresh/only-export-components
const TaskCenterPage = lazy(() => import('./components/TaskCenterPage'));
// eslint-disable-next-line react-refresh/only-export-components
const PerformanceMonitorPage = lazy(() => import('./components/PerformanceMonitorPage'));
// eslint-disable-next-line react-refresh/only-export-components
const SandboxTerminal = lazy(() => import('./components/SandboxTerminal'));
// eslint-disable-next-line react-refresh/only-export-components
const SettingsView = lazy(() => import('./components/SettingsView'));

export interface RouteConfig {
  id: string;
  path: string;
  label: string;
  group: string;
  component: React.LazyExoticComponent<React.ComponentType>;
  icon?: string;
}

export const ROUTES: RouteConfig[] = [
  // 首页
  { id: 'Home', path: '/', label: '首页', group: '首页', component: HomePage, icon: 'LayoutDashboard' },

  // 运行大盘
  { id: 'Overview', path: '/overview', label: '概览中心', group: '运行大盘', component: OverviewPage, icon: 'LayoutDashboard' },
  { id: 'McpMesh', path: '/mesh', label: '网格与 MCP', group: '运行大盘', component: McpMeshView, icon: 'Globe' },
  { id: 'Topology', path: '/topology', label: '全局拓扑', group: '运行大盘', component: TopologyView, icon: 'Network' },
  { id: 'Compute', path: '/compute', label: '算力调配', group: '运行大盘', component: ComputeView, icon: 'Cpu' },

  // 智能与知识
  { id: 'Knowledge', path: '/knowledge', label: '知识中枢', group: '智能与知识', component: HomePage, icon: 'Database' },
  { id: 'Engines', path: '/engines', label: '引擎调度', group: '智能与知识', component: EnginesView, icon: 'Cpu' },
  { id: 'Assets', path: '/assets', label: '技术资产库', group: '智能与知识', component: AssetsView, icon: 'Briefcase' },
  { id: 'Kems', path: '/kems', label: 'KEMS 质量治理', group: '智能与知识', component: KemsWorkbench, icon: 'FileText' },
  { id: 'Brain', path: '/brain', label: '个人数字大脑', group: '智能助手', component: BrainChat, icon: 'Brain' },
  { id: 'KnowledgeFlow', path: '/knowledge-flow', label: '知识流动', group: '智能与知识', component: KnowledgeFlow, icon: 'BookOpen' },
  { id: 'Workflows', path: '/workflows', label: '工作流', group: '智能与知识', component: WorkflowsView, icon: 'GitCommit' },

  // 系统治理
  { id: 'AlertCenter', path: '/alerts', label: '告警中心', group: '系统治理', component: AlertCenterPage, icon: 'Bell' },
  { id: 'L4Health', path: '/l4-health', label: 'L4 域健康', group: '系统治理', component: L4HealthView, icon: 'Heart' },
  { id: 'Debt', path: '/debt', label: '债务治理', group: '系统治理', component: DebtView, icon: 'FileText' },
  { id: 'Observability', path: '/observability', label: '可观测性', group: '系统治理', component: ObservabilityView, icon: 'BarChart3' },
  { id: 'C2G', path: '/c2g', label: 'C2G 战略中心', group: '系统治理', component: C2GStrategyView, icon: 'Compass' },
  { id: 'Wave2', path: '/wave2', label: 'Wave2 预测面板', group: '系统治理', component: Wave2DashboardView, icon: 'Zap' },

  // 开发工具
  { id: 'LogViewer', path: '/logs', label: '日志查看器', group: '开发工具', component: LogViewerPage, icon: 'FileText' },
  { id: 'TaskCenter', path: '/tasks', label: '任务中心', group: '开发工具', component: TaskCenterPage, icon: 'ClipboardList' },
  { id: 'Performance', path: '/performance', label: '性能监控', group: '开发工具', component: PerformanceMonitorPage, icon: 'Activity' },
  { id: 'Sandbox', path: '/sandbox', label: '隔离沙箱', group: '开发工具', component: SandboxTerminal, icon: 'Terminal' },

  // 领域应用
  { id: 'QuestBoard', path: '/quests', label: '积分冒险', group: '领域应用', component: QuestBoard, icon: 'Trophy' },

  // 系统配置
  { id: 'Settings', path: '/settings', label: '系统设置', group: '系统配置', component: SettingsView, icon: 'Settings' },
];

/** Get route by tab ID */
export function getRouteById(id: string): RouteConfig | undefined {
  return ROUTES.find((r) => r.id === id);
}

/** Get route by path */
export function getRouteByPath(path: string): RouteConfig | undefined {
  return ROUTES.find((r) => r.path === path);
}

/** Get all routes in a group */
export function getRoutesByGroup(group: string): RouteConfig[] {
  return ROUTES.filter((r) => r.group === group);
}

/** Get all unique groups */
export function getRouteGroups(): string[] {
  return [...new Set(ROUTES.map((r) => r.group))];
}
