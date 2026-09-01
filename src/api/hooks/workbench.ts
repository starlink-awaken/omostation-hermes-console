/**
 * React Query hooks for cockpit-ui — workbench domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: BOS services, BOS extended, GBrain agents, quests.
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { API_ENDPOINTS } from '../endpoints';

// ── BOS Services ──

export interface BosServiceData {
  uri: string;
  transport: string;
  status: string;
  description?: string;
  package?: string;
}

export function useBosServices() {
  return useQuery({
    queryKey: ['bos-services'],
    queryFn: () => apiFetch<BosServiceData[]>(API_ENDPOINTS.bos.listServices),
    staleTime: 60000,
  });
}

// ── GBrain Agents ──

export interface GBrainAgentData {
  id: string;
  name: string;
  description?: string;
  status: string;
  model?: string;
  created_at: string;
}

export function useGBrainAgents() {
  return useQuery({
    queryKey: ['gbrain-agents'],
    queryFn: () => apiFetch<GBrainAgentData[]>(API_ENDPOINTS.gbrain.listAgents),
    staleTime: 60000,
  });
}

// ── Quests ──

export interface QuestData {
  id: string;
  title: string;
  description: string;
  status: string;
  points: number;
  created_at: string;
  deadline?: string;
}

export function useQuests() {
  return useQuery({
    queryKey: ['quests'],
    queryFn: () => apiFetch<QuestData[]>(API_ENDPOINTS.quests.listQuests),
    staleTime: 60000,
  });
}

// ── BOS Extended ──

export interface BosHealthData {
  status: string;
  services: Array<{
    uri: string;
    status: string;
    latency?: number;
  }>;
}

export function useBosHealth() {
  return useQuery({
    queryKey: ['bos-health'],
    queryFn: () => apiFetch<BosHealthData>(API_ENDPOINTS.bosExtended.getHealth),
    staleTime: 30000,
  });
}

export function useBosMetrics() {
  return useQuery({
    queryKey: ['bos-metrics'],
    queryFn: () => apiFetch<Record<string, unknown>>(API_ENDPOINTS.bosExtended.getMetrics),
    staleTime: 30000,
  });
}
