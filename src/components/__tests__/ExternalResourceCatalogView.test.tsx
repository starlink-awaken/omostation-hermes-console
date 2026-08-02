import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExternalResourceCatalogView from '../ExternalResourceCatalogView';

const projection = {
  schema: 'external-resource-catalog/v1' as const,
  mode: 'read_only_projection' as const,
  activation: 'forbidden' as const,
  raw_content_policy: 'never_read_or_export',
  observed_at: '2026-08-02T00:00:00+00:00',
  health_ttl_seconds: 900,
  policy_digest: 'external-connection-fabric/v1',
  resources: [{
    id: 'source:test',
    kind: 'knowledge_source' as const,
    provider: 'test-provider',
    protocol: 'external-resource/v1',
    capabilities: ['search', 'read'],
    data_classification: 'public',
    owner: 'test-owner',
    version: '1.0.0',
    permission_ref: 'permission://test',
    mode: 'live_query',
    lifecycle: 'active',
    availability: 'available' as const,
    reason_codes: [],
    provenance_ref: 'evidence://source/test',
    entry_point: 'external.resources:test-source',
    health: { status: 'healthy', observed_at: '2026-08-02T00:00:00+00:00', source: 'probe:test', latency_ms: 10 },
    rollback_plan: true,
    expires_at: '2099-01-01T00:00:00+00:00',
  }],
  errors: [],
  summary: { resource_count: 1, unavailable_count: 0, error_count: 0, by_availability: { available: 1 } },
};

const reviewQueueProjection = {
  schema: 'external-resource-review-queue/v1' as const,
  mode: 'read_only_projection' as const,
  activation: 'forbidden' as const,
  raw_content_policy: 'never_read_or_export',
  source: 'omo.external_resource_observation' as const,
  queue_semantics: 'latest_observation_delta' as const,
  status: 'attention' as const,
  observed_at: '2026-08-02T00:00:00+00:00',
  recorded_at: '2026-08-02T00:01:00+00:00',
  observation_id: 'observation:test',
  change_state: 'changed',
  items: [{
    resource_id: 'source:test',
    change: 'changed',
    risk_class: 'manual_review' as const,
    risk_codes: ['descriptor_provider_changed'],
    changed_fields: ['provider'],
    previous: { provider: 'old-provider' },
    current: { provider: 'new-provider' },
  }],
  summary: { review_required_count: 1, operational_observation_count: 0, risk_codes: ['descriptor_provider_changed'] },
  next_action: '按风险码和变更字段完成人工核查；复核本身不会批准或激活资源。',
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false } } });
  return render(<QueryClientProvider client={client}><ExternalResourceCatalogView /></QueryClientProvider>);
}

