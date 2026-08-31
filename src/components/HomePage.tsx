import { useEffect, useState } from 'react';
import './HomePage.css';
import HealthSummarySection from './home/HealthSummarySection';
import AlertFeedSection from './home/AlertFeedSection';
import MetricsTrendSection from './home/MetricsTrendSection';
import RecentTasksSection from './home/RecentTasksSection';
import GovernanceOverviewSection from './home/GovernanceOverviewSection';
import HomeFocusSection, { type HomeFocusPayload } from './home/HomeFocusSection';
import { openCockpitNavigationTarget } from './cockpitNavigation';
import type { HealthSummary, CockpitAlert, CockpitTask, DataPoint } from '../types/cockpit';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

type DataQuality = 'loading' | 'complete' | 'partial' | 'unavailable';
type HomeSource = 'summary' | 'alerts' | 'tasks' | 'metrics' | 'thoughts' | 'focus';

interface HomePageProps {
  onTabChange?: (tab: string) => void;
}

interface Thought {
  role: string;
  name: string;
  avatar: string;
  content: string;
}

interface MetricsResponse {
  health_score?: DataPoint[];
  requests?: DataPoint[];
  error_rate?: DataPoint[];
}

interface ThoughtsResponse {
  status?: string;
  thoughts?: Thought[];
}

interface ReadSuccess<T> {
  ok: true;
  data: T;
}

interface ReadFailure {
  ok: false;
  source: HomeSource;
}

type ReadResult<T> = ReadSuccess<T> | ReadFailure;

const SOURCE_LABELS: Record<HomeSource, string> = {
  summary: '健康摘要',
  alerts: '告警列表',
  tasks: '任务列表',
  metrics: '指标趋势',
  thoughts: '心智探针',
  focus: '工作焦点',
};

// ── Data fetching hooks (using centralized apiFetch) ──

