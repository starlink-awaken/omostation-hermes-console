import React from 'react';
import { ArrowRight, ClipboardCheck, Copy } from 'lucide-react';
import type { ProjectAction, CockpitNavigationTarget } from './types';
import { copyText, openSystemMapTarget, statusClass } from './utils';

type ProjectActionListProps = {
  actions?: ProjectAction[];
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  projectId?: string;
  onQueueAction?: (action: ProjectAction) => void;
  pendingActionKey?: string | null;
};

function ProjectActionList({
  actions,
  onNavigate,
  onOpenTarget,
  projectId,
  onQueueAction,
  pendingActionKey,
}: ProjectActionListProps) {
  if (!actions || actions.length === 0) return <span className="text-muted">待登记</span>;
  return (
    <div className="system-map-action-list">
      {actions.slice(0, 4).map((action) => (
        <div key={action.id} className="system-map-project-action-group">
          <button
            className={`system-map-project-action ${statusClass(action.risk)}`}
            disabled={!action.enabled || pendingActionKey === `project:${projectId}:${action.id}`}
            onClick={() => {
              if (action.kind === 'navigate') {
                openSystemMapTarget({ tab: action.value, projectId }, onNavigate, onOpenTarget);
                return;
              }
              void copyText(action.value);
            }}
            title={action.guard}
          >
            {action.kind === 'navigate' ? <ArrowRight size={12} /> : <Copy size={12} />}
            <span>{action.label}</span>
          </button>
          {action.kind === 'copy_command' && onQueueAction && (
            <button
              className={`system-map-project-action queue ${statusClass(action.risk)}`}
              disabled={!action.enabled || pendingActionKey === `project:${projectId}:${action.id}`}
              aria-label={`承接项目动作 ${action.label}`}
              title="登记为 OMO 计划任务，不会直接执行命令"
              onClick={() => onQueueAction(action)}
            >
              <ClipboardCheck size={12} />
              {pendingActionKey === `project:${projectId}:${action.id}` && <span>承接中</span>}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProjectActionList;
