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

// ── Knowledge to action ──

export interface KnowledgeActionRef {
  ref: string;
  title?: string;
  source_type?: string;
  rank?: number;
}

export type KnowledgeActionKind =
  | 'retrieved'
  | 'cited'
  | 'task_created'
  | 'workflow_requested'
  | 'result_feedback_recorded';

export interface KnowledgeActionInput {
  action_kind: KnowledgeActionKind;
  query?: string;
  query_digest?: string;
  knowledge_refs: KnowledgeActionRef[];
  scene_binding?: {
    scene_id: string;
    journey_id: string;
    outcome_metric: string;
  };
  task_ref?: string;
  workflow_run_id?: string;
  outcome_id?: string;
  result_feedback_id?: string;
  observed_at?: string;
  actor_ref?: string;
}

export interface KnowledgeActionRecord extends Omit<KnowledgeActionInput, 'scene_binding'> {
  schema: 'knowledge-action/v1';
  action_id: string;
  idempotency_key: string;
  query_digest: string;
  scene_binding: KnowledgeActionInput['scene_binding'] | null;
  task_ref: string;
  workflow_run_id: string;
  outcome_id: string;
  result_feedback_id: string;
  observed_at: string;
  recorded_at: string;
  actor: string;
}

export interface KnowledgeActionOperations {
  schema_version: 'knowledge-action-operations/v1';
  status: 'live' | 'unavailable';
  summary: {
    action_count: number;
    query_count: number;
    task_count: number;
    by_kind: Record<string, number>;
    unique_source_count: number;
  };
  funnel: Record<KnowledgeActionKind, number>;
  top_sources: Array<{ ref: string; use_count: number }>;
  next_action: string;
  recent_actions: KnowledgeActionRecord[];
  [key: string]: unknown;
}

export interface KnowledgeActionOperationsResponse {
  ok: boolean;
  status: 'live' | 'unavailable';
  operations: KnowledgeActionOperations;
}

export interface KnowledgeActionResponse {
  ok: boolean;
  status: 'recorded' | 'deduplicated' | 'invalid' | 'unavailable';
  action?: KnowledgeActionRecord;
  error?: string;
  message?: string;
}

export function useKnowledgeActionOperations(sceneId?: string) {
  return useQuery({
    queryKey: ['knowledge-action-operations', sceneId],
    queryFn: () => apiFetch<KnowledgeActionOperationsResponse>(API_ENDPOINTS.knowledgeAction.getOperations(sceneId)),
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useRecordKnowledgeAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KnowledgeActionInput) =>
      apiPost<KnowledgeActionResponse>(API_ENDPOINTS.knowledgeAction.recordReceipt, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['knowledge-action-operations'] });
    },
  });
}

export interface WorkflowRequestInput {
  workflow_name: string;
  workflow_version?: string;
  scene_binding: {
    scene_id: string;
    journey_id: string;
    outcome_metric: string;
  };
  evidence_plan: string[];
  operation_level?: string;
  actor_ref?: string;
}

export interface WorkflowRequestResponse {
  id: string;
  status: 'requested' | 'deduplicated';
  request_state: 'ready_for_admission' | 'approval_required';
  workflow_run_id: string;
  external_side_effects: 'disabled';
  worker_launch: false;
  [key: string]: unknown;
}

export function useRequestTaskWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: WorkflowRequestInput }) =>
      apiPost<WorkflowRequestResponse>(API_ENDPOINTS.tasks.requestWorkflow(taskId), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['knowledge-action-operations'] });
    },
  });
}

export interface WorkflowAdmissionInput {
  workflow_run_id: string;
  backend: string;
  required_capabilities: string[];
  capability_health: Record<string, unknown>;
  requested_budget?: number;
  remaining_budget?: number;
  scene_binding?: {
    scene_id: string;
    journey_id: string;
    outcome_metric: string;
  };
}

export interface WorkflowAdmissionResponse {
  id: string;
  status: 'eligible' | 'blocked' | 'admitted' | 'deduplicated';
  dispatch_state?: 'preview' | 'admitted';
  workflow_run_id: string;
  external_side_effects: 'disabled';
  worker_launch: false;
  blocker?: string;
  [key: string]: unknown;
}

export interface WorkflowCapabilityHealthResponse {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable' | 'invalid';
  source?: 'agora.workflow_health';
  observed_at?: string;
  required_capabilities?: string[];
  capability_health?: Record<string, unknown>;
  error?: string;
  message?: string;
  external_side_effects: 'disabled';
  worker_launch: false;
}

export function useWorkflowCapabilityHealth(requiredCapabilities: string[]) {
  const normalized = requiredCapabilities.map((item) => item.trim()).filter(Boolean);
  return useQuery({
    queryKey: ['workflow-capability-health', normalized],
    queryFn: async () => {
      const res = await apiFetch<WorkflowCapabilityHealthResponse>(
        API_ENDPOINTS.workflowMeshOperations.getCapabilityHealth(normalized),
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load capability health');
      }
      return res.data;
    },
    enabled: normalized.length > 0,
    staleTime: 5000,
    refetchInterval: 15000,
  });
}

export function usePreviewTaskWorkflowAdmission() {
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: WorkflowAdmissionInput }) =>
      apiPost<WorkflowAdmissionResponse>(API_ENDPOINTS.tasks.previewWorkflowAdmission(taskId), input),
  });
}

