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
