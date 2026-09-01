import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtocolWorkbenchView from '../ProtocolWorkbenchView';

const mockProtocolPayload = {
  status: 'ok',
  summary: {
    workflow_definitions: 5,
    workflow_actions: 10,
    workflow_backends: 3,
    recent_runs: 2,
    ready_layers: 3,
    watch_layers: 1,
    page_score: 75,
  },
  layers: [
    {
      id: 'layer-1',
      title: 'Ecos 协议层',
      status: 'ready',
      role: '定义层',
      facts: ['MOF 已注册', 'model-driven 已接通'],
      next_action: '继续巡检下一层',
    },
    {
      id: 'layer-2',
      title: 'Workflow 桥接层',
      status: 'watch',
      role: '运行层',
      facts: ['最近运行未闭环'],
      next_action: '排查 workflow 运行记录',
    },
  ],
  recent_workflows: [
    { id: 'wf-1', task: '协议巡检', status: 'completed', updated_at: '2026-08-01T12:00:00Z' },
    { id: 'wf-2', task: '补证执行', status: 'running', updated_at: '2026-08-02T12:00:00Z' },
  ],
  commands: [
    { id: 'cmd-1', label: '检查协议层', value: 'cockpit protocol check', detail: '检查协议层完整性' },
  ],
  related_pages: [
    { id: 'Assets', title: '资产页', reason: '查看协议层资产' },
    { id: 'SystemMap', title: '系统地图', reason: '查看治理承接' },
  ],
  roadmap_item: { id: 'roadmap-1', title: '协议层补位', priority: 'P1', problem: 'workflow 桥接层未闭环' },
  playbook: { id: 'playbook-1', title: '协议层巡检清单', goal: '每周巡检协议层完整性' },
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProtocolWorkbenchView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url: string) => {
      if (url.includes('/api/cockpit/protocol-hub')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProtocolPayload),
        });
      }
      if (url === '/api/tasks') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'task-1', title: '协议任务' }),
          statusText: 'OK',
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<ProtocolWorkbenchView />);
    expect(screen.getByText('正在读取 ecos、model-driven、workflow 和治理桥接状态...')).toBeTruthy();
  });

  it('renders protocol summary after loading', async () => {
    renderWithProviders(<ProtocolWorkbenchView />);
    await waitFor(() => {
      expect(screen.getByText('协议与元模型操作面')).toBeTruthy();
    });
    expect(screen.getByText('workflow 定义')).toBeTruthy();
    expect(screen.getByText('页面成熟度')).toBeTruthy();
  });

  it('renders protocol layers', async () => {
    renderWithProviders(<ProtocolWorkbenchView />);
    await waitFor(() => {
      expect(screen.getAllByText('Ecos 协议层').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Workflow 桥接层').length).toBeGreaterThan(0);
  });

  it('renders roadmap and playbook', async () => {
    renderWithProviders(<ProtocolWorkbenchView />);
    await waitFor(() => {
      expect(screen.getAllByText('协议层补位').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('协议层巡检清单').length).toBeGreaterThan(0);
  });

  it('renders closure table', async () => {
    renderWithProviders(<ProtocolWorkbenchView />);
    await waitFor(() => {
      expect(screen.getByText('协议闭环总表')).toBeTruthy();
    });
  });
});
