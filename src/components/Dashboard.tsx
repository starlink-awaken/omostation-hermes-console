import React, { Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import {
  Activity,
  Search,
  Settings,
  Command,
  Zap,
} from 'lucide-react';
import { ROUTES, getRouteById, getRouteByPath } from '../routes';
import Breadcrumb from './common/Breadcrumb';
import { RouteErrorBoundary } from './common/RouteErrorBoundary';
import { CommandPalette, useCommandPalette } from './common/CommandPalette';
import QuickActionsPanel, { useQuickActions } from './common/QuickActionsPanel';
import { useKeyboardShortcuts } from './common/CommandPalette';
import './Dashboard.css';

// Lazy-loaded view components
const HomePage = React.lazy(() => import('./HomePage'));
const CockpitGuideView = React.lazy(() => import('./CockpitGuideView'));
const SystemMapView = React.lazy(() => import('./SystemMapView'));
const OverviewPage = React.lazy(() => import('./OverviewPage'));
const McpMeshView = React.lazy(() => import('./McpMeshView'));
const TopologyView = React.lazy(() => import('./TopologyView'));
const ComputeView = React.lazy(() => import('./ComputeView'));
const ResearchHubView = React.lazy(() => import('./ResearchHubView'));
const KnowledgeHubView = React.lazy(() => import('./KnowledgeHubView'));
const GBrainDashboard = React.lazy(() => import('./GBrain/GBrainDashboard').then(m => ({ default: m.DashboardPage })));
const EnginesView = React.lazy(() => import('./EnginesView'));
const AssetsView = React.lazy(() => import('./AssetsView'));
const ProtocolWorkbenchView = React.lazy(() => import('./ProtocolWorkbenchView'));
const KemsWorkbench = React.lazy(() => import('./KemsWorkbench'));
const SceneCardReviewView = React.lazy(() => import('./SceneCardReviewView'));
const BrainChat = React.lazy(() => import('../views/BrainChat'));
const WorkflowsView = React.lazy(() => import('./WorkflowsView'));
const AlertCenterPage = React.lazy(() => import('./AlertCenterPage'));
const L4HealthView = React.lazy(() => import('./L4HealthView'));
const DebtView = React.lazy(() => import('./DebtView'));
const ObservabilityView = React.lazy(() => import('./ObservabilityView'));
const C2GStrategyView = React.lazy(() => import('./C2GStrategyView'));
const Wave2DashboardView = React.lazy(() => import('./Wave2DashboardView'));
const DomainAppsView = React.lazy(() => import('./DomainAppsView'));
const QuestBoard = React.lazy(() => import('./QuestBoard'));
const KnowledgeFlow = React.lazy(() => import('./KnowledgeFlow'));
const LogViewerPage = React.lazy(() => import('./LogViewerPage'));
const TaskCenterPage = React.lazy(() => import('./TaskCenterPage'));
const PerformanceMonitorPage = React.lazy(() => import('./PerformanceMonitorPage'));
const SandboxTerminal = React.lazy(() => import('./SandboxTerminal'));
const SettingsView = React.lazy(() => import('./SettingsView'));

// Icon mapping for dynamic sidebar generation
const ICON_MAP: Record<string, React.ComponentType<{ size: number; 'aria-hidden'?: boolean; className?: string }>> = {
  LayoutDashboard: (props) => <Activity {...props} />,
  Globe: (props) => <Activity {...props} />,
  Network: (props) => <Activity {...props} />,
  Cpu: (props) => <Activity {...props} />,
  Database: (props) => <Activity {...props} />,
  Briefcase: (props) => <Activity {...props} />,
  FileText: (props) => <Activity {...props} />,
  Brain: (props) => <Activity {...props} />,
  BookOpen: (props) => <Activity {...props} />,
  GitCommit: (props) => <Activity {...props} />,
  Bell: (props) => <Activity {...props} />,
  Heart: (props) => <Activity {...props} />,
  BarChart3: (props) => <Activity {...props} />,
  Compass: (props) => <Activity {...props} />,
  Zap: (props) => <Activity {...props} />,
  ClipboardList: (props) => <Activity {...props} />,
  Terminal: (props) => <Settings {...props} />,
  Trophy: (props) => <Activity {...props} />,
  Settings: (props) => <Settings {...props} />,
  Search: (props) => <Search {...props} />,
};

function getIconComponent(iconName?: string): React.ComponentType<{ size: number; 'aria-hidden'?: boolean; className?: string }> {
  return ICON_MAP[iconName || 'LayoutDashboard'] || (() => <Activity size={16} aria-hidden="true" />);
}

/** Wrapper: Wave2DashboardView needs onNavigate + onOpenTarget */
function Wave2Route() {
  const navigate = useNavigate();
  const goTo = (tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  };
  return (
    <Wave2DashboardView
      onNavigate={goTo}
      onOpenTarget={(t) => {
        if (t.tab) goTo(t.tab);
      }}
    />
  );
}

/** Wrapper: TaskCenterPage needs initialSearchQuery */
function TaskCenterRoute() {
  return <TaskCenterPage />;
}

/** Wrapper: HomePage needs onTabChange */
function HomeRoute() {
  const navigate = useNavigate();
  const goTo = (tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  };
  return <HomePage onTabChange={goTo} />;
}

/** Shared helper: build onNavigate/onOpenTarget from React Router */
function useCockpitNavCallbacks() {
  const navigate = useNavigate();
  const goTo = (tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  };
  const openTarget = (target: { tab: string; taskQuery?: string }) => {
    const route = getRouteById(target.tab);
    if (route) {
      const qs = target.taskQuery ? `?task=${encodeURIComponent(target.taskQuery)}` : '';
      navigate(`${route.path}${qs}`);
    }
  };
  return { onNavigate: goTo, onOpenTarget: openTarget };
}

/** Wrapper: CockpitGuideView needs onNavigate + onOpenTarget */
function GuideRoute() {
  const { onNavigate, onOpenTarget } = useCockpitNavCallbacks();
  return <CockpitGuideView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />;
}

/** Wrapper: SystemMapView needs onNavigate + onOpenTarget */
function SystemMapRoute() {
  const { onNavigate, onOpenTarget } = useCockpitNavCallbacks();
  return <SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />;
}

/** Wrapper: ResearchHubView needs onNavigate + onOpenTarget */
function ResearchRoute() {
  const { onNavigate, onOpenTarget } = useCockpitNavCallbacks();
  return <ResearchHubView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />;
}

/** Wrapper: KnowledgeHubView needs onNavigate + onOpenTarget */
function KnowledgeHubRoute() {
  const { onNavigate, onOpenTarget } = useCockpitNavCallbacks();
  return <KnowledgeHubView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />;
}

/** Wrapper: ProtocolWorkbenchView needs onNavigate + onOpenTarget */
function ProtocolRoute() {
  const { onNavigate, onOpenTarget } = useCockpitNavCallbacks();
  return <ProtocolWorkbenchView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />;
}

/** Wrapper: DomainAppsView needs onNavigate + onOpenTarget */
function DomainAppsRoute() {
  const { onNavigate, onOpenTarget } = useCockpitNavCallbacks();
  return <DomainAppsView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive activeTab from URL path
  const currentRoute = getRouteByPath(location.pathname);
  const activeTab = currentRoute?.id ?? 'Home';

  // Navigate to a tab by ID
  const goTo = (tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  };

  // Command palette
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette(
    ROUTES.map(r => ({ id: r.id, label: r.label, description: r.label, action: () => goTo(r.id) })),
  );

  // Quick actions panel
  const { isOpen: isQuickActionsOpen, open: openQuickActions, close: closeQuickActions } = useQuickActions();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'k', ctrl: true, description: '打开命令面板', action: openCommandPalette },
      { key: 'j', ctrl: true, description: '打开快捷操作', action: openQuickActions },
      { key: '1', ctrl: true, description: '首页', action: () => goTo('Home') },
      { key: '2', ctrl: true, description: '概览', action: () => goTo('Overview') },
      { key: '3', ctrl: true, description: '告警', action: () => goTo('AlertCenter') },
      { key: '4', ctrl: true, description: '日志', action: () => goTo('LogViewer') },
      { key: '5', ctrl: true, description: '任务', action: () => goTo('TaskCenter') },
    ],
  });

  // Breadcrumb
  const getBreadcrumbItems = () => {
    const items = [];
    const route = getRouteByPath(location.pathname);
    if (route && route.group !== '首页') {
      items.push({ label: route.group, onClick: () => goTo(ROUTES.find(r => r.group === route.group)?.id ?? 'Home') });
    }
    items.push({ label: route?.label ?? '控制台' });
    return items;
  };

  // Hero content from route config
  const hero = currentRoute
    ? { title: currentRoute.label, subtitle: currentRoute.subtitle || '' }
    : { title: '控制台', subtitle: 'eCOS 管理面板' };

  // Group routes by group for sidebar
  const groupedRoutes = ROUTES.reduce<Record<string, typeof ROUTES>>((acc, route) => {
    if (!acc[route.group]) acc[route.group] = [];
    acc[route.group].push(route);
    return acc;
  }, {});

  return (
    <div className="dashboard-container">
      {/* Skip Navigation link for screen readers (a11y) */}
      <a href="#main-content" className="sr-only-focusable" style={{
        position: 'absolute',
        top: '-100px',
        left: '20px',
        background: 'var(--antd-primary)',
        color: '#fff',
        padding: '8px 16px',
        zIndex: 100,
        borderRadius: 'var(--antd-radius-md)',
        transition: 'top 0.2s',
        textDecoration: 'none'
      }}
      onFocus={(e) => e.target.style.top = '10px'}
      onBlur={(e) => e.target.style.top = '-100px'}
      >
        跳过导航，直接进入主要内容
      </a>

      {/* Sidebar Navigation — generated from ROUTES config */}
      <aside role="complementary" aria-label="控制台侧边栏" className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box" aria-hidden="true">
            <Activity size={18} />
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

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="main-content" style={{ outline: 'none' }}>
        <header className="topbar">
          <div className="search-bar" role="search">
            <Search size={16} className="text-muted" aria-hidden="true" />
            <input type="text" placeholder="搜索服务、模型、智能体..." aria-label="全局搜索输入框" />
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={openCommandPalette} title="命令面板 (Ctrl+K)">
              <Command size={16} />
            </button>
            <button className="topbar-btn" onClick={openQuickActions} title="快捷操作 (Ctrl+J)">
              <Zap size={16} />
            </button>
          </div>
          <div className="user-profile" role="button" aria-label="个人中心，管理员" tabIndex={0}>
            <div className="avatar" aria-hidden="true">AD</div>
            <span>管理员</span>
          </div>
        </header>

        <div className="content-area">
          {/* Breadcrumb */}
          {activeTab !== 'Home' && (
            <Breadcrumb items={getBreadcrumbItems()} />
          )}

          {/* Hero section */}
          <div key={activeTab} className="hero-section animate-fade-in">
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
          </div>

          {/* Route content — lazy loaded with Suspense + Error Boundary */}
          <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading...</div>}>
            <RouteErrorBoundary>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/guide" element={<GuideRoute />} />
              <Route path="/system-map" element={<SystemMapRoute />} />
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/mesh" element={<McpMeshView />} />
              <Route path="/topology" element={<TopologyView />} />
              <Route path="/compute" element={<ComputeView />} />
              <Route path="/research" element={<ResearchRoute />} />
              <Route path="/knowledge" element={<KnowledgeHubRoute />} />
              <Route path="/gbrain-admin" element={<GBrainDashboard />} />
              <Route path="/engines" element={<EnginesView />} />
              <Route path="/assets" element={<AssetsView />} />
              <Route path="/protocol" element={<ProtocolRoute />} />
              <Route path="/kems" element={<KemsWorkbench />} />
              <Route path="/scene-cards" element={<SceneCardReviewView />} />
              <Route path="/brain" element={
                <div className="animate-fade-in h-[calc(100vh-2rem)]">
                  <BrainChat />
                </div>
              } />
              <Route path="/knowledge-flow" element={<KnowledgeFlow />} />
              <Route path="/workflows" element={<WorkflowsView />} />
              <Route path="/alerts" element={<AlertCenterPage />} />
              <Route path="/l4-health" element={<L4HealthView />} />
              <Route path="/debt" element={<DebtView />} />
              <Route path="/observability" element={<ObservabilityView />} />
              <Route path="/c2g" element={<C2GStrategyView />} />
              <Route path="/wave2" element={<Wave2Route />} />
              <Route path="/logs" element={<LogViewerPage />} />
              <Route path="/tasks" element={<TaskCenterRoute />} />
              <Route path="/performance" element={<PerformanceMonitorPage />} />
              <Route path="/sandbox" element={<SandboxTerminal />} />
              <Route path="/quests" element={<QuestBoard />} />
              <Route path="/domain-apps" element={<DomainAppsRoute />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RouteErrorBoundary>
          </Suspense>
        </div>
      </main>

      {/* Command palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        commands={ROUTES.map(r => ({
          id: r.id,
          label: r.label,
          description: r.label,
          action: () => goTo(r.id),
        }))}
      />

      {/* Quick actions panel */}
      <QuickActionsPanel isOpen={isQuickActionsOpen} onClose={closeQuickActions} />
    </div>
  );
}
