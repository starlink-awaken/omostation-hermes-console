/**
 * Dashboard — 主布局组件 (重构后)
 *
 * 从 677 行精简到 < 250 行。
 * 图标映射、路由包装器已提取到独立模块。
 */
import React, { Suspense, useState, useCallback } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, ROUTE_REDIRECTS, getVisibleRoutes, getRouteById, getRouteByPath } from '../routes';
import Breadcrumb from './common/Breadcrumb';
import { RouteErrorBoundary } from './common/RouteErrorBoundary';
import { CommandPalette, useCommandPalette } from './common/CommandPalette';
import QuickActionsPanel, { useQuickActions } from './common/QuickActionsPanel';
import { useKeyboardShortcuts } from './common/CommandPalette';
import UserMenu from './common/UserMenu';
import { useCockpitStore } from '../store';
import { getIconComponent } from './dashboardIcons';
import './Dashboard.css';

const visibleRoutes = getVisibleRoutes();

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRoute = getRouteByPath(location.pathname);
  const activeTab = currentRoute?.id ?? 'Home';

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Collapsible groups: default-collapse groups with > 5 items
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const groupCounts = visibleRoutes.reduce<Record<string, number>>((acc, r) => {
      acc[r.group] = (acc[r.group] || 0) + 1;
      return acc;
    }, {});
    Object.entries(groupCounts).forEach(([group, count]) => {
      if (count > 5) initial.add(group);
    });
    return initial;
  });

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const goTo = useCallback((tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  }, [navigate]);

  // Search state
  const searchQuery = useCockpitStore((s) => s.search.query);
  const setSearchQuery = useCockpitStore((s) => s.search.setQuery);

  // Command palette
  const { isOpen: isCommandPaletteOpen, initialQuery, open: openCommandPalette, openWithQuery, close: closeCommandPalette } = useCommandPalette(
    visibleRoutes.map(r => ({ id: r.id, label: r.label, description: r.label, action: () => goTo(r.id) })),
  );

  // Quick actions
  const { isOpen: isQuickActionsOpen, open: openQuickActions, close: closeQuickActions } = useQuickActions();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'k', ctrl: true, description: '搜索/命令面板', action: () => isCommandPaletteOpen ? closeCommandPalette() : openCommandPalette() },
      { key: 'j', ctrl: true, description: '快捷操作', action: openQuickActions },
      { key: '1', ctrl: true, description: '首页', action: () => goTo('Home') },
      { key: '2', ctrl: true, description: '概览', action: () => goTo('Overview') },
      { key: '3', ctrl: true, description: '告警', action: () => goTo('AlertCenter') },
      { key: '4', ctrl: true, description: '日志', action: () => goTo('LogViewer') },
      { key: '5', ctrl: true, description: '任务', action: () => goTo('TaskCenter') },
    ],
  });

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Group visible routes for sidebar
  const groupedRoutes = visibleRoutes.reduce<Record<string, typeof visibleRoutes>>((acc, route) => {
    if (!acc[route.group]) acc[route.group] = [];
    acc[route.group].push(route);
    return acc;
  }, {});

  // Breadcrumb
  const breadcrumbItems = [];
  if (currentRoute && currentRoute.group !== '总览与导航') {
    breadcrumbItems.push({ label: currentRoute.group, onClick: () => goTo(visibleRoutes.find(r => r.group === currentRoute.group)?.id ?? 'Home') });
  }
  breadcrumbItems.push({ label: currentRoute?.label ?? '控制台' });

  // Hero
  const hero = currentRoute
    ? { title: currentRoute.label, subtitle: currentRoute.subtitle || '' }
    : { title: '控制台', subtitle: 'eCOS 管理面板' };

  return (
    <div className="dashboard-container">
      <a href="#main-content" className="sr-only-focusable">跳过导航</a>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside role="complementary" aria-label="控制台侧边栏" className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-box" aria-hidden="true">
            <span className="text-accent font-bold text-lg">C</span>
          </div>
          <h2>Cockpit Console</h2>
        </div>
        <nav aria-label="控制台主导航" className="sidebar-nav" role="menu">
          {Object.entries(groupedRoutes).map(([group, routes]) => (
            <React.Fragment key={group}>
              <button
                className="nav-group-title"
                id={`group-${group}`}
                onClick={() => toggleGroup(group)}
                aria-expanded={!collapsedGroups.has(group)}
              >
                {group}
                <span className="group-toggle">{collapsedGroups.has(group) ? '+' : '−'}</span>
              </button>
              {!collapsedGroups.has(group) && routes.map(route => {
                const IconComp = getIconComponent(route.icon);
                return (
                  <NavLink
                    key={route.id}
                    to={route.path}
                    role="menuitem"
                    aria-describedby={`group-${group}`}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    {({ isActive }) => (
                      <>
                        <IconComp size={16} aria-hidden="true" />
                        <span>{route.label}</span>
                        {isActive && <span className="nav-active-indicator" aria-hidden="true" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main id="main-content" tabIndex={-1} className="main-content">
        <header className="topbar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? '关闭导航' : '打开导航'}
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
          <div className="search-bar" role="search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索服务、模型、智能体... (Enter 打开命令面板)"
              aria-label="全局搜索输入框"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') openWithQuery(searchQuery); }}
            />
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={() => openWithQuery(searchQuery)} title="命令面板 (Ctrl+K)">
              ⌘
            </button>
            <button className="topbar-btn" onClick={openQuickActions} title="快捷操作 (Ctrl+J)">
              ⚡
            </button>
          </div>
          <UserMenu />
        </header>

        <div className="content-area">
          {activeTab !== 'Home' && <Breadcrumb items={breadcrumbItems} />}

          <div key={activeTab} className="hero-section animate-fade-in">
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
          </div>

          <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <RouteErrorBoundary>
              <Routes>
                {Object.entries(ROUTE_REDIRECTS).map(([from, to]) => (
                  <Route key={from} path={from} element={<Navigate to={to} replace />} />
                ))}
                {visibleRoutes.map(route => (
                  <Route key={route.path} path={route.path} element={<route.component />} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </RouteErrorBoundary>
          </Suspense>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        initialQuery={initialQuery}
        commands={visibleRoutes.map(r => ({ id: r.id, label: r.label, description: r.label, action: () => goTo(r.id) }))}
      />
      <QuickActionsPanel isOpen={isQuickActionsOpen} onClose={closeQuickActions} />
    </div>
  );
}
