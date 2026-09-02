import { type CockpitNavigationTarget } from './cockpitNavigation';

export interface KnowledgeHubViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

export type KnowledgeSubTab = 'monitor' | 'memory' | 'agents' | 'calibration' | 'logs';

export type KnowledgeSurfaceCard = {
  id: KnowledgeSubTab;
  title: string;
  summary: string;
  detail: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

export type KnowledgeClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

export function matchesKnowledgeFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function inferKnowledgeSubTab(query?: string): KnowledgeSubTab {
  if (matchesKnowledgeFocusQuery(['memory', 'context', 'knowledge', 'kos', 'rag', '记忆', '知识', '上下文'], query)) return 'memory';
  if (matchesKnowledgeFocusQuery(['agent', 'agents', '智能体', 'multi-agent', 'mcp'], query)) return 'agents';
  if (matchesKnowledgeFocusQuery(['calibration', 'prompt', 'model', 'policy', '校准', '模型', '策略'], query)) return 'calibration';
  if (matchesKnowledgeFocusQuery(['log', 'logs', 'audit', 'trace', 'request', '日志', '审计', '请求'], query)) return 'logs';
  return 'monitor';
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}
