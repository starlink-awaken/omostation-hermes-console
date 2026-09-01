import React from 'react';
import { ClipboardCheck, Route } from 'lucide-react';
import { type ProtocolClosureRow } from './types';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';

export function ProtocolClosureTable({
  rows,
  onNavigate,
  onOpenTarget,
}: {
  rows: ProtocolClosureRow[];
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  return (
    <section className="services-section" role="region" aria-label="协议闭环总表">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>协议闭环总表</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把每个协议子面板的当前信号、对象承接和任务收口并排摆出来，避免知道问题在哪，却不知道下一跳该落哪。
          </p>
        </div>
        <span className="status-badge online">{rows.length} 条路由</span>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {rows.length === 0 ? (
          <div className="antd-card" style={{ padding: 18, textAlign: 'center' }}>
            <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的协议闭环对象。</p>
          </div>
        ) : rows.map((row) => (
          <article
            key={`protocol-closure-${row.id}`}
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
              <small className="text-muted">承接路径</small>
              <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.handoff}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开协议闭环对象 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
              >
                <ClipboardCheck size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开协议闭环任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
