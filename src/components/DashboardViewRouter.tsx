import React, { Suspense, lazy } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CockpitNavigationTarget } from './cockpitNavigation';

// ── Lazy-loaded views ──

const SandboxTerminal = lazy(() => import('./SandboxTerminal'));
const EnginesView = lazy(() => import('./EnginesView'));
const SettingsView = lazy(() => import('./SettingsView'));
const WorkflowsView = lazy(() => import('./WorkflowsView'));
const TopologyView = lazy(() => import('./TopologyView'));
const ComputeView = lazy(() => import('./ComputeView'));
const DebtView = lazy(() => import('./DebtView'));
const ObservabilityView = lazy(() => import('./ObservabilityView'));
const QuestBoard = lazy(() => import('./QuestBoard'));
const L4HealthView = lazy(() => import('./L4HealthView'));
const HomePage = lazy(() => import('./HomePage'));
const AlertCenterPage = lazy(() => import('./AlertCenterPage'));
const LogViewerPage = lazy(() => import('./LogViewerPage'));
const TaskCenterPage = lazy(() => import('./TaskCenterPage'));
const PerformanceMonitorPage = lazy(() => import('./PerformanceMonitorPage'));
const C2GStrategyView = lazy(() => import('./C2GStrategyView'));
const McpMeshView = lazy(() => import('./McpMeshView'));
const AssetsView = lazy(() => import('./AssetsView'));
const DomainAppsView = lazy(() => import('./DomainAppsView'));
const SystemMapView = lazy(() => import('./SystemMapView'));
const OverviewPage = lazy(() => import('./OverviewPage'));
const KnowledgeHubView = lazy(() => import('./KnowledgeHubView'));
const GBrainAdminView = lazy(async () => {
  const mod = await import('./GBrain/GBrainDashboard');
  return { default: mod.DashboardPage };
});
const ResearchHubView = lazy(() => import('./ResearchHubView'));
const ProtocolWorkbenchView = lazy(() => import('./ProtocolWorkbenchView'));
const CockpitGuideView = lazy(() => import('./CockpitGuideView'));

// ── Error boundary ──

export class DashboardViewErrorBoundary extends React.Component<
  { label: string; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Cockpit 页面 ${this.props.label} 渲染失败`, error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="dashboard-view-error" role="alert" aria-label={`${this.props.label}加载失败`}>
        <AlertTriangle size={22} aria-hidden="true" />
        <strong>{this.props.label}暂时无法加载</strong>
        <p>页面运行时出现异常，主控制台仍可继续使用。重新加载后会重新获取页面资源。</p>
        <button
          type="button"
          className="cockpit-btn small"
          onClick={() => window.location.reload()}
        >
          重新加载页面
        </button>
      </div>
    );
  }
}

function DashboardViewFallback({ label }: { label: string }) {
  return (
    <div className="loading-state dashboard-view-fallback" role="status" aria-label={`${label} 加载中`}>
      <div className="spinner" />
      <span>{label} 加载中…</span>
    </div>
  );
}

// ── Props ──

interface DashboardViewRouterProps {
  activeTab: string;
  pageRefreshToken: number;
  onNavigate: (tab: string) => void;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
  focusedPageId: string | null;
  focusedProjectId: string | null;
  focusedUsagePathId: string | null;
  focusedGapId: string | null;
  focusedCoverageDimensionId: string | null;
  focusedFeatureDomainId: string | null;
  taskSearchSeed: string;
  alertTab: 'active' | 'history' | 'rules' | null;
  taskCenterIncomingDraft: unknown;
}

// ── Component ──

export function DashboardViewRouter({
  activeTab,
  pageRefreshToken,
  onNavigate,
  onOpenTarget,
  focusedPageId,
  focusedProjectId,
  focusedUsagePathId,
  focusedGapId,
  focusedCoverageDimensionId,
  focusedFeatureDomainId,
  taskSearchSeed,
  alertTab,
  taskCenterIncomingDraft,
}: DashboardViewRouterProps) {
  const renderLazyView = (label: string, node: React.ReactNode) => (
    <DashboardViewErrorBoundary label={label}>
      <Suspense fallback={<DashboardViewFallback label={label} />}>
        {node}
      </Suspense>
    </DashboardViewErrorBoundary>
  );

  return (
    <div className="dashboard-page-view" data-testid="dashboard-page-view" data-refresh-token={pageRefreshToken} key={`${activeTab}-${pageRefreshToken}`}>
      {activeTab === 'Home' && renderLazyView('首页', <HomePage onTabChange={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusProjectId={focusedProjectId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Guide' && renderLazyView('站内导览', <CockpitGuideView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusProjectId={focusedProjectId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'SystemMap' && renderLazyView('系统地图', <SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusProjectId={focusedProjectId} focusUsagePathId={focusedUsagePathId} focusGapId={focusedGapId} focusCoverageDimensionId={focusedCoverageDimensionId} focusPageId={focusedPageId} focusFeatureDomainId={focusedFeatureDomainId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Overview' && renderLazyView('概览中心', <OverviewPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusProjectId={focusedProjectId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Topology' && renderLazyView('全局拓扑', <TopologyView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Compute' && renderLazyView('算力调配', <ComputeView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Research' && renderLazyView('研究中枢', <ResearchHubView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Engines' && renderLazyView('引擎调度', <EnginesView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Knowledge' && renderLazyView('知识中枢', <KnowledgeHubView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'GBrainAdmin' && renderLazyView('GBrain 管理', <GBrainAdminView initialSubTab={/智能体|agent/i.test(taskSearchSeed) ? 'agents' : /凭证|token|credential/i.test(taskSearchSeed) ? 'monitor' : /校准|calibration|模型/i.test(taskSearchSeed) ? 'calibration' : /日志|请求|request|log/i.test(taskSearchSeed) ? 'logs' : /记忆|memory/i.test(taskSearchSeed) ? 'memory' : 'monitor'} initialQuery={taskSearchSeed} />)}
      {activeTab === 'Workflows' && renderLazyView('MetaOS 工作流', <WorkflowsView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Sandbox' && renderLazyView('隔离沙箱', <SandboxTerminal onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Settings' && renderLazyView('底层设置', <SettingsView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Debt' && renderLazyView('技术债务', <DebtView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'C2G' && renderLazyView('C2G 战略中心', <C2GStrategyView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'McpMesh' && renderLazyView('网格与 MCP', <McpMeshView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Assets' && renderLazyView('技术资产库', <AssetsView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'Protocol' && renderLazyView('协议工作台', <ProtocolWorkbenchView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'QuestBoard' && renderLazyView('积分冒险', <QuestBoard onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'DomainApps' && renderLazyView('应用中心', <DomainAppsView onNavigate={onNavigate} onOpenTarget={onOpenTarget} taskQuery={taskSearchSeed} />)}
      {activeTab === 'Observability' && renderLazyView('运行可观测', <ObservabilityView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'L4Health' && renderLazyView('L4 域健康', <L4HealthView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'AlertCenter' && renderLazyView('告警中心', <AlertCenterPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} initialTab={alertTab || 'active'} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'LogViewer' && renderLazyView('日志查看器', <LogViewerPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
      {activeTab === 'TaskCenter' && renderLazyView('任务中心', <TaskCenterPage initialSearchQuery={taskSearchSeed} incomingDraft={taskCenterIncomingDraft} onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)}
      {activeTab === 'Performance' && renderLazyView('性能监控', <PerformanceMonitorPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId={focusedPageId} focusTaskQuery={taskSearchSeed} />)}
    </div>
  );
}
