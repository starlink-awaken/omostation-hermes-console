/**
 * Chain 工作室组件测试。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChainStudio from '../ChainStudio';
import ChainList from '../ChainList';
import type { ChainSummary } from '../ChainList';

// ── Helpers ──

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const MOCK_CHAINS: ChainSummary[] = [
  { id: 'chain-1', name: '构建部署链', description: '构建 → 部署', step_count: 4, source: 'ci' },
  { id: 'chain-2', name: '数据处理链', description: '采集 → 清洗', step_count: 3, source: 'etl' },
];

// ── Tests: ChainList ──

describe('ChainList', () => {
  it('renders chain names and step counts', () => {
    render(
      <ChainList chains={MOCK_CHAINS} selectedId={null} onSelect={() => {}} />,
    );
    expect(screen.getByText('构建部署链')).toBeInTheDocument();
    expect(screen.getByText('数据处理链')).toBeInTheDocument();
    expect(screen.getByText('4 步')).toBeInTheDocument();
    expect(screen.getByText('3 步')).toBeInTheDocument();
  });

  it('calls onSelect when a chain is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <ChainList chains={MOCK_CHAINS} selectedId={null} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByText('构建部署链'));
    expect(onSelect).toHaveBeenCalledWith('chain-1');
  });

  it('highlights the selected chain', () => {
    render(
      <ChainList chains={MOCK_CHAINS} selectedId="chain-1" onSelect={() => {}} />,
    );
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });
});

// ── Tests: ChainStudio ──

describe('ChainStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return demo data (API unavailable → fallback)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        available: true,
        chains: MOCK_CHAINS,
        total: 2,
      }),
    });
  });

  it('renders the page header', async () => {
    render(<ChainStudio />, { wrapper: createWrapper() });
    expect(screen.getByRole('heading', { name: '链路编排', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('多命令联动链路的 DAG 可视化与 dry-run 执行')).toBeInTheDocument();
  });

  it('renders chain list after loading', async () => {
    render(<ChainStudio />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('构建部署链')).toBeInTheDocument();
    });
    expect(screen.getByText('数据处理链')).toBeInTheDocument();
  });

  it('shows empty state when no chain is selected', async () => {
    render(<ChainStudio />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('构建部署链')).toBeInTheDocument();
    });
    expect(screen.getByText('选择链路')).toBeInTheDocument();
  });

  it('selects a chain when clicked', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          available: true,
          chains: MOCK_CHAINS,
          total: 2,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          available: true,
          id: 'chain-1',
          name: '构建部署链',
          description: '构建 → 部署',
          steps: [
            { name: '构建', command: 'make build' },
            { name: '部署', command: 'make deploy' },
          ],
        }),
      });

    render(<ChainStudio />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('构建部署链')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('构建部署链'));
    await waitFor(() => {
      expect(screen.getByText('DAG 可视化')).toBeInTheDocument();
    });
  });
});
