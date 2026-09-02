import { useMemo } from 'react';
import { COCKPIT_WORK_MODES } from '../cockpitWorkModes';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuideMetrics, GuideGroup, ProblemEntryCard } from './types';
import {
  guideDraftObjectTarget,
  guideDraftTypeLabel,
  guideProjectStatusClass,
  guideProjectStatusText,
  matchesGuideFocusQuery,
} from './guideHelpers';

type GuidePagesById = Map<string, { title: string; group: string }>;

export interface GuideComputationsOptions {
  metrics: GuideMetrics;
  GUIDE_GROUPS: GuideGroup[];
  GUIDE_PAGES_BY_ID: GuidePagesById;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
}

export interface GuideComputations {
  summaryCards: Array<{ id: string; label: string; value: string; detail: string }>;
  coverageSummary: {
    total: number;
    ready: number;
    watch: number;
    gap: number;
    withSystemMap: number;
    withUsagePath: number;
    withFeatureDomain: number;
  };
  usageCoverageSummary: {
    total: number;
    ready: number;
    attention: number;
    missingPlaybook: number;
    missingFeatureDomain: number;
  };
  architectureLaneRows: Array<{
    id: string;
    title: string;
    summary: string;
    status: string;
    signal: string;
    pageCount: number;
    usageCount: number;
    domainCount: number;
    draftCount: number;
    roadmapCount: number;
    attentionCount: number;
    nextAction: string;
    objectTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  }>;
  architectureLaneSummary: {
    total: number;
    ready: number;
    attention: number;
    usageConnected: number;
    roadmapLinked: number;
  };
  coverageGroups: Array<GuideGroup & { rows: GuideMetrics['pageCoverageRows'] }>;
  featureDomainCoverageSummary: {
    total: number;
    ready: number;
    watch: number;
    gap: number;
    withUsagePath: number;
    withCapabilityItems: number;
  };
  dimensionCoverageSummary: {
    total: number;
    ready: number;
    warning: number;
    failed: number;
    attentionProjects: number;
  };
  projectEntryRows: Array<{
    id: string;
    title: string;
    statusClass: string;
    statusText: string;
    layer: string;
    score: number;
    entryPageId: string;
    entryPageTitle: string;
    entryPageGroup: string;
    relatedDimensions: string[];
    relatedDrafts: GuideMetrics['featuredDrafts'];
    nextAction: string;
    summary: string;
    entryTarget: CockpitNavigationTarget;
    coverageTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  }>;
  projectEntrySummary: {
    total: number;
    mapped: number;
    atRisk: number;
    blocked: number;
    withDrafts: number;
  };
  objectCoverageRows: Array<{
    id: string;
    kind: string;
    title: string;
    statusClass: string;
    statusText: string;
    meta: string;
    summary: string;
    nextAction: string;
    objectTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  }>;
  objectCoverageSummary: {
    total: number;
    projects: number;
    domains: number;
    drafts: number;
    ready: number;
  };
  missingCapabilityRows: Array<{
    id: string;
    category: string;
    title: string;
    signal: string;
    summary: string;
    objectTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  }>;
  missingCapabilitySummary: {
    total: number;
    page: number;
    evidence: number;
    domain: number;
    project: number;
    roadmap: number;
  };
  executionChainRows: Array<{
    id: string;
    title: string;
    signal: string;
    summary: string;
    nextAction: string;
    steps: string[];
    primaryTarget: CockpitNavigationTarget;
    secondaryTarget: CockpitNavigationTarget;
  }>;
  roleWorkbenchRows: Array<{
    id: string;
    signal: string;
    summary: string;
    objectLabel: string;
    objectTarget: CockpitNavigationTarget;
    evidenceLabel: string;
    evidenceTarget: CockpitNavigationTarget;
  }>;
  focusedGuideCard: {
    title: string;
    meta: string;
    state: string;
    nextAction: string;
    objectTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  } | null;
  problemEntryCards: ProblemEntryCard[];
}

function pageCoverageStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'watch') return 'watch';
  return 'gap';
}

function pageCoverageStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'watch') return '待收口';
  return '待补位';
}

