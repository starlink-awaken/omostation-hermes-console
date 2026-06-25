import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface Alert {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
}

interface AlertFeedSectionProps {
  alerts: Alert[];
  limit?: number;
  onViewAll?: () => void;
  onConfigureRules?: () => void;
}

export default function AlertFeedSection({
  alerts,
  limit = 3,
  onViewAll,
  onConfigureRules,
}: AlertFeedSectionProps) {
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const displayAlerts = alerts.slice(0, limit);

  return (
    <section className="alert-feed-section">
      <div className="section-header">
        <h2 className="section-title">
          实时告警
          {alerts.length > 0 && (
            <span className="alert-count">({alerts.length})</span>
          )}
        </h2>
        <div className="section-actions">
          {onViewAll && (
            <button className="btn-link" onClick={onViewAll}>
              查看全部
            </button>
          )}
          {onConfigureRules && (
            <button className="btn-link" onClick={onConfigureRules}>
              配置规则
            </button>
          )}
        </div>
      </div>

      <div className="alert-feed-list">
        {displayAlerts.length === 0 ? (
          <div className="alert-feed-empty">
            <CheckCircle size={24} className="text-success" />
            <span>暂无活跃告警</span>
          </div>
        ) : (
          displayAlerts.map((alert) => (
            <div
              key={alert.id}
              className="alert-feed-item"
              style={{ borderLeftColor: getLevelColor(alert.level) }}
            >
              <div className="alert-feed-icon">
                {getLevelIcon(alert.level)}
              </div>
              <div className="alert-feed-content">
                <div className="alert-feed-header">
                  <span className="alert-feed-source">[{alert.source}]</span>
                  <span className="alert-feed-message">{alert.message}</span>
                </div>
                <div className="alert-feed-time">
                  {formatTime(alert.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
