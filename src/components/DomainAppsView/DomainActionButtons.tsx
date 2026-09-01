import React from 'react';
import { ClipboardCheck, Copy, ExternalLink, FileText, Play } from 'lucide-react';
import { type DomainApp } from './types';
import { copyText } from './utils';

export function DomainActionButtons({
  actions,
  onQueueAction,
  onExecuteVerification,
  isActionPending,
  verificationPending = false,
}: {
  actions: DomainApp['actions'];
  onQueueAction?: (action: DomainApp['actions'][number]) => void;
  onExecuteVerification?: (action: DomainApp['actions'][number]) => void;
  isActionPending?: (action: DomainApp['actions'][number]) => boolean;
  verificationPending?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
      {actions.map((action) => (
        action.kind === 'copy_command' ? (
          <React.Fragment key={action.id}>
            <button className="antd-btn" onClick={() => void copyText(action.value)} title={action.guard}>
              <Copy size={14} />
              <span>{action.label}</span>
            </button>
            {onQueueAction && action.enabled && (
              <button
                className="antd-btn"
                aria-label={`登记领域应用动作 ${action.label}`}
                onClick={() => onQueueAction(action)}
                disabled={isActionPending?.(action)}
                title="登记为 OMO 计划任务，不会直接执行命令"
              >
                <ClipboardCheck size={14} />
                <span>{isActionPending?.(action) ? '登记中...' : '登记任务'}</span>
              </button>
            )}
            {onExecuteVerification && action.id === 'copy-verify' && action.enabled && (
              <button
                className="antd-btn antd-btn-primary"
                aria-label={`执行领域应用验证 ${action.label}`}
                onClick={() => onExecuteVerification(action)}
                disabled={verificationPending}
                title="仅执行登记的低风险验证命令，并写入 OMO 证据"
              >
                <Play size={14} />
                <span>{verificationPending ? '验证中...' : '执行验证'}</span>
              </button>
            )}
          </React.Fragment>
        ) : (
          <a
            key={action.id}
            className={action.id === 'open' ? 'antd-btn antd-btn-primary' : 'antd-btn'}
            href={action.value}
            target={action.value.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            title={action.guard}
          >
            {action.kind === 'internal_link' ? <FileText size={14} /> : <ExternalLink size={14} />}
            <span>{action.label}</span>
          </a>
        )
      ))}
    </div>
  );
}
