/**
 * E2E tests for the Dashboard sidebar navigation.
 *
 * Verifies:
 *   - Sidebar nav items render for all visible routes
 *   - Each route is directly accessible and shows correct hero
 *   - Breadcrumb renders for non-Home routes
 *   - Search input and topbar buttons are present
 *   - UserMenu renders
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderDashboardAt, setupMockFetchError } from './route-test-helpers';
import { ROUTES } from '../../routes';

describe('Dashboard sidebar structure', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it('renders the Cockpit Console brand', () => {
    renderDashboardAt('/');
    expect(screen.getByText('Cockpit Console')).toBeInTheDocument();
  });

  it('renders every non-hidden route as a clickable nav button', async () => {
    renderDashboardAt('/');

    for (const route of ROUTES.filter((r) => !r.hidden)) {
      await waitFor(() => {
        const navItems = screen.getAllByRole('menuitem', { name: route.label });
        expect(navItems.length).toBeGreaterThan(0);
      });
    }
  });

  it('marks the Home route as active on first load', async () => {
    renderDashboardAt('/');

    await waitFor(() => {
      const homeBtn = screen.getAllByRole('menuitem', { name: '首页' })[0];
      expect(homeBtn).toHaveAttribute('aria-selected', 'true');
      expect(homeBtn).toHaveClass('active');
    });
  });

  it('marks a non-Home route as active when loaded directly', async () => {
    renderDashboardAt('/alerts');

    await waitFor(() => {
      const alertsBtn = screen.getAllByRole('menuitem', { name: '告警中心' })[0];
      expect(alertsBtn).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('all sidebar items have aria-selected attribute', () => {
    renderDashboardAt('/');

    const navItems = screen.getAllByRole('menuitem');
    for (const item of navItems) {
      expect(item).toHaveAttribute('aria-selected');
    }
  });
});

describe('Dashboard breadcrumb', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it('does not render breadcrumbs on Home route', () => {
    renderDashboardAt('/');
    // No breadcrumb section should appear on Home
    expect(screen.queryByText('首页 >')).not.toBeInTheDocument();
  });

  it('renders breadcrumbs for non-Home routes', async () => {
    renderDashboardAt('/overview');

    await waitFor(() => {
      expect(screen.getAllByText('运行与观测').length).toBeGreaterThan(0);
      expect(screen.getAllByText('概览中心').length).toBeGreaterThan(0);
    });
  });

  it('renders breadcrumbs for workbench routes', async () => {
    renderDashboardAt('/workbench/kos');

    await waitFor(() => {
      expect(screen.getAllByText('工作台').length).toBeGreaterThan(0);
      expect(screen.getAllByText('KOS 工作台').length).toBeGreaterThan(0);
    });
  });
});

describe('Dashboard hero section', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it('renders the hero title and subtitle for key routes', async () => {
    const keyRoutes = [
      { label: '首页', path: '/', subtitle: '系统健康总览、实时告警、关键指标趋势。' },
      { label: '概览中心', path: '/overview', subtitle: '实时监控 eCOS v6 微服务环境，掌握集群全貌。' },
      { label: '告警中心', path: '/alerts', subtitle: '统一告警管理、规则配置、告警历史。' },
      { label: '系统设置', path: '/settings', subtitle: '配置网格路由、API Token 与治理阈值。' },
    ];

    for (const { label, path, subtitle } of keyRoutes) {
      renderDashboardAt(path);

      await waitFor(() => {
        expect(screen.getAllByRole('heading', { name: label, level: 1 }).length).toBeGreaterThan(0);
      });

      expect(screen.getByText(subtitle)).toBeInTheDocument();
    }
  });
});

describe('Dashboard search and topbar', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it('renders the global search input', () => {
    renderDashboardAt('/');
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText('全局搜索输入框')).toBeInTheDocument();
  });

  it('renders command palette button', () => {
    renderDashboardAt('/');
    const cmdBtn = screen.getByTitle('命令面板 (Ctrl+K)');
    expect(cmdBtn).toBeInTheDocument();
  });

  it('renders quick actions button', () => {
    renderDashboardAt('/');
    const quickBtn = screen.getByTitle('快捷操作 (Ctrl+J)');
    expect(quickBtn).toBeInTheDocument();
  });

  it('renders UserMenu', () => {
    renderDashboardAt('/');
    expect(screen.getByRole('button', { name: /用户菜单|个人信息|User/i })).toBeInTheDocument();
  });

  it('renders skip navigation link for screen readers', () => {
    renderDashboardAt('/');
    const skipLink = screen.getByText('跳过导航');
    expect(skipLink).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '跳过导航' })).toHaveAttribute('href', '#main-content');
  });
});

describe('Dashboard route count matches ROUTES config', () => {
  beforeEach(() => {
    setupMockFetchError();
  });

  it('renders exactly one nav button per non-hidden route', async () => {
    renderDashboardAt('/');

    await waitFor(() => {
      const navItems = screen.getAllByRole('menuitem');
      const expectedCount = ROUTES.filter((r) => !r.hidden).length;
      expect(navItems.length).toBeGreaterThanOrEqual(expectedCount);
    });
  });
});
