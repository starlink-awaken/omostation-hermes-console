import React from 'react';
import { ClipboardCheck, Copy, Eye, X } from 'lucide-react';
import type {
  CockpitPage,
  CockpitNavigationTarget,
  DraftTask,
  OperatingPlaybook,
  ProjectAction,
  ProjectItem,
  SourceRef,
  UsagePath,
} from './types';
import {
  closeoutText,
  copyText,
  freshnessText,
  openCockpitNavigationTarget,
  openSystemMapTarget,
  portfolioStatusText,
  projectStatusText,
  runtimeProfileText,
  runtimeStatusText,
  shortDate,
  statusClass,
  verifyText,
  withTaskDraftHandoff,
} from './utils';
import PageButton from './PageButton';
import SourceRefList from './SourceRefList';
import ProjectActionList from './ProjectActionList';

type ProjectDetailPanelProps = {
  project: ProjectItem;
  page?: CockpitPage;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onFocusCoverage: (dimensionId: string) => void;
  onFocusUsagePath: (usagePathId: string) => void;
  onFocusPageMaturity: (pageId: string) => void;
  relatedUsagePaths: UsagePath[];
  relatedPlaybooks: OperatingPlaybook[];
  relatedDrafts: DraftTask[];
  onInspect: (ref: SourceRef) => void;
  onQueueAction: (action: ProjectAction) => void;
  onQueueTriageCommand: (command: ProjectAction) => void;
  pendingActionKey?: string | null;
  activeTarget: string;
};

