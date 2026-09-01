import React from 'react';
import { GitBranch, Search } from 'lucide-react';
import { type ResearchClosureRow } from './types';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';

export function ResearchClosureTable({
  rows,
  onNavigate,
  onOpenTarget,
}: {
  rows: ResearchClosureRow[];
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  return (
    <section className="services-section" role="region" aria-label="研究闭环总表">
      <div className="section-header">
        <div>
          <h2>研究闭环总表</h2>
          <p className="text-muted">把详情、知识、任务和发布回流并排摆出来，研究页才不只是对象列表和正文抽屉。</p>
        </div>
        <span className="status-badge online">{rows.length} 条闭环</span>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map((row) => (
          <article
            key={`research-closure-${row.id}`}
            className="antd-card"
            style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}
          >
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 15 }}>{row.title}</strong>
                <span className={`status-badge ${row.statusTone}`}>{row.signal}</span>
              </div>
              <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{row.summary}</p>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <small className="text-muted">下一步</small>
              <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.nextAction}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开研究闭环对象 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
              >
                <Search size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开研究闭环任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
              >
                <GitBranch size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
