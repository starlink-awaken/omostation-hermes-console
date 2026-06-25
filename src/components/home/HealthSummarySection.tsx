import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthSummaryProps {
  healthScore: number;
  healthScoreChange: number;
  activeServices: number;
  totalServices: number;
  activeTasks: number;
  todayRequests: number;
  todayRequestsChange: number;
}

export default function HealthSummarySection({
  healthScore,
  healthScoreChange,
  activeServices,
  totalServices,
  activeTasks,
  todayRequests,
  todayRequestsChange,
}: HealthSummaryProps) {
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
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success">
            <span className="stat-icon">❤️</span>
          </div>
          <div className="stat-info">
            <h3>健康分数</h3>
            <p className="stat-value">{healthScore}</p>
            <div className="stat-trend">
              {getTrendIcon(healthScoreChange)}
              <span className={getTrendColor(healthScoreChange)}>
                {healthScoreChange > 0 ? '+' : ''}{healthScoreChange}%
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent">
            <span className="stat-icon">🖥️</span>
          </div>
          <div className="stat-info">
            <h3>活跃服务</h3>
            <p className="stat-value">{activeServices}/{totalServices}</p>
            <div className="stat-trend">
              <span className="text-muted">
                {activeServices === totalServices ? '全部在线' : `${totalServices - activeServices} 个离线`}
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
            <p className="stat-value">{activeTasks}</p>
            <div className="stat-trend">
              <span className="text-muted">进行中</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-info">
            <span className="stat-icon">📊</span>
          </div>
          <div className="stat-info">
            <h3>今日请求</h3>
            <p className="stat-value">{todayRequests.toLocaleString()}</p>
            <div className="stat-trend">
              {getTrendIcon(todayRequestsChange)}
              <span className={getTrendColor(todayRequestsChange)}>
                {todayRequestsChange > 0 ? '+' : ''}{todayRequestsChange}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
