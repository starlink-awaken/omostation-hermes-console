import React from 'react';
import { Copy, Layers, Route, ShieldAlert } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';
import { type ProtocolSurfaceId } from './types';
import { copyText } from './utils';

interface ProtocolTaskDraft {
  title: string;
  description: string;
  checklist: string[];
  copyText: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface ProtocolEditorProps {
  draft: ProtocolTaskDraft;
  surfaceTitle: string;
  surfaceId: ProtocolSurfaceId;
  pending: boolean;
  notice: string | null;
  error: string | null;
  onCreateTask: (draft: ProtocolTaskDraft, surfaceId: ProtocolSurfaceId) => void;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export default function ProtocolEditor({
  draft,
  surfaceTitle,
  surfaceId,
  pending,
  notice,
  error,
  onCreateTask,
  onNavigate,
  onOpenTarget,
}: ProtocolEditorProps) {
  return (
    <section className="services-section" role="region" aria-label="协议补位任务">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>协议补位任务</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把当前协议层直接翻成一条可复制、可送往任务中心的补位动作，避免协议面停在浏览或抄命令状态。
          </p>
        </div>
        <span className="status-badge degraded">草稿就绪</span>
      </div>
      <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
        <div>
          <strong>{draft.title}</strong>
          <p>{draft.description}</p>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {draft.checklist.map((item, index) => (
              <small key={`${draft.title}-${index}`} className="text-muted">{index + 1}. {item}</small>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="antd-btn"
            disabled={pending}
            aria-label={`登记协议治理任务 ${draft.title}`}
            onClick={() => { void onCreateTask(draft, surfaceId); }}
          >
            <ShieldAlert size={14} />
            <span>{pending ? '登记中...' : '登记正式任务'}</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`复制协议补位任务 ${draft.title}`}
            onClick={async () => {
              await copyText(draft.copyText);
            }}
          >
            <Copy size={14} />
            <span>复制补位任务</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开协议补位对象 ${draft.title}`}
            onClick={() => openCockpitNavigationTarget(draft.objectTarget, onNavigate, onOpenTarget)}
          >
            <Layers size={14} />
            <span>打开相关对象</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开协议补位任务 ${draft.title}`}
            onClick={() => openCockpitNavigationTarget(draft.taskTarget, onNavigate, onOpenTarget)}
          >
            <Route size={14} />
            <span>送进任务中心</span>
          </button>
        </div>
      </article>
      {notice && (
        <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{notice}</p>
      )}
      {error && (
        <p role="alert" className="text-danger" style={{ margin: 0, fontSize: 12 }}>{error}</p>
      )}
    </section>
  );
}
