import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ObservabilityView from '../ObservabilityView';

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

describe('ObservabilityView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while data loads', () => {
    renderWithProviders(<ObservabilityView />);
    expect(screen.getByText('系统运行可观测')).toBeInTheDocument();
    expect(screen.getByText('正在聚合系统级多维观测数据...')).toBeInTheDocument();
  });

  it('renders error state when arch health API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('arch health unavailable'));
    renderWithProviders(<ObservabilityView />);
    await waitFor(
      () => {
        expect(screen.getByText('观测数据加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders BOS metrics when data loads', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('arch-health')) {
        return {
          ok: true,
          json: async () => ({
            data_quality: 'available',
            summary: { total_calls: 1500, success_count: 1450, avg_latency: 24 },
            domains: { memory: { calls: 500, success: 480, latency: 15 } },
          }),
        } as Response;
      }
      if (url.includes('bos/metrics')) {
        return {
          ok: true,
          json: async () => ({
            data_quality: 'available',
            summary: { total_calls: 1500, success_count: 1450, avg_latency: 24 },
            domains: { memory: { calls: 500, success: 480, latency: 15 } },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    renderWithProviders(<ObservabilityView />);
    await waitFor(() => {
      expect(screen.getByText('BOS I0 网格链路流量')).toBeInTheDocument();
      expect(screen.getByText('1,500')).toBeInTheDocument();
    });
  });

  it('shows retry button in error state', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('api unavailable'));
    renderWithProviders(<ObservabilityView />);
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
