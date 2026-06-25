import React, { useState, useEffect } from 'react';
import { Activity, GitBranch } from 'lucide-react';
import './Dashboard.css';

export default function SettingsView() {
  const [metrics, setMetrics] = useState<any>(null);
  const [instanceUrl, setInstanceUrl] = useState('');
  const [instanceService, setInstanceService] = useState('');
  const [registerResult, setRegisterResult] = useState<any>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics/history');
      if (res.ok) setMetrics(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('service', instanceService);
      fd.append('mcp_endpoint', instanceUrl);
      const res = await fetch('/api/instance', { method: 'POST', body: fd });
      setRegisterResult(await res.json());
    } catch (e: any) {
      setRegisterResult({ error: e.message });
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      
      {/* Metrics History Card */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} aria-hidden="true" className="text-success" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>系统运行状态指标</h2>
        </div>
        
        {metrics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', fontSize: '13px' }}>
              <span style={{ color: 'var(--antd-text-secondary)' }}>监控快照时间: </span> {metrics.timestamp}
            </div>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--antd-text-secondary)' }}>微服务总数: </span> {metrics.services}</div>
              <div><span style={{ color: 'var(--antd-text-secondary)' }}>健康路由数: </span> <span className="text-success" style={{ fontWeight: 600 }}>{metrics.healthy}</span></div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--antd-text-secondary)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>延迟分位数分布 (Latency Metrics):</span>
              <pre style={{ margin: 0, color: 'var(--antd-primary)', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
                {JSON.stringify(metrics.latency, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: '13px' }}>正在加载并同步系统指标数据...</p>
        )}
      </div>

      {/* Instance Registration Card */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={18} aria-hidden="true" className="text-accent" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>注册分布式新实例 (Instance)</h2>
        </div>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="reg-service-name" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>目标服务名称 (Service Name)</label>
            <input 
              id="reg-service-name"
              required 
              type="text" 
              className="antd-input" 
              value={instanceService} 
              onChange={e => setInstanceService(e.target.value)} 
              placeholder="例如: gbrain-local" 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="reg-mcp-url" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>MCP 接入点地址 (Endpoint URL)</label>
            <input 
              id="reg-mcp-url"
              required 
              type="text" 
              className="antd-input" 
              value={instanceUrl} 
              onChange={e => setInstanceUrl(e.target.value)} 
              placeholder="http://127.0.0.1:7431" 
            />
          </div>
          
          <button type="submit" className="antd-btn antd-btn-primary" style={{ width: 'fit-content' }}>注册实例</button>
        </form>

        {registerResult && (
          <div style={{ 
            padding: '12px', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '4px', 
            border: `1px solid ${registerResult.error ? 'var(--antd-error)' : 'var(--antd-primary)'}` 
          }}>
            <pre style={{ margin: 0, fontSize: '12px', color: registerResult.error ? 'var(--antd-error)' : 'var(--antd-success)', fontFamily: 'monospace' }}>
              {JSON.stringify(registerResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
}
