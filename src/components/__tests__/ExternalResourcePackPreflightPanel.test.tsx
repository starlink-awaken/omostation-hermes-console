import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExternalResourcePackPreflightPanel from '../ExternalResourcePackPreflightPanel';

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><ExternalResourcePackPreflightPanel /></QueryClientProvider>);
}

describe('ExternalResourcePackPreflightPanel', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('submits a manifest and shows ready-for-catalog status without activation', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        status: 'ready_for_catalog_preview',
        activation: 'forbidden',
        persistence: 'none',
        provider_invocation: false,
        projection: {
          schema: 'external-resource-pack-check/v1',
          mode: 'read_only_conformance',
          activation: 'forbidden',
          status: 'ready_for_catalog_preview',
          reason_codes: [],
          pack: { pack_id: 'pack:research-provider', pack_version: '1.0.0', provider: null },
          descriptor: { id: 'source:research-provider', kind: 'knowledge_source', provider: 'research-provider', version: '1.0.0', lifecycle: 'sandbox', mode: 'live_query', capabilities: ['search'], permission_ref: 'permission://research/read' },
          catalog_preview: {
            schema: 'external-resource-pack-catalog-preview/v1',
            mode: 'read_only_pack_preview',
            activation: 'forbidden',
            raw_content_policy: 'never_read_or_export',
            status: 'ready_for_catalog_preview',
            source: 'external-resource-pack-manifest',
            pack: { pack_id: 'pack:research-provider', pack_version: '1.0.0' },
            resource: {
              id: 'source:research-provider',
              kind: 'knowledge_source',
              provider: 'research-provider',
              capabilities: ['search'],
              lifecycle: 'sandbox',
              version: '1.0.0',
              permission_ref: 'permission://research/read',
              availability: 'unobserved',
              reason_codes: ['pack_descriptor_not_observed'],
              health: { status: 'unobserved', observed_at: null, latency_ms: null, source: 'external-resource-pack-manifest' },
            },
            next_action: '通过只读目录发现和健康探针后再评估可用性。',
          },
          execution_policy: { install: 'forbidden', provider_import: 'forbidden', health_probe: 'forbidden', omo_write: 'forbidden', business_invoke: 'forbidden' },
        },
      }),
    }) as typeof globalThis.fetch;

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '预检外部扩展包' }));

    await waitFor(() => expect(screen.getByText('可进入目录预览')).toBeInTheDocument());
    expect(screen.getByText('activation: forbidden')).toBeInTheDocument();
    expect(screen.getByText('安装禁止')).toBeInTheDocument();
    expect(screen.getByText('目录预览：未探活')).toBeInTheDocument();
    expect(screen.getByText(/不会把 manifest 声明当作实时探针结果/)).toBeInTheDocument();
    const postCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(postCall?.[0]).toBe('/api/external-resources/packs/preflight');
    expect(String(postCall?.[1]?.body)).toContain('external-resource-pack/v1');
  });

  it('keeps invalid JSON local and does not call the API', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof globalThis.fetch;
    renderPanel();
    fireEvent.change(screen.getByLabelText('外部扩展包 JSON manifest'), { target: { value: '{invalid' } });
    fireEvent.click(screen.getByRole('button', { name: '预检外部扩展包' }));

    await waitFor(() => expect(screen.getByText(/JSON at position/i)).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists a safe review proposal after preflight', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          status: 'ready_for_catalog_preview',
          activation: 'forbidden',
          projection: {
            schema: 'external-resource-pack-check/v1',
            mode: 'read_only_conformance',
            activation: 'forbidden',
            status: 'ready_for_catalog_preview',
            reason_codes: [],
            pack: { pack_id: 'pack:research-provider', pack_version: '1.0.0', provider: 'research-provider' },
            descriptor: null,
            execution_policy: { install: 'forbidden', provider_import: 'forbidden', health_probe: 'forbidden', omo_write: 'forbidden', business_invoke: 'forbidden' },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          status: 'recorded',
          proposal_status: 'ready_for_catalog_preview',
          proposal: {
            proposal_receipt_id: 'external-pack-proposal:abc',
            proposal_id: 'proposal:external-pack:review-1',
            proposal_status: 'ready_for_catalog_preview',
            next_stage: 'catalog_discovery',
            activation: 'forbidden',
            persistence: 'omo_append_only',
            provider_invocation: false,
          },
          activation: 'forbidden',
          persistence: 'omo_append_only',
          provider_invocation: false,
          external_side_effects: 'disabled',
          worker_launch: false,
        }),
      }) as typeof globalThis.fetch;

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '预检外部扩展包' }));
    await waitFor(() => expect(screen.getByText('可进入目录预览')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '保存外部扩展包评审提案' }));

    await waitFor(() => expect(screen.getByText(/已保存 proposal receipt/)).toBeInTheDocument());
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[1]?.[0]).toBe('/api/external-resources/packs/proposals');
    expect(String(calls[1]?.[1]?.body)).toContain('proposal:external-pack:review-1');
  });
});
