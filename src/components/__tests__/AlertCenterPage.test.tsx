import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AlertCenterPage from '../AlertCenterPage';

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

describe('AlertCenterPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders page heading', () => {
    renderWithProviders(<AlertCenterPage />);
    expect(screen.getByText('告警中心')).toBeInTheDocument();
  });

  it('renders tab navigation for active, history, and rules', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    renderWithProviders(<AlertCenterPage />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '活跃告警' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '历史告警' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '告警规则' })).toBeInTheDocument();
    });
  });

  it('renders error state when alerts API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('alerts unavailable'));
    renderWithProviders(<AlertCenterPage />);
    await waitFor(
      () => {
        expect(screen.getByText('告警数据加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders alert items when API returns data', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'alert-1',
            level: 'critical',
            source: 'ecos-router',
            message: 'Service offline',
            status: 'active',
            description: 'ecos-router is not responding',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    renderWithProviders(<AlertCenterPage />);
    await waitFor(() => {
      expect(screen.getByText('ecos-router')).toBeInTheDocument();
      expect(screen.getByText('Service offline')).toBeInTheDocument();
    });
  });

  it('renders empty state when no alerts', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    renderWithProviders(<AlertCenterPage />);
    await waitFor(() => {
      expect(screen.getByText('暂无活跃告警')).toBeInTheDocument();
    });
  });
});
