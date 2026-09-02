import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
import { ApiProvider } from '../../api/provider';
import Dashboard from '../Dashboard';

export type RouteMeta = {
  id: string;
  path: string;
  label: string;
  group: string;
  hidden?: boolean;
};

export interface RouteFixture {
  path: string;
  label: string;
  group: string;
  heading: RegExp | string;
  /** fetch endpoints that the page is expected to call */
  endpoints?: string[];
  /** extra aria-labels or roles to assert in addition to the heading */
  extra?: Array<{ role: string; name: string | RegExp }>;
}

/**
 * Every route in the app as exported by src/routes.tsx.
 * This is the single source of truth for route-level E2E tests — when a
 * route is added/removed here the test data must be kept in sync.
 */
export const ALL_ROUTES: RouteMeta[] = [
  { id: 'Home',          path: '/',                        label: '首页',           group: '首页' },
  { id: 'Guide',         path: '/guide',                   label: '驾驶舱指南',      group: '首页' },
  { id: 'SystemMap',     path: '/system-map',              label: '系统地图',        group: '首页' },
  { id: 'Capabilities',  path: '/capabilities',            label: '能力全景',        group: '首页' },

  { id: 'Overview',      path: '/overview',                 label: '概览中心',        group: '运行大盘' },
  { id: 'McpMesh',       path: '/mesh',                    label: '网格与 MCP',      group: '运行大盘' },
  { id: 'Topology',      path: '/topology',                 label: '全局拓扑',        group: '运行大盘' },
  { id: 'Compute',       path: '/compute',                  label: '算力调配',        group: '运行大盘' },

  { id: 'Research',      path: '/research',                 label: '研究中心',        group: '智能与知识' },
  { id: 'Knowledge',     path: '/knowledge',                label: '知识中枢',        group: '智能与知识' },
  { id: 'KnowledgeAction', path: '/knowledge-action',       label: '知识到行动',      group: '智能与知识' },
  { id: 'Engines',       path: '/engines',                  label: '引擎调度',        group: '智能与知识' },
  { id: 'Assets',        path: '/assets',                   label: '技术资产库',      group: '智能与知识' },
  { id: 'Protocol',      path: '/protocol',                 label: '协议工作台',      group: '智能与知识' },
  { id: 'Kems',          path: '/kems',                     label: 'KEMS 质量治理',   group: '智能与知识' },
  { id: 'SceneCards',    path: '/scene-cards',              label: '场景卡评审',      group: '智能与知识' },
  { id: 'ExternalResources', path: '/external-resources', label: '外部能力目录',    group: '智能与知识' },
  { id: 'Brain',         path: '/brain',                    label: '个人数字大脑',     group: '智能助手' },
  { id: 'KnowledgeFlow', path: '/knowledge-flow',          label: '知识流动',        group: '智能与知识' },
  { id: 'Workflows',     path: '/workflows',                label: '工作流',          group: '智能与知识' },

  { id: 'AlertCenter',   path: '/alerts',                   label: '告警中心',        group: '系统治理' },
  { id: 'L4Health',      path: '/l4-health',                label: 'L4 域健康',       group: '系统治理' },
  { id: 'Debt',          path: '/debt',                     label: '债务治理',        group: '系统治理' },
  { id: 'Observability', path: '/observability',            label: '可观测性',        group: '系统治理' },
  { id: 'DeliveryJourney', path: '/delivery-journey',       label: '工程交付旅程',    group: '系统治理' },
  { id: 'Outcomes',      path: '/outcomes',                 label: '结果与校准',      group: '系统治理' },
  { id: 'JourneysTimeline', path: '/journeys',              label: '旅程时间线',      group: '系统治理' },
  { id: 'WorkflowMeshOperations', path: '/workflow-mesh-operations', label: '运营闭环', group: '系统治理' },
  { id: 'C2G',           path: '/c2g',                     label: 'C2G 战略中心',     group: '系统治理' },
  { id: 'Wave2',         path: '/wave2',                    label: 'Wave2 预测面板',  group: '系统治理' },
  { id: 'GBrainAdmin',   path: '/gbrain-admin',             label: 'GBrain 管理',     group: '系统治理' },
  { id: 'Swarm',         path: '/swarm',                    label: 'Swarm 协同',      group: '系统治理' },

  { id: 'LogViewer',     path: '/logs',                     label: '日志查看器',      group: '开发工具' },
  { id: 'TaskCenter',    path: '/tasks',                    label: '任务中心',        group: '开发工具' },
  { id: 'Performance',   path: '/performance',                label: '性能监控',        group: '开发工具' },
  { id: 'Sandbox',       path: '/sandbox',                  label: '隔离沙箱',        group: '开发工具' },

  { id: 'QuestBoard',    path: '/quests',                   label: '积分冒险',        group: '领域应用' },
  { id: 'DomainApps',    path: '/domain-apps',              label: '领域应用',        group: '领域应用' },
  { id: 'DigitalBrain',  path: '/digital-brain',            label: '数字大脑',        group: '领域应用' },

  { id: 'Settings',      path: '/settings',                 label: '系统设置',        group: '系统配置' },

  { id: 'EcosWorkflow',  path: '/workbench/ecos-workflow',  label: 'eCOS 工作流',     group: '工作台' },
  { id: 'GovernanceDomain', path: '/workbench/governance-domain', label: '治理域',     group: '工作台' },
  { id: 'InfrastructureOps', path: '/workbench/infrastructure-ops', label: '基础设施运维', group: '工作台' },
  { id: 'KnowledgeExecution', path: '/workbench/knowledge-execution', label: '知识执行', group: '工作台' },
  { id: 'KOSWorkbench',  path: '/workbench/kos',              label: 'KOS 工作台',      group: '工作台' },
  { id: 'MemoryInjector', path: '/workbench/memory-injector', label: '记忆注入',     group: '工作台' },
  { id: 'PlatformControl', path: '/workbench/platform-control', label: '平台控制',    group: '工作台' },
  { id: 'RuntimeOps',    path: '/workbench/runtime-ops',      label: '运行时运维',      group: '工作台' },
  { id: 'SystemAssurance', path: '/workbench/system-assurance', label: '系统保障',    group: '工作台' },
];

