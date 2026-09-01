/**
 * Route configuration for cockpit-ui.
 *
 * Single source of truth for routing, navigation, and page metadata.
 * cockpitPageRegistry.ts and cockpitNavigation.ts derive from ROUTES.
 *
 * Phase 2: 6 new capability-reflection routes added (Commands, Chain, CommandAudit, Agents, Bcos, GovernancePulse).
 * IA restructured: 51 → ~42 routes, 7 functional domains.
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
const SwarmDashboard = lazy(() => import('./components/SwarmDashboard'));
// eslint-disable-next-line react-refresh/only-export-components
const DecisionInboxView = lazy(() => import('./components/DecisionInboxView'));
// eslint-disable-next-line react-refresh/only-export-components
const PilotReviewView = lazy(() => import('./components/PilotReviewView'));
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
const OutcomesView = lazy(() => import('./components/OutcomesView'));
// eslint-disable-next-line react-refresh/only-export-components
const JourneysTimelineView = lazy(() => import('./components/JourneysTimelineView'));
// eslint-disable-next-line react-refresh/only-export-components
const WorkflowMeshOperationsView = lazy(() => import('./components/WorkflowMeshOperationsView'));
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
const KnowledgeActionView = lazy(() => import('./components/KnowledgeActionView'));
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

// Phase 2 placeholder views (replaced in stage 2)
import PlaceholderView from './components/PlaceholderView';

export interface RouteConfig {
  id: string;
  path: string;
  label: string;
  subtitle?: string;
  group: string;
  component: React.LazyExoticComponent<React.ComponentType>;
  icon?: string;
  /** When true, the route is reachable but hidden from the sidebar navigation */
  hidden?: boolean;
  /** Parent route ID for nested navigation / breadcrumb hierarchies */
  parentId?: string;
  /** Page purpose — single sentence describing what this page is for */
  purpose?: string;
  /** When to use this page — guidance for users */
  whenToUse?: string;
  /** Search/discovery keywords */
  keywords?: string[];
}

