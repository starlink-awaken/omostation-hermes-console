import { findTaskDraftForTarget, persistTaskCenterDraft, taskDraftToIncomingDraft } from '../taskDraftHandoff';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';

// Re-export for sub-modules
export { openCockpitNavigationTarget } from '../cockpitNavigation';
import type {
  CapabilityGap,
  CapabilityGapScope,
  DraftTask,
  EvidenceFreshness,
  PageMaturity,
  PageMaturityGapSignal,
  ProjectAction,
  SourceRef,
} from './types';

export const sourceLabels: Record<string, string> = {
  project_registry: '项目注册表',
  architecture: '架构契约',
  functional_capability_map: '功能能力地图',
  layer_index: '层级索引',
  port_registry: '端口注册表',
  bos_services: 'BOS 服务',
  project_agents: '项目指南',
  system_map_api: '系统地图配置',
};

export const SYSTEM_MAP_DRAFT_TASKS_URL = '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80';

export const DRAFT_SOURCE_LABELS: Record<string, string> = {
  system_map_project_portfolio: '项目',
  system_map_verification_ready: '验证',
  system_map_playbook: '清单',
  system_map_domain_app: '领域',
  system_map_capability_gap: '缺口',
  system_map_page_maturity: '页面',
};

export const DRAFT_SOURCE_WEIGHT: Record<string, number> = {
  system_map_project_portfolio: 0,
  system_map_verification_ready: 1,
  system_map_playbook: 2,
  system_map_page_maturity: 3,
  system_map_domain_app: 4,
  system_map_capability_gap: 5,
};

export const DRAFT_PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function statusClass(value: string): string {
  if (value === 'native' || value === 'exists' || value === 'low' || value === 'shipped' || value === 'ready' || value === 'running' || value === 'verified' || value === 'healthy' || value === 'passed' || value === 'not_applicable') return 'online';
  if (value === 'high' || value === 'missing' || value === 'blocked' || value === 'stopped' || value === 'failed' || value === 'unavailable') return 'offline';
  if (value === 'warning' || value === 'watch' || value === 'at_risk' || value === 'attention') return 'degraded';
  return 'degraded';
}

export function portfolioStatusText(value: string): string {
  if (value === 'healthy') return '健康';
  if (value === 'watch') return '观察';
  if (value === 'at_risk') return '风险';
  if (value === 'blocked') return '阻塞';
  return value;
}

export function projectStatusText(value: string): string {
  if (value === 'ready') return '就绪';
  if (value === 'partial') return '待补齐';
  if (value === 'missing') return '缺失';
  return value;
}

export function runtimeStatusText(value: string): string {
  if (value === 'running') return '运行中';
  if (value === 'stopped') return '未监听';
  if (value === 'unobserved') return '未登记端口';
  if (value === 'not_applicable') return '无需常驻';
  return value;
}

export function coverageStatusText(value?: string): string {
  if (value === 'ready') return '就绪';
  if (value === 'warning') return '提醒';
  if (value === 'failed') return '缺口';
  return '暂无';
}

export function coverageCountLabel(dimensionId: string, kind: 'ready' | 'warning' | 'failed'): string {
  if (dimensionId === 'verification' && kind === 'ready') return '已验证';
  if (dimensionId === 'verification' && kind === 'warning') return '已有命令';
  if (dimensionId === 'verification' && kind === 'failed') return '待补证';
  if (kind === 'ready') return '就绪';
  if (kind === 'warning') return '提醒';
  return '缺口';
}

export function runtimeProfileText(value: string): string {
  if (value === 'service') return '常驻服务';
  if (value === 'static') return '静态前端';
  if (value === 'cli') return 'CLI 工具';
  if (value === 'library') return '库/框架';
  if (value === 'converged') return '已收敛';
  if (value === 'unknown') return '形态待判定';
  return value;
}

export function verifyText(value: string): string {
  if (value === 'verified') return '验证通过';
  if (value === 'failed') return '验证失败';
  if (value === 'documented') return '可验证未留证';
  if (value === 'unknown') return '暂无验证';
  return value;
}

export function freshnessText(value?: EvidenceFreshness): string {
  if (!value || value.status === 'unknown') return '新鲜度未知';
  if (value.status === 'stale') return '证据已过期';
  if (value.status === 'fresh') return '证据新鲜';
  return value.status;
}

export function closeoutText(value?: string): string {
  if (value === 'closed') return 'closeout 已收口';
  if (value === 'missing') return 'closeout 待补';
  return 'closeout 未知';
}

export function triageCategoryForDimension(dimensionId: string): string {
  if (dimensionId === 'runtime_probe') return 'runtime';
  if (dimensionId === 'verification') return 'verification';
  if (dimensionId === 'commands' || dimensionId === 'project_docs' || dimensionId === 'manifest' || dimensionId === 'security_contract') return 'coverage';
  return dimensionId;
}

export function triageRiskWeight(risk: string): number {
  if (risk === 'high') return 3;
  if (risk === 'medium') return 2;
  if (risk === 'low') return 1;
  return 0;
}

export function draftSourceLabel(type?: string): string {
  if (!type) return '草稿';
  return DRAFT_SOURCE_LABELS[type] || '草稿';
}

export function draftPriorityWeight(priority?: string): number {
  return DRAFT_PRIORITY_WEIGHT[priority || ''] || 0;
}

