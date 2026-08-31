import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  Compass,
  Copy,
  ExternalLink,
  Layers,
  Map as MapIcon,
  Network,
  Route,
  Search,
  Send,
  Server,
  ShieldAlert,
} from 'lucide-react';
import SummaryTileGrid from '../common/SummaryTileGrid';
import type {
  CapabilityGapClosureRow,
  CockpitNavigationTarget,
  DraftTask,
  FeatureDomain,
  PageMaturity,
  ProjectAction,
  ProjectItem,
  ProjectPortfolioPriority,
  ProjectTriageQueue,
  RoadmapItem,
  SourceRef,
  SystemMapPayload,
  SystemMapWorkbenchRow,
  UsagePath,
} from './types';
import {
  closeoutText,
  copyText,
  coverageCountLabel,
  coverageStatusText,
  draftSourceLabel,
  openSystemMapTarget,
  pageMaturityStatusText,
  portfolioStatusText,
  projectStatusText,
  runtimeStatusText,
  shortDate,
  statusClass,
  verifyText,
  withTaskDraftHandoff,
} from './utils';
import PageButton from './PageButton';
import SourceRefList from './SourceRefList';
import ProjectActionList from './ProjectActionList';
import ProjectTriageQueues from './ProjectTriageQueues';

type SystemMapGraphProps = {
  systemMap: SystemMapPayload;
  draftTasks: DraftTask[];
  gapClosureRows: CapabilityGapClosureRow[];
  systemMapWorkbenchRows: SystemMapWorkbenchRow[];
  activeUsagePath: UsagePath | null;
  activeUsagePlaybooks: SystemMapPayload['playbooks'];
  activeUsageDomains: FeatureDomain[];
  activeUsageRoadmap: RoadmapItem[];
  activeUsageProjects: ProjectItem[];
  activeUsageTriageCommands: ProjectAction[];
  activeUsageDrafts: DraftTask[];
  projectEntryRows: { priority: ProjectPortfolioPriority; project: ProjectItem; page: SystemMapPayload['cockpit_pages'][number] | null; primaryDimension: ProjectItem['portfolio']['non_ready_dimensions'][number] | null; draft: DraftTask | null; draftTarget: { tab: string; taskQuery: string; draftKey?: string } }[];
  projectEntrySummary: { mapped: number; drafts: number; blocked: number };
  activeRepairDimension: SystemMapPayload['project_capability_coverage']['dimension_summary'][number] | null;
  dimensionRepairRows: { attention: SystemMapPayload['project_capability_coverage']['dimension_summary'][number]['attention_projects'][number]; project: ProjectItem; check?: ProjectItem['coverage_checks'][number]; commands: ProjectAction[] }[];
  filteredProjects: ProjectItem[];
  coverageMatrixRows: { project: ProjectItem; checks: ProjectItem['coverage_checks']; ready: number; warning: number; failed: number }[];
  filteredTriageQueues: ProjectTriageQueue[];
  filteredTriageCommandCount: number;
  runtimeProbeSummary: { runtimeProjects: number; stopped: number; pendingApproval: number; approved: number; commands: number };
  pageMaturity: PageMaturity[];
  pageMaturitySummary: { ready: number; watch: number; gap: number; tracked: number; untracked: number; roadmapShipped: number };
  visiblePageMaturity: PageMaturity[];
  selectedFeatureDomain: FeatureDomain | null;
  selectedFeatureDomainId: string | null;
  capabilityBuildBacklog: {
    pagesWithoutUsage: PageMaturity[];
    pagesWithoutDomain: PageMaturity[];
    plannedRoadmapItems: RoadmapItem[];
    gapItems: SystemMapPayload['gaps'];
    domainAttention: SystemMapPayload['domain_apps']['attention_items'];
    actionableDrafts: DraftTask[];
  };
  buildControlTower: {
    pageItems: PageMaturity[];
    domainContractItems: SystemMapPayload['domain_apps']['items'];
    verificationItems: ({ kind: 'draft'; task: DraftTask; project: ProjectItem | null } | { kind: 'project'; project: ProjectPortfolioPriority })[];
    priorityItems: ({ kind: 'project'; project: ProjectPortfolioPriority } | { kind: 'roadmap'; roadmap: RoadmapItem })[];
  };
  activeSourceTarget: string;
  pendingActionKey: string | null;
  bulkTriagePending: boolean;
  selectedVisibleProjectIds: string[];
  coverageDimensions: { id: string; title: string; description: string }[];
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onSetSelectedGapId: (id: string | null) => void;
  onSetSelectedUsagePathId: (id: string | null) => void;
  onSetSelectedPageMaturityId: (id: string | null) => void;
  onSetSelectedFeatureDomainId: (id: string | null) => void;
  onSetCoverageFilter: (dimensionId: string) => void;
  onSetPortfolioFilter: (bucketId: string) => void;
  onSetProjectFilter: (filter: string) => void;
  onSetProjectQuery: (query: string) => void;
  onQueueProjectAction: (projectId: string, action: ProjectAction) => void;
  onQueueProjectTriageCommand: (command: ProjectAction) => void;
  onPromoteDraftTask: (task: DraftTask) => void;
  onQueueCoverageDrafts: () => void;
  onQueueVerificationTriage: () => void;
  onQueueRuntimeTriage: () => void;
  onExecuteVerificationTriage: () => void;
  onExecuteRuntimeTriage: () => void;
  onSetSelectedProjectIds: (ids: string[]) => void;
};

