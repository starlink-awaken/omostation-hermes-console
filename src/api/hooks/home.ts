/**
 * Home Page Hooks — 首页数据层
 *
 * 统一首页 6 个 section 的数据获取，避免直接调用 apiFetch。
 */
import { useQuery } from '@tanstack/react-query';
import { apiFetch, API_ENDPOINTS as ENDPOINTS } from '../index';

export const useHealthSummary = () =>
  useQuery({
    queryKey: ['home', 'health'],
    queryFn: () => apiFetch(ENDPOINTS.HEALTH),
    staleTime: 30_000,
  });

export const useAlertFeed = () =>
  useQuery({
    queryKey: ['home', 'alerts'],
    queryFn: () => apiFetch(ENDPOINTS.ALERTS),
    staleTime: 30_000,
  });

export const useMetricsTrend = () =>
  useQuery({
    queryKey: ['home', 'metrics'],
    queryFn: () => apiFetch(ENDPOINTS.METRICS),
    staleTime: 60_000,
  });

export const useRecentTasks = () =>
  useQuery({
    queryKey: ['home', 'tasks'],
    queryFn: () => apiFetch(ENDPOINTS.TASKS_RECENT),
    staleTime: 30_000,
  });

export const useGovernanceOverview = () =>
  useQuery({
    queryKey: ['home', 'governance'],
    queryFn: () => apiFetch(ENDPOINTS.GOVERNANCE_OVERVIEW),
    staleTime: 60_000,
  });

export const useHomeFocus = () =>
  useQuery({
    queryKey: ['home', 'focus'],
    queryFn: () => apiFetch(ENDPOINTS.HOME_FOCUS),
    staleTime: 30_000,
  });
