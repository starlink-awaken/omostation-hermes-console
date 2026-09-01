import React from 'react';
import { Terminal } from 'lucide-react';
import { type OpcWorkspace } from './types';
import { DataTable } from './DataTable';

export function OpcWorkspacePanel({ opc }: { opc: OpcWorkspace }) {
  return (
    <section id="opc-workspace" className="services-section" style={{ marginTop: 24 }}>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 16 }}>OPC 作战台</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {opc.positioning?.summary || 'OPC SSOT 聚合视图'}
          </p>
        </div>
        <span className={`status-badge ${opc.exists ? 'success' : 'danger'}`}>
          {opc.exists ? 'SSOT 就绪' : 'SSOT 缺失'}
        </span>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {opc.weekly_priorities.length > 0 ? opc.weekly_priorities.map((item) => (
          <div className="stat-card" key={item.title}>
            <div className="stat-icon-wrapper pulse-accent"><Terminal size={18} /></div>
            <div className="stat-info">
              <h3>{item.title}</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--antd-text-secondary)', fontSize: 13 }}>{item.detail}</p>
            </div>
          </div>
        )) : (
          <div className="stat-card">
            <div className="stat-icon-wrapper pulse-accent"><Terminal size={18} /></div>
            <div className="stat-info">
              <h3>本周动作</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--antd-text-secondary)', fontSize: 13 }}>暂无明确动作</p>
            </div>
          </div>
        )}
      </div>

      <div className="services-section" style={{ marginTop: 18 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, margin: 0 }}>内容排期</h3>
        </div>
        <DataTable rows={opc.content_calendar.week} empty="暂无排期" />
      </div>

      <div className="stats-grid domain-app-opc-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 18 }}>
        <div className="services-section" style={{ margin: 0 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>产品管线</h3>
          </div>
          <DataTable rows={opc.product_portfolio.pipeline} empty="暂无产品管线" />
        </div>
        <div className="services-section" style={{ margin: 0 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>核心指标</h3>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {opc.metrics.slice(0, 3).map((section) => (
              <div key={section.name}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{section.name}</div>
                <DataTable rows={section.items.slice(0, 3)} empty="暂无指标" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
