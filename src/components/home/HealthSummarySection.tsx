import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthSummaryProps {
  healthScore: number;
  healthScoreChange: number;
  activeServices: number;
  totalServices: number;
  activeTasks: number;
  activeTasksSource?: string;
  todayRequests: number;
  todayRequestsChange: number;
  dataQuality?: string;
  degradedReasons?: string[];
}

export default function HealthSummarySection({
  healthScore,
  healthScoreChange,
  activeServices,
  totalServices,
  activeTasks,
  activeTasksSource = 'omo',
  todayRequests,
  todayRequestsChange,
  dataQuality = 'complete',
  degradedReasons = [],
}: HealthSummaryProps) {
  const summaryUnavailable = dataQuality === 'unavailable';
  const tasksUnavailable = summaryUnavailable || activeTasksSource === 'unavailable';

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
      {dataQuality !== 'complete' && (
        <div role="status" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(250, 173, 20, 0.35)', borderRadius: 'var(--cockpit-radius-md)', background: 'rgba(250, 173, 20, 0.08)', color: 'var(--cockpit-warning)', fontSize: 12 }}>
          <AlertTriangle size={14} style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span>健康数据为{dataQuality === 'partial' ? '部分' : '不可用'}读数{degradedReasons.length > 0 ? `：${degradedReasons.join('；')}` : ''}。</span>
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success">
            <span className="stat-icon">❤️</span>
          </div>
          <div className="stat-info">
            <h3>健康分数</h3>
            <p className="stat-value">{summaryUnavailable ? 'N/A' : healthScore}</p>
            <div className="stat-trend">
              {summaryUnavailable ? <span className="text-muted">健康数据不可用</span> : (
                <>
                  {getTrendIcon(healthScoreChange)}
                  <span className={getTrendColor(healthScoreChange)}>
                    {healthScoreChange > 0 ? '+' : ''}{healthScoreChange}%
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
            <p className="stat-value">{summaryUnavailable ? 'N/A' : `${activeServices}/${totalServices}`}</p>
            <div className="stat-trend">
              <span className="text-muted">
                {summaryUnavailable ? '服务数据不可用' : activeServices === totalServices ? '全部在线' : `${totalServices - activeServices} 个离线`}
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
            <p className="stat-value">{tasksUnavailable ? 'N/A' : activeTasks}</p>
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
            <p className="stat-value">{summaryUnavailable ? 'N/A' : todayRequests.toLocaleString()}</p>
            <div className="stat-trend">
              {summaryUnavailable ? <span className="text-muted">请求数据不可用</span> : (
                <>
                  {getTrendIcon(todayRequestsChange)}
                  <span className={getTrendColor(todayRequestsChange)}>
                    {todayRequestsChange > 0 ? '+' : ''}{todayRequestsChange}%
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
