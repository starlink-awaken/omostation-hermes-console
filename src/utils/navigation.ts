/**
 * 导航映射工具 — 草稿/手册/任务 → CockpitNavigationTarget.
 *
 * 从 fullsite HomePage.tsx / OverviewPage.tsx / TaskCenterPage.tsx 提取:
 *   - draftTarget — 草稿来源类型 → 导航目标
 *   - playbookTarget — 手册首个有效步骤 → tab ID
 *   - usagePathTarget — 使用路径首个非 Home 步骤 → tab ID
 *   - sourceTypeDefaultTarget — 任务来源类型 → 默认导航目标
 *
 * 所有函数返回 CockpitNavigationTarget，与 openCockpitNavigationTarget 配合使用.
 */

import type { CockpitNavigationTarget } from '../components/cockpitNavigation';

/** 焦点动作草稿 (来自 toFocusActionDraft) */
export interface FocusActionDraft {
  id: string;
  title: string;
  sourceLabel: string;
  sourceType?: string;
  sourceId?: string;
  priority?: string;
  description?: string;
}

/** 使用路径 (简化版) */
export interface UsagePath {
  id: string;
  title?: string;
  steps?: string[];
  pages?: Array<{ id: string; title?: string }>;
}

/** 操作手册 (简化版) */
export interface OperatingPlaybook {
  id: string;
  title?: string;
  steps?: Array<{ page_id?: string; page?: { id?: string } }>;
}

/**
 * 草稿 → 导航目标.
 *
 * 根据草稿来源类型决定跳转到哪个视图:
 *   - system_map_project_portfolio → SystemMap (项目)
 *   - system_map_domain_app → DomainApps (域应用)
 *   - system_map_capability_gap → SystemMap (缺口)
 *   - system_map_page_maturity → SystemMap (页面成熟度)
 *   - 其他 → TaskCenter (默认)
 */
export function draftTarget(draft: FocusActionDraft): CockpitNavigationTarget {
  if (draft.sourceType === 'system_map_project_portfolio') {
    return { tab: 'SystemMap', projectId: draft.sourceId ?? null };
  }
  if (draft.sourceType === 'system_map_domain_app') {
    return { tab: 'DomainApps', taskQuery: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_capability_gap') {
    return { tab: 'SystemMap', gapId: draft.sourceId ?? null };
  }
  if (draft.sourceType === 'system_map_page_maturity') {
    return { tab: 'SystemMap', pageId: draft.sourceId ?? null };
  }
  return { tab: 'TaskCenter', taskQuery: draft.sourceId };
}

/**
 * 使用路径首个有效步骤 → tab ID.
 *
 * 跳过 Home 步骤，返回第一个有意义的目标.
 */
export function usagePathTarget(path: UsagePath): string {
  const steps = path.steps && path.steps.length > 0
    ? path.steps
    : (path.pages || []).map((page) => page.id);
  return steps.find((step) => step !== 'Home') || steps[0] || 'SystemMap';
}

/**
 * 操作手册首个有效步骤 → tab ID.
 *
 * 跳过 Home 和 SystemMap 步骤.
 */
export function playbookTarget(playbook: OperatingPlaybook): string {
  const stepIds = (playbook.steps || [])
    .map((step) => step.page_id || step.page?.id)
    .filter(Boolean) as string[];
  return stepIds.find((id) => id !== 'Home' && id !== 'SystemMap') || stepIds[0] || 'SystemMap';
}

/** 任务来源类型 (6 种 system_map 来源) */
export type DraftSourceType =
  | 'system_map_project_portfolio'
  | 'system_map_domain_app'
  | 'system_map_capability_gap'
  | 'system_map_page_maturity'
  | 'system_map_usage_path'
  | 'system_map_roadmap_item';

/** 来源类型 → 默认导航目标 */
export function sourceTypeDefaultTarget(
  type: DraftSourceType,
  sourceId?: string | null,
): CockpitNavigationTarget {
  switch (type) {
    case 'system_map_project_portfolio':
      return { tab: 'SystemMap', projectId: sourceId ?? null };
    case 'system_map_domain_app':
      return { tab: 'DomainApps', taskQuery: sourceId ?? undefined };
    case 'system_map_capability_gap':
      return { tab: 'SystemMap', gapId: sourceId ?? null };
    case 'system_map_page_maturity':
      return { tab: 'SystemMap', pageId: sourceId ?? null };
    case 'system_map_usage_path':
      return { tab: 'SystemMap', usagePathId: sourceId ?? null };
    case 'system_map_roadmap_item':
      return { tab: 'SystemMap', pageId: sourceId ?? null };
    default:
      return { tab: 'TaskCenter', taskQuery: sourceId ?? undefined };
  }
}
