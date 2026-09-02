import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GovernanceSelfCheck from '../GovernanceSelfCheck';

// ── QueryClient 测试包装器 ──
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

// ── 测试数据 ──
const mockSelfCheckResult = {
  items: [
    { id: 'check-1', name: 'SSOT 一致性', status: 'PASS' as const, summary: '所有 SSOT 注册表一致', duration: 120 },
    { id: 'check-2', name: 'ADR 覆盖率', status: 'WARN' as const, summary: '3 个模块缺少 ADR', details: '详见治理报告', duration: 85 },
    { id: 'check-3', name: '架构漂移检测', status: 'FAIL' as const, summary: '检测到 2 处架构漂移', details: 'Layer-Index 与实际不符', duration: 200 },
    { id: 'check-4', name: '场景卡保鲜', status: 'PENDING' as const, summary: '等待执行' },
  ],
  overall: 'WARN' as const,
  timestamp: '2026-09-02T07:00:00Z',
};

describe('GovernanceSelfCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  // ── 渲染测试 ──
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
        expect(screen.getByText('WARN')).toBeInTheDocument();
      });
    });

    it('renders all check items when data loads', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('SSOT 一致性')).toBeInTheDocument();
        expect(screen.getByText('ADR 覆盖率')).toBeInTheDocument();
        expect(screen.getByText('架构漂移检测')).toBeInTheDocument();
        expect(screen.getByText('场景卡保鲜')).toBeInTheDocument();
      });
    });

    it('renders check item summaries', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('所有 SSOT 注册表一致')).toBeInTheDocument();
        expect(screen.getByText('3 个模块缺少 ADR')).toBeInTheDocument();
        expect(screen.getByText('检测到 2 处架构漂移')).toBeInTheDocument();
      });
    });
  });

  // ── 状态变化测试 ──
  describe('status display', () => {
    it('displays PASS status with correct indicator', async () => {
      const passResult = {
        items: [{ id: 'c1', name: '测试项', status: 'PASS' as const, summary: '通过' }],
        overall: 'PASS' as const,
        timestamp: '2026-09-02T07:00:00Z',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => passResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('PASS')).toBeInTheDocument();
      });
    });

    it('displays FAIL status when any check fails', async () => {
      const failResult = {
        items: [{ id: 'c1', name: '测试项', status: 'FAIL' as const, summary: '失败' }],
        overall: 'FAIL' as const,
        timestamp: '2026-09-02T07:00:00Z',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => failResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('FAIL')).toBeInTheDocument();
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

  // ── 错误处理测试 ──
  describe('error handling', () => {
    it('renders error state when API fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('governance API unavailable'));
      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(
        () => {
          expect(screen.getByText(/加载失败|请求失败|错误/)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });

    it('renders error state when API returns non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'server error' }),
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(
        () => {
          expect(screen.getByText(/加载失败|请求失败|错误/)).toBeInTheDocument();
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

  // ── 交互测试 ──
  describe('interactions', () => {
    it('renders a run check button', () => {
      renderWithProviders(<GovernanceSelfCheck />);
      expect(screen.getByRole('button', { name: /运行检查|执行检查|重新检查/ })).toBeInTheDocument();
    });

    it('triggers mutation when run check button is clicked', async () => {
      // 初始查询返回数据
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      // mutation 返回新数据
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

      // 等待初始数据加载
      await waitFor(() => {
        expect(screen.getByText('SSOT 一致性')).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /运行检查|执行检查|重新检查/ });
      fireEvent.click(runButton);

      // 等待 mutation 完成
      await waitFor(() => {
        expect(screen.getByText('PASS')).toBeInTheDocument();
      });
    });

    it('disables run button while mutation is pending', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      // mutation 挂起，不立即返回
      vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('SSOT 一致性')).toBeInTheDocument();
      });

      const runButton = screen.getByRole('button', { name: /运行检查|执行检查|重新检查/ });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(runButton).toBeDisabled();
      });
    });

    it('expands item details when clicked', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSelfCheckResult,
      } as Response);

      renderWithProviders(<GovernanceSelfCheck />);

      await waitFor(() => {
        expect(screen.getByText('架构漂移检测')).toBeInTheDocument();
      });

      const failItem = screen.getByText('架构漂移检测').closest('[data-testid="self-check-item"]') ||
        screen.getByText('架构漂移检测').closest('.self-check-item') ||
        screen.getByText('架构漂移检测').parentElement;

      if (failItem) {
        fireEvent.click(failItem);
      }

      await waitFor(() => {
        expect(screen.getByText('Layer-Index 与实际不符')).toBeInTheDocument();
      });
    });
  });

  // ── 刷新测试 ──
  describe('refresh behavior', () => {
    it('renders a refresh button', () => {
      renderWithProviders(<GovernanceSelfCheck />);
      expect(screen.getByRole('button', { name: /刷新/ })).toBeInTheDocument();
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
        expect(screen.getByText('SSOT 一致性')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /刷新/ });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/2026-09-02T07:10/)).toBeInTheDocument();
      });
    });
  });
});
