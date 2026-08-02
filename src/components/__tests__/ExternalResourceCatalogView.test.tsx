import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, projection }) });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    renderView();

    await waitFor(() => {
      expect(screen.getByText('外部能力目录')).toBeInTheDocument();
      expect(screen.getAllByText('source:test').length).toBeGreaterThan(0);
      expect(screen.getByText('activation: forbidden · mode: live_query · rollback: 已声明')).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/external-resources');
  });

  it('keeps an unavailable state when the catalog cannot be read', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('catalog offline')) as typeof globalThis.fetch;

    renderView();

    await waitFor(() => expect(screen.getByText('catalog offline')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '重试读取外部资源目录' })).toBeInTheDocument();
  });
});
