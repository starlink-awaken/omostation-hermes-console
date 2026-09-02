import React from 'react';
import { ClipboardCheck, Route } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';

interface ProtocolFocusCard {
  kicker: string;
  title: string;
  detail: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface ProtocolDetailProps {
  card: ProtocolFocusCard | null;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export default function ProtocolDetail({ card, onNavigate, onOpenTarget }: ProtocolDetailProps) {
  if (!card) return null;

  return (
    <section className="services-section overview-ops-panel" aria-label="当前协议承接焦点">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>当前协议承接焦点</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把系统地图、页面审计或任务里丢过来的上下文，直接翻成协议层下一跳。
          </p>
        </div>
        <span className="status-badge online">{card.kicker}</span>
      </div>
      <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
        <div>
          <strong>{card.title}</strong>
          <p>{card.detail}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开协议焦点对象 ${card.title}`}
            onClick={() => openCockpitNavigationTarget(card.objectTarget, onNavigate, onOpenTarget)}
          >
            <ClipboardCheck size={14} />
            <span>打开对象</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开协议焦点任务 ${card.title}`}
            onClick={() => openCockpitNavigationTarget(card.taskTarget, onNavigate, onOpenTarget)}
          >
            <Route size={14} />
            <span>打开任务</span>
          </button>
        </div>
      </article>
    </section>
  );
}
