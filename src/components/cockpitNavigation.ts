/**
 * cockpitNavigation — 统一导航入口.
 *
 * 适配 main 分支的 React Router 架构:
 *   - 模块级 `cockpitNavigator` 桥接变量, App 组件 mount 时注入 React Router 的 navigate
 *   - 所有 imperative 调用 `openCockpitNavigationTarget()` 走 React Router, 不再用 hash
 *   - recentNavigation (localStorage) 保留
 */
import { useNavigate } from 'react-router-dom';
import { COCKPIT_PAGE_REGISTRY } from './cockpitPageRegistry';

type NavigateFunction = ReturnType<typeof useNavigate>;

export interface CockpitNavigationTarget {
  tab: string;
  projectId?: string | null;
  taskQuery?: string;
  draftKey?: string | null;
  usagePathId?: string | null;
  gapId?: string | null;
  coverageDimensionId?: string | null;
  pageId?: string | null;
  featureDomainId?: string | null;
  alertTab?: 'active' | 'history' | 'rules' | null;
}

export interface RecentNavigationEntry {
  target: CockpitNavigationTarget;
  label: string;
}

const RECENT_NAVIGATION_STORAGE_KEY = 'cockpit.recent-navigation.v1';
const RECENT_NAVIGATION_LIMIT = 5;

// Tab ID → React Router path (与 routes.tsx 对齐)
export const TAB_TO_ROUTE: Record<string, string> = {
  Home: '/',
  Guide: '/guide',
  SystemMap: '/system-map',
  Overview: '/overview',
  McpMesh: '/mcpmesh',
  Topology: '/topology',
  Compute: '/compute',
  Research: '/research',
  Knowledge: '/knowledge',
  GBrainAdmin: '/gbrain-admin',
  Engines: '/engines',
  Assets: '/assets',
  Protocol: '/protocol',
  Workflows: '/workflows',
  C2G: '/c2g',
  AlertCenter: '/alerts',
  L4Health: '/l4-health',
  Debt: '/debt',
  Observability: '/observability',
  DeliveryJourney: '/delivery-journey',
  SceneCards: '/scene-cards',
  LogViewer: '/logs',

  TaskCenter: '/tasks',
  Performance: '/performance',
  Sandbox: '/sandbox',
  QuestBoard: '/quest',
  DomainApps: '/domain-apps',
  Settings: '/settings',
};

const COCKPIT_TAB_IDS = new Set(COCKPIT_PAGE_REGISTRY.map((page) => page.id));

// ─── 模块级 React Router 桥接 ───
let cockpitNavigator: NavigateFunction | null = null;

/** App 组件 mount 时调用, 注入 React Router 的 navigate 函数. */
export function setCockpitNavigator(navigate: NavigateFunction): void {
  cockpitNavigator = navigate;
}

/** 获取当前 navigator (用于测试或条件判断). */
export function getCockpitNavigator(): NavigateFunction | null {
  return cockpitNavigator;
}

// ─── 纯函数: 标签/路由/目标处理 ───

export function navigationTargetLabel(target: CockpitNavigationTarget): string {
  const baseLabel = COCKPIT_PAGE_REGISTRY.find((page) => page.id === target.tab)?.title || target.tab;
  const context = target.projectId
    ? `项目 ${target.projectId}`
    : target.pageId
      ? `页面 ${target.pageId}`
      : target.featureDomainId
        ? `能力域 ${target.featureDomainId}`
        : target.usagePathId
          ? `路径 ${target.usagePathId}`
          : target.gapId
            ? `缺口 ${target.gapId}`
            : target.taskQuery
              ? target.taskQuery
              : target.alertTab
                ? `告警${target.alertTab === 'rules' ? '规则' : target.alertTab === 'history' ? '历史' : '活跃'}`
                : '';
  return context ? `${baseLabel} · ${context.slice(0, 80)}` : baseLabel;
}

export function normalizeNavigationTarget(target: CockpitNavigationTarget): CockpitNavigationTarget {
  if (COCKPIT_TAB_IDS.has(target.tab)) return target;
  return {
    ...target,
    tab: 'SystemMap',
    pageId: target.pageId || target.tab || null,
  };
}

export function hasNavigationContext(target: CockpitNavigationTarget): boolean {
  return !!(
    target.projectId
    || target.taskQuery
    || target.draftKey
    || target.usagePathId
    || target.gapId
    || target.coverageDimensionId
    || target.pageId
    || target.featureDomainId
    || target.alertTab
  );
}

// ─── 核心: imperative 导航入口 ───

/**
 * 统一导航入口 — 所有组件调用此函数跳转.
 *
 * 优先级:
 *   1. 有 context (projectId/pageId/...) + onOpenTarget → 走 onOpenTarget
 *   2. onNavigate 回调 → 走回调
 *   3. 模块级 cockpitNavigator → React Router navigate
 */