export function useAdmitTaskWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: WorkflowAdmissionInput }) =>
      apiPost<WorkflowAdmissionResponse>(API_ENDPOINTS.tasks.admitWorkflow(taskId), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-mesh-operations'] });
    },
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

// ── Sandbox ──

export function useSandboxQueue() {
  return useQuery({
    queryKey: ['sandbox-queue'],
    queryFn: () => apiFetch<Array<{ id: string; command: string; status: string }>>(API_ENDPOINTS.sandbox.getQueue),
    staleTime: 10000,
    refetchInterval: 10000,
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

// ── Delivery Journey ──

export interface DeliveryStage {
  name: string;
  status: 'verified' | 'running' | 'pending' | 'failed' | 'unavailable' | 'merged' | 'open';
  title: string;
  details: Record<string, unknown>;
  last_updated: string;
}

export interface DeliveryJourneyData {
  id: string;
  title: string;
  status: 'live' | 'stale' | 'failed' | 'unavailable';
  source: string[];
  freshness: number;
  last_updated: string;
  scene_binding?: {
    scene_id: string;
    journey_id: string;
    outcome_metric: string;
  };
  stages: Record<string, DeliveryStage>;
}

export interface DeliveryJourneyResponse {
  journey: DeliveryJourneyData;
}

export function useDeliveryJourney(fixture?: string) {
  return useQuery({
    queryKey: ['delivery-journey', fixture ?? 'LIVE'],
    queryFn: async () => {
      const res = await apiFetch<DeliveryJourneyResponse>(API_ENDPOINTS.deliveryJourney.getJourney(fixture));
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load delivery journey');
      }
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

// ── Workflow Mesh Operations ──

export type OutcomeConsumptionState = 'reviewed' | 'adopted' | 'submitted' | 'dispatched' | 'cited' | 'rejected';

export interface OutcomeSceneBinding {
  scene_id: string;
  journey_id: string;
  outcome_metric: string;
}

export interface OutcomeFeedbackInput {
  workflow_run_id: string;
  outcome_id: string;
  scene_binding: OutcomeSceneBinding;
  consumption_state: OutcomeConsumptionState;
  consumer_ref: string;
  result_ref?: string;
  evidence_refs?: string[];
  value?: { amount?: number; unit?: string; baseline?: number; comparison?: string };
  observed_at?: string;
  note?: string;
  actor_ref?: string;
}

export interface OutcomeFeedbackRecord extends OutcomeFeedbackInput {
  feedback_id: string;
  recorded_at: string;
  result_ref: string;
  evidence_refs: string[];
  value: Record<string, unknown>;
}

export type ExternalReceiptResultState = 'succeeded' | 'degraded';

export interface ExternalReceiptInput {
  workflow_run_id: string;
  step_run_id?: string;
  producer?: string;
  receipt: {
    receipt_id: string;
    trace_id: string;
    resource_id: string;
    operation: string;
    result_state: ExternalReceiptResultState;
    observed_at: string;
    provenance_ref: string;
    policy_digest: string;
    output_digest?: string;
    error_code?: string;
  };
}

export interface ExternalReceiptRecord {
  event_id?: string;
  evidence_id?: string;
  receipt_id?: string;
  workflow_run_id?: string;
  resource_id?: string;
  result_state?: ExternalReceiptResultState;
  observed_at?: string;
  provenance_ref?: string;
}

export interface WorkflowMeshOperationsData {
  schema_version: string;
  status: 'live' | 'unavailable';
  source: { kind: string; path: string; projection: string };
  filter: { scene_id: string | null };
  summary: {
    run_count: number;
    active_runs: number;
    admitted_runs: number;
    succeeded_runs: number;
    verified_runs: number;
    merged_runs: number;
    closed_runs: number;
    failed_runs: number;
    evidence_complete_runs: number;
    rates: Record<string, number | null>;
    states: Record<string, number>;
  };
  workflow_requests?: {
    request_count: number;
    pending_count: number;
    admitted_count: number;
    approval_required_count: number;
    states: Record<string, number>;
    next_action: string;
  };
  by_scene: Array<{
    scene_binding: OutcomeSceneBinding | null;
    run_count: number;
    succeeded_runs: number;
    verified_runs: number;
    closed_runs: number;
    consumed_runs: number;
    feedback_count: number;
  }>;
  review_queue: Array<Record<string, unknown>>;
  consumption: {
    status: 'not_observed' | 'observed' | 'rejected';
    consumed_runs: number;
    feedback_count: number;
    eligible_closed_runs: number;
    consumption_rate_among_eligible_closed_runs: number | null;
    states: Record<string, number>;
    eligible_outcomes: Array<{
      workflow_run_id: string;
      outcome_id: string;
      state: string;
      scene_binding: OutcomeSceneBinding;
      evidence_count: number;
    }>;
    feedback: OutcomeFeedbackRecord[];
    next_action: string;
  };
  evaluation_samples?: {
    schema_version: string;
    status: 'observed' | 'not_observed';
    summary: {
      row_count: number;
      ready_count: number;
      execution_ready_count: number;
      blocked_count: number;
      blockers: Record<string, number>;
    };
    rows: Array<{
      evaluation_id: string;
      workflow_run_id: string | null;
      scene_binding: OutcomeSceneBinding | null;
      join_status?: string;
      receipt_count: number;
      execution_outcome?: string;
      selection_alignment?: string;
      consumption_state?: string;
      label_quality?: string;
      status: 'ready' | 'execution_ready' | 'blocked';
      blockers: string[];
    }>;
    next_action: string;
  };
}

export interface WorkflowMeshOperationsResponse {
  ok: boolean;
  operations: WorkflowMeshOperationsData;
}

export interface OutcomeFeedbackResponse {
  ok: boolean;
  status: 'recorded' | 'deduplicated' | 'invalid';
  feedback?: OutcomeFeedbackRecord;
  error?: string;
  message?: string;
}

export interface ExternalReceiptResponse {
  ok: boolean;
  status: 'recorded' | 'invalid' | 'unavailable';
  receipt?: ExternalReceiptRecord;
  error?: string;
  message?: string;
}

export function useWorkflowMeshOperations(sceneId?: string) {
  return useQuery({
    queryKey: ['workflow-mesh-operations', sceneId ?? 'ALL'],
    queryFn: async () => {
      const res = await apiFetch<WorkflowMeshOperationsResponse>(
        API_ENDPOINTS.workflowMeshOperations.getOperations(sceneId),
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load Workflow Mesh operations');
      }
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useRecordOutcomeFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OutcomeFeedbackInput) => {
      const res = await apiPost<OutcomeFeedbackResponse>(
        API_ENDPOINTS.workflowMeshOperations.recordOutcomeFeedback,
        input,
      );
      if (!res.ok || !res.data || !res.data.ok) {
        throw new Error(res.data?.message || res.error || 'Failed to record outcome feedback');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-mesh-operations'] });
    },
  });
}

export function useRecordExternalReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ExternalReceiptInput) => {
      const res = await apiPost<ExternalReceiptResponse>(
        API_ENDPOINTS.workflowMeshOperations.recordExternalReceipt,
        input,
      );
      if (!res.ok || !res.data || !res.data.ok) {
        throw new Error(res.data?.message || res.error || 'Failed to record external receipt');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-mesh-operations'] });
    },
  });
}

// ── Workflow Mesh Scene Cards ──

export interface SceneCardCandidate {
  candidate_id: string;
  title: string;
  status: 'candidate';
  discovery_source: string;
  discovery_refs: string[];
  proposed_scene_id: string;
  proposed_journey_id: string;
  outcome_metric_hint: string;
  capability_refs: string[];
  safe_observations: string[];
  activation_evidence_refs: string[];
  sample_refs: string[];
  demand_evidence_refs: string[];
  opportunity_window: string;
  missing_activation_fields: string[];
}

export interface SceneCardProjection {
  schema: 'scene-card-candidate/v1';
  mode: 'candidate_only';
  activation: 'forbidden';
  raw_content_policy: string;
  candidates: SceneCardCandidate[];
  summary: {
    candidate_count: number;
    activation_eligible_count: number;
    requires_business_confirmation_count: number;
  };
}

export interface SceneCardCandidatesResponse {
  ok: boolean;
  projection: SceneCardProjection;
}

export type SceneCardReviewDecision = 'pending' | 'request_evidence' | 'reject' | 'approve';

export interface SceneCardReviewInput {
  candidate_id: string;
  decision: SceneCardReviewDecision;
  reviewer_ref: string;
  note: string;
}

export interface SceneCardReviewReceipt {
  schema: 'scene-card-review/v1';
  review_id: string;
  candidate_id: string;
  decision: SceneCardReviewDecision;
  status: string;
  reason: string;
  next_action: string;
  manual_consumption: 'review_queue';
  activation: 'forbidden';
  activation_attempted: false;
  reviewer_ref: string;
  note_digest: string;
  safe_candidate_snapshot: {
    title: string;
    discovery_refs: string[];
    proposed_scene_id: string;
    proposed_journey_id: string;
    outcome_metric_hint: string;
    capability_refs: string[];
    safe_observations: string[];
  };
  missing_activation_fields: string[];
}

export interface SceneCardReviewResponse {
  ok: boolean;
  receipt: SceneCardReviewReceipt;
}

export interface SceneCardInput {
  schema: 'scene-card/v1';
  lifecycle: 'proposal_only';
  activation: 'forbidden';
  scene_id: string;
  journey_id: string;
  goal: string;
  trigger: string;
  input_contract: string;
  result_contract: string;
  outcome_metric: string;
  consumer: string;
  approver: string;
  owner: string;
  failure_cost: string;
  data_classification: string;
  data_scope: string;
  operator: string;
  permission_ref: string;
  rollback_plan: string;
  sample_refs: string[];
  demand_evidence_refs: string[];
  activation_evidence_refs: string[];
  required_capabilities: string[];
  opportunity_window?: string;
}

export interface SceneCardIntakeProjection {
  schema: 'scene-card-intake/v1';
  mode: 'proposal_only_intake';
  intake_id: string;
  source_digest: string;
  status: 'blocked' | 'proposal_only';
  next_action: string;
  activation: 'forbidden';
  missing_fields: string[];
  scene_card: Record<string, unknown>;
  side_effects: {
    raw_content_read: false;
    provider_called: false;
    omo_written: false;
    workflow_created: false;
    activation_attempted: false;
  };
}

export interface SceneCardIntakeResponse {
  ok: boolean;
  status: string;
  projection?: SceneCardIntakeProjection;
  message?: string;
  error?: string;
  activation: 'forbidden';
  persistence?: 'none';
}

export type SceneCardPreflightStatus =
  | 'blocked'
  | 'proposal_only'
  | 'ready_for_admission_preview'
  | 'unavailable';

export interface SceneCardPreflightProjection {
  schema: 'external-activation-preflight/v1';
  mode: 'read_only_preflight';
  activation: 'forbidden';
  scene: {
    scene_id: string;
    journey_id: string;
    outcome_metric: string;
  };
  status: SceneCardPreflightStatus;
  next_action: string;
  missing_fields: string[];
  scene_card?: {
    missing_fields?: string[];
    required_capabilities?: string[];
  };
  capability_checks?: Array<{
    capability: string;
    status: 'available' | 'proposal_only' | 'unavailable';
    candidates: Array<{
      resource_id: string;
      availability: string;
      lifecycle: string;
      reason_codes: string[];
    }>;
  }>;
  catalog_freshness?: {
    status: 'fresh' | 'stale' | 'unknown';
    reason_codes: string[];
  };
  intake_status?: string;
  side_effects: {
    provider_called: false;
    omo_written: false;
    workflow_created: false;
  };
}

export interface SceneCardPreflightResponse {
  ok: boolean;
  status: string;
  projection?: SceneCardPreflightProjection;
  catalog_source?: string;
  message?: string;
  error?: string;
  activation: 'forbidden';
  persistence?: 'none';
}

export function useSceneCardCandidates() {
  return useQuery({
    queryKey: ['scene-card-candidates'],
    queryFn: async () => {
      const res = await apiFetch<SceneCardCandidatesResponse>(API_ENDPOINTS.sceneCards.listCandidates);
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load Scene Card candidates');
      }
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useReviewSceneCardCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SceneCardReviewInput) => {
      const res = await apiPost<SceneCardReviewResponse>(API_ENDPOINTS.sceneCards.reviewCandidate, input);
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to review Scene Card candidate');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-card-candidates'] });
    },
  });
}

