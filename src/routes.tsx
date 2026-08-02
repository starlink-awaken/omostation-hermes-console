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
const CockpitGuideView = lazy(() => import('./components/CockpitGuideView'));
// eslint-disable-next-line react-refresh/only-export-components
const SystemMapView = lazy(() => import('./components/SystemMapView'));
// eslint-disable-next-line react-refresh/only-export-components
const OverviewPage = lazy(() => import('./components/OverviewPage'));
// eslint-disable-next-line react-refresh/only-export-components
const McpMeshView = lazy(() => import('./components/McpMeshView'));
// eslint-disable-next-line react-refresh/only-export-components
const TopologyView = lazy(() => import('./components/TopologyView'));
// eslint-disable-next-line react-refresh/only-export-components
const ComputeView = lazy(() => import('./components/ComputeView'));
// eslint-disable-next-line react-refresh/only-export-components
const ResearchHubView = lazy(() => import('./components/ResearchHubView'));
// eslint-disable-next-line react-refresh/only-export-components
const KnowledgeHubView = lazy(() => import('./components/KnowledgeHubView'));
// eslint-disable-next-line react-refresh/only-export-components
const GBrainDashboard = lazy(() => import('./components/GBrain/GBrainDashboard'));
// eslint-disable-next-line react-refresh/only-export-components
const EnginesView = lazy(() => import('./components/EnginesView'));
// eslint-disable-next-line react-refresh/only-export-components
const AssetsView = lazy(() => import('./components/AssetsView'));
// eslint-disable-next-line react-refresh/only-export-components
const ProtocolWorkbenchView = lazy(() => import('./components/ProtocolWorkbenchView'));
// eslint-disable-next-line react-refresh/only-export-components
const KemsWorkbench = lazy(() => import('./components/KemsWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const SceneCardReviewView = lazy(() => import('./components/SceneCardReviewView'));
// eslint-disable-next-line react-refresh/only-export-components
const ExternalResourceCatalogView = lazy(() => import('./components/ExternalResourceCatalogView'));
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
const DomainAppsView = lazy(() => import('./components/DomainAppsView'));
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
// eslint-disable-next-line react-refresh/only-export-components
const DeliveryJourneyView = lazy(() => import('./components/DeliveryJourneyView'));
// eslint-disable-next-line react-refresh/only-export-components
const CapabilityExplorer = lazy(() => import('./components/CapabilityExplorer'));
// eslint-disable-next-line react-refresh/only-export-components
const EcosWorkflowWorkbench = lazy(() => import('./components/EcosWorkflowWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const GovernanceDomainWorkbench = lazy(() => import('./components/GovernanceDomainWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const InfrastructureOpsWorkbench = lazy(() => import('./components/InfrastructureOpsWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const KnowledgeExecutionWorkbench = lazy(() => import('./components/KnowledgeExecutionWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const KOSWorkbench = lazy(() => import('./components/KOSWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const MemoryInjector = lazy(() => import('./components/MemoryInjector'));
// eslint-disable-next-line react-refresh/only-export-components
const PlatformControlWorkbench = lazy(() => import('./components/PlatformControlWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const RuntimeOpsWorkbench = lazy(() => import('./components/RuntimeOpsWorkbench'));
// eslint-disable-next-line react-refresh/only-export-components
const SystemAssuranceWorkbench = lazy(() => import('./components/SystemAssuranceWorkbench'));


export interface RouteConfig {
  id: string;
  path: string;
  label: string;
  subtitle?: string;
  group: string;
  component: React.LazyExoticComponent<React.ComponentType>;
  icon?: string;
}

export const ROUTES: RouteConfig[] = [
  // 首页
  { id: 'Home', path: '/', label: '首页', subtitle: '系统健康总览、实时告警、关键指标趋势。', group: '首页', component: HomePage, icon: 'LayoutDashboard' },
  { id: 'Guide', path: '/guide', label: '驾驶舱指南', subtitle: '快速了解驾驶舱功能与操作方式。', group: '首页', component: CockpitGuideView, icon: 'Compass' },
  { id: 'SystemMap', path: '/system-map', label: '系统地图', subtitle: '全局系统结构与依赖关系可视化。', group: '首页', component: SystemMapView, icon: 'Network' },
  { id: 'Capabilities', path: '/capabilities', label: '能力全景', subtitle: '全生态 MCP 工具 / BOS 服务 / CLI 命令一览。', group: '首页', component: CapabilityExplorer, icon: 'Layers' },

  // 运行大盘
  { id: 'Overview', path: '/overview', label: '概览中心', subtitle: '实时监控 eCOS v6 微服务环境，掌握集群全貌。', group: '运行大盘', component: OverviewPage, icon: 'LayoutDashboard' },
  { id: 'McpMesh', path: '/mesh', label: '网格与 MCP', subtitle: '分布式新实例动态注册与基于域路由的 BOS URI 在线解析调试。', group: '运行大盘', component: McpMeshView, icon: 'Globe' },
  { id: 'Topology', path: '/topology', label: '全局拓扑', subtitle: '可视化服务间的调用流向与网格状态。', group: '运行大盘', component: TopologyView, icon: 'Network' },
  { id: 'Compute', path: '/compute', label: '算力调配', subtitle: '查看分布式节点 CPU/GPU 使用率与任务调度。', group: '运行大盘', component: ComputeView, icon: 'Cpu' },

  // 智能与知识
  { id: 'Research', path: '/research', label: '研究中心', subtitle: '学术文献检索、阅读与知识沉淀。', group: '智能与知识', component: ResearchHubView, icon: 'Search' },
  { id: 'Knowledge', path: '/knowledge', label: '知识中枢', subtitle: '跨域检索与记忆摄取管线的状态和监控。', group: '智能与知识', component: KnowledgeHubView, icon: 'Database' },
  { id: 'Engines', path: '/engines', label: '引擎调度', subtitle: '管理 Kairon, Gbrain 等底层知识与智能引擎。', group: '智能与知识', component: EnginesView, icon: 'Cpu' },
  { id: 'Assets', path: '/assets', label: '技术资产库', subtitle: '集中索引自动化工作流、工具管线与智能体自定义开发技能。', group: '智能与知识', component: AssetsView, icon: 'Briefcase' },
  { id: 'Protocol', path: '/protocol', label: '协议工作台', subtitle: 'BOS 协议调试与 MCP 工具测试。', group: '智能与知识', component: ProtocolWorkbenchView, icon: 'FileText' },
  { id: 'Kems', path: '/kems', label: 'KEMS 质量治理', subtitle: '以质量指标、哈希和证据引用驱动 OCR 复核与知识准入。', group: '智能与知识', component: KemsWorkbench, icon: 'FileText' },
  { id: 'SceneCards', path: '/scene-cards', label: '场景卡评审', subtitle: '评审 Workflow Mesh 场景候选，完整性不足时保持提案态。', group: '智能与知识', component: SceneCardReviewView, icon: 'FileText' },
  { id: 'ExternalResources', path: '/external-resources', label: '外部能力目录', subtitle: '查看外部知识、数据、方法、工具和渠道的动态发现与健康状态。', group: '智能与知识', component: ExternalResourceCatalogView, icon: 'Database' },
  { id: 'Brain', path: '/brain', label: '个人数字大脑', subtitle: '基于知识库 + 记忆 + LLM 的智能问答助手。', group: '智能助手', component: BrainChat, icon: 'Brain' },
  { id: 'KnowledgeFlow', path: '/knowledge-flow', label: '知识流动', subtitle: '知识在系统中的流转与沉淀路径。', group: '智能与知识', component: KnowledgeFlow, icon: 'BookOpen' },
  { id: 'Workflows', path: '/workflows', label: '工作流', subtitle: '实时跟踪与干预自治 Agent 的运行链路。', group: '智能与知识', component: WorkflowsView, icon: 'GitCommit' },

  // 系统治理
  { id: 'AlertCenter', path: '/alerts', label: '告警中心', subtitle: '统一告警管理、规则配置、告警历史。', group: '系统治理', component: AlertCenterPage, icon: 'Bell' },
  { id: 'L4Health', path: '/l4-health', label: 'L4 域健康', subtitle: '实时监控 L4 域健康状态、趋势分析和风险评估。', group: '系统治理', component: L4HealthView, icon: 'Heart' },
  { id: 'Debt', path: '/debt', label: '债务治理', subtitle: '全自动审计技术债务评分，追踪高危风险。', group: '系统治理', component: DebtView, icon: 'FileText' },
  { id: 'Observability', path: '/observability', label: '可观测性', subtitle: '多维度链路日志与可观测性分析面板。', group: '系统治理', component: ObservabilityView, icon: 'BarChart3' },
  { id: 'DeliveryJourney', path: '/delivery-journey', label: '工程交付旅程', group: '系统治理', component: DeliveryJourneyView, icon: 'Compass' },

  { id: 'C2G', path: '/c2g', label: 'C2G 战略中心', subtitle: '跟踪系统从战役目标到治理卡片的全生命周期。', group: '系统治理', component: C2GStrategyView, icon: 'Compass' },
  { id: 'Wave2', path: '/wave2', label: 'Wave2 预测面板', subtitle: '热力、预测序列与治理提案。', group: '系统治理', component: Wave2DashboardView, icon: 'Zap' },
  { id: 'GBrainAdmin', path: '/gbrain-admin', label: 'GBrain 管理', subtitle: 'GBrain 智能体管理、校准与监控。', group: '系统治理', component: GBrainDashboard, icon: 'Brain' },

  // 开发工具
  { id: 'LogViewer', path: '/logs', label: '日志查看器', subtitle: '实时日志流、搜索、过滤、导出。', group: '开发工具', component: LogViewerPage, icon: 'FileText' },
  { id: 'TaskCenter', path: '/tasks', label: '任务中心', subtitle: '任务统一管理、状态跟踪、操作控制。', group: '开发工具', component: TaskCenterPage, icon: 'ClipboardList' },
  { id: 'Performance', path: '/performance', label: '性能监控', subtitle: 'CPU/内存/磁盘/网络实时监控。', group: '开发工具', component: PerformanceMonitorPage, icon: 'Activity' },
  { id: 'Sandbox', path: '/sandbox', label: '隔离沙箱', subtitle: '在线执行测试或运行未校验的任务指令。', group: '开发工具', component: SandboxTerminal, icon: 'Terminal' },

  // 领域应用
  { id: 'QuestBoard', path: '/quests', label: '积分冒险', subtitle: '让家庭充满正向激励与智慧成长。', group: '领域应用', component: QuestBoard, icon: 'Trophy' },
  { id: 'DomainApps', path: '/domain-apps', label: '领域应用', subtitle: '第三方领域应用集成。', group: '领域应用', component: DomainAppsView, icon: 'LayoutDashboard' },

  // 系统配置
  { id: 'Settings', path: '/settings', label: '系统设置', subtitle: '配置网格路由、API Token 与治理阈值。', group: '系统配置', component: SettingsView, icon: 'Settings' },
  // ── 工作台 (P4-T3: 接入原本不可达的 Workbench 组件) ──
  { id: 'EcosWorkflow', path: '/workbench/ecos-workflow', label: 'eCOS 工作流', group: '工作台', component: EcosWorkflowWorkbench, icon: 'GitBranch' },
  { id: 'GovernanceDomain', path: '/workbench/governance-domain', label: '治理域', group: '工作台', component: GovernanceDomainWorkbench, icon: 'Shield' },
  { id: 'InfrastructureOps', path: '/workbench/infrastructure-ops', label: '基础设施运维', group: '工作台', component: InfrastructureOpsWorkbench, icon: 'Server' },
  { id: 'KnowledgeExecution', path: '/workbench/knowledge-execution', label: '知识执行', group: '工作台', component: KnowledgeExecutionWorkbench, icon: 'BookOpen' },
  { id: 'KOSWorkbench', path: '/workbench/kos', label: 'KOS 工作台', group: '工作台', component: KOSWorkbench, icon: 'Database' },
  { id: 'MemoryInjectorView', path: '/workbench/memory-injector', label: '记忆注入', group: '工作台', component: MemoryInjector, icon: 'Brain' },
  { id: 'PlatformControl', path: '/workbench/platform-control', label: '平台控制', group: '工作台', component: PlatformControlWorkbench, icon: 'MonitorCog' },
  { id: 'RuntimeOps', path: '/workbench/runtime-ops', label: '运行时运维', group: '工作台', component: RuntimeOpsWorkbench, icon: 'Cpu' },
  { id: 'SystemAssurance', path: '/workbench/system-assurance', label: '系统保障', group: '工作台', component: SystemAssuranceWorkbench, icon: 'ShieldCheck' },
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
