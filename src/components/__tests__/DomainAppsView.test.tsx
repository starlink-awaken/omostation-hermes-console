import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
}));

import DomainAppsView from '../DomainAppsView';
import { apiFetch } from '../../api/client';

const mockDomainAppsPayload = {
  strategy: 'test',
  summary: {
    total: 2,
    ready: 1,
    needs_attention: 1,
    running: 1,
    stopped: 1,
    high_risk: 0,
    external_mounts: 0,
    security_passed: 1,
    security_warn: 1,
    security_failed: 0,
    security_blocking: 0,
    security_attention_apps: 1,
  },
  items: [
    {
      id: 'app-1',
      name: 'Test App 1',
      domain: { id: 'domain-1', name: 'Test Domain' },
      kind: 'web',
      integration_mode: 'embedded',
      layer: 'L3',
      risk_level: 'low',
      health: 'ready',
      runtime: {
        status: 'running',
        launch: { status: 'running', url: 'http://localhost:3000', checked: true, port: 3000 },
        api: { status: 'listening', url: 'http://localhost:3001', checked: true, port: 3001 },
      },
      warnings: [],
      paths: {
        ssot_root: { path: '/ssot/app-1', exists: true, updated_at: '2026-08-01T12:00:00Z' },
        app_root: { path: '/apps/app-1', exists: true, updated_at: '2026-08-01T12:00:00Z' },
      },
      links: { launch_url: 'http://localhost:3000', api_url: 'http://localhost:3001' },
      actions: [
        { id: 'open', label: '打开应用', kind: 'open_url', value: 'http://localhost:3000', enabled: true, risk: 'low', guard: '打开应用' },
        { id: 'copy-start', label: '复制启动命令', kind: 'copy_command', value: 'bun dev', enabled: true, risk: 'low', guard: '复制命令' },
        { id: 'copy-verify', label: '复制验证命令', kind: 'copy_command', value: 'bun test', enabled: true, risk: 'low', guard: '复制验证' },
      ],
      security_gates: [],
      security_checks: [
        { id: 'check-1', status: 'passed', level: 'low', title: '检查1', detail: '通过', evidence: '证据', next_action: '无', blocking: false },
      ],
      security_summary: { posture: 'passed', total: 1, passed: 1, warn: 0, failed: 0, blocking: 0, attention: 0, high_risk_open: 0 },
      commands: { start: 'bun dev', verify: ['bun test'] },
      capabilities: { read: ['read-data'], write: ['write-data'] },
      auth: { type: 'apikey' },
      freshness: { status: 'fresh', updated_at: '2026-08-01T12:00:00Z' },
      notes: ['Test note'],
    },
    {
      id: 'app-2',
      name: 'Test App 2',
      domain: { id: 'domain-1', name: 'Test Domain' },
      kind: 'cli',
      integration_mode: 'external',
      layer: 'L3',
      risk_level: 'high',
      health: 'needs_attention',
      runtime: {
        status: 'stopped',
        launch: { status: 'stopped', checked: true },
        api: { status: 'not_configured', checked: false },
      },
      warnings: ['需要关注'],
      paths: {
        ssot_root: null,
        app_root: null,
      },
      links: {},
      actions: [],
      security_gates: [],
      security_checks: [
        { id: 'check-2', status: 'warn', level: 'medium', title: '检查2', detail: '警告', evidence: '证据', next_action: '处理', blocking: false },
      ],
      security_summary: { posture: 'warn', total: 1, passed: 0, warn: 1, failed: 0, blocking: 0, attention: 1, high_risk_open: 0 },
      commands: { verify: [] },
      capabilities: { read: [], write: [] },
      auth: {},
      freshness: {},
      notes: [],
    },
  ],
};

const mockOpcWorkspace = {
  exists: true,
  ssot_root: '@OPC',
  updated_at: '2026-08-01T12:00:00Z',
  positioning: { title: 'OPC', summary: 'OPC 作战台' },
  weekly_priorities: [{ title: '本周重点', detail: '完成领域应用接入' }],
  content_calendar: { week: [], ideas: [] },
  metrics: [],
  product_portfolio: { matrix: [], pipeline: [], revenue: [] },
};

const mockSystemMap = {
  cockpit_pages: [{ id: 'DomainApps', title: '领域应用' }],
  project_portfolio: { priority_projects: [] },
  roadmap: { items: [] },
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DomainAppsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/domain-apps') {
        return Promise.resolve({ ok: true, data: mockDomainAppsPayload, error: null });
      }
      if (url === '/api/opc/workspace') {
        return Promise.resolve({ ok: true, data: mockOpcWorkspace, error: null });
      }
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve({ ok: true, data: mockSystemMap, error: null });
      }
      return Promise.resolve({ ok: false, data: null, error: 'Unknown endpoint' });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    renderWithProviders(<DomainAppsView />);
    expect(screen.getByText('正在加载领域应用...')).toBeTruthy();
  });

  it('renders domain apps after loading', async () => {
    renderWithProviders(<DomainAppsView />);
    await waitFor(() => {
      expect(screen.getAllByText('Test App 1').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Test App 2').length).toBeGreaterThan(0);
  });

  it('renders stats summary', async () => {
    renderWithProviders(<DomainAppsView />);
    await waitFor(() => {
      expect(screen.getByText('登记应用')).toBeTruthy();
    });
    expect(screen.getAllByText('高风险').length).toBeGreaterThan(0);
  });

  it('renders OPC workspace section', async () => {
    renderWithProviders(<DomainAppsView />);
    await waitFor(() => {
      expect(screen.getAllByText('OPC 作战台').length).toBeGreaterThan(0);
    });
  });

  it('renders attention workbench', async () => {
    renderWithProviders(<DomainAppsView />);
    await waitFor(() => {
      expect(screen.getByText('领域关注工作台')).toBeTruthy();
    });
  });

  it('renders contract matrix', async () => {
    renderWithProviders(<DomainAppsView />);
    await waitFor(() => {
      expect(screen.getByText('挂载合同矩阵')).toBeTruthy();
    });
  });
});