export function useIntakeSceneCard() {
  return useMutation({
    mutationFn: async (sceneCard: SceneCardInput) => {
      const res = await apiPost<SceneCardIntakeResponse>(
        API_ENDPOINTS.sceneCards.intake,
        { scene_card: sceneCard },
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to intake Scene Card');
      }
      return res.data;
    },
  });
}

export function usePreflightSceneCard() {
  return useMutation({
    mutationFn: async (sceneCard: SceneCardInput) => {
      const res = await apiPost<SceneCardPreflightResponse>(
        API_ENDPOINTS.sceneCards.preflight,
        { scene_card: sceneCard },
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to preflight Scene Card');
      }
      return res.data;
    },
  });
}

export type ExternalResourceKind =
  | 'knowledge_source'
  | 'data_source'
  | 'resource_provider'
  | 'method_pack'
  | 'tool_capability'
  | 'channel'
  | 'model_provider';

export type ExternalResourceAvailability = 'available' | 'degraded' | 'proposal_only' | 'unavailable';

export interface ExternalResourceHealth {
  status: string;
  observed_at?: string | null;
  source?: string | null;
  latency_ms?: number | null;
  age_seconds?: number | null;
  metrics?: Record<string, number>;
}

export interface ExternalResourceItem {
  id: string;
  kind: ExternalResourceKind;
  provider: string;
  protocol: string;
  capabilities: string[];
  data_classification: string;
  owner: string;
  version: string;
  permission_ref: string;
  mode: string;
  lifecycle: string;
  availability: ExternalResourceAvailability;
  reason_codes: string[];
  provenance_ref: string;
  entry_point: string;
  health: ExternalResourceHealth;
  rollback_plan: boolean;
  expires_at?: string | null;
  review_at?: string | null;
}

