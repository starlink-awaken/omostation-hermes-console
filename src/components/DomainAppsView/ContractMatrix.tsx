import React from 'react';
import { AppWindow, FileText } from 'lucide-react';
import { type DomainApp } from './types';
import { badgeClass, capabilityText, contractStatusText, entryText, nextActionForApp, verifyText } from './utils';

export function ContractMatrix({
  filteredApps,
  appsTotal,
  contractSummary,
  onFocusApp,
  onOpenTaskCenter,
}: {
  filteredApps: DomainApp[];
  appsTotal: number;
  contractSummary: {
    ssotReady: number;
    entryReady: number;
    verifyReady: number;
    authReady: number;
    writeDeclared: number;
    freshnessReady: number;
  };
  onFocusApp: (appId: string) => void;
  onOpenTaskCenter: (query: string) => void;
}) {
  return (
    <section className="services-section" aria-label="领域挂载合同矩阵" style={{ marginBottom: 20 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>挂载合同矩阵</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            把每个领域应用的 SSOT、入口、启动、验证、认证、读写边界和数据新鲜度摊平，判断它现在只是"挂上去了"，还是已经能被 Cockpit 稳定治理。
          </p>
        </div>
        <span className={`status-badge ${contractSummary.verifyReady === appsTotal && contractSummary.authReady === appsTotal ? 'online' : 'degraded'}`}>
          合同完备 {contractSummary.verifyReady} / {appsTotal}
        </span>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-info">
            <h3>SSOT 已登记</h3>
            <p className="stat-value">{contractSummary.ssotReady} / {appsTotal}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>入口已登记</h3>
            <p className="stat-value">{contractSummary.entryReady} / {appsTotal}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>验证已登记</h3>
            <p className="stat-value">{contractSummary.verifyReady} / {appsTotal}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>认证已登记</h3>
            <p className="stat-value">{contractSummary.authReady} / {appsTotal}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>写能力已声明</h3>
            <p className="stat-value">{contractSummary.writeDeclared} / {appsTotal}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>新鲜度可见</h3>
            <p className="stat-value">{contractSummary.freshnessReady} / {appsTotal}</p>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="services-table">
          <thead>
            <tr>
              <th>应用</th>
              <th>挂载方式</th>
              <th>SSOT</th>
              <th>入口</th>
              <th>启动</th>
              <th>验证</th>
              <th>认证</th>
              <th>读写边界</th>
              <th>新鲜度</th>
              <th>下一步</th>
              <th>动作</th>
            </tr>
          </thead>
          <tbody>
            {filteredApps.map((app) => {
              const hasSsot = Boolean(app.paths.ssot_root?.exists);
              const hasEntry = Boolean(app.links.launch_url || app.runtime.launch.url || app.links.api_url || app.runtime.api.url);
              const hasStart = Boolean(app.commands.start);
              const hasVerify = app.commands.verify.length > 0;
              const hasAuth = Boolean(app.auth.type);
              const freshness = String(app.freshness.status || '未登记');
              return (
                <tr key={`contract-${app.id}`}>
                  <td>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong>{app.name}</strong>
                      <small>{app.domain.name} · {app.id}</small>
                    </div>
                  </td>
                  <td>{app.integration_mode}</td>
                  <td>
                    <span className={`status-badge ${hasSsot ? 'online' : 'offline'}`}>
                      {contractStatusText(hasSsot, '未登记')}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${hasEntry ? 'online' : 'degraded'}`}>
                      {entryText(app)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${hasStart ? 'online' : 'degraded'}`}>
                      {contractStatusText(hasStart, '按需或未登记')}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${hasVerify ? 'online' : 'offline'}`}>
                      {verifyText(app)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${hasAuth ? 'online' : 'offline'}`}>
                      {app.auth.type || '未登记'}
                    </span>
                  </td>
                  <td>{capabilityText(app)}</td>
                  <td>
                    <span className={`status-badge ${badgeClass(freshness)}`}>
                      {freshness}
                    </span>
                  </td>
                  <td style={{ minWidth: 220 }}>{nextActionForApp(app)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="antd-btn small" onClick={() => onFocusApp(app.id)}>
                        <FileText size={13} />
                        <span>看剖面</span>
                      </button>
                      <button className="antd-btn small" onClick={() => onOpenTaskCenter(app.id)}>
                        <AppWindow size={13} />
                        <span>跟任务</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
