import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeliveryJourney } from '../hooks';

function withQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0, refetchInterval: false, refetchOnWindowFocus: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

const mockJourney = {
  journey: {
    id: 'dj-001',
    title: 'Test Journey',
    status: 'live' as const,
    source: ['omo', 'git'],
    freshness: 0,
    last_updated: '2026-08-01T12:00:00Z',
    stages: {
      intent: { name: 'intent', status: 'verified' as const, title: 'Intent OK', details: {}, last_updated: '2026-08-01T12:00:00Z' },
    },
  },
};

describe('useDeliveryJourney', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches journey data on LIVE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockJourney,
    }));

    const wrapper = withQueryClient();
    const { result } = renderHook(() => useDeliveryJourney(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.journey.id).toBe('dj-001');
    expect(result.current.data?.journey.status).toBe('live');
    expect(result.current.data?.journey.stages.intent.title).toBe('Intent OK');
  });

  it('passes fixture param to URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockJourney,
    });
    vi.stubGlobal('fetch', mockFetch);

    const wrapper = withQueryClient();
    renderHook(() => useDeliveryJourney('VERIFIED'), { wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('fixture=VERIFIED');
  });

  it('throws on API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));

    const wrapper = withQueryClient();
    const { result } = renderHook(() => useDeliveryJourney(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('throws on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));

    const wrapper = withQueryClient();
    const { result } = renderHook(() => useDeliveryJourney(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Network offline');
  });
});