export interface ExternalResourceProjection {
  schema: 'external-resource-catalog/v1';
  mode: 'read_only_projection';
  activation: 'forbidden';
  raw_content_policy: string;
  observed_at: string;
  health_ttl_seconds: number;
  policy_digest: string;
  resources: ExternalResourceItem[];
  errors: Array<{ entry_point: string; status: string; error: string }>;
  summary: {
    resource_count: number;
    unavailable_count: number;
    error_count: number;
    by_kind?: Record<string, number>;
    by_availability?: Record<string, number>;
  };
}

export interface ExternalResourceResponse {
  ok: boolean;
  projection: ExternalResourceProjection;
}

export type ExternalResourceConnectionPlanStatus = 'available' | 'attention' | 'empty' | 'unavailable';

export interface ExternalResourceConnectionPlanItem {
  resource_id: string;
  kind: string;
  provider: string;
  lifecycle: string;
  availability: string;
  next_step: string;
  status: 'blocked' | 'ready_for_review';
  blockers: string[];
  required_inputs: string[];
  owner_ref: string;
  permission_ref: string;
}

export interface ExternalResourceConnectionPlanProjection {
  schema: 'external-resource-connection-plan/v1';
  mode: 'read_only_projection';
  activation: 'forbidden';
  provider_invocation: false;
  workflow_run_creation: false;
  admission_mutation: false;
  observed_at: string;
  directory_digest: string;
  items: ExternalResourceConnectionPlanItem[];
  summary: {
    resource_count: number;
    blocked_count: number;
    ready_for_review_count: number;
    next_step_counts: Record<string, number>;
  };
  status?: ExternalResourceConnectionPlanStatus;
  next_action?: string;
  errors?: Array<{ entry_point: string; status: string; error: string }>;
}

