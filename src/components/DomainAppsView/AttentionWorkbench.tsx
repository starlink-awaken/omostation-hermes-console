import React from 'react';
import { AppWindow, FileText } from 'lucide-react';
import { type DomainApp, type DomainAttentionFilter, type DomainAttentionItem } from './types';
import { badgeClass, riskText, runtimeLabels, securityText } from './utils';
import { DomainActionButtons } from './DomainActionButtons';

export function AttentionWorkbench({
  filteredAttentionItems,
  attentionCounts,
  attentionFilter,
  onAttentionFilterChange,
  onFocusApp,
  onOpenTaskCenter,
  onQueueAction,
  onExecuteVerification,
  isActionPending,
  verificationPendingFor,
}: {
  filteredAttentionItems: DomainAttentionItem[];
  attentionCounts: { all: number; runtime: number; security: number; high_risk: number };
  attentionFilter: DomainAttentionFilter;
  onAttentionFilterChange: (filter: DomainAttentionFilter) => void;
  onFocusApp: (appId: string) => void;
  onOpenTaskCenter: (query: string) => void;
  onQueueAction: (app: DomainApp, action: DomainApp['actions'][number]) => void;
  onExecuteVerification: (app: DomainApp) => void;
  isActionPending: (app: DomainApp, action: DomainApp['actions'][number]) => boolean;
  verificationPendingFor: (app: DomainApp) => boolean;
}) {
  return (
    <section className="services-section" aria-label="领域关注工作台" style={{ marginBottom: 20 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>领域关注工作台</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            先处理待启动服务、高风险挂载和安全未过项，减少从首页跳进来之后还要自己扫卡片的成本。
          </p>
        </div>
        <span className={`status-badge ${filteredAttentionItems.length > 0 ? 'degraded' : 'online'}`}>
          {filteredAttentionItems.length > 0 ? `待处理 ${filteredAttentionItems.length}` : '当前已清空'}
        </span>
      </div>
      <div className="domain-attention-filters">
        {[
          ['all', '全部关注', attentionCounts.all],
          ['runtime', '待启动', attentionCounts.runtime],
          ['security', '安全关注', attentionCounts.security],
          ['high_risk', '高风险', attentionCounts.high_risk],
        ].map(([id, label, count]) => (
          <button
            key={id}
            className={`domain-attention-filter ${attentionFilter === id ? 'active' : ''}`}
            onClick={() => onAttentionFilterChange(id as DomainAttentionFilter)}
          >
            <span>{label}</span>
            <strong>{count}</strong>
          </button>
        ))}
      </div>
      <div className="domain-attention-grid">
        {filteredAttentionItems.map(({ app, reasons, nextAction }) => (
          <article key={app.id} className="domain-attention-card">
            <div className="domain-attention-head">
              <div>
                <h3>{app.name}</h3>
                <p>{app.domain.name} · {app.integration_mode}</p>
              </div>
              <span className={`status-badge ${badgeClass(app.runtime.status)}`}>
                {runtimeLabels[app.runtime.status] || app.runtime.status}
              </span>
            </div>
            <div className="domain-attention-tags">
              {reasons.map((reason) => (
                <span key={`${app.id}-${reason}`}>{reason}</span>
              ))}
            </div>
            <strong className="domain-attention-next">{nextAction}</strong>
            <small className="domain-attention-meta">
              风险 {riskText(app.risk_level)} · 安全 {securityText(app.security_summary.posture)} · Freshness {String(app.freshness.status || '—')}
            </small>
            <div className="home-focus-actions" style={{ marginTop: 0 }}>
              <button className="antd-btn small" onClick={() => onFocusApp(app.id)}>
                <FileText size={13} />
                <span>查看剖面</span>
              </button>
              <button className="antd-btn small" onClick={() => onOpenTaskCenter(app.id)}>
                <AppWindow size={13} />
                <span>跟进任务</span>
              </button>
            </div>
            <DomainActionButtons
              actions={app.actions.slice(0, 3)}
              onQueueAction={(action) => void onQueueAction(app, action)}
              onExecuteVerification={() => void onExecuteVerification(app)}
              isActionPending={(action) => isActionPending(app, action)}
              verificationPending={verificationPendingFor(app)}
            />
          </article>
        ))}
        {filteredAttentionItems.length === 0 && (
          <div className="home-focus-empty">当前筛选下暂无需要处理的领域应用</div>
        )}
      </div>
    </section>
  );
}
