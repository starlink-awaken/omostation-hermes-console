/**
 * React Query hooks for cockpit-ui.
 * 
 * These hooks provide:
 * - Automatic caching
 * - Request deduplication
 * - Background refetching
 * - Loading/error states
 * - Request cancellation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost, apiPut, apiDelete } from './client';
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
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

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
    staleTime: 15000, // 15 seconds
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
    staleTime: 10000, // 10 seconds
    refetchInterval: 10000,
  });
}

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

// ── KOS Search ──

export interface KosSearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface KosSearchResponse {
  results: KosSearchResult[];
  total?: number;
}

export function useKosSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ['kos-search', query, limit],
    queryFn: () => apiFetch<KosSearchResponse>(API_ENDPOINTS.kos.search(query, limit)),
    enabled: query.length >= 2, // Only search when query is at least 2 characters
    staleTime: 30000,
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

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (rule: Omit<AlertRuleData, 'id' | 'created_at'>) =>
      apiPost(API_ENDPOINTS.alerts.createAlertRule, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}