export interface ExternalResourceConnectionPlanResponse {
  ok: boolean;
  status?: ExternalResourceConnectionPlanStatus;
  projection?: ExternalResourceConnectionPlanProjection;
  error?: string;
}

export type ExternalResourcePackCheckStatus = 'blocked' | 'proposal_only' | 'ready_for_catalog_preview';

export interface ExternalResourcePackCatalogPreview {
  schema: 'external-resource-pack-catalog-preview/v1';
  mode: 'read_only_pack_preview';
  activation: 'forbidden';
  raw_content_policy: string;
  status: ExternalResourcePackCheckStatus;
  source: string;
  pack: {
    pack_id: string | null;
    pack_version: string | null;
  };
  resource: {
    id: string;
    kind: ExternalResourceKind;
    provider: string;
    capabilities: string[];
    lifecycle: string;
    version: string;
    permission_ref: string;
    availability: 'unobserved';
    reason_codes: string[];
    health: {
      status: 'unobserved';
      observed_at: string | null;
      latency_ms: number | null;
      source: string;
    };
  };
  next_action: string;
}

export interface ExternalResourcePackCheckProjection {
  schema: 'external-resource-pack-check/v1';
  mode: 'read_only_conformance';
  activation: 'forbidden';
  status: ExternalResourcePackCheckStatus;
  reason_codes: string[];
  pack: {
    pack_id: string | null;
    pack_version: string | null;
    provider: string | null;
  };
  descriptor?: {
    id: string;
    kind: ExternalResourceKind;
    provider: string;
    version: string;
    lifecycle: string;
    mode: string;
    capabilities: string[];
    permission_ref: string;
  } | null;
  catalog_preview?: ExternalResourcePackCatalogPreview | null;
  execution_policy: {
    install: 'forbidden';
    provider_import: 'forbidden';
    health_probe: 'forbidden';
    omo_write: 'forbidden';
    business_invoke: 'forbidden';
  };
}

export interface ExternalResourcePackPreflightResponse {
  ok: boolean;
  status: string;
  projection?: ExternalResourcePackCheckProjection;
  error?: string;
  message?: string;
  activation: 'forbidden';
  persistence?: 'none';
  provider_invocation?: false;
}

export interface ExternalResourcePackProposalResponse {
  ok: boolean;
  status: 'recorded' | 'deduplicated';
  proposal_status: ExternalResourcePackCheckStatus;
  proposal: {
    proposal_receipt_id: string;
    proposal_id: string;
    proposal_status: ExternalResourcePackCheckStatus;
    next_stage: 'catalog_discovery' | 'proposal_evaluation';
    activation: 'forbidden';
    persistence: 'omo_append_only';
    provider_invocation: false;
  };
  activation: 'forbidden';
  persistence: 'omo_append_only';
  provider_invocation: false;
  external_side_effects: 'disabled';
  worker_launch: false;
}

export type ExternalResourceReviewQueueStatus = 'attention' | 'clear' | 'empty' | 'unavailable';

export interface ExternalResourceReviewItem {
  resource_id: string;
  change: string;
  risk_class: 'manual_review';
  risk_codes: string[];
  changed_fields: string[];
  previous: Record<string, unknown> | null;
  current: Record<string, unknown> | null;
}

export interface ExternalResourceReviewQueueProjection {
  schema: 'external-resource-review-queue/v1';
  mode: 'read_only_projection';
  activation: 'forbidden';
  raw_content_policy: string;
  source: 'omo.external_resource_observation';
  queue_semantics: 'latest_observation_delta';
  status: ExternalResourceReviewQueueStatus;
  observed_at?: string | null;
  recorded_at?: string | null;
  observation_id?: string | null;
  change_state?: string | null;
  items: ExternalResourceReviewItem[];
  summary: {
    review_required_count: number;
    operational_observation_count: number;
    risk_codes: string[];
  };
  next_action: string;
  error?: string;
}

export interface ExternalResourceReviewQueueResponse {
  ok: boolean;
  projection: ExternalResourceReviewQueueProjection;
}

export type ExternalSceneTrialReviewAction = 'continue' | 'request_changes' | 'reject';
export type ExternalSceneTrialReviewStatus = 'attention' | 'clear' | 'empty' | 'unavailable';

export interface ExternalSceneTrialReviewRecord {
  feedback_id: string;
  trial_id: string;
  review_action: ExternalSceneTrialReviewAction;
  evidence_refs: string[];
  reviewer_ref: string;
  review_ref: string;
  activation: 'forbidden';
  provider_invocation: false;
  workflow_run_id: null;
  recorded_at?: string;
}

export interface ExternalSceneTrialReviewItem {
  trial_id: string;
  scene_binding: { scene_id: string; journey_id: string; outcome_metric: string };
  consumer_ref: string;
  owner_ref: string;
  approver_ref: string;
  permission_ref: string;
  evidence_refs: string[];
  preflight_ref: string;
  catalog_observation_id: string;
  trial_stage: 'observation_only';
  status: 'proposal_only';
  metric: Record<string, unknown>;
  sample_plan: { minimum_samples: number; window_seconds: number };
  rollback_ref: string;
  feedback_contract: { schema: 'outcome-feedback/v1'; [key: string]: unknown };
  activation: 'forbidden';
  provider_invocation: false;
  workflow_run_id: null;
  observed_at: string;
  trial_receipt_id?: string;
  latest_review: ExternalSceneTrialReviewRecord | null;
}

