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

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

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
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  updated_at: string;
}

export interface DataPoint {
  timestamp: string;
  value: number;
}

export interface MetricsTrend {
  health_score: DataPoint[];
  requests: DataPoint[];
  error_rate: DataPoint[];
  data_quality?: string;
  degraded_reasons?: string[];
}

export interface Thought {
  id: string;
  content: string;
  source?: string;
  timestamp?: string;
}

export interface DraftTaskSummary {
  id: string;
  title: string;
  detail?: string;
  badge?: string;
  priority?: string;
  read_only?: boolean;
  target?: { tab: string; [key: string]: unknown };
  source?: { type?: string };
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
      status?: string;
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
      status?: string;
      score?: number;
      failed?: number;
      warning?: number;
      description?: string;
      attention_projects?: Array<{
        id: string;
        next_action?: string;
      }>;
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
    projects?: number;
    cockpit_pages?: number;
    feature_domains?: number;
    usage_paths?: number;
    playbooks?: number;
    roadmap_items?: number;
    project_coverage_score?: number;
    page_maturity_score?: number;
    domain_app_score?: number;
    page_maturity_ready?: number;
    page_maturity_watch?: number;
    blocked_projects?: number;
    projects_needing_action?: number;
  };
  project_focus?: {
    summary?: {
      runtime_gap?: number;
      verification_gap?: number;
      verification_ready?: number;
      ready_and_running?: number;
    };
  };
  project_capability_coverage?: {
    summary?: {
      warning_cells?: number;
      failed_cells?: number;
    };
  };
  domain_apps?: {
    summary?: {
      running?: number;
      external_mounts?: number;
      high_risk?: number;
    };
    attention_items?: Array<{
      id: string;
      name?: string;
      runtime_status?: string;
      risk_level?: string;
      security_posture?: string;
      next_action?: string;
    }>;
  };
  roadmap?: {
    items?: Array<{
      cockpit_page?: string;
      status?: string;
    }>;
    lanes?: Array<{
      id: string;
      title: string;
      items?: Array<{
        id: string;
        [key: string]: unknown;
      }>;
    }>;
  };
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

// ── API fetcher ──

async function fetchHomeData<T>(url: string, fallback: T): Promise<{ ok: boolean; data: T; error?: string }> {
  const response = await apiFetch<T>(url);
  return {
    ok: response.ok,
    data: response.data || fallback,
    error: response.error || undefined,
  };
}

// ── Hooks ──

export function useHomePageData(metricsRange: string = '24h') {
  // Health summary
  const healthQuery = useQuery({
    queryKey: ['home-health-summary'],
    queryFn: () => fetchHomeData('/api/health/summary', EMPTY_HEALTH_SUMMARY),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Alerts
  const alertsQuery = useQuery({
    queryKey: ['home-alerts'],
    queryFn: () => fetchHomeData('/api/alerts?limit=3&status=active', { items: [] as Alert[] }),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  // Tasks
  const tasksQuery = useQuery({
    queryKey: ['home-tasks'],
    queryFn: () => fetchHomeData('/api/tasks?limit=3&sort=updated', { items: [] as Task[] }),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Metrics trend
  const metricsQuery = useQuery({
    queryKey: ['home-metrics', metricsRange],
    queryFn: () => fetchHomeData(`/api/metrics/trend?range=${metricsRange}`, EMPTY_METRICS_TREND),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // Thoughts
  const thoughtsQuery = useQuery({
    queryKey: ['home-thoughts'],
    queryFn: () => fetchHomeData('/api/omos/thoughts', { status: 'unavailable', thoughts: [] as Thought[] }),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // System map
  const systemMapQuery = useQuery({
    queryKey: ['home-system-map'],
    queryFn: () => fetchHomeData('/api/cockpit/system-map', {} as HomeSystemMap),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Draft tasks
  const draftTasksQuery = useQuery({
    queryKey: ['home-draft-tasks'],
    queryFn: () => fetchHomeData('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&limit=10', { items: [] as DraftTaskSummary[] }),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  // Compute failed sources
  const failedSources = useMemo(() => {
    const sources: string[] = [];
    if (healthQuery.error) sources.push('健康摘要');
    if (alertsQuery.error) sources.push('告警');
    if (tasksQuery.error) sources.push('任务');
    if (metricsQuery.error) sources.push('指标');
    if (thoughtsQuery.error) sources.push('洞察');
    if (systemMapQuery.error) sources.push('系统地图');
    if (draftTasksQuery.error) sources.push('任务草稿');
    return sources;
  }, [healthQuery.error, alertsQuery.error, tasksQuery.error, metricsQuery.error, thoughtsQuery.error, systemMapQuery.error, draftTasksQuery.error]);

  const homeError = failedSources.length > 0
    ? `首页数据暂不可用：部分接口${failedSources.join('、')}失败`
    : null;

  // Extract data
  const healthSummary = healthQuery.data?.data || EMPTY_HEALTH_SUMMARY;
  const alerts = alertsQuery.data?.data?.items || [];
  const tasks = tasksQuery.data?.data?.items || [];
  const metricsTrend = metricsQuery.data?.data || EMPTY_METRICS_TREND;
  const thoughts = thoughtsQuery.data?.data?.status === 'ok' ? thoughtsQuery.data.data.thoughts || [] : [];
  const systemMap = systemMapQuery.data?.data || {} as HomeSystemMap;
  const draftTasks = draftTasksQuery.data?.data?.items || [];

  // Process system map data
  const cockpitPages = systemMap.cockpit_pages || [];
  const featureDomains = systemMap.feature_domains || [];
  const roadmapItems = systemMap.roadmap?.items || [];
  const readOnlyDrafts = draftTasks.filter((item) => item.read_only);
  const portfolio = systemMap.project_portfolio || {};
  const summary = portfolio.summary || {};
  const systemSummary = systemMap.summary || {};

  return {
    // Raw data
    healthSummary,
    alerts,
    tasks,
    metricsTrend,
    thoughts,
    systemMap,
    draftTasks,
    readOnlyDrafts,
    
    // Processed data
    cockpitPages,
    featureDomains,
    roadmapItems,
    portfolio,
    summary,
    systemSummary,
    
    // State
    isLoading: healthQuery.isLoading || alertsQuery.isLoading || tasksQuery.isLoading,
    homeError,
    failedSources,
    
    // Query objects for advanced usage
    healthQuery,
    alertsQuery,
    tasksQuery,
    metricsQuery,
    thoughtsQuery,
    systemMapQuery,
    draftTasksQuery,
  };
}
