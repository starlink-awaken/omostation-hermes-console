import type { CockpitNavigationTarget } from '../cockpitNavigation';
import { GUIDE_GROUPS } from './useGuideData';

export function pageCoverageStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'watch') return 'watch';
  return 'gap';
}

export function pageCoverageStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'watch') return '待收口';
  return '待补位';
}

export function dimensionStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'warning' || status === 'watch') return 'watch';
  return 'gap';
}

export function dimensionStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'warning' || status === 'watch') return '待收口';
  return '待修复';
}

export function guideDraftTypeLabel(type?: string) {
  if (type === 'system_map_page_maturity') return '页面补位';
  if (type === 'system_map_capability_gap') return '能力缺口';
  if (type === 'system_map_domain_app') return '领域挂载';
  if (type === 'system_map_project_portfolio') return '项目组合';
  if (type === 'system_map_playbook') return '操作清单';
  if (type === 'system_map_verification_ready') return '验证补证';
  return '承接任务';
}

export function guideProjectStatusClass(status?: string) {
  if (status === 'healthy' || status === 'ready') return 'ready';
  if (status === 'watch' || status === 'at_risk') return 'watch';
  return 'gap';
}

export function guideProjectStatusText(status?: string) {
  if (status === 'healthy' || status === 'ready') return '项目稳定';
  if (status === 'watch') return '继续观察';
  if (status === 'at_risk') return '项目风险';
  if (status === 'blocked') return '项目阻塞';
  return status || '待收口';
}

export function guideDraftObjectTarget(draft: { sourceType: string; sourceId: string }): CockpitNavigationTarget {
  if (draft.sourceType === 'system_map_domain_app') {
    return { tab: 'DomainApps', taskQuery: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_capability_gap') {
    return { tab: 'SystemMap', gapId: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_project_portfolio') {
    return { tab: 'SystemMap', projectId: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_verification_ready') {
    return isGuidePageId(draft.sourceId)
      ? { tab: 'SystemMap', pageId: draft.sourceId }
      : { tab: 'SystemMap', projectId: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_page_maturity') {
    return { tab: 'SystemMap', pageId: draft.sourceId };
  }
  return { tab: 'TaskCenter', taskQuery: draft.sourceId };
}

export function executionStepTarget(step: string, fallback?: CockpitNavigationTarget): CockpitNavigationTarget {
  if (step === '首页') return { tab: 'Home' };
  if (step === '告警中心') return { tab: 'AlertCenter' };
  if (step === '任务中心') return { tab: 'TaskCenter' };
  if (step === '日志查看器') return { tab: 'LogViewer', taskQuery: 'verification' };
  if (step === '系统地图') return { tab: 'SystemMap' };
  if (step === '应用中心') return { tab: 'DomainApps' };
  if (step === '积分冒险') return { tab: 'QuestBoard' };
  if (step === '底层设置') return { tab: 'Settings' };
  if (step === '工作流') return { tab: 'Workflows' };
  if (step === '协议工作台') return { tab: 'Protocol' };
  return fallback || { tab: 'SystemMap' };
}

function isGuidePageId(value?: string) {
  if (!value) return false;
  return GUIDE_GROUPS.some((group) => group.pages.some((page) => page.id === value));
}

export function matchesGuideFocusQuery(value?: string | null, query?: string) {
  if (!value || !query) return false;
  const haystack = value.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!haystack || !needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}