function SystemMapGraph({
  systemMap,
  draftTasks,
  gapClosureRows,
  systemMapWorkbenchRows,
  activeUsagePath,
  activeUsagePlaybooks,
  activeUsageDomains,
  activeUsageRoadmap,
  activeUsageProjects,
  activeUsageTriageCommands,
  activeUsageDrafts,
  projectEntryRows,
  projectEntrySummary,
  activeRepairDimension,
  dimensionRepairRows,
  filteredProjects,
  coverageMatrixRows,
  filteredTriageQueues,
  filteredTriageCommandCount,
  runtimeProbeSummary,
  pageMaturity,
  pageMaturitySummary,
  visiblePageMaturity,
  selectedFeatureDomain,
  selectedFeatureDomainId,
  capabilityBuildBacklog,
  buildControlTower,
  activeSourceTarget,
  pendingActionKey,
  bulkTriagePending,
  selectedVisibleProjectIds,
  coverageDimensions,
  onNavigate,
  onOpenTarget,
  onInspect,
  onSetSelectedProjectId,
  onSetSelectedGapId,
  onSetSelectedUsagePathId,
  onSetSelectedPageMaturityId,
  onSetSelectedFeatureDomainId,
  onSetCoverageFilter,
  onSetPortfolioFilter,
  onSetProjectFilter,
  onSetProjectQuery,
  onQueueProjectAction,
  onQueueProjectTriageCommand,
  onPromoteDraftTask,
  onQueueCoverageDrafts,
  onQueueVerificationTriage,
  onQueueRuntimeTriage,
  onExecuteVerificationTriage,
  onExecuteRuntimeTriage,
  onSetSelectedProjectIds,
}: SystemMapGraphProps) {
  const pagesById = new Map(systemMap.cockpit_pages.map((p) => [p.id, p]));

  const systemSummaryTiles = [
    { id: 'cockpit-pages', title: 'Cockpit 页面', value: systemMap.summary.cockpit_pages, icon: <MapIcon size={20} />, iconClassName: 'pulse-accent' },
    { id: 'layers', title: '架构层级', value: systemMap.summary.layers, icon: <Layers size={20} />, iconClassName: 'pulse-success' },
    { id: 'running-projects', title: '运行项目', value: `${systemMap.summary.running_projects} / ${systemMap.summary.projects}`, description: `无需常驻 ${systemMap.summary.not_applicable_projects}`, icon: <Network size={20} />, iconClassName: 'pulse-info' },
    { id: 'gaps', title: '待补能力', value: systemMap.summary.gaps, icon: <AlertTriangle size={20} />, iconClassName: 'pulse-warning' },
    { id: 'source-refs', title: '来源定位', value: systemMap.summary.source_refs, icon: <ExternalLink size={20} />, iconClassName: 'pulse-info' },
    { id: 'actions', title: '受控动作', value: systemMap.summary.project_actions, icon: <Copy size={20} />, iconClassName: 'pulse-success' },
    { id: 'projects-needing-action', title: '项目待处理', value: systemMap.summary.projects_needing_action, icon: <AlertTriangle size={20} />, iconClassName: 'pulse-warning' },
    { id: 'coverage-score', title: '覆盖分', value: `${systemMap.summary.project_coverage_score}%`, icon: <ShieldAlert size={20} />, iconClassName: 'pulse-success' },
    { id: 'triage-commands', title: '排查命令', value: systemMap.summary.project_triage_commands, icon: <ClipboardCheck size={20} />, iconClassName: 'pulse-info' },
    { id: 'domain-apps', title: '领域应用', value: `${systemMap.summary.domain_apps} · ${systemMap.summary.domain_app_score}%`, icon: <ExternalLink size={20} />, iconClassName: 'pulse-accent' },
  ];

  return (
    <>
      <SummaryTileGrid className="system-map-summary-grid" items={systemSummaryTiles} minColumnWidth={180} />

      {/* Gap closure rows */}
      {gapClosureRows.length > 0 && (
        <section className="services-section system-map-section system-map-build-backlog" aria-label="能力缺口承接总表">
          <div className="section-header">
            <div>
              <h2>能力缺口承接总表</h2>
              <p className="text-muted">每个缺口都要能落到页面、项目或任务，不再只停在一句"缺功能"。</p>
            </div>
            <span className="status-badge degraded"><ShieldAlert size={13} />{gapClosureRows.length} 个显性缺口</span>
          </div>
          <div className="system-map-build-summary">
            <span><strong>{gapClosureRows.length}</strong> 缺口总数</span>
            <span><strong>{gapClosureRows.filter((row) => row.page).length}</strong> 已挂页面</span>
            <span><strong>{gapClosureRows.reduce((count, row) => count + row.projects.length, 0)}</strong> 待跟项目</span>
            <span><strong>{gapClosureRows.filter((row) => row.draft).length}</strong> 已有草稿</span>
          </div>
          <div className="system-map-gap-closure-grid">
            {gapClosureRows.map((row) => (
              <article className="system-map-gap-closure-card" key={row.gap.id}>
                <div className="dashboard-page-workbench-head">
                  <div><span>能力缺口 · {row.scope}</span><strong>{row.gap.title}</strong></div>
                  <em className={`status-badge ${statusClass(row.gap.severity)}`}>{row.gap.severity}</em>
                </div>
                <p>{row.gap.evidence}</p>
                <div className="system-map-page-focus-links system-map-gap-closure-links">
                  <span>页面 {row.page?.page.title || '待挂'}</span>
                  <span>项目 {row.projects[0]?.id || '待定'}</span>
                  <span>任务 {row.draft ? '已承接' : '待承接'}</span>
                </div>
                <div className="dashboard-page-workbench-detail"><span>下一步</span><strong>{row.nextAction}</strong></div>
                <div className="dashboard-page-workbench-detail"><span>配套入口</span><strong>路径 {row.usagePaths.length} · 清单 {row.playbooks.length} · 路线图 {row.roadmapItems.length}</strong></div>
                <div className="dashboard-page-workbench-actions">
                  <button type="button" className="antd-btn" onClick={() => onSetSelectedGapId(row.gap.id)}><span>定位缺口</span></button>
                  {row.page && (<button type="button" className="antd-btn" onClick={() => openSystemMapTarget({ tab: row.page?.page.id || 'SystemMap', gapId: row.gap.id }, onNavigate, onOpenTarget)}><ArrowRight size={14} /><span>查看页面</span></button>)}
                  {row.projects[0] && (<button type="button" className="antd-btn" onClick={() => onSetSelectedProjectId(row.projects[0].id)}><span>查看项目</span></button>)}
                  <button type="button" className="antd-btn" onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: row.taskQuery }, draftTasks), onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>打开任务</span></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Workbench rows */}
      {systemMapWorkbenchRows.length > 0 && (
        <section className="services-section system-map-section dashboard-page-workbench" role="region" aria-label="系统地图闭环工作台">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>系统地图闭环工作台</h2>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>把当前路径、页面、能力域、项目和缺口压成一层闭环动作面，方便从系统地图直接跳去真正的承接页。</p>
            </div>
            <span className="status-badge degraded">当前 {systemMapWorkbenchRows.length} 个闭环位</span>
          </div>
          <div className="dashboard-page-workbench-grid">
            {systemMapWorkbenchRows.map((row) => (
              <article key={row.id} className="dashboard-page-workbench-card" aria-label={`系统地图闭环 ${row.title}`}>
                <div className="dashboard-page-workbench-head">
                  <div><span>{row.laneLabel}</span><strong>{row.title}</strong></div>
                  <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                </div>
                <p>{row.summary}</p>
                <div className="dashboard-page-workbench-detail"><span>下一步</span><strong>{row.nextAction}</strong></div>
                <div className="dashboard-page-workbench-detail"><span>验收线索</span><strong>{row.evidence}</strong></div>
                <div className="dashboard-page-workbench-actions">
                  <button type="button" className="antd-btn" aria-label={`打开系统地图闭环对象 ${row.title}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff(row.primaryTarget, draftTasks), onNavigate, onOpenTarget)}><ArrowRight size={14} /><span>{row.primaryLabel}</span></button>
                  {row.secondaryTarget && row.secondaryLabel && (
                    <button type="button" className="antd-btn" aria-label={`打开系统地图闭环动作 ${row.title}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff(row.secondaryTarget || { tab: 'SystemMap' }, draftTasks), onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>{row.secondaryLabel}</span></button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Usage path console */}
      {activeUsagePath && (
        <section className="services-section system-map-section system-map-usage-console">
          <div className="section-header">
            <div><h2>使用路径工作台</h2><p className="text-muted">先选目标，再看它覆盖哪些页面、清单、能力域和待补路线图。</p></div>
            <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: 'TaskCenter', usagePathId: activeUsagePath.id, taskQuery: activeUsagePath.id }, onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>任务草稿</span></button>
          </div>
          <div className="system-map-usage-console-grid">
            <div className="system-map-usage-picker" role="list" aria-label="使用路径选择">
              {systemMap.usage_paths.map((path) => (
                <button key={path.id} className={`system-map-usage-choice ${activeUsagePath.id === path.id ? 'active' : ''}`} onClick={() => onSetSelectedUsagePathId(path.id)} title={path.intent}>
                  <span>{path.title}</span><small>{path.pages.map((page) => page.title).join(' -> ')}</small>
                </button>
              ))}
            </div>
            <article className="system-map-usage-active">
              <div className="system-map-usage-active-head">
                <div><h3>{activeUsagePath.title}</h3><p>{activeUsagePath.intent}</p></div>
                <div className="system-map-usage-kpis">
                  <span><strong>{activeUsagePath.pages.length}</strong> 覆盖页</span>
                  <span><strong>{activeUsagePlaybooks.length}</strong> 相关清单</span>
                  <span><strong>{activeUsageDomains.length}</strong> 能力域</span>
                  <span><strong>{activeUsageRoadmap.length}</strong> 路线图</span>
                </div>
              </div>
              <div className="system-map-usage-page-chain">
                {activeUsagePath.pages.map((page, index) => (
                  <React.Fragment key={page.id}>
                    {index > 0 && <ArrowRight size={13} className="text-muted" />}
                    <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={activeUsagePath.id} />
                  </React.Fragment>
                ))}
              </div>
              <div className="system-map-usage-detail-grid">
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head"><h4>相关清单</h4><span>{activeUsagePlaybooks.length}</span></div>
                  {activeUsagePlaybooks.slice(0, 3).map((playbook) => (
                    <div className="system-map-usage-playbook" key={playbook.id}>
                      <strong>{playbook.title}</strong><small>{playbook.goal}</small>
                      <div className="system-map-usage-mini-steps">
                        {playbook.steps.slice(0, 4).map((step, index) => (
                          <button key={step.id} onClick={() => openSystemMapTarget({ tab: step.page.id, taskQuery: playbook.id }, onNavigate, onOpenTarget)} title={step.done_when}>{index + 1}. {step.page.title}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head"><h4>能力域</h4><span>{activeUsageDomains.length}</span></div>
                  {activeUsageDomains.length > 0 ? (
                    activeUsageDomains.slice(0, 4).map((domain) => (
                      <button className="system-map-usage-domain" key={domain.id} onClick={() => openSystemMapTarget({ tab: domain.cockpit_page, featureDomainId: domain.id }, onNavigate, onOpenTarget)}>
                        <strong>{domain.title}</strong><small>{domain.providers.slice(0, 3).join(' · ') || domain.english}</small>
                      </button>
                    ))
                  ) : (<span className="system-map-usage-empty">暂无直接映射能力域</span>)}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head"><h4>路线图与缺口</h4><span>{activeUsageRoadmap.length + Math.min(systemMap.gaps.length, 2)}</span></div>
                  {activeUsageRoadmap.slice(0, 3).map((item) => (
                    <button className="system-map-usage-roadmap" key={item.id} onClick={() => openSystemMapTarget({ tab: item.cockpit_page, taskQuery: item.id }, onNavigate, onOpenTarget)} title={item.problem}>
                      <span className={`status-badge ${statusClass(item.status)}`}>{item.priority}</span><strong>{item.title}</strong>
                    </button>
                  ))}
                  {systemMap.gaps.slice(0, 2).map((gap) => (
                    <div className="system-map-usage-gap" key={gap.id}><span className={`status-badge ${statusClass(gap.severity)}`}>{gap.severity}</span><small>{gap.title}</small></div>
                  ))}
                </div>
              </div>
              <div className="system-map-usage-execute-grid">
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head"><h4>相关项目</h4><span>{activeUsageProjects.length}</span></div>
                  {activeUsageProjects.length > 0 ? (
                    activeUsageProjects.slice(0, 4).map((project) => (
                      <button className={`system-map-usage-project ${statusClass(project.portfolio.status)}`} key={`usage-project-${project.id}`} onClick={() => onSetSelectedProjectId(project.id)} title={project.portfolio.next_action}>
                        <div className="system-map-usage-meta"><strong>{project.id}</strong><span>{project.layer} · {project.role || project.stack}</span></div>
                        <small>{portfolioStatusText(project.portfolio.status)} · {project.portfolio.primary_gap}</small>
                      </button>
                    ))
                  ) : (<span className="system-map-usage-empty">这条路径暂时还没绑定项目对象</span>)}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head"><h4>排查命令</h4><span>{activeUsageTriageCommands.length}</span></div>
                  {activeUsageTriageCommands.length > 0 ? (
                    activeUsageTriageCommands.slice(0, 4).map((command) => (
                      <button className={`system-map-usage-command ${statusClass(command.risk)}`} disabled={!command.enabled} key={`usage-command-${command.project_id || 'global'}-${command.id}`} onClick={() => void copyText(command.value)} title={command.guard}>
                        <div className="system-map-usage-meta"><strong>{command.project_id || '项目'} · {command.label}</strong><span>{command.reason || command.category || '排查命令'}</span></div>
                        <code>{command.value}</code>
                      </button>
                    ))
                  ) : (<span className="system-map-usage-empty">这条路径下暂无可复制排查命令</span>)}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head">
                    <h4>任务草稿</h4>
                    <button className="antd-btn small" onClick={() => openSystemMapTarget({ tab: 'TaskCenter', usagePathId: activeUsagePath.id, taskQuery: activeUsagePath.id }, onNavigate, onOpenTarget)}><ClipboardCheck size={13} /><span>全部草稿</span></button>
                  </div>
                  {activeUsageDrafts.length > 0 ? (
                    activeUsageDrafts.slice(0, 4).map((task) => (
                      <div className="system-map-usage-draft" key={task.id}>
                        <button className={`system-map-usage-draft-main ${statusClass(task.priority || 'medium')}`} onClick={() => {
                          if (task.draft?.copy_text) { void copyText(task.draft.copy_text); return; }
                          openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', usagePathId: activeUsagePath.id, taskQuery: task.source?.id || task.id || activeUsagePath.id }, draftTasks), onNavigate, onOpenTarget);
                        }} title={task.draft?.guard || '复制草稿'}>
                          <div className="system-map-usage-meta"><strong>{task.title}</strong><span>{draftSourceLabel(task.source?.type)} · {task.source?.title || task.source?.id || '草稿来源'}</span></div>
                          {task.description && <small>{task.description}</small>}
                        </button>
                        <div className="system-map-usage-draft-foot">
                          <span className={`status-badge ${statusClass(task.priority || 'medium')}`}>{task.priority || 'medium'}</span>
                          <small>{task.draft?.step_count ? `${task.draft.step_count} 步` : '只读草稿'}</small>
                          {task.read_only && task.source?.type && (
                            <button type="button" className="antd-btn small" aria-label={`承接为正式计划任务 ${task.title}`} title="承接为正式计划任务" disabled={pendingActionKey === `draft:${task.id}` || Boolean(pendingActionKey) || bulkTriagePending} onClick={() => onPromoteDraftTask(task)}>
                              <ClipboardCheck size={12} /><span>{pendingActionKey === `draft:${task.id}` ? '承接中' : '承接任务'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (<span className="system-map-usage-empty">这条路径下暂无匹配草稿</span>)}
                </div>
              </div>
              <SourceRefList refs={activeUsagePath.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
            </article>
          </div>
        </section>
      )}

      {/* Portfolio section */}
      <section className="services-section system-map-section system-map-portfolio">
        <div className="section-header">
          <div><h2>项目组合态势</h2><p className="text-muted">把项目覆盖、运行、验证和工作流证据折成优先级，先处理最影响日用的面。</p></div>
          <span className={`status-badge ${statusClass(systemMap.project_portfolio.summary.status)}`}><ShieldAlert size={13} />{portfolioStatusText(systemMap.project_portfolio.summary.status)}</span>
        </div>
        <div className="system-map-portfolio-grid">
          <article className={`system-map-portfolio-score ${statusClass(systemMap.project_portfolio.summary.status)}`}>
            <span>组合分</span><strong>{systemMap.project_portfolio.summary.score}%</strong>
            <small>阻塞 {systemMap.project_portfolio.summary.blocked} · 风险 {systemMap.project_portfolio.summary.at_risk} · 观察 {systemMap.project_portfolio.summary.watch}</small>
          </article>
          <div className="system-map-portfolio-buckets">
            {systemMap.project_portfolio.buckets.map((bucket) => (
              <button className={`system-map-portfolio-bucket ${systemMap.project_portfolio.buckets.findIndex(b => b.id === bucket.id) === systemMap.project_portfolio.buckets.findIndex(b => b.id === bucket.id) ? '' : ''} ${statusClass(bucket.severity)}`} key={bucket.id} onClick={() => onSetPortfolioFilter(bucket.id)} title={bucket.reason}>
                <span>{bucket.title}</span><strong>{bucket.count}</strong><small>{bucket.project_ids.slice(0, 4).join(' · ') || '暂无项目'}</small>
              </button>
            ))}
          </div>
          <div className="system-map-portfolio-priority">
            <div className="system-map-portfolio-subhead"><h3>优先项目</h3><span>{systemMap.project_portfolio.summary.priority_projects}</span></div>
            {systemMap.project_portfolio.priority_projects.slice(0, 5).map((project) => (
              <button className={`system-map-portfolio-priority-card ${statusClass(project.status)}`} key={project.id} onClick={() => onSetSelectedProjectId(project.id)} title={project.next_action}>
                <div><strong>{project.id}</strong><span>{project.layer} · {portfolioStatusText(project.status)} · {project.score}%</span></div>
                <p>{project.primary_gap}</p><small>{project.next_action}</small>
                {project.non_ready_dimensions.length > 0 && (
                  <div className="system-map-portfolio-tags">
                    {project.non_ready_dimensions.slice(0, 4).map((dimension) => (<em className={statusClass(dimension.status)} key={`${project.id}-${dimension.id}`}>{dimension.title}</em>))}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="system-map-portfolio-weak">
            <div className="system-map-portfolio-subhead"><h3>薄弱维度</h3><span>{systemMap.project_portfolio.summary.weakest_dimensions}</span></div>
            {systemMap.project_portfolio.weakest_dimensions.slice(0, 4).map((dimension) => (
              <button className={`system-map-portfolio-dimension ${statusClass(dimension.status)}`} key={dimension.id} aria-label={`筛选薄弱维度：${dimension.title}`} onClick={() => onSetCoverageFilter(dimension.id)} title={dimension.description}>
                <span>{dimension.title}</span><strong>{dimension.score}%</strong><small>缺口 {dimension.failed} · 提醒 {dimension.warning}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Entry mapping */}
      <section className="services-section system-map-section system-map-portfolio" role="region" aria-label="项目入口映射总表">
        <div className="section-header">
          <div><h2>项目入口映射总表</h2><p className="text-muted">把优先项目直接映射到 Cockpit 入口、覆盖维度和任务承接位，避免项目只挂在总览里不落到可操作入口。</p></div>
          <span className={`status-badge ${statusClass(systemMap.project_portfolio.summary.status)}`}><Route size={13} />已挂 {projectEntrySummary.mapped} / {projectEntryRows.length}</span>
        </div>
        <SummaryTileGrid className="system-map-summary-grid" minColumnWidth={180} items={[
          { id: 'entry-priority-projects', title: '优先项目', value: `${projectEntryRows.length}`, description: '当前项目组合里最影响日用的对象。' },
          { id: 'entry-mapped-projects', title: '已挂入口', value: `${projectEntrySummary.mapped}`, description: '已登记 Cockpit 页面入口的优先项目数。' },
          { id: 'entry-draft-projects', title: '待补草稿', value: `${projectEntrySummary.drafts}`, description: '已经存在任务草稿承接的优先项目数。' },
          { id: 'entry-blocked-projects', title: '阻塞项目', value: `${projectEntrySummary.blocked}`, description: '当前仍处于 blocked 的优先项目数。' },
        ]} />
        <div className="system-map-portfolio-priority">
          <div className="system-map-portfolio-subhead"><h3>入口映射</h3><span>{projectEntryRows.length}</span></div>
          {projectEntryRows.length > 0 ? (
            projectEntryRows.map(({ priority, project, page, primaryDimension, draft, draftTarget }) => (
              <article className={`system-map-portfolio-priority-card ${statusClass(priority.status)}`} key={`entry-${project.id}`}>
                <div><strong>{project.id}</strong><span>{project.layer} · {page ? `${page.title} / ${page.group}` : '未登记入口'} · {portfolioStatusText(priority.status)}</span></div>
                <p>{priority.primary_gap}</p><small>{project.portfolio.next_action}</small>
                <div className="system-map-portfolio-tags">
                  <em className={statusClass(priority.status)}>入口 {page ? page.id : project.cockpit_page || '未登记'}</em>
                  <em className={statusClass(project.runtime.status)}>运行 {runtimeStatusText(project.runtime.status)}</em>
                  <em className={statusClass(project.runtime.latest_verification.status)}>验证 {verifyText(project.runtime.latest_verification.status)}</em>
                  {primaryDimension && (<em className={statusClass(primaryDimension.status)}>缺口 {primaryDimension.title}</em>)}
                  {draft && (<em className="ready">草稿 {draft.title}</em>)}
                </div>
                <div className="system-map-page-focus-actions-grid">
                  {page && (<button className="system-map-page-focus-action" onClick={() => openSystemMapTarget({ tab: page.id, projectId: project.id }, onNavigate, onOpenTarget)}><span>打开项目入口</span><small>{page.title}</small></button>)}
                  <button className="system-map-page-focus-action" onClick={() => openSystemMapTarget({ tab: 'SystemMap', projectId: project.id }, onNavigate, onOpenTarget)}><span>查看项目覆盖</span><small>{project.portfolio.ready} 就绪 · {project.portfolio.failed} 缺口</small></button>
                  <button className="system-map-page-focus-action" onClick={() => openSystemMapTarget(draftTarget, onNavigate, onOpenTarget)}><span>打开项目任务</span><small>{draft?.title || project.portfolio.next_action}</small></button>
                  {primaryDimension && (<button className="system-map-page-focus-action" onClick={() => openSystemMapTarget({ tab: 'SystemMap', coverageDimensionId: primaryDimension.id, projectId: project.id }, onNavigate, onOpenTarget)}><span>定位缺口维度</span><small>{primaryDimension.title}</small></button>)}
                </div>
              </article>
            ))
          ) : (<span className="text-muted">当前还没有需要映射的优先项目。</span>)}
        </div>
      </section>

      {/* Dimension workbench */}
      {activeRepairDimension && (
        <section className="services-section system-map-section system-map-dimension-workbench" aria-label="项目维度修复台">
          <div className="section-header">
            <div><h2>项目维度修复台</h2><p className="text-muted">按最薄弱维度组织项目、下一步和排查命令，选中维度会同步过滤下方项目矩阵。</p></div>
            <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: 'TaskCenter', coverageDimensionId: activeRepairDimension.id, taskQuery: activeRepairDimension.id }, onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>任务中心</span></button>
          </div>
          <div className="system-map-dimension-workbench-grid">
            <div className="system-map-dimension-picker" role="list" aria-label="项目覆盖维度">
              {systemMap.project_capability_coverage.dimension_summary.map((dimension) => (
                <button className={`system-map-dimension-choice ${activeRepairDimension.id === dimension.id ? 'active' : ''} ${statusClass(dimension.status)}`} key={dimension.id} onClick={() => onSetCoverageFilter(dimension.id)} title={dimension.description}>
                  <span>{dimension.title}</span><strong>{dimension.score}%</strong><small>缺口 {dimension.failed} · 提醒 {dimension.warning}</small>
                </button>
              ))}
            </div>
            <article className={`system-map-dimension-active ${statusClass(activeRepairDimension.status)}`}>
              <div className="system-map-dimension-active-head">
                <div>
                  <span className={`status-badge ${statusClass(activeRepairDimension.status)}`}>{activeRepairDimension.status}</span>
                  <h3>{activeRepairDimension.title}</h3><p>{activeRepairDimension.description}</p>
                </div>
                <div className="system-map-dimension-kpis">
                  <span><strong>{activeRepairDimension.score}%</strong> 维度分</span>
                  <span><strong>{activeRepairDimension.ready}</strong> 就绪</span>
                  <span><strong>{activeRepairDimension.warning}</strong> 提醒</span>
                  <span><strong>{activeRepairDimension.failed}</strong> 缺口</span>
                </div>
              </div>
              <div className="system-map-dimension-projects">
                {dimensionRepairRows.length > 0 ? (
                  dimensionRepairRows.slice(0, 6).map(({ attention, project, check, commands }) => (
                    <div className={`system-map-dimension-project ${statusClass(attention.status)}`} key={`${activeRepairDimension.id}-${project.id}`}>
                      <button className="system-map-dimension-project-name" onClick={() => onSetSelectedProjectId(project.id)} aria-label={`查看 ${project.id} 维度修复详情`}>
                        <strong>{project.id}</strong><span>{project.layer} · {project.role || project.stack}</span>
                      </button>
                      <div className="system-map-dimension-project-body">
                        <span className={`status-badge ${statusClass(attention.status)}`}>{attention.status}</span>
                        <small>{check?.detail || attention.next_action}</small><strong>{check?.next_action || attention.next_action}</strong>
                      </div>
                      <div className="system-map-dimension-command-list">
                        {commands.length > 0 ? (
                          commands.slice(0, 2).map((command) => (
                            <button className={`system-map-dimension-command ${statusClass(command.risk)}`} disabled={!command.enabled} key={`${project.id}-${activeRepairDimension.id}-${command.id}`} onClick={() => void copyText(command.value)} title={command.guard}>
                              <Copy size={12} /><span><strong>{command.label}</strong><code>{command.value}</code></span>
                            </button>
                          ))
                        ) : (<span className="text-muted">暂无排查命令</span>)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="system-map-dimension-empty"><CheckCircle size={14} /><span>这个维度当前没有待处理项目</span></div>
                )}
              </div>
            </article>
          </div>
        </section>
      )}

      {/* Build control tower */}
      <section className="services-section system-map-section system-map-build-backlog" aria-label="统一建设控制台">
        <div className="section-header">
          <div><h2>统一建设控制台</h2><p className="text-muted">把页面能力、领域挂载合同、验证补证和路线图优先项拉到一张桌子上，先做真正影响日用的建设动作。</p></div>
          <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: 'TaskCenter', taskQuery: buildControlTower.priorityItems[0]?.id || buildControlTower.pageItems[0]?.page.id || '建设' }, onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>统一承接到任务中心</span></button>
        </div>
        <div className="system-map-build-summary">
          <span><strong>{buildControlTower.pageItems.length}</strong> 页面补位</span>
          <span><strong>{buildControlTower.domainContractItems.length}</strong> 领域合同</span>
          <span><strong>{buildControlTower.verificationItems.length}</strong> 验证补证</span>
          <span><strong>{buildControlTower.priorityItems.length}</strong> 项目与路线图</span>
        </div>
        <div className="system-map-build-grid">
          <article className="system-map-build-column">
            <div className="system-map-build-head"><strong>页面能力建设</strong><span>{buildControlTower.pageItems.length}</span></div>
            <div className="system-map-build-list">
              {buildControlTower.pageItems.map((item) => (
                <button key={`control-page-${item.page.id}`} className="system-map-build-item" aria-label={`打开页面建设项 ${item.page.id}`} onClick={() => onSetSelectedPageMaturityId(item.page.id)}>
                  <strong>{item.page.title}</strong><span>{pageMaturityStatusText(item.status)} · {item.score}% · 路径 {item.usagePaths.length} · 能力域 {item.domains.length}</span><small>{item.nextAction}</small>
                </button>
              ))}
              {buildControlTower.pageItems.length === 0 && (<div className="system-map-build-empty">当前没有待建设页面</div>)}
            </div>
          </article>
          <article className="system-map-build-column">
            <div className="system-map-build-head"><strong>领域挂载合同</strong><span>{buildControlTower.domainContractItems.length}</span></div>
            <div className="system-map-build-list">
              {buildControlTower.domainContractItems.map((app) => (
                <button key={`control-domain-${app.id}`} className="system-map-build-item" aria-label={`打开领域合同项 ${app.id}`} onClick={() => openSystemMapTarget({ tab: 'DomainApps', taskQuery: app.id }, onNavigate, onOpenTarget)}>
                  <strong>{app.name}</strong><span>{app.integration_mode} · 运行 {app.runtime_status} · 安全 {app.security_posture}</span><small>{app.next_action}</small>
                </button>
              ))}
              {buildControlTower.domainContractItems.length === 0 && (<div className="system-map-build-empty">当前没有待收口的领域挂载合同</div>)}
            </div>
          </article>
          <article className="system-map-build-column">
            <div className="system-map-build-head"><strong>验证与补证</strong><span>{buildControlTower.verificationItems.length}</span></div>
            <div className="system-map-build-list">
              {buildControlTower.verificationItems.map((item) => (
                item.kind === 'draft' ? (
                  <button key={`control-verify-draft-${item.task.id}`} className="system-map-build-item" aria-label={`打开验证补证 ${item.task.source?.id || item.task.id}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: item.task.source?.id || item.task.id }, draftTasks), onNavigate, onOpenTarget)}>
                    <strong>{item.task.title}</strong><span>{item.project?.id || item.task.source?.id} · {draftSourceLabel(item.task.source?.type)}</span><small>{item.task.description || item.project?.portfolio.next_action || '进入任务中心承接验证补证。'}</small>
                  </button>
                ) : (
                  <button key={`control-verify-project-${item.project.id}`} className="system-map-build-item" aria-label={`打开验证项目 ${item.project.id}`} onClick={() => onSetSelectedProjectId(item.project.id)}>
                    <strong>{item.project.id}</strong><span>验证 {item.project.verification_status} · {item.project.primary_gap}</span><small>{item.project.next_action}</small>
                  </button>
                )
              ))}
              {buildControlTower.verificationItems.length === 0 && (<div className="system-map-build-empty">当前没有待补证项目</div>)}
            </div>
          </article>
          <article className="system-map-build-column">
            <div className="system-map-build-head"><strong>项目与路线图优先项</strong><span>{buildControlTower.priorityItems.length}</span></div>
            <div className="system-map-build-list">
              {buildControlTower.priorityItems.map((item) => (
                item.kind === 'project' ? (
                  <button key={`control-priority-project-${item.project.id}`} className="system-map-build-item" aria-label={`打开优先项目 ${item.project.id}`} onClick={() => onSetSelectedProjectId(item.project.id)}>
                    <strong>{item.project.id}</strong><span>项目组合 · {item.project.status} · 分数 {item.project.score}%</span><small>{item.project.next_action}</small>
                  </button>
                ) : (
                  <button key={`control-priority-roadmap-${item.roadmap.id}`} className="system-map-build-item" aria-label={`打开路线图优先项 ${item.roadmap.id}`} onClick={() => openSystemMapTarget({ tab: item.roadmap.cockpit_page, taskQuery: item.roadmap.id }, onNavigate, onOpenTarget)}>
                    <strong>{item.roadmap.title}</strong><span>路线图 · {item.roadmap.priority} · {item.roadmap.status}</span><small>{item.roadmap.problem}</small>
                  </button>
                )
              ))}
              {buildControlTower.priorityItems.length === 0 && (<div className="system-map-build-empty">当前没有更高优先级的项目与路线图项</div>)}
            </div>
          </article>
        </div>
      </section>

      {/* Build backlog */}
      <section className="services-section system-map-section system-map-build-backlog" aria-label="能力建设 Backlog">
        <div className="section-header">
          <div><h2>能力建设 Backlog</h2><p className="text-muted">把待补页面、待收口领域、显性能力缺口和未完成路线图收成一个建设面，不用在多个区块之间自己拼。</p></div>
          <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: 'TaskCenter', taskQuery: capabilityBuildBacklog.pagesWithoutUsage[0]?.page.id || capabilityBuildBacklog.domainAttention[0]?.id || '能力建设' }, onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>任务中心</span></button>
        </div>
        <div className="system-map-build-summary">
          <span><strong>{capabilityBuildBacklog.pagesWithoutUsage.length}</strong> 未入路径</span>
          <span><strong>{capabilityBuildBacklog.pagesWithoutDomain.length}</strong> 未挂能力域</span>
          <span><strong>{capabilityBuildBacklog.domainAttention.length}</strong> 领域待收口</span>
          <span><strong>{capabilityBuildBacklog.plannedRoadmapItems.length}</strong> 待完成路线图</span>
        </div>
        <div className="system-map-build-grid">
          <article className="system-map-build-column">
            <div className="system-map-build-head"><strong>页面待补位</strong><span>{capabilityBuildBacklog.pagesWithoutUsage.length + capabilityBuildBacklog.pagesWithoutDomain.length}</span></div>
            <div className="system-map-build-list">
              {capabilityBuildBacklog.pagesWithoutUsage.map((item) => (
                <button key={`build-usage-${item.page.id}`} className="system-map-build-item" aria-label={`打开待建设页面 ${item.page.id}`} onClick={() => onSetSelectedPageMaturityId(item.page.id)}>
                  <strong>{item.page.title}</strong><span>路径缺失 · {pageMaturityStatusText(item.status)} · {item.score}%</span><small>{item.nextAction}</small>
                </button>
              ))}
              {capabilityBuildBacklog.pagesWithoutDomain.map((item) => (
                <button key={`build-domain-${item.page.id}`} className="system-map-build-item" aria-label={`打开待挂能力域页面 ${item.page.id}`} onClick={() => onSetSelectedPageMaturityId(item.page.id)}>
                  <strong>{item.page.title}</strong><span>能力域缺失 · {pageMaturityStatusText(item.status)} · {item.score}%</span><small>{item.nextAction}</small>
                </button>
              ))}
              {capabilityBuildBacklog.pagesWithoutUsage.length === 0 && capabilityBuildBacklog.pagesWithoutDomain.length === 0 && (<div className="system-map-build-empty">当前没有待补位页面</div>)}
            </div>
          </article>
          <article className="system-map-build-column">
            <div className="system-map-build-head"><strong>领域与缺口待收口</strong><span>{capabilityBuildBacklog.domainAttention.length + capabilityBuildBacklog.gapItems.length}</span></div>
            <div className="system-map-build-list">
              {capabilityBuildBacklog.domainAttention.map((app) => (
                <button key={`build-domain-app-${app.id}`} className="system-map-build-item" aria-label={`打开待收口领域 ${app.id}`} onClick={() => openSystemMapTarget({ tab: 'DomainApps', taskQuery: app.id }, onNavigate, onOpenTarget)}>
                  <strong>{app.name}</strong><span>领域收口 · {app.runtime_status} · {app.risk_level}</span><small>{app.next_action}</small>
                </button>
              ))}
              {capabilityBuildBacklog.gapItems.map((gap) => (
                <button key={`build-gap-${gap.id}`} className="system-map-build-item" aria-label={`打开能力缺口 ${gap.id}`} onClick={() => onSetSelectedGapId(gap.id)}>
                  <strong>{gap.title}</strong><span>能力缺口 · {gap.severity}</span><small>{gap.next}</small>
                </button>
              ))}
              {capabilityBuildBacklog.domainAttention.length === 0 && capabilityBuildBacklog.gapItems.length === 0 && (<div className="system-map-build-empty">当前没有待收口领域和显性缺口</div>)}
            </div>
          </article>
          <article className="system-map-build-column">
            <div className="system-map-build-head"><strong>路线图与草稿承接</strong><span>{capabilityBuildBacklog.plannedRoadmapItems.length + capabilityBuildBacklog.actionableDrafts.length}</span></div>
            <div className="system-map-build-list">
              {capabilityBuildBacklog.plannedRoadmapItems.map((item) => (
                <button key={`build-roadmap-${item.id}`} className="system-map-build-item" aria-label={`打开待完成路线图 ${item.id}`} onClick={() => openSystemMapTarget({ tab: item.cockpit_page, taskQuery: item.id }, onNavigate, onOpenTarget)}>
                  <strong>{item.title}</strong><span>路线图 · {item.priority} · {item.status}</span><small>{item.problem}</small>
                </button>
              ))}
              {capabilityBuildBacklog.actionableDrafts.map((task) => (
                <button key={`build-draft-${task.id}`} className="system-map-build-item" aria-label={`打开建设草稿 ${task.title}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: task.source?.id || task.id }, draftTasks), onNavigate, onOpenTarget)}>
                  <strong>{task.title}</strong><span>{draftSourceLabel(task.source?.type)} · {task.priority || 'medium'}</span><small>{task.description || task.source?.title || '进入任务中心承接建设草稿。'}</small>
                </button>
              ))}
              {capabilityBuildBacklog.plannedRoadmapItems.length === 0 && capabilityBuildBacklog.actionableDrafts.length === 0 && (<div className="system-map-build-empty">当前没有待承接路线图和草稿</div>)}
            </div>
          </article>
        </div>
      </section>

      {/* Roadmap */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>能力路线图</h2><p className="text-muted">把"感觉缺功能"拆成优先级、页面入口、动作和验收标准。</p></div>
          <span className="status-badge degraded"><AlertTriangle size={13} />P0 {systemMap.roadmap.summary.p0}</span>
        </div>
        <div className="system-map-roadmap-grid">
          {systemMap.roadmap.lanes.map((lane) => (
            <article className="system-map-roadmap-lane" key={lane.id}>
              <div className="system-map-roadmap-lane-title"><h3>{lane.title}</h3><span>{lane.items.length}</span></div>
              <div className="system-map-roadmap-list">
                {lane.items.map((item) => {
                  const page = pagesById.get(item.cockpit_page);
                  return (
                    <div className="system-map-roadmap-item" key={item.id}>
                      <div className="system-map-roadmap-meta">
                        <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span>
                        <span>{item.priority}</span><span>{item.domain}</span>
                      </div>
                      <h4>{item.title}</h4><p>{item.problem}</p>
                      <div className="system-map-roadmap-body">
                        <div><strong>动作</strong><ul>{item.actions.slice(0, 2).map((action) => <li key={action}>{action}</li>)}</ul></div>
                        <div><strong>验收</strong><ul>{item.acceptance.slice(0, 2).map((acceptance) => <li key={acceptance}>{acceptance}</li>)}</ul></div>
                      </div>
                      {page && <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={item.id} />}
                      <SourceRefList refs={item.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Page groups */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>站点结构</h2><p className="text-muted">按人的使用场景组织，而不是按代码目录硬塞。</p></div>
          <span className="status-badge online"><CheckCircle size={13} /> 原生导航</span>
        </div>
        <div className="system-map-page-groups">
          {Array.from(new Map(systemMap.cockpit_pages.map((p) => [p.group, p.group])).entries()).map(([group]) => {
            const pages = systemMap.cockpit_pages.filter((p) => p.group === group);
            return (
              <article className="system-map-group" key={group}>
                <h3>{group}</h3>
                <div className="system-map-page-list">
                  {pages.map((page) => (
                    <button key={page.id} className="system-map-page-row" onClick={() => openSystemMapTarget({ tab: page.id, pageId: page.id }, onNavigate, onOpenTarget)}>
                      <span><strong>{page.title}</strong><small>{page.purpose}</small></span><ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Page maturity */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>页面能力成熟度</h2><p className="text-muted">按页面核对项目、能力域、使用路径、操作清单、路线图和受控动作，找出薄弱页面。</p></div>
          <div className="system-map-page-maturity-summary">
            <span className="online">可日用 {pageMaturitySummary.ready}</span>
            <span className="degraded">观察 {pageMaturitySummary.watch}</span>
            <span className="offline">待补 {pageMaturitySummary.gap}</span>
            <span className={pageMaturitySummary.untracked > 0 ? 'degraded' : 'online'}>路线图已追踪 {pageMaturitySummary.tracked}/{pageMaturity.length}</span>
            <span className={pageMaturitySummary.roadmapShipped < pageMaturity.length ? 'degraded' : 'online'}>路线图已交付 {pageMaturitySummary.roadmapShipped}/{pageMaturity.length}</span>
          </div>
        </div>
        <div className="system-map-page-maturity-grid">
          {visiblePageMaturity.map((item) => (
            <article className={`system-map-page-maturity-card ${statusClass(item.status)}`} key={item.page.id}>
              <div className="system-map-page-maturity-head">
                <div><h3>{item.page.title}</h3><small>{item.page.group} · {item.page.id}</small></div>
                <span className={`status-badge ${statusClass(item.status)}`}>{pageMaturityStatusText(item.status)} · {item.score}%</span>
              </div>
              <p>{item.page.purpose}</p>
              <div className="system-map-page-maturity-metrics">
                <span>项目 <strong>{item.projects.length}</strong></span>
                <span>能力域 <strong>{item.domains.length}</strong></span>
                <span>路径 <strong>{item.usagePaths.length}</strong></span>
                <span>清单 <strong>{item.playbookSteps.length}</strong></span>
                <span>路线图 <strong>{item.roadmapItems.length}</strong></span>
                <span>动作 <strong>{item.actions}</strong></span>
              </div>
              <div className="system-map-page-maturity-tags">
                {item.projects.slice(0, 4).map((project) => <em key={project.id}>{project.id}</em>)}
                {item.domains.slice(0, 3).map((domain) => <em key={domain.id}>{domain.title}</em>)}
                {item.usagePaths.slice(0, 2).map((path) => <em key={path.id}>{path.title}</em>)}
              </div>
              <strong className="system-map-page-maturity-next">{item.nextAction}</strong>
              <div className="system-map-page-maturity-card-actions">
                <button className="antd-btn" onClick={() => onSetSelectedPageMaturityId(item.page.id)}><span>查看剖面</span></button>
                <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: item.page.id, pageId: item.page.id }, onNavigate, onOpenTarget)}><ArrowRight size={14} /><span>进入页面</span></button>
              </div>
            </article>
          ))}
          {visiblePageMaturity.length === 0 && (<div className="system-map-project-empty"><Search size={15} /><span>当前筛选没有页面</span></div>)}
        </div>
      </section>

      {/* Usage paths */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>使用路径</h2><p className="text-muted">常用目标直接串页面，减少在侧边栏里猜。</p></div>
          <Route size={18} className="text-muted" />
        </div>
        <div className="system-map-path-grid">
          {systemMap.usage_paths.map((path) => (
            <article className="system-map-path" key={path.id}>
              <div><h3>{path.title}</h3><p>{path.intent}</p></div>
              <div className="system-map-step-row">
                {path.pages.map((page, index) => (
                  <React.Fragment key={page.id}>
                    {index > 0 && <ArrowRight size={13} className="text-muted" />}
                    <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={path.id} />
                  </React.Fragment>
                ))}
              </div>
              <SourceRefList refs={path.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
            </article>
          ))}
        </div>
      </section>

      {/* Playbooks */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>操作清单</h2><p className="text-muted">把常用路径拆成可执行步骤：入口、动作、证据和完成标准都摆出来。</p></div>
          <span className="status-badge online"><ClipboardCheck size={13} />{systemMap.summary.playbooks}</span>
        </div>
        <div className="system-map-playbook-grid">
          {systemMap.playbooks.map((playbook) => (
            <article className="system-map-playbook" key={playbook.id}>
              <div className="system-map-playbook-head">
                <div><h3>{playbook.title}</h3><p>{playbook.goal}</p></div>
                <span className={`status-badge ${statusClass(playbook.risk)}`}>{playbook.frequency}</span>
              </div>
              <div className="system-map-playbook-meta"><span>{playbook.owner}</span><span>{playbook.risk}</span></div>
              <SourceRefList refs={playbook.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
              <div className="system-map-playbook-steps">
                {playbook.steps.map((step, index) => (
                  <div className="system-map-playbook-step" key={step.id}>
                    <span className="system-map-step-index">{index + 1}</span>
                    <div className="system-map-playbook-copy">
                      <strong>{step.action}</strong><small>证据：{step.evidence}</small><small>完成：{step.done_when}</small>
                    </div>
                    <button className="antd-btn system-map-step-btn" onClick={() => openSystemMapTarget({ tab: step.page.id, taskQuery: playbook.id }, onNavigate, onOpenTarget)}>
                      <span>{step.page.title}</span><ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Layers */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>架构层级覆盖</h2><p className="text-muted">层级来自项目注册表，页面只做入口映射。</p></div>
          <Layers size={18} className="text-muted" />
        </div>
        <div className="system-map-layer-grid">
          {systemMap.layers.map((layer) => (
            <article className="system-map-layer" key={layer.id}>
              <div className="system-map-layer-header"><span>{layer.id}</span><strong>{layer.name}</strong></div>
              <div className="system-map-chip-row">
                {layer.projects.map((project) => (
                  <button key={project.id} className={`system-map-chip ${statusClass(project.coverage)}`} onClick={() => openSystemMapTarget({ tab: project.cockpit_page, projectId: project.id }, onNavigate, onOpenTarget)} title={`${project.role} · ${project.stack}`}>{project.id}</button>
                ))}
              </div>
              <SourceRefList refs={layer.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
            </article>
          ))}
        </div>
      </section>

      {/* Feature domains */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>功能域覆盖</h2><p className="text-muted">能力域来自功能能力地图，Cockpit 负责把它们指到可操作页面。</p></div>
          <Compass size={18} className="text-muted" />
        </div>
        <div className="system-map-domain-grid">
          {systemMap.feature_domains.map((domain) => {
            const page = pagesById.get(domain.cockpit_page);
            return (
              <article className={`system-map-domain ${selectedFeatureDomainId === domain.id ? 'active' : ''}`} key={domain.id}>
                <div><h3>{domain.title}</h3><p>{domain.english || 'Capability Domain'}</p></div>
                <div className="system-map-provider-line">{domain.providers.slice(0, 5).map((provider) => (<span key={provider}>{provider}</span>))}</div>
                <SourceRefList refs={domain.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
                <div className="system-map-page-maturity-card-actions">
                  <button className="antd-btn" onClick={() => onSetSelectedFeatureDomainId(domain.id)}><span>查看剖面</span></button>
                  {page && <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={domain.id} />}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Domain apps */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>领域应用覆盖</h2><p className="text-muted">把家庭驾驶舱、OPC 和 family-hub 从应用中心拉进总图，先看健康、运行和安全门。</p></div>
          <span className={`status-badge ${statusClass(systemMap.domain_apps.status)}`}><ShieldAlert size={13} />{systemMap.domain_apps.summary.score}%</span>
        </div>
        <div className="system-map-domain-app-summary">
          <span><strong>{systemMap.domain_apps.summary.ready}</strong> ready</span>
          <span><strong>{systemMap.domain_apps.summary.running}</strong> running</span>
          <span><strong>{systemMap.domain_apps.summary.external_mounts}</strong> external</span>
          <span><strong>{systemMap.domain_apps.summary.security_attention_apps}</strong> security attention</span>
        </div>
        <div className="system-map-domain-app-grid">
          {systemMap.domain_apps.items.map((app) => (
            <article className={`system-map-domain-app-card ${statusClass(app.security_posture)}`} key={app.id}>
              <div className="system-map-domain-app-head">
                <div><h3>{app.name}</h3><p>{app.domain?.name || app.kind} · {app.integration_mode}</p></div>
                <span className={`status-badge ${statusClass(app.security_posture)}`}>{app.security_posture}</span>
              </div>
              <div className="system-map-domain-app-metrics">
                <span className={statusClass(app.health)}>健康 {app.health}</span>
                <span className={statusClass(app.runtime_status)}>运行 {app.runtime_status}</span>
                <span className={statusClass(app.risk_level)}>风险 {app.risk_level}</span>
                <span>动作 {app.action_count}</span>
              </div>
              <div className="system-map-domain-app-capabilities">
                {app.read_capabilities.slice(0, 3).map((item) => (<span key={`${app.id}-read-${item}`}>读 {item}</span>))}
                {app.write_capabilities.slice(0, 3).map((item) => (<span className="degraded" key={`${app.id}-write-${item}`}>写 {item}</span>))}
              </div>
              <strong className="system-map-domain-app-next">{app.next_action}</strong>
              <div className="system-map-domain-app-actions">
                {app.launch_url && (<a className="antd-btn" href={app.launch_url} rel="noreferrer" target="_blank"><ExternalLink size={13} /><span>打开</span></a>)}
                <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: 'DomainApps', taskQuery: app.id }, onNavigate, onOpenTarget)}><ArrowRight size={13} /><span>应用中心</span></button>
              </div>
            </article>
          ))}
        </div>
        {systemMap.domain_apps.attention_items.length > 0 && (
          <div className="system-map-domain-app-attention">
            <strong>优先处理：</strong>
            {systemMap.domain_apps.attention_items.map((app) => (<span className={statusClass(app.security_posture)} key={app.id} title={app.next_action}>{app.id} · {app.runtime_status}</span>))}
          </div>
        )}
        <p className="system-map-domain-app-nextline">{systemMap.domain_apps.next_action}</p>
      </section>

      {/* Project focus */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>项目聚焦</h2><p className="text-muted">把项目矩阵切成可处理队列：运行、验证、目录和日用状态都能直接定位。</p></div>
          <span className="status-badge degraded"><AlertTriangle size={13} />{systemMap.project_focus.summary.needs_action}</span>
        </div>
        <div className="system-map-project-focus-grid">
          {systemMap.project_focus.queues.map((queue) => (
            <button key={queue.id} className={`system-map-project-focus ${statusClass(queue.severity)}`} onClick={() => onSetProjectFilter(queue.id)} title={queue.reason}>
              <span>{queue.title}</span><strong>{queue.count}</strong><small>{queue.reason}</small>
              {queue.top_projects.length > 0 && (<div className="system-map-project-focus-hits">{queue.top_projects.slice(0, 4).map((project) => (<em key={project.id}>{project.id}</em>))}</div>)}
            </button>
          ))}
        </div>
      </section>

      {/* Triage queues */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>排查命令队列</h2><p className="text-muted">把运行探针、验证证据和项目清单缺口转换成可复制命令，仍由人确认后执行。</p></div>
          <div className="system-map-section-actions">
            <button className="antd-btn antd-btn-primary" aria-label="批量承接全站缺口" disabled={bulkTriagePending} onClick={onQueueCoverageDrafts} title="把项目组合、领域应用、能力缺口和页面成熟度草稿统一登记为 OMO 计划任务"><Layers size={13} /><span>{bulkTriagePending ? '正在承接' : '承接全站缺口'}</span></button>
            <button className="antd-btn antd-btn-primary" aria-label="批量承接验证缺口" disabled={bulkTriagePending || systemMap.project_triage.summary.verification_commands === 0} onClick={onQueueVerificationTriage} title="只登记已有验证命令为 OMO 计划任务，不会直接执行"><ClipboardCheck size={13} /><span>{bulkTriagePending ? '正在承接' : '承接验证缺口'}</span></button>
            <button className="antd-btn" aria-label="批量承接运行探针" disabled={bulkTriagePending || systemMap.project_triage.summary.runtime_commands === 0} onClick={onQueueRuntimeTriage} title="优先登记端口检查；无端口时登记端口注册排查，不会直接执行"><Server size={13} /><span>{bulkTriagePending ? '正在承接' : '承接运行探针'}</span></button>
            <button className="antd-btn" aria-label="执行待补验证" disabled={bulkTriagePending || (systemMap.project_triage.queues.find((queue) => queue.id === 'verification')?.queued || 0) === 0} onClick={onExecuteVerificationTriage} title="顺序执行最多 8 条已承接且尚未通过的低风险验证；成功后自动归档执行证据，失败保留重试"><Send size={13} /><span>{bulkTriagePending ? '正在执行' : '执行待补验证'}</span></button>
            <button className="antd-btn" aria-label="执行已批准运行探针" disabled={bulkTriagePending || (systemMap.project_triage.queues.find((queue) => queue.id === 'runtime')?.queued || 0) === 0} onClick={onExecuteRuntimeTriage} title="只执行已经获批并恢复到 active 的运行探针，不会绕过审批"><Server size={13} /><span>{bulkTriagePending ? '正在执行' : '执行已批准探针'}</span></button>
            <span className="status-badge degraded"><ClipboardCheck size={13} />{filteredTriageCommandCount} / {systemMap.project_triage.summary.total_commands} · 已承接 {systemMap.project_triage.summary.queued_commands || 0}</span>
          </div>
        </div>
        <div className="system-map-domain-app-summary" aria-label="运行探针处理状态">
          <span><strong>{runtimeProbeSummary.runtimeProjects}</strong> 个需运行探针项目</span>
          <span><strong>{runtimeProbeSummary.approved}</strong> 已授权待执行</span>
          <span><strong>{runtimeProbeSummary.commands}</strong> 条可承接探针命令</span>
        </div>
        <ProjectTriageQueues queues={filteredTriageQueues} onQueueCommand={onQueueProjectTriageCommand} onNavigate={onNavigate} onOpenTarget={onOpenTarget} pendingActionKey={pendingActionKey} />
      </section>

      {/* Coverage matrix */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>能力覆盖矩阵</h2><p className="text-muted">按入口、文档、命令、清单、运行、验证、来源和动作检查每个项目的可用度。</p></div>
          <span className={`status-badge ${statusClass(systemMap.project_capability_coverage.summary.score >= 80 ? 'ready' : 'warning')}`}><ShieldAlert size={13} />{systemMap.project_capability_coverage.summary.score}%</span>
        </div>
        <div className="system-map-domain-app-summary" aria-label="覆盖率与证据进度">
          <span><strong>{systemMap.project_capability_coverage.summary.score}%</strong> 严格就绪</span>
          <span><strong>{systemMap.project_capability_coverage.summary.evidence_score ?? systemMap.project_capability_coverage.summary.score}%</strong> 证据进度</span>
          <span><strong>{systemMap.project_capability_coverage.summary.documented_cells ?? 0}</strong> 已有验证命令</span>
          <span><strong>{systemMap.project_capability_coverage.summary.failed_cells}</strong> 硬缺口</span>
        </div>
        <div className="system-map-coverage-grid">
          {systemMap.project_capability_coverage.dimension_summary.map((dimension) => (
            <button className={`system-map-coverage-card ${statusClass(dimension.status)}`} key={dimension.id} aria-label={`查看覆盖维度：${dimension.title}`} onClick={() => onSetCoverageFilter(dimension.id)} title={`${dimension.description} 点击后只看该维度未就绪项目。`}>
              <div className="system-map-coverage-head">
                <div><h3>{dimension.title}</h3><p>{dimension.description}</p></div>
                <strong>{dimension.score}%</strong>
              </div>
              <div className="system-map-coverage-counts">
                <span className="online">{coverageCountLabel(dimension.id, 'ready')} {dimension.ready}</span>
                <span className="degraded">{coverageCountLabel(dimension.id, 'warning')} {dimension.warning}</span>
                <span className="offline">{coverageCountLabel(dimension.id, 'failed')} {dimension.failed}</span>
              </div>
              {dimension.id === 'verification' && (<div className="system-map-risk-line">证据进度 {dimension.evidence_score ?? dimension.score}%：已有命令可承接，执行并 closeout 后才算已验证。</div>)}
              {dimension.attention_projects.length > 0 && (
                <div className="system-map-coverage-attention">
                  {dimension.attention_projects.map((project) => (<span className={statusClass(project.status)} key={`${dimension.id}-${project.id}`} title={project.next_action}>{project.id}</span>))}
                </div>
              )}
            </button>
          ))}
        </div>
        {systemMap.project_capability_coverage.weakest_dimensions.length > 0 && (
          <div className="system-map-coverage-weak">
            <strong>优先补：</strong>
            {systemMap.project_capability_coverage.weakest_dimensions.map((dimension) => (<span key={dimension.id}>{dimension.title} {dimension.score}%</span>))}
          </div>
        )}
      </section>

      {/* Cross matrix */}
      <section className="services-section system-map-section" aria-label="项目能力维度交叉矩阵">
        <div className="section-header">
          <div><h2>项目 × 能力维度</h2><p className="text-muted">横向看每个项目的完整覆盖，点击单元格进入项目详情；选中项目后可把运行探针或验证动作限定在这组对象。</p></div>
          <div className="system-map-section-actions">
            <button className="antd-btn small" aria-label={selectedVisibleProjectIds.length === coverageMatrixRows.length ? '清除项目选择' : '全选当前筛选项目'} onClick={() => onSetSelectedProjectIds(selectedVisibleProjectIds.length === coverageMatrixRows.length ? [] : coverageMatrixRows.map((row) => row.project.id))}>
              <CheckCircle size={13} /><span>{selectedVisibleProjectIds.length === coverageMatrixRows.length ? '清除选择' : `全选项目 (${coverageMatrixRows.length})`}</span>
            </button>
            <span className="status-badge online">{coverageMatrixRows.length} 项目 · {coverageDimensions.length} 维度 · 已选 {selectedVisibleProjectIds.length}</span>
          </div>
        </div>
        <div className="system-map-coverage-matrix-wrap">
          <table className="system-map-coverage-matrix">
            <thead>
              <tr>
                <th scope="col">项目</th>
                {coverageDimensions.map((dimension) => (<th scope="col" key={dimension.id} title={dimension.description}>{dimension.title}</th>))}
                <th scope="col">汇总</th>
              </tr>
            </thead>
            <tbody>
              {coverageMatrixRows.map((row) => (
                <tr key={row.project.id}>
                  <th scope="row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" aria-label={`选择项目 ${row.project.id}`} checked={selectedVisibleProjectIds.includes(row.project.id)} onChange={() => onSetSelectedProjectIds((current: string[]) => current.includes(row.project.id) ? current.filter((projectId: string) => projectId !== row.project.id) : [...current, row.project.id])} />
                      <button type="button" className="system-map-coverage-matrix-project" aria-label={`从覆盖矩阵查看 ${row.project.id} 项目详情`} onClick={() => onSetSelectedProjectId(row.project.id)}>
                        <strong>{row.project.id}</strong><small>{row.project.layer} · {row.project.cockpit_page}</small>
                      </button>
                    </div>
                  </th>
                  {coverageDimensions.map((dimension) => {
                    const check = row.checks.find((item) => item.id === dimension.id);
                    const status = check?.status;
                    return (
                      <td key={`${row.project.id}-${dimension.id}`}>
                        <button type="button" className={`system-map-coverage-matrix-cell ${statusClass(status || 'unknown')}`} aria-label={`${row.project.id} ${dimension.title}：${coverageStatusText(status)}`} title={check ? `${check.detail} 下一步：${check.next_action}` : '该维度暂无检查结果'} onClick={() => { onSetCoverageFilter(dimension.id); onSetSelectedProjectId(row.project.id); }}>
                          <strong aria-hidden="true">{status === 'ready' ? '✓' : status === 'warning' ? '!' : status === 'failed' ? '×' : '—'}</strong>
                          <span>{coverageStatusText(status)}</span>
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <div className="system-map-coverage-matrix-total">
                      <strong>{row.ready}/{coverageDimensions.length}</strong>
                      <small>{row.failed ? `${row.failed} 个缺口` : row.warning ? `${row.warning} 个提醒` : '全部就绪'}</small>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coverageMatrixRows.length === 0 && (<div className="system-map-project-empty"><Search size={15} /><span>当前筛选没有项目可展示</span></div>)}
        </div>
      </section>

      {/* Project matrix */}
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>项目矩阵</h2><p className="text-muted">所有项目先能被定位，再按聚焦队列处理运行、验证和状态缺口。</p></div>
          <BookOpen size={18} className="text-muted" />
        </div>
        <div className="system-map-table-wrap">
          <table className="services-table">
            <thead>
              <tr><th>项目</th><th>层级</th><th>职责</th><th>入口</th><th>状态</th><th>运行</th><th>诊断</th><th>文档</th><th>命令</th><th>覆盖</th><th>动作</th><th>来源</th></tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const page = pagesById.get(project.cockpit_page);
                return (
                  <tr key={project.id}>
                    <td><button className="system-map-project-name-btn" onClick={() => onSetSelectedProjectId(project.id)} aria-label={`查看 ${project.id} 项目详情`}>{project.id}</button></td>
                    <td>{project.layer}</td>
                    <td>{project.role || project.stack}</td>
                    <td>{page ? (<button className="antd-btn system-map-table-btn" onClick={() => openSystemMapTarget({ tab: page.id, projectId: project.id }, onNavigate, onOpenTarget)}>{page.title}</button>) : '—'}</td>
                    <td>
                      <span className={`status-badge ${statusClass(project.operational.status)}`}>{projectStatusText(project.operational.status)}</span>
                      {project.operational.risks.length > 0 && (<div className="system-map-risk-line">{project.operational.risks.slice(0, 2).join(' / ')}</div>)}
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(project.runtime.status)}`}>{runtimeStatusText(project.runtime.status)}</span>
                      <div className="system-map-risk-line">{runtimeStatusText(project.runtime.status)} · {project.runtime.probe_reason}</div>
                      {project.runtime.ports.length > 0 && (<div className="system-map-port-list">{project.runtime.ports.slice(0, 3).map((port) => (<span key={port.port} className={port.listening ? 'online' : 'offline'}>:{port.port}</span>))}</div>)}
                      <div className={`system-map-risk-line ${statusClass(project.runtime.latest_verification.status)}`}>
                        {verifyText(project.runtime.latest_verification.status)}
                        {project.runtime.latest_verification.ts ? ` · ${shortDate(project.runtime.latest_verification.ts)}` : ''}
                        {` · ${closeoutText(project.runtime.latest_verification.closeout_status)}`}
                      </div>
                    </td>
                    <td>
                      <div className="system-map-diagnostic-list">
                        {project.diagnostics.slice(0, 2).map((diagnostic) => (
                          <div className={`system-map-diagnostic ${statusClass(diagnostic.severity)}`} key={diagnostic.id}>
                            <strong>{diagnostic.title}</strong><small>{diagnostic.detail}</small><small>下一步：{diagnostic.next_action}</small>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {project.operational.docs.present} / {project.operational.docs.expected}
                      {project.operational.manifests.length > 0 && (<div className="system-map-risk-line">{project.operational.manifests.map((item) => item.name).join(' / ')}</div>)}
                    </td>
                    <td>
                      {project.operational.commands.length > 0 ? (<div className="system-map-command-list">{project.operational.commands.slice(0, 2).map((command) => <code key={command}>{command}</code>)}</div>) : (<span className="text-muted">待登记</span>)}
                      <div className="system-map-risk-line">{project.operational.next_action}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(project.coverage)}`}>{project.coverage === 'native' ? '原生/可操作' : '定位/待补'}</span>
                      <div className="system-map-coverage-cell">
                        {project.coverage_checks.slice(0, 8).map((check) => (<span className={statusClass(check.status)} key={check.id} title={`${check.detail} 下一步：${check.next_action}`}>{check.title}</span>))}
                      </div>
                    </td>
                    <td>
                      <button className="system-map-project-action online" onClick={() => onSetSelectedProjectId(project.id)}><BookOpen size={12} /><span>详情</span></button>
                      <ProjectActionList actions={project.actions} onNavigate={onNavigate} onOpenTarget={onOpenTarget} projectId={project.id} onQueueAction={(action) => onQueueProjectAction(project.id, action)} pendingActionKey={pendingActionKey} />
                      {project.triage_commands.length > 0 && (
                        <div className="system-map-triage-inline">
                          <small>排查</small>
                          <ProjectActionList actions={project.triage_commands} onNavigate={onNavigate} onOpenTarget={onOpenTarget} projectId={project.id} onQueueAction={(action) => onQueueProjectTriageCommand(action)} pendingActionKey={pendingActionKey} />
                        </div>
                      )}
                    </td>
                    <td><SourceRefList refs={project.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (<div className="system-map-project-empty"><Search size={15} /><span>当前筛选没有匹配项目</span></div>)}
        </div>
      </section>

      {/* Bottom grid */}
      <section className="system-map-bottom-grid">
        <div className="services-section system-map-section">
          <div className="section-header">
            <div><h2>能力缺口</h2><p className="text-muted">把"感觉缺功能"翻译成可推进的下一步。</p></div>
            <ShieldAlert size={18} className="text-muted" />
          </div>
          <div className="system-map-gap-list">
            {systemMap.gaps.map((gap) => (
              <button className={`system-map-gap ${statusClass(gap.severity)}`} key={gap.id} onClick={() => onSetSelectedGapId(gap.id)} title={gap.next}>
                <span className={`status-badge ${statusClass(gap.severity)}`}>{gap.severity}</span>
                <div><h3>{gap.title}</h3><p>{gap.evidence}</p><strong>{gap.next}</strong></div>
              </button>
            ))}
          </div>
        </div>
        <div className="services-section system-map-section">
          <div className="section-header">
            <div><h2>权威读源</h2><p className="text-muted">页面只读这些 SSOT，不自己维护易漂移事实。</p></div>
            <ExternalLink size={18} className="text-muted" />
          </div>
          <div className="system-map-source-list">
            {Object.entries(systemMap.source_paths).map(([key, source]) => (
              <div className="system-map-source-row" key={key} title={source.path}>
                <span className={`status-badge ${source.exists ? 'online' : 'offline'}`}>{source.exists ? '可读' : '缺失'}</span>
                <div><strong>{key}</strong><small>{source.path}</small></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default SystemMapGraph;
