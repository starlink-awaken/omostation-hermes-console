import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskCenterPage from '../TaskCenterPage';

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

describe('TaskCenterPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header with title', () => {
    renderWithProviders(<TaskCenterPage />);
    expect(screen.getByText('任务中心')).toBeInTheDocument();
  });

  it('renders loading state while tasks load', () => {
    renderWithProviders(<TaskCenterPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('任务加载失败'));
    renderWithProviders(<TaskCenterPage />);
    await waitFor(
      () => {
        expect(screen.getByText(/任务加载失败/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders task items when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'task-1',
            title: '实现登录功能',
            description: '添加用户认证',
            status: 'in_progress',
            progress: 50,
            created_at: '2026-08-01',
            updated_at: '2026-08-02',
            priority: 'high',
            tags: ['frontend'],
          },
          {
            id: 'task-2',
            title: '优化数据库查询',
            description: '',
            status: 'pending',
            progress: 0,
            created_at: '2026-08-01',
            updated_at: '2026-08-01',
            priority: 'medium',
            tags: [],
          },
        ],
      }),
    } as Response);
    renderWithProviders(<TaskCenterPage />);
    await waitFor(() => {
      expect(screen.getByText('实现登录功能')).toBeInTheDocument();
      expect(screen.getByText('优化数据库查询')).toBeInTheDocument();
    });
  });

  it('renders empty state when no tasks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    } as Response);
    renderWithProviders(<TaskCenterPage />);
    await waitFor(() => {
      expect(screen.getByText('暂无任务')).toBeInTheDocument();
    });
  });
});
