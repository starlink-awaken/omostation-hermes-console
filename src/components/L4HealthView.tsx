/**
 * L4HealthView with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// ── Types ──

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

// ── Hooks ──

function useL4Health() {
  return useQuery({
    queryKey: ['l4-health'],
    queryFn: async () => {
      const response = await apiFetch<HealthData>('/api/l4/health');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch L4 health');
      }
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useL4Trend() {
  return useQuery({
    queryKey: ['l4-trend'],
    queryFn: async () => {
      const response = await apiFetch<TrendData>('/api/l4/trend');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch L4 trend');
      }
      return response.data;
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 3,
  });
}

function useL4Signal() {
  return useQuery({
    queryKey: ['l4-signal'],
    queryFn: async () => {
      const response = await apiFetch<SignalData>('/api/l4/signal');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch L4 signal');
      }
      return response.data;
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 3,
  });
}

// ── Component ──

export default function L4HealthView() {
  const { data: healthData, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useL4Health();
  const { data: trendData, isLoading: trendLoading } = useL4Trend();
  const { data: signalData, isLoading: signalLoading } = useL4Signal();

  const isLoading = healthLoading || trendLoading || signalLoading;
  const error = healthError?.message || null;

  const getHealthIcon = (domain: DomainHealth) => {
    if (!domain.exists) return <XCircle size={16} className="text-muted" />;
    if (!domain.fresh) return <AlertTriangle size={16} className="text-warning" />;
    if (domain.issue_count > 0) return <AlertTriangle size={16} className="text-warning" />;
    return <CheckCircle size={16} className="text-success" />;
  };

  const getHealthStatus = (domain: DomainHealth) => {
    if (!domain.exists) return '不存在';
    if (!domain.fresh) return '过期';
    if (domain.issue_count > 0) return `${domain.issue_count} 问题`;
    return '健康';
  };

  const getHealthColor = (domain: DomainHealth) => {
    if (!domain.exists) return 'var(--antd-text-muted)';
    if (!domain.fresh) return 'var(--antd-warning)';
    if (domain.issue_count > 0) return 'var(--antd-warning)';
    return 'var(--antd-success)';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>L4 健康监控</h1>
        </div>
        <button
          className="antd-btn"
          onClick={() => {
            refetchHealth();
          }}
          disabled={isLoading}
          aria-label="刷新健康数据"
        >
          <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
          <span>刷新</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <RefreshCw size={24} className="spinning" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
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
            <strong>健康数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error}</div>
        </div>
      )}

      {/* Health Summary */}
      {healthData && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>健康概览</h2>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              更新时间: {healthData.timestamp}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--antd-primary)' }}>
                {healthData.total_domains}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>总域数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--antd-success)' }}>
                {healthData.healthy_count}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>健康</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--antd-error)' }}>
                {healthData.unhealthy_count}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>异常</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--antd-primary)' }}>
                {healthData.health_rate}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>健康率</div>
            </div>
          </div>
        </div>
      )}

      {/* Domain List */}
      {healthData && healthData.domains.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>域健康状态</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {healthData.domains.map((domain) => (
              <div
                key={domain.id}
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
                  {getHealthIcon(domain)}
                  <div>
                    <div style={{ fontWeight: 500 }}>{domain.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
                      {domain.capabilities.join(', ')}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: 500,
                  color: getHealthColor(domain),
                }}>
                  {getHealthStatus(domain)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signal Patterns */}
      {signalData && signalData.patterns.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Signal size={16} aria-hidden="true" className="text-warning" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>信号模式</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              总信号: {signalData.total_signals}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {signalData.patterns.map((pattern, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  background: pattern.level === 'error' 
                    ? 'rgba(255, 71, 87, 0.08)' 
                    : pattern.level === 'warning'
                    ? 'rgba(255, 184, 0, 0.08)'
                    : 'rgba(0, 242, 254, 0.03)',
                  border: `1px solid ${pattern.level === 'error' 
                    ? 'rgba(255, 71, 87, 0.35)' 
                    : pattern.level === 'warning'
                    ? 'rgba(255, 184, 0, 0.35)'
                    : 'rgba(0, 242, 254, 0.08)'}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>{pattern.pattern}</div>
                <div style={{ color: 'var(--antd-text-secondary)' }}>{pattern.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {signalData && signalData.risks.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} aria-hidden="true" className="text-error" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>风险项</h2>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {signalData.risks.map((risk, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  background: risk.severity === 'high' 
                    ? 'rgba(255, 71, 87, 0.08)' 
                    : 'rgba(255, 184, 0, 0.08)',
                  border: `1px solid ${risk.severity === 'high' 
                    ? 'rgba(255, 71, 87, 0.35)' 
                    : 'rgba(255, 184, 0, 0.35)'}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>{risk.risk}</div>
                <div style={{ color: 'var(--antd-text-secondary)' }}>{risk.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Data */}
      {trendData && Object.keys(trendData.trends).length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} aria-hidden="true" className="text-info" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>趋势分析</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              记录数: {trendData.total_records}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {Object.entries(trendData.trends).map(([domain, trend]) => (
              <div
                key={domain}
                style={{
                  padding: '12px',
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '8px' }}>{domain}</div>
                <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                  <div>健康率: {(trend.health_rate * 100).toFixed(1)}%</div>
                  <div>平均问题: {trend.avg_issues.toFixed(1)}</div>
                  <div>平均信号: {trend.avg_signals.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
