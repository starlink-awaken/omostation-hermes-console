/**
 * React Query hooks for cockpit-ui — governance domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: debt, L4 health, L4 extended, proposals, wave2, cards, OMOs.
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { API_ENDPOINTS } from './endpoints';

// ── Debt ──

export interface DebtData {
  total_debt: number;
  categories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  trends: Array<{
    date: string;
    amount: number;
  }>;
}

export function useDebt() {
  return useQuery({
    queryKey: ['debt'],
    queryFn: () => apiFetch<DebtData>(API_ENDPOINTS.debt.getDebt),
    staleTime: 60000,
  });
}

// ── L4 Health ──

export interface L4HealthData {
  overall_score: number;
  domains: Array<{
    id: string;
    name: string;
    score: number;
    status: string;
    issues?: Array<{
      id: string;
      severity: string;
      description: string;
    }>;
  }>;
  trends: Array<{
    date: string;
    score: number;
  }>;
}

export function useL4Health() {
  return useQuery({
    queryKey: ['l4-health'],
    queryFn: () => apiFetch<L4HealthData>(API_ENDPOINTS.l4Health.getHealth),
    staleTime: 30000,
  });
}

// ── Proposals ──

export interface ProposalData {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  author?: string;
  votes?: {
    up: number;
    down: number;
  };
}

export function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: () => apiFetch<ProposalData[]>(API_ENDPOINTS.proposals.listProposals),
    staleTime: 60000,
  });
}

// ── L4 Extended ──

export function useL4Trend() {
  return useQuery({
    queryKey: ['l4-trend'],
    queryFn: () => apiFetch<Array<{ date: string; score: number }>>(API_ENDPOINTS.l4Extended.getTrend),
    staleTime: 60000,
  });
}

export function useL4Signals() {
  return useQuery({
    queryKey: ['l4-signals'],
    queryFn: () => apiFetch<Array<{ type: string; message: string; severity: string }>>(API_ENDPOINTS.l4Extended.getSignals),
    staleTime: 30000,
  });
}

// ── Wave2 ──

export interface Wave2Dashboard {
  schema?: string;
  status?: string;
  cards?: {
    pitch_count?: number;
    mean_success?: number;
    trend?: string;
    critical?: number;
    elevated?: number;
    proposal_count?: number;
    p0_proposals?: number;
  };
  heatmap?: {
    statuses?: string[];
    buckets?: string[];
    matrix?: Record<string, Record<string, number>>;
    totals?: { pitches?: number; critical?: number; elevated?: number; ok?: number };
  };
  heatmap_markdown?: string;
  proposals?: Array<{
    id?: string;
    kind?: string;
    priority?: string;
    title?: string;
    rationale?: string;
    suggested_omo_action?: string;
    task_query?: string;
    handoff?: { tab?: string; taskQuery?: string; proposal_id?: string };
    suggested_task?: { title?: string; priority?: string };
  }>;
  forecast?: { trend?: string; n?: number; mean?: number; forecast?: Array<{ predicted?: number; horizon?: number }> };
  auto_mutate_rules?: boolean;
  error?: string;
  data_dir?: string;
  source?: string;
}

export function useWave2Dashboard() {
  return useQuery({
    queryKey: ['wave2-dashboard'],
    queryFn: async () => {
      const res = await apiFetch<Wave2Dashboard>(API_ENDPOINTS.wave2.getDashboard);
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load Wave2 dashboard');
      }
      return res.data;
    },
    staleTime: 60000,
  });
}

// ── Cards ──

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: () => apiFetch<Array<{ id: string; title: string; status: string }>>(API_ENDPOINTS.cards.listCards),
    staleTime: 30000,
  });
}

// ── OMOs ──

export function useOmoStatus() {
  return useQuery({
    queryKey: ['omo-status'],
    queryFn: () => apiFetch<Record<string, unknown>>(API_ENDPOINTS.omos.getStatus),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export function useOmoViolations() {
  return useQuery({
    queryKey: ['omo-violations'],
    queryFn: () => apiFetch<Array<{ id: string; rule: string; severity: string }>>(API_ENDPOINTS.omos.getViolations),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}
