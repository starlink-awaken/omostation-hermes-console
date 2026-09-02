/**
 * React Query hooks for ComputeView.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import type { ComputeStatus, GenerateResult } from './computeViewTypes';

export function useComputeStatus() {
  return useQuery({
    queryKey: ['compute-status'],
    queryFn: async () => {
      const response = await apiFetch<ComputeStatus>('/api/compute/status');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch compute status');
      }
      return response.data;
    },
    staleTime: 6000,
    refetchInterval: 6000,
    retry: 3,
  });
}

export function useGenerateCode() {
  return useMutation({
    mutationFn: async ({ prompt, model }: { prompt: string; model: string }) => {
      const response = await apiPost<GenerateResult>('/api/governance/compute/generate', {
        prompt,
        model: model || 'coder',
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to generate code');
      }
      return response.data;
    },
  });
}

export function useToggleCircuitBreaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (broken: boolean) => {
      const response = await apiPost('/api/omos/circuit-break', { broken });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to toggle circuit breaker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compute-status'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budget: number) => {
      const response = await apiPost('/api/omos/budget', { budget });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update budget');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compute-status'] });
    },
  });
}
