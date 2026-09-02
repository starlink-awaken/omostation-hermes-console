import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TopologyView from '../TopologyView';

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0, refetchInterval: false, refetchOnWindowFocus: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const client = createTestClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('TopologyView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header and loading state while topology data is pending', () => {
    renderWithProviders(<TopologyView />);
    expect(screen.getByText('全局服务拓扑')).toBeInTheDocument();
    expect(screen.getByText('正在探测服务拓扑...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('topology unavailable'));
    renderWithProviders(<TopologyView />);
    await waitFor(
      () => {
        expect(screen.getByText('topology unavailable')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders service table when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'svc-1', name: 'ecos-router', status: 'online', latency: '12ms' },
        { id: 'svc-2', name: 'omo-router', status: 'degraded', latency: '45ms' },
      ],
    } as Response);
    const { container } = renderWithProviders(<TopologyView />);
    await waitFor(() => {
      expect(container.textContent).toContain('ecos-router');
      expect(container.textContent).toContain('omo-router');
    });
  });
});
