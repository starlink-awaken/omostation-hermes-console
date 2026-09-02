import React from 'react';
import { ExternalLink } from 'lucide-react';
import { type ResearchItem } from './types';
import { shortTime, statusText } from './utils';

interface RecentResearchListProps {
  items: ResearchItem[];
  totalCount: number;
  hasMore: boolean;
  loadingMore: boolean;
  displayedCount: number;
  onOpenDetail: (id: number) => void;
  onLoadMore: (offset: number, append: boolean) => void;
}

export function RecentResearchList({
  items,
  totalCount,
  hasMore,
  loadingMore,
  displayedCount,
  onOpenDetail,
  onLoadMore,
}: RecentResearchListProps) {
  return (
    <section className="services-section">
      <div className="section-header">
        <div>
          <h2>最近研究对象</h2>
          <p className="text-muted">它们现在处在什么状态、上一次发生了什么，以及下一步应该做什么。</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {items.length === 0 ? (
          <div className="antd-card" style={{ padding: 20 }}>
            <p className="text-muted" style={{ margin: 0 }}>{totalCount === 0 ? '还没有研究对象，先从"发起研究"那条命令开始。' : '当前筛选下没有匹配的研究对象。'}</p>
          </div>
        ) : items.map((item) => (
          <article key={item.id} className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>{item.topic}</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{item.summary || '暂无摘要'}</p>
              </div>
              <span className={`status-badge ${item.status === 'active' ? 'online' : item.status === 'archived' ? 'degraded' : 'offline'}`}>
                {statusText(item.status)}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--antd-text-secondary)' }}>
              <span>来源 {item.source_count}</span>
              <span>追问 {item.follow_up_count}</span>
              <span>Agent {item.agent || '未指定'}</span>
            </div>
            {item.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {item.tags.map((tag) => (
                  <span key={`${item.id}-${tag}`} className="system-map-chip degraded">{tag}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--antd-text-secondary)' }}>
              <strong style={{ color: 'var(--antd-text-primary)' }}>{item.last_event?.label || '暂无事件'}</strong>
              <span> · {shortTime(item.last_event?.created_at || item.created_at)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13 }}>{item.next_action}</p>
            <button
              type="button"
              className="action-surface-item"
              aria-label={`查看研究详情 ${item.topic}`}
              onClick={() => onOpenDetail(item.id)}
              style={{ width: '100%', justifyContent: 'space-between', marginTop: 2 }}
            >
              <span>查看对象详情</span>
              <ExternalLink size={14} />
            </button>
          </article>
        ))}
      </div>
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            type="button"
            className="antd-btn"
            aria-label="加载更多研究对象"
            onClick={() => onLoadMore(displayedCount, true)}
            disabled={loadingMore}
          >
            {loadingMore ? '正在加载...' : `加载更多（已显示 ${displayedCount}/${totalCount}）`}
          </button>
        </div>
      )}
    </section>
  );
}
