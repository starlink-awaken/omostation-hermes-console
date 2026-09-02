import React from 'react';
import { GitBranch, Search } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';

interface FocusedResearchCardProps {
  kicker: string;
  title: string;
  detail: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function FocusedResearchCard({
  kicker,
  title,
  detail,
  objectTarget,
  taskTarget,
  onNavigate,
  onOpenTarget,
}: FocusedResearchCardProps) {
  return (
    <section className="services-section overview-ops-panel" aria-label="当前研究承接焦点">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>当前研究承接焦点</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把系统地图、页面审计或任务里丢过来的上下文，直接翻成研究面当前该承接的对象。
          </p>
        </div>
        <span className="status-badge online">{kicker}</span>
      </div>
      <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
        <div>
          <strong>{title}</strong>
          <p>{detail}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开研究焦点对象 ${title}`}
            onClick={() => openCockpitNavigationTarget(objectTarget, onNavigate, onOpenTarget)}
          >
            <Search size={14} />
            <span>打开对象</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开研究焦点任务 ${title}`}
            onClick={() => openCockpitNavigationTarget(taskTarget, onNavigate, onOpenTarget)}
          >
            <GitBranch size={14} />
            <span>打开任务</span>
          </button>
        </div>
      </article>
    </section>
  );
}
