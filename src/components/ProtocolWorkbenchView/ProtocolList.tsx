import React from 'react';
import { type ProtocolWorkflow } from './types';
import { shortTime } from './utils';

interface ProtocolListProps {
  workflows: ProtocolWorkflow[];
  totalRuns: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: (offset: number, append: boolean) => void;
}

export default function ProtocolList({
  workflows,
  totalRuns,
  hasMore,
  loadingMore,
  onLoadMore,
}: ProtocolListProps) {
  return (
    <section className="services-section">
      <div className="section-header">
        <div>
          <h2>最近编排记录</h2>
          <p className="text-muted">协议层不是只看定义，最近 workflow 记录能证明它到底有没有被实际承接。</p>
        </div>
        <span className="status-badge online">显示 {workflows.length}/{totalRuns}</span>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {workflows.length === 0 ? (
          <div className="antd-card" style={{ padding: 18 }}>
            <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的最近编排记录。</p>
          </div>
        ) : workflows.map((workflow) => (
          <article key={workflow.id} className="antd-card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div>
              <strong>{workflow.task}</strong>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{workflow.id} · {shortTime(workflow.updated_at)}</p>
            </div>
            <span className={`status-badge ${workflow.status === 'running' ? 'degraded' : workflow.status === 'completed' ? 'online' : 'offline'}`}>
              {workflow.status}
            </span>
          </article>
        ))}
      </div>
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            type="button"
            className="antd-btn"
            aria-label="加载更多协议运行记录"
            onClick={() => void onLoadMore(workflows.length, true)}
            disabled={loadingMore}
          >
            {loadingMore ? '正在加载...' : `加载更多（已显示 ${workflows.length}/${totalRuns}）`}
          </button>
        </div>
      )}
    </section>
  );
}