export function draftSourceWeight(type?: string): number {
  if (!type) return 99;
  return DRAFT_SOURCE_WEIGHT[type] ?? 99;
}

export function pageMaturityStatusText(value: PageMaturity['status']): string {
  if (value === 'ready') return '可日用';
  if (value === 'watch') return '观察';
  return '待补齐';
}

export function pageMaturityGapSignals(item: PageMaturity): PageMaturityGapSignal[] {
  const signals: PageMaturityGapSignal[] = [];
  if (item.projects.length === 0) {
    signals.push({ id: 'projects', title: '项目映射缺失', detail: '页面还没挂上明确项目或服务对象。' });
  }
  if (item.domains.length === 0) {
    signals.push({ id: 'domains', title: '能力域缺失', detail: '页面承载了什么能力还没在功能域里说明。' });
  }
  if (item.usagePaths.length === 0) {
    signals.push({ id: 'usage', title: '使用路径缺失', detail: '页面还没进入任何高频操作路径。' });
  }
  if (item.playbookSteps.length === 0) {
    signals.push({ id: 'playbook', title: '清单步骤缺失', detail: '页面还没进入一条可执行操作清单。' });
  }
  if (item.roadmapItems.length === 0) {
    signals.push({ id: 'roadmap', title: '路线图缺失', detail: '页面的演进计划还没挂到路线图。' });
  }
  if (item.operatorActions.length === 0) {
    signals.push({ id: 'actions', title: '受控动作缺失', detail: '页面还缺少可推进问题的受控动作或排查操作。' });
  }
  return signals;
}

export function normalizeSearchText(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[()\-_/.,:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferGapScope(gap: CapabilityGap): CapabilityGapScope {
  const text = normalizeSearchText([gap.id, gap.title, gap.evidence, gap.next].join(' '));
  if (text.includes('项目') || text.includes('project')) return 'project';
  if (text.includes('页面') || text.includes('page')) return 'page';
  if (text.includes('能力域') || text.includes('领域') || text.includes('domain') || text.includes('provider')) return 'domain';
  if (text.includes('路径') || text.includes('清单') || text.includes('playbook') || text.includes('route')) return 'flow';
  return 'mixed';
}

export function includesGapTerm(haystack: string, value?: string): boolean {
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue || normalizedValue.length < 2) return false;
  return haystack.includes(normalizedValue);
}

export function uniqueById<T extends { id: string }>(items: Array<T | null | undefined>): T[] {
  const seen = new Set<string>();
  const rows: T[] = [];
  items.forEach((item) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    rows.push(item);
  });
  return rows;
}

export function uniquePageMaturityItems(items: Array<PageMaturity | null | undefined>): PageMaturity[] {
  const seen = new Set<string>();
  const rows: PageMaturity[] = [];
  items.forEach((item) => {
    const pageId = item?.page.id;
    if (!item || !pageId || seen.has(pageId)) return;
    seen.add(pageId);
    rows.push(item);
  });
  return rows;
}

export function compactPath(path: string): string {
  const marker = '/Workspace/';
  const markerIndex = path.indexOf(marker);
  return markerIndex >= 0 ? path.slice(markerIndex + marker.length) : path;
}

export function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function openSystemMapTarget(
  target: CockpitNavigationTarget,
  onNavigate: (tab: string) => void,
  onOpenTarget?: (target: CockpitNavigationTarget) => void,
) {
  if (onOpenTarget) {
    onOpenTarget(target);
    return;
  }
  onNavigate(target.tab);
}

export function operatorActionTarget(action: string, pageId: string): CockpitNavigationTarget {
  if (action === 'open-system-map') return { tab: 'SystemMap', taskQuery: pageId };
  if (action === 'open-task-center' || action.startsWith('request-task-') || action.endsWith('-task')) {
    return { tab: 'TaskCenter', taskQuery: pageId };
  }
  return { tab: pageId };
}

export function operatorActionRequiresTask(action: string): boolean {
  return !/^(open|copy|refresh|filter|select)-/.test(action);
}

export function pageOperatorActionItems(item: PageMaturity): PageMaturity['operatorActionDetails'] {
  if (item.operatorActionDetails.length > 0) return item.operatorActionDetails;
  return item.operatorActions.map((id) => ({ id }));
}

export function pageOperatorActionRiskText(risk?: string): string {
  if (risk === 'high') return '高风险';
  if (risk === 'medium') return '中风险';
  if (risk === 'low') return '低风险';
  return '待判定';
}

export function pageOperatorActionKindText(kind?: string): string {
  return kind === 'queue' ? '进入任务' : '查看页面';
}

export function withTaskDraftHandoff(
  target: CockpitNavigationTarget,
  draftTasks: TaskDraftRecord[],
): CockpitNavigationTarget {
  const matchedDraft = findTaskDraftForTarget(target, draftTasks);
  const incomingDraft = matchedDraft ? taskDraftToIncomingDraft(matchedDraft) : null;
  const draftKey = target.draftKey || (incomingDraft ? persistTaskCenterDraft(incomingDraft) : null);
  return draftKey ? { ...target, draftKey } : target;
}

export function sourceTarget(ref: SourceRef): string {
  return ref.target || `${ref.path}${ref.line ? `:${ref.line}` : ''}`;
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export async function copySourceRef(ref: SourceRef) {
  await copyText(sourceTarget(ref));
}
