/**
 * Dashboard — 主布局组件 (重构后)
 *
 * 从 677 行精简到 < 250 行。
 * 图标映射、路由包装器已提取到独立模块。
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, getRouteById, getRouteByPath } from '../routes';
import Breadcrumb from './common/Breadcrumb';
import { RouteErrorBoundary } from './common/RouteErrorBoundary';
import { CommandPalette, useCommandPalette } from './common/CommandPalette';
import QuickActionsPanel, { useQuickActions } from './common/QuickActionsPanel';
import { useKeyboardShortcuts } from './common/CommandPalette';
import UserMenu from './common/UserMenu';
import { useCockpitStore } from '../store';
import { getIconComponent } from './dashboardIcons';
import { NavWrapper, HomeRoute, Wave2Route, TaskCenterRoute } from './routeWrappers';
import './Dashboard.css';

// ── 懒加载页面 (从 routes.tsx 复用) ──
const HomePage = lazy(() => import('./HomePage'));
const CockpitGuideView = lazy(() => import('./CockpitGuideView'));
const SystemMapView = lazy(() => import('./SystemMapView'));
const OverviewPage = lazy(() => import('./OverviewPage'));
const McpMeshView = lazy(() => import('./McpMeshView'));
const TopologyView = lazy(() => import('./TopologyView'));
const ComputeView = lazy(() => import('./ComputeView'));
const ResearchHubView = lazy(() => import('./ResearchHubView'));
const KnowledgeHubView = lazy(() => import('./KnowledgeHubView'));
const GBrainDashboard = lazy(() => import('./GBrain/GBrainDashboard').then(m => ({ default: m.DashboardPage })));
const EnginesView = lazy(() => import('./EnginesView'));
const AssetsView = lazy(() => import('./AssetsView'));
const ProtocolWorkbenchView = lazy(() => import('./ProtocolWorkbenchView'));
const KemsWorkbench = lazy(() => import('./KemsWorkbench'));
const SceneCardReviewView = lazy(() => import('./SceneCardReviewView'));
const ExternalResourceCatalogView = lazy(() => import('./ExternalResourceCatalogView'));
const BrainChat = lazy(() => import('../views/BrainChat'));
const WorkflowsView = lazy(() => import('./WorkflowsView'));
const AlertCenterPage = lazy(() => import('./AlertCenterPage'));
const L4HealthView = lazy(() => import('./L4HealthView'));
const DebtView = lazy(() => import('./DebtView'));
const ObservabilityView = lazy(() => import('./ObservabilityView'));
const C2GStrategyView = lazy(() => import('./C2GStrategyView'));
const Wave2DashboardView = lazy(() => import('./Wave2DashboardView'));
const LogViewerPage = lazy(() => import('./LogViewerPage'));
const TaskCenterPage = lazy(() => import('./TaskCenterPage'));
const PerformanceMonitorPage = lazy(() => import('./PerformanceMonitorPage'));
const SandboxTerminal = lazy(() => import('./SandboxTerminal'));
const SettingsView = lazy(() => import('./SettingsView'));
const OutcomesView = lazy(() => import('./OutcomesView'));
const JourneysTimelineView = lazy(() => import('./JourneysTimelineView'));
const CapabilityExplorer = lazy(() => import('./CapabilityExplorer'));
const KnowledgeActionView = lazy(() => import('./KnowledgeActionView'));
const DecisionInboxView = lazy(() => import('./DecisionInboxView'));
const PilotReviewView = lazy(() => import('./PilotReviewView'));
const DeliveryJourneyView = lazy(() => import('./DeliveryJourneyView'));
const WorkflowMeshOperationsView = lazy(() => import('./WorkflowMeshOperationsView'));
const SwarmDashboard = lazy(() => import('./SwarmDashboard'));
const DigitalBrainWorkplaceView = lazy(() => import('./DigitalBrainWorkplaceView'));
const EcosWorkflowWorkbench = lazy(() => import('./EcosWorkflowWorkbench'));
const GovernanceDomainWorkbench = lazy(() => import('./GovernanceDomainWorkbench'));
const InfrastructureOpsWorkbench = lazy(() => import('./InfrastructureOpsWorkbench'));
const KnowledgeExecutionWorkbench = lazy(() => import('./KnowledgeExecutionWorkbench'));
const KOSWorkbench = lazy(() => import('./KOSWorkbench'));
const MemoryInjector = lazy(() => import('./MemoryInjector'));
const PlatformControlWorkbench = lazy(() => import('./PlatformControlWorkbench'));
const RuntimeOpsWorkbench = lazy(() => import('./RuntimeOpsWorkbench'));
const SystemAssuranceWorkbench = lazy(() => import('./SystemAssuranceWorkbench'));
const QuestBoard = lazy(() => import('./QuestBoard'));
const KnowledgeFlow = lazy(() => import('./KnowledgeFlow'));
const DomainAppsView = lazy(() => import('./DomainAppsView'));
const HarnessDashboard = lazy(() => import('./harness/HarnessDashboard'));
const IntentCompiler = lazy(() => import('./intent/IntentCompiler'));
const GovernanceSelfCheck = lazy(() => import('./governance/GovernanceSelfCheck'));

// ── 路由配置表 ──
const ROUTE_CONFIG: Array<{ path: string; component: React.ComponentType; wrapper?: 'home' | 'nav' | 'wave2' | 'task' }> = [
  { path: '/', component: HomePage, wrapper: 'home' },
  { path: '/guide', component: CockpitGuideView, wrapper: 'nav' },
  { path: '/system-map', component: SystemMapView, wrapper: 'nav' },
  { path: '/capabilities', component: CapabilityExplorer },
  { path: '/overview', component: OverviewPage },
  { path: '/mesh', component: McpMeshView },
  { path: '/topology', component: TopologyView },
  { path: '/compute', component: ComputeView },
  { path: '/research', component: ResearchHubView, wrapper: 'nav' },
  { path: '/knowledge', component: KnowledgeHubView, wrapper: 'nav' },
  { path: '/gbrain-admin', component: GBrainDashboard },
  { path: '/engines', component: EnginesView },
  { path: '/assets', component: AssetsView },
  { path: '/protocol', component: ProtocolWorkbenchView, wrapper: 'nav' },
  { path: '/kems', component: KemsWorkbench },
  { path: '/scene-cards', component: SceneCardReviewView },
  { path: '/external-resources', component: ExternalResourceCatalogView },
  { path: '/brain', component: BrainChat },
  { path: '/knowledge-flow', component: KnowledgeFlow },
  { path: '/workflows', component: WorkflowsView },
  { path: '/alerts', component: AlertCenterPage },
  { path: '/l4-health', component: L4HealthView },
  { path: '/debt', component: DebtView },
  { path: '/observability', component: ObservabilityView },
  { path: '/c2g', component: C2GStrategyView },
  { path: '/wave2', component: Wave2DashboardView, wrapper: 'wave2' },
  { path: '/logs', component: LogViewerPage },
  { path: '/tasks', component: TaskCenterPage, wrapper: 'task' },
  { path: '/performance', component: PerformanceMonitorPage },
  { path: '/sandbox', component: SandboxTerminal },
  { path: '/quests', component: QuestBoard },
  { path: '/domain-apps', component: DomainAppsView, wrapper: 'nav' },
  { path: '/settings', component: SettingsView },
  { path: '/outcomes', component: OutcomesView },
  { path: '/journeys', component: JourneysTimelineView },
  { path: '/knowledge-action', component: KnowledgeActionView },
  { path: '/decision-inbox', component: DecisionInboxView },
  { path: '/pilot-review', component: PilotReviewView },
  { path: '/delivery-journey', component: DeliveryJourneyView },
  { path: '/workflow-mesh-operations', component: WorkflowMeshOperationsView },
  { path: '/swarm', component: SwarmDashboard },
  { path: '/commands', component: CommandExplorer },
  { path: '/chain', component: ChainStudio },
  { path: '/command-audit', component: AuditDashboard },
  { path: '/agents', component: ResidentMonitor },
  { path: '/bcos', component: BcosDashboard },
  { path: '/governance-pulse', component: PulseView },
  { path: '/digital-brain', component: DigitalBrainWorkplaceView },
  { path: '/harness', component: HarnessDashboard },
  { path: '/intent', component: IntentCompiler },
  { path: '/governance-self-check', component: GovernanceSelfCheck },
  { path: '/workbench/ecos-workflow', component: EcosWorkflowWorkbench },
  { path: '/governance-domain', component: GovernanceDomainWorkbench },
  { path: '/workbench/infrastructure-ops', component: InfrastructureOpsWorkbench },
  { path: '/workbench/knowledge-execution', component: KnowledgeExecutionWorkbench },
  { path: '/workbench/kos', component: KOSWorkbench },
  { path: '/workbench/memory-injector', component: MemoryInjector },
  { path: '/workbench/platform-control', component: PlatformControlWorkbench },
  { path: '/workbench/runtime-ops', component: RuntimeOpsWorkbench },
  { path: '/workbench/system-assurance', component: SystemAssuranceWorkbench },
];

// ── 非懒加载组件 ──
import CommandExplorer from './commands/CommandExplorer';
import ChainStudio from './chain/ChainStudio';
import AuditDashboard from './audit/AuditDashboard';
import ResidentMonitor from './resident/ResidentMonitor';
import BcosDashboard from './bcos/BcosDashboard';
import PulseView from './p74/PulseView';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRoute = getRouteByPath(location.pathname);
  const activeTab = currentRoute?.id ?? 'Home';

  const goTo = (tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  };

  // Search state
  const searchQuery = useCockpitStore((s) => s.search.query);
  const setSearchQuery = useCockpitStore((s) => s.search.setQuery);

  // Command palette
  const { isOpen: isCommandPaletteOpen, initialQuery, open: openCommandPalette, openWithQuery, close: closeCommandPalette } = useCommandPalette(
    ROUTES.map(r => ({ id: r.id, label: r.label, description: r.label, action: () => goTo(r.id) })),
  );

  // Quick actions
  const { isOpen: isQuickActionsOpen, open: openQuickActions, close: closeQuickActions } = useQuickActions();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'k', ctrl: true, description: '搜索/命令面板', action: () => isCommandPaletteOpen ? closeCommandPalette() : openCommandPalette() },
      { key: 'j', ctrl: true, description: '快捷操作', action: openQuickActions },
      { key: '1', ctrl: true, description: '首页', action: () => goTo('Home') },
      { key: '2', ctrl: true, description: '概览', action: () => goTo('Overview') },
      { key: '3', ctrl: true, description: '告警', action: () => goTo('AlertCenter') },
      { key: '4', ctrl: true, description: '日志', action: () => goTo('LogViewer') },
      { key: '5', ctrl: true, description: '任务', action: () => goTo('TaskCenter') },
    ],
  });

  // Group routes for sidebar
  const groupedRoutes = ROUTES.reduce<Record<string, typeof ROUTES>>((acc, route) => {
    if (!acc[route.group]) acc[route.group] = [];
    acc[route.group].push(route);
    return acc;
  }, {});

  // Breadcrumb
  const breadcrumbItems = [];
  if (currentRoute && currentRoute.group !== '首页') {
    breadcrumbItems.push({ label: currentRoute.group, onClick: () => goTo(ROUTES.find(r => r.group === currentRoute.group)?.id ?? 'Home') });
  }
  breadcrumbItems.push({ label: currentRoute?.label ?? '控制台' });

  // Hero
  const hero = currentRoute
    ? { title: currentRoute.label, subtitle: currentRoute.subtitle || '' }
    : { title: '控制台', subtitle: 'eCOS 管理面板' };

  // Render route element
  const renderRoute = (config: typeof ROUTE_CONFIG[number]) => {
    const El = config.component;
    switch (config.wrapper) {
      case 'home': return <HomeRoute Component={El} />;
      case 'nav': return <NavWrapper Component={El} />;
      case 'wave2': return <Wave2Route Component={El} />;
      case 'task': return <TaskCenterRoute Component={El} />;
      default: return <El />;
    }
  };

  return (
    <div className="dashboard-container">
      <a href="#main-content" className="sr-only-focusable">跳过导航</a>

      {/* Sidebar */}
      <aside role="complementary" aria-label="控制台侧边栏" className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box" aria-hidden="true">
            <span className="text-primary font-bold text-lg">C</span>
          </div>
          <h2>Cockpit Console</h2>
        </div>
        <nav aria-label="控制台主导航" className="sidebar-nav" role="menu">
          {Object.entries(groupedRoutes).map(([group, routes]) => (
            <React.Fragment key={group}>
              <div className="nav-group-title" id={`group-${group}`}>{group}</div>
              {routes.map(route => {
                const IconComp = getIconComponent(route.icon);
                return (
                  <button
                    key={route.id}
                    role="menuitem"
                    aria-describedby={`group-${group}`}
                    aria-selected={activeTab === route.id}
                    className={`nav-item ${activeTab === route.id ? 'active' : ''}`}
                    onClick={() => goTo(route.id)}
                  >
                    <IconComp size={16} aria-hidden="true" />
                    <span>{route.label}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main id="main-content" tabIndex={-1} className="main-content">
        <header className="topbar">
          <div className="search-bar" role="search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索服务、模型、智能体... (Enter 打开命令面板)"
              aria-label="全局搜索输入框"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') openWithQuery(searchQuery); }}
            />
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={() => openWithQuery(searchQuery)} title="命令面板 (Ctrl+K)">
              ⌘
            </button>
            <button className="topbar-btn" onClick={openQuickActions} title="快捷操作 (Ctrl+J)">
              ⚡
            </button>
          </div>
          <UserMenu />
        </header>

        <div className="content-area">
          {activeTab !== 'Home' && <Breadcrumb items={breadcrumbItems} />}

          <div key={activeTab} className="hero-section animate-fade-in">
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
          </div>

          <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <RouteErrorBoundary>
              <Routes>
                {ROUTE_CONFIG.map(({ path, component, wrapper }) => (
                  <Route key={path} path={path} element={renderRoute({ path, component, wrapper })} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </RouteErrorBoundary>
          </Suspense>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        initialQuery={initialQuery}
        commands={ROUTES.map(r => ({ id: r.id, label: r.label, description: r.label, action: () => goTo(r.id) }))}
      />
      <QuickActionsPanel isOpen={isQuickActionsOpen} onClose={closeQuickActions} />
    </div>
  );
}