export function openCockpitNavigationTarget(
  target: CockpitNavigationTarget,
  onNavigate?: (tab: string) => void,
  onOpenTarget?: (target: CockpitNavigationTarget) => void,
): void {
  const normalizedTarget = normalizeNavigationTarget(target);

  if (hasNavigationContext(normalizedTarget) && onOpenTarget) {
    onOpenTarget(normalizedTarget);
    return;
  }

  // 构建 React Router path
  const route = TAB_TO_ROUTE[normalizedTarget.tab] || `/${normalizedTarget.tab.toLowerCase()}`;

  // 追加 query 参数
  const params = new URLSearchParams();
  if (normalizedTarget.projectId) params.set('project', normalizedTarget.projectId);
  if (normalizedTarget.usagePathId) params.set('usage', normalizedTarget.usagePathId);
  if (normalizedTarget.gapId) params.set('gap', normalizedTarget.gapId);
  if (normalizedTarget.coverageDimensionId) params.set('coverage', normalizedTarget.coverageDimensionId);
  if (normalizedTarget.pageId) params.set('page', normalizedTarget.pageId);
  if (normalizedTarget.featureDomainId) params.set('feature', normalizedTarget.featureDomainId);
  if (normalizedTarget.taskQuery) params.set('task', normalizedTarget.taskQuery);
  if (normalizedTarget.draftKey) params.set('draft', normalizedTarget.draftKey);
  if (normalizedTarget.alertTab && normalizedTarget.alertTab !== 'active') {
    params.set('alertTab', normalizedTarget.alertTab);
  }

  const query = params.toString();
  const fullPath = `${route}${query ? `?${query}` : ''}`;

  // 优先走回调, 否则走 React Router
  if (onNavigate) {
    onNavigate(normalizedTarget.tab);
    return;
  }

  if (cockpitNavigator) {
    cockpitNavigator(fullPath);
  } else {
    // 降级: navigator 未初始化时静默 (避免崩溃)
    console.warn('[cockpitNavigation] navigator 未初始化, 无法导航到', fullPath);
  }
}

// ─── URL 解析 (兼容旧 hash 格式, 用于渐进迁移) ───

const HASH_TO_TAB: Record<string, string> = {
  home: 'Home',
  guide: 'Guide',
  'system-map': 'SystemMap',
  overview: 'Overview',
  mcpmesh: 'McpMesh',
  topology: 'Topology',
  compute: 'Compute',
  research: 'Research',
  knowledge: 'Knowledge',
  'gbrain-admin': 'GBrainAdmin',
  engines: 'Engines',
  assets: 'Assets',
  protocol: 'Protocol',
  workflows: 'Workflows',
  c2g: 'C2G',
  alerts: 'AlertCenter',
  'alerts/history': 'AlertCenter',
  'alerts/rules': 'AlertCenter',
  'l4-health': 'L4Health',
  debt: 'Debt',
  observability: 'Observability',
  logs: 'LogViewer',
  tasks: 'TaskCenter',
  performance: 'Performance',
  sandbox: 'Sandbox',
  quest: 'QuestBoard',
  'domain-apps': 'DomainApps',
  settings: 'Settings',
};

/**
 * 解析 hash 格式的导航 (兼容旧代码).
 * 新代码应直接使用 React Router 的 useLocation/useSearchParams.
 */
export function parseNavigationHash(hash: string): CockpitNavigationTarget | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  const [route, query = ''] = raw.split('?');
  const tab = HASH_TO_TAB[route];
  if (!tab) return null;
  const params = new URLSearchParams(query);
  const alertTab = route === 'alerts/rules'
    ? 'rules'
    : route === 'alerts/history'
      ? 'history'
      : null;
  return {
    tab,
    projectId: params.get('project'),
    usagePathId: params.get('usage'),
    gapId: params.get('gap'),
    coverageDimensionId: params.get('coverage'),
    pageId: params.get('page'),
    featureDomainId: params.get('feature'),
    taskQuery: params.get('task') || '',
    draftKey: params.get('draft'),
    alertTab: alertTab as CockpitNavigationTarget['alertTab'],
  };
}

/** 生成 hash 格式字符串 (兼容旧代码/最近导航记录用). */
export function navigationHash(target: CockpitNavigationTarget): string {
  const normalizedTarget = normalizeNavigationTarget(target);
  const route = normalizedTarget.tab.toLowerCase();
  const params = new URLSearchParams();
  if (normalizedTarget.projectId) params.set('project', normalizedTarget.projectId);
  if (normalizedTarget.usagePathId) params.set('usage', normalizedTarget.usagePathId);
  if (normalizedTarget.gapId) params.set('gap', normalizedTarget.gapId);
  if (normalizedTarget.coverageDimensionId) params.set('coverage', normalizedTarget.coverageDimensionId);
  if (normalizedTarget.pageId) params.set('page', normalizedTarget.pageId);
  if (normalizedTarget.featureDomainId) params.set('feature', normalizedTarget.featureDomainId);
  if (normalizedTarget.taskQuery) params.set('task', normalizedTarget.taskQuery);
  if (normalizedTarget.draftKey) params.set('draft', normalizedTarget.draftKey);
  const query = params.toString();
  return `#${route}${query ? `?${query}` : ''}`;
}

// ─── 最近导航 (localStorage) ───

function recentNavigationTarget(target: CockpitNavigationTarget): CockpitNavigationTarget {
  return { ...target, draftKey: undefined };
}

export function readRecentNavigation(): RecentNavigationEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_NAVIGATION_STORAGE_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw) as RecentNavigationEntry[];
    if (!Array.isArray(entries)) return [];
    return entries.filter((entry) => entry?.target?.tab && entry.label).slice(0, RECENT_NAVIGATION_LIMIT);
  } catch {
    return [];
  }
}

export function recordRecentNavigation(target: CockpitNavigationTarget, label: string): void {
  if (typeof window === 'undefined' || !target.tab || !label.trim()) return;
  const entry = { target: recentNavigationTarget(target), label: label.trim() };
  const current = readRecentNavigation();
  const next = [entry, ...current.filter((item) => navigationHash(item.target) !== navigationHash(entry.target))]
    .slice(0, RECENT_NAVIGATION_LIMIT);
  try {
    window.localStorage.setItem(RECENT_NAVIGATION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可用 (隐私模式/受限嵌入)
  }
}

export function clearRecentNavigation(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENT_NAVIGATION_STORAGE_KEY);
  } catch {
    // 忽略受限存储环境
  }
}
