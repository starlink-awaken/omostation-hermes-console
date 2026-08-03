import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkflowMeshOperationsView from '../WorkflowMeshOperationsView';

const operations = {
  schema_version: 'workflow-mesh-operations/v1',
  status: 'live',
  source: { kind: 'omo_append_only_event_log', path: '_knowledge/workflow-mesh/events.jsonl', projection: 'event_derived' },
  filter: { scene_id: null },
  summary: {
    run_count: 2,
    active_runs: 0,
    admitted_runs: 2,
    succeeded_runs: 2,
    verified_runs: 1,
    merged_runs: 1,
    closed_runs: 1,
    failed_runs: 0,
    evidence_complete_runs: 1,
    rates: {},
    states: { closed: 1, succeeded: 1 },
  },
  by_scene: [],
  review_queue: [],
  consumption: {
    status: 'not_observed',
    consumed_runs: 0,
    feedback_count: 0,
    eligible_closed_runs: 1,
    consumption_rate_among_eligible_closed_runs: 0,
    states: {},
    eligible_outcomes: [{
      workflow_run_id: 'run-21',
      outcome_id: 'outcome:run-21',
      state: 'closed',
      scene_binding: { scene_id: 'engineering-delivery', journey_id: 'intent-to-evidence', outcome_metric: 'verified_delivery_lead_time' },
      evidence_count: 1,
    }],
    feedback: [],
    next_action: 'record_explicit_outcome_consumption_feedback',
  },
  evaluation_labels: {
    schema_version: 'workflow-mesh-evaluation-label-queue/v1',
    status: 'observed',
    summary: {
      row_count: 1,
      eligible_count: 1,
      unlabeled_count: 1,
      single_review_count: 0,
      consensus_count: 0,
      adjudication_required_count: 0,
      adjudicated_count: 0,
      blocked_count: 0,
      label_ready_count: 0,
    },
    rows: [{
      evaluation_id: 'evaluation-21',
      workflow_run_id: 'run-21',
      scene_binding: { scene_id: 'engineering-delivery', journey_id: 'intent-to-evidence', outcome_metric: 'verified_delivery_lead_time' },
      execution_outcome: 'success',
      selection_alignment: 'aligned',
      readiness_status: 'ready',
      status: 'unlabeled',
      blockers: [],
      primary_review_count: 0,
      adjudication_count: 0,
      latest_label: null,
    }],
    next_action: 'submit_primary_labels',
  },
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false } } });
  return render(<QueryClientProvider client={client}><WorkflowMeshOperationsView /></QueryClientProvider>);
}

describe('WorkflowMeshOperationsView', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('shows live operations and truthful not-observed state', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, operations }) });
    vi.stubGlobal('fetch', fetchMock);

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Workflow Mesh 运营闭环')).toBeInTheDocument();
      expect(screen.getByText('结果消费尚未观测')).toBeInTheDocument();
      expect(screen.getByText('运行总数')).toBeInTheDocument();
      expect(screen.getByLabelText('结果')).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/workflow-mesh/operations')).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/workflow-mesh/capability-health'))).toBe(true);
  });

  it('submits explicit feedback without implying a WorkflowRun transition', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true, status: 'recorded', feedback: { feedback_id: 'feedback-21' } }) };
      }
      return { ok: true, json: async () => ({ ok: true, operations }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView();
    await waitFor(() => expect(screen.getByLabelText('结果')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('结果'), { target: { value: 'outcome:run-21' } });
    fireEvent.change(screen.getByLabelText('消费方引用'), { target: { value: 'operator://reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: '记录反馈' }));

    await waitFor(() => expect(screen.getByText('结果消费反馈已记录。')).toBeInTheDocument());
    const feedbackCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(feedbackCall?.[0]).toBe('/api/workflow-mesh/outcome-feedback');
    const body = JSON.parse(String(feedbackCall?.[1]?.body));
    expect(body.workflow_run_id).toBe('run-21');
    expect(body.consumer_ref).toBe('operator://reviewer');
    expect(body.actor_ref).toBe('cockpit-ui://workflow-mesh-operations');
  });

  it('records an external receipt through the governed broker', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true, status: 'recorded', receipt: { evidence_id: 'external:evidence-21' } }) };
      }
      return { ok: true, json: async () => ({ ok: true, operations }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView();
    await waitFor(() => expect(screen.getByLabelText('回执关联结果')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('回执关联结果'), { target: { value: 'outcome:run-21' } });
    fireEvent.change(screen.getByLabelText('Receipt ID'), { target: { value: 'receipt-21' } });
    fireEvent.change(screen.getByLabelText('Receipt Trace ID'), { target: { value: 'trace-21' } });
    fireEvent.change(screen.getByLabelText('回执资源 ID'), { target: { value: 'source:research' } });
    fireEvent.change(screen.getByLabelText('回执操作'), { target: { value: 'search' } });
    fireEvent.change(screen.getByLabelText('回执来源引用'), { target: { value: 'evidence://research/21' } });
    fireEvent.change(screen.getByLabelText('回执策略摘要'), { target: { value: 'policy-21' } });
    fireEvent.change(screen.getByLabelText('回执输出摘要'), { target: { value: 'a'.repeat(64) } });
    fireEvent.click(screen.getByRole('button', { name: '写入外部回执' }));

    await waitFor(() => expect(screen.getByText('外部回执已写入 Workflow Mesh 证据。')).toBeInTheDocument());
    const receiptCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST' && String(init?.body).includes('receipt-21'));
    expect(receiptCall?.[0]).toBe('/api/workflow-mesh/external-receipt');
    const body = JSON.parse(String(receiptCall?.[1]?.body));
    expect(body.workflow_run_id).toBe('run-21');
    expect(body.receipt.resource_id).toBe('source:research');
    expect(body.receipt.output_digest).toHaveLength(64);
  });

  it('submits a structured evaluation label without source content', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true, status: 'recorded', label: { label_id: 'label-21' } }) };
      }
      return { ok: true, json: async () => ({ ok: true, operations }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView();
    await waitFor(() => expect(screen.getByLabelText('评测样本')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('评测样本'), { target: { value: 'evaluation-21' } });
    fireEvent.change(screen.getByLabelText('标注复核人引用'), { target: { value: 'operator://reviewer-21' } });
    fireEvent.change(screen.getByLabelText('标注证据引用'), { target: { value: 'evidence://evaluation/21' } });
    fireEvent.click(screen.getByRole('button', { name: '提交主标注' }));

    await waitFor(() => expect(screen.getByText('结构化标注已记录。')).toBeInTheDocument());
    const labelCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST' && String(init?.body).includes('evaluation-21'));
    expect(labelCall?.[0]).toBe('/api/workflow-mesh/evaluation-label');
    const body = JSON.parse(String(labelCall?.[1]?.body));
    expect(body.evaluation_id).toBe('evaluation-21');
    expect(body.evidence_refs).toEqual(['evidence://evaluation/21']);
    expect(body.actor_ref).toBe('cockpit-ui://workflow-mesh-operations');
    expect(body.raw_content).toBeUndefined();
  });

  it('keeps an unavailable state when the projection cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('operations offline')));
    renderView();
    await waitFor(() => expect(screen.getByText('operations offline')).toBeInTheDocument());
    expect(screen.getByText('Workflow Mesh 运营投影不可用')).toBeInTheDocument();
  });
});
