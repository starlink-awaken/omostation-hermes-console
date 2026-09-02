import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { CockpitNavigationTarget, DraftTask, PageMaturity, ProjectItem, ProjectPortfolioPriority, RoadmapItem, SystemMapPayload } from './types';
import { draftSourceLabel, openSystemMapTarget, pageMaturityStatusText, withTaskDraftHandoff } from './utils';

type BuildControlSectionProps = {
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
  draftTasks: DraftTask[];
  onSetSelectedPageMaturityId: (id: string | null) => void;
  onSetSelectedGapId: (id: string | null) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

function BuildControlSection({
  capabilityBuildBacklog,
  buildControlTower,
  draftTasks,
  onSetSelectedPageMaturityId,
  onSetSelectedGapId,
  onSetSelectedProjectId,
  onNavigate,
  onOpenTarget,
}: BuildControlSectionProps) {
  return (
    <>
      <section className="services-section system-map-section system-map-build-backlog" aria-label="统一建设控制台">
        <div className="section-header">
          <div><h2>统一建设控制台</h2><p className="text-muted">把页面能力、领域挂载合同、验证补证和路线图优先项拉到一张桌子上，先做真正影响日用的建设动作。</p></div>
          <button className="antd-btn" onClick={() => onOpenTarget?.({ tab: 'TaskCenter', taskQuery: buildControlTower.priorityItems[0]?.id || buildControlTower.pageItems[0]?.page.id || '建设' })}><ClipboardCheck size={14} /><span>统一承接到任务中心</span></button>
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
                <button key={`control-domain-${app.id}`} className="system-map-build-item" aria-label={`打开领域合同项 ${app.id}`} onClick={() => onOpenTarget?.({ tab: 'DomainApps', taskQuery: app.id })}>
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
                  <button key={`control-verify-draft-${item.task.id}`} className="system-map-build-item" aria-label={`打开验证补证 ${item.task.source?.id || item.task.id}`} onClick={() => onOpenTarget?.(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: item.task.source?.id || item.task.id }, draftTasks))}>
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
                  <button key={`control-priority-roadmap-${item.roadmap.id}`} className="system-map-build-item" aria-label={`打开路线图优先项 ${item.roadmap.id}`} onClick={() => onOpenTarget?.({ tab: item.roadmap.cockpit_page, taskQuery: item.roadmap.id })}>
                    <strong>{item.roadmap.title}</strong><span>路线图 · {item.roadmap.priority} · {item.roadmap.status}</span><small>{item.roadmap.problem}</small>
                  </button>
                )
              ))}
              {buildControlTower.priorityItems.length === 0 && (<div className="system-map-build-empty">当前没有更高优先级的项目与路线图项</div>)}
            </div>
          </article>
        </div>
      </section>

      <section className="services-section system-map-section system-map-build-backlog" aria-label="能力建设 Backlog">
        <div className="section-header">
          <div><h2>能力建设 Backlog</h2><p className="text-muted">把待补页面、待收口领域、显性能力缺口和未完成路线图收成一个建设面，不用在多个区块之间自己拼。</p></div>
          <button className="antd-btn" onClick={() => onOpenTarget?.({ tab: 'TaskCenter', taskQuery: capabilityBuildBacklog.pagesWithoutUsage[0]?.page.id || capabilityBuildBacklog.domainAttention[0]?.id || '能力建设' })}><ClipboardCheck size={14} /><span>任务中心</span></button>
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
                <button key={`build-domain-app-${app.id}`} className="system-map-build-item" aria-label={`打开待收口领域 ${app.id}`} onClick={() => onOpenTarget?.({ tab: 'DomainApps', taskQuery: app.id })}>
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
                <button key={`build-roadmap-${item.id}`} className="system-map-build-item" aria-label={`打开待完成路线图 ${item.id}`} onClick={() => onOpenTarget?.({ tab: item.cockpit_page, taskQuery: item.id })}>
                  <strong>{item.title}</strong><span>路线图 · {item.priority} · {item.status}</span><small>{item.problem}</small>
                </button>
              ))}
              {capabilityBuildBacklog.actionableDrafts.map((task) => (
                <button key={`build-draft-${task.id}`} className="system-map-build-item" aria-label={`打开建设草稿 ${task.title}`} onClick={() => onOpenTarget?.(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: task.source?.id || task.id }, draftTasks))}>
                  <strong>{task.title}</strong><span>{draftSourceLabel(task.source?.type)} · {task.priority || 'medium'}</span><small>{task.description || task.source?.title || '进入任务中心承接建设草稿。'}</small>
                </button>
              ))}
              {capabilityBuildBacklog.plannedRoadmapItems.length === 0 && capabilityBuildBacklog.actionableDrafts.length === 0 && (<div className="system-map-build-empty">当前没有待承接路线图和草稿</div>)}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

export default BuildControlSection;
