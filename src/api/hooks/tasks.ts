/**
 * React Query hooks for cockpit-ui — tasks domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: tasks, domain apps, task mutations (create/update/delete).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost, apiPut, apiDelete } from '../client';
import { API_ENDPOINTS } from '../endpoints';

// ── Tasks ──

export interface TaskData {
  id: string;
  title: string;
  detail?: string;
  badge?: string;
  target: { tab: string; [key: string]: unknown };
  source?: { type?: string };
  status?: string;
  read_only?: boolean;
}

export interface TaskListResponse {
  items: TaskData[];
  total?: number;
}

export function useTasks(params?: {
  include_playbook_drafts?: boolean;
  include_project_portfolio_drafts?: boolean;
  include_verification_ready_drafts?: boolean;
  include_domain_app_drafts?: boolean;
  include_capability_gap_drafts?: boolean;
  include_page_maturity_drafts?: boolean;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => apiFetch<TaskListResponse>(API_ENDPOINTS.tasks.listTasks(params)),
    staleTime: 30000,
  });
}

// ── Domain Apps ──

export interface DomainAppData {
  id: string;
  name: string;
  url: string;
  domain?: {
    id: string;
    name: string;
  };
}

export interface DomainAppListResponse {
  apps: DomainAppData[];
}

export function useDomainApps() {
  return useQuery({
    queryKey: ['domain-apps'],
    queryFn: () => apiFetch<DomainAppListResponse>(API_ENDPOINTS.domainApps.listDomainApps),
    staleTime: 60000, // 1 minute
  });
}

// ── Mutations ──

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      apiPut(API_ENDPOINTS.tasks.updateTaskStatus(taskId), { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (task: Omit<TaskData, 'id'>) =>
      apiPost(API_ENDPOINTS.tasks.createTask, task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) =>
      apiDelete(API_ENDPOINTS.tasks.getTask(taskId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
