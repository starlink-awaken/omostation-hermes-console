import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResearchHubView from '../ResearchHubView';

const mockResearchPayload = {
  status: 'ok',
  summary: {
    total: 3,
    active: 2,
    archived: 1,
    quarantined: 0,
    published: 1,
    follow_ups: 5,
    agents: 2,
  },
  recent: [
    {
      id: 1,
      topic: 'AI Agent 架构研究',
      summary: '研究 AI Agent 的架构演进',
      created_at: '2026-08-01T12:00:00Z',
      source_count: 5,
      tags: ['AI', 'Agent', '架构'],
      agent: 'research-agent-1',
      status: 'active',
      follow_up_count: 3,
      last_event: { type: 'created', label: '研究发起', created_at: '2026-08-01T12:00:00Z', description: '发起研究' },
      next_action: '继续追问第三点',
    },
    {
      id: 2,
      topic: '知识图谱构建',
      summary: '研究知识图谱构建方法',
      created_at: '2026-08-02T12:00:00Z',
      source_count: 2,
      tags: ['知识图谱'],
      agent: 'research-agent-2',
      status: 'active',
      follow_up_count: 2,
      last_event: { type: 'follow_up', label: '追问', created_at: '2026-08-02T12:00:00Z', description: '追问第二点' },
      next_action: '补充来源',
    },
  ],
  commands: [
    { id: 'cmd-1', label: '发起研究', value: 'cockpit research start', detail: '发起一条新研究' },
    { id: 'cmd-2', label: '查看研究', value: 'cockpit research list', detail: '查看研究列表' },
  ],
  pipeline: [
    { id: 'step-1', title: '发起研究', summary: '确定研究主题' },
    { id: 'step-2', title: '补上下文', summary: '补充来源和标签' },
    { id: 'step-3', title: '落任务', summary: '送进任务中心' },
  ],
  related_pages: [
    { id: 'Knowledge', title: '知识页', reason: '补充知识上下文' },
    { id: 'TaskCenter', title: '任务中心', reason: '承接研究任务' },
  ],
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ResearchHubView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/cockpit/research-hub') && !url.includes('/research-hub/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResearchPayload),
        });
      }
      if (url.includes('/api/cockpit/research-hub/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'ok',
            item: {
              id: 1,
              topic: 'AI Agent 架构研究',
              summary: '研究 AI Agent 的架构演进',
              full_text: '完整正文内容',
              created_at: '2026-08-01T12:00:00Z',
              source_count: 5,
              tags: ['AI', 'Agent'],
              follow_ups: [{ question: '追问1', answer: '' }],
              agent: 'research-agent-1',
              status: 'active',
            },
            timeline: [{ label: '研究发起', description: '发起研究', created_at: '2026-08-01T12:00:00Z' }],
            dossier: { parents: [], children: [], publications: [] },
          }),
        });
      }
      if (url.includes('/api/cockpit/research/') && url.includes('/queue')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'task-1' }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<ResearchHubView />);
    expect(screen.getByText('正在读取研究主旅程、最近研究对象和发布节奏...')).toBeTruthy();
  });

  it('renders research summary after loading', async () => {
    renderWithProviders(<ResearchHubView />);
    await waitFor(() => {
      expect(screen.getByText('研究主旅程')).toBeTruthy();
    });
    expect(screen.getByText('活跃研究')).toBeTruthy();
    expect(screen.getByText('已发布')).toBeTruthy();
  });

  it('renders research items', async () => {
    renderWithProviders(<ResearchHubView />);
    await waitFor(() => {
      expect(screen.getAllByText('AI Agent 架构研究').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('知识图谱构建').length).toBeGreaterThan(0);
  });

  it('renders pipeline', async () => {
    renderWithProviders(<ResearchHubView />);
    await waitFor(() => {
      expect(screen.getByText('研究到执行链')).toBeTruthy();
    });
  });

  it('renders closure table', async () => {
    renderWithProviders(<ResearchHubView />);
    await waitFor(() => {
      expect(screen.getByText('研究闭环总表')).toBeTruthy();
    });
  });

  it('renders workbench', async () => {
    renderWithProviders(<ResearchHubView />);
    await waitFor(() => {
      expect(screen.getByText('研究承接工作台')).toBeTruthy();
    });
  });
});
