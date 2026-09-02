import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SwarmDashboard from '../SwarmDashboard';

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

describe('SwarmDashboard', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while data loads', () => {
    renderWithProviders(<SwarmDashboard />);
    expect(screen.getByText('加载 swarm 状态...')).toBeInTheDocument();
  });

  it('renders error state when backend is unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'));
    renderWithProviders(<SwarmDashboard />);
    await waitFor(
      () => {
        expect(screen.getByText(/swarm 状态获取失败/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders swarm data when API returns data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        active_nodes: 3,
        total_nodes: 5,
        data_quality: 'complete',
        nodes: [{ name: 'worker-1', status: 'online', type: 'worker' }],
        degraded_reasons: [],
        recommended_next: [],
        workflow: { active_count: 1, run_count: 5, current_run_id: 'run-1', lock_count: 0, stale_locks: 0, active_runs: ['run-1'] },
        window: { conflict_count: 0, verdict: 'clear' },
        claims: { active_count: 2, sessions: ['sess-1', 'sess-2'] },
        compliance: { decision: 'approved' },
      }),
    } as Response);
    const { container } = renderWithProviders(<SwarmDashboard />);
    await waitFor(() => {
      expect(container.textContent).toContain('活跃 Runs');
    });
  });
});
