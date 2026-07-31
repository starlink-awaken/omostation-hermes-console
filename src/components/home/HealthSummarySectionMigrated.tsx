/**
 * Migration Example: HealthSummarySection with React Query
 * 
 * This shows how to migrate from props-based data passing to React Query hooks.
 * Benefits:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Loading/error states
 * - Request cancellation
 */

import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';

// ── Types ──

interface HealthSummary {
  health_score: number;
  health_score_change: number;
  active_services: number;
  total_services: number;
  active_tasks: number;
  active_tasks_source?: string;
  today_requests: number;
  today_requests_change: number;
  data_quality?: string;
  degraded_reasons?: string[];
}

// ── Hook ──

/**
 * Custom hook to fetch health summary data.
 * 
 * This replaces the manual useState + useEffect pattern.
 * React Query handles:
 * - Caching (staleTime: 30s)
 * - Deduplication (multiple components using this hook share one request)
 * - Background refetching (refetchInterval: 30s)
 * - Loading/error states
 * - Request cancellation on unmount
 */
function useHealthSummary() {
  return useQuery({
    queryKey: ['health-summary'],
    queryFn: async () => {
      const response = await apiFetch<HealthSummary>('/api/health/summary');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch health summary');
      }
      return response.data!;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3, // Retry failed requests 3 times
  });
}

// ── Component ──

interface HealthSummarySectionProps {
  /** Optional: Override data from parent (for testing or pre-fetched data) */
  data?: HealthSummary;
}

export default function HealthSummarySection({ data }: HealthSummarySectionProps) {
  // Use React Query to fetch data, or use provided data
  const { data: fetchedData, isLoading, error } = useHealthSummary();
  
  // Use provided data if available, otherwise use fetched data
  const healthSummary = data || fetchedData;
  
  // Loading state
  if (isLoading && !data) {
    return (
      <section className="health-summary-section">
        <h2 className="section-title">系统健康总览</h2>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon-wrapper pulse-success">
                <span className="stat-icon">...</span>
              </div>
              <div className="stat-info">
                <h3>加载中...</h3>
                <p className="stat-value">--</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  
  // Error state
  if (error && !data) {
    return (
      <section className="health-summary-section">
        <h2 className="section-title">系统健康总览</h2>
        <div role="alert" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          padding: '12px 16px', 
          border: '1px solid rgba(255, 71, 87, 0.35)', 
          borderRadius: 'var(--cockpit-radius-md)', 
          background: 'rgba(255, 71, 87, 0.08)', 
          color: 'var(--cockpit-error)', 
          fontSize: 14 
        }}>
          <AlertTriangle size={16} />
          <span>健康数据加载失败: {error.message}</span>
        </div>
      </section>
    );
  }
  
  // No data state
  if (!healthSummary) {
    return (
      <section className="health-summary-section">
        <h2 className="section-title">系统健康总览</h2>
        <div role="status" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          padding: '12px 16px', 
          border: '1px solid rgba(148, 163, 184, 0.35)', 
          borderRadius: 'var(--cockpit-radius-md)', 
          background: 'rgba(148, 163, 184, 0.08)', 
          color: 'var(--cockpit-text-secondary)', 
          fontSize: 14 
        }}>
          <span>健康数据不可用</span>
        </div>
      </section>
    );
  }
  
  // Data loaded successfully
  const summaryUnavailable = healthSummary.data_quality === 'unavailable';
  const tasksUnavailable = summaryUnavailable || healthSummary.active_tasks_source === 'unavailable';

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp size={16} className="text-success" />;
    if (change < 0) return <TrendingDown size={16} className="text-danger" />;
    return <Minus size={16} className="text-muted" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-danger';
    return 'text-muted';
  };

  return (
    <section className="health-summary-section">
      <h2 className="section-title">系统健康总览</h2>
      {healthSummary.data_quality !== 'complete' && (
        <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(250, 173, 20, 0.35)', borderRadius: 'var(--cockpit-radius-md)', background: 'rgba(250, 173, 20, 0.08)', color: 'var(--cockpit-warning)', fontSize: 12 }}>
          <AlertTriangle size={14} style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span>健康数据为{healthSummary.data_quality === 'partial' ? '部分' : '不可用'}读数{healthSummary.degraded_reasons && healthSummary.degraded_reasons.length > 0 ? `：${healthSummary.degraded_reasons.join('；')}` : ''}。</span>
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success">
            <span className="stat-icon">❤️</span>
          </div>
          <div className="stat-info">
            <h3>健康分数</h3>
            <p className="stat-value">{summaryUnavailable ? 'N/A' : healthSummary.health_score}</p>
            <div className="stat-trend">
              {summaryUnavailable ? <span className="text-muted">健康数据不可用</span> : (
                <>
                  {getTrendIcon(healthSummary.health_score_change)}
                  <span className={getTrendColor(healthSummary.health_score_change)}>
                    {healthSummary.health_score_change > 0 ? '+' : ''}{healthSummary.health_score_change}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent">
            <span className="stat-icon">🖥️</span>
          </div>
          <div className="stat-info">
            <h3>活跃服务</h3>
            <p className="stat-value">{summaryUnavailable ? 'N/A' : `${healthSummary.active_services}/${healthSummary.total_services}`}</p>
            <div className="stat-trend">
              <span className="text-muted">
                {summaryUnavailable ? '服务数据不可用' : healthSummary.active_services === healthSummary.total_services ? '全部在线' : `${healthSummary.total_services - healthSummary.active_services} 个离线`}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-warning">
            <span className="stat-icon">📋</span>
          </div>
          <div className="stat-info">
            <h3>活跃任务</h3>
            <p className="stat-value">{tasksUnavailable ? 'N/A' : healthSummary.active_tasks}</p>
            <div className="stat-trend">
              <span className="text-muted">{tasksUnavailable ? '任务队列不可用' : 'OMO active 队列'}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-info">
            <span className="stat-icon">📊</span>
          </div>
          <div className="stat-info">
            <h3>今日请求</h3>
            <p className="stat-value">{summaryUnavailable ? 'N/A' : healthSummary.today_requests.toLocaleString()}</p>
            <div className="stat-trend">
              {summaryUnavailable ? <span className="text-muted">请求数据不可用</span> : (
                <>
                  {getTrendIcon(healthSummary.today_requests_change)}
                  <span className={getTrendColor(healthSummary.today_requests_change)}>
                    {healthSummary.today_requests_change > 0 ? '+' : ''}{healthSummary.today_requests_change}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
