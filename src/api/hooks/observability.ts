/**
 * React Query hooks for cockpit-ui — observability domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: alerts, compute status/models/fabric, logs, sandbox, triage, engine.
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { API_ENDPOINTS } from './endpoints';

// ── Alerts ──

export interface AlertData {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  created_at: string;
  updated_at: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertListResponse {
  items: AlertData[];
  total?: number;
}

export function useAlerts(limit?: number) {
  return useQuery({
    queryKey: ['alerts', limit],
    queryFn: () => apiFetch<AlertListResponse>(API_ENDPOINTS.alerts.listAlerts(limit)),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export interface AlertRuleData {
  id: string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  created_at: string;
}

export function useAlertRules() {
  return useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => apiFetch<AlertRuleData[]>(API_ENDPOINTS.alerts.listAlertRules),
    staleTime: 60000,
  });
}

// ── Compute Status ──

export interface ComputeStatusData {
  nodes: Array<{
    id: string;
    name: string;
    status: string;
    cpu_usage?: number;
    memory_usage?: number;
    gpu_usage?: number;
  }>;
  summary: {
    total_nodes: number;
    active_nodes: number;
    total_cpu?: number;
    total_memory?: number;
  };
}

export function useComputeStatus() {
  return useQuery({
    queryKey: ['compute-status'],
    queryFn: () => apiFetch<ComputeStatusData>(API_ENDPOINTS.compute.getStatus),
    staleTime: 30000,
  });
}

// ── Logs ──

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface LogListResponse {
  items: LogEntry[];
  total?: number;
}

export function useLogs(limit?: number) {
  return useQuery({
    queryKey: ['logs', limit],
    queryFn: () => apiFetch<LogListResponse>(API_ENDPOINTS.logs.listLogs(limit)),
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

// ── Sandbox ──

export function useSandboxQueue() {
  return useQuery({
    queryKey: ['sandbox-queue'],
    queryFn: () => apiFetch<Array<{ id: string; command: string; status: string }>>(API_ENDPOINTS.sandbox.getQueue),
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

// ── Compute Models ──

export interface ComputeModelData {
  model_name: string;
  status: string;
  provider?: string;
  latency_p50?: number | null;
  calls_today?: number;
}

export function useComputeModels() {
  return useQuery({
    queryKey: ['compute-models'],
    queryFn: () => apiFetch<ComputeModelData[]>(API_ENDPOINTS.compute.getModels),
    staleTime: 30000,
  });
}

// ── Compute Fabric ──

export interface ComputeFabricNode {
  id: string;
  name: string;
  status: string;
  type?: string;
  cpu_usage?: number;
  gpu_usage?: number;
}

export interface ComputeFabricWorkload {
  id: string;
  name: string;
  status: string;
  node_id?: string;
  progress?: number;
}

export interface ComputeFabricOverview {
  nodes?: ComputeFabricNode[];
  workloads?: ComputeFabricWorkload[];
  summary?: {
    total_nodes?: number;
    active_nodes?: number;
    total_workloads?: number;
    running_workloads?: number;
  };
}

export function useComputeFabric() {
  return useQuery({
    queryKey: ['compute-fabric-overview'],
    queryFn: () => apiFetch<ComputeFabricOverview>(API_ENDPOINTS.computeFabric.getOverview),
    staleTime: 30000,
  });
}

// ── Compute Extended ──

export function useComputeQueue() {
  return useQuery({
    queryKey: ['compute-queue'],
    queryFn: () => apiFetch<Array<{ id: string; status: string }>>(API_ENDPOINTS.computeExtended.getQueue),
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

// ── Triage ──

export function useTriageQueue() {
  return useQuery({
    queryKey: ['triage-queue'],
    queryFn: () => apiFetch<Array<{ id: string; type: string; status: string }>>(API_ENDPOINTS.triage.getQueue),
    staleTime: 10000,
    refetchInterval: 10000,
  });
}

// ── Engine ──

export function useEngineQueue() {
  return useQuery({
    queryKey: ['engine-queue'],
    queryFn: () => apiFetch<Array<{ id: string; status: string }>>(API_ENDPOINTS.engine.getQueue),
    staleTime: 10000,
    refetchInterval: 10000,
  });
}
