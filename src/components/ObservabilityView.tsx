import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { Activity, ShieldCheck } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在聚合系统级多维观测数据...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* BOS Metrics Card */}
        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}>
            <Activity size={18} aria-hidden="true" className="text-accent" /> 
            BOS I0 网格链路流量
          </h3>
          
          {bosData && bosData.summary ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>总调用次数</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{bosData.summary.total_calls}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>平均延迟 (ms)</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{bosData.summary.avg_latency}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '2px' }}>请求成功率</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-success)' }}>
                  {bosData.summary.total_calls ? Math.round((bosData.summary.success_count / bosData.summary.total_calls)*100) : 0}%
                </div>
              </div>
            </div>
          ) : <p className="text-muted" style={{ fontSize: '13px' }}>暂无活跃流量数据</p>}
        </div>

        {/* Arch Health Card */}
        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}>
            <ShieldCheck size={18} aria-hidden="true" className="text-success" /> 
            系统架构健康度
          </h3>
          
          {archData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>系统健康度评分</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-primary)' }}>
                  {archData.system?.health_score || 'N/A'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>Git (ecos) 代码状态</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: archData.git?.status === 'clean' ? 'var(--antd-success)' : 'var(--antd-warning)' }}>
                  {archData.git?.status === 'clean' ? 'Clean' : `${archData.git?.uncommitted} Diff`}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>治理审计周期保鲜</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: archData.governance?.health === 'fresh' ? 'var(--antd-success)' : 'var(--antd-warning)' }}>
                  {archData.governance?.health === 'fresh' ? 'Fresh' : archData.governance?.health || 'N/A'}
                </div>
              </div>
            </div>
          ) : <p className="text-muted" style={{ fontSize: '13px' }}>暂无架构评估数据</p>}
        </div>
      </div>

      {/* BOS Domain Breakdown Card */}
      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>BOS 域名流量分布明细</h3>
        </div>
        
        <div className="services-list">
          {bosData?.domains?.length > 0 ? (
            <table className="services-table" aria-label="BOS 路由域名流量分布表">
              <thead>
                <tr>
                  <th scope="col">BOS 域名 (Domain)</th>
                  <th scope="col">总调用量</th>
                  <th scope="col">成功数 (Success)</th>
                  <th scope="col">失败数 (Error)</th>
                  <th scope="col">平均延迟 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {bosData.domains.map((d: any) => (
                  <tr key={d.domain} className="service-row">
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{d.domain}</td>
                    <td>{d.total}</td>
                    <td style={{ color: 'var(--antd-success)' }}>{d.success}</td>
                    <td style={{ color: d.error > 0 ? 'var(--antd-error)' : 'inherit' }}>{d.error}</td>
                    <td>{d.avg_latency} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted" style={{ padding: '24px', fontSize: '13px', textAlign: 'center' }}>暂无域名流量分布数据</p>
          )}
        </div>
      </div>
    </div>
  );
}
