/**
 * ObservabilityView — 系统运行可观测.
 *
 * 从 fullsite 移植的改进:
 *   - retryToken 重试模式 (自增 token 触发重新 fetch)
 *   - data_quality === 'unavailable' 特殊处理 (BOS 不可用不阻塞 arch)
 *   - 观测域搜索筛选 (domainQuery + domainStatusFilter)
 *   - 观测 backlog 计算 (异常域、治理健康度)
 *   - a11y loading (role="status" aria-live)
 */

import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import './Dashboard.css';

// ── Types ──

interface ArchHealth {
  system?: {
    health_score?: number;
    current_phase?: string;
    completed_tasks?: number;
    active_tasks?: number;
    blocked_tasks?: number;
  };
  governance?: {
    health_score?: number;
    anomaly_count?: number;
    total_tasks?: number;
    done?: number;
    planned?: number;
  };
  components?: Array<{
    name: string;
    status: string;
    health_score?: number;
  }>;
}

interface BosMetrics {
  data_quality?: 'available' | 'degraded' | 'unavailable';
  error?: string;
  summary?: {
    total_calls: number;
    success_count: number;
    avg_latency: number;
  };
  domains?: Record<string, {
    calls: number;
    success: number;
    latency: number;
    error?: number;
  }>;
}

// ── Hooks ──