export interface ExternalSceneTrialReviewProjection {
  schema: 'external-scene-trial-review/v1';
  mode: 'read_only_projection';
  activation: 'forbidden';
  provider_invocation: false;
  workflow_run_creation: 'forbidden';
  raw_content_policy: string;
  source: 'omo.external_scene_trial';
  status: ExternalSceneTrialReviewStatus;
  scene_id?: string | null;
  items: ExternalSceneTrialReviewItem[];
  summary: {
    trial_count: number;
    unreviewed_count: number;
    reviewed_count: number;
    review_actions: Record<string, number>;
  };
  next_action: string;
  error?: string;
}

export interface ExternalSceneTrialReviewResponse {
  ok: boolean;
  projection: ExternalSceneTrialReviewProjection;
}

export interface ExternalSceneTrialReviewInput {
  feedback_id: string;
  trial_id: string;
  review_action: ExternalSceneTrialReviewAction;
  evidence_refs: string[];
  reviewer_ref: string;
  review_ref: string;
  actor_ref?: string;
}

export interface ExternalSceneTrialReviewMutationResponse {
  ok: boolean;
  status: 'recorded' | 'deduplicated' | 'invalid' | 'unavailable';
  feedback?: ExternalSceneTrialReviewRecord;
  activation: 'forbidden';
  provider_invocation: false;
  workflow_run_creation: 'forbidden';
  error?: string;
  message?: string;
}

export type ExternalSceneTrialReadinessStatus = 'empty' | 'blocked' | 'ready' | 'unavailable';

export interface ExternalSceneTrialReadinessItem {
  trial_id: string;
  scene_binding: { scene_id: string; journey_id: string; outcome_metric: string };
  consumer_ref: string;
  metric?: Record<string, unknown>;
  latest_review: {
    feedback_id?: string;
    review_action?: ExternalSceneTrialReviewAction;
    reviewer_ref?: string;
    review_ref?: string;
    observed_at?: string;
  } | null;
  checks: {
    trial_recorded: boolean;
    review_continued: boolean;
    workflow_run_present: boolean;
    workflow_run_eligible: boolean;
    external_receipt_recorded: boolean;
    outcome_feedback_recorded: boolean;
  };
  matched_workflow_run_ids: string[];
  workflow_states: string[];
  external_receipts: Array<{
    receipt_id: string;
    resource_id: string;
    result_state: string;
    observed_at: string;
  }>;
  outcome_feedback: Array<{
    feedback_id: string;
    outcome_id: string;
    consumption_state: string;
    consumer_ref: string;
    observed_at: string;
  }>;
  blockers: string[];
  status: 'blocked' | 'ready';
  next_action: string;
}

export interface ExternalSceneTrialReadinessProjection {
  schema: 'external-scene-trial-promotion-readiness/v1';
  mode: 'read_only_projection';
  activation: 'forbidden';
  provider_invocation: false;
  workflow_run_creation: 'forbidden';
  admission_mutation: 'forbidden';
  external_side_effects: 'disabled';
  status: ExternalSceneTrialReadinessStatus;
  scene_id?: string | null;
  items: ExternalSceneTrialReadinessItem[];
  summary: { trial_count: number; ready_count: number; blocked_count: number };
  next_action: string;
  error?: string;
}

export interface ExternalSceneTrialReadinessResponse {
  ok: boolean;
  projection?: ExternalSceneTrialReadinessProjection;
  status?: ExternalSceneTrialReadinessStatus;
  error?: string;
}

export interface ExternalResourceSceneBinding {
  scene_id: string;
  journey_id: string;
  outcome_metric: string;
  data_scope: string;
  operator: string;
  permission_ref: string;
}

export interface ExternalResourceEvaluationInput {
  capability: string;
  scene_binding: ExternalResourceSceneBinding;
  trace_id?: string;
  persist_observation?: boolean;
  workflow_run_id?: string;
  actor_ref?: string;
}

export interface ExternalResourceCandidateDecision {
  resource_id: string;
  capability: string;
  status: 'eligible' | 'rejected' | 'not_applicable';
  reasons: string[];
  decision_factors: {
    health?: string;
    permission?: number;
    trust?: number;
    freshness?: number;
    cost?: number;
    latency?: number;
  };
  rank: Array<number | string>;
  availability?: string | null;
  provenance_ref: string;
}

export interface ExternalResourceEvaluation {
  schema: 'external-resource-evaluation/v1';
  mode: 'read_only_evaluation';
  activation: 'forbidden';
  raw_content_policy: string;
  capability: string;
  trace_id: string;
  policy_digest: string;
  scene_binding: ExternalResourceSceneBinding;
  status: 'selected' | 'unavailable';
  selected_resource_id?: string | null;
  candidates: ExternalResourceCandidateDecision[];
  reasons: string[];
  summary: {
    candidate_count: number;
    eligible_count: number;
    rejected_count: number;
    not_applicable_count: number;
  };
}

export interface ExternalResourceEvaluationResponse {
  ok: boolean;
  status: string;
  evaluation: ExternalResourceEvaluation;
  observation_status?: 'not_requested' | 'recorded' | 'deduplicated';
  observation_persisted?: boolean;
  observation?: { observation_id: string; evaluation_id?: string } | null;
}

