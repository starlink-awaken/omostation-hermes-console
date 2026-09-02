import { useMemo } from 'react';
import type {
  CapabilityGapClosureRow,
  CockpitPage,
  CoverageAttentionProject,
  DraftTask,
  FeatureDomain,
  PageMaturity,
  PageMaturityFilter,
  ProjectAction,
  ProjectCapabilityCoverage,
  ProjectCoverageCheck,
  ProjectItem,
  ProjectPortfolioPriority,
  ProjectTriageQueue,
  RoadmapItem,
  SystemMapPayload,
  SystemMapWorkbenchRow,
  UsagePath,
} from './types';
import {
  draftPriorityWeight,
  draftSourceWeight,
  includesGapTerm,
  inferGapScope,
  normalizeSearchText,
  triageCategoryForDimension,
  triageRiskWeight,
  uniqueById,
  uniquePageMaturityItems,
  withTaskDraftHandoff,
} from './utils';

function findMatchingDraft(project: ProjectItem, draftTasks: DraftTask[]): DraftTask | null {
  const portfolioDraft = draftTasks.find(
    (task) => task.source?.type === 'system_map_project_portfolio' && task.source?.id === project.id
  );
  if (portfolioDraft) return portfolioDraft;
  return null;
}

type LayoutInputs = {
  systemMap: SystemMapPayload | null;
  draftTasks: DraftTask[];
  projectFilter: string;
  coverageFilter: string;
  portfolioFilter: string;
  projectLayerFilter: string;
  projectPageFilter: string;
  projectQuery: string;
  selectedProjectId: string | null;
  selectedUsagePathId: string | null;
  selectedGapId: string | null;
  selectedPageMaturityId: string | null;
  pageMaturityFilter: PageMaturityFilter;
  selectedFeatureDomainId: string | null;
  selectedProjectIds: string[];
};

type LayoutOutputs = {
  pagesById: Map<string, CockpitPage>;
  projectsById: Map<string, ProjectItem>;
  projectLayerOptions: string[];
  projectPageOptions: { id: string; title: string }[];
  pageGroups: [string, CockpitPage[]][];
  projectFocusOptions: SystemMapPayload['project_focus']['queues'] & { id: string; title: string; severity: string; reason: string; count: number; project_ids: string[]; top_projects: { id: string; diagnostics: ProjectItem['diagnostics'] }[] }[];
  coverageFilterOptions: (ProjectCapabilityCoverage['dimension_summary'][number] & { id: string; title: string; description: string })[];
  coverageDimensions: { id: string; title: string; description: string }[];
  activeCoverage: (ProjectCapabilityCoverage['dimension_summary'][number] & { id: string; title: string; description: string }) | undefined;
  activePortfolioBucket: SystemMapPayload['project_portfolio']['buckets'][number] | null;
  projectEntryRows: { priority: ProjectPortfolioPriority; project: ProjectItem; page: CockpitPage | null; primaryDimension: ProjectItem['portfolio']['non_ready_dimensions'][number] | null; draft: DraftTask | null; draftTarget: { tab: string; taskQuery: string; draftKey?: string } }[];
  projectEntrySummary: { mapped: number; drafts: number; blocked: number };
  activeRepairDimension: ProjectCapabilityCoverage['dimension_summary'][number] | null;
  dimensionRepairRows: { attention: CoverageAttentionProject; project: ProjectItem; check?: ProjectCoverageCheck; commands: ProjectAction[] }[];
  filteredProjects: ProjectItem[];
  coverageMatrixRows: { project: ProjectItem; checks: ProjectCoverageCheck[]; ready: number; warning: number; failed: number }[];
  filteredProjectIds: Set<string>;
  selectedVisibleProjectIds: string[];
  filteredTriageQueues: ProjectTriageQueue[];
  filteredTriageCommandCount: number;
  visibleCommandCount: number;
  runtimeProbeSummary: { runtimeProjects: number; stopped: number; pendingApproval: number; approved: number; commands: number };
  selectedProject: ProjectItem | null;
  activeUsagePath: UsagePath | null;
  activeUsagePageIds: Set<string>;
  activeUsagePlaybooks: SystemMapPayload['playbooks'];
  activeUsageDomains: FeatureDomain[];
  activeUsageRoadmap: RoadmapItem[];
  activeUsageProjects: ProjectItem[];
  activeUsagePlaybookIds: Set<string>;
  activeUsageTouchesDomainApps: boolean;
  activeUsageTriageCommands: ProjectAction[];
  activeUsageDrafts: DraftTask[];
  selectedGap: SystemMapPayload['gaps'][number] | null;
  pageMaturity: PageMaturity[];
  pageMaturitySummary: { ready: number; watch: number; gap: number; tracked: number; untracked: number; roadmapShipped: number };
  visiblePageMaturity: PageMaturity[];
  selectedPageMaturity: PageMaturity | null;
  selectedPageGapSignals: PageMaturity['nextAction'][];
  selectedPagePlaybooks: SystemMapPayload['playbooks'];
  selectedPageDrafts: DraftTask[];
  selectedFeatureDomain: FeatureDomain | null;
  selectedFeaturePage: CockpitPage | null;
  selectedFeatureProjects: ProjectItem[];
  selectedFeatureUsagePaths: UsagePath[];
  selectedFeaturePlaybooks: SystemMapPayload['playbooks'];
  selectedFeatureRoadmapItems: RoadmapItem[];
  selectedFeaturePageMaturity: PageMaturity | null;
  selectedFeatureDrafts: DraftTask[];
  selectedFeatureSignals: { id: string; title: string; detail: string }[];
  gapClosureRows: CapabilityGapClosureRow[];
  selectedGapClosureRow: CapabilityGapClosureRow | null;
  selectedProjectUsagePaths: UsagePath[];
  selectedProjectPlaybooks: SystemMapPayload['playbooks'];
  selectedProjectDrafts: DraftTask[];
  systemMapWorkbenchRows: SystemMapWorkbenchRow[];
  capabilityBuildBacklog: {
    pagesWithoutUsage: PageMaturity[];
    pagesWithoutDomain: PageMaturity[];
    plannedRoadmapItems: RoadmapItem[];
    gapItems: SystemMapPayload['gaps'];
    domainAttention: SystemMapPayload['domain_apps']['attention_items'];
    actionableDrafts: DraftTask[];
  };
  buildControlTower: {
    pageItems: PageMaturity[];
    domainContractItems: SystemMapPayload['domain_apps']['items'];
    verificationItems: ({ kind: 'draft'; task: DraftTask; project: ProjectItem | null } | { kind: 'project'; project: ProjectPortfolioPriority })[];
    priorityItems: ({ kind: 'project'; project: ProjectPortfolioPriority } | { kind: 'roadmap'; roadmap: RoadmapItem })[];
  };
};

