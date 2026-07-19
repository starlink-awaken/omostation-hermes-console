import { COCKPIT_PAGE_REGISTRY } from './cockpitPageRegistry';

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

export const HASH_TO_TAB: Record<string, string> = {
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

const TAB_TO_HASH: Record<string, string> = Object.fromEntries(
  Object.entries(HASH_TO_TAB)
    .filter(([route]) => !route.includes('/'))
    .map(([route, tab]) => [tab, route]),
);

const COCKPIT_TAB_IDS = new Set(COCKPIT_PAGE_REGISTRY.map((page) => page.id));

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

/** Keep dynamic page links inside the real Cockpit shell while preserving their focus. */
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

export function openCockpitNavigationTarget(
  target: CockpitNavigationTarget,
  onNavigate?: (tab: string) => void,
  onOpenTarget?: (target: CockpitNavigationTarget) => void,
) {
  const normalizedTarget = normalizeNavigationTarget(target);
  if (hasNavigationContext(normalizedTarget)) {
    if (onOpenTarget) {
      onOpenTarget(normalizedTarget);
      return;
    }
    onNavigate?.(normalizedTarget.tab);
    return;
  }
  if (onOpenTarget) {
    onOpenTarget(normalizedTarget);
    return;
  }
  onNavigate?.(normalizedTarget.tab);
}

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
    alertTab,
  };
}

export function navigationHash(target: CockpitNavigationTarget): string {
  const normalizedTarget = normalizeNavigationTarget(target);
  const route = normalizedTarget.tab === 'AlertCenter' && normalizedTarget.alertTab === 'rules'
    ? 'alerts/rules'
    : normalizedTarget.tab === 'AlertCenter' && normalizedTarget.alertTab === 'history'
      ? 'alerts/history'
      : TAB_TO_HASH[normalizedTarget.tab] || normalizedTarget.tab.toLowerCase();
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

export function writeNavigationHash(target: CockpitNavigationTarget) {
  if (typeof window === 'undefined') return;
  const nextHash = navigationHash(target);
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

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

export function recordRecentNavigation(target: CockpitNavigationTarget, label: string) {
  if (typeof window === 'undefined' || !target.tab || !label.trim()) return;
  const entry = { target: recentNavigationTarget(target), label: label.trim() };
  const current = readRecentNavigation();
  const next = [entry, ...current.filter((item) => navigationHash(item.target) !== navigationHash(entry.target))]
    .slice(0, RECENT_NAVIGATION_LIMIT);
  try {
    window.localStorage.setItem(RECENT_NAVIGATION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable in private browsing or restricted embeds.
  }
}

export function clearRecentNavigation() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENT_NAVIGATION_STORAGE_KEY);
  } catch {
    // Ignore restricted storage environments; the UI remains usable.
  }
}
