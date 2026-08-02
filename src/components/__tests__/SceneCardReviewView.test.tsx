import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SceneCardReviewView from '../SceneCardReviewView';

const projection = {
  schema: 'scene-card-candidate/v1' as const,
  mode: 'candidate_only' as const,
  activation: 'forbidden' as const,
  raw_content_policy: 'never_read_or_export',
  candidates: [
    {
      candidate_id: 'scene-candidate:engineering-delivery',
      title: '工程研发与系统进化',
      status: 'candidate' as const,
      discovery_source: 'strategy_seed',
      discovery_refs: ['docs/STRATEGY-3YEAR-PANORAMA.md#W6'],
      proposed_scene_id: 'engineering-delivery',
      proposed_journey_id: 'intent-to-evidence',
      outcome_metric_hint: 'verified_delivery_lead_time',
      capability_refs: ['omo.workflow_mesh'],
      safe_observations: ['结果需要回到业务目标'],
      activation_evidence_refs: [],
      sample_refs: [],
      demand_evidence_refs: [],
      opportunity_window: '',
      missing_activation_fields: ['owner', 'sample_refs'],
    },
  ],
  summary: { candidate_count: 1, activation_eligible_count: 0, requires_business_confirmation_count: 1 },
};

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false } },
  });
  return render(<QueryClientProvider client={client}><SceneCardReviewView /></QueryClientProvider>);
}

describe('SceneCardReviewView', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shows candidate-only boundary and submits a request-evidence receipt', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true, receipt: { review_id: 'review:test', status: 'needs_evidence', reason: 'business_evidence_requested', next_action: 'collect_redacted_samples', activation: 'forbidden', note_digest: 'sha256:test' } }) };
      }
      return { ok: true, json: async () => ({ ok: true, projection }) };
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    renderView();

    await waitFor(() => {
      expect(screen.getByText('Scene Card 场景卡评审')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '选择候选 工程研发与系统进化' })).toBeInTheDocument();
      expect(screen.getAllByText('activation: forbidden').length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByLabelText('评审人引用'), { target: { value: 'business://owner' } });
    fireEvent.change(screen.getByLabelText('场景卡评审决策'), { target: { value: 'request_evidence' } });
    fireEvent.change(screen.getByLabelText('场景卡评审备注'), { target: { value: '请补充样本引用' } });
    fireEvent.click(screen.getByRole('button', { name: '提交场景卡评审' }));

    await waitFor(() => expect(screen.getByText(/评审回执：needs_evidence/)).toBeInTheDocument());
    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(postCall?.[0]).toBe('/api/scene-cards/review');
  });

  it('keeps approve visibly blocked by the returned receipt', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true, receipt: { review_id: 'review:blocked', status: 'blocked', reason: 'scene_card_incomplete', next_action: 'complete_scene_card', activation: 'forbidden', note_digest: 'sha256:test' } }) };
      }
      return { ok: true, json: async () => ({ ok: true, projection }) };
    }) as typeof globalThis.fetch;

    renderView();
    await waitFor(() => expect(screen.getByRole('button', { name: '选择候选 工程研发与系统进化' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('评审人引用'), { target: { value: 'business://owner' } });
    fireEvent.change(screen.getByLabelText('场景卡评审决策'), { target: { value: 'approve' } });
    fireEvent.change(screen.getByLabelText('场景卡评审备注'), { target: { value: '材料待补' } });
    fireEvent.click(screen.getByRole('button', { name: '提交场景卡评审' }));

    await waitFor(() => expect(screen.getByText(/评审回执：blocked/)).toBeInTheDocument());
    expect(screen.getAllByText(/activation: forbidden/).length).toBeGreaterThan(0);
  });

  it('degrades to an unavailable state when the projection cannot load', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('projection offline')) as typeof globalThis.fetch;

    renderView();

    await waitFor(() => expect(screen.getByText('projection offline')).toBeInTheDocument());
    expect(screen.getByText(/不会在没有候选事实时伪造/)).toBeInTheDocument();
  });
});
