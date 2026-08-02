import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../HomePage';

describe('HomePage truthfulness contract', () => {
  it('shows a loading state while real data is pending', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));

    render(<HomePage />);

    expect(screen.getByText('正在读取真实首页数据')).toBeInTheDocument();
    expect(screen.getByText('正在读取真实健康数据。')).toBeInTheDocument();
    expect(screen.getByText('正在读取真实告警数据')).toBeInTheDocument();
    expect(screen.getByText('正在读取真实任务数据')).toBeInTheDocument();
  });

  it('does not present placeholder tasks or metrics when the backend is unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('backend unavailable'));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('首页数据暂不可用，当前未展示模拟或默认运行状态。')).toBeInTheDocument();
    });

    expect(screen.getByText('告警数据暂不可用，未展示占位告警')).toBeInTheDocument();
    expect(screen.getByText('任务数据暂不可用，未展示占位任务')).toBeInTheDocument();
    expect(screen.getAllByText('暂无真实数据')).toHaveLength(3);
    expect(screen.queryByText('L4 域优化')).not.toBeInTheDocument();
    expect(screen.queryByText('TASK-001')).not.toBeInTheDocument();
  });

  it('keeps successful source data visible while marking failed sources as partial', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url === '/api/health/summary') {
        return new Response(JSON.stringify({
          health_score: 87,
          health_score_change: -1,
          active_services: 4,
          total_services: 5,
          active_tasks: 1,
          today_requests: 42,
          today_requests_change: 3,
        }), { status: 200 });
      }
      if (url.startsWith('/api/alerts')) {
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }
      if (url.startsWith('/api/tasks')) {
        return new Response(JSON.stringify({ items: [{ id: 'REAL-001', title: '真实任务', status: 'pending', progress: 0, updated_at: '2026-08-02T00:00:00Z' }] }), { status: 200 });
      }
      if (url.startsWith('/api/metrics')) {
        return new Response('metrics unavailable', { status: 503 });
      }
      if (url.startsWith('/api/omos/thoughts')) {
        return new Response(JSON.stringify({ status: 'ok', thoughts: [] }), { status: 200 });
      }
      return new Response('governance unavailable', { status: 503 });
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/首页部分数据暂不可用：指标趋势/)).toBeInTheDocument();
      expect(screen.getByText('87')).toBeInTheDocument();
      expect(screen.getByText('真实任务')).toBeInTheDocument();
    });

    expect(screen.getByText('指标数据：不可用')).toBeInTheDocument();
    expect(screen.queryByText('TASK-001')).not.toBeInTheDocument();
  });
});
