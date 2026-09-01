import React from 'react';
import { AppWindow, CheckCircle, ShieldAlert } from 'lucide-react';
import { type DomainApp } from './types';
import { badgeClass, healthLabels, riskText, runtimeLabels, securityText, shortDate } from './utils';
import { DomainActionButtons } from './DomainActionButtons';

function AlertTriangleText({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <ShieldAlert size={16} className="text-warning" />
      <span>{items.join(' · ')}</span>
    </div>
  );
}

export function DomainAppCard({
  app,
  focused = false,
  onQueueAction,
  onExecuteVerification,
  isActionPending,
  verificationPending = false,
}: {
  app: DomainApp;
  focused?: boolean;
  onQueueAction?: (action: DomainApp['actions'][number]) => void;
  onExecuteVerification?: (action: DomainApp['actions'][number]) => void;
  isActionPending?: (action: DomainApp['actions'][number]) => boolean;
  verificationPending?: boolean;
}) {
  return (
    <article
      id={`domain-app-${app.id}`}
      className={`stat-card domain-app-card ${focused ? 'domain-app-card-focused' : ''}`}
      style={{ alignItems: 'stretch', minHeight: 260 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <div className={`stat-icon-wrapper pulse-${app.health === 'ready' ? 'success' : 'accent'}`} aria-hidden="true">
            <AppWindow size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{app.name}</h3>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>{app.domain.name} · {app.integration_mode}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span className={`status-badge ${badgeClass(app.health)}`}>
            {app.health === 'ready' ? <CheckCircle size={13} /> : <ShieldAlert size={13} />}
            <span style={{ marginLeft: 4 }}>{healthLabels[app.health] || app.health}</span>
          </span>
          <span className={`status-badge ${badgeClass(app.runtime.status)}`}>{runtimeLabels[app.runtime.status] || app.runtime.status}</span>
          <span className={`status-badge ${badgeClass(app.risk_level)}`}>{riskText(app.risk_level)}</span>
          <span className={`status-badge ${badgeClass(app.security_summary.posture)}`}>{securityText(app.security_summary.posture)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 16, fontSize: 13 }}>
        <div><strong>类型：</strong>{app.kind}</div>
        <div><strong>认证：</strong>{app.auth.type || '—'}</div>
        <div><strong>运行探针：</strong>{runtimeLabels[app.runtime.launch.status] || app.runtime.launch.status} / {runtimeLabels[app.runtime.api.status] || app.runtime.api.status}</div>
        <div><strong>数据新鲜度：</strong>{String(app.freshness.status || '—')} · {shortDate(app.freshness.updated_at)}</div>
        <div title={app.paths.ssot_root?.path || app.paths.app_root?.path || ''}>
          <strong>边界：</strong>{app.layer}
        </div>
      </div>

      <DomainActionButtons
        actions={app.actions}
        onQueueAction={onQueueAction}
        onExecuteVerification={onExecuteVerification}
        isActionPending={isActionPending}
        verificationPending={verificationPending}
      />

      <div className="domain-security-panel">
        <div className="domain-security-head">
          <strong>安全门</strong>
          <span>
            通过 {app.security_summary.passed} · 警告 {app.security_summary.warn} · 失败 {app.security_summary.failed}
          </span>
        </div>
        <div className="domain-security-checks">
          {app.security_checks.map((check) => (
            <div key={check.id} className={`domain-security-check ${badgeClass(check.status)}`}>
              <span className={`status-badge ${badgeClass(check.status)}`}>{securityText(check.status)}</span>
              <div>
                <strong>{check.title}</strong>
                <small>{check.evidence}</small>
                <small>下一步：{check.next_action}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {app.security_gates.length > 0 && (
        <div className="domain-app-gates">
          {app.security_gates.map((gate) => (
            <div key={gate.id} className="domain-app-gate">
              <span className={`status-badge ${badgeClass(gate.level)}`}>{riskText(gate.level)}</span>
              <div>
                <strong>{gate.title}</strong>
                <small>{gate.detail}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {app.warnings.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(245, 158, 11, 0.08)',
            color: 'var(--antd-warning)',
            fontSize: 13,
          }}
        >
          <AlertTriangleText items={app.warnings} />
        </div>
      )}
    </article>
  );
}
