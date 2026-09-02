/**
 * Component tests for key dashboard pages.
 *
 * Verifies that each component:
 *   - Renders without crashing
 *   - Shows loading state while data is pending
 *   - Shows key UI elements (headings, sections)
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn().mockResolvedValue({ data: null, error: null, ok: true }),
  apiPut: vi.fn().mockResolvedValue({ data: null, error: null, ok: true }),
  apiDelete: vi.fn().mockResolvedValue({ data: null, error: null, ok: true }),
}));

vi.mock('../../api/swarm', () => ({
  fetchSwarmStatus: vi.fn(),
}));

import { apiFetch } from '../../api/client';
import { fetchSwarmStatus } from '../../api/swarm';
import OverviewPage from '../OverviewPage';
import ComputeView from '../ComputeView';
import PerformanceMonitorPage from '../PerformanceMonitorPage';
import AlertCenterPage from '../AlertCenterPage';
import L4HealthView from '../L4HealthView';
import DebtView from '../DebtView';
import ObservabilityView from '../ObservabilityView';
import SandboxTerminal from '../SandboxTerminal';
import TaskCenterPage from '../TaskCenterPage';
import SettingsView from '../SettingsView';
import QuestBoard from '../QuestBoard';
import SwarmDashboard from '../SwarmDashboard';
import AssetsView from '../AssetsView';
import EnginesView from '../EnginesView';

function createTestClient() {
  return new QueryClient({
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
}

function renderPage(ui: React.ReactElement) {
  const client = createTestClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders loading state with service info', () => {
    renderPage(<OverviewPage />);
    expect(screen.getByText(/正在连接 Agora 服务网格/)).toBeInTheDocument();
    expect(screen.getByText(/活跃服务数/)).toBeInTheDocument();
  });

  it('renders page content when API fails', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('backend unavailable'));
    renderPage(<OverviewPage />);
    await waitFor(() => {
      expect(screen.getByText(/活跃服务数/)).toBeInTheDocument();
    });
  });

  it('renders services when API returns data', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      data: [
        { name: 'ecos-router', circuit: 'online', uptime: '99.9%', latency: '12ms' },
      ],
      error: null,
    });
    renderPage(<OverviewPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/ecos-router/).length).toBeGreaterThan(0);
    });
  });
});

describe('ComputeView', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders loading state', () => {
    renderPage(<ComputeView />);
    expect(screen.getAllByText(/算力调配/).length).toBeGreaterThan(0);
  });
});

describe('PerformanceMonitorPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => undefined)));
  });

  it('renders loading state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>(() => undefined)));
    renderPage(<PerformanceMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText(/加载中/)).toBeInTheDocument();
    });
  });
});

describe('AlertCenterPage', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<AlertCenterPage />);
    await waitFor(() => {
      expect(screen.getAllByText('告警中心').length).toBeGreaterThan(0);
    });
  });
});

describe('L4HealthView', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<L4HealthView />);
    await waitFor(() => {
      expect(screen.getAllByText(/L4/).length).toBeGreaterThan(0);
    });
  });
});

describe('DebtView', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<DebtView />);
    await waitFor(() => {
      expect(screen.getAllByText(/债务|治理|技术债/).length).toBeGreaterThan(0);
    });
  });
});

describe('ObservabilityView', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<ObservabilityView />);
    await waitFor(() => {
      expect(screen.getAllByText(/可观测|Observability/).length).toBeGreaterThan(0);
    });
  });
});

describe('SandboxTerminal', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<SandboxTerminal />);
    await waitFor(() => {
      expect(screen.getAllByText(/沙箱|Sandbox|KEI|隔离|执行/).length).toBeGreaterThan(0);
    });
  });
});

describe('TaskCenterPage', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<TaskCenterPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/任务|中心|刷新/).length).toBeGreaterThan(0);
    });
  });
});

describe('SettingsView', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<SettingsView />);
    await waitFor(() => {
      expect(screen.getAllByText(/设置|系统|配置|状态|运行/).length).toBeGreaterThan(0);
    });
  });
});

describe('QuestBoard', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<QuestBoard />);
    await waitFor(() => {
      expect(screen.getAllByText(/积分|QuestBoard|冒险|看板/).length).toBeGreaterThan(0);
    });
  });
});

describe('SwarmDashboard', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders loading state', async () => {
    vi.mocked(fetchSwarmStatus).mockImplementation(() => new Promise(() => undefined));
    renderPage(<SwarmDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/加载 swarm/)).toBeInTheDocument();
    });
  });

  it('renders error state when swarm data is null', async () => {
    // fetchSwarmStatus returns null on error (doesn't throw), triggering !data path
    vi.mocked(fetchSwarmStatus).mockResolvedValue(null);
    renderPage(<SwarmDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/swarm 状态获取失败/)).toBeInTheDocument();
    });
  });
});

describe('AssetsView', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => undefined));
  });

  it('renders page heading', async () => {
    renderPage(<AssetsView />);
    await waitFor(() => {
      expect(screen.getAllByText(/技术资产|Assets/).length).toBeGreaterThan(0);
    });
  });

  it('renders assets when API returns data', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      data: { assets: [{ id: 'skill-1', name: 'test-skill', type: 'agent-skill', status: 'active', version: '1.0' }] },
      error: null,
    });
    renderPage(<AssetsView />);
    await waitFor(() => {
      expect(screen.getAllByText(/test-skill/).length).toBeGreaterThan(0);
    });
  });
});

describe('EnginesView', () => {
  const mockEventSource = vi.fn(() => ({
    onmessage: null,
    onerror: null,
    close: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1,
  }));

  beforeEach(() => {
    vi.stubGlobal('EventSource', mockEventSource);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => undefined)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state', async () => {
    const stubbedFetch = vi.fn().mockImplementation(() => new Promise<Response>(() => undefined));
    vi.stubGlobal('fetch', stubbedFetch);

    // Mock EventSource properly so EnginesView can construct it
    class MockEventSource {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      readyState: number = 1;
      close = vi.fn();
      send = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
    }
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);

    renderPage(<EnginesView />);
    await waitFor(() => {
      expect(screen.getAllByText(/引擎|Engines|Loading/).length).toBeGreaterThan(0);
    });
  });
});
