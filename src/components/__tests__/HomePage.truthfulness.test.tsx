import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '../HomePage';
describe('HomePage truthfulness contract', () => {
  it('shows a loading state while real data is pending', () => { vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined)); render(<HomePage />); expect(screen.getByText('正在读取真实首页数据')).toBeInTheDocument(); });
  it('does not present placeholder tasks or metrics when the backend is unavailable', async () => { vi.mocked(fetch).mockRejectedValue(new Error('backend unavailable')); render(<HomePage />); await waitFor(() => expect(screen.getByText('首页数据暂不可用，当前未展示模拟或默认运行状态。')).toBeInTheDocument()); expect(screen.getByText('任务数据暂不可用，未展示占位任务')).toBeInTheDocument(); expect(screen.getAllByText('暂无真实数据')).toHaveLength(3); expect(screen.queryByText('L4 域优化')).not.toBeInTheDocument(); expect(screen.queryByText('TASK-001')).not.toBeInTheDocument(); });
});