export interface ExternalResourceSelectionEvaluationResponse {
  ok: boolean;
  status: 'live' | 'unavailable';
  dataset?: {
    dataset_version: 'external-resource-selection-eval/v1';
    rows: Array<Record<string, unknown>>;
    summary: {
      row_count: number;
      linked_run_count?: number;
      executed_count?: number;
      aligned_count?: number;
      outcomes?: Record<string, number>;
      label_quality?: Record<string, number>;
    };
  };
}

export function useExternalResources() {
  return useQuery({
    queryKey: ['external-resources'],
    queryFn: async () => {
      const res = await apiFetch<ExternalResourceResponse>(API_ENDPOINTS.externalResources.list);
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load external resources');
      }
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useExternalResourceReviewQueue() {
  return useQuery({
    queryKey: ['external-resource-review-queue'],
    queryFn: async () => {
      const res = await apiFetch<ExternalResourceReviewQueueResponse>(
        API_ENDPOINTS.externalResources.reviewQueue,
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load external resource review queue');
      }
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useExternalResourceConnectionPlan() {
  return useQuery({
    queryKey: ['external-resource-connection-plan'],
    queryFn: async () => {
      const res = await apiFetch<ExternalResourceConnectionPlanResponse>(
        API_ENDPOINTS.externalResources.connectionPlan,
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load external resource connection plan');
      }
      if (res.data.projection?.schema !== 'external-resource-connection-plan/v1') {
        return { ...res.data, projection: undefined };
      }
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useExternalSceneTrialReview(sceneId?: string) {
  return useQuery({
    queryKey: ['external-scene-trial-review', sceneId ?? 'ALL'],
    queryFn: async () => {
      const suffix = sceneId ? `?scene_id=${encodeURIComponent(sceneId)}` : '';
      const res = await apiFetch<ExternalSceneTrialReviewResponse>(
        `${API_ENDPOINTS.externalResources.sceneTrials}${suffix}`,
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load external scene trials');
      }
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useReviewExternalSceneTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExternalSceneTrialReviewInput) => {
      const res = await apiPost<ExternalSceneTrialReviewMutationResponse>(
        API_ENDPOINTS.externalResources.sceneTrialReview,
        input,
      );
      if (!res.ok || !res.data || !res.data.ok) {
        throw new Error(res.data?.message || res.error || 'Failed to record external scene trial review');
      }
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['external-scene-trial-review'] });
    },
  });
}

export function useExternalSceneTrialReadiness(sceneId?: string) {
  return useQuery({
    queryKey: ['external-scene-trial-readiness', sceneId ?? 'ALL'],
    queryFn: async () => {
      const suffix = sceneId ? `?scene_id=${encodeURIComponent(sceneId)}` : '';
      const res = await apiFetch<ExternalSceneTrialReadinessResponse>(
        `${API_ENDPOINTS.externalResources.sceneTrialReadiness}${suffix}`,
      );
      if (!res.ok || !res.data?.projection) {
        throw new Error(res.data?.error || res.error || 'Failed to load scene trial readiness');
      }
      return res.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function usePreflightExternalResourcePack() {
  return useMutation({
    mutationFn: async (pack: Record<string, unknown>) => {
      const res = await apiPost<ExternalResourcePackPreflightResponse>(
        API_ENDPOINTS.externalResources.packPreflight,
        { pack },
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to preflight external resource pack');
      }
      return res.data;
    },
  });
}

export function useRecordExternalResourcePackProposal() {
  return useMutation({
    mutationFn: async (input: {
      pack: Record<string, unknown>;
      proposal_id: string;
      review_action: 'submit' | 'defer' | 'request_changes';
      actor_ref?: string;
    }) => {
      const res = await apiPost<ExternalResourcePackProposalResponse>(
        API_ENDPOINTS.externalResources.packProposal,
        input,
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to persist external resource pack proposal');
      }
      return res.data;
    },
  });
}

export function useEvaluateExternalResources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExternalResourceEvaluationInput) => {
      const res = await apiPost<ExternalResourceEvaluationResponse>(
        API_ENDPOINTS.externalResources.evaluate,
        input,
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to evaluate external resources');
      }
      return res.data;
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        queryKey: ['external-resource-selection-evaluation', input.scene_binding.scene_id],
      });
    },
  });
}

export function useExternalResourceSelectionEvaluation(sceneId?: string) {
  return useQuery({
    queryKey: ['external-resource-selection-evaluation', sceneId],
    queryFn: async () => {
      const suffix = sceneId ? `?scene_id=${encodeURIComponent(sceneId)}` : '';
      const res = await apiFetch<ExternalResourceSelectionEvaluationResponse>(
        `${API_ENDPOINTS.externalResources.selectionEvaluation}${suffix}`,
      );
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to load external resource evaluation evidence');
      }
      return res.data;
    },
    enabled: Boolean(sceneId),
    staleTime: 15000,
  });
}

// ── Decision Inbox ──

export interface DecisionInboxScene {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  journeys: DecisionInboxJourney[];
}

export interface DecisionInboxJourney {
  id: string;
  scene_id: string;
  name: string;
  status: string;
  created_at: string;
  intents: DecisionInboxIntent[];
}

export interface DecisionInboxIntent {
  id: string;
  journey_id: string;
  source: string;
  raw_content: string;
  status: string;
  priority: string;
  task_id?: string;
  created_at: string;
  processed_at?: string;
}

export interface InboxSummary {
  scene_count: number;
  total_intents: number;
  pending_intents: number;
  by_source: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface ApprovalQueueItem {
  intent_id: string;
  scene_id: string;
  scene_name: string;
  journey_id: string;
  journey_name: string;
  source: string;
  raw_content: string;
  priority: string;
  created_at: string;
  evidence_count: number;
}

export function useDecisionInboxScenes() {
  return useQuery({
    queryKey: ['decision-inbox-scenes'],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; scenes: DecisionInboxScene[] }>(
        API_ENDPOINTS.decisionInbox.listScenes,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load scenes');
      return res.data.scenes;
    },
    staleTime: 10000,
  });
}

export function useDecisionInboxScene(sceneId: string) {
  return useQuery({
    queryKey: ['decision-inbox-scene', sceneId],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; scene: DecisionInboxScene }>(
        API_ENDPOINTS.decisionInbox.getScene(sceneId),
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load scene');
      return res.data.scene;
    },
    enabled: Boolean(sceneId),
    staleTime: 10000,
  });
}

export function useInboxSummary() {
  return useQuery({
    queryKey: ['decision-inbox-summary'],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; summary: InboxSummary }>(
        API_ENDPOINTS.decisionInbox.getSummary,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load summary');
      return res.data.summary;
    },
    staleTime: 10000,
  });
}

export function useCreateScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; priority?: string }) => {
      const res = await apiPost<{ ok: boolean; scene: DecisionInboxScene }>(
        API_ENDPOINTS.decisionInbox.createScene, input,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to create scene');
      return res.data.scene;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['decision-inbox-scenes'] }); },
  });
}

