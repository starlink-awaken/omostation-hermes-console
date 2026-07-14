import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, ClipboardCheck, Layers3, Map, Route, ShieldAlert } from 'lucide-react';
import HealthSummarySection from './home/HealthSummarySection';
import AlertFeedSection from './home/AlertFeedSection';
import MetricsTrendSection from './home/MetricsTrendSection';
import RecentTasksSection from './home/RecentTasksSection';
import GovernanceOverviewSection from './home/GovernanceOverviewSection';
import QuickActionsSection from './home/QuickActionsSection';
import { COCKPIT_WORK_MODES } from './cockpitWorkModes';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import { COCKPIT_PAGE_REGISTRY } from './cockpitPageRegistry';
import SummaryTileGrid from './common/SummaryTileGrid';

interface HealthSummary {
  health_score: number;
  health_score_change: number;
  active_services: number;
  total_services: number;
  active_tasks: number;
  today_requests: number;
  today_requests_change: number;
  data_quality?: 'complete' | 'partial' | 'unavailable' | string;
  degraded_reasons?: string[];
}

interface Alert {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  updated_at: string;
}

interface DataPoint {
  timestamp: string;
  value: number;
}

interface PriorityProject {
  id: string;
  layer: string;
  status: string;
  score: number;
  primary_gap: string;
  next_action: string;
  triage_commands: number;
}

interface FocusWeakDimension {
  id: string;
  title: string;
  status: string;
  score: number;
  failed: number;
  warning: number;
  nextAction: string;
  attentionProjects: { id: string; status: string; next_action: string }[];
}

interface FocusDomainAttention {
  id: string;
  name: string;
  runtimeStatus: string;
  riskLevel: string;
  securityPosture: string;
  nextAction: string;
}

interface OperatingFocus {
  status: string;
  score: number;
  blocked: number;
  atRisk: number;
  watch: number;
  healthy: number;
  runtimeGapProjects: number;
  verificationGapProjects: number;
  verificationReadyProjects: number;
  readyAndRunningProjects: number;
  priorityProjects: PriorityProject[];
  totalDrafts: number;
  projectDrafts: number;
  verificationDrafts: number;
  playbookDrafts: number;
  domainAppDrafts: number;
  capabilityGapDrafts: number;
  pageMaturityDrafts: number;
  actionDrafts: FocusActionDraft[];
  weakestDimensions: FocusWeakDimension[];
  domainAttention: FocusDomainAttention[];
}

interface DraftTaskSummary {
  id?: string;
  title?: string;
  description?: string;
  priority?: string;
  read_only?: boolean;
  tags?: string[];
  source?: {
    id?: string;
    title?: string;
    type?: string;
  };
}

interface FocusActionDraft {
  id: string;
  title: string;
  sourceLabel: string;
  sourceType?: string;
  sourceId?: string;
  priority?: string;
  description?: string;
}

interface SymptomRouteCard {
  id: string;
  title: string;
  signal: string;
  detail: string;
  primaryLabel: string;
  primaryTarget: CockpitNavigationTarget;
  secondaryLabel: string;
  secondaryTarget: CockpitNavigationTarget;
}

interface UsagePathPage {
  id: string;
  title: string;
  group?: string;
  purpose?: string;
  dimensions?: string[];
}

interface UsagePath {
  id: string;
  title: string;
  intent: string;
  steps?: string[];
  pages?: UsagePathPage[];
}

interface PlaybookStep {
  id: string;
  page_id?: string;
  action?: string;
  done_when?: string;
  page?: {
    id?: string;
    title?: string;
    group?: string;
  };
}

interface OperatingPlaybook {
  id: string;
  title: string;
  goal: string;
  frequency?: string;
  owner?: string;
  risk?: string;
  steps?: PlaybookStep[];
}

interface CockpitPageMeta {
  id: string;
  title: string;
  group: string;
  purpose?: string;
  dimensions?: string[];
}

interface FeatureDomain {
  id: string;
  title: string;
  english?: string;
  cockpit_page?: string;
  coverage?: string;
  capability_items?: string[];
  providers?: string[];
}

interface PageGroupSummary {
  group: string;
  count: number;
  pages: CockpitPageMeta[];
}

interface ArchitectureRoadmapLane {
  id: string;
  title: string;
  count: number;
}

