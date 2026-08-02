import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SceneCardIntakePanel from '../SceneCardIntakePanel';

const candidate = {
  candidate_id: 'scene-candidate:research',
  title: '研究简报',
  status: 'candidate' as const,
  discovery_source: 'strategy_seed',
  discovery_refs: ['docs/strategy.md#research'],
  proposed_scene_id: 'research-brief',
  proposed_journey_id: 'question-to-brief',
  outcome_metric_hint: 'verified_brief_acceptance',
  capability_refs: ['source.research'],
  safe_observations: ['需要业务确认'],
  activation_evidence_refs: [],
  sample_refs: [],
  demand_evidence_refs: [],
  opportunity_window: '',
  missing_activation_fields: ['owner'],
};

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}><SceneCardIntakePanel candidate={candidate} /></QueryClientProvider>);
}

describe('SceneCardIntakePanel', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('submits a fixed proposal-only card and runs read-only preflight', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/scene-cards/intake') {
        const body = JSON.parse(String(options?.body));
        expect(body.scene_card.schema).toBe('scene-card/v1');
        expect(body.scene_card.lifecycle).toBe('proposal_only');
        expect(body.scene_card.activation).toBe('forbidden');
        return {
          ok: true,
          json: async () => ({
            ok: true,
            status: 'proposal_only',
            activation: 'forbidden',
            persistence: 'none',
            projection: {
              schema: 'scene-card-intake/v1',
              mode: 'proposal_only_intake',
              intake_id: 'scene-intake:research',
              source_digest: 'sha256:test',
              status: 'proposal_only',
              next_action: 'run_external_activation_preflight',
              activation: 'forbidden',
              missing_fields: [],
              scene_card: {},
              side_effects: { raw_content_read: false, provider_called: false, omo_written: false, workflow_created: false, activation_attempted: false },
            },
          }),
        };
      }
      if (url === '/api/scene-cards/preflight') {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            status: 'ready_for_admission_preview',
            activation: 'forbidden',
            persistence: 'none',
            projection: {
              schema: 'external-activation-preflight/v1',
              mode: 'read_only_preflight',
              activation: 'forbidden',
              scene: { scene_id: 'research-brief', journey_id: 'question-to-brief', outcome_metric: 'verified_brief_acceptance' },
              status: 'ready_for_admission_preview',
              next_action: 'submit_omo_admission_preview',
              missing_fields: [],
              capability_checks: [{ capability: 'source.research', status: 'available', candidates: [] }],
              side_effects: { provider_called: false, omo_written: false, workflow_created: false },
            },
          }),
        };
      }
      throw new Error(`unexpected url: ${url}`);
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    renderPanel();
    fireEvent.change(screen.getByLabelText('业务目标'), { target: { value: '形成可核验简报' } });
    fireEvent.click(screen.getByRole('button', { name: '提交 Scene Card 输入' }));

    await waitFor(() => expect(screen.getByText(/输入结果：proposal_only/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '运行 Scene Card 只读预检' }));

    await waitFor(() => expect(screen.getByText(/预检结果：ready_for_admission_preview/)).toBeInTheDocument());
    expect(screen.getByText(/provider_called: false/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/scene-cards/intake', '/api/scene-cards/preflight']);
  });

  it('shows blocked intake fields and does not expose activation action', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        status: 'blocked',
        activation: 'forbidden',
        persistence: 'none',
        projection: {
          schema: 'scene-card-intake/v1',
          mode: 'proposal_only_intake',
          intake_id: 'scene-intake:blocked',
          source_digest: 'sha256:test',
          status: 'blocked',
          next_action: 'complete_scene_card_and_resubmit',
          activation: 'forbidden',
          missing_fields: ['owner', 'sample_refs:3-10'],
          scene_card: {},
          side_effects: { raw_content_read: false, provider_called: false, omo_written: false, workflow_created: false, activation_attempted: false },
        },
      }),
    }) as typeof globalThis.fetch;

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '提交 Scene Card 输入' }));

    await waitFor(() => expect(screen.getByText(/输入结果：blocked/)).toBeInTheDocument());
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('sample_refs:3-10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /激活/ })).not.toBeInTheDocument();
  });
});
