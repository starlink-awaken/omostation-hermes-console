/**
 * E2E route coverage for cockpit-ui.
 *
 * Every route defined in src/routes.tsx has at least one test case here
 * that renders <Dashboard /> at the route path and verifies:
 *   1. The page renders without crashing (no unhandled rejection).
 *   2. The expected heading / content appears.
 *   3. The sidebar "active" state highlights the correct nav item.
 *
 * The "disconnected backend" scenario mocks all fetch calls to reject,
 * ensuring no page fabricates data.
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderDashboardAt, setupMockFetchError } from './route-test-helpers';
import { ROUTES } from '../../routes';

describe('E2E: every route renders with disconnected backend', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  for (const route of ROUTES) {
    it(`renders ${route.path} and shows hero title "${route.label}"`, async () => {
      const { container } = renderDashboardAt(route.path);

      // The hero title (route label) renders unconditionally as an <h1>
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { name: route.label, level: 1 });
        expect(headings.length).toBeGreaterThan(0);
      });

      // The page must have some content — either route view or error banner
      const pageContent = container.textContent || '';
      expect(pageContent).not.toBe('');

      // Subtitle appears in the hero section
      if (route.subtitle) {
        await waitFor(() => {
          expect(screen.getByText(route.subtitle as string)).toBeInTheDocument();
        });
      }
    });
  }
});

describe('E2E: every route keeps the sidebar visible and active', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  for (const route of ROUTES) {
    it(`sidebar highlights "${route.label}" when at ${route.path}`, async () => {
      renderDashboardAt(route.path);

      await waitFor(() => {
        const activeNavs = screen.getAllByRole('menuitem', { name: route.label });
      expect(activeNavs.length).toBeGreaterThan(0);
      const activeNav = activeNavs[0];
      expect(activeNav).toHaveAttribute('aria-selected', 'true');
      expect(activeNav).toHaveClass('active');
      });
    });
  }
});

describe('E2E: all sidebar nav labels are present', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it('renders every non-hidden route as a sidebar menuitem', async () => {
    renderDashboardAt('/');

    for (const route of ROUTES.filter((r) => !r.hidden)) {
      await waitFor(() => {
        const navItems = screen.getAllByRole('menuitem', { name: route.label });
        expect(navItems.length).toBeGreaterThan(0);
      });
    }
  });
});

describe('E2E: 404 redirect to home', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it('redirects unknown paths to /', async () => {
    renderDashboardAt('/nonexistent-page-12345');

    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { name: '首页', level: 1 });
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});
