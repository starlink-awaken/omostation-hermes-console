import React, { useState, useEffect } from 'react';
import { Server, DollarSign } from 'lucide-react';
import './Dashboard.css';

export default function ComputeView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompute = async () => {
      try {
        const res = await fetch('/api/compute/status');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch compute data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompute();
    const timer = setInterval(fetchCompute, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取混合云算力网格数据...</p>
      </div>
    );
  }

  const nodes = data?.nodes || [];
  const quota = data?.quota?.quota || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Nodes Section */}
        <section aria-label="算力物理节点拓扑" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-secondary)' }}>
            <Server size={16} aria-hidden="true" className="text-accent" /> 
            物理节点拓扑
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {nodes.map((node: any) => (
              <div 
                key={node.id} 
                className="antd-card"
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--antd-text-primary)' }}>{node.name}</div>
                  <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>{node.model}</div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    color: node.status === 'online' ? 'var(--antd-success)' : 'var(--antd-warning)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    textShadow: node.status === 'online' ? '0 0 6px rgba(5, 243, 162, 0.2)' : 'none'
                  }}>
                    ● {node.status}
                  </span>
                  <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>{node.type}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quota Section */}
        <section aria-label="模型提供商配额" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-secondary)' }}>
            <DollarSign size={16} aria-hidden="true" className="text-success" /> 
            模型供应商 API 额度
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quota.length === 0 ? (
              <div className="antd-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--antd-text-secondary)' }}>
                <p style={{ fontSize: '13px' }}>暂无活跃配额记录</p>
              </div>
            ) : (
              quota.map((q: any, i: number) => (
                <div 
                  key={i} 
                  className="antd-card"
                  style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--antd-text-primary)', textTransform: 'capitalize' }}>
                    {q.provider}
                  </div>
                  
                  {q.error ? (
                    <div style={{ color: 'var(--antd-error)', fontSize: '12px' }}>
                      {q.error.message || '获取配额数据异常'}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--antd-text-secondary)' }}>
                      <span>鉴权状态: <strong style={{ color: q.available ? 'var(--antd-success)' : 'var(--antd-error)' }}>{q.available ? '可用' : '失效'}</strong></span>
                      {q.provider === 'openai' && q.usage && (
                        <span className="text-muted">
                          Token 已用: {q.usage.total_used} / {q.usage.total_granted}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
        
      </div>
    </div>
  );
}
