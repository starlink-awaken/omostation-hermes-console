import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GovernanceSelfCheck from '../governance/GovernanceSelfCheck';

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0, refetchInterval: false, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const client = createTestClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const mockSelfCheckResult = {
  items: [
    { id: 'architecture-check', name: '架构漂移检查', status: 'PASS' as const, summary: '无漂移 detected', duration: 120 },
    { id: 'chaos-drill', name: '混沌演练', status: 'WARN' as const, summary: '1 项演练需关注', duration: 85 },
    { id: 'canvas-serve', name: '画布服务', status: 'PASS' as const, summary: '服务正常', duration: 200 },
    { id: 'ssot-status', name: 'SSOT 状态', status: 'PENDING' as const, summary: '等待执行' },
  ],
  overall: 'WARN' as const,
  timestamp: '2026-09-02T07:00:00Z',
};

describe('GovernanceSelfCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  describe('rendering', () => {
    it('renders the panel title', () => {
      renderWithProviders(<GovernanceSelfCheck />);
      expect(screen.getByText('治理自检')).toBeInTheDocument();
    });

    it('renders loading state while data is pending', () => {
      renderWithProviders(<GovernanceSelfCheck />);
      expect(screen.getByText(/加载中/)).toBeInTheDocument();
    });

    it('renders overall status badge after data loads', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getAllByText('WARN').length).toBeGreaterThan(0);
      });
    });

    it('renders all check items when data loads', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('架构漂移检查')).toBeInTheDocument();
        expect(screen.getByText('混沌演练')).toBeInTheDocument();
        expect(screen.getByText('画布服务')).toBeInTheDocument();
        expect(screen.getByText('SSOT 状态')).toBeInTheDocument();
      });
    });

    it('renders check item summaries', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('无漂移 detected')).toBeInTheDocument();
        expect(screen.getByText('1 项演练需关注')).toBeInTheDocument();
      });
    });
  });

  describe('status display', () => {
    it('displays PASS status with correct indicator', async () => {
      const passResult = {
        items: [{ id: 'architecture-check', name: '架构漂移检查', status: 'PASS' as const, summary: '通过', duration: 100 }],
        overall: 'PASS' as const,
        timestamp: '2026-09-02T07:00:00Z',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => passResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getAllByText('PASS').length).toBeGreaterThan(0);
      });
    });

    it('displays FAIL status when any check fails', async () => {
      const failResult = {
        items: [{ id: 'architecture-check', name: '架构漂移检查', status: 'FAIL' as const, summary: '失败', duration: 100 }],
        overall: 'FAIL' as const,
        timestamp: '2026-09-02T07:00:00Z',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => failResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getAllByText('FAIL').length).toBeGreaterThan(0);
      });
    });

    it('displays PENDING status for pending items', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('等待执行')).toBeInTheDocument();
      });
    });

    it('renders timestamp when data loads', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText(/2026-09-02/)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('renders error state when API fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'server error' }),
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(
        () => {
          expect(screen.getByText(/HTTP 500|Internal Server Error|加载失败|请求失败|错误|server error/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });

    it('renders empty state when no check items exist', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          overall: 'PASS' as const,
          timestamp: '2026-09-02T07:00:00Z',
        }),
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText(/暂无检查项|没有检查数据/)).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    it('renders a run check button', () => {
      renderWithProviders(<GovernanceSelfCheck />);
      expect(screen.getByRole('button', { name: /运行检查|执行检查|重新检查/ })).toBeInTheDocument();
    });

    it('renders a refresh button', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /刷新/ }).length).toBeGreaterThan(0);
      });
    });

    it('triggers mutation when run check button is clicked', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      const updatedResult = {
        ...mockSelfCheckResult,
        overall: 'PASS' as const,
        timestamp: '2026-09-02T07:05:00Z',
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('架构漂移检查')).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /运行检查|执行检查|重新检查/ });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(screen.getAllByText('PASS').length).toBeGreaterThan(0);
      });
    });

    it('disables run button while mutation is pending', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('架构漂移检查')).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /运行检查|执行检查|重新检查/ });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(runButton).toBeDisabled();
      });
    });

    it('refreshes data when refresh button is clicked', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      const refreshedResult = {
        ...mockSelfCheckResult,
        timestamp: '2026-09-02T07:10:00Z',
      };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => refreshedResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('架构漂移检查')).toBeInTheDocument();
      });

      const refreshButtons = screen.getAllByRole('button', { name: /刷新/ });
      fireEvent.click(refreshButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/2026-09-02T07:10/)).toBeInTheDocument();
      });
    });
  });
});
