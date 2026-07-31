import React, { type RefObject } from 'react';
import { Activity, CheckCircle, History, LayoutDashboard, X } from 'lucide-react';
import type { CockpitNavigationTarget, RecentNavigationEntry } from './cockpitNavigation';
import { COCKPIT_PAGE_REGISTRY } from './cockpitPageRegistry';
import { SIDEBAR_NAV_SECTIONS } from './dashboardConstants';

const PAGE_REGISTRY_BY_ID = new globalThis.Map(COCKPIT_PAGE_REGISTRY.map((page) => [page.id, page] as const));

// ── Types (matching Dashboard.tsx originals) ──

interface PageMaturitySummary {
  score: number;
  ready: number;
  watch: number;
  gap: number;
}

interface PageMaturityItem {
  page_id: string;
  page?: { title?: string };
  status: string;
  score: number;
  next_action?: string;
}

interface SidebarCoverage {
  summary: PageMaturitySummary;
  attentionItems: PageMaturityItem[];
}

interface ProjectPortfolioSummary {
  score?: number;
  blocked?: number;
  at_risk?: number;
  watch?: number;
  healthy?: number;
}

interface SidebarProject {
  id: string;
  status?: string;
  score?: number;
  next_action?: string;
  primary_gap?: string;
}

interface SidebarWeakestDimension {
  id: string;
  title?: string;
  score?: number;
}

interface SidebarProjectPortfolio {
  summary: ProjectPortfolioSummary;
  priorityProjects: SidebarProject[];
  weakestDimensions: SidebarWeakestDimension[];
}

interface SearchUsagePath {
  id: string;
  title?: string;
  intent?: string;
  pages?: Array<{ id?: string; title?: string }>;
  steps?: string[];
  target?: CockpitNavigationTarget;
}

interface SearchTarget {
  id: string;
  tab: string;
  label: string;
  group: string;
  keywords?: string[];
}

interface SearchTaskDraft {
  id: string;
  title: string;
  detail: string;
  badge: string;
  target: CockpitNavigationTarget;
}

// ── Helper functions ──

function maturityStatusText(status: string): string {
  if (status === 'ready') return '就绪';
  if (status === 'watch') return '观察';
  if (status === 'gap') return '缺口';
  return '未知';
}

function portfolioStatusText(status?: string): string {
  if (status === 'blocked') return '阻塞';
  if (status === 'at_risk') return '风险';
  if (status === 'watch') return '观察';
  if (status === 'healthy') return '健康';
  return '未知';
}

function usagePathPreviewText(path: SearchUsagePath): string {
  const pageTitles = (path.pages || [])
    .map((page) => page.title || page.id || '')
    .filter(Boolean)
    .slice(0, 3);
  if (pageTitles.length > 0) return pageTitles.join(' -> ');
  const steps = (path.steps || []).filter(Boolean).slice(0, 3);
  if (steps.length > 0) return steps.join(' -> ');
  return '查看路径步骤';
}

// ── Sub-components ──

function SidebarCoveragePanel({
  coverage,
  onOpenTarget,
}: {
  coverage: SidebarCoverage | null;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
}) {
  if (!coverage) return null;

  const { summary, attentionItems } = coverage;

  return (
    <section className="sidebar-coverage" role="region" aria-label="页面覆盖状态">
      <button className="sidebar-coverage-score" onClick={() => onOpenTarget({ tab: 'SystemMap' })}>
        <span>页面成熟度</span>
        <strong>{summary.score}%</strong>
      </button>
      <div className="sidebar-coverage-counts">
        <span><strong>{summary.ready}</strong> 就绪</span>
        <span><strong>{summary.watch}</strong> 观察</span>
        <span><strong>{summary.gap}</strong> 缺口</span>
      </div>
      <div className="sidebar-coverage-list">
        {attentionItems.slice(0, 3).map((item) => {
          const title = item.page?.title || item.page_id;
          return (
            <button
              key={item.page_id}
              className={`sidebar-coverage-item ${item.status}`}
              aria-label={`打开成熟度缺口页面 ${title}`}
              title={item.next_action}
              onClick={() => onOpenTarget({ tab: 'SystemMap', pageId: item.page_id })}
            >
              <span>{title}</span>
              <small>{maturityStatusText(item.status)} · {item.score}%</small>
            </button>
          );
        })}
        {attentionItems.length === 0 && (
          <div className="sidebar-coverage-complete">
            <CheckCircle size={13} />
            <span>页面层已覆盖</span>
          </div>
        )}
      </div>
    </section>
  );
}

