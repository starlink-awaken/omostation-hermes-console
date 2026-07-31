/**
 * AlertFeedSection with React Query integration.
 * 
 * This component fetches its own data using React Query,
 * replacing the prop-based pattern.
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';

// ── Types ──

interface Alert {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
}

interface AlertListResponse {
  items: Alert[];
}

// ── Hook ──

function useRecentAlerts(limit: number = 3) {
  return useQuery({
    queryKey: ['recent-alerts', limit],
    queryFn: async () => {
      const response = await apiFetch<AlertListResponse>(`/api/alerts?limit=${limit}&status=active`);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch alerts');
      }
      return response.data?.items || [];
    },
    staleTime: 15000, // 15 seconds
    refetchInterval: 15000,
    retry: 3,
  });
}

// ── Component ──

interface AlertFeedSectionProps {
  limit?: number;
  onViewAll?: () => void;
  onConfigureRules?: () => void;
}

export default function AlertFeedSectionWithQuery({
  limit = 3,
  onViewAll,
  onConfigureRules,
}: AlertFeedSectionProps) {
  const { data: alerts, isLoading, error } = useRecentAlerts(limit);

  const getLevelIcon = (level: Alert['level']) => {
    switch (level) {
      case 'critical':
        return <AlertCircle size={16} className="text-danger" />;
      case 'error':
        return <AlertTriangle size={16} className="text-danger" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-warning" />;
      case 'info':
        return <Info size={16} className="text-info" />;
      default:
        return <Info size={16} className="text-muted" />;
    }
  };

  const getLevelColor = (level: Alert['level']) => {
    switch (level) {
      case 'critical':
        return '#e74c3c';
      case 'error':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      case 'info':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const getLevelLabel = (level: Alert['level']) => {
    switch (level) {
      case 'critical':
        return '严重';
      case 'error':
        return '错误';
      case 'warning':
        return '警告';
      case 'info':
        return '信息';
      default:
        return '未知';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="alert-feed-section">
        <div className="section-header">
          <h2 className="section-title">实时告警</h2>
        </div>
        <div className="alert-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="alert-item">
              <div className="alert-icon">
                <Info size={16} className="text-muted" />
              </div>
              <div className="alert-content">
                <div className="alert-source">加载中...</div>
                <div className="alert-message">...</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="alert-feed-section">
        <div className="section-header">
          <h2 className="section-title">实时告警</h2>
        </div>
        <div role="alert" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--cockpit-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--cockpit-error)',
          fontSize: 14,
        }}>
          <AlertTriangle size={16} />
          <span>告警数据加载失败: {error.message}</span>
        </div>
      </section>
    );
  }

  const displayAlerts = alerts || [];

  return (
    <section className="alert-feed-section">
      <div className="section-header">
        <h2 className="section-title">实时告警</h2>
        <div className="section-actions">
          {onConfigureRules && (
            <button
              className="cockpit-btn small"
              onClick={onConfigureRules}
              aria-label="配置告警规则"
            >
              配置规则
            </button>
          )}
          {onViewAll && (
            <button
              className="cockpit-btn small"
              onClick={onViewAll}
              aria-label="查看全部告警"
            >
              查看全部
            </button>
          )}
        </div>
      </div>

      {displayAlerts.length === 0 ? (
        <div className="empty-state" role="status">
          <CheckCircle size={24} className="text-success" />
          <span>暂无活跃告警</span>
        </div>
      ) : (
        <div className="alert-list">
          {displayAlerts.map((alert) => (
            <div
              key={alert.id}
              className="alert-item"
              style={{ borderLeftColor: getLevelColor(alert.level) }}
            >
              <div className="alert-icon">
                {getLevelIcon(alert.level)}
              </div>
              <div className="alert-content">
                <div className="alert-header">
                  <span className="alert-source">{alert.source}</span>
                  <span
                    className="alert-level"
                    style={{ color: getLevelColor(alert.level) }}
                  >
                    {getLevelLabel(alert.level)}
                  </span>
                </div>
                <div className="alert-message">{alert.message}</div>
                <div className="alert-timestamp">{alert.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
