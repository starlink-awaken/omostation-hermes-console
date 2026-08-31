import React from 'react';
import { ArrowRight, ClipboardCheck, ShieldAlert } from 'lucide-react';
import type {
  CapabilityGapClosureRow,
  CockpitNavigationTarget,
  DraftTask,
  FeatureDomain,
  OperatingPlaybook,
  PageMaturity,
  ProjectAction,
  ProjectItem,
  SourceRef,
  SystemMapPayload,
  UsagePath,
} from './types';
import { openSystemMapTarget, pageMaturityGapSignals, pageMaturityStatusText, statusClass, withTaskDraftHandoff } from './utils';
import PageButton from './PageButton';
import SourceRefList from './SourceRefList';
import ProjectDetailPanel from './ProjectDetailPanel';

type SystemMapDetailPanelProps = {
  systemMap: SystemMapPayload;
  selectedGap: SystemMapPayload['gaps'][number] | null;
  selectedGapClosureRow: CapabilityGapClosureRow | null;
  selectedProject: ProjectItem | null;
  selectedProjectUsagePaths: UsagePath[];
  selectedProjectPlaybooks: OperatingPlaybook[];
  selectedProjectDrafts: DraftTask[];
  selectedPageMaturity: PageMaturity | null;
  selectedPagePlaybooks: OperatingPlaybook[];
  selectedPageDrafts: DraftTask[];
  selectedFeatureDomain: FeatureDomain | null;
  selectedFeaturePage: SystemMapPayload['cockpit_pages'][number] | null;
  selectedFeatureUsagePaths: UsagePath[];
  selectedFeaturePlaybooks: OperatingPlaybook[];
  selectedFeatureRoadmapItems: SystemMapPayload['roadmap']['items'];
  selectedFeatureDrafts: DraftTask[];
  selectedFeatureSignals: { id: string; title: string; detail: string }[];
  activeSourceTarget: string;
  pendingActionKey: string | null;
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
  onFocusCoverage: (dimensionId: string) => void;
  onFocusUsagePath: (usagePathId: string) => void;
  onFocusPageMaturity: (pageId: string) => void;
  onQueueAction: (projectId: string, action: ProjectAction) => void;
  onQueueTriageCommand: (command: ProjectAction) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onSetSelectedGapId: (id: string | null) => void;
  onSetSelectedPageMaturityId: (id: string | null) => void;
  onSetSelectedUsagePathId: (id: string | null) => void;
  draftTasks: DraftTask[];
};

