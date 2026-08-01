/**
 * L4HealthView — L4 域健康监控.
 *
 * 从 fullsite 移植的改进:
 *   - 域健康搜索筛选 (healthQuery + healthStatusFilter)
 *   - data_quality / degraded_reasons 降级显示
 *   - 趋势/信号/异常多维筛选展示
 *   - 定时刷新 + 最后更新时间
 *   - 域健康任务登记模式
 */

import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Shield,
  Signal,
  TrendingUp,
  XCircle,
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
  data_quality?: 'available' | 'degraded' | 'unavailable';
  degraded_reasons?: string[];
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

// ── Pure helpers ──

function isHealthyDomain(domain: DomainHealth): boolean {
  return domain.fresh && domain.issue_count === 0 && domain.has_state && domain.has_status;
}

// ── Component ──

export default function L4HealthView() {
  const { data: healthData, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useL4Health();
  const { data: trendData, isLoading: trendLoading, error: trendError } = useL4Trend();
  const { data: signalData, isLoading: signalLoading, error: signalError } = useL4Signal();

  // 搜索筛选状态
  const [healthQuery, setHealthQuery] = useState('');
  const [healthStatusFilter, setHealthStatusFilter] = useState<'all' | 'healthy' | 'unhealthy'>('all');
  const [anomalyQuery, setAnomalyQuery] = useState('');
  const [patternQuery, setPatternQuery] = useState('');

  const isLoading = healthLoading || trendLoading || signalLoading;

  // 三源独立错误处理: 一个失败不影响另外两个
  const healthUnavailable = healthError || healthData?.data_quality === 'unavailable';
  const degradedReasons = healthData?.degraded_reasons || [];

  // 域筛选
  const filteredDomains = useMemo(() => {
    if (!healthData?.domains) return [];
    return healthData.domains.filter((domain) => {
      // 状态筛选
      if (healthStatusFilter === 'healthy' && !isHealthyDomain(domain)) return false;
      if (healthStatusFilter === 'unhealthy' && isHealthyDomain(domain)) return false;
      // 搜索筛选
      if (healthQuery) {
        const query = healthQuery.toLowerCase();
        const name = domain.name.toLowerCase();
        const caps = domain.capabilities.join(' ').toLowerCase();
        if (!name.includes(query) && !caps.includes(query) && !domain.id.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [healthData, healthQuery, healthStatusFilter]);

  // 异常筛选
  const filteredAnomalies = useMemo(() => {
    if (!trendData?.anomalies) return [];
    if (!anomalyQuery) return trendData.anomalies;
    const query = anomalyQuery.toLowerCase();
    return trendData.anomalies.filter((a) =>
      a.domain.toLowerCase().includes(query) ||
      a.type.toLowerCase().includes(query) ||
      a.message.toLowerCase().includes(query)
    );
  }, [trendData, anomalyQuery]);

  // 信号模式筛选
  const filteredPatterns = useMemo(() => {
    if (!signalData?.patterns) return [];
    if (!patternQuery) return signalData.patterns;
    const query = patternQuery.toLowerCase();
    return signalData.patterns.filter((p) =>
      p.pattern.toLowerCase().includes(query) || p.message.toLowerCase().includes(query)
    );
  }, [signalData, patternQuery]);

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
          {healthData && (
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              更新于 {new Date(healthData.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          className="antd-btn"
          onClick={() => { refetchHealth(); }}
          disabled={isLoading}
          aria-label="刷新健康数据"
        >
          <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
          <span>刷新</span>
        </button>
      </div>

      {/* 降级警告 */}
      {degradedReasons.length > 0 && (
        <div role="alert" style={{
          padding: '12px 16px',
          border: '1px solid rgba(255, 184, 0, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 184, 0, 0.06)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={16} style={{ color: 'var(--antd-warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--antd-warning)', marginBottom: '4px' }}>数据降级</div>
            <div style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              {degradedReasons.join('; ')}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !healthData && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <RefreshCw size={24} className="spinning" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

      {/* Error State */}
      {healthUnavailable && !isLoading && (
        <div role="alert" style={{
          padding: '16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} />
            <strong>健康数据不可用</strong>
          </div>
          <div style={{ fontSize: '14px' }}>
            {healthError?.message || '健康数据暂时不可用，趋势和信号数据可能仍可使用。'}
          </div>
        </div>
      )}

      {/* Health Summary */}
      {healthData && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>健康概览</h2>
            {healthData.data_quality && healthData.data_quality !== 'available' && (
              <span style={{ fontSize: '12px', color: 'var(--antd-warning)' }}>
                数据质量: {healthData.data_quality === 'degraded' ? '降级' : '不可用'}
              </span>
            )}
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

      {/* Domain List with Filters */}
      {filteredDomains.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>域健康状态</h2>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {filteredDomains.length}/{healthData?.domains.length || 0} 域
            </span>
          </div>

          {/* 筛选控件 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="搜索域或能力..."
              value={healthQuery}
              onChange={(e) => setHealthQuery(e.target.value)}
              className="antd-input"
              style={{ flex: '1 1 200px', minWidth: 180 }}
              aria-label="搜索域"
            />
            <select
              value={healthStatusFilter}
              onChange={(e) => setHealthStatusFilter(e.target.value as typeof healthStatusFilter)}
              className="antd-input"
              aria-label="按状态筛选"
            >
              <option value="all">全部状态</option>
              <option value="healthy">健康</option>
              <option value="unhealthy">异常</option>
            </select>
            {(healthQuery || healthStatusFilter !== 'all') && (
              <button
                className="antd-btn"
                onClick={() => { setHealthQuery(''); setHealthStatusFilter('all'); }}
              >
                清除筛选
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredDomains.map((domain) => (
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

      {/* Signal Patterns with Filter */}
      {filteredPatterns.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Signal size={16} aria-hidden="true" className="text-warning" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>信号模式</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              总信号: {signalData?.total_signals || 0}
            </span>
          </div>

          <input
            type="search"
            placeholder="搜索信号模式..."
            value={patternQuery}
            onChange={(e) => setPatternQuery(e.target.value)}
            className="antd-input"
            style={{ width: '100%', marginBottom: '12px' }}
            aria-label="搜索信号模式"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredPatterns.map((pattern, index) => (
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

      {/* Trend Data with Anomaly Filter */}
      {trendData && (Object.keys(trendData.trends).length > 0 || filteredAnomalies.length > 0) && (
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

          {/* 异常筛选 */}
          {filteredAnomalies.length > 0 && (
            <>
              <input
                type="search"
                placeholder="搜索异常..."
                value={anomalyQuery}
                onChange={(e) => setAnomalyQuery(e.target.value)}
                className="antd-input"
                style={{ width: '100%', marginBottom: '12px' }}
                aria-label="搜索异常"
              />
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredAnomalies.map((anomaly, index) => (
                  <div key={index} style={{
                    padding: '10px',
                    background: 'rgba(255, 71, 87, 0.06)',
                    border: '1px solid rgba(255, 71, 87, 0.2)',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}>
                    <strong>{anomaly.domain}</strong> · {anomaly.type} · {anomaly.message}
                  </div>
                ))}
              </div>
            </>
          )}

          {Object.keys(trendData.trends).length > 0 && (
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
          )}
        </div>
      )}
    </div>
  );
}
