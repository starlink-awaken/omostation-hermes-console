import React from 'react';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import type {
  CockpitNavigationTarget,
  DraftTask,
  FeatureDomain,
  ProjectAction,
  ProjectItem,
  RoadmapItem,
  SourceRef,
  SystemMapPayload,
  UsagePath,
} from './types';
import { copyText, draftSourceLabel, openSystemMapTarget, portfolioStatusText, statusClass, withTaskDraftHandoff } from './utils';
import PageButton from './PageButton';
import SourceRefList from './SourceRefList';

type UsagePathConsoleProps = {
  systemMap: SystemMapPayload;
  activeUsagePath: UsagePath;
  activeUsagePlaybooks: SystemMapPayload['playbooks'];
  activeUsageDomains: FeatureDomain[];
  activeUsageRoadmap: RoadmapItem[];
  activeUsageProjects: ProjectItem[];
  activeUsageTriageCommands: ProjectAction[];
  activeUsageDrafts: DraftTask[];
  draftTasks: DraftTask[];
  pendingActionKey: string | null;
  bulkTriagePending: boolean;
  activeSourceTarget: string;
  onSetSelectedUsagePathId: (id: string | null) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onPromoteDraftTask: (task: DraftTask) => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
};

function UsagePathConsole({
  systemMap,
  activeUsagePath,
  activeUsagePlaybooks,
  activeUsageDomains,
  activeUsageRoadmap,
  activeUsageProjects,
  activeUsageTriageCommands,
  activeUsageDrafts,
  draftTasks,
  pendingActionKey,
  bulkTriagePending,
  activeSourceTarget,
  onSetSelectedUsagePathId,
  onSetSelectedProjectId,
  onPromoteDraftTask,
  onNavigate,
  onOpenTarget,
  onInspect,
}: UsagePathConsoleProps) {
  if (!activeUsagePath) return null;

  return (
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
  );
}

export default UsagePathConsole;
