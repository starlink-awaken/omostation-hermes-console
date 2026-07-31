/**
 * Custom hook for HomePage data fetching using React Query.
 * 
 * This replaces the manual useState + useEffect pattern in HomePage.
 * Benefits:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Loading/error states
 * - Request cancellation
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';

// ── Types ──

export interface HealthSummary {
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

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  created_at: string;
}

export interface AlertListResponse {
  items: Alert[];
}

export interface Task {
  id: string;
  title: string;
  detail?: string;
  status?: string;
  target?: { tab: string; [key: string]: unknown };
  source?: { type?: string };
}

export interface TaskListResponse {
  items: Task[];
}

export interface MetricsTrend {
  health_score: Array<{ date: string; value: number }>;
  requests: Array<{ date: string; value: number }>;
  error_rate: Array<{ date: string; value: number }>;
  data_quality?: string;
  degraded_reasons?: string[];
}

export interface Thought {
  id: string;
  content: string;
  source?: string;
  timestamp?: string;
}

export interface ThoughtsResponse {
  status: string;
  thoughts: Thought[];
}

export interface HomeSystemMap {
  cockpit_pages?: Array<{
    id: string;
    title: string;
    group: string;
    purpose?: string;
    dimensions?: string[];
  }>;
  project_portfolio?: {
    summary?: {
      score?: number;
      blocked?: number;
      at_risk?: number;
      watch?: number;
      healthy?: number;
    };
    priority_projects?: Array<{
      id: string;
      status?: string;
      score?: number;
      next_action?: string;
      primary_gap?: string;
    }>;
    weakest_dimensions?: Array<{
      id: string;
      title?: string;
      score?: number;
    }>;
  };
  usage_paths?: Array<{
    id: string;
    title?: string;
    intent?: string;
    pages?: Array<{ id?: string; title?: string }>;
    steps?: string[];
  }>;
  playbooks?: Array<{
    id: string;
    label: string;
    target: { tab: string; [key: string]: unknown };
  }>;
  feature_domains?: Array<{
    id: string;
    label: string;
    pages: string[];
  }>;
  summary?: {
    total_pages?: number;
    ready_pages?: number;
    watch_pages?: number;
    gap_pages?: number;
  };
}

export interface DraftTaskSummary {
  id: string;
  title: string;
  detail?: string;
  badge?: string;
  target?: { tab: string; [key: string]: unknown };
  source?: { type?: string };
}

export interface DraftTasksResponse {
  items: DraftTaskSummary[];
}

// ── Default values ──

const EMPTY_HEALTH_SUMMARY: HealthSummary = {
  health_score: 0,
  health_score_change: 0,
  active_services: 0,
  total_services: 0,
  active_tasks: 0,
  today_requests: 0,
  today_requests_change: 0,
  data_quality: 'unavailable',
  degraded_reasons: [],
};

const EMPTY_METRICS_TREND: MetricsTrend = {
  health_score: [],
  requests: [],
  error_rate: [],
  data_quality: 'unavailable',
  degraded_reasons: [],
};

// ── Hooks ──

export function useHealthSummary() {
  return useQuery({
    queryKey: ['health-summary'],
    queryFn: async () => {
      const response = await apiFetch<HealthSummary>('/api/health/summary');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch health summary');
      }
      return response.data || EMPTY_HEALTH_SUMMARY;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

export function useRecentAlerts() {
  return useQuery({
    queryKey: ['recent-alerts'],
    queryFn: async () => {
      const response = await apiFetch<AlertListResponse>('/api/alerts?limit=3&status=active');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch alerts');
      }
      return response.data?.items || [];
    },
    staleTime: 15000,
    refetchInterval: 15000,
    retry: 3,
  });
}

export function useRecentTasks() {
  return useQuery({
    queryKey: ['recent-tasks'],
    queryFn: async () => {
      const response = await apiFetch<TaskListResponse>('/api/tasks?limit=3&sort=updated');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch tasks');
      }
      return response.data?.items || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

export function useMetricsTrend(range: string = '7d') {
  return useQuery({
    queryKey: ['metrics-trend', range],
    queryFn: async () => {
      const response = await apiFetch<MetricsTrend>(`/api/metrics/trend?range=${range}`);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch metrics');
      }
      return response.data || EMPTY_METRICS_TREND;
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 3,
  });
}

export function useThoughts() {
  return useQuery({
    queryKey: ['thoughts'],
    queryFn: async () => {
      const response = await apiFetch<ThoughtsResponse>('/api/omos/thoughts');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch thoughts');
      }
      return response.data?.status === 'ok' ? response.data.thoughts || [] : [];
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 3,
  });
}

export function useHomeSystemMap() {
  return useQuery({
    queryKey: ['home-system-map'],
    queryFn: async () => {
      const response = await apiFetch<HomeSystemMap>('/api/cockpit/system-map');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch system map');
      }
      return response.data || {};
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

export function useDraftTasks() {
  return useQuery({
    queryKey: ['draft-tasks'],
    queryFn: async () => {
      const response = await apiFetch<DraftTasksResponse>('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&limit=10');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch draft tasks');
      }
      return response.data?.items || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

// ── Combined hook ──

export interface HomePageData {
  healthSummary: HealthSummary;
  alerts: Alert[];
  tasks: Task[];
  metricsTrend: MetricsTrend;
  thoughts: Thought[];
  systemMap: HomeSystemMap;
  draftTasks: DraftTaskSummary[];
  isLoading: boolean;
  error: string | null;
  failedSources: string[];
}

/**
 * Combined hook for all HomePage data.
 * 
 * This replaces the parallel fetch pattern in HomePage.
 * Each query is independent and can fail without affecting others.
 */
export function useHomePageData(metricsRange: string = '7d'): HomePageData {
  const healthQuery = useHealthSummary();
  const alertsQuery = useRecentAlerts();
  const tasksQuery = useRecentTasks();
  const metricsQuery = useMetricsTrend(metricsRange);
  const thoughtsQuery = useThoughts();
  const systemMapQuery = useHomeSystemMap();
  const draftTasksQuery = useDraftTasks();

  const isLoading = healthQuery.isLoading || alertsQuery.isLoading || tasksQuery.isLoading;
  
  const failedSources: string[] = [];
  if (healthQuery.error) failedSources.push('健康摘要');
  if (alertsQuery.error) failedSources.push('告警');
  if (tasksQuery.error) failedSources.push('任务');
  if (metricsQuery.error) failedSources.push('指标');
  if (thoughtsQuery.error) failedSources.push('洞察');
  if (systemMapQuery.error) failedSources.push('系统地图');
  if (draftTasksQuery.error) failedSources.push('任务草稿');

  const error = failedSources.length > 0 
    ? `首页数据暂不可用：部分接口${failedSources.join('、')}失败`
    : null;

  return {
    healthSummary: healthQuery.data || EMPTY_HEALTH_SUMMARY,
    alerts: alertsQuery.data || [],
    tasks: tasksQuery.data || [],
    metricsTrend: metricsQuery.data || EMPTY_METRICS_TREND,
    thoughts: thoughtsQuery.data || [],
    systemMap: systemMapQuery.data || {},
    draftTasks: draftTasksQuery.data || [],
    isLoading,
    error,
    failedSources,
  };
}
