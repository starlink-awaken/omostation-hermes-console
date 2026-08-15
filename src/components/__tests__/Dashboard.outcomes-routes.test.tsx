import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import { DISCONNECTED_LABEL, OUTCOMES_TAB_LABELS } from '../outcomesDisplay';

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard wires /outcomes and /journeys', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockRejectedValue(new Error('backend unavailable'));
  });

  it('keeps /outcomes on the results panel instead of redirecting home', async () => {
    renderAt('/outcomes');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.pending })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.history })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.calibration })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /结果与校准/ }).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText(DISCONNECTED_LABEL).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('系统健康总览、实时告警、关键指标趋势。')).not.toBeInTheDocument();
  });

  it('keeps /journeys on the timeline instead of redirecting home', async () => {
    renderAt('/journeys');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /旅程时间线/ })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByText(DISCONNECTED_LABEL).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('系统健康总览、实时告警、关键指标趋势。')).not.toBeInTheDocument();
  });
});