export function useSystemMapLayout(inputs: LayoutInputs): LayoutOutputs {
  const {
    systemMap,
    draftTasks,
    projectFilter,
    coverageFilter,
    portfolioFilter,
    projectLayerFilter,
    projectPageFilter,
    projectQuery,
    selectedProjectId,
    selectedUsagePathId,
    selectedGapId,
    selectedPageMaturityId,
    pageMaturityFilter,
    selectedFeatureDomainId,
    selectedProjectIds,
  } = inputs;

  const pagesById = useMemo(() => {
    const index = new Map<string, CockpitPage>();
    systemMap?.cockpit_pages?.forEach((page) => index.set(page.id, page));
    return index;
  }, [systemMap]);

  const projectsById = useMemo(() => {
    const index = new Map<string, ProjectItem>();
    systemMap?.projects?.forEach((project) => index.set(project.id, project));
    return index;
  }, [systemMap]);

  const projectLayerOptions = useMemo(
    () => Array.from(new Set((systemMap?.projects || []).map((project) => project.layer).filter(Boolean))).sort(),
    [systemMap],
  );

  const projectPageOptions = useMemo(() => {
    const pageIds = Array.from(new Set((systemMap?.projects || []).map((project) => project.cockpit_page).filter(Boolean)));
    return pageIds
      .map((id) => ({ id, title: pagesById.get(id)?.title || id }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [pagesById, systemMap]);

  const pageGroups = useMemo(() => {
    const groups = new Map<string, CockpitPage[]>();
    systemMap?.cockpit_pages?.forEach((page) => {
      const existing = groups.get(page.group) || [];
      existing.push(page);
      groups.set(page.group, existing);
    });
    return Array.from(groups.entries());
  }, [systemMap]);

  const projectFocusOptions = useMemo(() => {
    const queues = systemMap?.project_focus?.queues || [];
    return [
      {
        id: 'all',
        title: '全部项目',
        severity: 'low',
        reason: '查看所有已登记项目。',
        count: systemMap?.projects.length || 0,
        project_ids: systemMap?.projects.map((project) => project.id) || [],
        top_projects: [],
      },
      ...queues,
    ];
  }, [systemMap]);

  const coverageFilterOptions = useMemo(() => {
    const dimensions = systemMap?.project_capability_coverage?.dimension_summary || [];
    return [
      {
        id: 'all',
        title: '全部维度',
        description: '不按覆盖维度过滤项目。',
        status: 'ready',
        score: systemMap?.project_capability_coverage?.summary.score || 0,
        ready: systemMap?.project_capability_coverage?.summary.ready_cells || 0,
        warning: systemMap?.project_capability_coverage?.summary.warning_cells || 0,
        failed: systemMap?.project_capability_coverage?.summary.failed_cells || 0,
        documented: systemMap?.project_capability_coverage?.summary.documented_cells || 0,
        evidence_score: systemMap?.project_capability_coverage?.summary.evidence_score || 0,
        attention_projects: [],
      },
      ...dimensions,
    ];
  }, [systemMap]);

  const coverageDimensions = useMemo(() => {
    const dimensions = systemMap?.project_capability_coverage?.dimensions || [];
    if (dimensions.length > 0) return dimensions;
    return (systemMap?.project_capability_coverage?.dimension_summary || []).map((dimension) => ({
      id: dimension.id,
      title: dimension.title,
      description: dimension.description,
    }));
  }, [systemMap]);

  const activeCoverage = coverageFilterOptions.find((item) => item.id === coverageFilter);
  const activePortfolioBucket = useMemo(
    () => systemMap?.project_portfolio.buckets.find((bucket) => bucket.id === portfolioFilter) || null,
    [portfolioFilter, systemMap],
  );

  const projectEntryRows = useMemo(() => {
    if (!systemMap) return [];
    return systemMap.project_portfolio.priority_projects
      .map((priority) => {
        const project = projectsById.get(priority.id);
        if (!project) return null;
        const pageId = project.cockpit_page || priority.cockpit_page;
        const page = pageId ? pagesById.get(pageId) || null : null;
        const primaryDimension = project.portfolio.non_ready_dimensions[0] || priority.non_ready_dimensions[0] || null;
        return { priority, project, page, primaryDimension, draft: findMatchingDraft(project, draftTasks), draftTarget: withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: project.id }, draftTasks) };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [draftTasks, pagesById, projectsById, systemMap]);

  const projectEntrySummary = useMemo(() => ({
    mapped: projectEntryRows.filter((row) => row.page).length,
    drafts: projectEntryRows.filter((row) => row.draft).length,
    blocked: projectEntryRows.filter((row) => row.priority.status === 'blocked').length,
  }), [projectEntryRows]);

  const activeRepairDimension = useMemo(() => {
    const dimensions = systemMap?.project_capability_coverage?.dimension_summary || [];
    if (coverageFilter !== 'all') {
      return dimensions.find((dimension) => dimension.id === coverageFilter) || null;
    }
    return (
      systemMap?.project_capability_coverage?.weakest_dimensions?.[0]
      || dimensions.find((dimension) => dimension.status !== 'ready')
      || null
    );
  }, [coverageFilter, systemMap]);

  const dimensionRepairRows = useMemo(() => {
    if (!systemMap || !activeRepairDimension) return [];
    const category = triageCategoryForDimension(activeRepairDimension.id);
    return activeRepairDimension.attention_projects
      .map((attention) => {
        const project = systemMap.projects.find((item) => item.id === attention.id);
        if (!project) return null;
        const check = project.coverage_checks.find((item) => item.id === activeRepairDimension.id);
        const exactCommands = project.triage_commands.filter((command) =>
          command.category === category
          || command.id.includes(activeRepairDimension.id)
          || command.reason?.includes(activeRepairDimension.title),
        );
        return {
          attention,
          project,
          check,
          commands: exactCommands.length > 0 ? exactCommands : project.triage_commands.slice(0, 2),
        };
      })
      .filter((item): item is {
        attention: CoverageAttentionProject;
        project: ProjectItem;
        check?: ProjectCoverageCheck;
        commands: ProjectAction[];
      } => Boolean(item));
  }, [activeRepairDimension, systemMap]);

  const filteredProjects = useMemo(() => {
    const projects = systemMap?.projects || [];
    const queue = projectFocusOptions.find((item) => item.id === projectFilter);
    const allowed = projectFilter === 'all' || !queue ? null : new Set(queue.project_ids);
    const portfolioAllowed = activePortfolioBucket ? new Set(activePortfolioBucket.project_ids) : null;
    const query = projectQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (allowed && !allowed.has(project.id)) return false;
      if (portfolioAllowed && !portfolioAllowed.has(project.id)) return false;
      if (projectLayerFilter !== 'all' && project.layer !== projectLayerFilter) return false;
      if (projectPageFilter !== 'all' && project.cockpit_page !== projectPageFilter) return false;
      if (coverageFilter !== 'all') {
        const check = project.coverage_checks.find((item) => item.id === coverageFilter);
        if (!check || check.status === 'ready') return false;
      }
      if (!query) return true;
      return [
        project.id,
        project.layer,
        project.stack,
        project.role,
        project.operational.next_action,
        ...project.operational.risks,
        ...project.coverage_checks.map((check) => `${check.title} ${check.status} ${check.next_action}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [activePortfolioBucket, coverageFilter, projectFilter, projectFocusOptions, projectLayerFilter, projectPageFilter, projectQuery, systemMap]);

  const coverageMatrixRows = useMemo(() => {
    const matrixByProject = new Map(
      (systemMap?.project_capability_coverage?.matrix || []).map((row) => [row.project_id, row]),
    );
    return filteredProjects.map((project) => {
      const matrixRow = matrixByProject.get(project.id);
      return {
        project,
        checks: matrixRow?.checks?.length ? matrixRow.checks : project.coverage_checks,
        ready: matrixRow?.ready ?? project.coverage_checks.filter((check) => check.status === 'ready').length,
        warning: matrixRow?.warning ?? project.coverage_checks.filter((check) => check.status === 'warning').length,
        failed: matrixRow?.failed ?? project.coverage_checks.filter((check) => check.status === 'failed').length,
      };
    });
  }, [filteredProjects, systemMap]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map((project) => project.id)), [filteredProjects]);
  const selectedVisibleProjectIds = selectedProjectIds.filter((projectId) => filteredProjectIds.has(projectId));

  const filteredTriageQueues = useMemo(() => {
    const queues = systemMap?.project_triage?.queues || [];
    return queues.map((queue) => {
      const commands = queue.commands.filter((command) => command.project_id && filteredProjectIds.has(command.project_id));
      return {
        ...queue,
        count: commands.length,
        project_ids: Array.from(new Set(commands.map((command) => command.project_id || '').filter(Boolean))),
        commands,
      };
    });
  }, [filteredProjectIds, systemMap]);

   const filteredTriageCommandCount = filteredTriageQueues.reduce((total, queue) => total + queue.count, 0);

   const visibleCommandCount = useMemo(() => {
     return (systemMap?.project_triage?.queues || []).reduce((total, queue) => {
       const commands = queue.commands.filter((command) => command.project_id && filteredProjectIds.has(command.project_id));
       return total + commands.length;
     }, 0);
   }, [filteredProjectIds, systemMap]);

  const runtimeProbeSummary = useMemo(() => {
    const projects = systemMap?.projects || [];
    const runtimeProjects = projects.filter((project) => project.runtime.needs_runtime);
    const pendingApproval = runtimeProjects.filter((project) => {
      const task = project.runtime.probe_task;
      return Boolean(task?.human_approval_required && task.approval_state !== 'granted' && task.status !== 'succeeded');
    }).length;
    const approved = runtimeProjects.filter((project) => {
      const task = project.runtime.probe_task;
      return Boolean(task?.human_approval_required && task.approval_state === 'granted' && task.status !== 'succeeded');
    }).length;
    return {
      runtimeProjects: runtimeProjects.length,
      stopped: runtimeProjects.filter((project) => project.runtime.status === 'stopped').length,
      pendingApproval,
      approved,
      commands: systemMap?.project_triage.summary.runtime_commands || 0,
    };
  }, [systemMap]);

  const selectedProject = useMemo(
    () => systemMap?.projects.find((project) => project.id === selectedProjectId) || null,
    [selectedProjectId, systemMap],
  );

  const activeUsagePath = useMemo(() => {
    const paths = systemMap?.usage_paths || [];
    return paths.find((path) => path.id === selectedUsagePathId) || paths[0] || null;
  }, [selectedUsagePathId, systemMap]);

  const activeUsagePageIds = useMemo(
    () => new Set(activeUsagePath?.pages.map((page) => page.id) || []),
    [activeUsagePath],
  );

  const activeUsagePlaybooks = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => activeUsagePageIds.has(step.page_id)),
    );
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsageDomains = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.feature_domains.filter((domain) => activeUsagePageIds.has(domain.cockpit_page));
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsageRoadmap = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.roadmap.items.filter((item) => activeUsagePageIds.has(item.cockpit_page));
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsageProjects = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.projects
      .filter((project) => activeUsagePageIds.has(project.cockpit_page))
      .sort((left, right) => {
        const statusDelta = left.portfolio.score - right.portfolio.score;
        if (statusDelta !== 0) return statusDelta;
        return (right.triage_commands?.length ?? 0) - (left.triage_commands?.length ?? 0);
      });
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsagePlaybookIds = useMemo(
    () => new Set(activeUsagePlaybooks.map((playbook) => playbook.id)),
    [activeUsagePlaybooks],
  );

  const activeUsageTouchesDomainApps = activeUsagePageIds.has('DomainApps') || activeUsagePageIds.has('QuestBoard');

  const activeUsageTriageCommands = useMemo(() => {
    const unique = new Map<string, ProjectAction>();
    activeUsageProjects.forEach((project) => {
      project.triage_commands.forEach((command) => {
        unique.set(`${project.id}:${command.id}:${command.value}`, command);
      });
    });
    return Array.from(unique.values()).sort((left, right) => {
      const riskDelta = triageRiskWeight(right.risk) - triageRiskWeight(left.risk);
      if (riskDelta !== 0) return riskDelta;
      return (left.project_id || '').localeCompare(right.project_id || '');
    });
  }, [activeUsageProjects]);

  const activeUsageDrafts = useMemo(() => {
    if (!activeUsagePath) return [];
    return draftTasks
      .filter((task) => {
        if (!task.read_only || !task.source?.type) return false;
        if (task.source.type === 'system_map_playbook') {
          return activeUsagePlaybookIds.has(task.source.id);
        }
        if (task.source.type === 'system_map_page_maturity') {
          return activeUsagePageIds.has(task.source.id);
        }
        if (task.source.type === 'system_map_project_portfolio') {
          const project = projectsById.get(task.source.id);
          return Boolean(project && activeUsagePageIds.has(project.cockpit_page));
        }
        if (task.source.type === 'system_map_verification_ready') {
          const project = projectsById.get(task.source.id);
          return Boolean(project && activeUsagePageIds.has(project.cockpit_page));
        }
        if (task.source.type === 'system_map_domain_app') {
          return activeUsageTouchesDomainApps;
        }
        return false;
      })
      .sort((left, right) => {
        const sourceDelta = draftSourceWeight(left.source?.type) - draftSourceWeight(right.source?.type);
        if (sourceDelta !== 0) return sourceDelta;
        const priorityDelta = draftPriorityWeight(right.priority) - draftPriorityWeight(left.priority);
        if (priorityDelta !== 0) return priorityDelta;
        return (left.title || '').localeCompare(right.title || '');
      });
  }, [activeUsagePageIds, activeUsagePath, activeUsagePlaybookIds, activeUsageTouchesDomainApps, draftTasks, projectsById]);

  const selectedGap = useMemo(
    () => systemMap?.gaps.find((gap) => gap.id === selectedGapId) || null,
    [selectedGapId, systemMap],
  );

  const pageMaturity = useMemo<PageMaturity[]>(() => {
    if (!systemMap) return [];
    if (systemMap.page_maturity?.items?.length) {
      const projectsByIdLocal = new Map(systemMap.projects.map((project) => [project.id, project]));
      const domainsById = new Map(systemMap.feature_domains.map((domain) => [domain.id, domain]));
      const usagePathsById = new Map(systemMap.usage_paths.map((path) => [path.id, path]));
      const roadmapById = new Map(systemMap.roadmap.items.map((item) => [item.id, item]));
      const playbookStepsById = new Map(
        systemMap.playbooks.flatMap((playbook) => playbook.steps.map((step) => [step.id, step] as const)),
      );
      return systemMap.page_maturity.items.map((item) => ({
        page: item.page,
        score: item.score,
        status: item.status,
        projects: item.projects.map((id) => projectsByIdLocal.get(id)).filter((project): project is ProjectItem => Boolean(project)),
        domains: item.domains.map((id) => domainsById.get(id)).filter((domain): domain is FeatureDomain => Boolean(domain)),
        usagePaths: item.usage_paths.map((id) => usagePathsById.get(id)).filter((path): path is UsagePath => Boolean(path)),
        playbookSteps: item.playbook_steps.map((id) => playbookStepsById.get(id)).filter((step): step is PlaybookStep => Boolean(step)),
        roadmapItems: item.roadmap_items.map((id) => roadmapById.get(id)).filter((roadmapItem): roadmapItem is RoadmapItem => Boolean(roadmapItem)),
        actions: item.actions,
        operatorActions: item.operator_actions || [],
        operatorActionDetails: item.operator_action_details || [],
        nextAction: item.next_action,
        traceabilityStatus: item.traceability_status || ((item.roadmap_items?.length ?? 0) > 0 ? 'tracked' : 'untracked'),
        traceabilityNextAction: item.traceability_next_action || ((item.roadmap_items?.length ?? 0) > 0 ? '保持页面路线图与验收项同步。' : '补一条页面路线图或验收项，记录下一步能力建设。'),
        roadmapStatus: item.roadmap_status || (item.roadmap_items.some((id) => roadmapById.get(id)?.status === 'shipped') ? 'shipped' : 'planned'),
      }));
    }
    return systemMap.cockpit_pages.map((page) => {
      const projects = systemMap.projects.filter((project) => project.cockpit_page === page.id);
      const domains = systemMap.feature_domains.filter((domain) => domain.cockpit_page === page.id);
      const usagePaths = systemMap.usage_paths.filter((path) =>
        path.pages.some((usagePage) => usagePage.id === page.id),
      );
      const playbookSteps = systemMap.playbooks.flatMap((playbook) =>
        playbook.steps.filter((step) => step.page_id === page.id || step.page.id === page.id),
      );
      const roadmapItems = systemMap.roadmap.items.filter((item) => item.cockpit_page === page.id);
      const actions = projects.reduce(
        (total, project) => total + (project.actions?.length ?? 0) + (project.triage_commands?.length ?? 0),
        0,
      );
      const score =
        (projects.length > 0 ? 25 : 0) +
        (domains.length > 0 ? 20 : 0) +
        (usagePaths.length > 0 ? 20 : 0) +
        (playbookSteps.length > 0 ? 15 : 0) +
        (roadmapItems.length > 0 ? 10 : 0) +
        (actions > 0 ? 10 : 0);
      const traceabilityStatus = roadmapItems.length > 0 ? 'tracked' : 'untracked';
      const status: PageMaturity['status'] = score >= 70 && traceabilityStatus === 'tracked'
        ? 'ready'
        : score >= 40
          ? 'watch'
          : 'gap';
      let nextAction = '保持页面、项目、清单和路线图证据新鲜。';
      if (usagePaths.length === 0) nextAction = '把页面接入至少一条使用路径。';
      else if (playbookSteps.length === 0) nextAction = '补一条操作清单步骤，让页面进入日常流程。';
      else if (domains.length === 0) nextAction = '补功能域映射，说明页面承载的能力。';
      else if (projects.length === 0) nextAction = '补项目或服务映射，避免页面只有入口没有对象。';
      else if (actions === 0) nextAction = '补受控动作或排查命令，让页面能推进问题。';

      return {
        page,
        score,
        status,
        projects,
        domains,
        usagePaths,
        playbookSteps,
        roadmapItems,
        actions,
        operatorActions: page.operator_actions || [],
        operatorActionDetails: page.operator_action_details || [],
        nextAction,
        traceabilityStatus,
        traceabilityNextAction: traceabilityStatus === 'tracked' ? '保持页面路线图与验收项同步。' : '补一条页面路线图或验收项，记录下一步能力建设。',
        roadmapStatus: roadmapItems.some((item) => item.status === 'shipped') ? 'shipped' : 'planned',
      };
    });
  }, [systemMap]);

  const pageMaturitySummary = useMemo(() => ({
    ready: pageMaturity.filter((item) => item.status === 'ready').length,
    watch: pageMaturity.filter((item) => item.status === 'watch').length,
    gap: pageMaturity.filter((item) => item.status === 'gap').length,
    tracked: pageMaturity.filter((item) => item.traceabilityStatus === 'tracked').length,
    untracked: pageMaturity.filter((item) => item.traceabilityStatus === 'untracked').length,
    roadmapShipped: pageMaturity.filter((item) => item.roadmapStatus === 'shipped').length,
  }), [pageMaturity]);

  const visiblePageMaturity = useMemo(() => pageMaturity.filter((item) => {
    if (pageMaturityFilter === 'tracked' || pageMaturityFilter === 'untracked') {
      return item.traceabilityStatus === pageMaturityFilter;
    }
    return pageMaturityFilter === 'all' || item.status === pageMaturityFilter;
  }), [pageMaturity, pageMaturityFilter]);

  const selectedPageMaturity = useMemo(
    () => pageMaturity.find((item) => item.page.id === selectedPageMaturityId) || null,
    [pageMaturity, selectedPageMaturityId],
  );

  const selectedPageGapSignals = useMemo(
    () => (selectedPageMaturity ? [] : []),
    [selectedPageMaturity],
  );

  const selectedPagePlaybooks = useMemo(() => {
    if (!systemMap || !selectedPageMaturity) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => step.page_id === selectedPageMaturity.page.id),
    );
  }, [selectedPageMaturity, systemMap]);

  const selectedPageDrafts = useMemo(() => {
    if (!selectedPageMaturity) return [];
    return draftTasks.filter((task) =>
      task.read_only
      && task.source?.type === 'system_map_page_maturity'
      && task.source.id === selectedPageMaturity.page.id,
    );
  }, [draftTasks, selectedPageMaturity]);

  const selectedFeatureDomain = useMemo(
    () => systemMap?.feature_domains.find((domain) => domain.id === selectedFeatureDomainId) || null,
    [selectedFeatureDomainId, systemMap],
  );

  const selectedFeaturePage = useMemo(
    () => (selectedFeatureDomain ? pagesById.get(selectedFeatureDomain.cockpit_page) || null : null),
    [pagesById, selectedFeatureDomain],
  );

  const selectedFeatureProjects = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.projects.filter((project) => project.cockpit_page === selectedFeatureDomain.cockpit_page);
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeatureUsagePaths = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.usage_paths.filter((path) =>
      path.pages.some((page) => page.id === selectedFeatureDomain.cockpit_page),
    );
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeaturePlaybooks = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => step.page_id === selectedFeatureDomain.cockpit_page),
    );
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeatureRoadmapItems = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.roadmap.items.filter((item) => item.cockpit_page === selectedFeatureDomain.cockpit_page);
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeaturePageMaturity = useMemo(
    () => pageMaturity.find((item) => item.page.id === selectedFeatureDomain?.cockpit_page) || null,
    [pageMaturity, selectedFeatureDomain],
  );

  const selectedFeatureDrafts = useMemo(() => {
    if (!selectedFeatureDomain) return [];
    return draftTasks.filter((task) =>
      task.read_only
      && task.source?.type === 'system_map_page_maturity'
      && task.source.id === selectedFeatureDomain.cockpit_page,
    );
  }, [draftTasks, selectedFeatureDomain]);

  const selectedFeatureSignals = useMemo(() => {
    if (!selectedFeatureDomain) return [];
    const signals: { id: string; title: string; detail: string }[] = [];
    if ((selectedFeatureDomain.providers?.length ?? 0) === 0) {
      signals.unshift({
        id: 'providers',
        title: '提供方未登记',
        detail: '能力域已经存在，但还没标明由哪些页面或模块提供。',
      });
    }
    if (signals.length === 0) {
      signals.push({
        id: 'steady',
        title: '当前没有显性缺口',
        detail: selectedFeaturePageMaturity?.nextAction || '保持能力域、页面和使用路径之间的映射新鲜。',
      });
    }
    return signals.slice(0, 4);
  }, [selectedFeatureDomain, selectedFeaturePageMaturity]);

  const gapClosureRows = useMemo<CapabilityGapClosureRow[]>(() => {
    if (!systemMap) return [];

    const attentionProjects = uniqueById(
      systemMap.project_portfolio.priority_projects
        .map((item) => projectsById.get(item.id) || null)
        .filter((project): project is ProjectItem => Boolean(project)),
    );
    const nonReadyPages = pageMaturity.filter((item) => item.status !== 'ready');
    const domainAttentionPages = new Set(nonReadyPages.map((item) => item.page.id));

    return systemMap.gaps.map((gap) => {
      const gapText = normalizeSearchText([gap.id, gap.title, gap.evidence, gap.next].join(' '));
      const scope = inferGapScope(gap);

      const matchedProjects = systemMap.projects.filter((project) =>
        [
          project.id,
          project.role,
          project.stack,
          project.portfolio.primary_gap,
          project.portfolio.next_action,
          ...project.diagnostics.map((item) => item.title),
          ...project.diagnostics.map((item) => item.detail),
        ].some((value) => includesGapTerm(gapText, value)),
      );

      const matchedPages = pageMaturity.filter((item) =>
        [
          item.page.id,
          item.page.title,
          item.page.group,
          item.page.purpose,
          ...item.page.dimensions,
        ].some((value) => includesGapTerm(gapText, value)),
      );

      const matchedDomains = systemMap.feature_domains.filter((domain) =>
        [
          domain.id,
          domain.title,
          domain.english,
          ...domain.providers,
          ...domain.capability_items,
        ].some((value) => includesGapTerm(gapText, value)),
      );

      let projects = uniqueById(matchedProjects);
      let pages = uniquePageMaturityItems(matchedPages);
      let domains = uniqueById(matchedDomains);

      if (scope === 'project' && projects.length === 0) {
        projects = attentionProjects.length > 0
          ? attentionProjects
          : systemMap.projects.filter((project) => project.portfolio.status !== 'healthy');
      }
      if (scope === 'page' && pages.length === 0) {
        pages = nonReadyPages;
      }
      if (scope === 'domain' && domains.length === 0) {
        domains = systemMap.feature_domains.filter((domain) => domainAttentionPages.has(domain.cockpit_page));
      }
      if (scope === 'flow' && pages.length === 0) {
        pages = pageMaturity.filter((item) => item.usagePaths.length === 0 || item.playbookSteps.length === 0);
      }

      if (pages.length === 0 && projects.length > 0) {
        pages = uniquePageMaturityItems(
          projects
            .map((project) => pageMaturity.find((item) => item.page.id === project.cockpit_page) || null),
        );
      }
      if (pages.length === 0 && domains.length > 0) {
        pages = uniquePageMaturityItems(
          domains
            .map((domain) => pageMaturity.find((item) => item.page.id === domain.cockpit_page) || null),
        );
      }
      if (domains.length === 0 && pages.length > 0) {
        const pageIds = new Set(pages.map((item) => item.page.id));
        domains = systemMap.feature_domains.filter((domain) => pageIds.has(domain.cockpit_page));
      }
      if (projects.length === 0 && pages.length > 0) {
        const pageIds = new Set(pages.map((item) => item.page.id));
        projects = systemMap.projects.filter((project) => pageIds.has(project.cockpit_page));
      }

      const pageIds = new Set(pages.map((item) => item.page.id));
      const usagePaths = systemMap.usage_paths.filter((path) =>
        path.pages.some((page) => pageIds.has(page.id)),
      );
      const playbooks = systemMap.playbooks.filter((playbook) =>
        playbook.steps.some((step) => pageIds.has(step.page_id)),
      );
      const roadmapItems = systemMap.roadmap.items.filter((item) =>
        pageIds.has(item.cockpit_page) && item.status !== 'shipped',
      );

      const gapDraft = draftTasks.find((task) =>
        task.read_only && task.source?.type === 'system_map_capability_gap' && task.source.id === gap.id,
      ) || null;
      const projectDraft = draftTasks.find((task) =>
        task.read_only
        && (
          (task.source?.type === 'system_map_project_portfolio' && projects.some((project) => project.id === task.source?.id))
          || (task.source?.type === 'system_map_verification_ready' && projects.some((project) => project.id === task.source?.id))
        ),
      ) || null;
      const pageDraft = draftTasks.find((task) =>
        task.read_only
        && task.source?.type === 'system_map_page_maturity'
        && pageIds.has(task.source?.id || ''),
      ) || null;
      const playbookDraft = draftTasks.find((task) =>
        task.read_only
        && task.source?.type === 'system_map_playbook'
        && playbooks.some((playbook) => playbook.id === task.source?.id),
      ) || null;
      const domainDraft = draftTasks.find((task) =>
        task.read_only
        && task.source?.type === 'system_map_domain_app'
        && domains.some((domain) => domain.id === task.source?.id),
      ) || null;
      const draft = gapDraft || projectDraft || pageDraft || playbookDraft || domainDraft || null;

      const page = pages[0]
        || (projects[0] ? pageMaturity.find((item) => item.page.id === projects[0].cockpit_page) || null : null)
        || (domains[0] ? pageMaturity.find((item) => item.page.id === domains[0].cockpit_page) || null : null)
        || null;

      const nextAction = draft?.description
        || projects[0]?.portfolio.next_action
        || page?.nextAction
        || roadmapItems[0]?.problem
        || playbooks[0]?.goal
        || gap.next;

      const taskQuery = draft?.source?.id
        || draft?.id
        || projects[0]?.id
        || playbooks[0]?.id
        || page?.page.id
        || domains[0]?.id
        || gap.id;

      return {
        gap,
        scope,
        page,
        projects: projects.slice(0, 3),
        domains: domains.slice(0, 3),
        usagePaths: usagePaths.slice(0, 2),
        playbooks: playbooks.slice(0, 2),
        roadmapItems: roadmapItems.slice(0, 2),
        draft,
        nextAction,
        taskQuery,
      };
    });
  }, [draftTasks, pageMaturity, projectsById, systemMap]);

  const selectedGapClosureRow = useMemo(
    () => gapClosureRows.find((row) => row.gap.id === selectedGapId) || null,
    [gapClosureRows, selectedGapId],
  );

  const selectedProjectUsagePaths = useMemo(() => {
    if (!systemMap || !selectedProject) return [];
    return systemMap.usage_paths.filter((path) =>
      path.pages.some((page) => page.id === selectedProject.cockpit_page),
    );
  }, [selectedProject, systemMap]);

  const selectedProjectPlaybooks = useMemo(() => {
    if (!systemMap || !selectedProject) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => step.page_id === selectedProject.cockpit_page),
    );
  }, [selectedProject, systemMap]);

  const selectedProjectDrafts = useMemo(() => {
    if (!selectedProject) return [];
    return draftTasks.filter((task) =>
      task.read_only
      && (
        (task.source?.type === 'system_map_project_portfolio' && task.source.id === selectedProject.id)
        || (task.source?.type === 'system_map_verification_ready' && task.source.id === selectedProject.id)
      ),
    );
  }, [draftTasks, selectedProject]);

  const systemMapWorkbenchRows = useMemo<SystemMapWorkbenchRow[]>(() => {
    const rows: SystemMapWorkbenchRow[] = [];

    if (activeUsagePath) {
      const usageMissingSignals = [
        activeUsageProjects.length === 0,
        activeUsageDomains.length === 0,
        activeUsagePlaybooks.length === 0,
        activeUsageRoadmap.length === 0,
        activeUsageDrafts.length === 0,
      ].filter(Boolean).length;
      rows.push({
        id: `workbench-usage-${activeUsagePath.id}`,
        title: `${activeUsagePath.title} · 路径闭环`,
        laneLabel: '使用路径工作台',
        summary: activeUsagePath.intent,
        nextAction: activeUsagePath.steps[0]
          ? `先从"${activeUsagePath.steps[0]}"开始，顺着路径把页面、清单、能力域和草稿重新串起来。`
          : '先把这条路径重新挂回页面、清单和任务承接。',
        evidence: `覆盖页 ${activeUsagePath.pages?.length ?? 0} · 清单 ${activeUsagePlaybooks.length} · 草稿 ${activeUsageDrafts.length}`,
        statusTone: usageMissingSignals === 0 ? 'online' : usageMissingSignals <= 2 ? 'degraded' : 'offline',
        statusLabel: usageMissingSignals === 0 ? '路径成型' : usageMissingSignals <= 2 ? '可走待补' : '断链较多',
        primaryTarget: { tab: 'SystemMap', usagePathId: activeUsagePath.id },
        primaryLabel: '打开路径',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: activeUsagePath.title || activeUsagePath.id },
        secondaryLabel: '打开任务',
      });
    }

    if (selectedPageMaturity) {
      rows.push({
        id: `workbench-page-${selectedPageMaturity.page.id}`,
        title: `${selectedPageMaturity.page.title} · 页面闭环`,
        laneLabel: `页面成熟度 · ${selectedPageMaturity.status === 'ready' ? '可日用' : selectedPageMaturity.status === 'watch' ? '观察' : '待补齐'}`,
        summary: selectedPageMaturity.page.purpose,
        nextAction: selectedPageMaturity.nextAction,
        evidence: `项目 ${selectedPageMaturity.projects.length} · 能力域 ${selectedPageMaturity.domains.length} · 路线图 ${selectedPageMaturity.roadmapItems.length}`,
        statusTone: selectedPageMaturity.status === 'ready' ? 'online' : selectedPageMaturity.status === 'watch' ? 'degraded' : 'offline',
        statusLabel: selectedPageMaturity.status === 'ready' ? '可日用' : selectedPageMaturity.status === 'watch' ? '待补观察' : '优先补位',
        primaryTarget: { tab: selectedPageMaturity.page.id, pageId: selectedPageMaturity.page.id },
        primaryLabel: '进入页面',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: selectedPageMaturity.page.id },
        secondaryLabel: '页面草稿',
      });
    }

    if (selectedFeatureDomain) {
      rows.push({
        id: `workbench-domain-${selectedFeatureDomain.id}`,
        title: `${selectedFeatureDomain.title} · 能力域闭环`,
        laneLabel: `能力域 · ${selectedFeatureDomain.coverage === 'native' ? '原生' : selectedFeatureDomain.coverage}`,
        summary: selectedFeatureDomain.english || 'Capability Domain',
        nextAction: selectedFeaturePageMaturity?.nextAction || '继续补页面、路径、清单和路线图之间的能力映射。',
        evidence: `提供方 ${selectedFeatureDomain.providers?.length ?? 0} · 能力项 ${selectedFeatureDomain.capability_items?.length ?? 0} · 项目 ${selectedFeatureProjects.length}`,
        statusTone: selectedFeatureDomain.coverage === 'native' ? 'online' : (selectedFeatureDomain.providers?.length ?? 0) > 0 ? 'degraded' : 'offline',
        statusLabel: selectedFeatureDomain.coverage === 'native' ? '映射成型' : (selectedFeatureDomain.providers?.length ?? 0) > 0 ? '映射待补' : '待建能力链',
        primaryTarget: { tab: 'SystemMap', featureDomainId: selectedFeatureDomain.id },
        primaryLabel: '打开能力域',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: selectedFeatureDomain.cockpit_page },
        secondaryLabel: '页面草稿',
      });
    }

    if (selectedProject) {
      const verification = selectedProject.runtime.latest_verification;
      rows.push({
        id: `workbench-project-${selectedProject.id}`,
        title: `${selectedProject.id} · 项目闭环`,
        laneLabel: `项目组合 · ${selectedProject.portfolio.status === 'healthy' ? '健康' : selectedProject.portfolio.status === 'watch' ? '观察' : selectedProject.portfolio.status === 'at_risk' ? '风险' : '阻塞'}`,
        summary: selectedProject.portfolio.primary_gap || selectedProject.role || selectedProject.stack,
        nextAction: selectedProject.portfolio.next_action || selectedProject.operational.next_action,
        evidence: `验证 ${verification.status} · triage ${selectedProject.triage_commands?.length ?? 0} · workflow ${selectedProject.workflow.latest_status}`,
        statusTone: selectedProject.portfolio.status === 'healthy'
          ? 'online'
          : selectedProject.portfolio.status === 'at_risk' || selectedProject.portfolio.status === 'watch'
            ? 'degraded'
            : 'offline',
        statusLabel: selectedProject.portfolio.status === 'healthy'
          ? '项目稳定'
          : selectedProject.portfolio.status === 'at_risk' || selectedProject.portfolio.status === 'watch'
            ? '项目待跟'
            : '项目阻塞',
        primaryTarget: { tab: 'TaskCenter', taskQuery: selectedProject.id },
        primaryLabel: '项目草稿',
        secondaryTarget: { tab: 'SystemMap', pageId: selectedProject.cockpit_page },
        secondaryLabel: '关联页面',
      });
    }

    if (selectedGap) {
      const gapDraft = draftTasks.find((task) =>
        task.read_only && task.source?.type === 'system_map_capability_gap' && task.source.id === selectedGap.id,
      ) || null;
      rows.push({
        id: `workbench-gap-${selectedGap.id}`,
        title: `${selectedGap.title} · 缺口闭环`,
        laneLabel: `能力缺口 · ${selectedGap.severity}`,
        summary: selectedGap.evidence,
        nextAction: selectedGap.next,
        evidence: gapDraft?.title || '先把缺口转回任务、页面或项目入口。',
        statusTone: selectedGap.severity === 'high' ? 'offline' : selectedGap.severity === 'medium' ? 'degraded' : 'online',
        statusLabel: selectedGap.severity === 'high' ? '优先修复' : selectedGap.severity === 'medium' ? '继续收口' : '保持观察',
        primaryTarget: { tab: 'TaskCenter', taskQuery: selectedGap.id },
        primaryLabel: '缺口草稿',
        secondaryTarget: { tab: 'SystemMap', gapId: selectedGap.id },
        secondaryLabel: '定位缺口',
      });
    }

    return rows.slice(0, 4);
  }, [
    activeUsageDomains.length,
    activeUsageDrafts,
    activeUsagePath,
    activeUsagePlaybooks.length,
    activeUsageProjects.length,
    activeUsageRoadmap.length,
    draftTasks,
    selectedFeatureDomain,
    selectedFeaturePageMaturity,
    selectedFeatureProjects.length,
    selectedGap,
    selectedPageMaturity,
    selectedProject,
  ]);

  const capabilityBuildBacklog = useMemo(() => {
    if (!systemMap) {
      return {
        pagesWithoutUsage: [] as PageMaturity[],
        pagesWithoutDomain: [] as PageMaturity[],
        plannedRoadmapItems: [] as RoadmapItem[],
        gapItems: [] as SystemMapPayload['gaps'],
        domainAttention: [] as SystemMapPayload['domain_apps']['attention_items'],
        actionableDrafts: [] as DraftTask[],
      };
    }

    const pagesWithoutUsage = pageMaturity
      .filter((item) => item.usagePaths.length === 0)
      .sort((left, right) => left.score - right.score)
      .slice(0, 4);

    const pagesWithoutDomain = pageMaturity
      .filter((item) => item.domains.length === 0)
      .sort((left, right) => left.score - right.score)
      .slice(0, 4);

    const plannedRoadmapItems = systemMap.roadmap.items
      .filter((item) => item.status !== 'shipped')
      .slice(0, 4);

    const actionableDrafts = draftTasks
      .filter((task) =>
        task.read_only
        && (
          task.source?.type === 'system_map_page_maturity'
          || task.source?.type === 'system_map_domain_app'
          || task.source?.type === 'system_map_capability_gap'
        ),
      )
      .slice(0, 5);

    return {
      pagesWithoutUsage,
      pagesWithoutDomain,
      plannedRoadmapItems,
      gapItems: systemMap.gaps.slice(0, 3),
      domainAttention: systemMap.domain_apps.attention_items.slice(0, 3),
      actionableDrafts,
    };
  }, [draftTasks, pageMaturity, systemMap]);

  const buildControlTower = useMemo(() => {
    if (!systemMap) {
      return {
        pageItems: [] as PageMaturity[],
        domainContractItems: [] as SystemMapPayload['domain_apps']['items'],
        verificationItems: [] as Array<
          | { kind: 'draft'; task: DraftTask; project: ProjectItem | null }
          | { kind: 'project'; project: ProjectPortfolioPriority }
        >,
        priorityItems: [] as Array<
          | { kind: 'project'; project: ProjectPortfolioPriority }
          | { kind: 'roadmap'; roadmap: RoadmapItem }
        >,
      };
    }

    const pageItems = pageMaturity
      .filter((item) => item.status !== 'ready')
      .sort((left, right) => left.score - right.score)
      .slice(0, 5);

    const domainContractItems = systemMap.domain_apps.items
      .filter((app) =>
        app.runtime_status !== 'running'
        || app.security_posture !== 'passed'
        || (app.integration_mode !== 'native_cockpit_view' && !app.launch_url && !app.api_url),
      )
      .slice(0, 5);

    const verificationDraftItems = draftTasks
      .filter((task) => task.read_only && task.source?.type === 'system_map_verification_ready')
      .map((task) => ({
        kind: 'draft' as const,
        task,
        project: projectsById.get(task.source?.id || '') || null,
      }));

    const verificationProjectItems = systemMap.project_portfolio.priority_projects
      .filter((project) => project.verification_status !== 'verified')
      .map((project) => ({
        kind: 'project' as const,
        project,
      }));

    const verificationSeen = new Set<string>();
    const verificationItems = [...verificationDraftItems, ...verificationProjectItems]
      .filter((item) => {
        const id = item.kind === 'draft' ? item.task.source?.id || item.task.id : item.project.id;
        if (verificationSeen.has(id)) return false;
        verificationSeen.add(id);
        return true;
      })
      .slice(0, 5);

    const priorityItems = [
      ...systemMap.project_portfolio.priority_projects.map((project) => ({ kind: 'project' as const, project })),
      ...systemMap.roadmap.items
        .filter((roadmap) => roadmap.status !== 'shipped')
        .map((roadmap) => ({ kind: 'roadmap' as const, roadmap })),
    ].slice(0, 6);

    return {
      pageItems,
      domainContractItems,
      verificationItems,
      priorityItems,
    };
  }, [draftTasks, pageMaturity, projectsById, systemMap]);

  // Return defaults when systemMap is null (loading/error state).
  // NOTE: This guard MUST come after all useMemo hooks above to preserve
  // hook call order across renders (Rules of Hooks).
  if (!systemMap) {
    return {
      pagesById: new Map(),
      projectsById: new Map(),
      projectLayerOptions: [],
      projectPageOptions: [],
      pageGroups: [],
      projectFocusOptions: [],
      coverageFilterOptions: [],
      coverageDimensions: [],
      activeCoverage: undefined,
      activePortfolioBucket: null,
      projectEntryRows: [],
      projectEntrySummary: { mapped: 0, drafts: 0, blocked: 0 },
      activeRepairDimension: null,
      dimensionRepairRows: [],
      filteredProjects: [],
      coverageMatrixRows: [],
      filteredProjectIds: new Set(),
      selectedVisibleProjectIds: [],
      filteredTriageQueues: [],
      filteredTriageCommandCount: 0,
      runtimeProbeSummary: { runtimeProjects: 0, stopped: 0, pendingApproval: 0, approved: 0, commands: 0 },
      selectedProject: null,
      activeUsagePath: null,
      activeUsagePageIds: new Set(),
      activeUsagePlaybooks: [],
      activeUsageDomains: [],
      activeUsageRoadmap: [],
      activeUsageProjects: [],
      activeUsagePlaybookIds: new Set(),
      activeUsageTouchesDomainApps: false,
      activeUsageTriageCommands: [],
      activeUsageDrafts: [],
      selectedGap: null,
      pageMaturity: [],
      pageMaturitySummary: { ready: 0, watch: 0, gap: 0, tracked: 0, untracked: 0, roadmapShipped: 0 },
      visiblePageMaturity: [],
      selectedPageMaturity: null,
      selectedPageGapSignals: [],
      selectedPagePlaybooks: [],
      selectedPageDrafts: [],
      selectedFeatureDomain: null,
      selectedFeaturePage: null,
      selectedFeatureProjects: [],
      selectedFeatureUsagePaths: [],
      selectedFeaturePlaybooks: [],
      selectedFeatureRoadmapItems: [],
      selectedFeaturePageMaturity: null,
      selectedFeatureDrafts: [],
      selectedFeatureSignals: [],
      gapClosureRows: [],
      selectedGapClosureRow: null,
      selectedProjectUsagePaths: [],
      selectedProjectPlaybooks: [],
      selectedProjectDrafts: [],
      systemMapWorkbenchRows: [],
      capabilityBuildBacklog: { pagesWithoutUsage: [], pagesWithoutDomain: [], plannedRoadmapItems: [], gapItems: [], domainAttention: [], actionableDrafts: [] },
      buildControlTower: { pageItems: [], domainContractItems: [], verificationItems: [], priorityItems: [] },
    };
  }

  return {
    pagesById,
    projectsById,
    projectLayerOptions,
    projectPageOptions,
    pageGroups,
    projectFocusOptions,
    coverageFilterOptions,
    coverageDimensions,
    activeCoverage,
    activePortfolioBucket,
    projectEntryRows,
    projectEntrySummary,
    activeRepairDimension,
    dimensionRepairRows,
    filteredProjects,
    coverageMatrixRows,
    filteredProjectIds,
    selectedVisibleProjectIds,
    filteredTriageQueues,
    filteredTriageCommandCount,
    visibleCommandCount,
    runtimeProbeSummary,
    selectedProject,
    activeUsagePath,
    activeUsagePageIds,
    activeUsagePlaybooks,
    activeUsageDomains,
    activeUsageRoadmap,
    activeUsageProjects,
    activeUsagePlaybookIds,
    activeUsageTouchesDomainApps,
    activeUsageTriageCommands,
    activeUsageDrafts,
    selectedGap,
    pageMaturity,
    pageMaturitySummary,
    visiblePageMaturity,
    selectedPageMaturity,
    selectedPageGapSignals,
    selectedPagePlaybooks,
    selectedPageDrafts,
    selectedFeatureDomain,
    selectedFeaturePage,
    selectedFeatureProjects,
    selectedFeatureUsagePaths,
    selectedFeaturePlaybooks,
    selectedFeatureRoadmapItems,
    selectedFeaturePageMaturity,
    selectedFeatureDrafts,
    selectedFeatureSignals,
    gapClosureRows,
    selectedGapClosureRow,
    selectedProjectUsagePaths,
    selectedProjectPlaybooks,
    selectedProjectDrafts,
    systemMapWorkbenchRows,
    capabilityBuildBacklog,
    buildControlTower,
  };
}
