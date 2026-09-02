import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsView from '../SettingsView';

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

describe('SettingsView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while data is pending', () => {
    renderWithProviders(<SettingsView />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/metrics/history')) {
        throw new Error('network error');
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    renderWithProviders(<SettingsView />);
    await waitFor(
      () => {
        expect(screen.getByText(/指标加载失败/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders empty state when no metrics data', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/metrics/history')) {
        return { ok: true, json: async () => (null) } as Response;
      }
      if (url.includes('/api/instances')) {
        return { ok: true, json: async () => ([]) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    renderWithProviders(<SettingsView />);
    await waitFor(() => {
      expect(screen.getByText('暂无指标数据')).toBeInTheDocument();
    });
  });
});
