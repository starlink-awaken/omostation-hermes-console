/**
 * routeWrappers — 路由包装器
 *
 * 为需要导航回调的页面提供统一的包装逻辑。
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getRouteById, getRouteByPath, ROUTES } from '../routes';

export function useCockpitNavCallbacks() {
  const navigate = useNavigate();
  const goTo = (tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  };
  const openTarget = (target: { tab: string; taskQuery?: string }) => {
    const route = getRouteById(target.tab);
    if (route) {
      const qs = target.taskQuery ? `?task=${encodeURIComponent(target.taskQuery)}` : '';
      navigate(`${route.path}${qs}`);
    }
  };
  return { onNavigate: goTo, onOpenTarget: openTarget };
}

export function useCockpitNav() {
  const navigate = useNavigate();
  const goTo = (tabId: string) => {
    const route = getRouteById(tabId);
    navigate(route?.path ?? '/');
  };
  return goTo;
}

// ── 页面包装器 ──

export function Wave2Route({ Component }: { Component: React.ComponentType<any> }) {
  const { goTo, openTarget } = useCockpitNavCallbacks();
  return <Component onNavigate={goTo} onOpenTarget={(t: any) => t.tab && goTo(t.tab)} />;
}

export function HomeRoute({ Component }: { Component: React.ComponentType<any> }) {
  const { goTo } = useCockpitNavCallbacks();
  return <Component onTabChange={goTo} />;
}

export function NavWrapper({ Component }: { Component: React.ComponentType<any> }) {
  const { goTo, openTarget } = useCockpitNavCallbacks();
  return <Component onNavigate={goTo} onOpenTarget={openTarget} />;
}

export function TaskCenterRoute({ Component }: { Component: React.ComponentType<any> }) {
  return <Component />;
}
