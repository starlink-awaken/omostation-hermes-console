import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkflowsView from '../WorkflowsView';

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

describe('WorkflowsView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header with title', () => {
    renderWithProviders(<WorkflowsView />);
    expect(screen.getByText('MetaOS 工作流编排')).toBeInTheDocument();
  });

  it('renders loading state while data loads', () => {
    renderWithProviders(<WorkflowsView />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('workflow API error'));
    renderWithProviders(<WorkflowsView />);
    await waitFor(
      () => {
        expect(screen.getByText('工作流数据加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders workflow list when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflows: [
          { id: 'wf-1', name: '部署工作流', status: 'active', last_run: '2026-08-01' },
          { id: 'wf-2', name: '测试工作流', status: 'inactive', last_run: null },
        ],
      }),
    } as Response);
    renderWithProviders(<WorkflowsView />);
    await waitFor(() => {
      expect(screen.getByText(/部署工作流/)).toBeInTheDocument();
      expect(screen.getByText(/测试工作流/)).toBeInTheDocument();
    });
  });
});
