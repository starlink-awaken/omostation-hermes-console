import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Signal,
  Shield,
} from 'lucide-react';

interface DomainHealth {
  id: string;
  name: string;
  exists: boolean;
  fresh: boolean;
  issue_count: number;
  issues: Array<{ level: string; message: string }>;
  has_state: boolean;
  has_status: boolean;
  signal_count: number;
  capabilities: string[];
}

interface HealthData {
  timestamp: string;
  total_domains: number;
  document_domains: number;
  healthy_count: number;
  unhealthy_count: number;
  health_rate: string;
  domains: DomainHealth[];
}

interface TrendData {
  total_records: number;
  date_range: { start: string; end: string };
  trends: Record<string, {
    health_rate: number;
    avg_issues: number;
    max_issues: number;
    avg_signals: number;
    max_signals: number;
    min_signals: number;
    record_count: number;
  }>;
  anomalies: Array<{ domain: string; type: string; severity: string; message: string }>;
}

interface SignalData {
  total_signals: number;
  by_domain: Record<string, number>;
  by_type: Record<string, number>;
  patterns: Array<{ pattern: string; level: string; message: string }>;
  risks: Array<{ risk: string; severity: string; message: string }>;
}

export default function L4HealthView() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取健康数据
      const healthResponse = await fetch('/api/l4/health');
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setHealthData(health);
      }

      // 获取趋势数据
      const trendResponse = await fetch('/api/l4/trend');
      if (trendResponse.ok) {
        const trend = await trendResponse.json();
        setTrendData(trend);
      }

      // 获取信号数据
      const signalResponse = await fetch('/api/l4/signals');
      if (signalResponse.ok) {
        const signal = await signalResponse.json();
        setSignalData(signal);
      }

      setLastUpdate(new Date().toLocaleString('zh-CN'));
    } catch (err) {
      setError('获取数据失败');
      console.error('Error fetching L4 health data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (fresh: boolean) => {
    return fresh ? (
      <CheckCircle size={16} className="text-success" />
    ) : (
      <XCircle size={16} className="text-danger" />
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#e74c3c';
      case 'error': return '#e74c3c';
      case 'warning': return '#f39c12';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  };

  if (loading && !healthData) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在加载 L4 域健康数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <XCircle size={24} className="text-danger" />
        <p>{error}</p>
        <button onClick={fetchData} className="antd-btn">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="l4-health-view">
      {/* 概览卡片 */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <h3>总域数</h3>
            <p className="stat-value">{healthData?.total_domains || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <h3>健康域数</h3>
            <p className="stat-value">{healthData?.healthy_count || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-danger" aria-hidden="true">
            <XCircle size={20} />
          </div>
          <div className="stat-info">
            <h3>不健康域数</h3>
            <p className="stat-value">{healthData?.unhealthy_count || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent" aria-hidden="true">
            <Shield size={20} />
          </div>
          <div className="stat-info">
            <h3>健康率</h3>
            <p className="stat-value">{healthData?.health_rate || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* 域健康状态表格 */}
      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px' }}>域健康状态</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#95a5a6' }}>
              最后更新: {lastUpdate}
            </span>
            <button
              onClick={fetchData}
              className="antd-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={14} />
              刷新
            </button>
          </div>
        </div>

        <div className="services-list">
          <table className="services-table">
            <thead>
              <tr>
                <th scope="col">域 ID</th>
                <th scope="col">名称</th>
                <th scope="col">状态</th>
                <th scope="col">问题数</th>
                <th scope="col">信号数</th>
                <th scope="col">Capabilities</th>
                <th scope="col">KEMS</th>
              </tr>
            </thead>
            <tbody>
              {healthData?.domains.map((domain) => (
                <tr key={domain.id} className="service-row">
                  <td className="font-medium" style={{ fontWeight: 500 }}>
                    {domain.id}
                  </td>
                  <td className="text-muted">{domain.name}</td>
                  <td>
                    <span className={`status-badge ${domain.fresh ? 'online' : 'offline'}`}>
                      {getStatusIcon(domain.fresh)}
                      <span style={{ marginLeft: '4px' }}>
                        {domain.fresh ? '健康' : '不健康'}
                      </span>
                    </span>
                  </td>
                  <td className="text-muted">{domain.issue_count}</td>
                  <td className="text-muted">{domain.signal_count}</td>
                  <td className="text-muted">{domain.capabilities.length}</td>
                  <td>
                    <span className={`status-badge ${domain.has_state && domain.has_status ? 'online' : 'offline'}`}>
                      {domain.has_state && domain.has_status ? '完整' : '不完整'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 趋势分析 */}
      {trendData && trendData.total_records > 0 && (
        <div className="services-section" style={{ marginTop: '20px' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px' }}>
              <TrendingUp size={16} style={{ marginRight: '8px' }} />
              趋势分析
            </h2>
            <span style={{ fontSize: '12px', color: '#95a5a6' }}>
              {trendData.total_records} 条记录
            </span>
          </div>

          {trendData.anomalies.length > 0 ? (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
              <h4 style={{ marginBottom: '8px', color: '#856404' }}>
                <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                检测到异常
              </h4>
              {trendData.anomalies.map((anomaly, index) => (
                <div key={index} style={{ marginBottom: '4px', fontSize: '14px', color: '#856404' }}>
                  • {anomaly.message}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px', background: '#d4edda', borderRadius: '4px', border: '1px solid #28a745' }}>
              <span style={{ color: '#155724' }}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                未发现异常
              </span>
            </div>
          )}
        </div>
      )}

      {/* 信号分析 */}
      {signalData && (
        <div className="services-section" style={{ marginTop: '20px' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px' }}>
              <Signal size={16} style={{ marginRight: '8px' }} />
              信号分析
            </h2>
            <span style={{ fontSize: '12px', color: '#95a5a6' }}>
              {signalData.total_signals} 个信号
            </span>
          </div>

          {/* 按域分布 */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>按域分布</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {Object.entries(signalData.by_domain).map(([domain, count]) => (
                <div
                  key={domain}
                  style={{
                    padding: '8px 12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{domain}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c3e50' }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 检测到的模式 */}
          {signalData.patterns.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>检测到的模式</h4>
              {signalData.patterns.map((pattern, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: getSeverityColor(pattern.level) }}>
                    {pattern.level}
                  </span>
                  <span style={{ fontSize: '14px' }}>{pattern.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* 风险评估 */}
          {signalData.risks.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>风险评估</h4>
              {signalData.risks.map((risk, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    background: '#f8d7da',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #f5c6cb',
                  }}
                >
                  <AlertTriangle size={16} style={{ color: '#721c24' }} />
                  <span style={{ fontSize: '14px', color: '#721c24' }}>{risk.message}</span>
                </div>
              ))}
            </div>
          )}

          {signalData.risks.length === 0 && (
            <div style={{ padding: '12px', background: '#d4edda', borderRadius: '4px', border: '1px solid #28a745' }}>
              <span style={{ color: '#155724' }}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                未发现风险
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
