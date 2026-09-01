import React from 'react';
import { ExternalLink, Map, Route } from 'lucide-react';
import { type DomainBuildRow } from './types';
import { type CockpitNavigationTarget } from '../cockpitNavigation';

export function DomainBuildEntry({
  domainBuildRows,
  domainBuildSummary,
  onOpenTarget,
  onNavigate,
}: {
  domainBuildRows: DomainBuildRow[];
  domainBuildSummary: { total: number; projects: number; roadmap: number; attention: number };
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onNavigate?: (tab: string) => void;
}) {
  return (
    <section className="services-section" aria-label="领域建设入口" style={{ marginBottom: 20 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>领域建设入口</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            把领域相关的重点项目和路线图翻成 cockpit 入口页、系统收口面和任务承接入口，让领域页也能直接承接项目维度。
          </p>
        </div>
        <span className={`status-badge ${domainBuildSummary.attention > 0 ? 'degraded' : 'online'}`}>
          {domainBuildSummary.total > 0 ? `已编排 ${domainBuildSummary.total}` : '待接入'}
        </span>
      </div>

      <div className="home-architecture-kpis">
        {[
          ['建设入口', domainBuildSummary.total],
          ['重点项目', domainBuildSummary.projects],
          ['路线图项', domainBuildSummary.roadmap],
          ['待收口', domainBuildSummary.attention],
        ].map(([label, value]) => (
          <div key={label} className="home-architecture-kpi">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="home-architecture-grid">
        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>领域项目与路线图</strong>
              <small>先看入口页，再看系统收口面，最后回任务中心跟进动作。</small>
            </div>
            <span className={`status-badge ${domainBuildSummary.attention > 0 ? 'degraded' : 'online'}`}>
              {domainBuildSummary.attention}
            </span>
          </div>
          <div className="home-architecture-list">
            {domainBuildRows.map((row) => (
              <article key={row.id} className="home-architecture-item home-architecture-lane">
                <strong>{row.title}</strong>
                <span>{row.kind === 'project' ? '重点项目' : '能力路线图'} · {row.meta}</span>
                <p className="home-architecture-copy">{row.summary}</p>
                <small>{row.nextAction}</small>
                <div className="home-architecture-lane-actions">
                  <button
                    className="antd-btn small"
                    aria-label={`打开领域建设入口 ${row.title}`}
                    onClick={() => onOpenTarget ? onOpenTarget(row.entryTarget) : onNavigate?.(row.entryTarget.tab)}
                  >
                    <ExternalLink size={13} />
                    <span>入口页</span>
                  </button>
                  <button
                    className="antd-btn small secondary"
                    aria-label={`打开领域建设覆盖 ${row.title}`}
                    onClick={() => onOpenTarget ? onOpenTarget(row.coverageTarget) : onNavigate?.(row.coverageTarget.tab)}
                  >
                    <Map size={13} />
                    <span>系统收口</span>
                  </button>
                  <button
                    className="antd-btn small secondary"
                    aria-label={`打开领域建设任务 ${row.title}`}
                    onClick={() => onOpenTarget ? onOpenTarget(row.taskTarget) : onNavigate?.(row.taskTarget.tab)}
                  >
                    <Route size={13} />
                    <span>任务承接</span>
                  </button>
                </div>
              </article>
            ))}
            {domainBuildRows.length === 0 && (
              <div className="home-focus-empty">当前还没有领域建设入口数据</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
