import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, Outlet } from 'react-router-dom';
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

import { ROUTES } from '../../routes';

/**
 * Every visible route in the app as exported by src/routes.tsx.
 * Derived from ROUTES config to stay in sync.
 */
export const ALL_ROUTES: RouteMeta[] = ROUTES
  .filter((r) => !r.hidden)
  .map((r) => ({ id: r.id, path: r.path, label: r.label, group: r.group }));

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
        <MemoryRouter initialEntries={initialEntries}>
          <Dashboard />
        </MemoryRouter>
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
 * Uses getAllByRole to handle cases where both hero title and page header render.
 */
export async function assertHeadingAndExtra(
  heading: RegExp | string,
  extra?: Array<{ role: string; name: string | RegExp }>,
  timeout = 3000,
) {
  const { waitFor, screen } = await import('@testing-library/react');
  await waitFor(
    () => {
      const headings = screen.getAllByRole('heading', { name: heading });
      expect(headings.length).toBeGreaterThan(0);
    },
    { timeout },
  );
  if (extra) {
    for (const q of extra) {
      await waitFor(
        () => {
          const elements = screen.getAllByRole(q.role, { name: q.name });
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout },
      );
    }
  }
}
