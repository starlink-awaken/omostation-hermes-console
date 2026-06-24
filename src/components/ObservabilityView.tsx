import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { Activity, ShieldCheck, GitBranch } from 'lucide-react';

export default function ObservabilityView() {
  const [archData, setArchData] = useState<any>(null);
  const [bosData, setBosData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/arch-health').then(r => r.ok ? r.json() : null),
      fetch('/api/bos/metrics').then(r => r.ok ? r.json() : null)
    ]).then(([arch, bos]) => {
      setArchData(arch);
      setBosData(bos);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>聚合观测数据...</p></div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="section-header">
        <h2>系统可观测面板</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* BOS Metrics */}
        <div className="glass-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={18} color="var(--color-accent)" /> 
            BOS I0 网格流量
          </h3>
          {bosData && bosData.summary ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>总调用量</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>{bosData.summary.total_calls}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>平均延迟 (ms)</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>{bosData.summary.avg_latency}</div>
              </div>
              <div style={{ padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>成功率</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-success)' }}>
                  {bosData.summary.total_calls ? Math.round((bosData.summary.success_count / bosData.summary.total_calls)*100) : 0}%
                </div>
              </div>
            </div>
          ) : <p className="text-muted">无可用数据</p>}
        </div>

        {/* Arch Health */}
        <div className="glass-panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={18} color="var(--color-accent)" /> 
            架构健康度
          </h3>
          {archData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>系统健康分</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {archData.system?.health_score || 'N/A'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Git 状态</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: archData.git?.status === 'clean' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {archData.git?.status === 'clean' ? 'Clean' : `${archData.git?.uncommitted} Uncommitted`}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>治理审计</div>
                <div style={{ fontSize: '20px', fontWeight: 600 }}>
                  {archData.governance?.health === 'fresh' ? 'Fresh' : archData.governance?.health || 'N/A'}
                </div>
              </div>
            </div>
          ) : <p className="text-muted">无可用数据</p>}
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '16px' }}>BOS 域名流量分布</h3>
        {bosData?.domains?.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '8px' }}>Domain</th>
                <th style={{ padding: '8px' }}>Total</th>
                <th style={{ padding: '8px' }}>Success</th>
                <th style={{ padding: '8px' }}>Error</th>
                <th style={{ padding: '8px' }}>Avg Latency (ms)</th>
              </tr>
            </thead>
            <tbody>
              {bosData.domains.map((d: any) => (
                <tr key={d.domain} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>{d.domain}</td>
                  <td style={{ padding: '8px' }}>{d.total}</td>
                  <td style={{ padding: '8px', color: 'var(--color-success)' }}>{d.success}</td>
                  <td style={{ padding: '8px', color: d.error > 0 ? 'var(--color-error)' : 'inherit' }}>{d.error}</td>
                  <td style={{ padding: '8px' }}>{d.avg_latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-muted">无流量数据</p>}
      </div>
    </div>
  );
}