export function useGuideComputations({
  metrics,
  GUIDE_GROUPS,
  GUIDE_PAGES_BY_ID,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: GuideComputationsOptions): GuideComputations {
  const summaryCards = useMemo(() => [
    { id: 'pages', label: '页面覆盖', value: `${GUIDE_GROUPS.reduce((total, group) => total + group.pages.length, 0)} 页`, detail: '当前导览已把 cockpit 的核心页面按工作带重新分组。' },
    { id: 'usage', label: '使用路径', value: `${metrics.usagePaths} 条`, detail: '把"先看哪、再去哪"从页面导航提升成路径导航。' },
    { id: 'domains', label: '能力域', value: `${metrics.featureDomains} 个`, detail: '让页面和能力域、项目、路线图之间能相互定位。' },
    {
      id: 'attention',
      label: '当前补位',
      value: metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补` : '已收敛',
      detail: metrics.domainSummary.total > 0
        ? `领域挂载 ${metrics.domainSummary.running}/${metrics.domainSummary.total} 在线 · 高风险 ${metrics.domainSummary.highRisk}。`
        : metrics.projectCoverageScore !== null
          ? `项目覆盖得分 ${metrics.projectCoverageScore}%，可以从系统地图继续下钻。`
          : '优先补齐使用路径、验证证据和领域挂载承接。',
    },
  ], [metrics.attentionPages, metrics.domainSummary.highRisk, metrics.domainSummary.running, metrics.domainSummary.total, metrics.featureDomains, metrics.projectCoverageScore, metrics.usagePaths, GUIDE_GROUPS]);

  const coverageSummary = useMemo(() => {
    const rows = metrics.pageCoverageRows;
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === 'ready').length,
      watch: rows.filter((row) => row.status === 'watch').length,
      gap: rows.filter((row) => row.status !== 'ready' && row.status !== 'watch').length,
      withSystemMap: rows.filter((row) => !row.missingSystemMapRegistration).length,
      withUsagePath: rows.filter((row) => !row.missingUsagePath).length,
      withFeatureDomain: rows.filter((row) => !row.missingFeatureDomain).length,
    };
  }, [metrics.pageCoverageRows]);

  const usageCoverageSummary = useMemo(() => {
    const rows = metrics.usageCoverageRows;
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === 'ready').length,
      attention: rows.filter((row) => row.status !== 'ready').length,
      missingPlaybook: rows.filter((row) => row.playbooks.length === 0).length,
      missingFeatureDomain: rows.filter((row) => row.featureDomains.length === 0).length,
    };
  }, [metrics.usageCoverageRows]);

  const architectureLaneRows = useMemo(() => (
    GUIDE_GROUPS.map((group) => {
      const pageRows = metrics.pageCoverageRows.filter((row) => row.groupId === group.id);
      const pageIdSet = new Set(pageRows.map((row) => row.id));
      const usageRows = metrics.usageCoverageRows.filter((row) => row.pageIds.some((pageId) => pageIdSet.has(pageId)));
      const domainTitles = [...new Set([
        ...pageRows.flatMap((row) => row.featureDomains),
        ...usageRows.flatMap((row) => row.featureDomains),
      ])];
      const roadmapTitles = [...new Set([
        ...pageRows.flatMap((row) => row.roadmapTitles),
        ...usageRows.flatMap((row) => row.roadmapTitles),
      ])];
      const relatedDrafts = [...metrics.featuredDrafts, ...metrics.closureDrafts].filter((draft) => pageIdSet.has(draft.sourceId));
      const laneDomainAttention = group.id === 'domain' ? metrics.domainAttention : [];
      const attentionPageRows = pageRows.filter((row) => row.status !== 'ready');
      const attentionUsageRows = usageRows.filter((row) => row.status !== 'ready');
      const severityWeight = attentionPageRows.reduce((total, row) => total + (row.status === 'gap' ? 2 : 1), 0)
        + attentionUsageRows.reduce((total, row) => total + (row.status === 'gap' ? 2 : 1), 0)
        + laneDomainAttention.length;
      const status = severityWeight === 0 ? 'ready' : severityWeight <= 2 ? 'watch' : 'gap';
      const primaryPage = attentionPageRows[0];
      const primaryUsage = attentionUsageRows[0];
      const primaryDomain = laneDomainAttention[0];
      const objectTarget = primaryPage
        ? { tab: 'SystemMap', pageId: primaryPage.id }
        : primaryUsage
          ? { tab: 'SystemMap', usagePathId: primaryUsage.id }
          : primaryDomain
            ? { tab: 'DomainApps', taskQuery: primaryDomain.id }
            : group.target;
      const taskTarget = primaryPage
        ? { tab: 'TaskCenter', taskQuery: primaryPage.taskQuery }
        : primaryUsage
          ? { tab: 'TaskCenter', usagePathId: primaryUsage.id, taskQuery: primaryUsage.taskQuery }
          : primaryDomain
            ? { tab: 'TaskCenter', taskQuery: primaryDomain.taskQuery }
            : { tab: 'TaskCenter', taskQuery: group.pages[0]?.id || group.id };
      const nextAction = primaryPage?.nextAction
        || primaryUsage?.nextAction
        || primaryDomain?.nextAction
        || roadmapTitles[0]
        || group.description;

      return {
        id: group.id,
        title: group.title,
        summary: group.summary,
        status,
        signal: `页面 ${pageRows.length} · 使用链 ${usageRows.length} · 能力域 ${domainTitles.length}`,
        pageCount: pageRows.length,
        usageCount: usageRows.length,
        domainCount: domainTitles.length,
        draftCount: relatedDrafts.length,
        roadmapCount: roadmapTitles.length,
        attentionCount: attentionPageRows.length + attentionUsageRows.length + laneDomainAttention.length,
        nextAction,
        objectTarget: objectTarget as CockpitNavigationTarget,
        taskTarget: taskTarget as CockpitNavigationTarget,
      };
    })
  ), [metrics.closureDrafts, metrics.domainAttention, metrics.featuredDrafts, metrics.pageCoverageRows, metrics.usageCoverageRows, GUIDE_GROUPS]);

  const architectureLaneSummary = useMemo(() => ({
    total: architectureLaneRows.length,
    ready: architectureLaneRows.filter((row) => row.status === 'ready').length,
    attention: architectureLaneRows.filter((row) => row.status !== 'ready').length,
    usageConnected: architectureLaneRows.filter((row) => row.usageCount > 0).length,
    roadmapLinked: architectureLaneRows.filter((row) => row.roadmapCount > 0).length,
  }), [architectureLaneRows]);

  const coverageGroups = useMemo(() => (
    GUIDE_GROUPS.map((group) => ({
      ...group,
      rows: metrics.pageCoverageRows.filter((row) => row.groupId === group.id),
    }))
  ), [metrics.pageCoverageRows, GUIDE_GROUPS]);

  const featureDomainCoverageSummary = useMemo(() => {
    const rows = metrics.featureDomainRows;
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === 'ready').length,
      watch: rows.filter((row) => row.status === 'watch').length,
      gap: rows.filter((row) => row.status !== 'ready' && row.status !== 'watch').length,
      withUsagePath: rows.filter((row) => row.usagePaths.length > 0).length,
      withCapabilityItems: rows.filter((row) => row.capabilityCount > 0).length,
    };
  }, [metrics.featureDomainRows]);

  const dimensionCoverageSummary = useMemo(() => {
    const rows = metrics.dimensionCoverageRows;
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === 'ready').length,
      warning: rows.filter((row) => row.status === 'warning' || row.status === 'watch').length,
      failed: rows.filter((row) => row.status !== 'ready' && row.status !== 'warning' && row.status !== 'watch').length,
      attentionProjects: rows.reduce((total, row) => total + row.attentionProjects.length, 0),
    };
  }, [metrics.dimensionCoverageRows]);

  const projectEntryRows = useMemo(() => (
    metrics.priorityProjects.map((project) => {
      const entryPage = GUIDE_PAGES_BY_ID.get(project.cockpitPage || '') || null;
      const relatedDrafts = [...metrics.featuredDrafts, ...metrics.closureDrafts]
        .filter((draft) => (
          draft.sourceId === project.id
          || (project.cockpitPage ? draft.sourceId === project.cockpitPage : false)
        ));
      const relatedDimensions = metrics.dimensionCoverageRows
        .filter((row) => row.attentionProjects.some((item) => item.id === project.id || item.id === project.cockpitPage))
        .slice(0, 3)
        .map((row) => row.title);

      return {
        id: project.id,
        title: project.id,
        statusClass: guideProjectStatusClass(project.status),
        statusText: guideProjectStatusText(project.status),
        layer: project.layer || '项目',
        score: project.score ?? 0,
        entryPageId: project.cockpitPage || 'SystemMap',
        entryPageTitle: entryPage?.title || project.cockpitPage || '系统地图',
        entryPageGroup: entryPage?.group || '项目总控',
        relatedDimensions,
        relatedDrafts,
        nextAction: project.nextAction || project.primaryGap || '先确认这个项目当前最影响使用面的缺口。',
        summary: project.primaryGap || '先回项目覆盖面确认入口、承接和验证是否都接通。',
        entryTarget: { tab: project.cockpitPage || 'SystemMap' } as CockpitNavigationTarget,
        coverageTarget: { tab: 'SystemMap', projectId: project.id } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: project.id } as CockpitNavigationTarget,
      };
    })
  ), [metrics.closureDrafts, metrics.dimensionCoverageRows, metrics.featuredDrafts, metrics.priorityProjects, GUIDE_PAGES_BY_ID]);

  const projectEntrySummary = useMemo(() => ({
    total: projectEntryRows.length,
    mapped: projectEntryRows.filter((row) => row.entryPageId !== 'SystemMap').length,
    atRisk: projectEntryRows.filter((row) => row.statusText === '项目风险').length,
    blocked: projectEntryRows.filter((row) => row.statusText === '项目阻塞').length,
    withDrafts: projectEntryRows.filter((row) => row.relatedDrafts.length > 0).length,
  }), [projectEntryRows]);

  const objectCoverageRows = useMemo(() => {
    const projectRows = metrics.priorityProjects.map((project) => ({
      id: `project-${project.id}`,
      kind: '项目对象',
      title: project.id,
      statusClass: guideProjectStatusClass(project.status),
      statusText: guideProjectStatusText(project.status),
      meta: `${project.layer || '项目'} · ${project.score ?? 0}%`,
      summary: project.primaryGap || project.nextAction || '回系统地图继续看项目覆盖和组合阻塞。',
      nextAction: project.nextAction || '先确认这个项目当前最影响使用面的缺口。',
      objectTarget: { tab: 'SystemMap', projectId: project.id } as CockpitNavigationTarget,
      taskTarget: { tab: 'TaskCenter', taskQuery: project.id } as CockpitNavigationTarget,
    }));

    const domainRows = metrics.domainAttention.map((item) => ({
      id: `domain-${item.id}`,
      kind: '领域对象',
      title: item.name,
      statusClass: item.runtimeStatus === 'running' && item.securityPosture === 'passed' ? 'ready' : item.securityPosture === 'passed' ? 'watch' : 'gap',
      statusText: item.runtimeStatus === 'running' && item.securityPosture === 'passed' ? '运行稳定' : item.securityPosture === 'passed' ? '待收口' : '安全待补',
      meta: `${item.domainName || '领域应用'} · ${item.runtimeStatus} · ${item.riskLevel}`,
      summary: item.taskTitle || item.nextAction,
      nextAction: item.nextAction,
      objectTarget: { tab: 'DomainApps', taskQuery: item.id } as CockpitNavigationTarget,
      taskTarget: { tab: 'TaskCenter', taskQuery: item.taskQuery } as CockpitNavigationTarget,
    }));

    const uniqueDrafts = [...metrics.featuredDrafts, ...metrics.closureDrafts]
      .filter((draft, index, allDrafts) => (
        allDrafts.findIndex((item) => item.id === draft.id) === index
      ))
      .slice(0, 6);

    const draftRows = uniqueDrafts
      .map((draft) => ({
        id: `draft-${draft.id}`,
        kind: `${guideDraftTypeLabel(draft.sourceType)}草稿`,
        title: draft.title,
        statusClass: draft.sourceType === 'system_map_verification_ready' ? 'watch' : 'gap',
        statusText: draft.sourceType === 'system_map_verification_ready' ? '待补证' : '待承接',
        meta: `${guideDraftTypeLabel(draft.sourceType)} · ${draft.sourceId}`,
        summary: draft.description || `先把 ${draft.sourceId} 的承接动作继续沉到任务中心。`,
        nextAction: draft.description || '先看草稿来源对象，再确认任务承接是否已经接通。',
        objectTarget: guideDraftObjectTarget(draft),
        taskTarget: { tab: 'TaskCenter', taskQuery: draft.sourceId } as CockpitNavigationTarget,
      }));

    return [...projectRows, ...domainRows, ...draftRows];
  }, [metrics.closureDrafts, metrics.domainAttention, metrics.featuredDrafts, metrics.priorityProjects]);

  const objectCoverageSummary = useMemo(() => ({
    total: objectCoverageRows.length,
    projects: objectCoverageRows.filter((row) => row.kind === '项目对象').length,
    domains: objectCoverageRows.filter((row) => row.kind === '领域对象').length,
    drafts: objectCoverageRows.filter((row) => row.kind.includes('草稿')).length,
    ready: objectCoverageRows.filter((row) => row.statusClass === 'ready').length,
  }), [objectCoverageRows]);

  const missingCapabilityRows = useMemo(() => {
    const rows = [
      ...metrics.pageAttentionItems.slice(0, 2).map((item) => ({
        id: `missing-page-${item.page_id}`,
        category: '页面能力',
        title: item.page?.title || item.page_id,
        signal: `${item.status} · ${item.score}%`,
        summary: item.next_action || '先把页面补回使用路径、能力域和任务承接。',
        objectTarget: { tab: 'SystemMap', pageId: item.page_id } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: item.page_id } as CockpitNavigationTarget,
      })),
      ...metrics.closureDrafts.slice(0, 2).map((draft) => ({
        id: `missing-evidence-${draft.id}`,
        category: '证据链',
        title: draft.title,
        signal: guideDraftTypeLabel(draft.sourceType),
        summary: draft.description || `继续补齐 ${draft.sourceId} 的执行证据和步骤。`,
        objectTarget: guideDraftObjectTarget(draft),
        taskTarget: { tab: 'TaskCenter', taskQuery: draft.sourceId } as CockpitNavigationTarget,
      })),
      ...metrics.domainAttention.slice(0, 2).map((item) => ({
        id: `missing-domain-${item.id}`,
        category: '领域挂载',
        title: item.name,
        signal: `${item.runtimeStatus} · ${item.securityPosture}`,
        summary: item.nextAction,
        objectTarget: { tab: 'DomainApps', taskQuery: item.id } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: item.taskQuery } as CockpitNavigationTarget,
      })),
      ...metrics.priorityProjects
        .filter((item) => item.status !== 'healthy' && item.status !== 'ready')
        .slice(0, 2)
        .map((item) => ({
          id: `missing-project-${item.id}`,
          category: '项目状态面',
          title: item.id,
          signal: `${item.status || 'unknown'} · ${item.score ?? 0}%`,
          summary: item.primaryGap || item.nextAction || '先补齐项目状态面、验证证据和入口承接。',
          objectTarget: { tab: 'SystemMap', projectId: item.id } as CockpitNavigationTarget,
          taskTarget: { tab: 'TaskCenter', taskQuery: item.id } as CockpitNavigationTarget,
        })),
      ...metrics.roadmapItems.slice(0, 2).map((item) => ({
        id: `missing-roadmap-${item.id}`,
        category: '未来能力',
        title: item.title,
        signal: `${item.priority} · ${item.status}`,
        summary: item.problem || `优先回到 ${item.cockpit_page} 承接这条未来能力。`,
        objectTarget: { tab: 'SystemMap', pageId: item.cockpit_page } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: item.id } as CockpitNavigationTarget,
      })),
    ];

    return rows
      .filter((row, index, allRows) => allRows.findIndex((item) => item.title === row.title && item.category === row.category) === index)
      .slice(0, 8);
  }, [
    metrics.closureDrafts,
    metrics.domainAttention,
    metrics.pageAttentionItems,
    metrics.priorityProjects,
    metrics.roadmapItems,
  ]);

  const missingCapabilitySummary = useMemo(() => ({
    total: missingCapabilityRows.length,
    page: metrics.pageAttentionItems.length,
    evidence: metrics.closureDrafts.length,
    domain: metrics.domainAttention.length,
    project: metrics.priorityProjects.filter((item) => item.status !== 'healthy' && item.status !== 'ready').length,
    roadmap: metrics.roadmapItems.length,
  }), [metrics.closureDrafts.length, metrics.domainAttention.length, missingCapabilityRows.length, metrics.pageAttentionItems.length, metrics.priorityProjects, metrics.roadmapItems.length]);

  const executionChainRows = useMemo(() => {
    const firstPage = metrics.pageAttentionItems[0];
    const firstDomain = metrics.domainAttention[0];
    const firstProject = metrics.priorityProjects[0];
    const firstWeakDimension = metrics.weakestDimensions[0];
    const firstClosureDraft = metrics.closureDrafts[0];
    const evidenceCount = metrics.draftSummary.verificationReady + metrics.draftSummary.playbook;

    return [
      {
        id: 'daily-loop',
        title: '日常值守闭环',
        signal: metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补位` : '入口链基本接通',
        summary: '先看首页看健康和提醒，再把告警、任务和日志串起来，避免发现异常后断在半路。',
        nextAction: firstPage
          ? `${firstPage.page?.title || firstPage.page_id} 还没完全接通，值守时顺手把它补进路径和任务承接。`
          : '先按首页 -> 告警 -> 任务 -> 日志这条链走一遍，确认日常入口真的可用。',
        steps: ['首页', '告警中心', '任务中心', '日志查看器'],
        primaryTarget: { tab: 'Home' } as CockpitNavigationTarget,
        secondaryTarget: { tab: 'LogViewer', taskQuery: 'verification' } as CockpitNavigationTarget,
      },
      {
        id: 'evidence-loop',
        title: '补证与执行闭环',
        signal: evidenceCount > 0 ? `${evidenceCount} 条待补证` : '补证车道相对收敛',
        summary: '任务中心负责承接动作，日志、工作流和协议页负责把执行痕迹与证据补完整。',
        nextAction: firstClosureDraft
          ? `${firstClosureDraft.title} 还需要继续补日志、workflow 或协议证据。`
          : '先回任务中心和工作流页确认 closeout、验证和协议桥接有没有真正落证。',
        steps: ['任务中心', '日志查看器', '工作流', '协议工作台'],
        primaryTarget: { tab: 'TaskCenter', taskQuery: 'system_map_verification_ready' } as CockpitNavigationTarget,
        secondaryTarget: { tab: 'Workflows' } as CockpitNavigationTarget,
      },
      {
        id: 'domain-loop',
        title: '领域挂载闭环',
        signal: metrics.domainSummary.total > 0 ? `${metrics.domainSummary.highRisk} 高风险 / ${metrics.domainSummary.total} 总数` : '领域挂载数据待接入',
        summary: '应用中心负责挂载对象，任务中心负责承接动作，领域页和设置页负责把入口真正接通。',
        nextAction: firstDomain
          ? `${firstDomain.name} 当前 ${firstDomain.runtimeStatus}，先回应用中心确认入口、安全门和后续动作。`
          : '先确认家庭驾驶舱、OPC 和 family-hub 的入口、认证和运行态是不是都还通着。',
        steps: ['应用中心', '任务中心', '积分冒险', '底层设置'],
        primaryTarget: firstDomain ? { tab: 'DomainApps', taskQuery: firstDomain.id } : { tab: 'DomainApps' } as CockpitNavigationTarget,
        secondaryTarget: firstDomain ? { tab: 'TaskCenter', taskQuery: firstDomain.taskQuery } : { tab: 'TaskCenter', taskQuery: 'system_map_domain_app' } as CockpitNavigationTarget,
      },
      {
        id: 'project-loop',
        title: '项目覆盖修复闭环',
        signal: firstWeakDimension ? `${firstWeakDimension.title || firstWeakDimension.id} ${firstWeakDimension.score ?? 0}%` : '项目覆盖暂未暴露短板',
        summary: '先看最弱维度，再定位具体项目，最后回任务中心继续承接修复，不让项目问题只停在矩阵里。',
        nextAction: firstProject
          ? `${firstProject.id} 当前优先缺口是"${firstProject.primaryGap || '待补说明'}"，建议先回项目对象和任务承接。`
          : '先从系统地图最弱维度下钻到项目，再把修复动作送进任务中心。',
        steps: ['系统地图', '任务中心'],
        primaryTarget: firstWeakDimension ? { tab: 'SystemMap', coverageDimensionId: firstWeakDimension.id } : { tab: 'SystemMap' } as CockpitNavigationTarget,
        secondaryTarget: firstProject ? { tab: 'TaskCenter', taskQuery: firstProject.id } : { tab: 'TaskCenter', taskQuery: 'system_map_project_portfolio' } as CockpitNavigationTarget,
      },
    ];
  }, [
    metrics.attentionPages,
    metrics.closureDrafts,
    metrics.domainAttention,
    metrics.domainSummary.highRisk,
    metrics.domainSummary.total,
    metrics.draftSummary.playbook,
    metrics.draftSummary.verificationReady,
    metrics.pageAttentionItems,
    metrics.priorityProjects,
    metrics.weakestDimensions,
  ]);

  const roleWorkbenchRows = useMemo(() => {
    const firstPage = metrics.pageAttentionItems[0];
    const firstDomain = metrics.domainAttention[0];
    const firstProject = metrics.priorityProjects[0];
    const firstWeakDimension = metrics.weakestDimensions[0];
    return COCKPIT_WORK_MODES.map((mode) => {
      if (mode.role === 'operator') {
        return {
          id: mode.id,
          signal: metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补位` : '首页值守链基本接通',
          summary: firstPage
            ? `${firstPage.page?.title || firstPage.page_id} 还会影响日常值守流，建议先顺手补到路径和任务里。`
            : '先从首页、告警、任务、日志这条链确认日常值守真的通了。',
          objectLabel: firstPage?.page?.title || '首页值守链',
          objectTarget: firstPage ? { tab: 'SystemMap', pageId: firstPage.page_id } : { tab: 'Home' },
          evidenceLabel: '日志与告警',
          evidenceTarget: { tab: 'LogViewer', taskQuery: 'verification' } as CockpitNavigationTarget,
        };
      }
      if (mode.role === 'governance') {
        return {
          id: mode.id,
          signal: firstWeakDimension ? `${firstWeakDimension.title || firstWeakDimension.id} ${firstWeakDimension.score ?? 0}%` : '治理短板暂未暴露',
          summary: firstWeakDimension
            ? `${firstWeakDimension.title || firstWeakDimension.id} 现在最拖治理视角，先回系统地图看失败格子和注意项目。`
            : '先从 C2G、债务和 L4 健康确认当前有没有新的治理阻塞。',
          objectLabel: firstWeakDimension?.title || '治理总面',
          objectTarget: firstWeakDimension ? { tab: 'SystemMap', coverageDimensionId: firstWeakDimension.id } : { tab: 'C2G' },
          evidenceLabel: '债务与域健康',
          evidenceTarget: { tab: 'Debt' } as CockpitNavigationTarget,
        };
      }
      if (mode.role === 'builder') {
        return {
          id: mode.id,
          signal: firstProject ? `${firstProject.id} ${firstProject.score ?? 0}%` : '建设面待继续收口',
          summary: firstProject
            ? `${firstProject.id} 当前最适合拿来补功能或补验证，先看项目对象再进任务和沙箱。`
            : '先从系统地图、协议工作台和沙箱把补位动作串起来。',
          objectLabel: firstProject?.id || '建设对象',
          objectTarget: firstProject ? { tab: 'SystemMap', projectId: firstProject.id } : { tab: 'SystemMap' },
          evidenceLabel: '沙箱与协议',
          evidenceTarget: { tab: 'Sandbox' } as CockpitNavigationTarget,
        };
      }
      return {
        id: mode.id,
        signal: firstDomain ? `${firstDomain.name} · ${firstDomain.runtimeStatus}` : '领域挂载面待继续接通',
        summary: firstDomain
          ? `${firstDomain.name} 现在最值得优先收口，建议先看领域对象，再回任务和设置确认入口。`
          : '先看应用中心、Quest 和设置，确认领域入口、安全门和激励面都还通着。',
        objectLabel: firstDomain?.name || '领域对象',
        objectTarget: firstDomain ? { tab: 'DomainApps', taskQuery: firstDomain.id } : { tab: 'DomainApps' },
        evidenceLabel: firstDomain?.taskTitle || '设置与领域证据',
        evidenceTarget: firstDomain ? { tab: 'TaskCenter', taskQuery: firstDomain.taskQuery } : { tab: 'Settings' },
      };
    });
  }, [
    metrics.attentionPages,
    metrics.domainAttention,
    metrics.pageAttentionItems,
    metrics.priorityProjects,
    metrics.weakestDimensions,
  ]);

  const focusedGuideCard = useMemo(() => {
    const pageRow = focusPageId
      ? metrics.pageCoverageRows.find((row) => row.id === focusPageId) || null
      : null;
    const queryDraft = focusTaskQuery
      ? [...metrics.featuredDrafts, ...metrics.closureDrafts].find((draft) =>
        matchesGuideFocusQuery(draft.sourceId, focusTaskQuery)
        || matchesGuideFocusQuery(draft.id, focusTaskQuery)
        || matchesGuideFocusQuery(draft.title, focusTaskQuery),
      ) || null
      : null;
    const projectDraft = focusProjectId
      ? [...metrics.featuredDrafts, ...metrics.closureDrafts].find((draft) =>
        matchesGuideFocusQuery(draft.sourceId, focusProjectId)
        || matchesGuideFocusQuery(draft.id, focusProjectId)
        || matchesGuideFocusQuery(draft.title, focusProjectId),
      ) || null
      : null;
    const domainItem = focusTaskQuery
      ? metrics.domainAttention.find((item) =>
        matchesGuideFocusQuery(item.id, focusTaskQuery)
        || matchesGuideFocusQuery(item.name, focusTaskQuery),
      ) || null
      : null;

    if (pageRow) {
      return {
        title: pageRow.title,
        meta: '从系统地图带回来的页面导览对象',
        state: `${pageCoverageStatusText(pageRow.status)} · ${pageRow.score ?? 0}% · ${pageRow.groupTitle}`,
        nextAction: pageRow.nextAction,
        objectTarget: { tab: 'SystemMap', pageId: pageRow.id } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: pageRow.taskQuery } as CockpitNavigationTarget,
      };
    }

    if (domainItem) {
      return {
        title: domainItem.name,
        meta: `${domainItem.domainName || '领域挂载'} · 从导览页继续承接`,
        state: `运行 ${domainItem.runtimeStatus} · 风险 ${domainItem.riskLevel} · 安全 ${domainItem.securityPosture}`,
        nextAction: domainItem.nextAction,
        objectTarget: { tab: 'DomainApps', taskQuery: domainItem.id } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: domainItem.taskQuery } as CockpitNavigationTarget,
      };
    }

    if (queryDraft) {
      return {
        title: queryDraft.title,
        meta: `从导览页继续承接的${guideDraftTypeLabel(queryDraft.sourceType)}`,
        state: `${guideDraftTypeLabel(queryDraft.sourceType)} · ${queryDraft.sourceId}`,
        nextAction: queryDraft.description || '回任务中心继续承接这条补位动作。',
        objectTarget: queryDraft.sourceType === 'system_map_domain_app'
          ? { tab: 'DomainApps', taskQuery: queryDraft.sourceId }
          : queryDraft.sourceType === 'system_map_capability_gap'
            ? { tab: 'SystemMap', gapId: queryDraft.sourceId }
            : queryDraft.sourceType === 'system_map_project_portfolio'
              ? { tab: 'SystemMap', projectId: queryDraft.sourceId }
              : { tab: 'SystemMap', pageId: queryDraft.sourceId },
        taskTarget: { tab: 'TaskCenter', taskQuery: queryDraft.sourceId } as CockpitNavigationTarget,
      };
    }

    if (projectDraft) {
      return {
        title: projectDraft.title,
        meta: '从系统地图带回来的项目导览对象',
        state: `${guideDraftTypeLabel(projectDraft.sourceType)} · ${projectDraft.sourceId}`,
        nextAction: projectDraft.description || '回系统地图继续看项目覆盖和任务承接。',
        objectTarget: { tab: 'SystemMap', projectId: projectDraft.sourceId } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: projectDraft.sourceId } as CockpitNavigationTarget,
      };
    }

    return null;
  }, [focusPageId, focusProjectId, focusTaskQuery, metrics.closureDrafts, metrics.domainAttention, metrics.featuredDrafts, metrics.pageCoverageRows]);

  const problemEntryCards = useMemo<ProblemEntryCard[]>(() => {
    const firstAttentionPage = metrics.pageAttentionItems[0];
    const firstGap = metrics.capabilityGaps[0];
    const firstDomainAttention = metrics.domainAttention[0];
    const firstWeakDimension = metrics.weakestDimensions[0];
    const evidenceCount = metrics.draftSummary.verificationReady + metrics.draftSummary.playbook;
    const capabilityDraft = metrics.featuredDrafts.find((draft) => draft.sourceType === 'system_map_capability_gap');
    const coverageDraft = metrics.featuredDrafts.find((draft) => draft.sourceType === 'system_map_project_portfolio');

    return [
      {
        id: 'page-gap',
        title: '页面有了但不会用',
        signal: metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补位` : '页面入口已基本接通',
        detail: firstAttentionPage
          ? `${firstAttentionPage.page?.title || firstAttentionPage.page_id} 还需要继续补路径、补映射或补任务承接。`
          : '先从系统地图确认是不是页面职责、进入路径或任务承接没有接上。',
        primaryLabel: '看页面补位',
        primaryTarget: firstAttentionPage
          ? { tab: 'SystemMap', pageId: firstAttentionPage.page_id }
          : { tab: 'SystemMap' },
        secondaryLabel: '看页面任务',
        secondaryTarget: firstAttentionPage
          ? { tab: 'TaskCenter', taskQuery: firstAttentionPage.page_id }
          : { tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' },
      },
      {
        id: 'evidence-gap',
        title: '能看不能证',
        signal: evidenceCount > 0 ? `${evidenceCount} 条待补证` : '补证车道已相对收敛',
        detail: metrics.closureDrafts[0]
          ? `${metrics.closureDrafts[0].title} 还没沉成完整证据链，建议先走验证补证车道。`
          : '先回任务中心和日志入口，把验证证据、操作清单和运行痕迹补齐。',
        primaryLabel: '开补证车道',
        primaryTarget: { tab: 'TaskCenter', taskQuery: 'system_map_verification_ready' },
        secondaryLabel: '看日志证据',
        secondaryTarget: { tab: 'LogViewer', taskQuery: 'verification' },
      },
      {
        id: 'domain-risk',
        title: '领域应用挂了或不稳',
        signal: metrics.domainSummary.total > 0
          ? `${metrics.domainSummary.highRisk} 高风险 / ${metrics.domainSummary.total} 总数`
          : '领域挂载数据待接入',
        detail: firstDomainAttention
          ? `${firstDomainAttention.name} 当前是 ${firstDomainAttention.runtimeStatus}，需要回应用中心和任务中心一起收口。`
          : '先确认家庭驾驶舱、OPC 和 family-hub 的挂载状态、安全门和入口可用性。',
        primaryLabel: '看领域对象',
        primaryTarget: firstDomainAttention
          ? { tab: 'DomainApps', taskQuery: firstDomainAttention.id }
          : { tab: 'DomainApps' },
        secondaryLabel: '看领域任务',
        secondaryTarget: firstDomainAttention
          ? { tab: 'TaskCenter', taskQuery: firstDomainAttention.taskQuery }
          : { tab: 'TaskCenter', taskQuery: 'system_map_domain_app' },
      },
      {
        id: 'capability-gap',
        title: '能力缺口还没收口',
        signal: metrics.capabilityGaps.length > 0 ? `${metrics.capabilityGaps.length} 项显式缺口` : '暂无显式能力缺口',
        detail: firstGap
          ? `${firstGap.title} 还需要继续拆成页面、资产、协议或领域挂载动作。`
          : '先从系统地图确认缺口落在页面能力、项目覆盖还是领域应用承接。',
        primaryLabel: '看缺口总图',
        primaryTarget: firstGap
          ? { tab: 'SystemMap', gapId: firstGap.id }
          : { tab: 'SystemMap' },
        secondaryLabel: '看缺口任务',
        secondaryTarget: capabilityDraft
          ? { tab: 'TaskCenter', taskQuery: capabilityDraft.sourceId }
          : { tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' },
      },
      {
        id: 'coverage-drop',
        title: '覆盖维度在掉分',
        signal: firstWeakDimension ? `${firstWeakDimension.score ?? 0}% 最低分` : '维度覆盖暂未暴露短板',
        detail: firstWeakDimension
          ? `${firstWeakDimension.title || firstWeakDimension.id} 失败 ${firstWeakDimension.failed ?? 0}，预警 ${firstWeakDimension.warning ?? 0}。`
          : '先看项目覆盖和最弱维度，避免只补页面却没补治理链。',
        primaryLabel: '看覆盖维度',
        primaryTarget: firstWeakDimension
          ? { tab: 'SystemMap', coverageDimensionId: firstWeakDimension.id }
          : { tab: 'SystemMap' },
        secondaryLabel: '看覆盖任务',
        secondaryTarget: coverageDraft
          ? { tab: 'TaskCenter', taskQuery: coverageDraft.sourceId }
          : { tab: 'TaskCenter', taskQuery: 'system_map_project_portfolio' },
      },
    ];
  }, [
    metrics.attentionPages,
    metrics.capabilityGaps,
    metrics.closureDrafts,
    metrics.domainAttention,
    metrics.domainSummary.highRisk,
    metrics.domainSummary.total,
    metrics.draftSummary.playbook,
    metrics.draftSummary.verificationReady,
    metrics.featuredDrafts,
    metrics.pageAttentionItems,
    metrics.weakestDimensions,
  ]);

  return {
    summaryCards,
    coverageSummary,
    usageCoverageSummary,
    architectureLaneRows,
    architectureLaneSummary,
    coverageGroups,
    featureDomainCoverageSummary,
    dimensionCoverageSummary,
    projectEntryRows,
    projectEntrySummary,
    objectCoverageRows,
    objectCoverageSummary,
    missingCapabilityRows,
    missingCapabilitySummary,
    executionChainRows,
    roleWorkbenchRows,
    focusedGuideCard,
    problemEntryCards,
  };
}
