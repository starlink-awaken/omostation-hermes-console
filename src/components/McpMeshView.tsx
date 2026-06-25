import React, { useState, useEffect } from 'react';
import { Network, Globe, Play, Send, PlusCircle, Activity, Search, ShieldCheck } from 'lucide-react';
import './Dashboard.css';

interface BosService {
  uri: string;
  domain: string;
  action: string;
  transport: string;
}

interface BosHealth {
  status: string;
  total_routes: number;
  domains: Record<string, number>;
  metrics: any;
}

export default function McpMeshView() {
  const [services, setServices] = useState<BosService[]>([]);
  const [health, setHealth] = useState<BosHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState('all');
  
  // 实例注册表单
  const [registerName, setRegisterName] = useState('');
  const [registerEndpoint, setRegisterEndpoint] = useState('');
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // URI 解析器
  const [resolveUri, setResolveUri] = useState('bos://memory/kos/search');
  const [resolveArgs, setResolveArgs] = useState('{\n  "query": "SSOT"\n}');
  const [resolveResult, setResolveResult] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [servicesRes, healthRes] = await Promise.all([
        fetch('/api/bos/services'),
        fetch('/api/bos/health')
      ]);

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.services || []);
      }
      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }
    } catch (e) {
      console.error('Failed to fetch McpMesh data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEndpoint) return;
    setRegisterStatus(null);
    setRegisterError(null);

    try {
      const formData = new FormData();
      formData.append('service', registerName);
      formData.append('mcp_endpoint', registerEndpoint);

      const res = await fetch('/api/instance', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setRegisterStatus(data.msg || '注册成功！');
        setRegisterName('');
        setRegisterEndpoint('');
        fetchData(); // 刷新网格
      } else {
        setRegisterError(data.error || '注册失败');
      }
    } catch (err: any) {
      setRegisterError(err.message || '注册发生错误');
    }
  };

  const handleResolve = async () => {
    if (!resolveUri) return;
    setResolving(true);
    setResolveError(null);
    setResolveResult(null);

    try {
      // 校验 JSON
      let parsedArgs = '{}';
      try {
        if (resolveArgs.trim()) {
          JSON.parse(resolveArgs);
          parsedArgs = resolveArgs;
        }
      } catch (je) {
        throw new Error('参数 Arguments 必须是合法的 JSON 格式');
      }

      const res = await fetch(`/api/bos/resolve?uri=${encodeURIComponent(resolveUri)}&arguments=${encodeURIComponent(parsedArgs)}`);
      const data = await res.json();
      if (res.ok) {
        setResolveResult(data);
      } else {
        setResolveError(data.error || '解析调用失败');
      }
    } catch (err: any) {
      setResolveError(err.message || '网络或服务端异常');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取 Agora 网格拓扑与 BOS 路由注册表...</p>
      </div>
    );
  }

  // 域过滤
  const filteredServices = services.filter(s => selectedDomain === 'all' || s.domain === selectedDomain);
  const domains = ['all', 'memory', 'governance', 'analysis', 'persona', 'capability'];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 顶部统计面板 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>网格已注册 BOS 路由</h3>
            <p className="stat-value">{health?.total_routes || services.length}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div className="stat-info">
            <h3>网格健康度</h3>
            <p className="stat-value" style={{ color: 'var(--antd-success)' }}>
              {health?.status === 'ok' ? 'Healthy' : 'Degraded'}
            </p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-accent)' }}>
          <div className="stat-info">
            <h3>BOS 解析域分类</h3>
            <p className="stat-value" style={{ fontSize: '20px', fontWeight: 600, marginTop: '8px', color: 'var(--antd-primary)' }}>
              Memory / Governance / Analysis / Persona / Capability
            </p>
          </div>
        </div>
      </div>

      {/* 在线解析与实例注册双栏分区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        
        {/* 左栏：BOS URI 在线解析调用面板 */}
        <div className="services-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} className="text-primary" />
              <span>BOS URI 路由解析调试器</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                目标 BOS URI
              </label>
              <input
                type="text"
                placeholder="bos://domain/action..."
                value={resolveUri}
                onChange={(e) => setResolveUri(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                调用参数 (JSON)
              </label>
              <textarea
                rows={4}
                placeholder="{}"
                value={resolveArgs}
                onChange={(e) => setResolveArgs(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#a9d1d9',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              onClick={handleResolve}
              disabled={resolving || !resolveUri}
              className="antd-btn"
              style={{
                width: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'var(--antd-primary)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Send size={14} />
              <span>{resolving ? '正在解析' : '开始解析'}</span>
            </button>

            {/* 解析结果 */}
            {resolveError && (
              <div style={{ color: 'var(--antd-error)', fontSize: '12px', padding: '8px', background: 'rgba(255,71,87,0.08)', borderRadius: '4px', border: '1px solid rgba(255,71,87,0.2)' }}>
                ⚠️ 解析错误: {resolveError}
              </div>
            )}

            {resolveResult && (
              <div style={{ marginTop: '10px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--antd-success)', marginBottom: '8px' }}>
                  解析成功 - 路由匹配详情:
                </h4>
                <pre style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#00f2fe',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '260px'
                }}>
                  {JSON.stringify(resolveResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 右栏：分布式 MCP 实例注册表单 */}
        <div className="services-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={16} className="text-success" />
              <span>动态注册 MCP 新实例</span>
            </h3>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                服务标识 (Service Identifier)
              </label>
              <input
                type="text"
                placeholder="例如: family-hub"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                MCP Endpoint (Stdio / HTTP 挂载路径)
              </label>
              <input
                type="text"
                placeholder="例如: http://localhost:8000/mcp"
                value={registerEndpoint}
                onChange={(e) => setRegisterEndpoint(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              className="antd-btn"
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(5, 243, 162, 0.1)',
                color: 'var(--antd-success)',
                border: '1px solid rgba(5, 243, 162, 0.25)',
                cursor: 'pointer',
                fontWeight: 600,
                marginTop: '10px'
              }}
            >
              提交实例注册
            </button>

            {registerStatus && (
              <div style={{ color: 'var(--antd-success)', fontSize: '12px', marginTop: '6px' }}>
                ✓ {registerStatus}
              </div>
            )}
            {registerError && (
              <div style={{ color: 'var(--antd-error)', fontSize: '12px', marginTop: '6px' }}>
                ⚠️ {registerError}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 下方：BOS URI 全量路由注册表 */}
      <div className="services-section" style={{ marginTop: '0' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={16} className="text-primary" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>BOS URI 网格路由明细</h3>
          </div>

          {/* 筛选域 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>过滤域:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {domains.map(d => (
                <option key={d} value={d}>
                  {d === 'all' ? '全部' : d.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="services-list">
          <table className="services-table" aria-label="BOS 网格路由清单">
            <thead>
              <tr>
                <th scope="col">BOS 协议 URI</th>
                <th scope="col">解析所属域</th>
                <th scope="col">绑定的 Action</th>
                <th scope="col">传输通道 (Transport)</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.45)' }}>
                    暂无对应域的路由定义
                  </td>
                </tr>
              ) : (
                filteredServices.map((svc, i) => (
                  <tr key={i} className="service-row">
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{svc.uri}</td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0, 242, 254, 0.05)',
                        color: 'var(--antd-primary)',
                        border: '1px solid rgba(0, 242, 254, 0.15)'
                      }}>
                        {svc.domain.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }} className="text-muted">{svc.action}</td>
                    <td>
                      <span className="status-badge" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {svc.transport}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