function ProjectDetailPanel({
  project,
  page,
  onClose,
  onNavigate,
  onOpenTarget,
  onFocusCoverage,
  onFocusUsagePath,
  onFocusPageMaturity,
  relatedUsagePaths,
  relatedPlaybooks,
  relatedDrafts,
  onInspect,
  onQueueAction,
  onQueueTriageCommand,
  pendingActionKey,
  activeTarget,
}: ProjectDetailPanelProps) {
  const verification = project.runtime.latest_verification;
  const attentionChecks = project.coverage_checks.filter((check) => check.status !== 'ready');
  const latestWorkflowRun = project.workflow.runs[0];
  const verificationHistory = project.workflow.runs
    .filter((run) => run.verify_checks > 0 || Boolean(run.verify_status && run.verify_status !== 'unknown'))
    .slice(0, 4);
  const primaryRepairCheck = attentionChecks[0] || project.coverage_checks[0];
  return (
    <section className="services-section system-map-section system-map-project-detail" aria-label={`${project.id} 项目详情`}>
      <div className="system-map-project-detail-head">
        <div>
          <span className="text-muted">项目详情</span>
          <h2>{project.id}</h2>
          <p>{project.role || project.stack}</p>
        </div>
        <div className="system-map-project-detail-actions">
          {page && <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={project.id} />}
          <button className="antd-btn" onClick={onClose}>
            <X size={14} />
            <span>关闭</span>
          </button>
        </div>
      </div>

      <div className="system-map-project-detail-meta">
        <span className={`status-badge ${statusClass(project.operational.status)}`}>{projectStatusText(project.operational.status)}</span>
        <span className={`status-badge ${statusClass(project.runtime.status)}`}>{runtimeStatusText(project.runtime.status)}</span>
        <span className={`status-badge ${statusClass(verification.status)}`}>{verifyText(verification.status)}</span>
        {verification.freshness && (
          <span className={`status-badge ${statusClass(verification.freshness.status === 'fresh' ? 'ready' : 'warning')}`}>
            {freshnessText(verification.freshness)}
          </span>
        )}
        <span className={`status-badge ${statusClass(project.workflow.latest_status)}`}>workflow {project.workflow.latest_status}</span>
        <span className={`status-badge ${statusClass(project.coverage)}`}>{project.coverage === 'native' ? '原生入口' : '定位入口'}</span>
        <span className={`status-badge ${statusClass(project.portfolio.status)}`}>组合 {portfolioStatusText(project.portfolio.status)} · {project.portfolio.score}%</span>
      </div>

      <article className="system-map-project-detail-source">
        <h3>实现位置</h3>
        <div className="system-map-project-detail-facts">
          <span>形态：{project.operational.surface_type || 'native'}</span>
          <code>{project.operational.resolved_location || project.source_location || project.path}</code>
          {project.operational.declared_location && project.operational.declared_location !== project.operational.resolved_location && (
            <span className="system-map-risk-line">注册声明：{project.operational.declared_location}</span>
          )}
        </div>
      </article>

      <article className="system-map-project-detail-source">
        <h3>注册合同</h3>
        <div className="system-map-project-detail-facts">
          <span className={"status-badge " + statusClass(project.registry_contract?.status_text || 'unknown')}>
            合同：{project.registry_contract?.status_text === 'ready'
              ? '完整'
              : project.registry_contract?.status_text === 'warning'
                ? '提醒'
                : project.registry_contract?.status_text === 'failed'
                  ? '缺失'
                  : '未读取'}
          </span>
          <span>声明状态：{project.registry_contract?.status || '未登记'}</span>
          <span>版本：{project.registry_contract?.version || '未登记'}</span>
          <span>运行时：{project.registry_contract?.python || '未登记'}</span>
          <span>构建后端：{project.registry_contract?.build_backend || '未登记'}</span>
          {project.registry_contract?.src_dir && <span>源码目录：{project.registry_contract.src_dir}</span>}
          {project.registry_contract?.physical_location && <span>物理落点：{project.registry_contract.physical_location}</span>}
          {project.registry_contract?.observed_location && (
            <span>观测落点：{project.registry_contract.observed_location}</span>
          )}
          {project.registry_contract?.implementation_traceability === 'observed_only' && (
            <div className="system-map-risk-line">代码落点已观测，但注册表尚未声明实现位置。</div>
          )}
          {project.registry_contract?.port_registry_ref && <span>端口引用：{project.registry_contract.port_registry_ref}</span>}
        </div>
        {project.registry_contract?.missing_fields && project.registry_contract.missing_fields.length > 0 && (
          <div className="system-map-risk-line">
            缺失字段：{project.registry_contract.missing_fields.join('、')}
          </div>
        )}
        {project.registry_contract?.coverage && project.registry_contract.coverage.length > 0 && (
          <div className="system-map-coverage-cell" aria-label={project.id + ' 注册覆盖'}>
            {project.registry_contract.coverage.map((item) => <span key={item}>{item}</span>)}
          </div>
        )}
      </article>

      <div className="system-map-project-detail-grid">
        <article className="system-map-project-detail-wide">
          <h3>工作流时间线</h3>
          {latestWorkflowRun ? (
            <>
              <div className="system-map-project-detail-facts">
                <span>run：{latestWorkflowRun.run_id}</span>
                <span>workflow：{latestWorkflowRun.workflow_id}</span>
                <span>目标：{latestWorkflowRun.objective || '未登记'}</span>
                <span>最近：{latestWorkflowRun.latest_ts ? shortDate(latestWorkflowRun.latest_ts) : '暂无'}</span>
              </div>
              <div className="system-map-workflow-timeline">
                {latestWorkflowRun.events.map((event, index) => (
                  <div className={`system-map-workflow-event ${statusClass(event.status)}`} key={`${event.type}-${event.ts || index}`}>
                    <strong>{event.type}</strong>
                    <span>{event.summary}</span>
                    <small>{event.ts ? shortDate(event.ts) : '暂无时间'}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <span className="text-muted">暂无项目工作流事件</span>
          )}
        </article>

        <article>
          <h3>验证证据</h3>
          <div className="system-map-project-detail-facts">
            <span>状态：{verifyText(verification.status)}</span>
            <span>checks：{verification.checks}</span>
            <span>run：{verification.run_id || '暂无'}</span>
            <span>时间：{verification.ts ? shortDate(verification.ts) : '暂无'}</span>
            <span>收口：{closeoutText(verification.closeout_status)}</span>
            <span>新鲜度：{freshnessText(verification.freshness)}</span>
          </div>
          {verification.source && (
            <div className="system-map-risk-line">
              证据来源：{verification.source}
              {verification.command ? ` · ${verification.command}` : ''}
              {verification.closeout_ref ? ` · ${verification.closeout_ref}` : ''}
            </div>
          )}
          {verification.freshness && verification.freshness.status !== 'fresh' && (
            <div className="system-map-risk-line">
              {verification.freshness.next_action || '补录最新验证证据。'}
            </div>
          )}
          {verificationHistory.length > 0 && (
            <div className="system-map-verification-history" role="region" aria-label={`${project.id} 验证历史`}>
              <strong>验证历史</strong>
              <div className="system-map-workflow-timeline">
                {verificationHistory.map((run) => (
                  <div className={`system-map-workflow-event ${statusClass(run.verify_status)}`} key={run.run_id}>
                    <strong>{verifyText(run.verify_status)}</strong>
                    <span>{run.run_id} · checks {run.verify_checks}</span>
                    <small>{run.latest_ts ? shortDate(run.latest_ts) : '暂无时间'}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article>
          <h3>运行探针</h3>
          <div className="system-map-project-detail-facts">
            <span>状态：{runtimeStatusText(project.runtime.status)}</span>
            <span>形态：{runtimeProfileText(project.runtime.profile)}</span>
            <span>监听：{project.runtime.listening_count} / {project.runtime.ports.length}</span>
            <span>探测：{project.runtime.checked_at ? shortDate(project.runtime.checked_at) : '暂无'}</span>
            <span>证据：{project.runtime.probe_task?.status === 'succeeded'
              ? '已留证'
              : project.runtime.probe_task?.status === 'failed'
                ? '探针失败'
                : project.runtime.probe_task?.human_approval_required && project.runtime.probe_task.approval_state === 'missing'
                  ? '待人工审批'
                  : project.runtime.probe_task?.human_approval_required && project.runtime.probe_task.approval_state === 'granted'
                    ? '已授权待执行'
                : project.runtime.probe_task?.status === 'planned' || project.runtime.probe_task?.status === 'active'
                  ? '任务处理中'
                  : '即时探测'}
            </span>
            {project.runtime.probe_task?.human_approval_required && (
              <span>下一步：{project.runtime.probe_task.next_action || '等待人工审批'}</span>
            )}
            <span>新鲜度：{freshnessText(project.runtime.probe_task?.freshness)}</span>
          </div>
          <div className="system-map-risk-line">{project.runtime.probe_reason}</div>
          {project.runtime.port_conflicts && project.runtime.port_conflicts.length > 0 && (
            <div className="system-map-risk-line offline">
              端口冲突：{project.runtime.port_conflicts.map((conflict) => `:${conflict.port} · ${conflict.projects.join('、')}`).join('；')}
            </div>
          )}
          {project.runtime.probe_task?.freshness && project.runtime.probe_task.freshness.status !== 'fresh' && (
            <div className="system-map-risk-line">
              {project.runtime.probe_task.freshness.next_action || '补录最新运行探针证据。'}
            </div>
          )}
          {project.runtime.probe_task?.execution_audit && (
            <div className="system-map-risk-line">
              任务退出码：{String(project.runtime.probe_task.execution_audit.exit_code ?? '暂无')}
              {project.runtime.probe_task.execution_audit.log_ref
                ? ' · ' + String(project.runtime.probe_task.execution_audit.log_ref)
                : ''}
            </div>
          )}
          {project.runtime.ports.length > 0 && (
            <div className="system-map-port-list">
              {project.runtime.ports.slice(0, 6).map((port) => (
                <span
                  key={port.port}
                  className={port.conflict_projects?.length ? 'degraded' : port.listening ? 'online' : ['not_probeable', 'deprecated'].includes(port.probe_status || '') ? 'degraded' : 'offline'}
                  title={port.conflict_projects?.length ? `与 ${port.conflict_projects.join('、')} 冲突` : port.probe_reason || port.service}
                >
                  :{port.port} {port.service} · {port.conflict_projects?.length ? '端口冲突' : port.probe_status === 'deprecated' ? '已弃用' : port.probe_status === 'not_probeable' ? '不可探测' : port.listening ? '监听' : '未监听'}
                </span>
              ))}
            </div>
          )}
        </article>

        <article>
          <h3>覆盖缺口</h3>
          <div className="system-map-project-detail-checks">
            {(attentionChecks.length > 0 ? attentionChecks : project.coverage_checks.slice(0, 4)).map((check) => (
              <div className={`system-map-diagnostic ${statusClass(check.status)}`} key={check.id}>
                <strong>{check.title}</strong>
                <small>{check.detail}</small>
                <small>下一步：{check.next_action}</small>
              </div>
            ))}
          </div>
        </article>

        <article>
          <h3>排查命令</h3>
          <div className="system-map-triage-command-list">
            {project.triage_commands.length > 0 ? (
              project.triage_commands.slice(0, 6).map((command) => {
                const existingTaskId = command.task?.task_id;
                const canOpenTask = Boolean(
                  existingTaskId
                  && ['active', 'planned', 'pending'].includes(command.task?.status || '')
                  && (onOpenTarget || onNavigate),
                );
                const canRetryTask = Boolean(command.task?.status && command.task.status !== 'not_queued' && !canOpenTask);
                return (
                  <div className="system-map-project-triage-detail" key={`${project.id}-${command.id}`}>
                    <button
                      className={`system-map-triage-command ${statusClass(command.risk)}`}
                      disabled={!command.enabled}
                      onClick={() => void copyText(command.value)}
                      title={command.guard}
                    >
                      <Copy size={12} />
                      <span>
                        <strong>{command.label}</strong>
                        <small>{command.reason}</small>
                        <code>{command.value}</code>
                      </span>
                    </button>
                    <button
                      className={`system-map-triage-queue ${statusClass(command.risk)}`}
                      disabled={!command.enabled || pendingActionKey === `triage:${project.id}:${command.id}`}
                      aria-label={canOpenTask
                        ? `打开项目排查任务 ${command.label}`
                        : canRetryTask
                          ? `重新承接排查命令 ${command.label}`
                          : `承接项目排查命令 ${command.label}`}
                      title={canOpenTask
                        ? '打开已承接任务，继续审批、执行或查看证据'
                        : canRetryTask
                          ? '上一次排查已结束，创建新的尝试并保留历史证据'
                          : '登记为计划任务，不会直接执行命令'}
                      onClick={() => canOpenTask
                        ? openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: existingTaskId }, onNavigate, onOpenTarget)
                        : onQueueTriageCommand(command)}
                    >
                      {canOpenTask ? <Eye size={12} /> : <ClipboardCheck size={12} />}
                      {!canOpenTask && pendingActionKey === `triage:${project.id}:${command.id}` && <span>承接中</span>}
                    </button>
                  </div>
                );
              })
            ) : (
              <span className="text-muted">暂无需要排查的命令</span>
            )}
          </div>
        </article>

        <article>
          <h3>受控动作</h3>
          <ProjectActionList
            actions={project.actions}
            onNavigate={onNavigate}
            onOpenTarget={onOpenTarget}
            projectId={project.id}
            onQueueAction={onQueueAction}
            pendingActionKey={pendingActionKey}
          />
        </article>

        <article>
          <h3>修复入口</h3>
          <div className="system-map-page-focus-actions-grid">
            <button
              className="system-map-page-focus-action"
              onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: project.id }, relatedDrafts), onNavigate, onOpenTarget)}
            >
              <span>查看项目草稿</span>
              <small>{project.id}</small>
            </button>
            {primaryRepairCheck && (
              <button
                className="system-map-page-focus-action"
                onClick={() => onFocusCoverage(primaryRepairCheck.id)}
              >
                <span>查看覆盖维度</span>
                <small>{primaryRepairCheck.title}</small>
              </button>
            )}
            {page && (
              <button
                className="system-map-page-focus-action"
                onClick={() => onFocusPageMaturity(page.id)}
              >
                <span>查看页面能力</span>
                <small>{page.title}</small>
              </button>
            )}
            {relatedUsagePaths.slice(0, 1).map((path) => (
              <button
                className="system-map-page-focus-action"
                key={`project-path-${path.id}`}
                onClick={() => onFocusUsagePath(path.id)}
              >
                <span>查看使用路径</span>
                <small>{path.title}</small>
              </button>
            ))}
            {relatedPlaybooks.slice(0, 1).map((playbook) => (
              <button
                className="system-map-page-focus-action"
                key={`project-playbook-${playbook.id}`}
                onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: playbook.id }, relatedDrafts), onNavigate, onOpenTarget)}
              >
                <span>查看操作清单</span>
                <small>{playbook.title}</small>
              </button>
            ))}
            {relatedDrafts.slice(0, 1).map((draft) => (
              <button
                className="system-map-page-focus-action"
                key={`project-draft-${draft.id}`}
                onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: project.id }, relatedDrafts), onNavigate, onOpenTarget)}
              >
                <span>查看补证草稿</span>
                <small>{draft.title}</small>
              </button>
            ))}
          </div>
        </article>

        <article>
          <h3>来源证据</h3>
          <SourceRefList refs={project.source_refs} onInspect={onInspect} activeTarget={activeTarget} />
        </article>
      </div>
    </section>
  );
}

export default ProjectDetailPanel;
