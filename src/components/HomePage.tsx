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

// 默认数据
const DEFAULT_HEALTH_SUMMARY: HealthSummary = {
  health_score: 98,
  health_score_change: 2,
  active_services: 24,
  total_services: 28,
  active_tasks: 5,
  today_requests: 12400,
  today_requests_change: 15,
};

const DEFAULT_ALERTS: Alert[] = [
  {
    id: '1',
    level: 'warning',
    source: 'L4 Health',
    message: 'vault 域信号数异常 (160个)',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: '2',
    level: 'warning',
    source: 'Agora',
    message: 'LLM Gateway 延迟升高 (850ms)',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: '3',
    level: 'info',
    source: 'KOS',
    message: '搜索索引重建中',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
  },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'TASK-001',
    title: 'L4 域优化',
    status: 'in_progress',
    progress: 75,
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'TASK-002',
    title: '告警规则配置',
    status: 'completed',
    progress: 100,
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'TASK-003',
    title: 'Phase 3 实施',
    status: 'in_progress',
    progress: 60,
    updated_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
];

const generateTimeSeriesData = (hours: number, baseValue: number, variance: number): DataPoint[] => {
  const data: DataPoint[] = [];
  const now = Date.now();
  for (let i = hours; i >= 0; i--) {
    data.push({
      timestamp: new Date(now - i * 3600000).toISOString(),
      value: baseValue + Math.random() * variance - variance / 2,
    });
  }
  return data;
};

const DEFAULT_HEALTH_SCORE_DATA = generateTimeSeriesData(24, 95, 10);
const DEFAULT_REQUESTS_DATA = generateTimeSeriesData(24, 500, 200);
const DEFAULT_ERROR_RATE_DATA = generateTimeSeriesData(24, 2, 3);

export default function HomePage() {
  const [healthSummary, setHealthSummary] = useState<HealthSummary>(DEFAULT_HEALTH_SUMMARY);
  const [alerts, setAlerts] = useState<Alert[]>(DEFAULT_ALERTS);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [healthScoreData, setHealthScoreData] = useState<DataPoint[]>(DEFAULT_HEALTH_SCORE_DATA);
  const [requestsData, setRequestsData] = useState<DataPoint[]>(DEFAULT_REQUESTS_DATA);
  const [errorRateData, setErrorRateData] = useState<DataPoint[]>(DEFAULT_ERROR_RATE_DATA);
  const [loading, setLoading] = useState(false);

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
          if (data.items && data.items.length > 0) {
            setAlerts(data.items);
          }
        }

        if (tasksRes.ok) {
          const data = await tasksRes.json();
          if (data.items && data.items.length > 0) {
            setTasks(data.items);
          }
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          if (data.health_score && data.health_score.length > 0) {
            setHealthScoreData(data.health_score);
          }
          if (data.requests && data.requests.length > 0) {
            setRequestsData(data.requests);
          }
          if (data.error_rate && data.error_rate.length > 0) {
            setErrorRateData(data.error_rate);
          }
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error);
        // 使用默认数据
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-page">
      {/* 系统健康总览 */}
      <HealthSummarySection
        healthScore={healthSummary.health_score}
        healthScoreChange={healthSummary.health_score_change}
        activeServices={healthSummary.active_services}
        totalServices={healthSummary.total_services}
        activeTasks={healthSummary.active_tasks}
        todayRequests={healthSummary.today_requests}
        todayRequestsChange={healthSummary.today_requests_change}
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
