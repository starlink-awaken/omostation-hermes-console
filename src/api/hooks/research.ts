/**
 * React Query hooks for cockpit-ui — research domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: research, workflows, ecos skills, pipelines.
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { API_ENDPOINTS } from '../endpoints';

// ── Research ──

export interface ResearchItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface ResearchListResponse {
  items: ResearchItem[];
  total?: number;
}

export function useResearch(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['research', params],
    queryFn: () => apiFetch<ResearchListResponse>(API_ENDPOINTS.research.listResearch(params)),
    staleTime: 60000,
  });
}

// ── Workflows ──

export interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  steps?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export interface WorkflowListResponse {
  items: WorkflowData[];
  total?: number;
}

export function useWorkflows(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['workflows', params],
    queryFn: () => apiFetch<WorkflowListResponse>(API_ENDPOINTS.workflows.listWorkflows(params)),
    staleTime: 30000,
  });
}

// ── Ecos Skills ──

export interface EcosSkillData {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: string;
}

export function useEcosSkills() {
  return useQuery({
    queryKey: ['ecos-skills'],
    queryFn: () => apiFetch<EcosSkillData[]>(API_ENDPOINTS.ecos.listSkills),
    staleTime: 60000,
  });
}

// ── Pipelines ──

export interface PipelineData {
  id: string;
  name: string;
  description?: string;
  status: string;
  stages?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () => apiFetch<PipelineData[]>(API_ENDPOINTS.pipelines.listPipelines),
    staleTime: 60000,
  });
}
