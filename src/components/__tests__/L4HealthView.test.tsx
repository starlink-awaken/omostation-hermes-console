import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import L4HealthView from '../L4HealthView';

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

describe('L4HealthView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while health data loads', () => {
    renderWithProviders(<L4HealthView />);
    expect(screen.getByText('L4 健康监控')).toBeInTheDocument();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state when health API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('health API unavailable'));
    renderWithProviders(<L4HealthView />);
    await waitFor(
      () => {
        expect(screen.getByText('健康数据不可用')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders domain health data when API returns data', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('/api/l4/health')) {
        return {
          ok: true,
          json: async () => ({
            timestamp: '2026-08-01T12:00:00Z',
            total_domains: 3,
            document_domains: 2,
            healthy_count: 2,
            unhealthy_count: 1,
            health_rate: '66.7%',
            data_quality: 'complete',
            degraded_reasons: [],
            domains: [
              { id: 'knowledge', name: '知识', exists: true, fresh: true, issue_count: 0, capabilities: ['search', 'index'] },
              { id: 'governance', name: '治理', exists: true, fresh: true, issue_count: 1, capabilities: ['policy'] },
              { id: 'infra', name: '基础设施', exists: true, fresh: false, issue_count: 0, capabilities: ['monitor'] },
            ],
          }),
        } as Response;
      }
      if (url.includes('/api/l4/trend')) {
        return {
          ok: true,
          json: async () => ({
            total_records: 0,
            date_range: { start: '2026-07-25', end: '2026-08-01' },
            trends: {},
            anomalies: [],
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          total_signals: 0,
          by_domain: {},
          by_type: {},
          patterns: [],
          risks: [],
        }),
      } as Response;
    });
    const { container } = renderWithProviders(<L4HealthView />);
    await waitFor(() => {
      expect(container.textContent).toContain('知识');
      expect(container.textContent).toContain('治理');
    });
  });
});
