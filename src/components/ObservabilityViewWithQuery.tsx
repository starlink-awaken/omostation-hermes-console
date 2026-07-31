/**
 * ObservabilityView with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React from 'react';
import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
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
  summary?: {
    total_calls: number;
    success_count: number;
    avg_latency: number;
  };
  domains?: Record<string, {
    calls: number;
    success: number;
    latency: number;
  }>;
}

// ── Hooks ──

function useArchHealth() {
  return useQuery({
    queryKey: ['arch-health'],
    queryFn: async () => {
      const response = await apiFetch<ArchHealth>('/api/v1/arch-health');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch architecture health');
      }
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useBosMetrics() {
  return useQuery({
    queryKey: ['bos-metrics'],
    queryFn: async () => {
      const response = await apiFetch<BosMetrics>('/api/bos/metrics');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch BOS metrics');
      }
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

// ── Component ──

export default function ObservabilityViewWithQuery() {
  const { data: archData, isLoading: archLoading, error: archError } = useArchHealth();
  const { data: bosData, isLoading: bosLoading, error: bosError } = useBosMetrics();

  const isLoading = archLoading || bosLoading;
  const error = archError?.message || bosError?.message || null;

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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>系统运行可观测</h1>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>正在聚合系统级多维观测数据...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
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
          <div style={{ fontSize: '14px' }}>{error}</div>
        </div>
      )}

      {/* BOS Metrics Card */}
      <div className="antd-card">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} aria-hidden="true" className="text-accent" />
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>BOS I0 网格链路流量</h2>
          </div>
        </div>
        
        {bosData && bosData.summary ? (
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
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--antd-text-secondary)' }}>
            暂无活跃流量数据
          </div>
        )}
      </div>

      {/* Arch Health Card */}
      <div className="antd-card">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} aria-hidden="true" className="text-success" />
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>系统架构健康度</h2>
          </div>
        </div>
        
        {archData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* System Status */}
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

            {/* Components Status */}
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
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--antd-text-secondary)' }}>
            暂无架构健康数据
          </div>
        )}
      </div>

      {/* Domain Metrics */}
      {bosData && bosData.domains && Object.keys(bosData.domains).length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} aria-hidden="true" className="text-info" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>域流量分布</h2>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(bosData.domains).map(([domain, metrics]) => (
              <div
                key={domain}
                style={{
                  padding: '16px',
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px' }}>{domain}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>调用次数</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{metrics.calls.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>成功率</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--antd-success)' }}>
                      {metrics.calls > 0 ? Math.round((metrics.success / metrics.calls) * 100) : 0}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>平均延迟</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>{metrics.latency.toFixed(1)}ms</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
