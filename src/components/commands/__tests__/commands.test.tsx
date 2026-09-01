import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../api/client', () => ({
  apiFetch: vi.fn(),
}));

import CommandExplorer from '../CommandExplorer';
import { apiFetch } from '../../../api/client';

const mockData = {
  available: true,
  commands: [
    {
      name: 'agent-status',
      summary: '查看 Agent 运行状态',
      category: 'agent',
      example: 'cockpit agent-status --id agent-001',
      owner: 'platform',
      maturity: 'stable' as const,
      risk: 'low' as const,
      delegated_target: '',
      chain_enabled: true,
    },
    {
      name: 'workflow-deploy',
      summary: '部署工作流到目标环境',
      category: 'workflow',
      example: 'cockpit workflow-deploy --target prod',
      owner: 'devops',
      maturity: 'beta' as const,
      risk: 'medium' as const,
      delegated_target: 'k8s',
      chain_enabled: false,
    },
    {
      name: 'data-migrate',
      summary: '实验性数据迁移工具',
      category: 'data',
      example: 'cockpit data-migrate --from old --to new',
      owner: 'data-team',
      maturity: 'experimental' as const,
      risk: 'high' as const,
      delegated_target: 'spark',
      chain_enabled: true,
    },
  ],
  groups: [
    { key: 'agent', label: 'Agent', count: 1 },
    { key: 'workflow', label: 'Workflow', count: 1 },
    { key: 'data', label: 'Data', count: 1 },
  ],
  guide_sections: [
    { title: '快速开始', description: '常用命令入门', commands: ['agent-status'] },
  ],
  scenarios: [
    { name: '日常运维', description: '日常检查 Agent 状态', steps: ['运行 agent-status'] },
  ],
  total: 3,
};

function renderWithQueryClient() {
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
  return render(
    <QueryClientProvider client={client}>
      <CommandExplorer />
    </QueryClientProvider>,
  );
}

describe('CommandExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton while fetching', () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}),
    );
    renderWithQueryClient();
    expect(screen.getAllByLabelText('加载中').length).toBeGreaterThan(0);
  });

  it('renders commands after successful fetch', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockData,
      error: null,
      ok: true,
    });
    renderWithQueryClient();
    await waitFor(() => {
      expect(screen.getAllByText('agent-status').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('workflow-deploy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('data-migrate').length).toBeGreaterThan(0);
  });

  it('renders empty state on error', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: 'backend unavailable',
      ok: false,
    });
    renderWithQueryClient();
    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeInTheDocument();
    });
  });

  it('filters commands by search query', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockData,
      error: null,
      ok: true,
    });
    renderWithQueryClient();
    await waitFor(() => {
      expect(screen.getAllByText('agent-status').length).toBeGreaterThan(0);
    });
    const searchInput = screen.getByPlaceholderText('搜索命令名、摘要或类别...');
    fireEvent.change(searchInput, { target: { value: 'data-migrate' } });
    await waitFor(() => {
      expect(screen.getAllByText('data-migrate').length).toBeGreaterThan(0);
    });
    // command cards for other commands should be filtered out
    const codeElements = document.querySelectorAll('code.text-sm');
    const cardNames = Array.from(codeElements).map(el => el.textContent);
    expect(cardNames).toContain('data-migrate');
    expect(cardNames).not.toContain('agent-status');
    expect(cardNames).not.toContain('workflow-deploy');
  });

  it('renders maturity and risk badges', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockData,
      error: null,
      ok: true,
    });
    renderWithQueryClient();
    await waitFor(() => {
      expect(screen.getAllByText('agent-status').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('stable').length).toBeGreaterThan(0);
    expect(screen.getAllByText('beta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('experimental').length).toBeGreaterThan(0);
    expect(screen.getAllByText('low').length).toBeGreaterThan(0);
    expect(screen.getAllByText('medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('high').length).toBeGreaterThan(0);
  });

  it('renders guide sections and scenarios', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockData,
      error: null,
      ok: true,
    });
    renderWithQueryClient();
    await waitFor(() => {
      expect(screen.getByText('选型引导')).toBeInTheDocument();
    });
    expect(screen.getByText('快速开始')).toBeInTheDocument();
    expect(screen.getByText('典型场景')).toBeInTheDocument();
    expect(screen.getByText('日常运维')).toBeInTheDocument();
  });
});
