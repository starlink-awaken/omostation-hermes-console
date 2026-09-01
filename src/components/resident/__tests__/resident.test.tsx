import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResidentMonitor from '../ResidentMonitor';

function withQueryClient(children: React.ReactNode) {
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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('ResidentMonitor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton initially', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => {})) // never resolves
    );

    render(withQueryClient(<ResidentMonitor />));

    expect(screen.getByText('Agent 监控')).toBeInTheDocument();
    // LoadingSkeleton renders aria-busy elements
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders five role cards with ok status when API returns available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          available: true,
          status: 'ok',
          daemon: { running: true, version: '1.0.0' },
          events: [
            { timestamp: '2026-08-31T10:00:00Z', type: 'tick', description: '心跳事件' },
          ],
          sediment: [{ id: 's1', content: 'test' }],
          alert: [],
          ledger: [],
        }),
      })
    );

    render(withQueryClient(<ResidentMonitor />));

    await waitFor(() => {
      expect(screen.getByText('运行中')).toBeInTheDocument();
      // 五个角色标签都在角色卡中
      const roleLabels = screen.getAllByText('沉淀');
      expect(roleLabels.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('决策')).toBeInTheDocument();
      expect(screen.getByText('执行')).toBeInTheDocument();
      expect(screen.getByText('监控')).toBeInTheDocument();
      expect(screen.getByText('心跳')).toBeInTheDocument();
    });
  });

  it('renders degraded state when API returns available=false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          available: false,
          error: 'timeout',
        }),
      })
    );

    render(withQueryClient(<ResidentMonitor />));

    await waitFor(() => {
      expect(screen.getByText('API 不可达')).toBeInTheDocument();
      expect(screen.getByText(/timeout/)).toBeInTheDocument();
      // All five roles should show as failed
      const failedBadges = screen.getAllByText('不可达');
      expect(failedBadges.length).toBe(5);
    });
  });

  it('renders event stream table with timestamp, type, description columns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          available: true,
          status: 'ok',
          daemon: {},
          events: [
            {
              timestamp: '2026-08-31T10:00:00Z',
              type: 'workflow_start',
              description: '工作流已启动',
            },
          ],
          sediment: [],
          alert: [],
          ledger: [],
        }),
      })
    );

    render(withQueryClient(<ResidentMonitor />));

    await waitFor(() => {
      expect(screen.getByText('工作流已启动')).toBeInTheDocument();
      expect(screen.getByText('workflow_start')).toBeInTheDocument();
    });
  });

  it('renders degraded state with error message when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network offline'))
    );

    render(withQueryClient(<ResidentMonitor />));

    await waitFor(() => {
      // fetch 抛错时 apiFetch 返回降级数据，组件展示降级态
      expect(screen.getByText('API 不可达')).toBeInTheDocument();
      expect(screen.getByText(/Network offline/)).toBeInTheDocument();
    });
  });
});
