/**
 * React Query hooks for cockpit-ui — gbrain domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: workflow mesh operations, scene cards, external resources.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from './client';
import { API_ENDPOINTS } from './endpoints';

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
    };
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

// ── External Resources ──

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
