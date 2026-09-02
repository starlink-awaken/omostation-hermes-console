/**
 * TaskCenterPage 自定义 hooks.
 *
 * 从 TaskCenterPage.tsx 提取:
 *   - useTasks — 任务列表查询
 *   - useUpdateTaskStatus — 状态更新
 *   - useCancelTask — 取消任务
 *   - useRequestTaskWorkflow — 请求 Workflow Mesh
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import type { Task, TaskListResponse } from './taskCenterTypes';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await apiFetch<TaskListResponse>('/api/tasks');
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

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await apiPost(`/api/tasks/${taskId}/status`, { status });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update task status');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCancelTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiPost(`/api/tasks/${taskId}/cancel`, {});
      if (!response.ok) {
        throw new Error(response.error || 'Failed to cancel task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRequestTaskWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, workflowName, evidencePlan, sceneBinding }: {
      taskId: string;
      workflowName: string;
      evidencePlan: string[];
      sceneBinding: NonNullable<Task['scene_binding']>;
    }) => {
      const response = await apiPost<{
        workflow_run_id?: string;
        request_state?: string;
        external_side_effects?: string;
        worker_launch?: boolean;
      }>(`/api/tasks/${encodeURIComponent(taskId)}/request-workflow`, {
        workflow_name: workflowName,
        workflow_version: 'v1',
        scene_binding: sceneBinding,
        evidence_plan: evidencePlan,
        actor_ref: 'cockpit-ui://task-center',
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to request Workflow Mesh');
      }
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
