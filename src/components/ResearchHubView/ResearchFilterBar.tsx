import React from 'react';

interface ResearchFilterBarProps {
  query: string;
  statusFilter: string;
  filteredCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClear: () => void;
}

export function ResearchFilterBar({
  query,
  statusFilter,
  filteredCount,
  totalCount,
  onQueryChange,
  onStatusChange,
  onClear,
}: ResearchFilterBarProps) {
  return (
    <section className="services-section" role="region" aria-label="研究筛选">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>研究对象检索</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            同一组条件作用于研究闭环、承接工作台、对象列表和详情焦点，先切片再继续补上下文、落任务或发布回流。
          </p>
        </div>
        <span className="status-badge online">显示 {filteredCount}/{totalCount}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="search"
          aria-label="搜索研究对象"
          placeholder="主题、摘要、标签、Agent 或下一步"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          style={{
            flex: '1 1 280px',
            minWidth: 220,
            padding: '9px 12px',
            borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <select
          aria-label="按状态筛选研究对象"
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
          style={{
            minWidth: 140,
            padding: '9px 12px',
            borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 13,
            outline: 'none',
          }}
        >
          <option value="all">全部状态</option>
          <option value="active">活跃</option>
          <option value="archived">归档</option>
          <option value="quarantined">隔离</option>
        </select>
        <button
          type="button"
          className="antd-btn"
          aria-label="清除研究筛选"
          onClick={onClear}
          disabled={!query && statusFilter === 'all'}
        >
          清除
        </button>
      </div>
    </section>
  );
}