function SidebarProjectPortfolioPanel({
  portfolio,
  onOpenProject,
  onOpenSystemMap,
  onOpenDimension,
}: {
  portfolio: SidebarProjectPortfolio | null;
  onOpenProject: (projectId: string) => void;
  onOpenSystemMap: () => void;
  onOpenDimension: (dimensionId: string) => void;
}) {
  if (!portfolio) return null;

  const { summary, priorityProjects, weakestDimensions } = portfolio;

  return (
    <section className="sidebar-projects" role="region" aria-label="项目覆盖状态">
      <button className="sidebar-projects-score" onClick={onOpenSystemMap}>
        <span>项目覆盖</span>
        <strong>{summary.score ?? 0}%</strong>
      </button>
      <div className="sidebar-projects-counts">
        <span><strong>{summary.blocked ?? 0}</strong> 阻塞</span>
        <span><strong>{summary.at_risk ?? 0}</strong> 风险</span>
        <span><strong>{summary.watch ?? 0}</strong> 观察</span>
        <span><strong>{summary.healthy ?? 0}</strong> 健康</span>
      </div>
      <div className="sidebar-projects-list">
        {priorityProjects.slice(0, 3).map((project) => (
          <button
            key={project.id}
            className={`sidebar-project-item ${project.status || 'unknown'}`}
            aria-label={`打开项目 ${project.id}`}
            title={project.next_action || project.primary_gap}
            onClick={() => onOpenProject(project.id)}
          >
            <span>{project.id}</span>
            <small>{portfolioStatusText(project.status)} · {project.score ?? 0}%</small>
          </button>
        ))}
      </div>
      <div className="sidebar-project-dimensions">
        {weakestDimensions.slice(0, 2).map((dimension) => (
          <button key={dimension.id} onClick={() => onOpenDimension(dimension.id)}>
            {dimension.title || dimension.id} {dimension.score ?? 0}%
          </button>
        ))}
      </div>
    </section>
  );
}

