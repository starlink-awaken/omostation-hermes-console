import React from 'react';
import { AlertTriangle, BookOpen, Compass, GitBranch, RefreshCw, Search } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import { type ResearchHubPayload } from './types';
import { copyText } from './utils';

interface ResearchStatsSectionProps {
  payload: ResearchHubPayload;
  refreshing: boolean;
  sourceError: string | null;
  researchObjectQuery: string | undefined;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: { tab: string; taskQuery?: string; pageId?: string }) => void;
  onRefresh: () => void;
}

export function ResearchStatsSection({
  payload,
  refreshing,
  sourceError,
  researchObjectQuery,
  onNavigate,
  onOpenTarget,
  onRefresh,
}: ResearchStatsSectionProps) {
  return (
    <section className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>研究主旅程</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把 `cockpit research` 从 CLI 命令堆，整理成一个能看见对象、上下文、发布和后续动作的站内入口。
          </p>
        </div>
        <button className="antd-btn" onClick={onRefresh}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>刷新</span>
        </button>
      </div>

      {sourceError && (
        <div className="overview-inline-error" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>研究数据需要补证</strong>
            <span>{sourceError}，当前空状态不代表没有研究对象。</span>
          </div>
          <button type="button" className="antd-btn" onClick={onRefresh}>重试</button>
        </div>
      )}

      <div className="stats-grid">
        {[
          ['活跃研究', payload.summary.active, <Search key="search" size={20} />],
          ['已发布', payload.summary.published, <BookOpen key="book" size={20} />],
          ['追问总数', payload.summary.follow_ups, <GitBranch key="branch" size={20} />],
          ['参与 Agent', payload.summary.agents, <Compass key="compass" size={20} />],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="stat-card">
            <div className="stat-icon-wrapper pulse-info">{icon}</div>
            <div className="stat-info">
              <h3>{label}</h3>
              <p className="stat-value">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>研究到执行链</h3>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>先确认研究对象，再补上下文，最后落任务。</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {payload.pipeline.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className="action-surface-item"
                onClick={() => openCockpitNavigationTarget({ tab: step.id, taskQuery: researchObjectQuery }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{index + 1}. {step.title}</strong>
                  <p>{step.summary}</p>
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>常用命令</h3>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>先复制，再执行，避免靠记忆敲错。</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {payload.commands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="action-surface-item"
                onClick={() => void copyText(command.value)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{command.label}</strong>
                  <p>{command.detail}</p>
                  <code style={{ fontSize: 12, color: 'var(--antd-primary)' }}>{command.value}</code>
                </div>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
