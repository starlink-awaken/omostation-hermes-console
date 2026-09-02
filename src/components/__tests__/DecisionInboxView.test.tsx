import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DecisionInboxView from '../DecisionInboxView';

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

describe('DecisionInboxView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header with title', () => {
    renderWithProviders(<DecisionInboxView />);
    expect(screen.getByText('决策收件箱')).toBeInTheDocument();
  });

  it('renders loading state while data loads', () => {
    renderWithProviders(<DecisionInboxView />);
    expect(screen.getByText(/加载/)).toBeInTheDocument();
  });

  it('renders overview with default values when API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('inbox API unavailable'));
    renderWithProviders(<DecisionInboxView />);
    await waitFor(
      () => {
        expect(screen.getByText('场景数')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders empty state when no scenes', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/decision-inbox/scenes')) {
        return { ok: true, json: async () => ({ ok: true, scenes: [] }) } as Response;
      }
      if (url.includes('/api/decision-inbox/summary')) {
        return { ok: true, json: async () => ({ ok: true, summary: { scene_count: 0, total_intents: 0, pending_intents: 0, by_source: {} } }) } as Response;
      }
      if (url.includes('/api/decision-inbox/approvals/queue')) {
        return { ok: true, json: async () => ({ ok: true, queue: [], total: 0 }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    const { container } = renderWithProviders(<DecisionInboxView />);
    await waitFor(() => {
      const scenesTab = screen.getByText('场景列表');
      fireEvent.click(scenesTab);
    });
    await waitFor(() => {
      expect(screen.getByText('暂无场景，创建一个开始')).toBeInTheDocument();
    });
  });
});
