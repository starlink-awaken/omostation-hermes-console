/**
 * cockpitPageRegistry — 页面元数据注册表.
 *
 * 派生自 routes.tsx ROUTES — 单一 SSOT。
 * 不再独立维护清单，避免与 routes.tsx / cockpitNavigation.ts 漂移。
 */
import { ROUTES, type RouteConfig } from '../routes';

export interface CockpitPageRegistryItem {
  id: string;
  title: string;
  group: string;
  purpose: string;
  whenToUse: string;
  dimensions: string[];
}

/** Build registry item from a RouteConfig */
function toRegistryItem(route: RouteConfig): CockpitPageRegistryItem {
  return {
    id: route.id,
    title: route.label,
    group: route.group,
    purpose: route.purpose || route.subtitle || '',
    whenToUse: route.whenToUse || '',
    dimensions: route.keywords || [],
  };
}

/** Full registry — derived from ROUTES */
export const COCKPIT_PAGE_REGISTRY: CockpitPageRegistryItem[] =
  ROUTES.map(toRegistryItem);

/** Visible-only registry (excludes hidden workbench pages) */
export const VISIBLE_COCKPIT_PAGE_REGISTRY: CockpitPageRegistryItem[] =
  ROUTES.filter((r) => !r.hidden).map(toRegistryItem);
