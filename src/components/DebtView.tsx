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

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取技术债务账本 (Debt Ledger)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="antd-card" style={{ padding: '32px', textAlign: 'center', margin: '24px 0' }}>
        <p style={{ color: 'var(--antd-error)', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>⚠️ 加载债务数据失败</p>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Overview stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>总登记债务</h3>
            <p className="stat-value" style={{ textShadow: '0 0 8px rgba(0, 242, 254, 0.2)' }}>{data.total}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-error)' }}>
          <div className="stat-info">
            <h3>未解决 (Open)</h3>
            <p className="stat-value" style={{ color: 'var(--antd-error)', textShadow: '0 0 8px rgba(255, 71, 87, 0.2)' }}>{data.open}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div className="stat-info">
            <h3>已消除 (Closed)</h3>
            <p className="stat-value" style={{ color: 'var(--antd-success)', textShadow: '0 0 8px rgba(5, 243, 162, 0.2)' }}>{data.closed}</p>
          </div>
        </div>
      </div>

      {/* Debt Table list */}
      <div className="services-list">
        <table className="services-table" aria-label="技术债务清单列表">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">债务标题</th>
              <th scope="col">架构维度</th>
              <th scope="col">等级</th>
              <th scope="col">治理状态</th>
              <th scope="col">所有者</th>
            </tr>
          </thead>
          <tbody>
            {data.items.slice(0, 50).map(item => (
              <tr key={item.id} className="service-row">
                <td className="text-muted" style={{ fontFamily: 'monospace' }}>{item.id}</td>
                <td style={{ fontWeight: 500, color: 'var(--antd-text-primary)' }}>{item.title}</td>
                <td>
                  <span style={{ 
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 242, 254, 0.06)',
                    color: 'var(--antd-primary)',
                    border: '1px solid rgba(0, 242, 254, 0.15)'
                  }}>
                    {item.dimension}
                  </span>
                </td>
                <td>
                  <span style={{ 
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    backgroundColor: item.severity === 'p0' ? 'var(--antd-error-bg)' : item.severity === 'p1' ? 'var(--antd-warning-bg)' : 'rgba(22, 119, 255, 0.1)',
                    color: item.severity === 'p0' ? 'var(--antd-error)' : item.severity === 'p1' ? 'var(--antd-warning)' : 'var(--antd-primary)',
                    border: `1px solid ${item.severity === 'p0' ? 'rgba(255,71,87,0.2)' : item.severity === 'p1' ? 'rgba(255,184,0,0.2)' : 'rgba(0,242,254,0.2)'}`
                  }}>
                    {item.severity.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="status-badge" style={{ 
                    color: item.lifecycle_state === 'closed' ? 'var(--antd-success)' : 'var(--antd-warning)' 
                  }}>
                    {item.lifecycle_state}
                  </span>
                </td>
                <td className="text-muted">{item.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