/**
 * Create a QueryClient with retry disabled for fast, deterministic tests.
 */
export function createTestQueryClient() {
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

/**
 * Shared render helper: wraps children in ApiProvider + BrowserRouter.
 */
export function renderWithProviders(ui: ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ApiProvider>{ui}</ApiProvider>
    </QueryClientProvider>,
  );
}

/**
 * Mock-fetch helper for route-level tests.
 * Returns a fetch mock that responds with `{ ok: true, status: 200, json: … }`
 * for every call.  Tests can override specific paths if needed.
 */
export function setupMockFetch(
  overrides: Record<string, unknown> = {},
) {
  const defaultResponse: unknown = {
    ok: true,
    status: 200,
    json: async () => ({}),
  };

  const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (overrides[url]) {
      return {
        ok: true,
        status: 200,
        json: async () => overrides[url],
      };
    }
    return defaultResponse;
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/**
 * Mock fetch to reject for every call — used by disconnected-state tests.
 */
export function setupMockFetchError(message = 'backend unavailable') {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)));
}

/**
 * Render the full Dashboard at a given path inside MemoryRouter.
 * Returns the RTL render + user utilities.
 */
export function renderDashboardAt(
  path: string,
  options?: {
    queryClient?: QueryClient;
    initialEntries?: string[];
  },
) {
  const client = options?.queryClient ?? createTestQueryClient();
  const initialEntries = options?.initialEntries ?? [path];

  return {
    ...render(
      <QueryClientProvider client={client}>
        <ApiProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Dashboard />
          </MemoryRouter>
        </ApiProvider>
      </QueryClientProvider>,
    ),
    user: userEvent,
    queryClient: client,
  };
}

/**
 * Minimal route-aware test harness that mirrors the real <App /> structure
 * (ApiProvider + BrowserRouter + Routes).  Useful for testing a single
 * lazy-loaded route in isolation with proper Suspense boundary.
 */
export function renderRouteAt(
  routePath: string,
  element: ReactElement,
  options?: { queryClient?: QueryClient },
) {
  const client = options?.queryClient ?? createTestQueryClient();

  const TestRoutes = () => (
    <Routes>
      <Route path={routePath} element={element} />
    </Routes>
  );

  return {
    ...render(
      <QueryClientProvider client={client}>
        <ApiProvider>
          <MemoryRouter initialEntries={[routePath]}>
            <React.Suspense fallback={<div>Loading...</div>}>
              <TestRoutes />
            </React.Suspense>
          </MemoryRouter>
        </ApiProvider>
      </QueryClientProvider>,
    ),
    user: userEvent,
  };
}

/**
 * Assert helper: wait for a heading to appear, then assert additional queries.
 */
export async function assertHeadingAndExtra(
  heading: RegExp | string,
  extra?: Array<{ role: string; name: string | RegExp }>,
  timeout = 3000,
) {
  const { waitFor, screen } = await import('@testing-library/react');
  await waitFor(
    () => expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument(),
    { timeout },
  );
  if (extra) {
    for (const q of extra) {
      await waitFor(
        () => expect(screen.getByRole(q.role, { name: q.name })).toBeInTheDocument(),
        { timeout },
      );
    }
  }
}
