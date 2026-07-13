import { type CockpitNavigationTarget } from './cockpitNavigation';

type TaskDraftSource = {
  type?: string;
  id?: string;
  title?: string;
};

type TaskDraftEvidenceField = {
  label?: string;
  value?: string;
  page_id?: string;
  step_id?: string;
  evidence?: string;
  done_when?: string;
};

export interface TaskDraftRecord {
  id: string;
  title?: string;
  description?: string;
  priority?: string;
  tags?: string[];
  source?: TaskDraftSource;
  draft?: {
    kind?: string;
    copy_text?: string;
    step_count?: number;
    guard?: string;
    evidence_fields?: TaskDraftEvidenceField[];
  };
}

export interface TaskCenterIncomingDraft {
  title: string;
  description: string;
  tags: string[];
  checklist: string[];
  copyText: string;
  sourceTarget: CockpitNavigationTarget;
}

const TASK_DRAFT_STORAGE_PREFIX = 'cockpit-task-draft:';

export function persistTaskCenterDraft(draft: TaskCenterIncomingDraft): string | null {
  if (typeof window === 'undefined') return null;
  const key = `${TASK_DRAFT_STORAGE_PREFIX}${Date.now()}`;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
    return key;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function readTaskCenterDraft(key?: string | null): TaskCenterIncomingDraft | null {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as TaskCenterIncomingDraft;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function taskDraftSourceTarget(task: TaskDraftRecord): CockpitNavigationTarget | null {
  if (!task.source?.type) return null;
  if (task.source.type === 'system_map_project_portfolio') {
    return { tab: 'SystemMap', projectId: task.source.id || null };
  }
  if (task.source.type === 'system_map_verification_ready') {
    return { tab: 'SystemMap', projectId: task.source.id || null };
  }
  if (task.source.type === 'system_map_domain_app') {
    return { tab: 'DomainApps', taskQuery: task.source.id || task.title || '' };
  }
  if (task.source.type === 'system_map_capability_gap') {
    return { tab: 'SystemMap', gapId: task.source.id || null };
  }
  if (task.source.type === 'system_map_page_maturity') {
    return { tab: task.source.id || 'SystemMap', pageId: task.source.id || null };
  }
  if (task.source.type === 'system_map_playbook') {
    const pageIds = (task.draft?.evidence_fields || [])
      .map((field) => field.page_id)
      .filter(Boolean) as string[];
    const preferredPage = pageIds.find((pageId) => pageId !== 'Home' && pageId !== 'SystemMap') || pageIds[0];
    return { tab: preferredPage || 'SystemMap', pageId: preferredPage || null };
  }
  return null;
}

export function taskDraftToIncomingDraft(task: TaskDraftRecord): TaskCenterIncomingDraft | null {
  const sourceTarget = taskDraftSourceTarget(task);
  if (!sourceTarget) return null;

  const evidenceChecklist = (task.draft?.evidence_fields || [])
    .map((field, index) => {
      const head = field.label || field.page_id || field.step_id || `步骤 ${index + 1}`;
      const detail = field.value || field.evidence || field.done_when || '确认该项已完成';
      return `${head}：${detail}`;
    })
    .filter(Boolean)
    .slice(0, 4);

  const fallbackChecklist = task.source?.type === 'system_map_project_portfolio'
    ? ['回系统地图核对项目阻塞原因', '确认最近验证或运行证据', '把修复动作沉到任务中心']
    : task.source?.type === 'system_map_verification_ready'
      ? ['确认验证命令仍可执行', '补 workflow / closeout 证据', '把验证结果回填到正式承接链']
      : task.source?.type === 'system_map_domain_app'
        ? ['回应用中心检查运行态与安全门', '确认入口 URL、认证与新鲜度状态', '把领域处理动作沉到任务中心']
        : task.source?.type === 'system_map_capability_gap'
          ? ['回系统地图确认缺口边界', '拆成页面、项目、命令或探针动作', '把缺口收口动作沉到任务中心']
          : task.source?.type === 'system_map_page_maturity'
            ? ['回来源页面核对当前用途和缺口', '补齐路径、能力域或任务承接', '把页面补位动作沉到任务中心']
            : ['回来源页确认执行路径', '补执行证据和 done_when', '把下一步动作沉到任务中心'];

  const checklist = evidenceChecklist.length > 0 ? evidenceChecklist : fallbackChecklist;
  const title = task.title || task.source?.title || task.id;
  const description = task.description || task.source?.title || '把这条草稿继续承接成正式动作。';
  const tags = [...new Set([
    'cockpit',
    'task-draft-handoff',
    ...((task.tags || []).slice(0, 6)),
  ])];
  const copyText = task.draft?.copy_text || [
    `标题: ${title}`,
    `来源: ${task.source?.title || task.source?.id || '任务草稿'}`,
    `任务描述: ${description}`,
    '建议动作:',
    ...checklist.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');

  return {
    title,
    description,
    tags,
    checklist,
    copyText,
    sourceTarget,
  };
}

function normalizeDraftMatchValue(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

export function findTaskDraftForTarget(
  target: CockpitNavigationTarget,
  drafts: TaskDraftRecord[],
): TaskDraftRecord | null {
  if (target.tab !== 'TaskCenter' || target.draftKey) return null;

  const query = normalizeDraftMatchValue(target.taskQuery);
  const projectId = normalizeDraftMatchValue(target.projectId);
  const gapId = normalizeDraftMatchValue(target.gapId);
  const pageId = normalizeDraftMatchValue(target.pageId);
  const usagePathId = normalizeDraftMatchValue(target.usagePathId);

  const scored = drafts
    .map((task) => {
      const taskId = normalizeDraftMatchValue(task.id);
      const sourceId = normalizeDraftMatchValue(task.source?.id);
      const sourceTitle = normalizeDraftMatchValue(task.source?.title);
      const title = normalizeDraftMatchValue(task.title);
      const evidencePageIds = (task.draft?.evidence_fields || [])
        .map((field) => normalizeDraftMatchValue(field.page_id))
        .filter(Boolean);

      let score = 0;
      if (query && [taskId, sourceId, sourceTitle, title].includes(query)) score += 6;
      if (projectId && sourceId === projectId) score += 5;
      if (gapId && sourceId === gapId) score += 5;
      if (pageId && (sourceId === pageId || evidencePageIds.includes(pageId))) score += 5;
      if (usagePathId && [title, sourceTitle].some((value) => value.includes(usagePathId))) score += 3;
      return { task, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.task || null;
}
