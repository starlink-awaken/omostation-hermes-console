import React, { useEffect, useState } from 'react';
import './Dashboard.css';

interface DebtItem {
  id: string;
  title: string;
  severity: string;
  lifecycle_state: string;
  opened_at: string;
  owner: string;
  dimension: string;
}

export default function DebtView() {
  const [data, setData] = useState<{ total: number; open: number; closed: number; items: DebtItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/debt')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>加载债务账本...</p></div>;
  if (error) return <div className="error-state">加载失败: {error}</div>;
  if (!data) return null;

  return (
    <div className="animate-fade-in">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <h2>债务驾驶舱 (OMO Debt)</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-info">
            <h3>总登记项</h3>
            <p className="stat-value">{data.total}</p>
          </div>
        </div>
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid #f87171' }}>
          <div className="stat-info">
            <h3>未解决 (Open)</h3>
            <p className="stat-value" style={{ color: '#f87171' }}>{data.open}</p>
          </div>
        </div>
        <div className="stat-card glass-panel" style={{ borderLeft: '4px solid #4ade80' }}>
          <div className="stat-info">
            <h3>已解决 (Closed)</h3>
            <p className="stat-value" style={{ color: '#4ade80' }}>{data.closed}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              <th style={{ padding: '12px 8px' }}>ID</th>
              <th style={{ padding: '12px 8px' }}>标题</th>
              <th style={{ padding: '12px 8px' }}>维度</th>
              <th style={{ padding: '12px 8px' }}>等级</th>
              <th style={{ padding: '12px 8px' }}>状态</th>
              <th style={{ padding: '12px 8px' }}>所有者</th>
            </tr>
          </thead>
          <tbody>
            {data.items.slice(0, 50).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)' }}>{item.id}</td>
                <td style={{ padding: '12px 8px', fontWeight: 500 }}>{item.title}</td>
                <td style={{ padding: '12px 8px' }}>
                  <span className="badge" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>{item.dimension}</span>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <span className="badge" style={{ 
                    backgroundColor: item.severity === 'p0' ? '#3b0d0d' : item.severity === 'p1' ? '#271c00' : '#0c2d6b',
                    color: item.severity === 'p0' ? '#f87171' : item.severity === 'p1' ? '#fbbf24' : '#58a6ff'
                  }}>
                    {item.severity}
                  </span>
                </td>
                <td style={{ padding: '12px 8px' }}>{item.lifecycle_state}</td>
                <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)' }}>{item.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
