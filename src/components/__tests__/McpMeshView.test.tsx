import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import McpMeshView from '../McpMeshView';

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

describe('McpMeshView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while services load', () => {
    renderWithProviders(<McpMeshView />);
    expect(screen.getByText('BOS URI & MCP 网格')).toBeInTheDocument();
  });

  it('renders error state when services fail to load', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('service unavailable'));
    renderWithProviders(<McpMeshView />);
    await waitFor(
      () => {
        expect(screen.getByText('服务数据加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders health summary when data loads', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/bos/services')) {
        return {
          ok: true,
          json: async () => ({ services: [] }),
        } as Response;
      }
      if (url.includes('/api/bos/health')) {
        return {
          ok: true,
          json: async () => ({ status: 'healthy', total_routes: 10, domains: { memory: 5 } }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    renderWithProviders(<McpMeshView />);
    await waitFor(() => {
      expect(screen.getByText('healthy')).toBeInTheDocument();
    });
  });

  it('renders domain filter dropdown', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          services: [{ uri: 'bos://memory/kos/search', domain: 'memory', action: 'search', transport: 'mcp' }],
          data_quality: 'available',
          summary: { total_calls: 10, success_count: 8, avg_latency: 20 },
          domains: { memory: { calls: 10, success: 8, latency: 20 } },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy', total_routes: 1, domains: { memory: 1 } }),
      } as Response);
    renderWithProviders(<McpMeshView />);
    await waitFor(() => {
      expect(screen.getByText('全部')).toBeInTheDocument();
    });
  });
});