function SidebarUsagePathsPanel({
  paths,
  totalCount,
  activeGroupLabel,
  onOpenTarget,
}: {
  paths: SearchUsagePath[];
  totalCount: number;
  activeGroupLabel: string | null;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
}) {
  if (paths.length === 0) return null;

  return (
    <section className="sidebar-usage-paths" role="region" aria-label="使用路径入口">
      <div className="sidebar-usage-paths-header">
        <strong>{activeGroupLabel ? '当前分区路径' : '使用路径'}</strong>
        <span>{activeGroupLabel ? `${activeGroupLabel} · ${paths.length}/${totalCount}` : `${paths.length} 条`}</span>
      </div>
      <div className="sidebar-usage-paths-list">
        {paths.slice(0, 3).map((path) => (
          <button
            key={path.id}
            className="sidebar-usage-path-item"
            aria-label={`打开使用路径 ${path.title || path.id}`}
            title={path.intent || path.title || path.id}
            onClick={() => onOpenTarget({ tab: 'SystemMap', usagePathId: path.id })}
          >
            <div>
              <span>{path.title || path.id}</span>
              <small>{path.intent || usagePathPreviewText(path)}</small>
            </div>
            <em>{activeGroupLabel || usagePathPreviewText(path)}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function SidebarGroupEntryPanel({
  groupLabel,
  description,
  pages,
  activeTab,
  primaryUsagePath,
  onNavigate,
  onOpenTarget,
}: {
  groupLabel: string | null;
  description: string;
  pages: SearchTarget[];
  activeTab: string;
  primaryUsagePath: SearchUsagePath | null;
  onNavigate: (tab: string) => void;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
}) {
  if (!groupLabel || pages.length === 0) return null;

  return (
    <section className="sidebar-group-entry" role="region" aria-label="当前分区入口">
      <div className="sidebar-group-entry-header">
        <strong>{groupLabel}</strong>
        <span>{pages.length} 页</span>
      </div>
      <p className="sidebar-group-entry-copy">{description}</p>
      <div className="sidebar-group-entry-pages">
        {pages.slice(0, 4).map((page) => (
          <button
            key={page.id}
            type="button"
            className={`sidebar-group-entry-page ${page.tab === activeTab ? 'active' : ''}`}
            aria-label={`打开分区页面 ${page.label}`}
            onClick={() => onNavigate(page.tab)}
          >
            <span>{page.label}</span>
            <small>{page.tab === activeTab ? '当前页' : page.tab}</small>
          </button>
        ))}
      </div>
      {primaryUsagePath && (
        <button
          type="button"
          className="sidebar-group-entry-path"
          aria-label={`打开分区路径 ${primaryUsagePath.title || primaryUsagePath.id}`}
          onClick={() => onOpenTarget({ tab: 'SystemMap', usagePathId: primaryUsagePath.id })}
        >
          <strong>{primaryUsagePath.title || primaryUsagePath.id}</strong>
          <small>{usagePathPreviewText(primaryUsagePath)}</small>
        </button>
      )}
    </section>
  );
}

// ── Main component ──

interface DashboardSidebarProps {
  sidebarRef: RefObject<HTMLElement | null>;
  mobileNavOpen: boolean;
  mobileNavCloseRef: RefObject<HTMLButtonElement | null>;
  onCloseMobile: () => void;
  sidebarCoverage: SidebarCoverage | null;
  sidebarProjectPortfolio: SidebarProjectPortfolio | null;
  sidebarUsagePaths: SearchUsagePath[];
  contextualUsagePaths: SearchUsagePath[];
  activeGroupLabel: string | null;
  activeGroupDescription: string;
  activeGroupPages: SearchTarget[];
  activeTab: string;
  shellActions: SearchTaskDraft[];
  recentNavigation: RecentNavigationEntry[];
  onOpenTarget: (target: CockpitNavigationTarget) => void;
  onOpenSidebarProject: (projectId: string) => void;
  onSetActiveTab: (tab: string) => void;
  onClearRecent: () => void;
  navIconMap: Record<string, React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>>;
}

export function DashboardSidebar({
  sidebarRef,
  mobileNavOpen,
  mobileNavCloseRef,
  onCloseMobile,
  sidebarCoverage,
  sidebarProjectPortfolio,
  sidebarUsagePaths,
  contextualUsagePaths,
  activeGroupLabel,
  activeGroupDescription,
  activeGroupPages,
  activeTab,
  shellActions,
  recentNavigation,
  onOpenTarget,
  onOpenSidebarProject,
  onSetActiveTab,
  onClearRecent,
  navIconMap,
}: DashboardSidebarProps) {
  return (
    <aside ref={sidebarRef} role="complementary" aria-label="控制台侧边栏" className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-box" aria-hidden="true">
          <Activity size={18} />
        </div>
        <h2>Cockpit Console</h2>
        <button
          type="button"
          className="mobile-nav-close"
          ref={mobileNavCloseRef}
          aria-label="关闭主导航"
          onClick={onCloseMobile}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <SidebarCoveragePanel coverage={sidebarCoverage} onOpenTarget={onOpenTarget} />
      <SidebarProjectPortfolioPanel
        portfolio={sidebarProjectPortfolio}
        onOpenProject={onOpenSidebarProject}
        onOpenSystemMap={() => onSetActiveTab('SystemMap')}
        onOpenDimension={(dimensionId) => onOpenTarget({ tab: 'SystemMap', coverageDimensionId: dimensionId })}
      />
      <SidebarUsagePathsPanel
        paths={contextualUsagePaths}
        totalCount={sidebarUsagePaths.length}
        activeGroupLabel={activeGroupLabel}
        onOpenTarget={onOpenTarget}
      />
      <SidebarGroupEntryPanel
        groupLabel={activeGroupLabel}
        description={activeGroupDescription}
        pages={activeGroupPages}
        activeTab={activeTab}
        primaryUsagePath={contextualUsagePaths[0] || null}
        onNavigate={onSetActiveTab}
        onOpenTarget={onOpenTarget}
      />
      {shellActions.length > 0 && (
        <section className="sidebar-action-queue" aria-label="侧边推进队列">
          <div className="sidebar-action-queue-header">
            <strong>推进队列</strong>
            <span>{shellActions.length} 条</span>
          </div>
          <div className="sidebar-action-queue-list">
            {shellActions.map((item) => (
              <button
                key={`sidebar-${item.id}`}
                type="button"
                className="sidebar-action-item"
                aria-label={`侧边推进 ${item.title}`}
                onClick={() => onOpenTarget(item.target)}
              >
                <div>
                  <span>{item.title}</span>
                  <small>{item.detail}</small>
                </div>
                <em>{item.badge}</em>
              </button>
            ))}
          </div>
        </section>
      )}

      {recentNavigation.length > 0 && (
        <section className="sidebar-recent-navigation" aria-label="最近访问">
          <div className="sidebar-recent-navigation-header">
            <strong><History size={14} aria-hidden="true" />最近访问</strong>
            <button type="button" onClick={onClearRecent} aria-label="清空最近访问" title="清空最近访问">清空</button>
          </div>
          <div className="sidebar-recent-navigation-list">
            {recentNavigation.map((entry, index) => (
              <button
                key={`${entry.target.tab}-${entry.label}-${index}`}
                type="button"
                className="sidebar-recent-navigation-item"
                aria-label={`重新打开最近访问 ${entry.label}`}
                onClick={() => onOpenTarget(entry.target)}
              >
                <span>{entry.label}</span>
                <small>{PAGE_REGISTRY_BY_ID.get(entry.target.tab)?.title || entry.target.tab}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      
      <nav aria-label="控制台主导航" className="sidebar-nav" role="menu">
        {SIDEBAR_NAV_SECTIONS.map((section) => (
          <React.Fragment key={section.id}>
            <div className="nav-group-title" id={section.id}>{section.title}</div>
            {section.tabs.map((tab) => {
              const pageMeta = PAGE_REGISTRY_BY_ID.get(tab);
              const Icon = navIconMap[tab] || LayoutDashboard;
              return (
                <button
                  key={tab}
                  role="menuitem"
                  aria-describedby={section.id}
                  aria-selected={activeTab === tab}
                  className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => onSetActiveTab(tab)}
                  style={tab === 'QuestBoard' ? { fontWeight: '500' } : undefined}
                >
                  <Icon size={16} aria-hidden="true" className={tab === 'QuestBoard' ? 'text-warning' : undefined} />
                  <span>{pageMeta?.title || tab}</span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </nav>
    </aside>
  );
}
