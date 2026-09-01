/**
 * React Query hooks for cockpit-ui — knowledge domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: knowledge action operations, workflow request/admission, delivery journey.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from './client';
import { API_ENDPOINTS } from './endpoints';

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