export const ROUTES: RouteConfig[] = [
  // ── 总览与导航 ──
  { id: 'Home', path: '/', label: '首页', subtitle: '系统健康总览、实时告警、关键指标趋势。', group: '总览与导航', component: HomePage, icon: 'LayoutDashboard', purpose: '健康、告警、任务、指标趋势的日常总览。', whenToUse: '每天先看这里。' },
  { id: 'Guide', path: '/guide', label: '驾驶舱指南', subtitle: '快速了解驾驶舱功能与操作方式。', group: '总览与导航', component: CockpitGuideView, icon: 'Compass', purpose: '把页面、工作带和推荐入口梳成上手总览。', whenToUse: '第一次进入或迷路时。' },
  { id: 'SystemMap', path: '/system-map', label: '系统地图', subtitle: '全局系统结构与依赖关系可视化。', group: '总览与导航', component: SystemMapView, icon: 'Network', purpose: '按页面、项目、能力域和使用路径解释整个 Cockpit。', whenToUse: '想知道 cockpit 还缺什么时。' },
  { id: 'Capabilities', path: '/capabilities', label: '能力全景', subtitle: '全生态 MCP 工具 / BOS 服务 / CLI 命令一览。', group: '总览与导航', component: CapabilityExplorer, icon: 'Layers', purpose: '浏览全生态能力：MCP 工具、BOS 服务、CLI 命令、工作流。', whenToUse: '找现成能力而不是重造轮子。' },

  // ── 运行与观测 ──
  { id: 'Overview', path: '/overview', label: '概览中心', subtitle: '实时监控 eCOS v6 微服务环境，掌握集群全貌。', group: '运行与观测', component: OverviewPage, icon: 'LayoutDashboard', purpose: '查看服务节点、运行状态和集群概貌。', whenToUse: '每天巡检、出问题先看。' },
  { id: 'McpMesh', path: '/mesh', label: '网格与 MCP', subtitle: '分布式新实例动态注册与基于域路由的 BOS URI 在线解析调试。', group: '运行与观测', component: McpMeshView, icon: 'Globe', purpose: '查看网格连接、MCP 接入和 URI 解析。', whenToUse: '怀疑入口或路由异常时。' },
  { id: 'Topology', path: '/topology', label: '全局拓扑', subtitle: '可视化服务间的调用流向与网格状态。', group: '运行与观测', component: TopologyView, icon: 'Network', purpose: '查看服务调用流向与拓扑结构。', whenToUse: '排查影响范围时。' },
  { id: 'Compute', path: '/compute', label: '算力调配', subtitle: '查看分布式节点 CPU/GPU 使用率与任务调度。', group: '运行与观测', component: ComputeView, icon: 'Cpu', purpose: '查看节点算力、GPU/CPU 使用率与任务调度。', whenToUse: '推理或调度卡住时。' },
  { id: 'Observability', path: '/observability', label: '可观测性', subtitle: '多维度链路日志与可观测性分析面板。', group: '运行与观测', component: ObservabilityView, icon: 'BarChart3', purpose: '查看链路日志与可观测信号。', whenToUse: '需要证据而不是直觉时。' },
  { id: 'LogViewer', path: '/logs', label: '日志查看器', subtitle: '实时日志流、搜索、过滤、导出。', group: '运行与观测', component: LogViewerPage, icon: 'FileText', purpose: '实时日志流、搜索、过滤和导出。', whenToUse: '看错误细节时。' },

  // ── 治理与合规 ──
  { id: 'GovernanceDomain', path: '/governance-domain', label: '治理域', subtitle: '治理工作台：域治理、合规检查、SSOT 巡检。', group: '治理与合规', component: GovernanceDomainWorkbench, icon: 'Shield', purpose: '统一治理工作台，覆盖域治理、合规检查与 SSOT 巡检。', whenToUse: '做治理巡检或合规审查时。' },
  { id: 'CommandAudit', path: '/command-audit', label: '命令评分卡', subtitle: '全量命令 15 维质量评分看板。', group: '治理与合规', component: () => <PlaceholderView title="命令评分卡" description="全量命令 15 维质量评分看板 — 阶段 2 交付" />, icon: 'ClipboardCheck', purpose: '全量命令 15 维质量评分看板。', whenToUse: '评估命令质量、发现薄弱命令时。' },
  { id: 'GovernancePulse', path: '/governance-pulse', label: '治理脉搏', subtitle: 'P74 工作流沉默治理 + 战略追踪。', group: '治理与合规', component: () => <PlaceholderView title="治理脉搏" description="P74 工作流沉默治理 + 战略追踪 — 阶段 2 交付" />, icon: 'Activity', purpose: 'P74 工作流沉默治理与战略追踪。', whenToUse: '发现工作流沉默或战略脱节时。' },
  { id: 'L4Health', path: '/l4-health', label: 'L4 域健康', subtitle: '实时监控 L4 域健康状态、趋势分析和风险评估。', group: '治理与合规', component: L4HealthView, icon: 'Heart', purpose: '查看 L4 域健康状态与风险。', whenToUse: '比单页看得更全时。' },
  { id: 'Debt', path: '/debt', label: '债务治理', subtitle: '全自动审计技术债务评分，追踪高危风险。', group: '治理与合规', component: DebtView, icon: 'FileText', purpose: '追踪高风险技术债务与治理优先级。', whenToUse: '规划补位和治理投入时。' },
  { id: 'AlertCenter', path: '/alerts', label: '告警中心', subtitle: '统一告警管理、规则配置、告警历史。', group: '治理与合规', component: AlertCenterPage, icon: 'Bell', purpose: '统一管理告警、规则和历史。', whenToUse: 'P0/P1 先从这里落点。' },

  // ── 知识与研究 ──
  { id: 'Research', path: '/research', label: '研究中心', subtitle: '学术文献检索、阅读与知识沉淀。', group: '知识与研究', component: ResearchHubView, icon: 'Search', purpose: '承接研究发起、追问、发布和后续任务。', whenToUse: '做内容、研究、产品推演时。' },
  { id: 'Knowledge', path: '/knowledge', label: '知识中枢', subtitle: '跨域检索与记忆摄取管线的状态和监控。', group: '知识与研究', component: KnowledgeHubView, icon: 'Database', purpose: '查看知识与检索能力状态。', whenToUse: '想知道知识是否能支撑动作时。' },
  { id: 'KnowledgeAction', path: '/knowledge-action', label: '知识到行动', subtitle: '将知识引用承接为受治理任务并记录行动回执。', group: '知识与研究', component: KnowledgeActionView, icon: 'ArrowRight', purpose: '把知识引用承接为受治理任务并留下行动回执。', whenToUse: '需要把研究结论转成可验证动作时。' },
  { id: 'Engines', path: '/engines', label: '引擎调度', subtitle: '管理 Kairon, Gbrain 等底层知识与智能引擎。', group: '知识与研究', component: EnginesView, icon: 'Cpu', purpose: '管理 Kairon、Gbrain 等智能引擎。', whenToUse: '排查能力供给层时。' },
  { id: 'Assets', path: '/assets', label: '技术资产库', subtitle: '集中索引自动化工作流、工具管线与智能体自定义开发技能。', group: '知识与研究', component: AssetsView, icon: 'Briefcase', purpose: '索引工作流、工具管线与智能体技能资产。', whenToUse: '找现成能力而不是重造轮子。' },
  { id: 'Kems', path: '/kems', label: 'KEMS 质量治理', subtitle: '以质量指标、哈希和证据引用驱动 OCR 复核与知识准入。', group: '知识与研究', component: KemsWorkbench, icon: 'FileText', purpose: '以质量指标、哈希和证据引用驱动 OCR 复核与知识准入。', whenToUse: '做知识质量治理时。' },
  { id: 'SceneCards', path: '/scene-cards', label: '场景卡评审', subtitle: '评审 Workflow Mesh 场景候选，完整性不足时保持提案态。', group: '知识与研究', component: SceneCardReviewView, icon: 'FileText', purpose: '评审 Workflow Mesh 场景候选并保持 proposal-only 边界。', whenToUse: '把业务机会转成可验证场景时。' },
  { id: 'DecisionInbox', path: '/decision-inbox', label: '决策收件箱', subtitle: '场景卡驱动的决策生命周期管理 — 摄入→审批→完成。', group: '知识与研究', component: DecisionInboxView, icon: 'Inbox', purpose: '场景卡驱动的决策生命周期管理。', whenToUse: '处理待审批决策时。' },
  { id: 'ExternalResources', path: '/external-resources', label: '外部能力目录', subtitle: '查看外部知识、数据、方法、工具和渠道的动态发现与健康状态。', group: '知识与研究', component: ExternalResourceCatalogView, icon: 'Database', purpose: '查看动态发现的外部知识、数据、方法、工具和渠道。', whenToUse: '判断外部能力是否存在、健康和可触达时。' },

  // ── Agent 与链路 ──
  { id: 'Commands', path: '/commands', label: '命令全景', subtitle: '全量 CLI 命令浏览、搜索与帮助引导。', group: 'Agent 与链路', component: () => <PlaceholderView title="命令全景" description="全量 CLI 命令浏览、搜索与帮助引导 — 阶段 2 交付" />, icon: 'Terminal', purpose: '全量 CLI 命令浏览、搜索与帮助引导。', whenToUse: '找命令、看命令用法时。' },
  { id: 'Chain', path: '/chain', label: '链路编排', subtitle: '多命令联动链路的 DAG 可视化与 dry-run 执行。', group: 'Agent 与链路', component: () => <PlaceholderView title="链路编排" description="多命令联动链路的 DAG 可视化与 dry-run 执行 — 阶段 2 交付" />, icon: 'GitBranch', purpose: '多命令联动链路的 DAG 可视化与 dry-run 执行。', whenToUse: '编排多命令联动链路时。' },
  { id: 'Swarm', path: '/swarm', label: 'Swarm 协同', subtitle: 'agent 协同运行链路、工作流窗口、声明占用与合规决策。', group: 'Agent 与链路', component: SwarmDashboard, icon: 'Activity', purpose: 'agent 协同运行链路、工作流窗口、声明占用与合规决策。', whenToUse: '查看 agent 协同时。' },
  { id: 'Agents', path: '/agents', label: 'Agent 监控', subtitle: '常驻 Agent 五类角色状态与事件流。', group: 'Agent 与链路', component: () => <PlaceholderView title="Agent 监控" description="常驻 Agent 五类角色状态与事件流 — 阶段 2 交付" />, icon: 'Bot', purpose: '常驻 Agent 五类角色状态与事件流。', whenToUse: '监控常驻 Agent 运行状态时。' },
  { id: 'Bcos', path: '/bcos', label: 'BCOS 北极星', subtitle: '业务闭环系统：北极星价值度量 + 信号路由 + 进化引擎。', group: 'Agent 与链路', component: () => <PlaceholderView title="BCOS 北极星" description="业务闭环系统：北极星价值度量 + 信号路由 + 进化引擎 — 阶段 2 交付" />, icon: 'Compass', purpose: '业务闭环系统：北极星价值度量、信号路由与进化引擎。', whenToUse: '查看业务闭环健康度时。' },
  { id: 'Brain', path: '/brain', label: '智能大脑', subtitle: '基于知识库 + 记忆 + LLM 的智能问答助手。', group: 'Agent 与链路', component: BrainChat, icon: 'Brain', purpose: '基于知识库 + 记忆 + LLM 的智能问答助手。', whenToUse: '与智能助手对话时。' },
  { id: 'GBrainAdmin', path: '/gbrain-admin', label: 'GBrain 管理', subtitle: 'GBrain 智能体管理、校准与监控。', group: 'Agent 与链路', component: GBrainDashboard, icon: 'Brain', purpose: '管理智能体接入、访问凭证、模型校准与请求日志。', whenToUse: '需要处理 GBrain 控制面或凭证时。' },

  // ── 开发工具 ──
  { id: 'TaskCenter', path: '/tasks', label: '任务中心', subtitle: '任务统一管理、状态跟踪、操作控制。', group: '开发工具', component: TaskCenterPage, icon: 'ClipboardList', purpose: '统一管理任务、草稿和承接动作。', whenToUse: '需要把发现变成任务时。' },
  { id: 'Performance', path: '/performance', label: '性能监控', subtitle: 'CPU/内存/磁盘/网络实时监控。', group: '开发工具', component: PerformanceMonitorPage, icon: 'Activity', purpose: '查看 CPU、内存、网络与系统性能。', whenToUse: '系统慢、负载高时。' },
  { id: 'Sandbox', path: '/sandbox', label: '隔离沙箱', subtitle: '在线执行测试或运行未校验的任务指令。', group: '开发工具', component: SandboxTerminal, icon: 'Terminal', purpose: '隔离执行验证、复现和临时实验。', whenToUse: '先试再动生产面时。' },
  { id: 'Workflows', path: '/workflows', label: '工作流', subtitle: '实时跟踪与干预自治 Agent 的运行链路。', group: '开发工具', component: WorkflowsView, icon: 'GitCommit', purpose: '跟踪自治 Agent 工作流运行链路。', whenToUse: '验证流程有没有真正闭环时。' },
  { id: 'DomainApps', path: '/domain-apps', label: '领域应用', subtitle: '第三方领域应用集成。', group: '开发工具', component: DomainAppsView, icon: 'LayoutDashboard', purpose: '统一挂载领域应用。', whenToUse: '进入领域应用时。' },

  // ── 工作台（保留，未消化的 workbench 页）──
  { id: 'EcosWorkflow', path: '/workbench/ecos-workflow', label: 'eCOS 工作流', group: '工作台', component: EcosWorkflowWorkbench, icon: 'GitBranch', hidden: true },
  { id: 'InfrastructureOps', path: '/workbench/infrastructure-ops', label: '基础设施运维', group: '工作台', component: InfrastructureOpsWorkbench, icon: 'Server', hidden: true },
  { id: 'KnowledgeExecution', path: '/workbench/knowledge-execution', label: '知识执行', group: '工作台', component: KnowledgeExecutionWorkbench, icon: 'BookOpen', hidden: true },
  { id: 'KOSWorkbench', path: '/workbench/kos', label: 'KOS 工作台', group: '工作台', component: KOSWorkbench, icon: 'Database', hidden: true },
  { id: 'MemoryInjectorView', path: '/workbench/memory-injector', label: '记忆注入', group: '工作台', component: MemoryInjector, icon: 'Brain', hidden: true },
  { id: 'PlatformControl', path: '/workbench/platform-control', label: '平台控制', group: '工作台', component: PlatformControlWorkbench, icon: 'MonitorCog', hidden: true },
  { id: 'RuntimeOps', path: '/workbench/runtime-ops', label: '运行时运维', group: '工作台', component: RuntimeOpsWorkbench, icon: 'Cpu', hidden: true },
  { id: 'SystemAssurance', path: '/workbench/system-assurance', label: '系统保障', group: '工作台', component: SystemAssuranceWorkbench, icon: 'ShieldCheck', hidden: true },

  // ── 系统配置 ──
  { id: 'Settings', path: '/settings', label: '系统设置', subtitle: '配置网格路由、API Token 与治理阈值。', group: '系统配置', component: SettingsView, icon: 'Settings', purpose: '配置网格路由、凭据和治理阈值。', whenToUse: '准备挂载新应用或修配置时。' },
];

/** Redirects for merged/deprecated routes — preserves deep links */
export const ROUTE_REDIRECTS: Record<string, string> = {
  '/performance-monitor': '/performance',
  '/knowledge-flow': '/knowledge',
  '/protocol': '/kems',
  '/pilot-review': '/scene-cards',
  '/c2g': '/governance-pulse',
  '/wave2': '/governance-pulse',
  '/delivery-journey': '/governance-domain',
  '/outcomes': '/governance-domain',
  '/journeys': '/governance-domain',
  '/workflow-mesh-operations': '/governance-domain',
  '/quests': '/domain-apps',
  '/digital-brain': '/brain',
  '/workbench/governance-domain': '/governance-domain',
  '/workbench/system-assurance': '/governance-domain',
};

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

/** Get all routes including hidden — for E2E smoke matrix */
export function getAllRoutes(): RouteConfig[] {
  return ROUTES;
}

/** Get visible routes only (hidden=false) — for sidebar navigation */
export function getVisibleRoutes(): RouteConfig[] {
  return ROUTES.filter((r) => !r.hidden);
}