export function useAddIntent(sceneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source: string; raw_content: string; priority?: string; journey_id?: string }) => {
      const res = await apiPost<{ ok: boolean; intent: DecisionInboxIntent }>(
        API_ENDPOINTS.decisionInbox.addIntent(sceneId), input,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to add intent');
      return res.data.intent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decision-inbox-scene', sceneId] });
      qc.invalidateQueries({ queryKey: ['decision-inbox-summary'] });
    },
  });
}

export function useUpdateIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { intent_id: string; status: string; task_id?: string }) => {
      const res = await apiFetch<{ ok: boolean; intent: DecisionInboxIntent }>(
        API_ENDPOINTS.decisionInbox.updateIntent(input.intent_id),
        { method: 'PATCH', body: JSON.stringify({ status: input.status, task_id: input.task_id }) },
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to update intent');
      return res.data.intent;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['decision-inbox'] }); },
  });
}

export function useApprovalQueue() {
  return useQuery({
    queryKey: ['decision-inbox-approval-queue'],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; queue: ApprovalQueueItem[]; total: number }>(
        API_ENDPOINTS.decisionInbox.approvalQueue,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load approval queue');
      return res.data;
    },
    staleTime: 10000,
  });
}

export function useApproveIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { intent_id: string; reviewer?: string; note?: string; outcome_metric?: string }) => {
      const res = await apiPost<{ ok: boolean; receipt_id: string; task_id: string; status: string }>(
        API_ENDPOINTS.decisionInbox.approveIntent, input,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to approve intent');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decision-inbox-approval-queue'] });
      qc.invalidateQueries({ queryKey: ['decision-inbox-summary'] });
    },
  });
}

export function useRejectIntent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { intent_id: string; reviewer?: string; note?: string }) => {
      const res = await apiPost<{ ok: boolean; receipt_id: string; status: string }>(
        API_ENDPOINTS.decisionInbox.rejectIntent, input,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to reject intent');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decision-inbox-approval-queue'] });
      qc.invalidateQueries({ queryKey: ['decision-inbox-summary'] });
    },
  });
}

// ── Week 4: Connector + Review ──

export interface WeeklyReviewReport {
  report_period: string;
  generated_at: string;
  summary: {
    total_intents: number;
    pending: number;
    approved: number;
    rejected: number;
    done: number;
    accuracy: number;
    false_positive_rate: number;
    time_saved_minutes: number;
    time_saved_hours: number;
  };
  distribution: {
    by_source: Record<string, number>;
    by_priority: Record<string, number>;
  };
  daily_trend: Record<string, number>;
}

export interface PilotReport {
  pilot_name: string;
  pilot_duration: string;
  generated_at: string;
  scenes: Array<{ id: string; name: string; status: string; priority: string; journey_count: number; intent_count: number }>;
  total_intents: number;
}

export function useWeeklyReview(weeks: number = 1) {
  return useQuery({
    queryKey: ['decision-inbox-review-weekly', weeks],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; report: WeeklyReviewReport }>(
        API_ENDPOINTS.decisionInbox.reviewWeekly(weeks),
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load review');
      return res.data.report;
    },
    staleTime: 30000,
  });
}

export function usePilotReport() {
  return useQuery({
    queryKey: ['decision-inbox-review-pilot'],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; report: PilotReport }>(
        API_ENDPOINTS.decisionInbox.reviewPilot,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load pilot report');
      return res.data.report;
    },
    staleTime: 60000,
  });
}

export function useConnectorStats() {
  return useQuery({
    queryKey: ['decision-inbox-connector-stats'],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; stats: any }>(
        API_ENDPOINTS.decisionInbox.connectorStats,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load connector stats');
      return res.data.stats;
    },
    staleTime: 15000,
  });
}