describe('ExternalResourceCatalogView', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('shows dynamic resource health and proposal-only activation boundary', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => (
      url === '/api/external-resources/review-queue'
        ? { ok: true, json: async () => ({ ok: true, projection: reviewQueueProjection }) }
        : { ok: true, json: async () => ({ ok: true, projection }) }
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    renderView();

    await waitFor(() => {
      expect(screen.getByText('外部能力目录')).toBeInTheDocument();
      expect(screen.getAllByText('source:test').length).toBeGreaterThan(0);
      expect(screen.getByText('activation: forbidden · mode: live_query · rollback: 已声明')).toBeInTheDocument();
      expect(screen.getByText('人工复核队列')).toBeInTheDocument();
      expect(screen.getByText('需要人工复核')).toBeInTheDocument();
      expect(screen.getByText('风险码：descriptor_provider_changed · 变化字段：provider')).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/external-resources');
    expect(fetchMock.mock.calls.some((call) => call[0] === '/api/external-resources/review-queue')).toBe(true);
  });

  it('keeps an unavailable state when the catalog cannot be read', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('catalog offline')) as typeof globalThis.fetch;

    renderView();

    await waitFor(() => expect(screen.getByText('catalog offline')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '重试读取外部资源目录' })).toBeInTheDocument();
  });

  it('shows an explicit empty review queue before the first governed observation', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => (
      url === '/api/external-resources/review-queue'
        ? { ok: true, json: async () => ({ ok: true, projection: { ...reviewQueueProjection, status: 'empty', items: [], summary: { review_required_count: 0, operational_observation_count: 0, risk_codes: [] }, next_action: '先运行受治理的外部资源观测，再查看人工复核队列。' } }) }
        : { ok: true, json: async () => ({ ok: true, projection }) }
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    renderView();

    await waitFor(() => expect(screen.getByText('尚无观测')).toBeInTheDocument());
    expect(screen.getByText('待复核 0')).toBeInTheDocument();
  });

  it('shows unavailable review queue with an independent retry action', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => (
      url === '/api/external-resources/review-queue'
        ? Promise.reject(new Error('review queue offline'))
        : { ok: true, json: async () => ({ ok: true, projection }) }
    ));
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    renderView();

    await waitFor(() => expect(screen.getByText('review queue offline')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '重试读取外部资源复核队列' })).toBeInTheDocument();
  });

  it('submits a scene-bound read-only candidate evaluation', async () => {
    const evaluation = {
      schema: 'external-resource-evaluation/v1',
      mode: 'read_only_evaluation',
      activation: 'forbidden',
      raw_content_policy: 'never_read_or_export',
      capability: 'search',
      trace_id: 'trace:test',
      policy_digest: 'external-connection-fabric/v1',
      scene_binding: {
        scene_id: 'research-brief',
        journey_id: 'weekly-decision',
        outcome_metric: 'decision_latency_hours',
        data_scope: 'public:research',
        operator: 'human:test',
        permission_ref: 'permission://test',
      },
      status: 'selected',
      selected_resource_id: 'source:test',
      candidates: [{
        resource_id: 'source:test',
        capability: 'search',
        status: 'eligible',
        reasons: [],
        decision_factors: { health: 'healthy', trust: 0.9, freshness: 0.8, cost: 0.2, latency: 0.3 },
        rank: [1, 1, 0.9, 0.8, -0.2, -0.3, 'source:test'],
        availability: 'available',
        provenance_ref: 'evidence://source/test',
      }],
      reasons: [],
      summary: { candidate_count: 1, eligible_count: 1, rejected_count: 0, not_applicable_count: 0 },
    };
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'POST') return { ok: true, json: async () => ({ ok: true, status: 'selected', evaluation }) };
      return { ok: true, json: async () => ({ ok: true, projection }) };
    });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    renderView();
    await waitFor(() => expect(screen.getByText('外部能力目录')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('评估场景 ID'), { target: { value: 'research-brief' } });
    fireEvent.change(screen.getByLabelText('评估旅程 ID'), { target: { value: 'weekly-decision' } });
    fireEvent.change(screen.getByLabelText('评估结果指标'), { target: { value: 'decision_latency_hours' } });
    fireEvent.change(screen.getByLabelText('评估数据范围'), { target: { value: 'public:research' } });
    fireEvent.change(screen.getByLabelText('评估操作人'), { target: { value: 'human:test' } });
    fireEvent.change(screen.getByLabelText('评估权限引用'), { target: { value: 'permission://test' } });
    fireEvent.click(screen.getByLabelText('记录选择评估观察'));
    fireEvent.click(screen.getByRole('button', { name: '评估外部资源候选' }));

    await waitFor(() => expect(screen.getByText('评估结果：selected')).toBeInTheDocument());
    expect(screen.getAllByText('source:test').length).toBeGreaterThan(0);
    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(postCall?.[0]).toBe('/api/external-resources/evaluate');
    expect(String(postCall?.[1]?.body)).toContain('research-brief');
    expect(String(postCall?.[1]?.body)).toContain('"persist_observation":true');
  });
});