function useHealthSummary() {
  return useQuery({
    queryKey: ['home-health-summary'],
    queryFn: async () => {
      const res = await apiFetch<HealthSummary>('/api/health/summary');
      if (!res.ok) throw new Error(res.error || 'Failed to fetch health summary');
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 2,
  });
}

function useHomeAlerts() {
  return useQuery({
    queryKey: ['home-alerts'],
    queryFn: async () => {
      const res = await apiFetch<{ items?: CockpitAlert[] }>('/api/alerts?limit=3&status=active');
      if (!res.ok) throw new Error(res.error || 'Failed to fetch alerts');
      return res.data?.items ?? [];
    },
    staleTime: 15000,
    refetchInterval: 15000,
    retry: 2,
  });
}

function useHomeTasks() {
  return useQuery({
    queryKey: ['home-tasks'],
    queryFn: async () => {
      const res = await apiFetch<{ items?: CockpitTask[] }>('/api/tasks?limit=3&sort=updated');
      if (!res.ok) throw new Error(res.error || 'Failed to fetch tasks');
      return res.data?.items ?? [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 2,
  });
}

function useHomeMetrics() {
  return useQuery({
    queryKey: ['home-metrics'],
    queryFn: async () => {
      const res = await apiFetch<MetricsResponse>('/api/metrics/trend?range=24h');
      if (!res.ok) throw new Error(res.error || 'Failed to fetch metrics');
      return res.data;
    },
    staleTime: 60000,
    retry: 2,
  });
}

function useHomeThoughts() {
  return useQuery({
    queryKey: ['home-thoughts'],
    queryFn: async () => {
      const res = await apiFetch<ThoughtsResponse>('/api/omos/thoughts');
      if (!res.ok) throw new Error(res.error || 'Failed to fetch thoughts');
      return res.data;
    },
    staleTime: 30000,
    retry: 2,
  });
}

function useHomeFocus() {
  return useQuery({
    queryKey: ['home-focus'],
    queryFn: async () => {
      const res = await apiFetch<HomeFocusPayload>('/api/cockpit/system-map');
      if (!res.ok) throw new Error(res.error || 'Failed to fetch focus');
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 2,
  });
}

function ThoughtStreamSection({ thoughts }: { thoughts: Thought[] }) {
  if (thoughts.length === 0) return null;

  const roleColors: Record<string, string> = {
    builder: 'var(--antd-primary)',
    devil: 'var(--antd-error)',
    sage: 'var(--antd-warning)',
    keeper: 'var(--antd-success)',
  };

  return (
    <div className="services-section animate-fade-in" style={{ marginTop: 0, marginBottom: 24 }}>
      <div className="section-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--antd-text-secondary)', margin: 0 }}>
          <span aria-hidden="true">🧠</span>
          虚拟董事会心智探针 (Thought Streams)
        </h3>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>实时系统洞察与架构审查</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {thoughts.map((thought) => (
          <div
            key={thought.role}
            className="antd-card"
            style={{
              padding: '16px 20px',
              borderLeft: `3px solid ${roleColors[thought.role] || 'rgba(255,255,255,0.1)'}`,
              background: 'rgba(255,255,255,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--antd-text-primary)' }}>
                <span>{thought.avatar}</span>
                <span>{thought.name}</span>
              </span>
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
                {thought.role}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all' }}>
              {thought.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ onTabChange }: HomePageProps) {
  void onTabChange;

  const summaryQuery = useHealthSummary();
  const alertsQuery = useHomeAlerts();
  const tasksQuery = useHomeTasks();
  const metricsQuery = useHomeMetrics();
  const thoughtsQuery = useHomeThoughts();
  const focusQuery = useHomeFocus();

  // Derive data quality per source
  const sourceQuality: Record<HomeSource, DataQuality> = {
    summary: summaryQuery.isLoading ? 'loading' : summaryQuery.isError ? 'unavailable' : 'complete',
    alerts: alertsQuery.isLoading ? 'loading' : alertsQuery.isError ? 'unavailable' : 'complete',
    tasks: tasksQuery.isLoading ? 'loading' : tasksQuery.isError ? 'unavailable' : 'complete',
    metrics: metricsQuery.isLoading ? 'loading' : metricsQuery.isError ? 'unavailable' : 'complete',
    thoughts: thoughtsQuery.isLoading ? 'loading' : thoughtsQuery.isError ? 'unavailable' : 'complete',
    focus: focusQuery.isLoading ? 'loading' : focusQuery.isError ? 'unavailable' : 'complete',
  };

  const anyLoading = summaryQuery.isLoading || alertsQuery.isLoading || tasksQuery.isLoading ||
    metricsQuery.isLoading || thoughtsQuery.isLoading || focusQuery.isLoading;

  const failedSources = (Object.entries(sourceQuality) as [HomeSource, DataQuality][])
    .filter(([, q]) => q === 'unavailable')
    .map(([s]) => SOURCE_LABELS[s]);

  const successCount = Object.values(sourceQuality).filter((q) => q === 'complete').length;
  const totalSources = Object.keys(sourceQuality).length;
  const dataQuality: DataQuality = anyLoading
    ? 'loading'
    : failedSources.length === 0
      ? 'complete'
      : successCount === 0
        ? 'unavailable'
        : 'partial';

  const healthSummary = summaryQuery.data ?? null;
  const alerts = alertsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const healthScoreData = metricsQuery.data?.health_score ?? [];
  const requestsData = metricsQuery.data?.requests ?? [];
  const errorRateData = metricsQuery.data?.error_rate ?? [];
  const thoughts = thoughtsQuery.data?.status === 'ok' ? (thoughtsQuery.data.thoughts ?? []) : [];
  const focus = focusQuery.data ?? null;

  const homeMessage = anyLoading
    ? '正在读取真实首页数据'
    : dataQuality === 'complete'
      ? null
      : dataQuality === 'partial'
        ? `首页部分数据暂不可用：${failedSources.join('、')}。未展示默认运行状态。`
        : '首页数据暂不可用，当前未展示模拟或默认运行状态。';

  return (
    <div className="home-page">
      {homeMessage && (
        <div className="shell-data-banner" role={anyLoading ? 'status' : 'alert'}>
          {homeMessage}
        </div>
      )}

      <HomeFocusSection
        focus={focus}
        dataQuality={sourceQuality.focus}
        onOpenProject={(projectId) => openCockpitNavigationTarget({ tab: 'SystemMap', focusProjectId: projectId })}
        onViewTasks={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system-map-focus' })}
      />

      <HealthSummarySection
        healthScore={healthSummary?.health_score ?? 0}
        healthScoreChange={healthSummary?.health_score_change ?? 0}
        activeServices={healthSummary?.active_services ?? 0}
        totalServices={healthSummary?.total_services ?? 0}
        activeTasks={healthSummary?.active_tasks ?? 0}
        activeTasksSource={healthSummary ? healthSummary.active_tasks_source ?? 'omo' : 'unavailable'}
        todayRequests={healthSummary?.today_requests ?? 0}
        todayRequestsChange={healthSummary?.today_requests_change ?? 0}
        dataQuality={sourceQuality.summary}
        degradedReasons={sourceQuality.summary === 'unavailable' ? ['健康摘要不可用'] : []}
      />

      <ThoughtStreamSection thoughts={thoughts} />

      <AlertFeedSection
        alerts={alerts}
        dataQuality={sourceQuality.alerts}
        limit={3}
        onViewAll={() => openCockpitNavigationTarget({ tab: 'AlertCenter' })}
        onConfigureRules={() => openCockpitNavigationTarget({ tab: 'AlertCenter', alertTab: 'rules' })}
      />

      <MetricsTrendSection
        healthScoreData={healthScoreData}
        requestsData={requestsData}
        errorRateData={errorRateData}
        dataQuality={sourceQuality.metrics}
        degradedReasons={sourceQuality.metrics === 'unavailable' ? ['指标趋势不可用'] : []}
      />

      <RecentTasksSection
        tasks={tasks}
        dataQuality={sourceQuality.tasks}
        limit={3}
        onViewAll={() => openCockpitNavigationTarget({ tab: 'TaskCenter' })}
      />

      <GovernanceOverviewSection />
    </div>
  );
}
