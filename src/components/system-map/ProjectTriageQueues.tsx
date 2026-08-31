import React from 'react';
import { ClipboardCheck, Copy, Eye } from 'lucide-react';
import type { ProjectAction, ProjectTriageQueue, CockpitNavigationTarget } from './types';
import { copyText, openCockpitNavigationTarget, statusClass } from './utils';

type ProjectTriageQueuesProps = {
  queues: ProjectTriageQueue[];
  onQueueCommand?: (command: ProjectAction) => void;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: { tab: string; taskQuery?: string }) => void;
  pendingActionKey?: string | null;
};

function ProjectTriageQueues({
  queues,
  onQueueCommand,
  onNavigate,
  onOpenTarget,
  pendingActionKey,
}: ProjectTriageQueuesProps) {
  const taskStatusLabel = (status?: string) => {
    switch (status) {
      case 'planned': return '已排队';
      case 'active': return '执行中';
      case 'succeeded': return '已通过';
      case 'failed': return '已失败';
      case 'completed': return '已完成';
      default: return '';
    }
  };
  return (
    <div className="system-map-triage-grid">
      {queues.map((queue) => (
        <article className={`system-map-triage-card ${statusClass(queue.severity)}`} key={queue.id}>
          <div className="system-map-triage-head">
            <div>
              <h3>{queue.title}</h3>
              <p>{queue.reason}</p>
            </div>
            <div className="system-map-triage-count">
              <strong>{queue.count}</strong>
              <small>{queue.queued || 0} 已承接 · {queue.failed || 0} 失败</small>
            </div>
          </div>
          <div className="system-map-triage-projects">
            {queue.project_ids.slice(0, 5).map((projectId) => (
              <span key={projectId}>{projectId}</span>
            ))}
          </div>
          <div className="system-map-triage-command-list">
            {queue.commands.length > 0 ? (
              queue.commands.slice(0, 4).map((command) => (
                <div className="system-map-triage-command-row" key={`${queue.id}-${command.project_id}-${command.id}`}>
                  <button
                    className={`system-map-triage-command ${statusClass(command.risk)}`}
                    disabled={!command.enabled}
                    onClick={() => void copyText(command.value)}
                    title={command.guard}
                  >
                    <Copy size={12} />
                    <span>
                      <strong>{command.project_id} · {command.label}</strong>
                      <small>{command.reason}</small>
                      {command.task?.status && command.task.status !== 'not_queued' && (
                        <small className="system-map-triage-task-status">任务：{taskStatusLabel(command.task.status)}</small>
                      )}
                      <code>{command.value}</code>
                    </span>
                  </button>
                  {onQueueCommand && (
                    (() => {
                      const existingTaskId = command.task?.task_id;
                      const hasTask = Boolean(command.task?.status && command.task.status !== 'not_queued');
                      const canOpenTask = hasTask
                        && Boolean(existingTaskId)
                        && ['active', 'planned', 'pending'].includes(command.task?.status || '')
                        && Boolean(onOpenTarget || onNavigate);
                      const canRetryTask = hasTask && !canOpenTask;
                      return (
                        <button
                          className={`system-map-triage-queue ${statusClass(command.risk)}`}
                          disabled={!command.enabled || pendingActionKey === `triage:${command.project_id}:${command.id}`}
                          aria-label={canOpenTask
                            ? `打开排查任务 ${command.project_id} ${command.label}`
                            : canRetryTask
                              ? `重新承接排查命令 ${command.project_id} ${command.label}`
                              : `承接排查命令 ${command.project_id} ${command.label}`}
                          title={canOpenTask
                            ? '打开已承接任务，继续审批、执行或查看证据'
                            : canRetryTask
                              ? '上一次排查已结束，创建新的尝试并保留历史证据'
                              : '登记为 OMO 计划任务，不会直接执行命令'}
                          onClick={() => canOpenTask
                            ? openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: existingTaskId }, onNavigate, onOpenTarget)
                            : onQueueCommand(command)}
                        >
                          {canOpenTask ? <Eye size={12} /> : <ClipboardCheck size={12} />}
                          {!hasTask && pendingActionKey === `triage:${command.project_id}:${command.id}` && <span>承接中</span>}
                        </button>
                      );
                    })()
                  )}
                </div>
              ))
            ) : (
              <span className="text-muted">暂无需要排查的命令</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export default ProjectTriageQueues;
