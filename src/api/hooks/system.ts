/**
 * React Query hooks for cockpit-ui — system domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: system map, system health, services, version, instance, arch health, aliases.
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { API_ENDPOINTS } from './endpoints';

// ── System Map ──

export interface SystemMapData {
  cockpit_pages: Array<{
    id: string;
    title: string;
    group: string;
    purpose?: string;
    dimensions?: string[];
  }>;
  page_maturity?: {
    summary: {
      total: number;
      ready: number;
      watch: number;
      gap: number;
      score: number;
    };
    items: Array<{
      page_id: string;
      page?: { id?: string; title?: string };
      status: string;
      score: number;
      next_action?: string;
    }>;
  };
  project_portfolio?: {
    summary: {
      score?: number;
      blocked?: number;
      at_risk?: number;
      watch?: number;
      healthy?: number;
    };
    priority_projects: Array<{
      id: string;
      status?: string;
      score?: number;
      next_action?: string;
      primary_gap?: string;
    }>;
    weakest_dimensions: Array<{
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
    target?: { tab: string; [key: string]: unknown };
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
  roadmap?: {
    items: Array<{
      id: string;
      label: string;
      status: string;
    }>;
    lanes: Array<{
      id: string;
      label: string;
      items: Array<{
        id: string;
        label: string;
        status: string;
      }>;
    }>;
  };
  gaps?: Array<{
    id: string;
    label: string;
    severity: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    status?: string;
    score?: number;
  }>;
}

export function useSystemMap() {
  return useQuery({
    queryKey: ['system-map'],
    queryFn: () => apiFetch<SystemMapData>(API_ENDPOINTS.systemMap.getSystemMap),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

// ── System Health ──

export interface SystemHealthData {
  status: string;
  uptime: number;
  version: string;
  services: Array<{
    name: string;
    status: string;
    latency?: number;
  }>;
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiFetch<SystemHealthData>(API_ENDPOINTS.systemHealth.getHealth),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

// ── Services ──

export interface ServiceData {
  name: string;
  status: string;
  port?: number;
  health?: string;
  latency?: number;
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => apiFetch<ServiceData[]>(API_ENDPOINTS.services.listServices),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useServiceStatus() {
  return useQuery({
    queryKey: ['service-status'],
    queryFn: () => apiFetch<Record<string, unknown>>(API_ENDPOINTS.services.getServiceStatus),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

// ── Version ──

export interface VersionData {
  version: string;
  build?: string;
  commit?: string;
}

export function useVersion() {
  return useQuery({
    queryKey: ['version'],
    queryFn: () => apiFetch<VersionData>(API_ENDPOINTS.version.getVersion),
    staleTime: 300000, // 5 minutes — version rarely changes
  });
}

// ── Instance ──

export interface InstanceData {
  id: string;
  hostname?: string;
  uptime?: number;
  started_at?: string;
}

export function useInstance() {
  return useQuery({
    queryKey: ['instance'],
    queryFn: () => apiFetch<InstanceData>(API_ENDPOINTS.instance.getInstance),
    staleTime: 60000,
  });
}

// ── Arch Health ──

export function useArchHealth() {
  return useQuery({
    queryKey: ['arch-health'],
    queryFn: () => apiFetch<Record<string, unknown>>(API_ENDPOINTS.archHealth.getHealth),
    staleTime: 60000,
  });
}

// ── Aliases (naming compatibility) ──

import { useOmoStatus, useOmoViolations } from './governance';

/** Alias for useOmoStatus — matches /api/omos/status */
export function useOmosStatus() {
  return useOmoStatus();
}

/** Alias for useOmoViolations — matches /api/omos/violations */
export function useOmosViolations() {
  return useOmoViolations();
}

/** Alias for useServiceStatus — matches /api/services/status */
export function useServicesStatus() {
  return useServiceStatus();
}
