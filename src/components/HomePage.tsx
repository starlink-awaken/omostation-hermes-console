import React, { useState, useEffect } from 'react';
import HealthSummarySection from './home/HealthSummarySection';
import AlertFeedSection from './home/AlertFeedSection';
import MetricsTrendSection from './home/MetricsTrendSection';
import RecentTasksSection from './home/RecentTasksSection';
import QuickActionsSection from './home/QuickActionsSection';

interface HealthSummary {
  health_score: number;
  health_score_change: number;
  active_services: number;
  total_services: number;
  active_tasks: number;
  today_requests: number;
  today_requests_change: number;
}

interface Alert {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  updated_at: string;
}

interface DataPoint {
  timestamp: string;
  value: number;
}

export default function HomePage() {
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [healthScoreData, setHealthScoreData] = useState<DataPoint[]>([]);
  const [requestsData, setRequestsData] = useState<DataPoint[]>([]);
  const [errorRateData, setErrorRateData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 并行获取所有数据
        const [summaryRes, alertsRes, tasksRes, metricsRes] = await Promise.all([
          fetch('/api/health/summary'),
          fetch('/api/alerts?limit=3&status=active'),
          fetch('/api/tasks?limit=3&sort=updated'),
          fetch('/api/metrics/trend?range=24h'),
        ]);

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setHealthSummary(data);
        }

        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data.items || []);
        }

        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data.items || []);
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setHealthScoreData(data.health_score || []);
          setRequestsData(data.requests || []);
          setErrorRateData(data.error_rate || []);
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* 系统健康总览 */}
      <HealthSummarySection
        healthScore={healthSummary?.health_score || 0}
        healthScoreChange={healthSummary?.health_score_change || 0}
        activeServices={healthSummary?.active_services || 0}
        totalServices={healthSummary?.total_services || 0}
        activeTasks={healthSummary?.active_tasks || 0}
        todayRequests={healthSummary?.today_requests || 0}
        todayRequestsChange={healthSummary?.today_requests_change || 0}
      />

      {/* 实时告警 */}
      <AlertFeedSection
        alerts={alerts}
        limit={3}
        onViewAll={() => window.location.hash = '#alerts'}
        onConfigureRules={() => window.location.hash = '#alerts/rules'}
      />

      {/* 关键指标趋势 */}
      <MetricsTrendSection
        healthScoreData={healthScoreData}
        requestsData={requestsData}
        errorRateData={errorRateData}
      />

      {/* 最近任务 */}
      <RecentTasksSection
        tasks={tasks}
        limit={3}
        onViewAll={() => window.location.hash = '#tasks'}
      />

      {/* 快速入口 */}
      <QuickActionsSection />
    </div>
  );
}
