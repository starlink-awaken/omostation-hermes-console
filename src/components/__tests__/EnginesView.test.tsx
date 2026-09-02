import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EnginesView from '../EnginesView';

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

describe('EnginesView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header with title', () => {
    renderWithProviders(<EnginesView />);
    expect(screen.getByText('引擎调度总线')).toBeInTheDocument();
  });

  it('renders loading state while pipelines load', () => {
    renderWithProviders(<EnginesView />);
    expect(screen.getByText('正在读取调度引擎管线...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/pipelines')) {
        throw new Error('引擎 API 不可用');
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    renderWithProviders(<EnginesView />);
    await waitFor(
      () => {
        expect(screen.getByText('引擎数据加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders pipeline list when data loads', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/pipelines')) {
        return {
          ok: true,
          json: async () => ({ pipelines: ['pipeline-alpha', 'pipeline-beta', 'pipeline-gamma'] }),
        } as Response;
      }
      if (url.includes('/api/cockpit/engine/queue')) {
        return { ok: true, json: async () => ({}) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    renderWithProviders(<EnginesView />);
    await waitFor(() => {
      expect(screen.getByText('pipeline-alpha')).toBeInTheDocument();
    });
  });
});
