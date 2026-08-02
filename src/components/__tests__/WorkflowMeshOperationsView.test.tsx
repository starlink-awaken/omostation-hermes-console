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
      expect(screen.getByRole('option', { name: /run-21/ })).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/workflow-mesh/operations');
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
    await waitFor(() => expect(screen.getByRole('option', { name: /run-21/ })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('结果'), { target: { value: 'outcome:run-21' } });
    fireEvent.change(screen.getByLabelText('消费方引用'), { target: { value: 'operator://reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: '记录反馈' }));

    await waitFor(() => expect(screen.getByText('结果消费反馈已记录。')).toBeInTheDocument());
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/workflow-mesh/outcome-feedback');
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(body.workflow_run_id).toBe('run-21');
    expect(body.consumer_ref).toBe('operator://reviewer');
    expect(body.actor_ref).toBe('cockpit-ui://workflow-mesh-operations');
  });

  it('keeps an unavailable state when the projection cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('operations offline')));
    renderView();
    await waitFor(() => expect(screen.getByText('operations offline')).toBeInTheDocument());
    expect(screen.getByText('Workflow Mesh 运营投影不可用')).toBeInTheDocument();
  });
});
