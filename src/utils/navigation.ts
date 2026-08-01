/**
 * 导航映射工具 — 草稿/手册/任务 → CockpitNavigationTarget.
 *
 * 从 fullsite HomePage.tsx / OverviewPage.tsx / TaskCenterPage.tsx 提取:
 *   - draftTarget — 草稿 → 导航目标
 *   - playbookTarget — 手册首个有效步骤 → tab ID
 *   - usagePathTarget — 使用路径首个非 Home 步骤 → tab ID
 *   - sourceTypeDefaultTarget — 任务来源类型 → 默认导航目标
 *
 * 所有函数返回 CockpitNavigationTarget，与 openCockpitNavigationTarget 配合使用.
 */

import type { CockpitNavigationTarget } from '../components/cockpitNavigation';
import type {
  FocusActionDraft,
  UsagePath,
  OperatingPlaybook,
  DraftSourceType,
} from '../types/cockpit';

/** 来源类型 → 导航目标映射表 (核心路由逻辑) */
const SOURCE_TYPE_TARGET_MAP: Record<DraftSourceType, (sourceId?: string | null) => CockpitNavigationTarget> = {
  system_map_project_portfolio: (id) => ({ tab: 'SystemMap', projectId: id ?? null }),
  system_map_verification_ready: (id) => ({ tab: 'SystemMap', projectId: id ?? null }),
  system_map_playbook: (id) => ({ tab: 'SystemMap', pageId: id ?? null }),
  system_map_domain_app: (id) => ({ tab: 'DomainApps', taskQuery: id ?? undefined }),
  system_map_capability_gap: (id) => ({ tab: 'SystemMap', gapId: id ?? null }),
  system_map_page_maturity: (id) => ({ tab: 'SystemMap', pageId: id ?? null }),
  system_map_usage_path: (id) => ({ tab: 'SystemMap', usagePathId: id ?? null }),
  system_map_roadmap_item: (id) => ({ tab: 'SystemMap', pageId: id ?? null }),
};

/**
 * 来源类型 → 默认导航目标 (核心函数).
 */
export function sourceTypeDefaultTarget(
  type: DraftSourceType | string | undefined,
  sourceId?: string | null,
): CockpitNavigationTarget {
  const factory = SOURCE_TYPE_TARGET_MAP[type as DraftSourceType];
  return factory ? factory(sourceId) : { tab: 'TaskCenter', taskQuery: sourceId ?? undefined };
}

/**
 * 草稿 → 导航目标.
 *
 * 从 FocusActionDraft 提取来源类型和 ID，调用核心路由函数.
 */
export function draftTarget(draft: FocusActionDraft): CockpitNavigationTarget {
  return sourceTypeDefaultTarget(draft.sourceType, draft.sourceId);
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
