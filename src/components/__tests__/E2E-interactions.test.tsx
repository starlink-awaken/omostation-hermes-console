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

  it('opens command palette with Ctrl+K', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索/)).toBeInTheDocument();
    });

    // Focus search input and press Ctrl+K
    const searchInput = screen.getByPlaceholderText(/搜索/);
    searchInput.focus();
    await user.keyboard('{Control>}k{/Control}');

    await waitFor(() => {
      // Command palette should be open
      const palette = screen.getByRole('dialog') || screen.getByTestId('command-palette');
      expect(palette).toBeInTheDocument();
    });
  });

  it('filters commands when typing', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索/);
      user.type(searchInput, 'Harness');
    });

    await waitFor(() => {
      // Should show filtered results containing "Harness"
      const results = screen.getAllByText(/Harness/);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  it('navigates to page on command selection', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    // Open command palette
    const searchInput = await screen.findByPlaceholderText(/搜索/);
    searchInput.focus();
    await user.keyboard('{Control>}k{/Control}');

    // Select a command
    const command = await screen.findByText('Harness 合规');
    await user.click(command);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Harness 合规', level: 1 })).toBeInTheDocument();
    });
  });

  it('closes on Escape', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    const searchInput = await screen.findByPlaceholderText(/search/i);
    searchInput.focus();
    await user.keyboard('{Control>}k{/Control}');

    // Verify palette is open
    await waitFor(() => {
      expect(screen.getByText('Harness 合规')).toBeInTheDocument();
    });

    // Press Escape
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Harness 合规')).not.toBeInTheDocument();
    });
  });
});

// ── Navigation E2E ──

describe('E2E: Navigation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('navigates between pages via sidebar', async () => {
    setupMockFetch({});
    const { user, container } = renderDashboardAt('/');

    // Click on a sidebar item
    await waitFor(() => {
      const harnessNav = container.querySelector('.nav-item[class*="active"]');
      // Current active is Home
      expect(harnessNav?.textContent).toContain('首页');
    });

    // Navigate to Harness
    const harnessBtn = screen.getByText('Harness 合规');
    await user.click(harnessBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Harness 合规', level: 1 })).toBeInTheDocument();
    });
  });

  it('shows correct active state in sidebar', async () => {
    setupMockFetch({});
    const { user, container } = renderDashboardAt('/');

    // Navigate to Intent page
    const intentBtn = await screen.findByText('Intent 编译器');
    await user.click(intentBtn);

    await waitFor(() => {
      const activeNavItem = container.querySelector('.nav-item.active');
      expect(activeNavItem?.textContent).toContain('Intent 编译器');
    });
  });

  it('navigates via breadcrumbs', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Harness 合规', level: 1 })).toBeInTheDocument();
    });

    // Click on breadcrumb group
    const breadcrumb = screen.getByText('治理与合规');
    await user.click(breadcrumb);

    // Should navigate to first item in group or stay
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: '首页', level: 1 })).toBeInTheDocument();
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
      '/api/cockpit/intent/compile': {
        spec: 'version: "1.0"\nobjective: "Test"',
        timestamp: new Date().toISOString(),
        duration: 100,
      },
    });
    const { user } = renderDashboardAt('/intent');

    // Type input
    const input = await screen.findByPlaceholderText(/输入自然语言/);
    await user.type(input, 'Create a feature');

    // Click compile
    const compileBtn = await screen.findByRole('button', { name: /编译/ });
    await user.click(compileBtn);

    await waitFor(() => {
      expect(screen.getByText(/objective:/)).toBeInTheDocument();
    });
  });

  it('renders Governance page and runs checks', async () => {
    setupMockFetch({
      '/api/cockpit/governance/self-check': {
        items: [
          { id: 'arch', name: '架构检查', status: 'PASS', summary: 'OK', duration: 100 },
        ],
        overall: 'PASS',
        timestamp: new Date().toISOString(),
      },
    });
    renderDashboardAt('/governance-self-check');

    await waitFor(() => {
      expect(screen.getByText('架构检查')).toBeInTheDocument();
      expect(screen.getByText('PASS')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully across pages', async () => {
    setupMockFetchError('Network error');

    const pages = ['/', '/harness', '/intent', '/governance-self-check'];

    for (const path of pages) {
      const { unmount } = renderDashboardAt(path);

      await waitFor(() => {
        // Should still render the page even with errors
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: 'Harness 合规', level: 1 })).toBeInTheDocument();
    });
  });

  it('recovers when API comes back', async () => {
    // First fail
    setupMockFetchError('Temporary error');
    const { unmount } = renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Harness 合规', level: 1 })).toBeInTheDocument();
    });

    unmount();

    // Then succeed
    setupMockFetch({
      '/api/cockpit/harness/compliance': { error: 0, warning: 0, sections: [] },
    });
    renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { name: '首页', level: 1 })).toBeInTheDocument();
    });
  });

  it('Ctrl+2 navigates to Overview', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    await user.keyboard('{Control>}2{/Control}');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '概览中心', level: 1 })).toBeInTheDocument();
    });
  });

  it('Ctrl+K opens search', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/');

    await user.keyboard('{Control>}k{/Control}');

    await waitFor(() => {
      // Should show command palette or focus search
      const searchInput = screen.getByPlaceholderText(/搜索/);
      expect(searchInput).toHaveFocus();
    });
  });
});
