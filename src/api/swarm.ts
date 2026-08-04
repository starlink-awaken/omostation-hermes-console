/**
 * Swarm Observatory API client.
 *
 * 消费 cockpit 后端 /api/swarm/* (D2 SwarmDashboard 后端, cockpit PR #30).
 * 复用 apiFetch (DRY, 同 WorkflowsView 模式), 不重造独立 fetch adapter.
 *
 * 显式降级哲学: fetchSwarmStatus 失败返回 null (不抛), 由调用方 (useQuery) 处理.
 * 后端本身也降级 (data_quality: complete/partial/unavailable), 不伪造满分.
 *
 * 后端源: projects/cockpit/src/cockpit/web/api_swarm.py
 */

import { apiFetch } from './client';

// ── Types (镜像后端 api_swarm.py 返回结构) ──

export interface SwarmWorkflow {
  active_runs: string[];
  active_count: number;
  run_count: number;
  lock_count: number;
  stale_locks: number;
  current_run_id: string | null;
}

export interface SwarmWindow {
  verdict: string | null;
  elapsed_hours: number | null;
  conflict_count: number | null;
  started: string | null;
}

export interface SwarmClaimsSummary {
  active_count: number;
  sessions: string[];
}

export interface SwarmCompliance {
  ok: boolean | null;
  decision: string | null;
  slo: Record<string, unknown>;
}

export type SwarmDataQuality = 'complete' | 'partial' | 'unavailable';

export interface SwarmStatus {
  workflow: SwarmWorkflow;
  window: SwarmWindow;
  claims: SwarmClaimsSummary;
  compliance: SwarmCompliance;
  claim_coverage: Record<string, unknown>;
  recommended_next: string | null;
  data_quality: SwarmDataQuality;
  degraded_reasons: string[];
}

export interface BranchClaim {
  session?: string;
  branch?: string;
  _source?: string;
  [key: string]: unknown;
}

export interface SwarmClaimsResponse {
  active_count: number;
  claims: BranchClaim[];
}

// ── Fetchers (apiFetch 包装, 失败返回 null 不抛 — 显式降级) ──

export async function fetchSwarmStatus(): Promise<SwarmStatus | null> {
  const res = await apiFetch<SwarmStatus>('/api/swarm/status');
  return res.ok ? res.data : null;
}

export async function fetchSwarmClaims(): Promise<SwarmClaimsResponse | null> {
  const res = await apiFetch<SwarmClaimsResponse>('/api/swarm/claims');
  return res.ok ? res.data : null;
}
