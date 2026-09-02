import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DebtView from '../DebtView';

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

describe('DebtView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while debt data loads', () => {
    renderWithProviders(<DebtView />);
    expect(screen.getByText('技术债务治理舱')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('debt API unavailable'));
    renderWithProviders(<DebtView />);
    await waitFor(
      () => {
        expect(screen.getByText('债务数据加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders debt items when API returns data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: 2,
        open: 1,
        closed: 1,
        items: [
          { id: 'debt-1', title: 'Missing tests for component X', severity: 'high', lifecycle_state: 'open', opened_at: '2026-01-01', owner: 'team-a', dimension: 'test-coverage' },
          { id: 'debt-2', title: 'Duplicate code in Y', severity: 'medium', lifecycle_state: 'closed', opened_at: '2026-01-02', owner: 'team-b', dimension: 'duplication' },
        ],
      }),
    } as Response);
    renderWithProviders(<DebtView />);
    await waitFor(() => {
      expect(screen.getByText('Missing tests for component X')).toBeInTheDocument();
      expect(screen.getByText('Duplicate code in Y')).toBeInTheDocument();
    });
  });

  it('shows empty state when no debt items exist', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 0, open: 0, closed: 0, items: [] }),
    } as Response);
    renderWithProviders(<DebtView />);
    await waitFor(() => {
      expect(screen.getByText('暂无技术债务')).toBeInTheDocument();
    });
  });
});