interface ArchitectureLaneSummary {
  id: string;
  title: string;
  pageCount: number;
  usageCount: number;
  domainCount: number;
  attentionCount: number;
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface SiteClosureRow {
  id: string;
  pageId: string;
  title: string;
  group: string;
  missingItems: string[];
  linkedItems: string[];
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface NavigationCoverageRow {
  id: string;
  pageId: string;
  title: string;
  group: string;
  purpose: string;
  registeredInSystemMap: boolean;
  hasUsagePath: boolean;
  hasPlaybook: boolean;
  hasTaskDraft: boolean;
  missingItems: string[];
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface DimensionCoverageBandRow {
  id: string;
  group: string;
  coverageScore: number;
  pageCount: number;
  registeredCount: number;
  usageCount: number;
  playbookCount: number;
  domainCount: number;
  taskCount: number;
  attentionCount: number;
  missingDimensionCounts: { label: string; count: number }[];
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface SiteArchitecture {
  projects: number;
  pages: number;
  domains: number;
  usagePaths: number;
  playbooks: number;
  roadmapItems: number;
  projectCoverageScore: number;
  pageMaturityScore: number;
  domainAppScore: number;
  pageReady: number;
  pageWatch: number;
  capabilityWarnings: number;
  capabilityFailures: number;
  domainRunning: number;
  externalMounts: number;
  highRiskDomainApps: number;
  blockedProjects: number;
  projectsNeedingAction: number;
  pageGroups: PageGroupSummary[];
  featureDomains: FeatureDomain[];
  roadmapLanes: ArchitectureRoadmapLane[];
  laneSummaries: ArchitectureLaneSummary[];
}

const HOME_DRAFT_TASKS_URL = '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80';

const DRAFT_SOURCE_LABELS: Record<string, string> = {
  system_map_project_portfolio: '项目',
  system_map_verification_ready: '验证',
  system_map_playbook: '清单',
  system_map_domain_app: '领域',
  system_map_capability_gap: '缺口',
  system_map_page_maturity: '页面',
};

const DRAFT_PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const EMPTY_HEALTH_SUMMARY: HealthSummary = {
  health_score: 0,
  health_score_change: 0,
  active_services: 0,
  total_services: 0,
  active_tasks: 0,
  today_requests: 0,
  today_requests_change: 0,
  data_quality: 'unavailable',
  degraded_reasons: [],
};

const DEFAULT_OPERATING_FOCUS: OperatingFocus = {
  status: 'unknown',
  score: 0,
  blocked: 0,
  atRisk: 0,
  watch: 0,
  healthy: 0,
  runtimeGapProjects: 0,
  verificationGapProjects: 0,
  verificationReadyProjects: 0,
  readyAndRunningProjects: 0,
  priorityProjects: [],
  totalDrafts: 0,
  projectDrafts: 0,
  verificationDrafts: 0,
  playbookDrafts: 0,
  domainAppDrafts: 0,
  capabilityGapDrafts: 0,
  pageMaturityDrafts: 0,
  actionDrafts: [],
  weakestDimensions: [],
  domainAttention: [],
};

const DEFAULT_SITE_ARCHITECTURE: SiteArchitecture = {
  projects: 0,
  pages: 0,
  domains: 0,
  usagePaths: 0,
  playbooks: 0,
  roadmapItems: 0,
  projectCoverageScore: 0,
  pageMaturityScore: 0,
  domainAppScore: 0,
  pageReady: 0,
  pageWatch: 0,
  capabilityWarnings: 0,
  capabilityFailures: 0,
  domainRunning: 0,
  externalMounts: 0,
  highRiskDomainApps: 0,
  blockedProjects: 0,
  projectsNeedingAction: 0,
  pageGroups: [],
  featureDomains: [],
  roadmapLanes: [],
  laneSummaries: [],
};

const PAGE_GROUP_ORDER = ['入口', '运行大盘', '智能与知识', '系统治理', '开发工具', '领域应用', '系统配置'];

function buildPageGroups(pages: CockpitPageMeta[]): PageGroupSummary[] {
  const grouped = new globalThis.Map<string, CockpitPageMeta[]>();
  pages.forEach((page) => {
    const group = page.group || '未分组';
    const existing = grouped.get(group) || [];
    existing.push(page);
    grouped.set(group, existing);
  });
  return [...grouped.entries()]
    .map(([group, items]) => ({ group, count: items.length, pages: items }))
    .sort((left, right) => {
      const leftIndex = PAGE_GROUP_ORDER.indexOf(left.group);
      const rightIndex = PAGE_GROUP_ORDER.indexOf(right.group);
      return (leftIndex === -1 ? PAGE_GROUP_ORDER.length : leftIndex) - (rightIndex === -1 ? PAGE_GROUP_ORDER.length : rightIndex);
    });
}

function normalizeSearchText(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[()\-_/.,:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function draftMatchesPage(draft: DraftTaskSummary, pageId: string, pageTitle: string): boolean {
  if (draft.source?.id === pageId) return true;
  const normalizedPageId = normalizeSearchText(pageId);
  const normalizedPageTitle = normalizeSearchText(pageTitle);
  const draftTitle = normalizeSearchText(draft.title);
  const draftDescription = normalizeSearchText(draft.description);
  const draftSourceTitle = normalizeSearchText(draft.source?.title);
  return [draftTitle, draftDescription, draftSourceTitle].some((value) =>
    Boolean(value) && (
      value.includes(normalizedPageId)
      || value.includes(normalizedPageTitle)
      || normalizedPageTitle.includes(value)
    ),
  );
}

function buildArchitectureLaneSummaries({
  cockpitPages,
  featureDomains,
  usagePaths,
  roadmapItems,
  draftItems,
  domainAttentionItems,
}: {
  cockpitPages: CockpitPageMeta[];
  featureDomains: FeatureDomain[];
  usagePaths: UsagePath[];
  roadmapItems: Array<{ cockpit_page?: string; problem?: string; title?: string; status?: string }>;
  draftItems: DraftTaskSummary[];
  domainAttentionItems: Array<{ id?: string; name?: string; next_action?: string }>;
}): ArchitectureLaneSummary[] {
  const groupPages = new globalThis.Map<string, globalThis.Map<string, string>>();

  const registerGroupPage = (group?: string, pageId?: string, pageTitle?: string) => {
    if (!group || !pageId) return;
    const existing = groupPages.get(group) || new globalThis.Map<string, string>();
    existing.set(pageId, pageTitle || pageId);
    groupPages.set(group, existing);
  };

  cockpitPages.forEach((page) => registerGroupPage(page.group, page.id, page.title));
  usagePaths.forEach((path) => {
    (path.pages || []).forEach((page) => registerGroupPage(page.group, page.id, page.title));
  });

  return [...groupPages.entries()]
    .sort((left, right) => {
      const leftIndex = PAGE_GROUP_ORDER.indexOf(left[0]);
      const rightIndex = PAGE_GROUP_ORDER.indexOf(right[0]);
      return (leftIndex === -1 ? PAGE_GROUP_ORDER.length : leftIndex) - (rightIndex === -1 ? PAGE_GROUP_ORDER.length : rightIndex);
    })
    .map(([group, pages]) => {
      const pageIds = [...pages.keys()];
      const matchingUsagePaths = usagePaths.filter((path) =>
        (path.pages || []).some((page) => page.id && pageIds.includes(page.id)),
      );
      const matchingDomains = featureDomains.filter((domain) =>
        (domain.cockpit_page && pageIds.includes(domain.cockpit_page))
        || (domain.providers || []).some((provider) => pageIds.includes(provider)),
      );
      const matchingRoadmapItems = roadmapItems.filter((item) =>
        item.cockpit_page && pageIds.includes(item.cockpit_page) && item.status !== 'shipped',
      );
      const pageDrafts = draftItems.filter((item) =>
        item.read_only
        && item.source?.type === 'system_map_page_maturity'
        && item.source.id
        && pageIds.includes(item.source.id),
      );
      const laneAttentionCount = pageDrafts.length
        + matchingRoadmapItems.length
        + (group === '领域应用' ? domainAttentionItems.length : 0);
      const primaryPageDraft = pageDrafts[0];
      const primaryRoadmap = matchingRoadmapItems[0];
      const primaryDomainAttention = group === '领域应用' ? domainAttentionItems[0] : null;
      const primaryPageId = primaryPageDraft?.source?.id || primaryRoadmap?.cockpit_page || pageIds[0] || null;
      const nextAction = primaryPageDraft?.description
        || primaryRoadmap?.problem
        || primaryDomainAttention?.next_action
        || `先回 ${group} 这条工作带确认页面、路径和能力域是否都挂上了。`;

      return {
        id: group,
        title: group,
        pageCount: pageIds.length,
        usageCount: matchingUsagePaths.length,
        domainCount: matchingDomains.length,
        attentionCount: laneAttentionCount,
        nextAction,
        objectTarget: primaryDomainAttention
          ? { tab: 'DomainApps', taskQuery: primaryDomainAttention.id || primaryDomainAttention.name || 'domain' }
          : primaryPageId
            ? { tab: 'SystemMap', pageId: primaryPageId }
            : { tab: 'SystemMap' },
        taskTarget: primaryDomainAttention
          ? { tab: 'TaskCenter', taskQuery: primaryDomainAttention.id || primaryDomainAttention.name || 'domain' }
          : primaryPageId
            ? { tab: 'TaskCenter', taskQuery: primaryPageId }
            : { tab: 'TaskCenter', taskQuery: group },
      };
    });
}

function buildSiteClosureRows({
  cockpitPages,
  featureDomains,
  usagePaths,
  playbooks,
  roadmapItems,
  draftItems,
}: {
  cockpitPages: CockpitPageMeta[];
  featureDomains: FeatureDomain[];
  usagePaths: UsagePath[];
  playbooks: OperatingPlaybook[];
  roadmapItems: Array<{ cockpit_page?: string; status?: string }>;
  draftItems: DraftTaskSummary[];
}): SiteClosureRow[] {
  const pageIds = new Set<string>();
  cockpitPages.forEach((page) => page.id && pageIds.add(page.id));
  usagePaths.forEach((path) => (path.pages || []).forEach((page) => page.id && pageIds.add(page.id)));
  playbooks.forEach((playbook) => (playbook.steps || []).forEach((step) => {
    const pageId = step.page_id || step.page?.id;
    if (pageId) pageIds.add(pageId);
  }));
  featureDomains.forEach((domain) => {
    if (domain.cockpit_page) pageIds.add(domain.cockpit_page);
    (domain.providers || []).forEach((provider) => provider && pageIds.add(provider));
  });
  roadmapItems.forEach((item) => item.cockpit_page && pageIds.add(item.cockpit_page));

  return [...pageIds]
    .map((pageId) => {
      const pageMeta = cockpitPages.find((page) => page.id === pageId);
      const pageTitle = pageMeta?.title || pageId;
      const hasPath = usagePaths.some((path) => path.pages?.some((page) => page.id === pageId));
      const matchedDomains = featureDomains.filter((domain) => domain.cockpit_page === pageId || domain.providers?.includes(pageId));
      const matchedPlaybooks = playbooks.filter((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === pageId));
      const matchedRoadmapItems = roadmapItems.filter((item) => item.cockpit_page === pageId && item.status !== 'shipped');
      const matchedDraft = draftItems.find((draft) => draftMatchesPage(draft, pageId, pageTitle)) || null;

      const missingItems: string[] = [];
      const linkedItems: string[] = [];
      if (hasPath) linkedItems.push('路径');
      else missingItems.push('路径');
      if (matchedDomains.length > 0) linkedItems.push('能力域');
      else missingItems.push('能力域');
      if (matchedPlaybooks.length > 0) linkedItems.push('操作清单');
      else missingItems.push('操作清单');
      if (matchedRoadmapItems.length > 0) linkedItems.push('路线图');
      else missingItems.push('路线图');
      if (matchedDraft) linkedItems.push('任务');
      else missingItems.push('任务');

      const nextAction = !hasPath
        ? '先把页面挂进使用路径。'
        : matchedDomains.length === 0
          ? '补能力域映射。'
          : matchedPlaybooks.length === 0
            ? '补操作清单入口。'
            : matchedRoadmapItems.length === 0
              ? '补路线图条目。'
              : !matchedDraft
                ? '补任务草稿。'
                : '继续把页面闭环做实。';

      return {
        id: `home-site-closure-${pageId}`,
        pageId,
        title: pageTitle,
        group: pageMeta?.group || '未分组',
        missingItems,
        linkedItems,
        nextAction,
        objectTarget: { tab: 'SystemMap', pageId },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedDraft?.source?.id || pageId },
      };
    })
    .sort((left, right) => {
      const missingDelta = right.missingItems.length - left.missingItems.length;
      if (missingDelta !== 0) return missingDelta;
      return left.title.localeCompare(right.title, 'zh-CN');
    });
}

function buildNavigationCoverageRows({
  cockpitPages,
  usagePaths,
  playbooks,
  draftItems,
}: {
  cockpitPages: CockpitPageMeta[];
  usagePaths: UsagePath[];
  playbooks: OperatingPlaybook[];
  draftItems: DraftTaskSummary[];
}): NavigationCoverageRow[] {
  const registeredPageIds = new Set(cockpitPages.map((page) => page.id));

  return COCKPIT_PAGE_REGISTRY.map((page) => {
    const hasUsagePath = usagePaths.some((path) => path.pages?.some((item) => item.id === page.id));
    const hasPlaybook = playbooks.some((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === page.id));
    const matchedDraft = draftItems.find((draft) => draftMatchesPage(draft, page.id, page.title)) || null;
    const missingItems: string[] = [];

    if (!registeredPageIds.has(page.id)) missingItems.push('地图登记');
    if (!hasUsagePath) missingItems.push('使用路径');
    if (!hasPlaybook) missingItems.push('操作清单');
    if (!matchedDraft) missingItems.push('任务承接');

    const nextAction = !registeredPageIds.has(page.id)
      ? '先把这个页面登记进系统地图和站内治理视图。'
      : !hasUsagePath
        ? '补一条使用路径，说明这个页面什么时候进、解决什么问题。'
        : !hasPlaybook
          ? '补操作清单步骤，让页面进入稳定日用闭环。'
          : !matchedDraft
            ? '补一个只读任务草稿，给页面留明确承接入口。'
            : '继续把页面承接链条做细。';

    return {
      id: `home-nav-coverage-${page.id}`,
      pageId: page.id,
      title: page.title,
      group: page.group,
      purpose: page.purpose,
      registeredInSystemMap: registeredPageIds.has(page.id),
      hasUsagePath,
      hasPlaybook,
      hasTaskDraft: Boolean(matchedDraft),
      missingItems,
      nextAction,
      objectTarget: { tab: page.id, pageId: page.id },
      taskTarget: { tab: 'TaskCenter', taskQuery: matchedDraft?.source?.id || page.id },
    };
  }).sort((left, right) => {
    const missingDelta = right.missingItems.length - left.missingItems.length;
    if (missingDelta !== 0) return missingDelta;
    return left.title.localeCompare(right.title, 'zh-CN');
  });
}

function buildDimensionCoverageRows({
  rows,
  featureDomains,
}: {
  rows: NavigationCoverageRow[];
  featureDomains: FeatureDomain[];
}): DimensionCoverageBandRow[] {
  const grouped = new globalThis.Map<string, NavigationCoverageRow[]>();
  rows.forEach((row) => {
    const group = row.group || '未分组';
    const items = grouped.get(group) || [];
    items.push(row);
    grouped.set(group, items);
  });

  return [...grouped.entries()]
    .sort((left, right) => {
      const leftIndex = PAGE_GROUP_ORDER.indexOf(left[0]);
      const rightIndex = PAGE_GROUP_ORDER.indexOf(right[0]);
      return (leftIndex === -1 ? PAGE_GROUP_ORDER.length : leftIndex) - (rightIndex === -1 ? PAGE_GROUP_ORDER.length : rightIndex);
    })
    .map(([group, groupRows]) => {
      const pageCount = groupRows.length;
      const registeredCount = groupRows.filter((row) => row.registeredInSystemMap).length;
      const usageCount = groupRows.filter((row) => row.hasUsagePath).length;
      const playbookCount = groupRows.filter((row) => row.hasPlaybook).length;
      const taskCount = groupRows.filter((row) => row.hasTaskDraft).length;
      const groupPageIds = new Set(groupRows.map((row) => row.pageId));
      const domainCount = new Set(
        featureDomains
          .map((domain) => domain.cockpit_page)
          .filter((pageId): pageId is string => Boolean(pageId) && groupPageIds.has(pageId)),
      ).size;
      const attentionRows = groupRows.filter((row) => row.missingItems.length > 0);
      const missingDimensionCounts = [
        { label: '缺地图', count: groupRows.filter((row) => !row.registeredInSystemMap).length },
        { label: '缺路径', count: groupRows.filter((row) => !row.hasUsagePath).length },
        { label: '缺清单', count: groupRows.filter((row) => !row.hasPlaybook).length },
        { label: '缺能力域', count: groupRows.filter((row) => !featureDomains.some((domain) => domain.cockpit_page === row.pageId)).length },
        { label: '缺任务', count: groupRows.filter((row) => !row.hasTaskDraft).length },
      ].filter((item) => item.count > 0);
      const weakestRow = [...groupRows].sort((left, right) => {
        const missingDelta = right.missingItems.length - left.missingItems.length;
        if (missingDelta !== 0) return missingDelta;
        return left.title.localeCompare(right.title, 'zh-CN');
      })[0];
      const coverageScore = pageCount === 0
        ? 0
        : Math.round(((registeredCount + usageCount + playbookCount + domainCount + taskCount) / (pageCount * 5)) * 100);

      return {
        id: `dimension-band-${group}`,
        group,
        coverageScore,
        pageCount,
        registeredCount,
        usageCount,
        playbookCount,
        domainCount,
        taskCount,
        attentionCount: attentionRows.length,
        missingDimensionCounts,
        nextAction: weakestRow?.nextAction || `继续收口 ${group} 工作带的使用链和承接入口。`,
        objectTarget: weakestRow?.objectTarget || { tab: 'SystemMap' },
        taskTarget: weakestRow?.taskTarget || { tab: 'TaskCenter', taskQuery: group },
      };
    });
}

interface HomePageProps {
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
}

interface Thought {
  role: string;
  name: string;
  avatar: string;
  content: string;
}

function ThoughtStreamSection({ thoughts }: { thoughts: Thought[] }) {
  if (!thoughts || thoughts.length === 0) return null;

  const roleColors: Record<string, string> = {
    builder: 'var(--antd-primary)',
    devil: 'var(--antd-error)',
    sage: 'var(--antd-warning)',
    keeper: 'var(--antd-success)'
  };

  return (
    <div className="services-section animate-fade-in" style={{ marginTop: '0px', marginBottom: '24px' }}>
      <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-secondary)', margin: 0 }}>
          🧠 虚拟董事会心智探针 (Thought Streams)
        </h3>
        <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)' }}>实时系统洞察与架构审查</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {thoughts.map((t) => (
          <div 
            key={t.role} 
            className="antd-card" 
            style={{ 
              padding: '16px 20px', 
              borderLeft: `3px solid ${roleColors[t.role] || 'rgba(255,255,255,0.1)'}`,
              background: 'rgba(255,255,255,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--antd-text-primary)' }}>
                <span>{t.avatar}</span>
                <span>{t.name}</span>
              </span>
              <span style={{ 
                fontSize: '9px', 
                padding: '1px 5px', 
                borderRadius: '3px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                fontWeight: 600
              }}>
                {t.role}
              </span>
            </div>
            <p style={{ 
              margin: 0, 
              fontSize: '11.5px', 
              lineHeight: '1.5', 
              color: 'rgba(255,255,255,0.7)',
              wordBreak: 'break-all'
            }}>
              {t.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function focusStatusText(status: string): string {
  if (status === 'healthy') return '健康';
  if (status === 'watch') return '观察';
  if (status === 'at_risk') return '风险';
  if (status === 'blocked') return '阻塞';
  return '未知';
}

function draftSourceLabel(type?: string): string {
  if (!type) return '草稿';
  return DRAFT_SOURCE_LABELS[type] || '草稿';
}

function draftPriorityWeight(priority?: string): number {
  return DRAFT_PRIORITY_WEIGHT[priority || ''] || 0;
}

function toFocusActionDraft(item: DraftTaskSummary): FocusActionDraft {
  const sourceId = item.source?.id || item.id;
  return {
    id: item.id || sourceId || item.title || 'draft-action',
    title: item.title || item.source?.title || sourceId || '未命名草稿',
    sourceLabel: draftSourceLabel(item.source?.type),
    sourceType: item.source?.type,
    sourceId,
    priority: item.priority,
    description: item.description,
  };
}

function draftTarget(draft: FocusActionDraft): CockpitNavigationTarget {
  if (draft.sourceType === 'system_map_project_portfolio') {
    return { tab: 'SystemMap', projectId: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_domain_app') {
    return { tab: 'DomainApps', taskQuery: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_capability_gap') {
    return { tab: 'SystemMap', gapId: draft.sourceId };
  }
  if (draft.sourceType === 'system_map_page_maturity') {
    return { tab: 'SystemMap', pageId: draft.sourceId };
  }
  return { tab: 'TaskCenter', taskQuery: draft.sourceId };
}

function usagePathTarget(path: UsagePath): string {
  const steps = path.steps && path.steps.length > 0
    ? path.steps
    : (path.pages || []).map((page) => page.id);
  return steps.find((step) => step !== 'Home') || steps[0] || 'SystemMap';
}

function playbookTarget(playbook: OperatingPlaybook): string {
  const stepIds = (playbook.steps || []).map((step) => step.page_id || step.page?.id).filter(Boolean) as string[];
  return stepIds.find((id) => id !== 'Home' && id !== 'SystemMap') || stepIds[0] || 'SystemMap';
}

function featuredPlaybooks(playbooks: OperatingPlaybook[]): OperatingPlaybook[] {
  const priorities = ['daily-health-check', 'research-publication-loop', 'protocol-integrity-check', 'domain-app-ops', 'knowledge-work-session'];
  const ranked = [...playbooks].sort((left, right) => {
    const leftIndex = priorities.indexOf(left.id);
    const rightIndex = priorities.indexOf(right.id);
    const safeLeft = leftIndex === -1 ? priorities.length : leftIndex;
    const safeRight = rightIndex === -1 ? priorities.length : rightIndex;
    return safeLeft - safeRight;
  });
  return ranked.slice(0, 4);
}

function cockpitPageTitle(pages: CockpitPageMeta[], pageId?: string): string {
  if (!pageId) return '未登记页面';
  return pages.find((page) => page.id === pageId)?.title || pageId;
}

function matchesFocusQuery(value: string | undefined, query: string | undefined): boolean {
  if (!value || !query) return false;
  const left = value.trim().toLowerCase();
  const right = query.trim().toLowerCase();
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function playbookTheme(playbook: OperatingPlaybook): string {
  if (playbook.id.includes('research')) return 'research';
  if (playbook.id.includes('protocol')) return 'protocol';
  if (playbook.id.includes('domain')) return 'domain';
  if (playbook.id.includes('governance')) return 'governance';
  return 'default';
}

function WorkModeSection({
  architecture,
  focus,
  onTabChange,
  onOpenTarget,
}: {
  architecture: SiteArchitecture;
  focus: OperatingFocus;
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const modes = COCKPIT_WORK_MODES.map((mode) => ({
    ...mode,
    signal:
      mode.id === 'operator'
        ? `待动作 ${architecture.projectsNeedingAction} · 清单 ${focus.playbookDrafts}`
        : mode.id === 'governance'
          ? `阻塞 ${focus.blocked} · 缺口 ${focus.capabilityGapDrafts}`
          : mode.id === 'builder'
            ? `页面 ${focus.pageMaturityDrafts} · 验证 ${focus.verificationDrafts}`
            : `领域 ${focus.domainAppDrafts} · 高风险 ${architecture.highRiskDomainApps}`,
  }));

  return (
    <section className="services-section home-operating-focus">
      <div className="section-header">
        <div>
          <h2>按工作模式进入</h2>
          <p className="text-muted">先认今天来 cockpit 是干什么的，再进对应主入口和承接车道。</p>
        </div>
        <button className="antd-btn small" aria-label="打开工作模式完整地图" onClick={() => onTabChange?.('Guide')}>
          <Map size={13} />
          <span>查看导览</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {modes.map((mode) => (
          <article key={mode.id} className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <small style={{ color: 'var(--antd-text-secondary)', textTransform: 'uppercase', fontSize: 11 }}>{mode.id}</small>
              <strong style={{ color: 'var(--antd-text-primary)', fontSize: 15 }}>{mode.title}</strong>
              <p style={{ margin: 0, color: 'var(--antd-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{mode.summary}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {mode.focus.map((chip) => (
                <span
                  key={chip}
                  style={{
                    display: 'inline-flex',
                    minHeight: 28,
                    alignItems: 'center',
                    padding: '0 10px',
                    border: '1px solid var(--antd-border-color)',
                    borderRadius: 'var(--antd-radius-md)',
                    background: 'rgba(255,255,255,0.03)',
                    color: 'var(--antd-text-secondary)',
                    fontSize: 12,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <div
              style={{
                minHeight: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 'var(--antd-radius-md)',
                color: 'var(--antd-text-secondary)',
                fontSize: 12,
              }}
            >
              <span>当前信号</span>
              <strong style={{ color: 'var(--antd-text-primary)', fontSize: 12 }}>{mode.signal}</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto' }}>
              <button
                className="antd-btn"
                aria-label={`打开工作模式 ${mode.title}`}
                onClick={() => openCockpitNavigationTarget(mode.entry, onTabChange, onOpenTarget)}
              >
                <ArrowRight size={13} />
                <span>进入主入口</span>
              </button>
              <button
                className="antd-btn small"
                aria-label={`打开工作模式任务 ${mode.title}`}
                onClick={() => openCockpitNavigationTarget(mode.taskTarget, onTabChange, onOpenTarget)}
              >
                <ClipboardCheck size={13} />
                <span>看承接任务</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SymptomTriageSection({
  architecture,
  focus,
  onTabChange,
  onOpenTarget,
}: {
  architecture: SiteArchitecture;
  focus: OperatingFocus;
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const pageDraft = focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_page_maturity') || null;
  const verificationDraft = focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_verification_ready') || null;
  const capabilityDraft = focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_capability_gap') || null;
  const domainAttention = focus.domainAttention[0] || null;
  const weakestDimension = focus.weakestDimensions[0] || null;
  const verificationDimension = focus.weakestDimensions.find((dimension) => dimension.id === 'verification')
    || focus.weakestDimensions.find((dimension) => dimension.title.includes('验证'))
    || null;

  const cards: SymptomRouteCard[] = [
    {
      id: 'page-adoption',
      title: '页面有了但不会用',
      signal: focus.pageMaturityDrafts > 0 || architecture.pageWatch > 0
        ? `${focus.pageMaturityDrafts} 页面草稿 · ${architecture.pageWatch} 待收口`
        : '页面入口基本已接通',
      detail: pageDraft
        ? `${pageDraft.title} 还没完全接到使用路径或承接任务，先回页面剖面继续补。`
        : '先看系统地图里的页面剖面，确认是缺路径、缺能力域，还是缺任务承接。',
      primaryLabel: '看页面剖面',
      primaryTarget: pageDraft
        ? { tab: 'SystemMap', pageId: pageDraft.sourceId }
        : { tab: 'SystemMap' },
      secondaryLabel: '看页面任务',
      secondaryTarget: pageDraft
        ? { tab: 'TaskCenter', taskQuery: pageDraft.sourceId }
        : { tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' },
    },
    {
      id: 'verification-gap',
      title: '能看不能证',
      signal: focus.verificationGapProjects > 0 || focus.verificationDrafts > 0
        ? `验证缺口 ${focus.verificationGapProjects} · 草稿 ${focus.verificationDrafts}`
        : '验证补证暂时收敛',
      detail: verificationDraft
        ? `${verificationDraft.title} 还没沉成完整证据链，先去验证车道补证。`
        : '先看验证维度和 TaskCenter 补证草稿，别让问题只停在现象层。',
      primaryLabel: '看验证维度',
      primaryTarget: verificationDimension
        ? { tab: 'SystemMap', coverageDimensionId: verificationDimension.id }
        : { tab: 'TaskCenter', taskQuery: '验证' },
      secondaryLabel: '看补证任务',
      secondaryTarget: verificationDraft
        ? { tab: 'TaskCenter', taskQuery: verificationDraft.sourceId }
        : { tab: 'TaskCenter', taskQuery: '验证' },
    },
    {
      id: 'domain-instability',
      title: '领域挂载不稳',
      signal: architecture.highRiskDomainApps > 0 || focus.domainAttention.length > 0
        ? `高风险 ${architecture.highRiskDomainApps} · 待收口 ${focus.domainAttention.length}`
        : '领域挂载暂时平稳',
      detail: domainAttention
        ? `${domainAttention.name} 当前 ${domainAttention.runtimeStatus}，建议回应用中心和任务中心一起收口。`
        : '先看应用中心，确认家庭、OPC、family-hub 的入口、安全和运行态。',
      primaryLabel: '看领域对象',
      primaryTarget: domainAttention
        ? { tab: 'DomainApps', taskQuery: domainAttention.id }
        : { tab: 'DomainApps' },
      secondaryLabel: '看领域任务',
      secondaryTarget: domainAttention
        ? { tab: 'TaskCenter', taskQuery: domainAttention.id }
        : { tab: 'TaskCenter', taskQuery: 'system_map_domain_app' },
    },
    {
      id: 'capability-closure',
      title: '能力缺口还没收口',
      signal: focus.capabilityGapDrafts > 0
        ? `${focus.capabilityGapDrafts} 条缺口草稿`
        : '暂无显式能力缺口草稿',
      detail: capabilityDraft
        ? `${capabilityDraft.title} 还需要继续拆成页面、协议、领域或验证动作。`
        : '先从系统地图回看缺口定义，确认到底卡在页面、项目组合还是领域承接。',
      primaryLabel: '看缺口总图',
      primaryTarget: capabilityDraft
        ? { tab: 'SystemMap', gapId: capabilityDraft.sourceId }
        : { tab: 'SystemMap' },
      secondaryLabel: '看缺口任务',
      secondaryTarget: capabilityDraft
        ? { tab: 'TaskCenter', taskQuery: capabilityDraft.sourceId }
        : { tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' },
    },
    {
      id: 'coverage-drop',
      title: '覆盖矩阵在掉分',
      signal: weakestDimension
        ? `${weakestDimension.title} ${weakestDimension.score}%`
        : `项目覆盖 ${architecture.projectCoverageScore}%`,
      detail: weakestDimension
        ? `${weakestDimension.nextAction} 先修最薄弱维度，再看相关项目和任务。`
        : '先看系统地图的覆盖矩阵，确认是不是运行、验证或页面成熟度在拖后腿。',
      primaryLabel: '看覆盖维度',
      primaryTarget: weakestDimension
        ? { tab: 'SystemMap', coverageDimensionId: weakestDimension.id }
        : { tab: 'SystemMap' },
      secondaryLabel: '看修复任务',
      secondaryTarget: weakestDimension?.attentionProjects?.[0]
        ? { tab: 'TaskCenter', taskQuery: weakestDimension.attentionProjects[0].id }
        : { tab: 'TaskCenter', taskQuery: 'system_map_project_portfolio' },
    },
  ];

  return (
    <section className="services-section home-operating-focus">
      <div className="section-header">
        <div>
          <h2>按症状定位</h2>
          <p className="text-muted">当你只知道 cockpit 这里“不够用”时，先按症状进，不用猜该翻哪一页。</p>
        </div>
        <button className="antd-btn small" aria-label="打开首页症状分诊总图" onClick={() => onTabChange?.('Guide')}>
          <Map size={13} />
          <span>看导览分诊</span>
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="home-focus-repair-grid">
        {cards.map((card) => (
          <article key={card.id} className="home-focus-lane-card">
            <span>症状分诊</span>
            <strong>{card.title}</strong>
            <small>{card.signal}</small>
            <p>{card.detail}</p>
            <div className="home-focus-lane-chips">
              <em>{card.primaryLabel}</em>
              <em>{card.secondaryLabel}</em>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                className="antd-btn small"
                aria-label={`打开首页症状对象 ${card.title}`}
                onClick={() => openCockpitNavigationTarget(card.primaryTarget, onTabChange, onOpenTarget)}
              >
                <ArrowRight size={13} />
                <span>{card.primaryLabel}</span>
              </button>
              <button
                className="antd-btn small"
                aria-label={`打开首页症状任务 ${card.title}`}
                onClick={() => openCockpitNavigationTarget(card.secondaryTarget, onTabChange, onOpenTarget)}
              >
                <ClipboardCheck size={13} />
                <span>{card.secondaryLabel}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function coverageTone(score: number, failureCount = 0, warningCount = 0): string {
  if (failureCount > 0 || score < 70) return 'offline';
  if (warningCount > 0 || score < 85) return 'degraded';
  return 'online';
}

function actionLoadTone(focus: OperatingFocus): string {
  if (focus.verificationGapProjects > 0 || focus.capabilityGapDrafts > 0) return 'offline';
  if (focus.verificationReadyProjects > 0 || focus.pageMaturityDrafts > 0 || focus.domainAppDrafts > 0) return 'degraded';
  return 'online';
}

function UsagePathSection({
  paths,
  onTabChange,
}: {
  paths: UsagePath[];
  onTabChange?: (tab: string) => void;
}) {
  return (
    <section className="services-section home-usage-paths">
      <div className="section-header">
        <div>
          <h2>按场景进入</h2>
          <p className="text-muted">{paths.length} 条操作路径来自 SystemMap，覆盖日常、架构、运行、治理、知识和领域作战。</p>
        </div>
        <button className="antd-btn small" aria-label="打开功能架构完整地图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>完整地图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-usage-path-grid">
        {paths.map((path) => (
          <article key={path.id} className="home-usage-path-card">
            <div className="home-usage-path-head">
              <button className="home-usage-path-main" onClick={() => onTabChange?.(usagePathTarget(path))}>
                <Route size={15} />
                <span>
                  <strong>{path.title}</strong>
                  <small>{path.intent}</small>
                </span>
              </button>
              <button
                className="home-usage-path-open"
                aria-label={`打开${path.title}`}
                onClick={() => onTabChange?.(usagePathTarget(path))}
              >
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="home-usage-path-steps">
              {(path.pages || []).slice(0, 6).map((page, index) => (
                <button key={`${path.id}-${page.id}`} onClick={() => onTabChange?.(page.id)}>
                  <span>{index + 1}</span>
                  <strong>{page.title}</strong>
                  <small>{page.group || page.id}</small>
                </button>
              ))}
            </div>
          </article>
        ))}

        {paths.length === 0 && (
          <div className="home-focus-empty">暂无使用路径</div>
        )}
      </div>
    </section>
  );
}

function ScenarioWorkbenchSection({
  playbooks,
  onTabChange,
}: {
  playbooks: OperatingPlaybook[];
  onTabChange?: (tab: string) => void;
}) {
  const featured = featuredPlaybooks(playbooks);

  return (
    <section className="services-section home-scenario-workbench">
      <div className="section-header">
        <div>
          <h2>场景作战面</h2>
          <p className="text-muted">把研究、协议、治理和领域作战这些高频闭环直接抬到首页，不用先猜该进哪个页。</p>
        </div>
        <button className="antd-btn small" aria-label="打开场景与协议完整地图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>回总图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-scenario-grid">
        {featured.map((playbook) => (
          <article key={playbook.id} className={`home-scenario-card ${playbookTheme(playbook)}`}>
            <div className="home-scenario-head">
              <div>
                <span>{playbook.frequency || 'on-demand'} · {playbook.owner || 'operator'}</span>
                <strong>{playbook.title}</strong>
              </div>
              <button
                className="home-scenario-open"
                aria-label={`打开${playbook.title}`}
                onClick={() => onTabChange?.(playbookTarget(playbook))}
              >
                <ArrowRight size={14} />
              </button>
            </div>
            <p>{playbook.goal}</p>
            <div className="home-scenario-steps">
              {(playbook.steps || []).slice(0, 4).map((step, index) => {
                const pageId = step.page_id || step.page?.id || 'SystemMap';
                return (
                  <button
                    key={step.id}
                    aria-label={`场景步骤 ${playbook.title} ${index + 1}`}
                    onClick={() => onTabChange?.(pageId)}
                  >
                    <span>{index + 1}</span>
                    <strong>{step.page?.title || pageId}</strong>
                    <small>{step.action || step.done_when || '进入该步骤'}</small>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
        {featured.length === 0 && (
          <div className="home-focus-empty">暂无场景作战面</div>
        )}
      </div>
    </section>
  );
}

function FunctionalArchitectureSection({
  architecture,
  onTabChange,
  onOpenTarget,
}: {
  architecture: SiteArchitecture;
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const architectureSummaryTiles = [
    { id: 'projects', title: '项目', value: architecture.projects },
    { id: 'pages', title: '页面', value: architecture.pages },
    { id: 'domains', title: '能力域', value: architecture.domains },
    { id: 'usage-paths', title: '使用路径', value: architecture.usagePaths },
    { id: 'playbooks', title: '操作清单', value: architecture.playbooks },
    { id: 'roadmap', title: '路线图', value: architecture.roadmapItems },
  ];

  const coverageSummaryTiles = [
    { id: 'project-coverage', title: '项目覆盖', value: `${architecture.projectCoverageScore}%` },
    { id: 'page-maturity', title: '页面成熟度', value: `${architecture.pageMaturityScore}%` },
    { id: 'domain-apps', title: '领域挂载', value: `${architecture.domainAppScore}%` },
    { id: 'projects-needing-action', title: '待动作项目', value: architecture.projectsNeedingAction },
  ];

  return (
    <section className="services-section home-architecture">
      <div className="section-header">
        <div>
          <h2>功能架构总览</h2>
          <p className="text-muted">
            先看 Cockpit 覆盖了哪些页面维度、能力域和路线图，再顺着场景路径进入具体工作台。
          </p>
        </div>
        <button className="antd-btn small" aria-label="打开使用路径完整地图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>完整地图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <SummaryTileGrid
        className="home-architecture-kpis"
        compact
        items={architectureSummaryTiles}
        minColumnWidth={140}
      />

      <div className="home-architecture-grid">
        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>覆盖状态</strong>
              <small>项目、页面和领域三层一起看，不会只盯一块。</small>
            </div>
            <span className={`status-badge ${architecture.projectCoverageScore >= 80 ? 'online' : 'degraded'}`}>
              {architecture.projectCoverageScore}%
            </span>
          </div>
          <SummaryTileGrid
            className="home-architecture-score-grid"
            compact
            items={coverageSummaryTiles}
            minColumnWidth={150}
          />
          <div className="home-architecture-roadmap">
            {architecture.roadmapLanes.map((lane) => (
              <button
                key={lane.id}
                className="home-architecture-roadmap-lane"
                onClick={() => onTabChange?.('SystemMap')}
                aria-label={`打开路线图分栏 ${lane.title}`}
              >
                <span>{lane.title}</span>
                <strong>{lane.count}</strong>
              </button>
            ))}
          </div>
          <div className="home-architecture-footnote">
            阻塞项目 {architecture.blockedProjects} 个，建议先从路线图和修复车道交集最大的项开始。
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>页面维度</strong>
              <small>按使用面分组，减少“我该去哪个页”的迷路成本。</small>
            </div>
            <Layers3 size={16} />
          </div>
          <div className="home-architecture-list">
            {architecture.pageGroups.map((group) => (
              <button
                key={group.group}
                className="home-architecture-item"
                onClick={() => onTabChange?.(group.pages[0]?.id || 'SystemMap')}
                aria-label={`打开页面分组 ${group.group}`}
              >
                <strong>{group.group}</strong>
                <span>{group.count} 页</span>
                <small>{group.pages.slice(0, 3).map((page) => page.title).join(' · ')}</small>
              </button>
            ))}
            {architecture.pageGroups.length === 0 && (
              <div className="home-focus-empty">暂无页面维度摘要</div>
            )}
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>能力域热点</strong>
              <small>把“功能做什么”和“该进哪个页”直接连起来。</small>
            </div>
            <button className="antd-btn small" onClick={() => onTabChange?.('SystemMap')}>
              <Map size={13} />
              <span>能力地图</span>
            </button>
          </div>
          <div className="home-architecture-list">
            {architecture.featureDomains.slice(0, 6).map((domain) => (
              <button
                key={domain.id}
                className="home-architecture-item"
                onClick={() => onTabChange?.(domain.cockpit_page || 'SystemMap')}
                aria-label={`进入能力域 ${domain.title}`}
              >
                <strong>{domain.title}</strong>
                <span>{domain.providers?.length || 0} 个提供者 · {domain.capability_items?.length || 0} 项能力</span>
                <small>{domain.cockpit_page || 'SystemMap'} · {domain.english || domain.id}</small>
              </button>
            ))}
            {architecture.featureDomains.length === 0 && (
              <div className="home-focus-empty">暂无能力域摘要</div>
            )}
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>工作带补位</strong>
              <small>首页直接看哪条工作带还在掉链子，少走一层再定位。</small>
            </div>
            <span className={`status-badge ${architecture.laneSummaries.some((lane) => lane.attentionCount > 0) ? 'degraded' : 'online'}`}>
              {architecture.laneSummaries.filter((lane) => lane.attentionCount > 0).length}
            </span>
          </div>
          <div className="home-architecture-list">
            {architecture.laneSummaries.map((lane) => (
              <article key={lane.id} className="home-architecture-item home-architecture-lane">
                <strong>{lane.title}</strong>
                <span>页面 {lane.pageCount} · 使用链 {lane.usageCount} · 能力域 {lane.domainCount} · 待处理 {lane.attentionCount}</span>
                <small>{lane.nextAction}</small>
                <div className="home-architecture-lane-actions">
                  <button
                    className="antd-btn small"
                    aria-label={`打开工作带补位 ${lane.title}`}
                    onClick={() => openCockpitNavigationTarget(lane.objectTarget, onTabChange, onOpenTarget)}
                  >
                    <ArrowRight size={13} />
                    <span>看对象</span>
                  </button>
                  <button
                    className="antd-btn small secondary"
                    aria-label={`打开工作带任务 ${lane.title}`}
                    onClick={() => openCockpitNavigationTarget(lane.taskTarget, onTabChange, onOpenTarget)}
                  >
                    <Route size={13} />
                    <span>看任务</span>
                  </button>
                </div>
              </article>
            ))}
            {architecture.laneSummaries.length === 0 && (
              <div className="home-focus-empty">暂无工作带补位摘要</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function DimensionCoverageMatrixSection({
  rows,
  onTabChange,
  onOpenTarget,
}: {
  rows: DimensionCoverageBandRow[];
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const fullBands = rows.filter((row) => row.attentionCount === 0).length;
  const attentionBands = rows.filter((row) => row.attentionCount > 0);
  const summaryItems = [
    ['工作带', rows.length],
    ['满配工作带', fullBands],
    ['待补工作带', attentionBands.length],
    ['缺路径页', rows.reduce((total, row) => total + (row.missingDimensionCounts.find((item) => item.label === '缺路径')?.count || 0), 0)],
    ['缺清单页', rows.reduce((total, row) => total + (row.missingDimensionCounts.find((item) => item.label === '缺清单')?.count || 0), 0)],
    ['缺任务页', rows.reduce((total, row) => total + (row.missingDimensionCounts.find((item) => item.label === '缺任务')?.count || 0), 0)],
  ];

  return (
    <section className="services-section home-architecture">
      <div className="section-header">
        <div>
          <h2>全站维度覆盖矩阵</h2>
          <p className="text-muted">按工作带把地图登记、使用路径、操作清单、能力域、任务承接五条线摊开，看清是哪个维度没接上，不再只盯总分。</p>
        </div>
        <button className="antd-btn small" aria-label="打开全站维度覆盖总图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>回系统地图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-architecture-kpis">
        {summaryItems.map(([label, value]) => (
          <div key={label} className="home-architecture-kpi">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="home-architecture-grid">
        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>工作带维度矩阵</strong>
              <small>每行是一条工作带，直接看这一带在五个承接维度上覆盖到什么程度。</small>
            </div>
            <span className={`status-badge ${attentionBands.length > 0 ? 'degraded' : 'online'}`}>{attentionBands.length}</span>
          </div>
          <div className="home-architecture-list">
            {rows.map((row) => (
              <article key={row.id} className="home-architecture-item home-architecture-lane">
                <strong>{row.group}</strong>
                <span>覆盖 {row.coverageScore}% · 页面 {row.pageCount} · 待补 {row.attentionCount}</span>
                <small>
                  地图 {row.registeredCount}/{row.pageCount} · 路径 {row.usageCount}/{row.pageCount} · 清单 {row.playbookCount}/{row.pageCount} · 能力域 {row.domainCount}/{row.pageCount} · 任务 {row.taskCount}/{row.pageCount}
                </small>
                <div className="home-focus-lane-chips">
                  {row.missingDimensionCounts.length > 0 ? row.missingDimensionCounts.map((item) => (
                    <em key={`${row.id}-${item.label}`}>{item.label} {item.count}</em>
                  )) : <em>已满配</em>}
                </div>
                <small>{row.nextAction}</small>
                <div className="home-architecture-lane-actions">
                  <button
                    className="antd-btn small"
                    aria-label={`打开维度矩阵对象 ${row.group}`}
                    onClick={() => openCockpitNavigationTarget(row.objectTarget, onTabChange, onOpenTarget)}
                  >
                    <ArrowRight size={13} />
                    <span>看对象</span>
                  </button>
                  <button
                    className="antd-btn small secondary"
                    aria-label={`打开维度矩阵任务 ${row.group}`}
                    onClick={() => openCockpitNavigationTarget(row.taskTarget, onTabChange, onOpenTarget)}
                  >
                    <Route size={13} />
                    <span>看任务</span>
                  </button>
                </div>
              </article>
            ))}
            {rows.length === 0 && (
              <div className="home-focus-empty">暂无维度覆盖矩阵</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function CoverageRadarSection({
  architecture,
  focus,
  onTabChange,
  onOpenTarget,
}: {
  architecture: SiteArchitecture;
  focus: OperatingFocus;
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const cards = [
    {
      id: 'runtime',
      title: '项目运行面',
      value: `${focus.readyAndRunningProjects}`,
      unit: `/${architecture.projects}`,
      detail: `待动作 ${architecture.projectsNeedingAction} · 运行缺口 ${focus.runtimeGapProjects}`,
      tone: coverageTone(architecture.projectCoverageScore, focus.runtimeGapProjects, architecture.projectsNeedingAction),
      target: { tab: 'SystemMap' },
    },
    {
      id: 'coverage',
      title: '覆盖矩阵',
      value: `${architecture.projectCoverageScore}%`,
      unit: '',
      detail: `warning ${architecture.capabilityWarnings} · failed ${architecture.capabilityFailures}`,
      tone: coverageTone(architecture.projectCoverageScore, architecture.capabilityFailures, architecture.capabilityWarnings),
      target: { tab: 'SystemMap' },
    },
    {
      id: 'pages',
      title: '页面成熟度',
      value: `${architecture.pageMaturityScore}%`,
      unit: '',
      detail: `ready ${architecture.pageReady} · watch ${architecture.pageWatch}`,
      tone: coverageTone(architecture.pageMaturityScore, 0, architecture.pageWatch),
      target: { tab: 'TaskCenter', taskQuery: '页面' },
    },
    {
      id: 'domain-apps',
      title: '领域挂载',
      value: `${architecture.domainAppScore}%`,
      unit: '',
      detail: `运行 ${architecture.domainRunning} · 外挂 ${architecture.externalMounts} · 高风险 ${architecture.highRiskDomainApps}`,
      tone: coverageTone(architecture.domainAppScore, architecture.highRiskDomainApps, architecture.externalMounts),
      target: { tab: 'DomainApps' },
    },
    {
      id: 'verification',
      title: '验证与补证',
      value: `${focus.verificationReadyProjects}`,
      unit: '项',
      detail: `验证缺口 ${focus.verificationGapProjects} · 验证草稿 ${focus.verificationDrafts}`,
      tone: actionLoadTone(focus),
      target: { tab: 'TaskCenter', taskQuery: '验证' },
    },
  ];

  const weakestLabels = focus.weakestDimensions.slice(0, 3).map((dimension) => dimension.title);
  const attentionLabels = focus.domainAttention.slice(0, 2).map((item) => item.name);

  return (
    <section className="services-section home-coverage-radar">
      <div className="section-header">
        <div>
          <h2>覆盖缺口雷达</h2>
          <p className="text-muted">把运行、验证、页面和领域挂载放进同一个视角，先看哪里薄，再决定从哪一页下手。</p>
        </div>
        <button className="antd-btn small" aria-label="打开覆盖缺口总图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>总图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-coverage-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            className={`home-coverage-card ${card.tone}`}
            aria-label={`打开覆盖视角 ${card.title}`}
            onClick={() => openCockpitNavigationTarget(card.target, onTabChange, onOpenTarget)}
          >
            <span>{card.title}</span>
            <strong>
              {card.value}
              {card.unit && <em>{card.unit}</em>}
            </strong>
            <small>{card.detail}</small>
          </button>
        ))}
      </div>

      <div className="home-coverage-queue">
        <div className="home-coverage-queue-head">
          <div>
            <strong>优先补位</strong>
            <span>先盯最薄弱维度，再顺着草稿和领域入口处理。</span>
          </div>
        </div>
        <div className="home-coverage-queue-tags">
          {weakestLabels.map((label) => (
            <button
              key={label}
              className="home-coverage-tag"
              onClick={() => onTabChange?.('SystemMap')}
              aria-label={`查看薄弱维度 ${label}`}
            >
              <span>薄弱维度</span>
              <strong>{label}</strong>
            </button>
          ))}
          {attentionLabels.map((label) => (
            <button
              key={label}
              className="home-coverage-tag"
              onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: label }, onTabChange, onOpenTarget)}
              aria-label={`查看领域关注 ${label}`}
            >
              <span>领域关注</span>
              <strong>{label}</strong>
            </button>
          ))}
          {weakestLabels.length === 0 && attentionLabels.length === 0 && (
            <div className="home-focus-empty">暂无需要优先补位的对象</div>
          )}
        </div>
        <div className="home-coverage-actions">
          <button className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: '验证' }, onTabChange, onOpenTarget)}>
            <ClipboardCheck size={14} />
            <span>查看验证补证</span>
            <ArrowRight size={13} />
          </button>
          <button className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: '缺口' }, onTabChange, onOpenTarget)}>
            <ShieldAlert size={14} />
            <span>查看能力缺口</span>
            <ArrowRight size={13} />
          </button>
          <button className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps' }, onTabChange, onOpenTarget)}>
            <Layers3 size={14} />
            <span>查看领域挂载</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}

function SiteClosureBoardSection({
  rows,
  onTabChange,
  onOpenTarget,
}: {
  rows: SiteClosureRow[];
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const attentionRows = rows.filter((row) => row.missingItems.length > 0);
  const visibleRows = attentionRows.slice(0, 6);
  const summaryItems = [
    ['待补页面', attentionRows.length],
    ['缺路径', attentionRows.filter((row) => row.missingItems.includes('路径')).length],
    ['缺能力域', attentionRows.filter((row) => row.missingItems.includes('能力域')).length],
    ['缺清单', attentionRows.filter((row) => row.missingItems.includes('操作清单')).length],
    ['缺路线图', attentionRows.filter((row) => row.missingItems.includes('路线图')).length],
    ['缺任务', attentionRows.filter((row) => row.missingItems.includes('任务')).length],
  ];

  return (
    <section className="services-section home-architecture">
      <div className="section-header">
        <div>
          <h2>全站闭环总表</h2>
          <p className="text-muted">把每个 cockpit 页面在路径、能力域、操作清单、路线图、任务五个维度上缺哪块直接摊开，先看断链，再回对象页收口。</p>
        </div>
        <button className="antd-btn small" aria-label="打开全站闭环总图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>回系统地图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-architecture-kpis">
        {summaryItems.map(([label, value]) => (
          <div key={label} className="home-architecture-kpi">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="home-architecture-grid">
        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>断链页面优先表</strong>
              <small>优先处理缺口最多的页面，别只看总分不看具体卡点。</small>
            </div>
            <span className={`status-badge ${attentionRows.length > 0 ? 'degraded' : 'online'}`}>{attentionRows.length}</span>
          </div>
          <div className="home-architecture-list">
            {visibleRows.map((row) => (
              <article key={row.id} className="home-architecture-item home-architecture-lane">
                <strong>{row.title}</strong>
                <span>{row.group} · 已接 {row.linkedItems.join('、') || '暂无'} · 待补 {row.missingItems.join('、') || '无'}</span>
                <small>{row.nextAction}</small>
                <div className="home-focus-lane-chips">
                  {row.missingItems.map((item) => (
                    <em key={`${row.id}-${item}`}>{item}</em>
                  ))}
                </div>
                <div className="home-architecture-lane-actions">
                  <button
                    className="antd-btn small"
                    aria-label={`打开全站闭环对象 ${row.pageId}`}
                    onClick={() => openCockpitNavigationTarget(row.objectTarget, onTabChange, onOpenTarget)}
                  >
                    <ArrowRight size={13} />
                    <span>看对象</span>
                  </button>
                  <button
                    className="antd-btn small secondary"
                    aria-label={`打开全站闭环任务 ${row.pageId}`}
                    onClick={() => openCockpitNavigationTarget(row.taskTarget, onTabChange, onOpenTarget)}
                  >
                    <ClipboardCheck size={13} />
                    <span>看任务</span>
                  </button>
                </div>
              </article>
            ))}
            {visibleRows.length === 0 && (
              <div className="home-focus-empty">当前所有页面都已具备闭环链路</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function NavigationCoverageSection({
  rows,
  onTabChange,
  onOpenTarget,
}: {
  rows: NavigationCoverageRow[];
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const attentionRows = rows.filter((row) => row.missingItems.length > 0);
  const visibleRows = attentionRows.slice(0, 8);
  const summaryItems = [
    ['导航页面', rows.length],
    ['地图已登记', rows.filter((row) => row.registeredInSystemMap).length],
    ['路径已挂', rows.filter((row) => row.hasUsagePath).length],
    ['清单已挂', rows.filter((row) => row.hasPlaybook).length],
    ['任务已承接', rows.filter((row) => row.hasTaskDraft).length],
    ['待补页面', attentionRows.length],
  ];

  return (
    <section className="services-section home-architecture">
      <div className="section-header">
        <div>
          <h2>导航页面覆盖总表</h2>
          <p className="text-muted">拿真实导航页做底账，对照系统地图、使用路径、操作清单和任务承接，专门抓“页面明明在，治理面却没登记全”的盲区。</p>
        </div>
        <button className="antd-btn small" aria-label="打开导航页面覆盖总图" onClick={() => onTabChange?.('Guide')}>
          <Map size={13} />
          <span>回站内导览</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-architecture-kpis">
        {summaryItems.map(([label, value]) => (
          <div key={label} className="home-architecture-kpi">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="home-architecture-grid">
        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>待补导航页面</strong>
              <small>先补没登记、没路径、没清单、没任务的页面，整个站的使用闭环才会真的完整。</small>
            </div>
            <span className={`status-badge ${attentionRows.length > 0 ? 'degraded' : 'online'}`}>{attentionRows.length}</span>
          </div>
          <div className="home-architecture-list">
            {visibleRows.map((row) => (
              <article key={row.id} className="home-architecture-item home-architecture-lane">
                <strong>{row.title}</strong>
                <span>
                  {row.group}
                  {' · '}
                  地图 {row.registeredInSystemMap ? '已登记' : '待登记'}
                  {' · '}
                  路径 {row.hasUsagePath ? '已挂' : '待挂'}
                  {' · '}
                  清单 {row.hasPlaybook ? '已挂' : '待挂'}
                  {' · '}
                  任务 {row.hasTaskDraft ? '已承接' : '待承接'}
                </span>
                <small>{row.nextAction}</small>
                <div className="home-focus-lane-chips">
                  {row.missingItems.map((item) => (
                    <em key={`${row.id}-${item}`}>{item}</em>
                  ))}
                </div>
                <div className="home-architecture-lane-actions">
                  <button
                    className="antd-btn small"
                    aria-label={`打开导航覆盖对象 ${row.pageId}`}
                    onClick={() => openCockpitNavigationTarget(row.objectTarget, onTabChange, onOpenTarget)}
                  >
                    <ArrowRight size={13} />
                    <span>进入页面</span>
                  </button>
                  <button
                    className="antd-btn small secondary"
                    aria-label={`打开导航覆盖任务 ${row.pageId}`}
                    onClick={() => openCockpitNavigationTarget(row.taskTarget, onTabChange, onOpenTarget)}
                  >
                    <ClipboardCheck size={13} />
                    <span>看任务</span>
                  </button>
                </div>
              </article>
            ))}
            {visibleRows.length === 0 && (
              <div className="home-focus-empty">当前所有导航页面都已挂上治理与使用承接</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function CrossLayerHotspotsSection({
  architecture,
  focus,
  onTabChange,
  onOpenTarget,
}: {
  architecture: SiteArchitecture;
  focus: OperatingFocus;
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const pageDrafts = focus.actionDrafts.filter((draft) => draft.sourceType === 'system_map_page_maturity').slice(0, 2);
  const weakestDimensions = focus.weakestDimensions.slice(0, 2);
  const featureDomains = architecture.featureDomains.slice(0, 2);

  return (
    <section className="services-section home-operating-focus">
      <div className="section-header">
        <div>
          <h2>跨层作战热点</h2>
          <p className="text-muted">把维度修复、能力域热点和页面补位直接收进首页，减少先回总图再选目标的来回切换。</p>
        </div>
        <button className="antd-btn small" aria-label="打开跨层作战总图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>总图</span>
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="home-focus-repair-grid">
        {weakestDimensions.map((dimension) => (
          <button
            key={dimension.id}
            className="home-focus-lane-card"
            aria-label={`打开跨层维度 ${dimension.title}`}
            onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: dimension.id }, onTabChange, onOpenTarget)}
            title={dimension.nextAction}
          >
            <span>维度修复</span>
            <strong>{dimension.title}</strong>
            <small>{dimension.score}% · 缺口 {dimension.failed} · 提醒 {dimension.warning}</small>
            <p>{dimension.nextAction}</p>
            <div className="home-focus-lane-chips">
              {dimension.attentionProjects.slice(0, 3).map((project) => (
                <em key={`${dimension.id}-${project.id}`}>{project.id}</em>
              ))}
            </div>
          </button>
        ))}
        {featureDomains.map((domain) => (
          <button
            key={domain.id}
            className="home-focus-lane-card"
            aria-label={`打开跨层能力域 ${domain.title}`}
            onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', featureDomainId: domain.id }, onTabChange, onOpenTarget)}
            title={domain.cockpit_page || domain.id}
          >
            <span>能力域</span>
            <strong>{domain.title}</strong>
            <small>{domain.coverage || 'unknown'} · 页面 {domain.cockpit_page || '未登记'}</small>
            <p>{domain.capability_items?.slice(0, 3).join(' · ') || '进入能力域剖面查看关联页面和使用路径。'}</p>
            <div className="home-focus-lane-chips">
              {(domain.providers || []).slice(0, 3).map((provider) => (
                <em key={`${domain.id}-${provider}`}>{provider}</em>
              ))}
            </div>
          </button>
        ))}
        {pageDrafts.map((draft) => (
          <button
            key={draft.id}
            className="home-focus-lane-card"
            aria-label={`打开跨层页面 ${draft.sourceId || draft.title}`}
            onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: draft.sourceId }, onTabChange, onOpenTarget)}
            title={draft.description}
          >
            <span>页面补位</span>
            <strong>{draft.sourceId || draft.title}</strong>
            <small>{draft.sourceLabel} · {draft.priority || 'pending'}</small>
            <p>{draft.description || '进入页面能力剖面继续补位。'}</p>
            <div className="home-focus-lane-chips">
              <em>{draft.id}</em>
            </div>
          </button>
        ))}
        {weakestDimensions.length === 0 && featureDomains.length === 0 && pageDrafts.length === 0 && (
          <div className="home-focus-empty">暂无跨层作战热点</div>
        )}
      </div>
    </section>
  );
}

function CapabilityGapInventorySection({
  architecture,
  focus,
  cockpitPages,
  usagePaths,
  onTabChange,
  onOpenTarget,
}: {
  architecture: SiteArchitecture;
  focus: OperatingFocus;
  cockpitPages: CockpitPageMeta[];
  usagePaths: UsagePath[];
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const pagesInUsage = new Set(
    usagePaths.flatMap((path) => (path.pages || []).map((page) => page.id).filter(Boolean) as string[]),
  );
  const featureDomainPages = new Set(
    architecture.featureDomains.map((domain) => domain.cockpit_page).filter(Boolean) as string[],
  );

  const pagesWithoutUsage = cockpitPages.filter((page) => !pagesInUsage.has(page.id)).slice(0, 4);
  const pagesWithoutFeatureDomain = cockpitPages.filter((page) => !featureDomainPages.has(page.id)).slice(0, 4);
  const pageDrafts = focus.actionDrafts.filter((draft) => draft.sourceType === 'system_map_page_maturity').slice(0, 3);
  const buildBacklog = focus.capabilityGapDrafts + focus.pageMaturityDrafts + focus.domainAppDrafts;

  return (
    <section className="services-section home-architecture">
      <div className="section-header">
        <div>
          <h2>能力缺失与待建设</h2>
          <p className="text-muted">把还没进入路径、还没挂到能力域、以及需要继续收口的领域/页面直接列出来，不让缺口藏在各处摘要里。</p>
        </div>
        <button className="antd-btn small" aria-label="打开能力缺失总图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>总图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-architecture-kpis">
        {[
          ['未入路径页面', pagesWithoutUsage.length],
          ['未挂能力域页面', pagesWithoutFeatureDomain.length],
          ['领域待收口', focus.domainAttention.length],
          ['待建设草稿', buildBacklog],
        ].map(([label, value]) => (
          <div key={label} className="home-architecture-kpi">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="home-architecture-grid">
        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>未入使用路径</strong>
              <small>这些页面还没进入任何明确的用户使用流。</small>
            </div>
            <span className={`status-badge ${pagesWithoutUsage.length > 0 ? 'degraded' : 'online'}`}>
              {pagesWithoutUsage.length}
            </span>
          </div>
          <div className="home-architecture-list">
            {pagesWithoutUsage.map((page) => (
              <button
                key={`usage-gap-${page.id}`}
                className="home-architecture-item"
                aria-label={`打开待接入路径页面 ${page.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: page.id }, onTabChange, onOpenTarget)}
              >
                <strong>{page.title}</strong>
                <span>{page.group || '未分组'}</span>
                <small>{page.purpose || '进入系统地图把页面挂到至少一条使用路径。'}</small>
              </button>
            ))}
            {pagesWithoutUsage.length === 0 && (
              <div className="home-focus-empty">当前所有页面都已进入使用路径</div>
            )}
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>未挂能力域页面</strong>
              <small>这些页面还没有明确归属到某个能力域热点。</small>
            </div>
            <span className={`status-badge ${pagesWithoutFeatureDomain.length > 0 ? 'degraded' : 'online'}`}>
              {pagesWithoutFeatureDomain.length}
            </span>
          </div>
          <div className="home-architecture-list">
            {pagesWithoutFeatureDomain.map((page) => (
              <button
                key={`feature-gap-${page.id}`}
                className="home-architecture-item"
                aria-label={`打开待挂能力域页面 ${page.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: page.id }, onTabChange, onOpenTarget)}
              >
                <strong>{page.title}</strong>
                <span>{page.group || '未分组'}</span>
                <small>{page.purpose || '进入系统地图把页面挂到正确的能力域。'}</small>
              </button>
            ))}
            {pagesWithoutFeatureDomain.length === 0 && (
              <div className="home-focus-empty">当前所有页面都已挂到能力域</div>
            )}
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>待收口领域与页面草稿</strong>
              <small>优先处理运行停摆领域和页面补位草稿，让能力真正可用。</small>
            </div>
            <span className={`status-badge ${focus.domainAttention.length > 0 || pageDrafts.length > 0 ? 'degraded' : 'online'}`}>
              {focus.domainAttention.length + pageDrafts.length}
            </span>
          </div>
          <div className="home-architecture-list">
            {focus.domainAttention.map((item) => (
              <button
                key={`domain-gap-${item.id}`}
                className="home-architecture-item"
                aria-label={`打开待收口领域 ${item.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onTabChange, onOpenTarget)}
              >
                <strong>{item.name}</strong>
                <span>{item.runtimeStatus} · {item.riskLevel} · {item.securityPosture}</span>
                <small>{item.nextAction}</small>
              </button>
            ))}
            {pageDrafts.map((draft) => (
              <button
                key={`page-gap-draft-${draft.id}`}
                className="home-architecture-item"
                aria-label={`打开待建设草稿 ${draft.title}`}
                onClick={() => openCockpitNavigationTarget(draftTarget(draft), onTabChange, onOpenTarget)}
              >
                <strong>{draft.title}</strong>
                <span>{draft.sourceLabel} · {draft.priority || 'pending'}</span>
                <small>{draft.description || '进入页面能力剖面继续补位。'}</small>
              </button>
            ))}
            {focus.domainAttention.length === 0 && pageDrafts.length === 0 && (
              <div className="home-focus-empty">当前没有待收口领域和页面草稿</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function ConstructionControlSection({
  architecture,
  focus,
  cockpitPages,
  onTabChange,
  onOpenTarget,
}: {
  architecture: SiteArchitecture;
  focus: OperatingFocus;
  cockpitPages: CockpitPageMeta[];
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const pagesInUsage = new Set(
    focus.actionDrafts
      .filter((draft) => draft.sourceType === 'system_map_page_maturity')
      .map((draft) => draft.sourceId)
      .filter(Boolean),
  );
  const featureDomainPages = new Set(
    architecture.featureDomains.map((domain) => domain.cockpit_page).filter(Boolean) as string[],
  );
  const pageCandidates = cockpitPages
    .filter((page) => !featureDomainPages.has(page.id) || pagesInUsage.has(page.id))
    .map((page) => ({
      page,
      reason: !featureDomainPages.has(page.id) ? '能力域待挂载' : '页面补位草稿',
      detail: page.purpose || '进入系统地图继续补齐页面能力。',
    }))
    .slice(0, 4);
  const verificationDrafts = focus.actionDrafts
    .filter((draft) => draft.sourceType === 'system_map_verification_ready')
    .slice(0, 3);
  const verificationDimension = focus.weakestDimensions.find((dimension) => dimension.id === 'verification')
    || focus.weakestDimensions.find((dimension) => dimension.title.includes('验证'));
  const roadmapLanes = architecture.roadmapLanes.slice(0, 3);
  const priorityProjects = focus.priorityProjects.slice(0, 3);

  return (
    <section className="services-section home-architecture">
      <div className="section-header">
        <div>
          <h2>首页建设控制台</h2>
          <p className="text-muted">把建设补位最常用的四条主线直接抬到首页，减少先读摘要再找入口的切换成本。</p>
        </div>
        <button className="antd-btn small" aria-label="打开首页建设总控" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>进入系统地图总控</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="home-architecture-kpis">
        {[
          ['页面补位', pageCandidates.length],
          ['领域合同', focus.domainAttention.length],
          ['验证补证', verificationDrafts.length + (verificationDimension ? 1 : 0)],
          ['优先项目', priorityProjects.length],
        ].map(([label, value]) => (
          <div key={label} className="home-architecture-kpi">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="home-architecture-grid">
        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>页面能力建设</strong>
              <small>优先把还没完全进入能力闭环的页面补齐。</small>
            </div>
            <span className={`status-badge ${pageCandidates.length > 0 ? 'degraded' : 'online'}`}>{pageCandidates.length}</span>
          </div>
          <div className="home-architecture-list">
            {pageCandidates.map((item) => (
              <button
                key={`home-build-page-${item.page.id}`}
                className="home-architecture-item"
                aria-label={`打开首页页面建设 ${item.page.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: item.page.id }, onTabChange, onOpenTarget)}
              >
                <strong>{item.page.title}</strong>
                <span>{item.reason}</span>
                <small>{item.detail}</small>
              </button>
            ))}
            {pageCandidates.length === 0 && (
              <div className="home-focus-empty">当前没有待补位页面</div>
            )}
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>领域挂载合同</strong>
              <small>优先处理挂载未稳、运行未起或安全门待收口的领域应用。</small>
            </div>
            <span className={`status-badge ${focus.domainAttention.length > 0 ? 'degraded' : 'online'}`}>{focus.domainAttention.length}</span>
          </div>
          <div className="home-architecture-list">
            {focus.domainAttention.map((item) => (
              <button
                key={`home-build-domain-${item.id}`}
                className="home-architecture-item"
                aria-label={`打开首页领域合同 ${item.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onTabChange, onOpenTarget)}
              >
                <strong>{item.name}</strong>
                <span>{item.runtimeStatus} · {item.riskLevel} · {item.securityPosture}</span>
                <small>{item.nextAction}</small>
              </button>
            ))}
            {focus.domainAttention.length === 0 && (
              <div className="home-focus-empty">当前没有待处理的领域挂载合同</div>
            )}
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>验证与补证</strong>
              <small>把能复现但还没留证的项目和最薄弱验证维度拉到首页。</small>
            </div>
            <span className={`status-badge ${verificationDrafts.length > 0 || verificationDimension ? 'degraded' : 'online'}`}>
              {verificationDrafts.length + (verificationDimension ? 1 : 0)}
            </span>
          </div>
          <div className="home-architecture-list">
            {verificationDrafts.map((draft) => (
              <button
                key={`home-build-verify-${draft.id}`}
                className="home-architecture-item"
                aria-label={`打开首页验证补证 ${draft.sourceId}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: draft.sourceId }, onTabChange, onOpenTarget)}
              >
                <strong>{draft.title}</strong>
                <span>{draft.sourceLabel} · {draft.priority || 'pending'}</span>
                <small>{draft.description || '进入任务中心承接验证补证。'}</small>
              </button>
            ))}
            {verificationDimension && (
              <button
                className="home-architecture-item"
                aria-label={`打开首页验证维度 ${verificationDimension.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: verificationDimension.id }, onTabChange, onOpenTarget)}
              >
                <strong>{verificationDimension.title}</strong>
                <span>{verificationDimension.score}% · 缺口 {verificationDimension.failed} · 提醒 {verificationDimension.warning}</span>
                <small>{verificationDimension.nextAction}</small>
              </button>
            )}
            {verificationDrafts.length === 0 && !verificationDimension && (
              <div className="home-focus-empty">当前没有待补证事项</div>
            )}
          </div>
        </article>

        <article className="home-architecture-panel">
          <div className="home-architecture-panel-head">
            <div>
              <strong>项目与路线图</strong>
              <small>优先项目和路线图车道一起看，避免只看问题不看建设顺序。</small>
            </div>
            <span className={`status-badge ${priorityProjects.length > 0 || roadmapLanes.length > 0 ? 'degraded' : 'online'}`}>
              {priorityProjects.length + roadmapLanes.length}
            </span>
          </div>
          <div className="home-architecture-list">
            {priorityProjects.map((project) => (
              <button
                key={`home-build-priority-${project.id}`}
                className="home-architecture-item"
                aria-label={`打开首页优先项目 ${project.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', projectId: project.id }, onTabChange, onOpenTarget)}
              >
                <strong>{project.id}</strong>
                <span>{project.layer} · {focusStatusText(project.status)} · {project.score}%</span>
                <small>{project.primary_gap}</small>
              </button>
            ))}
            {roadmapLanes.map((lane) => (
              <button
                key={`home-build-roadmap-${lane.id}`}
                className="home-architecture-item"
                aria-label={`打开首页路线图车道 ${lane.title}`}
                onClick={() => onTabChange?.('SystemMap')}
              >
                <strong>{lane.title}</strong>
                <span>路线图车道 · {lane.count} 项</span>
                <small>进入系统地图查看这一车道的建设优先顺序。</small>
              </button>
            ))}
            {priorityProjects.length === 0 && roadmapLanes.length === 0 && (
              <div className="home-focus-empty">当前没有更高优先级的项目与路线图项</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function ConstructionLoopSection({
  focus,
  cockpitPages,
  onTabChange,
  onOpenTarget,
}: {
  focus: OperatingFocus;
  cockpitPages: CockpitPageMeta[];
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const pageDraft = focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_page_maturity') || null;
  const domainAttention = focus.domainAttention[0] || null;
  const domainDraft = focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_domain_app') || null;
  const verificationDraft = focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_verification_ready') || null;
  const verificationDimension = focus.weakestDimensions.find((dimension) => dimension.id === 'verification')
    || focus.weakestDimensions.find((dimension) => dimension.title.includes('验证'));
  const priorityProject = focus.priorityProjects[0] || null;
  const projectDraft = focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_project_portfolio') || null;

  const cards = [
    pageDraft ? {
      id: 'page-loop',
      objectTitle: cockpitPageTitle(cockpitPages, pageDraft.sourceId),
      objectMeta: '页面能力补位',
      objectState: `${pageDraft.sourceLabel} · ${pageDraft.priority || 'pending'}`,
      nextAction: pageDraft.description || '回系统地图补齐页面能力与使用路径。',
      objectTarget: { tab: 'SystemMap', pageId: pageDraft.sourceId },
      taskTarget: { tab: 'TaskCenter', taskQuery: pageDraft.sourceId },
    } : null,
    domainAttention ? {
      id: 'domain-loop',
      objectTitle: domainAttention.name,
      objectMeta: '领域挂载合同',
      objectState: `${domainAttention.runtimeStatus} · ${domainAttention.riskLevel} · ${domainAttention.securityPosture}`,
      nextAction: domainDraft?.description || domainAttention.nextAction,
      objectTarget: { tab: 'DomainApps', taskQuery: domainAttention.id },
      taskTarget: { tab: 'TaskCenter', taskQuery: domainDraft?.sourceId || domainAttention.id },
    } : null,
    (verificationDraft || verificationDimension) ? {
      id: 'verification-loop',
      objectTitle: verificationDraft?.title || verificationDimension?.title || '验证补证',
      objectMeta: '验证闭环',
      objectState: `验证草稿 ${focus.verificationDrafts} · 验证缺口 ${focus.verificationGapProjects}`,
      nextAction: verificationDraft?.description || verificationDimension?.nextAction || '回任务中心补齐验证证据。',
      objectTarget: verificationDimension
        ? { tab: 'SystemMap', coverageDimensionId: verificationDimension.id }
        : { tab: 'TaskCenter', taskQuery: verificationDraft?.sourceId || '验证' },
      taskTarget: { tab: 'TaskCenter', taskQuery: verificationDraft?.sourceId || '验证' },
    } : null,
    priorityProject ? {
      id: 'project-loop',
      objectTitle: priorityProject.id,
      objectMeta: `${priorityProject.layer} · ${focusStatusText(priorityProject.status)}`,
      objectState: `${priorityProject.score}% · ${priorityProject.primary_gap}`,
      nextAction: projectDraft?.description || priorityProject.next_action,
      objectTarget: { tab: 'SystemMap', projectId: priorityProject.id },
      taskTarget: { tab: 'TaskCenter', taskQuery: projectDraft?.sourceId || priorityProject.id },
    } : null,
  ].filter(Boolean) as Array<{
    id: string;
    objectTitle: string;
    objectMeta: string;
    objectState: string;
    nextAction: string;
    objectTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  }>;

  return (
    <section className="services-section overview-ops-panel">
      <div className="section-header">
        <div>
          <h2>建设闭环承接</h2>
          <p className="text-muted">把页面、领域、验证、项目四类建设对象直接收成闭环卡片，在首页就能决定先看对象还是先接任务。</p>
        </div>
        <button className="antd-btn small" aria-label="打开建设闭环总图" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>回系统地图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="overview-mode-grid">
        {cards.map((card) => (
          <article key={card.id} className="overview-mode-card">
            <div className="overview-ops-head">
              <div>
                <strong>{card.objectTitle}</strong>
                <small className="overview-mode-role">{card.objectMeta}</small>
              </div>
              <button
                className="antd-btn small"
                aria-label={`打开首页建设对象 ${card.objectTitle}`}
                onClick={() => openCockpitNavigationTarget(card.objectTarget, onTabChange, onOpenTarget)}
              >
                <ArrowRight size={13} />
                <span>看对象</span>
              </button>
            </div>

            <div className="overview-mode-links">
              <div className="overview-mode-link">
                <span>当前状态</span>
                <strong>{card.objectState}</strong>
                <small>{card.objectMeta}</small>
              </div>
              <div className="overview-mode-link">
                <span>下一步</span>
                <strong>{card.nextAction}</strong>
              </div>
            </div>

            <div className="overview-mode-actions">
              <button
                className="antd-btn small"
                aria-label={`打开首页建设任务 ${card.objectTitle}`}
                onClick={() => openCockpitNavigationTarget(card.taskTarget, onTabChange, onOpenTarget)}
              >
                <ClipboardCheck size={13} />
                <span>看任务承接</span>
              </button>
            </div>
          </article>
        ))}
        {cards.length === 0 && (
          <div className="home-focus-empty">当前没有需要承接的建设闭环对象</div>
        )}
      </div>
    </section>
  );
}

function FocusedHomeClosureSection({
  focus,
  cockpitPages,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
  onTabChange,
  onOpenTarget,
}: {
  focus: OperatingFocus;
  cockpitPages: CockpitPageMeta[];
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const pageDraft = focusPageId
    ? focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_page_maturity' && draft.sourceId === focusPageId)
    : null;
  const projectDraft = focusProjectId
    ? focus.actionDrafts.find((draft) => draft.sourceType === 'system_map_project_portfolio' && draft.sourceId === focusProjectId)
    : null;
  const priorityProject = focusProjectId
    ? focus.priorityProjects.find((project) => project.id === focusProjectId) || null
    : null;
  const queryDraft = focusTaskQuery
    ? focus.actionDrafts.find((draft) =>
      matchesFocusQuery(draft.sourceId, focusTaskQuery)
      || matchesFocusQuery(draft.id, focusTaskQuery)
      || matchesFocusQuery(draft.title, focusTaskQuery),
    ) || null
    : null;
  const domainAttention = focusTaskQuery
    ? focus.domainAttention.find((item) =>
      matchesFocusQuery(item.id, focusTaskQuery)
      || matchesFocusQuery(item.name, focusTaskQuery),
    ) || null
    : null;

  const card = pageDraft ? {
    title: cockpitPageTitle(cockpitPages, pageDraft.sourceId),
    meta: '从系统地图回来的页面补位对象',
    state: `${pageDraft.sourceLabel} · ${pageDraft.priority || 'pending'}`,
    nextAction: pageDraft.description || '回页面能力补位继续处理。',
    objectTarget: { tab: 'SystemMap', pageId: pageDraft.sourceId } as CockpitNavigationTarget,
    taskTarget: { tab: 'TaskCenter', taskQuery: pageDraft.sourceId } as CockpitNavigationTarget,
  } : domainAttention ? {
    title: domainAttention.name,
    meta: '从系统地图回来的领域挂载对象',
    state: `${domainAttention.runtimeStatus} · ${domainAttention.riskLevel} · ${domainAttention.securityPosture}`,
    nextAction: queryDraft?.description || domainAttention.nextAction,
    objectTarget: { tab: 'DomainApps', taskQuery: domainAttention.id } as CockpitNavigationTarget,
    taskTarget: { tab: 'TaskCenter', taskQuery: queryDraft?.sourceId || domainAttention.id } as CockpitNavigationTarget,
  } : queryDraft ? {
    title: queryDraft.title,
    meta: '从系统地图回来的任务承接对象',
    state: `${queryDraft.sourceLabel} · ${queryDraft.priority || 'pending'}`,
    nextAction: queryDraft.description || '回任务中心继续承接。',
    objectTarget: draftTarget(queryDraft),
    taskTarget: { tab: 'TaskCenter', taskQuery: queryDraft.sourceId } as CockpitNavigationTarget,
  } : priorityProject ? {
    title: priorityProject.id,
    meta: '从系统地图回来的优先项目',
    state: `${priorityProject.layer} · ${focusStatusText(priorityProject.status)} · ${priorityProject.score}%`,
    nextAction: projectDraft?.description || priorityProject.next_action,
    objectTarget: { tab: 'SystemMap', projectId: priorityProject.id } as CockpitNavigationTarget,
    taskTarget: { tab: 'TaskCenter', taskQuery: projectDraft?.sourceId || priorityProject.id } as CockpitNavigationTarget,
  } : null;

  if (!card) return null;

  return (
    <section className="services-section overview-ops-panel" aria-label="当前首页承接焦点">
      <div className="section-header">
        <div>
          <h2>当前首页承接焦点</h2>
          <p className="text-muted">这是你刚才从系统地图带回来的聚焦对象，首页先替你把对象入口和任务承接都摆出来。</p>
        </div>
        <button className="antd-btn small" aria-label="回系统地图继续定位" onClick={() => onTabChange?.('SystemMap')}>
          <Map size={13} />
          <span>回系统地图</span>
          <ArrowRight size={13} />
        </button>
      </div>

      <div className="overview-mode-grid">
        <article className="overview-mode-card">
          <div className="overview-ops-head">
            <div>
              <strong>{card.title}</strong>
              <small className="overview-mode-role">{card.meta}</small>
            </div>
            <button
              className="antd-btn small"
              aria-label={`打开首页焦点对象 ${card.title}`}
              onClick={() => openCockpitNavigationTarget(card.objectTarget, onTabChange, onOpenTarget)}
            >
              <ArrowRight size={13} />
              <span>看对象</span>
            </button>
          </div>

          <div className="overview-mode-links">
            <div className="overview-mode-link">
              <span>当前状态</span>
              <strong>{card.state}</strong>
            </div>
            <div className="overview-mode-link">
              <span>下一步</span>
              <strong>{card.nextAction}</strong>
            </div>
          </div>

          <div className="overview-mode-actions">
            <button
              className="antd-btn small"
              aria-label={`打开首页焦点任务 ${card.title}`}
              onClick={() => openCockpitNavigationTarget(card.taskTarget, onTabChange, onOpenTarget)}
            >
              <ClipboardCheck size={13} />
              <span>看任务承接</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function OperatingFocusSection({
  focus,
  onTabChange,
  onOpenTarget,
}: {
  focus: OperatingFocus;
  onTabChange?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  return (
    <section className="services-section home-operating-focus">
      <div className="section-header">
        <div>
          <h2>今日操作焦点</h2>
          <p className="text-muted">组合态势、项目草稿和优先项目来自 SystemMap/TaskCenter 实时读数。</p>
        </div>
        <span className={`status-badge ${focus.status === 'healthy' ? 'online' : focus.status === 'blocked' ? 'offline' : 'degraded'}`}>
          <ShieldAlert size={13} />
          {focusStatusText(focus.status)}
        </span>
      </div>
      <div className="home-focus-grid">
        <article className="home-focus-score">
          <span>组合分</span>
          <strong>{focus.score}%</strong>
          <small>阻塞 {focus.blocked} · 风险 {focus.atRisk} · 观察 {focus.watch} · 健康 {focus.healthy}</small>
        </article>
        <article className="home-focus-score">
          <span>任务草稿</span>
          <strong>{focus.totalDrafts}</strong>
          <small>项目 {focus.projectDrafts} · 验证 {focus.verificationDrafts} · 清单 {focus.playbookDrafts} · 领域 {focus.domainAppDrafts} · 缺口 {focus.capabilityGapDrafts} · 页面 {focus.pageMaturityDrafts}</small>
        </article>
        <div className="home-focus-priority">
          {focus.priorityProjects.slice(0, 3).map((project) => (
            <button
              key={project.id}
              className="home-focus-project"
              onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', projectId: project.id }, onTabChange, onOpenTarget)}
              title={project.next_action}
            >
              <strong>{project.id}</strong>
              <span>{project.layer} · {focusStatusText(project.status)} · {project.score}%</span>
              <small>{project.primary_gap}</small>
            </button>
          ))}
          {focus.priorityProjects.length === 0 && (
            <div className="home-focus-empty">暂无项目组合优先项</div>
          )}
        </div>
        <div className="home-focus-actions">
          <button className="antd-btn" onClick={() => onTabChange?.('SystemMap')}>
            <Map size={14} />
            <span>打开系统地图</span>
            <ArrowRight size={13} />
          </button>
          <button className="antd-btn" onClick={() => onTabChange?.('TaskCenter')}>
            <ClipboardCheck size={14} />
            <span>查看任务草稿</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="home-focus-inbox" aria-label="行动收件箱">
          <div className="home-focus-inbox-head">
            <div>
              <strong>行动收件箱</strong>
              <span>TaskCenter 草稿已按项目、验证、清单、领域、缺口、页面六类汇总。</span>
            </div>
            <button className="antd-btn small" onClick={() => onTabChange?.('TaskCenter')}>
              <ClipboardCheck size={13} />
              <span>处理草稿</span>
            </button>
          </div>
          <div className="home-focus-draft-breakdown">
            {[
              ['项目', focus.projectDrafts],
              ['验证', focus.verificationDrafts],
              ['清单', focus.playbookDrafts],
              ['领域', focus.domainAppDrafts],
              ['缺口', focus.capabilityGapDrafts],
              ['页面', focus.pageMaturityDrafts],
            ].map(([label, count]) => (
              <button key={label} className="home-focus-draft-chip" onClick={() => onTabChange?.('TaskCenter')}>
                <span>{label}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
          <div className="home-focus-draft-list">
            {focus.actionDrafts.slice(0, 6).map((draft) => (
              <button
                key={draft.id}
                className="home-focus-draft-item"
                onClick={() => openCockpitNavigationTarget(draftTarget(draft), onTabChange, onOpenTarget)}
              >
                <span>{draft.sourceLabel}</span>
                <strong>{draft.title}</strong>
                <small>{draft.description || draft.sourceId || draft.priority || '待处理草稿'}</small>
              </button>
            ))}
            {focus.actionDrafts.length === 0 && (
              <div className="home-focus-empty">暂无待处理草稿</div>
            )}
          </div>
        </div>
        <div className="home-focus-repair" aria-label="首页修复车道">
          <div className="home-focus-repair-head">
            <div>
              <strong>修复车道</strong>
              <span>把最薄弱维度和需要盯的领域应用抬到首页，减少先读摘要再找入口的切换成本。</span>
            </div>
            <button className="antd-btn small" onClick={() => onTabChange?.('SystemMap')}>
              <Map size={13} />
              <span>进入修复台</span>
            </button>
          </div>
          <div className="home-focus-repair-grid">
            {focus.weakestDimensions.map((dimension) => (
              <button
                key={dimension.id}
                className="home-focus-lane-card"
                aria-label={`打开修复维度 ${dimension.title}`}
                onClick={() => onTabChange?.('SystemMap')}
                title={dimension.nextAction}
              >
                <span>维度</span>
                <strong>{dimension.title}</strong>
                <small>{dimension.score}% · 缺口 {dimension.failed} · 提醒 {dimension.warning}</small>
                <p>{dimension.nextAction}</p>
                <div className="home-focus-lane-chips">
                  {dimension.attentionProjects.slice(0, 3).map((project) => (
                    <em key={`${dimension.id}-${project.id}`}>{project.id}</em>
                  ))}
                </div>
              </button>
            ))}
            {focus.domainAttention.map((app) => (
              <button
                key={app.id}
                className="home-focus-lane-card"
                aria-label={`打开领域关注 ${app.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: app.id }, onTabChange, onOpenTarget)}
                title={app.nextAction}
              >
                <span>领域</span>
                <strong>{app.name}</strong>
                <small>{app.runtimeStatus} · {app.riskLevel} · {app.securityPosture}</small>
                <p>{app.nextAction}</p>
                <div className="home-focus-lane-chips">
                  <em>{app.id}</em>
                </div>
              </button>
            ))}
            {focus.weakestDimensions.length === 0 && focus.domainAttention.length === 0 && (
              <div className="home-focus-empty">暂无首页修复车道</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage({
  onTabChange,
  onOpenTarget,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: HomePageProps) {
  const [healthSummary, setHealthSummary] = useState<HealthSummary>(EMPTY_HEALTH_SUMMARY);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [healthScoreData, setHealthScoreData] = useState<DataPoint[]>([]);
  const [requestsData, setRequestsData] = useState<DataPoint[]>([]);
  const [errorRateData, setErrorRateData] = useState<DataPoint[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [operatingFocus, setOperatingFocus] = useState<OperatingFocus>(DEFAULT_OPERATING_FOCUS);
  const [siteArchitecture, setSiteArchitecture] = useState<SiteArchitecture>(DEFAULT_SITE_ARCHITECTURE);
  const [cockpitPages, setCockpitPages] = useState<CockpitPageMeta[]>([]);
  const [usagePaths, setUsagePaths] = useState<UsagePath[]>([]);
  const [playbooks, setPlaybooks] = useState<OperatingPlaybook[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<Array<{ cockpit_page?: string; status?: string }>>([]);
  const [readOnlyDrafts, setReadOnlyDrafts] = useState<DraftTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const siteClosureRows = useMemo(() => buildSiteClosureRows({
    cockpitPages,
    featureDomains: siteArchitecture.featureDomains,
    usagePaths,
    playbooks,
    roadmapItems,
    draftItems: readOnlyDrafts,
  }), [cockpitPages, playbooks, readOnlyDrafts, roadmapItems, siteArchitecture.featureDomains, usagePaths]);
  const navigationCoverageRows = useMemo(() => buildNavigationCoverageRows({
    cockpitPages,
    usagePaths,
    playbooks,
    draftItems: readOnlyDrafts,
  }), [cockpitPages, playbooks, readOnlyDrafts, usagePaths]);
  const dimensionCoverageRows = useMemo(() => buildDimensionCoverageRows({
    rows: navigationCoverageRows,
    featureDomains: siteArchitecture.featureDomains,
  }), [navigationCoverageRows, siteArchitecture.featureDomains]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setHomeError(null);
      try {
        // 并行获取所有数据
        const [summaryRes, alertsRes, tasksRes, metricsRes, thoughtsRes, systemMapRes, draftTasksRes] = await Promise.all([
          fetch('/api/health/summary'),
          fetch('/api/alerts?limit=3&status=active'),
          fetch('/api/tasks?limit=3&sort=updated'),
          fetch('/api/metrics/trend?range=24h'),
          fetch('/api/omos/thoughts'),
          fetch('/api/cockpit/system-map'),
          fetch(HOME_DRAFT_TASKS_URL),
        ]);

        if (summaryRes.ok) {
          const data = await summaryRes.json();
          setHealthSummary(data);
        } else {
          throw new Error('健康摘要接口不可用');
        }

        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data.items || []);
        } else {
          throw new Error('告警接口不可用');
        }

        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data.items || []);
        } else {
          throw new Error('任务接口不可用');
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setHealthScoreData(data.health_score || []);
          setRequestsData(data.requests || []);
          setErrorRateData(data.error_rate || []);
        } else {
          throw new Error('指标接口不可用');
        }

        if (thoughtsRes.ok) {
          const data = await thoughtsRes.json();
          if (data.status === 'ok') {
            setThoughts(data.thoughts || []);
          }
        } else {
          throw new Error('洞察接口不可用');
        }

        if (systemMapRes.ok) {
          const systemMap = await systemMapRes.json();
          const portfolio = systemMap.project_portfolio || {};
          const summary = portfolio.summary || {};
          const systemSummary = systemMap.summary || {};
          const cockpitPages = systemMap.cockpit_pages || [];
          const featureDomains = systemMap.feature_domains || [];
          const roadmapItems = systemMap.roadmap?.items || [];
          let draftItems: DraftTaskSummary[] = [];
          if (draftTasksRes.ok) {
            const draftData = await draftTasksRes.json();
            draftItems = draftData.items || [];
          }
          const readOnlyDraftItems = draftItems.filter((item) => item.read_only);
          setCockpitPages(cockpitPages);
          setRoadmapItems(roadmapItems);
          setReadOnlyDrafts(readOnlyDraftItems);
          setSiteArchitecture({
            projects: systemSummary.projects || 0,
            pages: systemSummary.cockpit_pages || cockpitPages.length || 0,
            domains: systemSummary.feature_domains || featureDomains.length || 0,
            usagePaths: systemMap.usage_paths?.length || 0,
            playbooks: systemMap.playbooks?.length || 0,
            roadmapItems: systemSummary.roadmap_items || systemMap.roadmap?.items?.length || 0,
            projectCoverageScore: systemSummary.project_coverage_score || 0,
            pageMaturityScore: systemSummary.page_maturity_score || 0,
            domainAppScore: systemSummary.domain_app_score || 0,
            pageReady: systemSummary.page_maturity_ready || 0,
            pageWatch: systemSummary.page_maturity_watch || 0,
            capabilityWarnings: systemMap.project_capability_coverage?.summary?.warning_cells || 0,
            capabilityFailures: systemMap.project_capability_coverage?.summary?.failed_cells || 0,
            domainRunning: systemMap.domain_apps?.summary?.running || 0,
            externalMounts: systemMap.domain_apps?.summary?.external_mounts || 0,
            highRiskDomainApps: systemMap.domain_apps?.summary?.high_risk || 0,
            blockedProjects: systemSummary.blocked_projects || summary.blocked || 0,
            projectsNeedingAction: systemSummary.projects_needing_action || 0,
            pageGroups: buildPageGroups(cockpitPages),
            featureDomains,
            roadmapLanes: (systemMap.roadmap?.lanes || []).map((lane: any) => ({
              id: lane.id,
              title: lane.title,
              count: lane.items?.length || 0,
            })),
            laneSummaries: buildArchitectureLaneSummaries({
              cockpitPages,
              featureDomains,
              usagePaths: systemMap.usage_paths || [],
              roadmapItems,
              draftItems,
              domainAttentionItems: systemMap.domain_apps?.attention_items || [],
            }),
          });
          setUsagePaths(systemMap.usage_paths || []);
          setPlaybooks(systemMap.playbooks || []);
          const countDrafts = (sourceType: string) => readOnlyDraftItems.filter((item) => item.source?.type === sourceType).length;
          const actionDrafts = readOnlyDraftItems
            .filter((item) => item.source?.type && DRAFT_SOURCE_LABELS[item.source.type])
            .sort((a, b) => draftPriorityWeight(b.priority) - draftPriorityWeight(a.priority))
            .slice(0, 8)
            .map(toFocusActionDraft);
          setOperatingFocus({
            status: summary.status || 'unknown',
            score: summary.score || 0,
            blocked: summary.blocked || 0,
            atRisk: summary.at_risk || 0,
            watch: summary.watch || 0,
            healthy: summary.healthy || 0,
            runtimeGapProjects: systemMap.project_focus?.summary?.runtime_gap || 0,
            verificationGapProjects: systemMap.project_focus?.summary?.verification_gap || 0,
            verificationReadyProjects: systemMap.project_focus?.summary?.verification_ready || 0,
            readyAndRunningProjects: systemMap.project_focus?.summary?.ready_and_running || 0,
            priorityProjects: (portfolio.priority_projects || []).slice(0, 5),
            totalDrafts: readOnlyDraftItems.length,
            projectDrafts: countDrafts('system_map_project_portfolio'),
            verificationDrafts: countDrafts('system_map_verification_ready'),
            playbookDrafts: countDrafts('system_map_playbook'),
            domainAppDrafts: countDrafts('system_map_domain_app'),
            capabilityGapDrafts: countDrafts('system_map_capability_gap'),
            pageMaturityDrafts: countDrafts('system_map_page_maturity'),
            actionDrafts,
            weakestDimensions: (portfolio.weakest_dimensions || []).slice(0, 3).map((dimension: any) => ({
              id: dimension.id,
              title: dimension.title,
              status: dimension.status,
              score: dimension.score || 0,
              failed: dimension.failed || 0,
              warning: dimension.warning || 0,
              nextAction: dimension.attention_projects?.[0]?.next_action || dimension.description || '进入系统地图查看修复台。',
              attentionProjects: dimension.attention_projects || [],
            })),
            domainAttention: (systemMap.domain_apps?.attention_items || []).slice(0, 3).map((item: any) => ({
              id: item.id,
              name: item.name || item.id,
              runtimeStatus: item.runtime_status || 'unknown',
              riskLevel: item.risk_level || 'unknown',
              securityPosture: item.security_posture || 'unknown',
              nextAction: item.next_action || '进入应用中心查看详情。',
            })),
          });
        } else {
          throw new Error('系统地图接口不可用');
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error);
        setHomeError('首页数据暂不可用，请检查 Cockpit API 服务。');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  return (
    <div className="home-page">
      {homeError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px',
            border: '1px solid rgba(255, 71, 87, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(255, 71, 87, 0.08)',
            color: 'var(--antd-error)',
          }}
        >
          <span>{homeError}</span>
          <button className="antd-btn small" aria-label="重试首页数据" onClick={() => setRefreshToken((value) => value + 1)}>
            <ArrowRight size={13} />
            <span>重试</span>
          </button>
        </div>
      )}

      {/* 系统健康总览 */}
      <HealthSummarySection
        healthScore={healthSummary.health_score}
        healthScoreChange={healthSummary.health_score_change}
        activeServices={healthSummary.active_services}
        totalServices={healthSummary.total_services}
        activeTasks={healthSummary.active_tasks}
        todayRequests={healthSummary.today_requests}
        todayRequestsChange={healthSummary.today_requests_change}
        dataQuality={healthSummary.data_quality}
        degradedReasons={healthSummary.degraded_reasons}
      />

      {/* 虚拟董事会心智探针 */}
      <ThoughtStreamSection thoughts={thoughts} />

      {/* 系统导航与快速入口 */}
      <QuickActionsSection onTabChange={onTabChange} />

      <WorkModeSection
        architecture={siteArchitecture}
        focus={operatingFocus}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      <SymptomTriageSection
        architecture={siteArchitecture}
        focus={operatingFocus}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      <ConstructionControlSection
        architecture={siteArchitecture}
        focus={operatingFocus}
        cockpitPages={cockpitPages}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      <FocusedHomeClosureSection
        focus={operatingFocus}
        cockpitPages={cockpitPages}
        focusPageId={focusPageId}
        focusProjectId={focusProjectId}
        focusTaskQuery={focusTaskQuery}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      <ConstructionLoopSection
        focus={operatingFocus}
        cockpitPages={cockpitPages}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      {/* 全站功能架构 */}
      <FunctionalArchitectureSection architecture={siteArchitecture} onTabChange={onTabChange} onOpenTarget={onOpenTarget} />

      <DimensionCoverageMatrixSection rows={dimensionCoverageRows} onTabChange={onTabChange} onOpenTarget={onOpenTarget} />

      <SiteClosureBoardSection rows={siteClosureRows} onTabChange={onTabChange} onOpenTarget={onOpenTarget} />

      <NavigationCoverageSection rows={navigationCoverageRows} onTabChange={onTabChange} onOpenTarget={onOpenTarget} />

      {/* 覆盖与缺口总览 */}
      <CoverageRadarSection
        architecture={siteArchitecture}
        focus={operatingFocus}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      <CrossLayerHotspotsSection
        architecture={siteArchitecture}
        focus={operatingFocus}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      <CapabilityGapInventorySection
        architecture={siteArchitecture}
        focus={operatingFocus}
        cockpitPages={cockpitPages}
        usagePaths={usagePaths}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      {/* 高频场景闭环 */}
      <ScenarioWorkbenchSection playbooks={playbooks} onTabChange={onTabChange} />

      {/* 场景使用路径 */}
      <UsagePathSection paths={usagePaths} onTabChange={onTabChange} />

      {/* 今日操作焦点 */}
      <OperatingFocusSection focus={operatingFocus} onTabChange={onTabChange} onOpenTarget={onOpenTarget} />

      {/* 实时告警 */}
      <AlertFeedSection
        alerts={alerts}
        limit={3}
        onViewAll={() => window.location.hash = '#alerts'}
        onConfigureRules={() => window.location.hash = '#alerts/rules'}
      />

      {/* 关键指标趋势 */}
      <MetricsTrendSection
        healthScoreData={healthScoreData}
        requestsData={requestsData}
        errorRateData={errorRateData}
      />

      {/* 最近任务 */}
      <RecentTasksSection
        tasks={tasks}
        limit={3}
        onViewAll={() => window.location.hash = '#tasks'}
      />

      {/* 核心治理与战役大盘 */}
      <GovernanceOverviewSection />
    </div>
  );
}