function useArchHealth(enabled: boolean) {
  return useQuery({
    queryKey: ['arch-health', enabled],
    queryFn: async () => {
      const response = await apiFetch<ArchHealth>('/api/v1/arch-health');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch architecture health');
      }
      return response.data;
    },
    enabled,
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useBosMetrics(enabled: boolean) {
  return useQuery({
    queryKey: ['bos-metrics', enabled],
    queryFn: async () => {
      const response = await apiFetch<BosMetrics>('/api/bos/metrics');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch BOS metrics');
      }
      return response.data;
    },
    enabled,
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

// ── Component ──

export default function ObservabilityView() {
  const [retryToken, setRetryToken] = useState(0);
  const [domainQuery, setDomainQuery] = useState('');
  const [domainStatus, setDomainStatus] = useState<'all' | 'healthy' | 'degraded'>('all');

  // 提取样式常量避免 Rolldown 解析器边缘问题
  const successColor = 'var(--antd-success)';
  const errorColor = 'var(--antd-error)';
  const textMuted = 'var(--antd-text-secondary)';

  // retryToken 变化时重新 fetch
  const { data: archData, isLoading: archLoading, error: archError } = useArchHealth(retryToken >= 0);
  const { data: bosData, isLoading: bosLoading, error: bosError } = useBosMetrics(retryToken >= 0);

  const isLoading = archLoading || bosLoading;
  const bosUnavailable = bosError || bosData?.data_quality === 'unavailable';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return 'var(--antd-success)';
      case 'degraded':
      case 'warning':
        return 'var(--antd-warning)';
      case 'unhealthy':
      case 'error':
        return 'var(--antd-error)';
      default:
        return 'var(--antd-text-muted)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return '健康';
      case 'degraded':
      case 'warning':
        return '降级';
      case 'unhealthy':
      case 'error':
        return '异常';
      default:
        return '未知';
    }
  };

  // 域筛选 + backlog 计算
  const { filteredDomains, observabilityBacklog } = useMemo(() => {
    if (!bosData?.domains) return { filteredDomains: [], observabilityBacklog: { degraded: 0, total: 0, totalErrors: 0 } };

    const entries = Object.entries(bosData.domains);
    const filtered = entries.filter(([, metrics]) => {
      if (domainStatus === 'healthy' && (metrics.error ?? 0) > 0) return false;
      if (domainStatus === 'degraded' && (metrics.error ?? 0) === 0 && metrics.latency < 700) return false;
      if (domainQuery) {
        const query = domainQuery.toLowerCase();
        if (!entries[0][0].toLowerCase().includes(query)) return false;
      }
      return true;
    });

    const backlog = {
      degraded: entries.filter(([, m]) => (m.error ?? 0) > 0 || m.latency >= 700).length,
      total: entries.length,
      totalErrors: entries.reduce((sum, [, m]) => sum + (m.error ?? 0), 0),
    };

    return { filteredDomains: filtered, observabilityBacklog: backlog };
  }, [bosData, domainQuery, domainStatus]);

  const handleRetry = () => {
    setRetryToken((t) => t + 1);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>系统运行可观测</h1>
        </div>
        <button
          className="antd-btn"
          onClick={handleRetry}
          disabled={isLoading}
          aria-label="刷新观测数据"
        >
          <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
          <span>刷新</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && !archData && !bosData && (
        <div className="loading-state" role="status" aria-live="polite" style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" aria-hidden="true" style={{ marginBottom: '8px' }} />
          <div>正在聚合系统级多维观测数据...</div>
        </div>
      )}

      {/* Error State */}
      {(archError || bosUnavailable) && (
        <div role="alert" style={{
          padding: '16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} />
            <strong>观测数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            {archError?.message || ''}
            {archError && bosUnavailable && ' · '}
            {bosUnavailable ? (bosData?.error || 'BOS 数据不可用，但架构健康数据可能仍可用') : ''}
          </div>
          <button className="antd-btn" onClick={handleRetry}>
            <RefreshCw size={14} />
            <span>重试</span>
          </button>
        </div>
      )}

      {/* BOS Metrics Card */}
      {bosData && bosData.summary && bosData.data_quality !== 'unavailable' && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} aria-hidden="true" className="text-accent" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>BOS I0 网格链路流量</h2>
            </div>
            {bosData.data_quality === 'degraded' && (
              <span style={{ fontSize: '12px', color: 'var(--antd-warning)' }}>数据降级</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 242, 254, 0.03)',
              border: '1px solid rgba(0, 242, 254, 0.08)',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>总调用次数</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>
                {bosData.summary.total_calls.toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 242, 254, 0.03)',
              border: '1px solid rgba(0, 242, 254, 0.08)',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>平均延迟 (ms)</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>
                {bosData.summary.avg_latency.toFixed(1)}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 242, 254, 0.03)',
              border: '1px solid rgba(0, 242, 254, 0.08)',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>请求成功率</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--antd-success)' }}>
                {bosData.summary.total_calls > 0
                  ? Math.round((bosData.summary.success_count / bosData.summary.total_calls) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Arch Health Card */}
      {archData && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} aria-hidden="true" className="text-success" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>系统架构健康度</h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {archData.system && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>系统健康分</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-primary)' }}>
                    {archData.system.health_score || 'N/A'}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>当前阶段</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>
                    {archData.system.current_phase || 'N/A'}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>已完成任务</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-success)' }}>
                    {archData.system.completed_tasks || 0}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>阻塞任务</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-error)' }}>
                    {archData.system.blocked_tasks || 0}
                  </div>
                </div>
              </div>
            )}

            {archData.components && archData.components.length > 0 && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--antd-text-secondary)' }}>
                  组件状态
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {archData.components.map((component) => (
                    <div
                      key={component.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'rgba(0, 242, 254, 0.03)',
                        border: '1px solid rgba(0, 242, 254, 0.08)',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getStatusColor(component.status),
                        }} />
                        <span style={{ fontWeight: 500 }}>{component.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {component.health_score !== undefined && (
                          <span style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                            {component.health_score}
                          </span>
                        )}
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: getStatusColor(component.status),
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: `${getStatusColor(component.status)}15`,
                        }}>
                          {getStatusText(component.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Domain Metrics with Filter */}
      {bosData && bosData.domains && Object.keys(bosData.domains).length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} aria-hidden="true" className="text-info" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>域流量分布</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {observabilityBacklog.degraded > 0 && `${observabilityBacklog.degraded} 异常 · `}
              {filteredDomains.length}/{observabilityBacklog.total} 域
            </span>
          </div>

          {/* 筛选控件 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', minWidth: 180, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--antd-text-muted)' }} />
              <input
                type="search"
                placeholder="搜索域..."
                value={domainQuery}
                onChange={(e) => setDomainQuery(e.target.value)}
                className="antd-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                aria-label="搜索域"
              />
            </div>
            <select
              value={domainStatus}
              onChange={(e) => setDomainStatus(e.target.value as typeof domainStatus)}
              className="antd-input"
              aria-label="按状态筛选域"
            >
              <option value="all">全部状态</option>
              <option value="healthy">健康</option>
              <option value="degraded">异常</option>
            </select>
            {(domainQuery || domainStatus !== 'all') && (
              <button
                className="antd-btn"
                onClick={() => { setDomainQuery(''); setDomainStatus('all'); }}
              >
                清除筛选
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {filteredDomains.map(([domain, metrics]) => {
              const isDegraded = (metrics.error ?? 0) > 0 || metrics.latency >= 700;
              return (
                <div
                  key={domain}
                  style={{
                    padding: '16px',
                    background: isDegraded ? 'rgba(255, 71, 87, 0.04)' : 'rgba(0, 242, 254, 0.03)',
                    border: `1px solid ${isDegraded ? 'rgba(255, 71, 87, 0.15)' : 'rgba(0, 242, 254, 0.08)'}`,
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{domain}</div>
                    {isDegraded && <AlertTriangle size={14} style={{ color: 'var(--antd-warning)' }} />}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>调用次数</div>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>{metrics.calls.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>成功率</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: successColor }}>
                        {metrics.calls > 0 ? Math.round((metrics.success / metrics.calls) * 100) : 0}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>平均延迟</div>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>{metrics.latency.toFixed(1)}ms</div>
                    </div>
                    {(metrics.error ?? 0) > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>错误数</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--antd-error)' }}>{metrics.error}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
