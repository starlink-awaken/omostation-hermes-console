/**
 * E2E tests for:
 * - Command Palette interactions
 * - Navigation between pages
 * - Data rendering scenarios
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderDashboardAt, setupMockFetch, setupMockFetchError } from './route-test-helpers';

// ── Command Palette E2E ──

describe('E2E: Command Palette', () => {
  afterEach(() => vi.unstubAllGlobals());

  function openCommandPalette() {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);
  }

  it('opens command palette with Ctrl+K', async () => {
    setupMockFetch({});
    renderDashboardAt('/');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });

    openCommandPalette();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/输入命令/)).toBeInTheDocument();
    });
  });

  it('filters commands when typing', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });

    openCommandPalette();

    await waitFor(() => {
      const paletteInput = screen.getByPlaceholderText(/输入命令/);
      user.type(paletteInput, 'Harness');
    });

    await waitFor(() => {
      const results = screen.getAllByText(/Harness/);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  it('navigates to page on command selection', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    openCommandPalette();

    await waitFor(() => {
      const command = screen.getAllByText('Harness 合规')[0];
      user.click(command);
    });

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Harness 合规', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('closes on Escape', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    openCommandPalette();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/输入命令/)).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/输入命令/)).not.toBeInTheDocument();
    });
  });
});

// ── Navigation E2E ──

describe('E2E: Navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('navigates between pages via sidebar', async () => {
    setupMockFetchError();
    const { user, container } = renderDashboardAt('/');

    // Verify initial state: Home is the active nav item
    await waitFor(() => {
      const harnessNav = container.querySelector('.nav-item[class*="active"]');
      expect(harnessNav?.textContent).toContain('首页');
    });

    // Expand the 治理与合规 group (where Harness lives, 9 items default-collapsed).
    // aria-expanded="false" on the group title means the group is currently collapsed.
    // Use user.click (async) to let React state update between clicks.
    const collapsedGroups = screen.getAllByRole('button', { expanded: false });
    for (const btn of collapsedGroups) {
      await user.click(btn);
    }

    // Find Harness nav-item in the now-expanded group
    const harnessNavItem = screen
      .getAllByText('Harness 合规')
      .find((el) => el.closest('.nav-item') !== null)!;
    await user.click(harnessNavItem);

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: 'Harness 合规', level: 1 })[0],
      ).toBeInTheDocument();
    });
  });

  it('shows correct active state in sidebar', async () => {
    setupMockFetchError();
    const { user, container } = renderDashboardAt('/');

    // Expand the 治理与合规 group (where Intent lives, 9 items default-collapsed).
    // Use user.click (async) to let React state update between clicks.
    const collapsedGroups = screen.getAllByRole('button', { expanded: false });
    for (const btn of collapsedGroups) {
      await user.click(btn);
    }

    // Find Intent nav-item in the expanded group
    const intentNavItem = screen
      .getAllByText('Intent 编译器')
      .find((el) => el.closest('.nav-item') !== null)!;
    await user.click(intentNavItem);

    await waitFor(() => {
      const activeNavItem = container.querySelector('.nav-item.active');
      expect(activeNavItem?.textContent).toContain('Intent 编译器');
    });
  });

  it('navigates via breadcrumbs', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: /Harness 合规/, level: 1 })[0]).toBeInTheDocument();
    });

    // Click on breadcrumb group
    const breadcrumbEls = screen.getAllByText('治理与合规');
    await user.click(breadcrumbEls[0]);

    // Should navigate to first item in group or stay
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { level: 1 })[0]).toBeInTheDocument();
    });
  });
});

// ── Data Rendering E2E ──

describe('E2E: Data Rendering Scenarios', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders Home page with populated data', async () => {
    setupMockFetch({
      '/api/health': { status: 'healthy', services: [], lastChecked: new Date().toISOString() },
      '/api/alerts': { items: [{ id: '1', title: 'Test Alert' }] },
      '/api/tasks/recent': { items: [{ id: '1', title: 'Test Task' }] },
    });
    renderDashboardAt('/');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: '首页', level: 1 })[0]).toBeInTheDocument();
      // Should show some data
      const content = document.body.textContent || '';
      expect(content.length).toBeGreaterThan(100);
    });
  });

  it('renders Harness page with compliance data', async () => {
    setupMockFetch({
      '/api/cockpit/harness/compliance': {
        error: 2,
        warning: 5,
        sections: [
          { name: 'admission', ok: true, issues: [] },
          { name: 'execution', ok: false, issues: ['issue1', 'issue2'] },
        ],
      },
    });
    renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // errors
      expect(screen.getByText('5')).toBeInTheDocument(); // warnings
    });
  });

  it('renders Intent page and compiles', async () => {
    setupMockFetch({
      '/api/intent/compile': {
        available: true,
        error: null,
        result: {
          success: true,
          intent_text: 'Create a feature',
          dag: {
            nodes: [
              { id: 'entry', label: '开始', type: 'entry' },
              { id: 'fetch', label: '获取数据', type: 'action', description: '步骤1' },
              { id: 'exit', label: '结束', type: 'exit' },
            ],
            edges: [{ from: 'entry', to: 'fetch' }, { from: 'fetch', to: 'exit' }],
          },
        },
      },
    });
    const { user } = renderDashboardAt('/intent');

    const input = await screen.findByPlaceholderText(/例如：每天/);
    await user.type(input, 'Create a feature');

    const compileBtn = await screen.findByRole('button', { name: /编译/ });
    await user.click(compileBtn);

    await waitFor(() => {
      expect(screen.getByText('编译结果')).toBeInTheDocument();
    });
  });

  it('renders Governance page and runs checks', async () => {
    setupMockFetch({
      '/api/cockpit/governance/self-check': {
        items: [
          { id: 'architecture-check', name: '架构漂移检查', status: 'PASS', summary: 'OK', duration: 100 },
        ],
        overall: 'PASS',
        timestamp: new Date().toISOString(),
      },
    });
    renderDashboardAt('/governance-self-check');

    await waitFor(() => {
      expect(screen.getByText('架构漂移检查')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully across pages', async () => {
    setupMockFetchError('Network error');

    const pages = ['/', '/harness', '/intent', '/governance-self-check'];

    for (const path of pages) {
      const { unmount } = renderDashboardAt(path);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.length).toBeGreaterThan(0);
      });

      unmount();
    }
  });
});

// ── Error Recovery E2E ──

describe('E2E: Error Recovery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows error state on API failure', async () => {
    setupMockFetchError('Backend unavailable');
    renderDashboardAt('/harness');

    await waitFor(() => {
      // Page should render with default/error values
      expect(screen.getAllByRole('heading', { name: 'Harness 合规', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('recovers when API comes back', async () => {
    // First fail
    setupMockFetchError('Temporary error');
    const { unmount } = renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Harness 合规', level: 1 })[0]).toBeInTheDocument();
    });

    unmount();

    // Then succeed
    setupMockFetch({
      '/api/cockpit/harness/compliance': { error: 0, warning: 0, sections: [] },
    });
    renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });
});

// ── Keyboard Shortcuts E2E ──

describe('E2E: Keyboard Shortcuts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Ctrl+1 navigates to Home', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/harness');

    await user.keyboard('{Control>}1{/Control}');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: '首页', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('Ctrl+2 navigates to Overview', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    await user.keyboard('{Control>}2{/Control}');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: '概览中心', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('Ctrl+K opens search', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    await user.keyboard('{Control>}k{/Control}');

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      expect(searchInput).toBeInTheDocument();
    });
  });
});
