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
  if (hasNavigationContext(target)) {
    if (onOpenTarget) {
      onOpenTarget(target);
      return;
    }
    onNavigate?.(target.tab);
    return;
  }
  if (onOpenTarget) {
    onOpenTarget(target);
    return;
  }
  onNavigate?.(target.tab);
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
  const route = target.tab === 'AlertCenter' && target.alertTab === 'rules'
    ? 'alerts/rules'
    : target.tab === 'AlertCenter' && target.alertTab === 'history'
      ? 'alerts/history'
      : TAB_TO_HASH[target.tab] || target.tab.toLowerCase();
  const params = new URLSearchParams();
  if (target.projectId) params.set('project', target.projectId);
  if (target.usagePathId) params.set('usage', target.usagePathId);
  if (target.gapId) params.set('gap', target.gapId);
  if (target.coverageDimensionId) params.set('coverage', target.coverageDimensionId);
  if (target.pageId) params.set('page', target.pageId);
  if (target.featureDomainId) params.set('feature', target.featureDomainId);
  if (target.taskQuery) params.set('task', target.taskQuery);
  if (target.draftKey) params.set('draft', target.draftKey);
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