function SystemMapDetailPanel({
  systemMap,
  selectedGap,
  selectedGapClosureRow,
  selectedProject,
  selectedProjectUsagePaths,
  selectedProjectPlaybooks,
  selectedProjectDrafts,
  selectedPageMaturity,
  selectedPagePlaybooks,
  selectedPageDrafts,
  selectedFeatureDomain,
  selectedFeaturePage,
  selectedFeatureUsagePaths,
  selectedFeaturePlaybooks,
  selectedFeatureRoadmapItems,
  selectedFeatureDrafts,
  selectedFeatureSignals,
  activeSourceTarget,
  pendingActionKey,
  onNavigate,
  onOpenTarget,
  onInspect,
  onFocusCoverage,
  onFocusUsagePath,
  onFocusPageMaturity,
  onQueueAction,
  onQueueTriageCommand,
  onSetSelectedProjectId,
  onSetSelectedGapId,
  onSetSelectedPageMaturityId,
  onSetSelectedUsagePathId,
  draftTasks,
}: SystemMapDetailPanelProps) {
  return (
    <>
      {/* Gap focus */}
      {selectedGap && (
        <section className="services-section system-map-section system-map-gap-focus" aria-label="当前聚焦能力缺口">
          <div className="section-header">
            <div>
              <h2>当前聚焦能力缺口</h2>
              <p className="text-muted">从任务草稿或全局搜索带回来的缺口，会在这里先给你一个落点。</p>
            </div>
            <button className="antd-btn" onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', gapId: selectedGap.id, taskQuery: selectedGap.id }, draftTasks), onNavigate, onOpenTarget)}>
              <ClipboardCheck size={14} />
              <span>回任务中心</span>
            </button>
          </div>
          <article className={`system-map-gap system-map-gap-active ${statusClass(selectedGap.severity)}`}>
            <span className={`status-badge ${statusClass(selectedGap.severity)}`}>{selectedGap.severity}</span>
            <div>
              <h3>{selectedGap.title}</h3>
              <p>{selectedGap.evidence}</p>
              <strong>{selectedGap.next}</strong>
            </div>
          </article>
          {selectedGapClosureRow && (
            <div className="system-map-page-focus-grid">
              <div className="system-map-page-focus-panel">
                <strong>缺口承接面</strong>
                <div className="system-map-page-focus-links">
                  <span>页面 {selectedGapClosureRow.page ? 1 : 0}</span>
                  <span>项目 {selectedGapClosureRow.projects.length}</span>
                  <span>能力域 {selectedGapClosureRow.domains.length}</span>
                  <span>路径 {selectedGapClosureRow.usagePaths.length}</span>
                  <span>清单 {selectedGapClosureRow.playbooks.length}</span>
                  <span>路线图 {selectedGapClosureRow.roadmapItems.length}</span>
                </div>
                <small className="system-map-page-focus-next">{selectedGapClosureRow.nextAction}</small>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>当前承接线索</strong>
                <div className="system-map-page-focus-signals">
                  <div className="system-map-page-focus-signal"><span>主页面</span><small>{selectedGapClosureRow.page?.page.title || '还没挂到具体页面'}</small></div>
                  <div className="system-map-page-focus-signal"><span>重点项目</span><small>{selectedGapClosureRow.projects[0]?.id || '还没落到具体项目'}</small></div>
                  <div className="system-map-page-focus-signal"><span>任务承接</span><small>{selectedGapClosureRow.draft?.title || '当前还没有专属草稿，先回 TaskCenter 承接。'}</small></div>
                </div>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>反向修复入口</strong>
                <div className="system-map-page-focus-actions-grid">
                  {selectedGapClosureRow.page && (
                    <button className="system-map-page-focus-action" onClick={() => openSystemMapTarget({ tab: selectedGapClosureRow.page?.page.id || 'SystemMap', gapId: selectedGapClosureRow.gap.id }, onNavigate, onOpenTarget)}>
                      <span>查看页面</span><small>{selectedGapClosureRow.page.page.title}</small>
                    </button>
                  )}
                  {selectedGapClosureRow.projects[0] && (
                    <button className="system-map-page-focus-action" onClick={() => onSetSelectedProjectId(selectedGapClosureRow.projects[0].id)}>
                      <span>查看项目</span><small>{selectedGapClosureRow.projects[0].id}</small>
                    </button>
                  )}
                  {selectedGapClosureRow.playbooks[0] && (
                    <button className="system-map-page-focus-action" onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedGapClosureRow.playbooks[0].id }, draftTasks), onNavigate, onOpenTarget)}>
                      <span>查看清单</span><small>{selectedGapClosureRow.playbooks[0].title}</small>
                    </button>
                  )}
                  <button className="system-map-page-focus-action" onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedGapClosureRow.taskQuery }, draftTasks), onNavigate, onOpenTarget)}>
                    <span>查看任务草稿</span><small>{selectedGapClosureRow.draft?.title || selectedGapClosureRow.taskQuery}</small>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Project detail panel */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          page={systemMap.cockpit_pages.find((p) => p.id === selectedProject.cockpit_page)}
          onClose={() => onSetSelectedProjectId(null)}
          onNavigate={onNavigate}
          onOpenTarget={onOpenTarget}
          onFocusCoverage={onFocusCoverage}
          onFocusUsagePath={onFocusUsagePath}
          onFocusPageMaturity={onFocusPageMaturity}
          relatedUsagePaths={selectedProjectUsagePaths}
          relatedPlaybooks={selectedProjectPlaybooks}
          relatedDrafts={selectedProjectDrafts}
          onInspect={onInspect}
          onQueueAction={(action) => onQueueAction(selectedProject.id, action)}
          onQueueTriageCommand={onQueueTriageCommand}
          pendingActionKey={pendingActionKey}
          activeTarget={activeSourceTarget}
        />
      )}

      {/* Selected page maturity focus */}
      {selectedPageMaturity && (
        <section className="system-map-page-focus" aria-label="当前聚焦页面">
          <div className="system-map-page-focus-head">
            <div>
              <span className={`status-badge ${statusClass(selectedPageMaturity.status)}`}>{pageMaturityStatusText(selectedPageMaturity.status)} · {selectedPageMaturity.score}%</span>
              <h3>{selectedPageMaturity.page.title}</h3>
              <p>{selectedPageMaturity.page.group} · {selectedPageMaturity.page.id} · {selectedPageMaturity.page.purpose}</p>
            </div>
            <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: selectedPageMaturity.page.id, pageId: selectedPageMaturity.page.id }, onNavigate, onOpenTarget)}>
              <ArrowRight size={14} />
              <span>进入页面</span>
            </button>
          </div>
          <div className="system-map-page-focus-grid">
            <div className="system-map-page-focus-panel">
              <strong>当前缺口</strong>
              <div className="system-map-page-focus-signals">
                {pageMaturityGapSignals(selectedPageMaturity).length > 0 ? pageMaturityGapSignals(selectedPageMaturity).map((signal) => (
                  <article className="system-map-page-focus-signal" key={signal.id}><span>{signal.title}</span><small>{signal.detail}</small></article>
                )) : (
                  <div className="system-map-page-focus-empty">当前页面的主要能力维度已接齐。</div>
                )}
              </div>
            </div>
            <div className="system-map-page-focus-panel">
              <strong>已接资产</strong>
              <div className="system-map-page-focus-links">
                <span>项目 {selectedPageMaturity.projects.length}</span>
                <span>能力域 {selectedPageMaturity.domains.length}</span>
                <span>路径 {selectedPageMaturity.usagePaths.length}</span>
                <span>清单 {selectedPageMaturity.playbookSteps.length}</span>
                <span>路线图 {selectedPageMaturity.roadmapItems.length} · {selectedPageMaturity.roadmapStatus === 'shipped' ? '已交付' : '规划中'}</span>
                {selectedPageMaturity.roadmapItems.filter((item) => item.verification).slice(0, 1).map((item) => (
                  <span key={`page-contract-verification-${item.id}`}>
                    契约验收 {item.verification?.checks?.filter((check) => check.status === 'passed').length || 0}/{item.verification?.checks?.length || 0}
                  </span>
                ))}
                <span>动作 {selectedPageMaturity.operatorActions.length}</span>
              </div>
              <small className="system-map-page-focus-next">{selectedPageMaturity.nextAction}</small>
              <small className="system-map-page-focus-next">
                {selectedPageMaturity.roadmapStatus === 'shipped' ? '路线图项已交付，保持验收证据同步。' : selectedPageMaturity.traceabilityNextAction}
              </small>
            </div>
            <div className="system-map-page-focus-panel">
              <strong>反向修复入口</strong>
              <div className="system-map-page-focus-actions-grid">
                {selectedPageMaturity.usagePaths.slice(0, 2).map((path) => (
                  <button className="system-map-page-focus-action" key={`page-path-${path.id}`} onClick={() => onSetSelectedUsagePathId(path.id)}>
                    <span>查看路径</span><small>{path.title}</small>
                  </button>
                ))}
                {selectedPagePlaybooks.slice(0, 2).map((playbook) => (
                  <button className="system-map-page-focus-action" key={`page-playbook-${playbook.id}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: playbook.id }, draftTasks), onNavigate, onOpenTarget)}>
                    <span>查看清单</span><small>{playbook.title}</small>
                  </button>
                ))}
                {selectedPageDrafts.slice(0, 1).map((draft) => (
                  <button className="system-map-page-focus-action" key={`page-draft-${draft.id}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedPageMaturity.page.id }, draftTasks), onNavigate, onOpenTarget)}>
                    <span>查看页面草稿</span><small>{draft.title}</small>
                  </button>
                ))}
                {selectedPageMaturity.roadmapItems.slice(0, 1).map((item) => (
                  <button className="system-map-page-focus-action" key={`page-roadmap-${item.id}`} onClick={() => openSystemMapTarget({ tab: 'SystemMap', pageId: item.cockpit_page, taskQuery: item.id }, onNavigate, onOpenTarget)}>
                    <span>查看路线图</span><small>{item.title}</small>
                  </button>
                ))}
                {selectedPageMaturity.usagePaths.length === 0 && selectedPagePlaybooks.length === 0 && selectedPageDrafts.length === 0 && selectedPageMaturity.roadmapItems.length === 0 && (
                  <div className="system-map-page-focus-empty">这页还缺直接修复入口，先去任务中心处理页面草稿。</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Selected feature domain focus */}
      {selectedFeatureDomain && (
        <section className="system-map-page-focus" aria-label="当前聚焦能力域">
          <div className="system-map-page-focus-head">
            <div>
              <span className={`status-badge ${statusClass(selectedFeatureDomain.coverage)}`}>{selectedFeatureDomain.coverage === 'native' ? '原生能力域' : selectedFeatureDomain.coverage}</span>
              <h3>{selectedFeatureDomain.title}</h3>
              <p>{selectedFeatureDomain.english || 'Capability Domain'} · {selectedFeatureDomain.id} · 页面 {selectedFeatureDomain.cockpit_page}</p>
            </div>
            {selectedFeaturePage && (
              <button className="antd-btn" onClick={() => openSystemMapTarget({ tab: selectedFeaturePage.id, pageId: selectedFeaturePage.id, featureDomainId: selectedFeatureDomain.id }, onNavigate, onOpenTarget)}>
                <ArrowRight size={14} /><span>进入页面</span>
              </button>
            )}
          </div>
          <div className="system-map-page-focus-grid">
            <div className="system-map-page-focus-panel">
              <strong>当前缺口</strong>
              <div className="system-map-page-focus-signals">
                {selectedFeatureSignals.map((signal) => (
                  <article className="system-map-page-focus-signal" key={signal.id}><span>{signal.title}</span><small>{signal.detail}</small></article>
                ))}
              </div>
            </div>
            <div className="system-map-page-focus-panel">
              <strong>能力接入面</strong>
              <div className="system-map-page-focus-links">
                <span>提供方 {selectedFeatureDomain.providers.length}</span>
                <span>能力项 {selectedFeatureDomain.capability_items.length}</span>
                <span>项目 {systemMap.projects.filter((p) => p.cockpit_page === selectedFeatureDomain.cockpit_page).length}</span>
                <span>路径 {selectedFeatureUsagePaths.length}</span>
                <span>清单 {selectedFeaturePlaybooks.length}</span>
                <span>路线图 {selectedFeatureRoadmapItems.length}</span>
              </div>
            </div>
            <div className="system-map-page-focus-panel">
              <strong>提供方与能力项</strong>
              <div className="system-map-page-focus-signals">
                <div className="system-map-page-focus-signal"><span>提供方</span><small>{selectedFeatureDomain.providers.length > 0 ? selectedFeatureDomain.providers.join(' · ') : '未登记'}</small></div>
                <div className="system-map-page-focus-signal"><span>能力项</span><small>{selectedFeatureDomain.capability_items.length > 0 ? selectedFeatureDomain.capability_items.join(' · ') : '未登记'}</small></div>
              </div>
            </div>
            <div className="system-map-page-focus-panel">
              <strong>反向修复入口</strong>
              <div className="system-map-page-focus-actions-grid">
                {selectedFeatureUsagePaths.slice(0, 2).map((path) => (
                  <button className="system-map-page-focus-action" key={`feature-path-${path.id}`} onClick={() => onSetSelectedUsagePathId(path.id)}>
                    <span>查看路径</span><small>{path.title}</small>
                  </button>
                ))}
                {selectedFeaturePlaybooks.slice(0, 2).map((playbook) => (
                  <button className="system-map-page-focus-action" key={`feature-playbook-${playbook.id}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: playbook.id }, draftTasks), onNavigate, onOpenTarget)}>
                    <span>查看清单</span><small>{playbook.title}</small>
                  </button>
                ))}
                {selectedFeatureDrafts.slice(0, 1).map((draft) => (
                  <button className="system-map-page-focus-action" key={`feature-draft-${draft.id}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedFeatureDomain.cockpit_page }, draftTasks), onNavigate, onOpenTarget)}>
                    <span>查看页面草稿</span><small>{draft.title}</small>
                  </button>
                ))}
                {selectedFeatureRoadmapItems.slice(0, 1).map((item) => (
                  <button className="system-map-page-focus-action" key={`feature-roadmap-${item.id}`} onClick={() => openSystemMapTarget({ tab: item.cockpit_page, taskQuery: item.id }, onNavigate, onOpenTarget)}>
                    <span>查看路线图</span><small>{item.title}</small>
                  </button>
                ))}
                {selectedFeatureUsagePaths.length === 0 && selectedFeaturePlaybooks.length === 0 && selectedFeatureDrafts.length === 0 && selectedFeatureRoadmapItems.length === 0 && (
                  <div className="system-map-page-focus-empty">这个能力域还缺直接修复入口，先补页面与路径映射。</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

export default SystemMapDetailPanel;
