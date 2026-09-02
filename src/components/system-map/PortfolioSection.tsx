import React from 'react';
import { Route, ShieldAlert } from 'lucide-react';
import SummaryTileGrid from '../common/SummaryTileGrid';
import type { CockpitNavigationTarget, ProjectItem, ProjectPortfolioPriority, SystemMapPayload } from './types';
import { openSystemMapTarget, portfolioStatusText, runtimeStatusText, statusClass, verifyText } from './utils';

type ProjectEntryRow = {
  priority: ProjectPortfolioPriority;
  project: ProjectItem;
  page: SystemMapPayload['cockpit_pages'][number] | null;
  primaryDimension: ProjectItem['portfolio']['non_ready_dimensions'][number] | null;
  draft: { title: string } | null;
  draftTarget: { tab: string; taskQuery: string; draftKey?: string };
};

type PortfolioSectionProps = {
  systemMap: SystemMapPayload;
  projectEntryRows: ProjectEntryRow[];
  projectEntrySummary: { mapped: number; drafts: number; blocked: number };
  onSetPortfolioFilter: (bucketId: string) => void;
  onSetCoverageFilter: (dimensionId: string) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

function PortfolioSection({
  systemMap,
  projectEntryRows,
  projectEntrySummary,
  onSetPortfolioFilter,
  onSetCoverageFilter,
  onSetSelectedProjectId,
  onNavigate,
  onOpenTarget,
}: PortfolioSectionProps) {
  return (
    <>
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
              <button className={`system-map-portfolio-bucket ${statusClass(bucket.severity)}`} key={bucket.id} onClick={() => onSetPortfolioFilter(bucket.id)} title={bucket.reason}>
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
    </>
  );
}

export default PortfolioSection;
