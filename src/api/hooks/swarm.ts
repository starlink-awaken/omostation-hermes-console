/**
 * React Query hooks for cockpit-ui — swarm domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: decision inbox, weekly review, outcomes & calibration, journeys timeline.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../client';
import { API_ENDPOINTS } from '../endpoints';

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

// ── Outcomes & Calibration ──

export interface OutcomesSummary {
  ok: boolean;
  pending_count: number;
  history_count: number;
  calibration_scenes: number;
  knowledge_funnel?: KnowledgeFunnel;
}

export interface KnowledgeFunnel {
  retrieved: number;
  cited: number;
  citation_rate: number | null;
  task_created: number;
  status: string;
}

export interface OutcomePendingItem {
  scene_id: string;
  run_id: string;
  submitted_at: string;
  actor: string;
  notes: string;
}

export interface OutcomeHistoryItem {
  scene_id: string;
  run_id: string;
  adjudication: string;
  actor: string;
  adjudicated_at: string;
  notes: string;
}

export interface CalibrationScene {
  scene_id: string;
  accepted: number;
  total: number;
  calibration: number;
  updated_at: string;
}

export interface CalibrationCapability {
  id: string;
  capability_ref: string;
  success_rate: number;
  sample_size: number;
  measured_at: string;
}

export interface OutcomesCalibration {
  ok: boolean;
  scenes: CalibrationScene[];
  capabilities: CalibrationCapability[];
}

export function useOutcomesSummary() {
  return useQuery({
    queryKey: ['outcomes-summary'],
    queryFn: async () => {
      const res = await apiFetch<OutcomesSummary>(API_ENDPOINTS.outcomes.getSummary);
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load outcomes summary');
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useOutcomesPending() {
  return useQuery({
    queryKey: ['outcomes-pending'],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; items: OutcomePendingItem[] }>(
        API_ENDPOINTS.outcomes.getPending,
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load pending outcomes');
      return res.data.items;
    },
    staleTime: 15000,
  });
}

export function useOutcomesHistory(limit = 50) {
  return useQuery({
    queryKey: ['outcomes-history', limit],
    queryFn: async () => {
      const res = await apiFetch<{ ok: boolean; items: OutcomeHistoryItem[] }>(
        API_ENDPOINTS.outcomes.getHistory(limit),
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load outcomes history');
      return res.data.items;
    },
    staleTime: 30000,
  });
}

export function useOutcomesCalibration() {
  return useQuery({
    queryKey: ['outcomes-calibration'],
    queryFn: async () => {
      const res = await apiFetch<OutcomesCalibration>(API_ENDPOINTS.outcomes.getCalibration);
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load calibration data');
      return res.data;
    },
    staleTime: 60000,
  });
}

// ── Journeys Timeline ──

export interface JourneyTimelineItem {
  source: string;
  scene_id: string;
  journey_id: string;
  status: string;
  started_at: string;
  completed_at: string;
  actor: string;
  notes: string;
}

export interface JourneyTimeline {
  ok: boolean;
  total: number;
  success_rate: number;
  items: JourneyTimelineItem[];
}

export function useJourneysTimeline(params?: { scene_id?: string; limit?: number }) {
  return useQuery({
    queryKey: ['journeys-timeline', params?.scene_id, params?.limit],
    queryFn: async () => {
      const res = await apiFetch<JourneyTimeline>(
        API_ENDPOINTS.journeys.getTimeline(params),
      );
      if (!res.ok || !res.data) throw new Error(res.error || 'Failed to load journeys timeline');
      return res.data;
    },
    staleTime: 30000,
  });
}
