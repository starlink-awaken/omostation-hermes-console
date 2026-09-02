import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import C2GStrategyView from '../C2GStrategyView';

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

describe('C2GStrategyView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header and loading state while OMO status loads', () => {
    renderWithProviders(<C2GStrategyView />);
    expect(screen.getByText('C2G 战略决策中心')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state when OMO status fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('OMO status unavailable'));
    renderWithProviders(<C2GStrategyView />);
    await waitFor(
      () => {
        expect(screen.getByText('OMO 状态加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders governance cards when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        system: {
          current_phase: 'M4',
          health_score: 87,
          completed_tasks: 42,
          active_tasks: 5,
          blocked_tasks: 2,
        },
        governance: {
          health_score: 91,
          anomaly_count: 3,
          total_tasks: 50,
          done: 45,
          planned: 5,
        },
      }),
    } as Response);
    renderWithProviders(<C2GStrategyView />);
    await waitFor(() => {
      expect(screen.getByText('M4')).toBeInTheDocument();
      expect(screen.getByText('87')).toBeInTheDocument();
    });
  });
});
