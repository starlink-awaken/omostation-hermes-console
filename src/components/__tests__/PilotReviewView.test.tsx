import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PilotReviewView from '../PilotReviewView';

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

describe('PilotReviewView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header with title', () => {
    renderWithProviders(<PilotReviewView />);
    expect(screen.getByText('试点复盘')).toBeInTheDocument();
  });

  it('renders loading state while data loads', () => {
    renderWithProviders(<PilotReviewView />);
    expect(screen.getAllByText(/加载/)[0]).toBeInTheDocument();
  });

  it('renders empty state when no review data', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('weekly-review')) {
        return { ok: true, json: async () => ({ distribution: { by_source: {}, by_priority: {} }, total_tasks: 0 }) } as Response;
      }
      if (url.includes('pilot')) {
        return { ok: true, json: async () => ({ connStats: { total_errors: 0 } }) } as Response;
      }
      if (url.includes('connector')) {
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    renderWithProviders(<PilotReviewView />);
    await waitFor(() => {
      expect(screen.getByText('暂无复盘数据')).toBeInTheDocument();
    });
  });
});
