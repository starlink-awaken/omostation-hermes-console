import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Compass, LayoutDashboard, Map as MapIcon, Route, Sparkles } from 'lucide-react';
import ActionSurfacePanel from './ActionSurfacePanel';
import { COCKPIT_WORK_MODES } from './cockpitWorkModes';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import { COCKPIT_PAGE_REGISTRY, type CockpitPageRegistryItem } from './cockpitPageRegistry';

interface CockpitGuideViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
}

type GuidePage = CockpitPageRegistryItem;

interface GuideGroup {
  id: string;
  title: string;
  description: string;
  summary: string;
  target: CockpitNavigationTarget;
  pages: GuidePage[];
}

interface GuideGroupBlueprint {
  id: string;
  title: string;
  description: string;
  summary: string;
  target: CockpitNavigationTarget;
  registryGroups: string[];
}

interface GuidePath {
  id: string;
  title: string;
  tag: string;
  description: string;
  steps: string[];
  target: CockpitNavigationTarget;
  actionLabel: string;
}

interface GuideMetrics {
  usagePaths: number;
  playbooks: number;
  featureDomains: number;
  attentionPages: number;
  projectCoverageScore: number | null;
  domainSummary: {
    total: number;
    running: number;
    highRisk: number;
    externalMounts: number;
    score: number | null;
  };
  domainAttention: Array<{
    id: string;
    name: string;
    domainName?: string;
    runtimeStatus: string;
    securityPosture: string;
    riskLevel: string;
    freshnessStatus?: string;
    nextAction: string;
    taskTitle?: string;
    taskQuery: string;
  }>;
  pageAttentionItems: Array<{
    page_id: string;
    score: number;
    status: 'watch' | 'gap' | string;
    next_action: string;
    page?: { title?: string };
  }>;
  capabilityGaps: Array<{
    id: string;
    severity: string;
    title: string;
    evidence: string;
    next: string;
  }>;
  weakestDimensions: Array<{
    id: string;
    title?: string;
    score?: number;
    failed?: number;
    warning?: number;
  }>;
  roadmapItems: Array<{
    id: string;
    priority: string;
    status: string;
    title: string;
    cockpit_page: string;
    problem?: string;
  }>;
  priorityProjects: Array<{
    id: string;
    layer?: string;
    cockpitPage?: string;
    status?: string;
    score?: number;
    primaryGap?: string;
    nextAction?: string;
  }>;
  draftSummary: {
    total: number;
    capabilityGap: number;
    pageMaturity: number;
    domainApp: number;
    projectPortfolio: number;
    playbook: number;
    verificationReady: number;
  };
  featuredDrafts: Array<{
    id: string;
    title: string;
    sourceType: string;
    sourceId: string;
    description?: string;
  }>;
  closureDrafts: Array<{
    id: string;
    title: string;
    sourceType: string;
    sourceId: string;
    description?: string;
  }>;
  usageCoverageRows: Array<{
    id: string;
    title: string;
    intent: string;
    status: string;
    score: number | null;
    stepCount: number;
    pageCount: number;
    pageIds: string[];
    linkedPages: string[];
    playbooks: string[];
    featureDomains: string[];
    roadmapTitles: string[];
    nextAction: string;
    taskQuery: string;
  }>;
  pageCoverageRows: Array<{
    id: string;
    title: string;
    groupId: string;
    groupTitle: string;
    purpose: string;
    whenToUse: string;
    status: string;
    score: number | null;
    usagePaths: string[];
    featureDomains: string[];
    playbooks: string[];
    roadmapTitles: string[];
    nextAction: string;
    taskQuery: string;
    missingUsagePath: boolean;
    missingFeatureDomain: boolean;
    missingSystemMapRegistration: boolean;
  }>;
  featureDomainRows: Array<{
    id: string;
    title: string;
    english?: string;
    cockpitPage?: string;
    status: string;
    providerCount: number;
    capabilityCount: number;
    linkedPages: string[];
    usagePaths: string[];
    capabilityItems: string[];
    nextAction: string;
    taskQuery: string;
    missingCockpitPage: boolean;
    missingCapabilityItems: boolean;
  }>;
  dimensionCoverageRows: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    score: number | null;
    ready: number;
    warning: number;
    failed: number;
    attentionProjects: Array<{
      id: string;
      status?: string;
      nextAction?: string;
    }>;
    nextAction: string;
    taskQuery: string;
  }>;
}

interface ProblemEntryCard {
  id: string;
  title: string;
  signal: string;
  detail: string;
  primaryLabel: string;
  primaryTarget: CockpitNavigationTarget;
  secondaryLabel: string;
  secondaryTarget: CockpitNavigationTarget;
}

const GUIDE_GROUP_BLUEPRINTS: GuideGroupBlueprint[] = [
  {
    id: 'entry',
    title: '入口总览',
    description: '先用导览和系统地图定路径，再从首页进入日常值守。',
    summary: '把第一次使用、导航总图、领域挂载入口放在最前面。',
    target: { tab: 'SystemMap' },
    registryGroups: ['入口'],
  },
  {
    id: 'runtime',
    title: '运行大盘',
    description: '覆盖服务健康、网格路由、拓扑关系和算力调配。',
    summary: '这是面向运行态的主工作区，适合做状态确认和问题定位。',
    target: { tab: 'Overview' },
    registryGroups: ['运行大盘'],
  },
  {
    id: 'intelligence',
    title: '智能与知识',
    description: '承接研究、知识、引擎、资产、协议和工作流编排。',
    summary: '这是把“知道什么”和“怎么执行”接起来的工作带。',
    target: { tab: 'Knowledge' },
    registryGroups: ['智能与知识'],
  },
  {
    id: 'governance',
    title: '系统治理',
    description: '覆盖战略、告警、L4 域健康、债务和可观测。',
    summary: '这是从风险、治理、质量和演进角度看 cockpit 的面。',
    target: { tab: 'C2G' },
    registryGroups: ['系统治理'],
  },
  {
    id: 'devtools',
    title: '开发工具',
    description: '给排查、执行、性能分析和隔离实验提供落点。',
    summary: '这是从“发现问题”到“动手验证”的操作面。',
    target: { tab: 'TaskCenter' },
    registryGroups: ['开发工具'],
  },
  {
    id: 'domain',
    title: '领域应用',
    description: '把家庭生活、OPC 和服务型能力作为挂载应用纳入 cockpit。',
    summary: 'Cockpit 做入口和治理，不吞掉领域自己的 SSOT 和专业 UI。',
    target: { tab: 'DomainApps' },
    registryGroups: ['领域应用', '系统配置'],
  },
];

const GUIDE_GROUPS: GuideGroup[] = GUIDE_GROUP_BLUEPRINTS.map((group) => ({
  ...group,
  pages: COCKPIT_PAGE_REGISTRY.filter((page) => group.registryGroups.includes(page.group)),
}));
const GUIDE_PAGES_BY_ID = new globalThis.Map(COCKPIT_PAGE_REGISTRY.map((page) => [page.id, page] as const));

const GUIDE_PATHS: GuidePath[] = [
  {
    id: 'first-pass',
    title: '第一次进入',
    tag: '认路',
    description: '先看导览，再看系统地图，最后回首页建立日常使用感。',
    steps: ['站内导览', '系统地图', '首页', '任务中心'],
    target: { tab: 'Guide' },
    actionLabel: '打开导览',
  },
  {
    id: 'daily-ops',
    title: '每日值守',
    tag: '日常',
    description: '从首页看健康和提醒，再进告警、任务和日志闭环。',
    steps: ['首页', '告警中心', '任务中心', '日志查看器'],
    target: { tab: 'SystemMap', usagePathId: 'daily-ops' },
    actionLabel: '打开推荐路径',
  },
  {
    id: 'governance-loop',
    title: '治理巡检',
    tag: '治理',
    description: '从战略到债务再到域健康，判断哪里该补位、哪里该下线。',
    steps: ['C2G 战略中心', '技术债务', 'L4 域健康', '系统地图'],
    target: { tab: 'C2G' },
    actionLabel: '打开治理面',
  },
  {
    id: 'domain-mount',
    title: '领域挂载',
    tag: '领域',
    description: '先从应用中心看挂载状态，再进入家庭驾驶舱、Quest 和设置。',
    steps: ['应用中心', '积分冒险', '底层设置', '任务中心'],
    target: { tab: 'DomainApps' },
    actionLabel: '打开应用中心',
  },
];

const DEFAULT_METRICS: GuideMetrics = {
  usagePaths: 0,
  playbooks: 0,
  featureDomains: 0,
  attentionPages: 0,
  projectCoverageScore: null,
  domainSummary: {
    total: 0,
    running: 0,
    highRisk: 0,
    externalMounts: 0,
    score: null,
  },
  domainAttention: [],
  pageAttentionItems: [],
  capabilityGaps: [],
  weakestDimensions: [],
  roadmapItems: [],
  priorityProjects: [],
  draftSummary: {
    total: 0,
    capabilityGap: 0,
    pageMaturity: 0,
    domainApp: 0,
    projectPortfolio: 0,
    playbook: 0,
    verificationReady: 0,
  },
  featuredDrafts: [],
  closureDrafts: [],
  usageCoverageRows: [],
  pageCoverageRows: [],
  featureDomainRows: [],
  dimensionCoverageRows: [],
};

function staticPageCount() {
  return GUIDE_GROUPS.reduce((total, group) => total + group.pages.length, 0);
}

function buildSystemMapRegisteredPageIds(payload: any): Set<string> {
  const registered = new Set<string>();

  ((payload.cockpit_pages || []) as Array<{ id?: string }>).forEach((page) => {
    if (page.id) registered.add(page.id);
  });

  ((payload.page_maturity?.items || []) as Array<{ page_id?: string }>).forEach((item) => {
    if (item.page_id) registered.add(item.page_id);
  });

  ((payload.usage_paths || []) as Array<{ pages?: Array<{ id?: string }> }>).forEach((path) => {
    (path.pages || []).forEach((page) => {
      if (page.id) registered.add(page.id);
    });
  });

  ((payload.playbooks || []) as Array<{ steps?: Array<{ page_id?: string; page?: { id?: string } }> }>).forEach((playbook) => {
    (playbook.steps || []).forEach((step) => {
      if (step.page_id) registered.add(step.page_id);
      if (step.page?.id) registered.add(step.page.id);
    });
  });

  ((payload.feature_domains || []) as Array<{ cockpit_page?: string; providers?: string[] }>).forEach((domain) => {
    if (domain.cockpit_page) registered.add(domain.cockpit_page);
    (domain.providers || []).forEach((provider) => {
      if (isGuidePageId(provider)) registered.add(provider);
    });
  });

  ((payload.roadmap?.items || []) as Array<{ cockpit_page?: string }>).forEach((item) => {
    if (item.cockpit_page) registered.add(item.cockpit_page);
  });

  ((payload.items || []) as Array<{ source?: { id?: string; type?: string } }>).forEach((item) => {
    const sourceId = item.source?.id;
    if (sourceId && isGuidePageId(sourceId)) registered.add(sourceId);
  });

  return registered;
}

function isGuidePageId(value?: string) {
  if (!value) return false;
  return GUIDE_GROUPS.some((group) => group.pages.some((page) => page.id === value));
}

function appendListValue(map: Map<string, string[]>, key: string, value: string) {
  if (!key || !value) return;
  const list = map.get(key) || [];
  if (!list.includes(value)) {
    list.push(value);
    map.set(key, list);
  }
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

function dimensionStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'warning' || status === 'watch') return 'watch';
  return 'gap';
}

function dimensionStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'warning' || status === 'watch') return '待收口';
  return '待修复';
}

function guideDraftTypeLabel(type?: string) {
  if (type === 'system_map_page_maturity') return '页面补位';
  if (type === 'system_map_capability_gap') return '能力缺口';
  if (type === 'system_map_domain_app') return '领域挂载';
  if (type === 'system_map_project_portfolio') return '项目组合';
  if (type === 'system_map_playbook') return '操作清单';
  if (type === 'system_map_verification_ready') return '验证补证';
  return '承接任务';
}

function guideProjectStatusClass(status?: string) {
  if (status === 'healthy' || status === 'ready') return 'ready';
  if (status === 'watch' || status === 'at_risk') return 'watch';
  return 'gap';
}

function guideProjectStatusText(status?: string) {
  if (status === 'healthy' || status === 'ready') return '项目稳定';
  if (status === 'watch') return '继续观察';
  if (status === 'at_risk') return '项目风险';
  if (status === 'blocked') return '项目阻塞';
  return status || '待收口';
}

function guideDraftObjectTarget(draft: { sourceType: string; sourceId: string }): CockpitNavigationTarget {
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

function executionStepTarget(step: string, fallback?: CockpitNavigationTarget): CockpitNavigationTarget {
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

function matchesGuideFocusQuery(value?: string | null, query?: string) {
  if (!value || !query) return false;
  const haystack = value.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!haystack || !needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}

export default function CockpitGuideView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: CockpitGuideViewProps) {
  const [metrics, setMetrics] = useState<GuideMetrics>(DEFAULT_METRICS);

  useEffect(() => {
    let alive = true;

    const loadGuideMetrics = async () => {
      try {
        const [systemMapResponse, tasksResponse] = await Promise.all([
          fetch('/api/cockpit/system-map'),
          fetch('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40'),
        ]);
        if (!systemMapResponse.ok) return;
        const payload = await systemMapResponse.json();
        const tasksPayload = tasksResponse.ok ? await tasksResponse.json() : { items: [] };
        if (!alive) return;
        const attentionItems = (payload.page_maturity?.attention_items || payload.page_maturity?.items || [])
          .filter((item: { status?: string }) => item.status !== 'ready');
        const draftItems = ((tasksPayload.items || []) as Array<{
          id: string;
          title: string;
          description?: string;
          read_only?: boolean;
          source?: { type?: string; id?: string };
        }>).filter((item) => item.read_only && item.source?.type);
        const dimensionSummaryItems = ((payload.project_capability_coverage?.dimension_summary || []) as Array<{
          id: string;
          title?: string;
          description?: string;
          status?: string;
          score?: number;
          ready?: number;
          warning?: number;
          failed?: number;
          attention_projects?: Array<{ id: string; status?: string; next_action?: string }>;
        }>);
        const usagePathMap = new Map<string, string[]>();
        const playbookMap = new Map<string, string[]>();
        const featureDomainMap = new Map<string, string[]>();
        const roadmapMap = new Map<string, string[]>();
        const systemMapRegisteredPageIds = buildSystemMapRegisteredPageIds(payload);
        const pageAttentionById = new Map<string, {
          page_id: string;
          score?: number;
          status?: string;
          next_action?: string;
        }>();
        const domainDraftItems = draftItems.filter((item) => item.source?.type === 'system_map_domain_app');
        const domainAttentionItems = ((payload.domain_apps?.attention_items || []) as Array<{
          id: string;
          name?: string;
          runtime_status?: string;
          risk_level?: string;
          security_posture?: string;
          freshness_status?: string;
          next_action?: string;
          domain?: { name?: string };
        }>).slice(0, 3);
        ((payload.page_maturity?.attention_items || payload.page_maturity?.items || []) as Array<{
          page_id: string;
          score?: number;
          status?: string;
          next_action?: string;
        }>).forEach((item) => {
          if (item.page_id) {
            pageAttentionById.set(item.page_id, item);
          }
        });
        ((payload.usage_paths || []) as Array<{
          title?: string;
          pages?: Array<{ id?: string }>;
        }>).forEach((path) => {
          (path.pages || []).forEach((page) => {
            if (page.id && path.title) {
              appendListValue(usagePathMap, page.id, path.title);
            }
          });
        });
        ((payload.playbooks || []) as Array<{
          title?: string;
          steps?: Array<{ page_id?: string; page?: { id?: string } }>;
        }>).forEach((playbook) => {
          (playbook.steps || []).forEach((step) => {
            const pageId = step.page_id || step.page?.id;
            if (pageId && playbook.title) {
              appendListValue(playbookMap, pageId, playbook.title);
            }
          });
        });
        ((payload.feature_domains || []) as Array<{
          title?: string;
          cockpit_page?: string;
          providers?: string[];
        }>).forEach((domain) => {
          if (domain.cockpit_page && domain.title) {
            appendListValue(featureDomainMap, domain.cockpit_page, domain.title);
          }
          (domain.providers || []).forEach((provider) => {
            if (domain.title && GUIDE_GROUPS.some((group) => group.pages.some((page) => page.id === provider || page.title === provider))) {
              appendListValue(featureDomainMap, provider, domain.title);
            }
          });
        });
        ((payload.roadmap?.items || []) as Array<{
          title?: string;
          cockpit_page?: string;
        }>).forEach((item) => {
          if (item.cockpit_page && item.title) {
            appendListValue(roadmapMap, item.cockpit_page, item.title);
          }
        });
        const draftSummary = {
          total: draftItems.length,
          capabilityGap: draftItems.filter((item) => item.source?.type === 'system_map_capability_gap').length,
          pageMaturity: draftItems.filter((item) => item.source?.type === 'system_map_page_maturity').length,
          domainApp: draftItems.filter((item) => item.source?.type === 'system_map_domain_app').length,
          projectPortfolio: draftItems.filter((item) => item.source?.type === 'system_map_project_portfolio').length,
          playbook: draftItems.filter((item) => item.source?.type === 'system_map_playbook').length,
          verificationReady: draftItems.filter((item) => item.source?.type === 'system_map_verification_ready').length,
        };
        setMetrics({
          usagePaths: (payload.usage_paths || []).length,
          playbooks: (payload.playbooks || []).length,
          featureDomains: (payload.feature_domains || []).length,
          attentionPages: attentionItems.length,
          projectCoverageScore: payload.project_portfolio?.summary?.score ?? null,
          domainSummary: {
            total: payload.domain_apps?.summary?.total ?? 0,
            running: payload.domain_apps?.summary?.running ?? 0,
            highRisk: payload.domain_apps?.summary?.high_risk ?? 0,
            externalMounts: payload.domain_apps?.summary?.external_mounts ?? 0,
            score: payload.domain_apps?.summary?.score ?? null,
          },
          domainAttention: domainAttentionItems.map((item) => {
            const linkedDraft = domainDraftItems.find((draft) =>
              draft.source?.id === item.id
              || (item.name ? draft.title?.includes(item.name) : false),
            );
            return {
              id: item.id,
              name: item.name || item.id,
              domainName: item.domain?.name,
              runtimeStatus: item.runtime_status || 'unknown',
              securityPosture: item.security_posture || 'unknown',
              riskLevel: item.risk_level || 'unknown',
              freshnessStatus: item.freshness_status || '未登记',
              nextAction: item.next_action || linkedDraft?.description || '回应用中心确认运行态、安全门和入口状态。',
              taskTitle: linkedDraft?.title,
              taskQuery: linkedDraft?.source?.id || linkedDraft?.id || item.id,
            };
          }),
          pageAttentionItems: attentionItems.slice(0, 3),
          capabilityGaps: (payload.gaps || []).slice(0, 3),
          weakestDimensions: (payload.project_portfolio?.weakest_dimensions || []).slice(0, 3),
          roadmapItems: ((payload.roadmap?.items || []) as GuideMetrics['roadmapItems'])
            .filter((item) => item.status !== 'shipped')
            .slice(0, 3),
          priorityProjects: ((payload.project_portfolio?.priority_projects || []) as Array<{
            id: string;
            layer?: string;
            cockpit_page?: string;
            status?: string;
            score?: number;
            primary_gap?: string;
            next_action?: string;
          }>).slice(0, 4).map((item) => ({
            id: item.id,
            layer: item.layer,
            cockpitPage: item.cockpit_page,
            status: item.status,
            score: item.score,
            primaryGap: item.primary_gap,
            nextAction: item.next_action,
          })),
          draftSummary,
          featuredDrafts: draftItems
            .filter((item) =>
              item.source?.type === 'system_map_capability_gap'
              || item.source?.type === 'system_map_page_maturity'
              || item.source?.type === 'system_map_domain_app'
              || item.source?.type === 'system_map_project_portfolio'
            )
            .slice(0, 4)
            .map((item) => ({
              id: item.id,
              title: item.title,
              sourceType: item.source?.type || '',
              sourceId: item.source?.id || item.id,
              description: item.description,
            })),
          closureDrafts: draftItems
            .filter((item) =>
              item.source?.type === 'system_map_verification_ready'
              || item.source?.type === 'system_map_playbook'
              || item.source?.type === 'system_map_page_maturity'
            )
            .slice(0, 4)
            .map((item) => ({
              id: item.id,
              title: item.title,
              sourceType: item.source?.type || '',
              sourceId: item.source?.id || item.id,
              description: item.description,
            })),
          usageCoverageRows: ((payload.usage_paths || []) as Array<{
            id?: string;
            title?: string;
            intent?: string;
            steps?: string[];
            pages?: Array<{ id?: string; title?: string }>;
          }>).map((path) => {
            const pageIds = (path.pages || [])
              .map((page) => page.id)
              .filter(Boolean) as string[];
            const linkedPages = (path.pages || [])
              .map((page) => page.title || page.id)
              .filter(Boolean) as string[];
            const playbooks = [...new Set(pageIds.flatMap((pageId) => playbookMap.get(pageId) || []))];
            const featureDomains = [...new Set(pageIds.flatMap((pageId) => featureDomainMap.get(pageId) || []))];
            const roadmapTitles = [...new Set(pageIds.flatMap((pageId) => roadmapMap.get(pageId) || []))];
            const linkedAttention = pageIds
              .map((pageId) => pageAttentionById.get(pageId))
              .filter(Boolean) as Array<{
              page_id: string;
              score?: number;
              status?: string;
              next_action?: string;
            }>;
            const linkedDraft = draftItems.find((item) =>
              pageIds.includes(item.source?.id || '')
              || (path.title ? item.title?.includes(path.title) : false),
            );
            const missingPlaybook = playbooks.length === 0;
            const missingFeatureDomain = featureDomains.length === 0;
            const hasAttention = linkedAttention.length > 0 || Boolean(linkedDraft);
            const status = hasAttention
              ? (missingPlaybook || missingFeatureDomain ? 'gap' : 'watch')
              : (missingPlaybook || missingFeatureDomain || pageIds.length === 0 ? 'gap' : 'ready');
            const score = Math.max(
              35,
              100
                - (linkedAttention.length * 18)
                - (linkedDraft ? 12 : 0)
                - (missingPlaybook ? 15 : 0)
                - (missingFeatureDomain ? 15 : 0)
                - (pageIds.length === 0 ? 20 : 0),
            );
            const nextAction = linkedAttention[0]?.next_action
              || linkedDraft?.description
              || (missingPlaybook
                ? '先给这条使用链补操作清单，让路径不只是导航提示。'
                : missingFeatureDomain
                  ? '给这条使用链补能力域映射，避免页面只是散点。'
                  : roadmapTitles[0]
                    ? `优先回到 ${roadmapTitles[0]} 对应入口继续收口。`
                    : '保持路径、页面和任务承接同步。');

            return {
              id: path.id || path.title || `usage-path-${linkedPages[0] || 'untitled'}`,
              title: path.title || path.id || '未命名使用链',
              intent: path.intent || '把页面入口串成一条真的可走的使用链。',
              status,
              score,
              stepCount: (path.steps || []).length,
              pageCount: pageIds.length,
              pageIds,
              linkedPages,
              playbooks,
              featureDomains,
              roadmapTitles,
              nextAction,
              taskQuery: linkedDraft?.source?.id || linkedAttention[0]?.page_id || path.id || linkedPages[0] || 'usage-path',
            };
          }),
          pageCoverageRows: GUIDE_GROUPS.flatMap((group) => (
            group.pages.map((page) => {
              const attention = pageAttentionById.get(page.id);
              const usagePaths = usagePathMap.get(page.id) || [];
              const featureDomains = featureDomainMap.get(page.id) || [];
              const playbooks = playbookMap.get(page.id) || [];
              const roadmapTitles = roadmapMap.get(page.id) || [];
              const linkedDraft = draftItems.find((item) =>
                item.source?.id === page.id
                && (
                  item.source?.type === 'system_map_page_maturity'
                  || item.source?.type === 'system_map_verification_ready'
                ),
              );
              const missingUsagePath = usagePaths.length === 0;
              const missingFeatureDomain = featureDomains.length === 0;
              const missingSystemMapRegistration = !systemMapRegisteredPageIds.has(page.id);
              const status = attention?.status
                || (missingSystemMapRegistration
                  ? 'gap'
                  : linkedDraft
                    ? 'watch'
                    : (missingUsagePath || missingFeatureDomain ? 'gap' : 'ready'));
              const score = attention?.score ?? (
                missingSystemMapRegistration
                  ? 32
                  : missingUsagePath && missingFeatureDomain
                  ? 40
                  : missingUsagePath || missingFeatureDomain
                    ? 72
                    : 100
              );
              const nextAction = missingSystemMapRegistration
                ? '先把这个页面登记进系统地图和治理视图，再补路径与承接。'
                : attention?.next_action
                || linkedDraft?.description
                || roadmapTitles[0]
                || (missingUsagePath
                  ? '先把这个页面接入至少一条使用路径。'
                  : missingFeatureDomain
                    ? '补一条能力域映射，让页面不再孤立。'
                    : '保持页面入口、路径和任务承接同步。');
              return {
                id: page.id,
                title: page.title,
                groupId: group.id,
                groupTitle: group.title,
                purpose: page.purpose,
                whenToUse: page.whenToUse,
                status,
                score,
                usagePaths,
                featureDomains,
                playbooks,
                roadmapTitles,
                nextAction,
                taskQuery: linkedDraft?.source?.id || page.id,
                missingUsagePath,
                missingFeatureDomain,
                missingSystemMapRegistration,
              };
            })
          )),
          featureDomainRows: ((payload.feature_domains || []) as Array<{
            id: string;
            title?: string;
            english?: string;
            cockpit_page?: string;
            capability_items?: string[];
            providers?: string[];
          }>).map((domain) => {
            const providerIds = (domain.providers || []).filter(Boolean);
            const linkedPages = [...new Set(
              providerIds
                .filter((provider) => isGuidePageId(provider))
                .map((provider) =>
                  GUIDE_GROUPS.flatMap((group) => group.pages).find((page) => page.id === provider)?.title || provider,
                ),
            )];
            const usagePaths = [...new Set(providerIds.flatMap((provider) => usagePathMap.get(provider) || []))];
            const capabilityItems = (domain.capability_items || []).filter(Boolean);
            const linkedDraft = draftItems.find((item) =>
              item.source?.id === domain.id
              || (domain.title ? item.title?.includes(domain.title) : false),
            );
            const missingCockpitPage = !domain.cockpit_page;
            const missingCapabilityItems = capabilityItems.length === 0;
            const status = missingCockpitPage || linkedPages.length === 0
              ? 'gap'
              : missingCapabilityItems || usagePaths.length === 0
                ? 'watch'
                : 'ready';
            return {
              id: domain.id,
              title: domain.title || domain.id,
              english: domain.english,
              cockpitPage: domain.cockpit_page,
              status,
              providerCount: providerIds.length,
              capabilityCount: capabilityItems.length,
              linkedPages,
              usagePaths,
              capabilityItems,
              nextAction: linkedDraft?.description
                || (missingCockpitPage
                  ? '先补这个能力域的主入口页面映射。'
                  : linkedPages.length === 0
                    ? '先把能力域挂回至少一个 cockpit 页面。'
                    : usagePaths.length === 0
                      ? '把这个能力域接进至少一条使用路径。'
                      : missingCapabilityItems
                        ? '补能力项定义，让这个能力域不是空壳。'
                        : '继续保持能力域、页面和任务承接同步。'),
              taskQuery: linkedDraft?.source?.id || linkedDraft?.id || domain.id,
              missingCockpitPage,
              missingCapabilityItems,
            };
          }),
          dimensionCoverageRows: dimensionSummaryItems
            .map((item) => {
              const attentionProjects = (item.attention_projects || []).map((project) => ({
                id: project.id,
                status: project.status,
                nextAction: project.next_action,
              }));
              return {
                id: item.id,
                title: item.title || item.id,
                description: item.description || '从系统地图确认这个维度在项目矩阵里的覆盖质量。',
                status: item.status || (item.failed ? 'failed' : item.warning ? 'warning' : 'ready'),
                score: item.score ?? null,
                ready: item.ready ?? 0,
                warning: item.warning ?? 0,
                failed: item.failed ?? 0,
                attentionProjects,
                nextAction: attentionProjects[0]?.nextAction
                  || (item.failed
                    ? `先回系统地图处理 ${item.failed} 个失败格子。`
                    : item.warning
                      ? `先确认 ${item.warning} 个预警格子是否已经在收口。`
                      : '保持这个维度的覆盖质量和验证证据新鲜。'),
                taskQuery: attentionProjects[0]?.id
                  || (item.id.includes('verification')
                    ? '验证'
                    : item.id.includes('runtime')
                      ? '运行'
                      : item.id),
              };
            })
            .sort((left, right) => {
              const leftRisk = (left.failed * 3) + (left.warning * 2) - left.ready;
              const rightRisk = (right.failed * 3) + (right.warning * 2) - right.ready;
              return rightRisk - leftRisk;
            }),
        });
      } catch (error) {
        if (alive) {
          setMetrics(DEFAULT_METRICS);
        }
      }
    };

    void loadGuideMetrics();
    return () => {
      alive = false;
    };
  }, []);

  const summaryCards = useMemo(() => [
    { id: 'pages', label: '页面覆盖', value: `${staticPageCount()} 页`, detail: '当前导览已把 cockpit 的核心页面按工作带重新分组。' },
    { id: 'usage', label: '使用路径', value: `${metrics.usagePaths} 条`, detail: '把“先看哪、再去哪”从页面导航提升成路径导航。' },
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
  ], [metrics.attentionPages, metrics.domainSummary.highRisk, metrics.domainSummary.running, metrics.domainSummary.total, metrics.featureDomains, metrics.projectCoverageScore, metrics.usagePaths]);

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
  ), [metrics.closureDrafts, metrics.domainAttention, metrics.featuredDrafts, metrics.pageCoverageRows, metrics.usageCoverageRows]);

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
  ), [metrics.pageCoverageRows]);

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
  ), [metrics.closureDrafts, metrics.dimensionCoverageRows, metrics.featuredDrafts, metrics.priorityProjects]);

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
        summary: '先从首页看健康和提醒，再把告警、任务和日志串起来，避免发现异常后断在半路。',
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
          ? `${firstProject.id} 当前优先缺口是“${firstProject.primaryGap || '待补说明'}”，建议先回项目对象和任务承接。`
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

  return (
    <div className="cockpit-guide-page">
      <section className="cockpit-guide-band antd-card" aria-label="Cockpit 导览总览">
        <div className="cockpit-guide-band-head">
          <div>
            <small>Guide</small>
            <h2>全站导览</h2>
            <p>把 cockpit 从“很多页面”整理成“可理解、可上手、可闭环”的工作台。</p>
          </div>
          <div className="cockpit-guide-band-badge">
            <Sparkles size={16} />
            <span>先定路径，再下钻页面</span>
          </div>
        </div>
        <div className="cockpit-guide-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.id} className="cockpit-guide-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>功能架构工作带总表</h2>
            <p className="text-muted">把入口、运行、智能、治理、开发工具和领域应用六条工作带拉平，看每一带有没有页面、使用链、能力域和补位动作。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{architectureLaneSummary.total}</strong> 条工作带</span>
          <span><strong>{architectureLaneSummary.ready}</strong> 条已接通</span>
          <span><strong>{architectureLaneSummary.attention}</strong> 条待补位</span>
          <span><strong>{architectureLaneSummary.usageConnected}</strong> 条已挂使用链</span>
          <span><strong>{architectureLaneSummary.roadmapLinked}</strong> 条已挂路线图</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {architectureLaneRows.map((row) => (
            <div key={row.id} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.signal}</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                  {pageCoverageStatusText(row.status)}
                </span>
              </div>
              <p>{row.summary}</p>
              <div className="cockpit-guide-coverage-meta">
                <span>页面 {row.pageCount} 个</span>
                <span>使用链 {row.usageCount} 条</span>
                <span>能力域 {row.domainCount} 个</span>
                <span>草稿 {row.draftCount} 条</span>
                <span>待处理 {row.attentionCount} 项</span>
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开工作带 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>看工作带</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开工作带任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看补位任务</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ActionSurfacePanel
        title="推荐起手动作"
        subtitle="你不用记住全部页面，按目标选一条路径就够了。"
        statusText={metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补位` : '导览已接通'}
        onNavigate={onNavigate}
        items={[
          {
            id: 'guide-home',
            title: '从首页开始值守',
            detail: '健康、告警、任务是最稳的日常入口。',
            actionLabel: '打开首页',
            actionType: 'navigate',
            actionValue: 'Home',
          },
          {
            id: 'guide-map',
            title: '从系统地图看缺口',
            detail: '当你觉得 cockpit 还缺功能，就去系统地图看页面、能力域和路线图。',
            actionLabel: '打开系统地图',
            actionType: 'navigate',
            actionValue: 'SystemMap',
          },
          {
            id: 'guide-domain',
            title: '从应用中心进领域',
            detail: '家庭驾驶舱、OPC、family-hub 先做挂载，不直接并入 cockpit。',
            actionLabel: '打开应用中心',
            actionType: 'navigate',
            actionValue: 'DomainApps',
          },
          {
            id: 'guide-task',
            title: '从任务中心承接动作',
            detail: '研究、治理、页面补位最后都要沉到任务中心。',
            actionLabel: '打开任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
          },
        ]}
      />

      {focusedGuideCard && (
        <section className="cockpit-guide-section" aria-label="当前导览承接焦点">
          <div className="section-header">
            <div>
              <h2>当前导览承接焦点</h2>
              <p className="text-muted">导览页先把你刚定位到的对象和任务承接摆出来，再决定往系统地图、应用中心还是任务中心继续下钻。</p>
            </div>
            <button className="antd-btn small" onClick={() => onNavigate?.('SystemMap')} aria-label="回系统地图继续定位">
              <MapIcon size={13} />
              <span>回系统地图</span>
            </button>
          </div>
          <div className="cockpit-guide-focus-grid">
            <article className="cockpit-guide-focus-card">
              <div className="cockpit-guide-focus-head">
                <strong>{focusedGuideCard.title}</strong>
                <span>{focusedGuideCard.meta}</span>
              </div>
              <div className="cockpit-guide-focus-list">
                <div className="cockpit-guide-focus-item" style={{ cursor: 'default' }}>
                  <div>
                    <strong>当前状态</strong>
                    <small>{focusedGuideCard.state}</small>
                  </div>
                  <p>{focusedGuideCard.nextAction}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开导览焦点对象 ${focusedGuideCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedGuideCard.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={13} />
                  <span>看对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开导览焦点任务 ${focusedGuideCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedGuideCard.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={13} />
                  <span>看任务承接</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>当前缺口与补位</h2>
            <p className="text-muted">把“感觉还缺很多”拆成页面、能力、项目覆盖和路线图四类动作。</p>
          </div>
        </div>
        <div className="cockpit-guide-focus-grid">
          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>页面补位</strong>
              <span>{metrics.pageAttentionItems.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.pageAttentionItems.map((item) => (
                <button
                  key={item.page_id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开页面补位 ${item.page?.title || item.page_id}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: item.page_id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{item.page?.title || item.page_id}</strong>
                    <small>{item.status} · {item.score}%</small>
                  </div>
                  <p>{item.next_action}</p>
                </button>
              ))}
              {metrics.pageAttentionItems.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有待补页面。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>能力缺口</strong>
              <span>{metrics.capabilityGaps.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.capabilityGaps.map((gap) => (
                <button
                  key={gap.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开能力缺口 ${gap.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', gapId: gap.id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{gap.title}</strong>
                    <small>{gap.severity}</small>
                  </div>
                  <p>{gap.next || gap.evidence}</p>
                </button>
              ))}
              {metrics.capabilityGaps.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有显式能力缺口。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>项目覆盖短板</strong>
              <span>{metrics.weakestDimensions.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.weakestDimensions.map((dimension) => (
                <button
                  key={dimension.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开覆盖短板 ${dimension.title || dimension.id}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: dimension.id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{dimension.title || dimension.id}</strong>
                    <small>{dimension.score ?? 0}%</small>
                  </div>
                  <p>失败 {dimension.failed ?? 0} · 预警 {dimension.warning ?? 0}</p>
                </button>
              ))}
              {metrics.weakestDimensions.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有覆盖短板数据。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>领域挂载</strong>
              <span>{metrics.domainAttention.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.domainAttention.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开领域挂载 ${item.name}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.runtimeStatus} · {item.securityPosture} · {item.riskLevel}</small>
                  </div>
                  <p>{item.nextAction}</p>
                </button>
              ))}
              {metrics.domainAttention.length === 0 && (
                <div className="cockpit-guide-focus-empty">
                  {metrics.domainSummary.total > 0 ? '当前没有待承接的领域挂载。' : '当前还没有领域挂载数据。'}
                </div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>路线图优先项</strong>
              <span>{metrics.roadmapItems.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.roadmapItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开路线图优先项 ${item.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: item.cockpit_page }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.priority} · {item.status}</small>
                  </div>
                  <p>{item.problem || `优先回到 ${item.cockpit_page} 承接实现。`}</p>
                </button>
              ))}
              {metrics.roadmapItems.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有待跟进路线图条目。</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>能力缺失登记</h2>
            <p className="text-muted">把页面、证据、领域挂载、项目状态面和未来能力统一登记成一张缺口表，直接决定回对象还是回任务。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{missingCapabilitySummary.total}</strong> 条登记</span>
          <span><strong>{missingCapabilitySummary.page}</strong> 条页面能力</span>
          <span><strong>{missingCapabilitySummary.evidence}</strong> 条证据链</span>
          <span><strong>{missingCapabilitySummary.domain}</strong> 条领域挂载</span>
          <span><strong>{missingCapabilitySummary.project + missingCapabilitySummary.roadmap}</strong> 条未来补位</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {missingCapabilityRows.map((row) => (
            <div key={row.id} className="cockpit-guide-coverage-row gap">
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.category} · {row.signal}</small>
                </div>
                <span className="cockpit-guide-coverage-status gap">待补位</span>
              </div>
              <p>{row.summary}</p>
              <div className="cockpit-guide-coverage-next">
                <strong>承接方式</strong>
                <p>先看对象承接，再回任务中心补齐缺失链路。</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开缺失能力对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>看对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开缺失能力任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看任务</span>
                </button>
              </div>
            </div>
          ))}
          {missingCapabilityRows.length === 0 && (
            <div className="cockpit-guide-focus-empty">当前没有待登记的能力缺失项。</div>
          )}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>按问题定位</h2>
            <p className="text-muted">当你只知道“这里不够用”时，先按症状进，不用猜应该去哪个页面翻。</p>
          </div>
        </div>
        <div className="cockpit-guide-focus-grid">
          {problemEntryCards.map((card) => (
            <article key={card.id} className="cockpit-guide-focus-card">
              <div className="cockpit-guide-focus-head">
                <strong>{card.title}</strong>
                <span>{card.signal}</span>
              </div>
              <div className="cockpit-guide-focus-list">
                <div className="cockpit-guide-focus-item" style={{ cursor: 'default' }}>
                  <div>
                    <strong>当前信号</strong>
                    <small>{card.signal}</small>
                  </div>
                  <p>{card.detail}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开问题入口 ${card.title}`}
                  onClick={() => openCockpitNavigationTarget(card.primaryTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>{card.primaryLabel}</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开问题任务 ${card.title}`}
                  onClick={() => openCockpitNavigationTarget(card.secondaryTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>{card.secondaryLabel}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>推荐使用路径</h2>
            <p className="text-muted">按照目标走，不要按菜单乱撞。</p>
          </div>
        </div>
        <div className="cockpit-guide-path-grid">
          {GUIDE_PATHS.map((path) => (
            <article key={path.id} className="cockpit-guide-path-card">
              <div className="cockpit-guide-path-head">
                <span>{path.tag}</span>
                <strong>{path.title}</strong>
              </div>
              <p>{path.description}</p>
              <div className="cockpit-guide-path-steps" aria-label={`${path.title} 路径步骤`}>
                {path.steps.map((step) => (
                  <span key={step}>{step}</span>
                ))}
              </div>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开推荐路径 ${path.title}`}
                onClick={() => openCockpitNavigationTarget(path.target, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>{path.actionLabel}</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>使用承接总表</h2>
            <p className="text-muted">把每条使用链实际连到的页面、清单、能力域和任务承接摆在一行里，看清哪些链条已经能用，哪些还只是概念。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{usageCoverageSummary.total}</strong> 条使用链</span>
          <span><strong>{usageCoverageSummary.ready}</strong> 条已接通</span>
          <span><strong>{usageCoverageSummary.attention}</strong> 条待补位</span>
          <span><strong>{usageCoverageSummary.missingPlaybook}</strong> 条缺清单</span>
          <span><strong>{usageCoverageSummary.missingFeatureDomain}</strong> 条缺能力域</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {metrics.usageCoverageRows.map((row) => (
            <div key={row.id} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{pageCoverageStatusText(row.status)} · {row.score ?? 0}% · 页面 {row.pageCount} · 步骤 {row.stepCount}</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                  {pageCoverageStatusText(row.status)}
                </span>
              </div>
              <p>{row.intent}</p>
              <div className="cockpit-guide-coverage-meta">
                <span>页面 {row.pageCount} 个</span>
                <span>清单 {row.playbooks.length} 条</span>
                <span>能力域 {row.featureDomains.length} 个</span>
                <span>路线图 {row.roadmapTitles.length} 条</span>
              </div>
              <div className="cockpit-guide-coverage-tags">
                {row.linkedPages.slice(0, 3).map((item) => (
                  <span key={`${row.id}-page-${item}`}>页面 · {item}</span>
                ))}
                {row.featureDomains.slice(0, 2).map((item) => (
                  <em key={`${row.id}-domain-${item}`}>能力域 · {item}</em>
                ))}
                {row.linkedPages.length === 0 && (
                  <em>当前没有挂上页面</em>
                )}
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开使用链 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', usagePathId: row.id }, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看使用链</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开使用任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', usagePathId: row.id, taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>看任务承接</span>
                </button>
              </div>
            </div>
          ))}
          {metrics.usageCoverageRows.length === 0 && (
            <div className="cockpit-guide-focus-empty">当前还没有可承接的使用链数据。</div>
          )}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>按角色进入</h2>
            <p className="text-muted">同一个 cockpit，不同人进来的第一步不该一样。</p>
          </div>
        </div>
        <div className="cockpit-guide-mode-grid">
          {COCKPIT_WORK_MODES.map((mode) => {
            const workbench = roleWorkbenchRows.find((row) => row.id === mode.id);
            return (
            <article key={mode.id} className={`cockpit-guide-mode-card ${mode.role}`}>
              <div className="cockpit-guide-mode-head">
                <span>{mode.role}</span>
                <strong>{mode.title}</strong>
              </div>
              <p>{mode.summary}</p>
              <div className="cockpit-guide-mode-focus">
                {mode.focus.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="cockpit-guide-step-chip"
                    aria-label={`打开角色步骤 ${mode.title} ${item}`}
                    onClick={() => openCockpitNavigationTarget(executionStepTarget(item, mode.entry), onNavigate, onOpenTarget)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {workbench && (
                <div className="cockpit-guide-mode-workbench">
                  <small>{workbench.signal}</small>
                  <p>{workbench.summary}</p>
                  <div className="cockpit-guide-mode-context">
                    <span>当前对象：{workbench.objectLabel}</span>
                    <span>证据入口：{workbench.evidenceLabel}</span>
                  </div>
                  <div className="cockpit-guide-mode-context-actions">
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开角色对象 ${mode.title}`}
                      onClick={() => openCockpitNavigationTarget(workbench.objectTarget, onNavigate, onOpenTarget)}
                    >
                      <ArrowRight size={14} />
                      <span>看当前对象</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开角色证据 ${mode.title}`}
                      onClick={() => openCockpitNavigationTarget(workbench.evidenceTarget, onNavigate, onOpenTarget)}
                    >
                      <Route size={14} />
                      <span>看证据入口</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="cockpit-guide-mode-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开角色模式 ${mode.title}`}
                  onClick={() => openCockpitNavigationTarget(mode.entry, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>进入主入口</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开角色任务 ${mode.title}`}
                  onClick={() => openCockpitNavigationTarget(mode.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看承接任务</span>
                </button>
              </div>
            </article>
          )})}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>补位任务承接</h2>
            <p className="text-muted">把发现的问题直接沉到任务中心，不靠手动记忆。</p>
          </div>
        </div>
        <div className="cockpit-guide-task-grid">
          <article className="cockpit-guide-task-card">
            <div className="cockpit-guide-task-head">
              <strong>草稿车道</strong>
              <span>{metrics.draftSummary.total} 条</span>
            </div>
            <div className="cockpit-guide-task-lanes">
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 页面能力"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' }, onNavigate, onOpenTarget)}
              >
                <strong>页面能力</strong>
                <small>{metrics.draftSummary.pageMaturity}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 能力缺口"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' }, onNavigate, onOpenTarget)}
              >
                <strong>能力缺口</strong>
                <small>{metrics.draftSummary.capabilityGap}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 领域应用"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_domain_app' }, onNavigate, onOpenTarget)}
              >
                <strong>领域应用</strong>
                <small>{metrics.draftSummary.domainApp}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 项目组合"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_project_portfolio' }, onNavigate, onOpenTarget)}
              >
                <strong>项目组合</strong>
                <small>{metrics.draftSummary.projectPortfolio}</small>
              </button>
            </div>
          </article>

          <article className="cockpit-guide-task-card">
            <div className="cockpit-guide-task-head">
              <strong>推荐先做</strong>
              <span>{metrics.featuredDrafts.length} 条</span>
            </div>
            <div className="cockpit-guide-task-list">
              {metrics.featuredDrafts.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  className="cockpit-guide-task-item"
                  aria-label={`打开补位任务 ${draft.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: draft.sourceId }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{draft.title}</strong>
                    <small>{draft.sourceType}</small>
                  </div>
                  <p>{draft.description || `优先在任务中心承接 ${draft.sourceId}。`}</p>
                </button>
              ))}
              {metrics.featuredDrafts.length === 0 && (
                <div className="cockpit-guide-task-empty">当前没有需要承接的补位草稿。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-task-card">
            <div className="cockpit-guide-closure-head">
              <strong>领域挂载闭环</strong>
              <span>{metrics.domainAttention.length} 项</span>
            </div>
            <div className="cockpit-guide-closure-list">
              {metrics.domainAttention.map((item) => (
                <div key={`domain-closure-${item.id}`} className="cockpit-guide-closure-item">
                  <div className="cockpit-guide-closure-copy">
                    <strong>{item.name}</strong>
                    <small>{item.domainName || '领域对象'} · {item.runtimeStatus} · {item.securityPosture} · 新鲜度 {item.freshnessStatus}</small>
                    <p>{item.taskTitle || item.nextAction}</p>
                  </div>
                  <div className="cockpit-guide-closure-actions">
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开领域对象 ${item.name}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onNavigate, onOpenTarget)}
                    >
                      <ArrowRight size={14} />
                      <span>看对象</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开领域任务 ${item.name}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: item.taskQuery }, onNavigate, onOpenTarget)}
                    >
                      <Route size={14} />
                      <span>看任务</span>
                    </button>
                  </div>
                </div>
              ))}
              {metrics.domainAttention.length === 0 && (
                <div className="cockpit-guide-closure-empty">当前没有待承接的领域挂载闭环。</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>来源页回填与补证</h2>
            <p className="text-muted">每个能力缺口最终都要回来源页补功能，或者进补证草稿把证据补齐。</p>
          </div>
        </div>
        <div className="cockpit-guide-closure-grid">
          <article className="cockpit-guide-closure-card">
            <div className="cockpit-guide-closure-head">
              <strong>回来源页补能力</strong>
              <span>{metrics.pageAttentionItems.length} 页</span>
            </div>
            <div className="cockpit-guide-closure-list">
              {metrics.pageAttentionItems.map((item) => (
                <div key={`closure-page-${item.page_id}`} className="cockpit-guide-closure-item">
                  <div className="cockpit-guide-closure-copy">
                    <strong>{item.page?.title || item.page_id}</strong>
                    <small>{item.status} · {item.score}%</small>
                    <p>{item.next_action}</p>
                  </div>
                  <div className="cockpit-guide-closure-actions">
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`回来源页 ${item.page?.title || item.page_id}`}
                      onClick={() => openCockpitNavigationTarget({ tab: item.page_id }, onNavigate, onOpenTarget)}
                    >
                      <ArrowRight size={14} />
                      <span>回来源页</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开页面补位任务 ${item.page?.title || item.page_id}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: item.page_id }, onNavigate, onOpenTarget)}
                    >
                      <Route size={14} />
                      <span>进任务</span>
                    </button>
                  </div>
                </div>
              ))}
              {metrics.pageAttentionItems.length === 0 && (
                <div className="cockpit-guide-closure-empty">当前没有待回填来源页的页面。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-closure-card">
            <div className="cockpit-guide-closure-head">
              <strong>补证入口</strong>
              <span>{metrics.draftSummary.verificationReady + metrics.draftSummary.playbook} 条</span>
            </div>
            <div className="cockpit-guide-closure-lanes">
              <button
                type="button"
                className="cockpit-guide-closure-lane"
                aria-label="打开补证车道 验证补证"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_verification_ready' }, onNavigate, onOpenTarget)}
              >
                <strong>验证补证</strong>
                <small>{metrics.draftSummary.verificationReady}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-closure-lane"
                aria-label="打开补证车道 操作清单"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_playbook' }, onNavigate, onOpenTarget)}
              >
                <strong>操作清单</strong>
                <small>{metrics.draftSummary.playbook}</small>
              </button>
            </div>
            <div className="cockpit-guide-closure-list">
              {metrics.closureDrafts.map((draft) => (
                <button
                  key={`closure-draft-${draft.id}`}
                  type="button"
                  className="cockpit-guide-closure-draft"
                  aria-label={`打开补证任务 ${draft.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: draft.sourceId }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{draft.title}</strong>
                    <small>{draft.sourceType}</small>
                  </div>
                  <p>{draft.description || `继续补齐 ${draft.sourceId} 的证据和步骤。`}</p>
                </button>
              ))}
              {metrics.closureDrafts.length === 0 && (
                <div className="cockpit-guide-closure-empty">当前没有需要补证的草稿。</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>全站覆盖总表</h2>
            <p className="text-muted">按页面看职责、进入时机、路径挂载、能力域挂载和补位动作，避免“知道有页面但不知道怎么用”。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{coverageSummary.total}</strong> 页总览</span>
          <span><strong>{coverageSummary.ready}</strong> 已接通</span>
          <span><strong>{coverageSummary.watch}</strong> 待收口</span>
          <span><strong>{coverageSummary.gap}</strong> 待补位</span>
          <span><strong>{coverageSummary.withSystemMap}</strong> 已登记总图</span>
          <span><strong>{coverageSummary.withUsagePath}</strong> 已入路径</span>
          <span><strong>{coverageSummary.withFeatureDomain}</strong> 已挂能力域</span>
        </div>
        <div className="cockpit-guide-coverage-groups">
          {coverageGroups.map((group) => (
            <article key={`coverage-${group.id}`} className="cockpit-guide-coverage-group">
              <div className="cockpit-guide-coverage-group-head">
                <div>
                  <strong>{group.title}</strong>
                  <small>{group.rows.length} 页 · {group.description}</small>
                </div>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开覆盖分组 ${group.title}`}
                  onClick={() => openCockpitNavigationTarget(group.target, onNavigate, onOpenTarget)}
                >
                  <Compass size={14} />
                  <span>打开工作带</span>
                </button>
              </div>
              <div className="cockpit-guide-coverage-list">
                {group.rows.map((row) => (
                  <div key={`coverage-row-${row.id}`} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
                    <div className="cockpit-guide-coverage-row-head">
                      <div>
                        <strong>{row.title}</strong>
                        <small>{row.id} · {pageCoverageStatusText(row.status)} · {row.score ?? 0}%</small>
                      </div>
                      <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                        {pageCoverageStatusText(row.status)}
                      </span>
                    </div>
                    <p>{row.purpose}</p>
                    <div className="cockpit-guide-coverage-meta">
                      <span>何时进入：{row.whenToUse}</span>
                      <span>{row.missingSystemMapRegistration ? '总图待登记' : '总图已登记'}</span>
                      <span>{row.missingUsagePath ? '未入使用路径' : `路径 ${row.usagePaths.length} 条`}</span>
                      <span>{row.missingFeatureDomain ? '未挂能力域' : `能力域 ${row.featureDomains.length} 个`}</span>
                      <span>{row.playbooks.length > 0 ? `清单 ${row.playbooks.length} 条` : '暂无清单承接'}</span>
                    </div>
                    <div className="cockpit-guide-coverage-tags">
                      {row.usagePaths.slice(0, 2).map((item) => (
                        <span key={`${row.id}-usage-${item}`}>路径 · {item}</span>
                      ))}
                      {row.featureDomains.slice(0, 2).map((item) => (
                        <span key={`${row.id}-domain-${item}`}>能力域 · {item}</span>
                      ))}
                      {row.playbooks.slice(0, 1).map((item) => (
                        <span key={`${row.id}-playbook-${item}`}>清单 · {item}</span>
                      ))}
                      {row.roadmapTitles.slice(0, 1).map((item) => (
                        <span key={`${row.id}-roadmap-${item}`}>路线图 · {item}</span>
                      ))}
                      {row.missingSystemMapRegistration && <em>待登记总图</em>}
                      {row.missingUsagePath && <em>待补路径</em>}
                      {row.missingFeatureDomain && <em>待挂能力域</em>}
                    </div>
                    <div className="cockpit-guide-coverage-next">
                      <strong>下一步</strong>
                      <p>{row.nextAction}</p>
                    </div>
                    <div className="cockpit-guide-coverage-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开全站覆盖页面 ${row.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: row.id }, onNavigate, onOpenTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>打开页面</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn secondary"
                        aria-label={`查看全站覆盖 ${row.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: row.id }, onNavigate, onOpenTarget)}
                      >
                        <MapIcon size={14} />
                        <span>看系统覆盖</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn secondary"
                        aria-label={`打开全站覆盖任务 ${row.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
                      >
                        <Route size={14} />
                        <span>看任务承接</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>能力域能力总表</h2>
            <p className="text-muted">按能力域看主入口、provider 页面、能力项、使用路径和任务承接，直接回答“这个能力到底够不够用、挂没挂对”。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{featureDomainCoverageSummary.total}</strong> 个能力域</span>
          <span><strong>{featureDomainCoverageSummary.ready}</strong> 已接通</span>
          <span><strong>{featureDomainCoverageSummary.watch}</strong> 待收口</span>
          <span><strong>{featureDomainCoverageSummary.gap}</strong> 待补位</span>
          <span><strong>{featureDomainCoverageSummary.withUsagePath}</strong> 已入路径</span>
          <span><strong>{featureDomainCoverageSummary.withCapabilityItems}</strong> 已定义能力项</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {metrics.featureDomainRows.map((row) => (
            <div key={`feature-domain-row-${row.id}`} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.id} · {pageCoverageStatusText(row.status)} · 主入口 {row.cockpitPage || '未登记'}</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                  {pageCoverageStatusText(row.status)}
                </span>
              </div>
              <p>{row.english || '进入系统地图查看该能力域的页面、能力项和 provider 映射。'}</p>
              <div className="cockpit-guide-coverage-meta">
                <span>页面 {row.linkedPages.length} 个</span>
                <span>能力项 {row.capabilityCount} 个</span>
                <span>使用路径 {row.usagePaths.length} 条</span>
                <span>provider {row.providerCount} 个</span>
              </div>
              <div className="cockpit-guide-coverage-tags">
                {row.linkedPages.slice(0, 2).map((item) => (
                  <span key={`${row.id}-page-${item}`}>页面 · {item}</span>
                ))}
                {row.capabilityItems.slice(0, 2).map((item) => (
                  <span key={`${row.id}-cap-${item}`}>能力项 · {item}</span>
                ))}
                {row.usagePaths.slice(0, 1).map((item) => (
                  <span key={`${row.id}-usage-${item}`}>路径 · {item}</span>
                ))}
                {row.missingCockpitPage && <em>待挂主入口</em>}
                {row.missingCapabilityItems && <em>待补能力项</em>}
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开能力域能力 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', featureDomainId: row.id }, onNavigate, onOpenTarget)}
                >
                  <MapIcon size={14} />
                  <span>看能力域</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开能力域任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看任务承接</span>
                </button>
              </div>
            </div>
          ))}
          {metrics.featureDomainRows.length === 0 && (
            <div className="cockpit-guide-focus-empty">当前还没有能力域能力数据。</div>
          )}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>维度覆盖总表</h2>
            <p className="text-muted">把跨项目的运行、验证、入口、命令等维度直接拉平，看清哪条能力链在掉分，而不是只盯页面。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{dimensionCoverageSummary.total}</strong> 条维度</span>
          <span><strong>{dimensionCoverageSummary.ready}</strong> 已接通</span>
          <span><strong>{dimensionCoverageSummary.warning}</strong> 待收口</span>
          <span><strong>{dimensionCoverageSummary.failed}</strong> 待修复</span>
          <span><strong>{dimensionCoverageSummary.attentionProjects}</strong> 个注意项目</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {metrics.dimensionCoverageRows.map((row) => (
            <div key={`dimension-row-${row.id}`} className={`cockpit-guide-coverage-row ${dimensionStatusClass(row.status)}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.id} · {dimensionStatusText(row.status)} · {row.score ?? 0}%</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${dimensionStatusClass(row.status)}`}>
                  {dimensionStatusText(row.status)}
                </span>
              </div>
              <p>{row.description}</p>
              <div className="cockpit-guide-coverage-meta">
                <span>就绪 {row.ready} 项</span>
                <span>预警 {row.warning} 项</span>
                <span>失败 {row.failed} 项</span>
                <span>注意项目 {row.attentionProjects.length} 个</span>
              </div>
              <div className="cockpit-guide-coverage-tags">
                {row.attentionProjects.slice(0, 3).map((project) => (
                  <span key={`${row.id}-attention-${project.id}`}>项目 · {project.id}</span>
                ))}
                {row.attentionProjects.length === 0 && (
                  <em>当前没有显式注意项目</em>
                )}
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开维度覆盖 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: row.id }, onNavigate, onOpenTarget)}
                >
                  <MapIcon size={14} />
                  <span>看维度覆盖</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开维度任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看修复任务</span>
                </button>
              </div>
            </div>
          ))}
          {metrics.dimensionCoverageRows.length === 0 && (
            <div className="cockpit-guide-focus-empty">当前还没有维度覆盖数据。</div>
          )}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>项目入口总表</h2>
            <p className="text-muted">把重点项目直接翻译成 cockpit 的入口页、项目覆盖面和任务承接入口，不再让“项目该从哪进”埋在矩阵和对象卡片里。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{projectEntrySummary.total}</strong> 个重点项目</span>
          <span><strong>{projectEntrySummary.mapped}</strong> 个已映射入口页</span>
          <span><strong>{projectEntrySummary.atRisk}</strong> 个项目风险</span>
          <span><strong>{projectEntrySummary.blocked}</strong> 个项目阻塞</span>
          <span><strong>{projectEntrySummary.withDrafts}</strong> 个带承接草稿</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {projectEntryRows.map((row) => (
            <div key={`project-entry-${row.id}`} className={`cockpit-guide-coverage-row ${row.statusClass}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.layer} · 入口 {row.entryPageTitle} · {row.score}%</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${row.statusClass}`}>
                  {row.statusText}
                </span>
              </div>
              <p>{row.summary}</p>
              <div className="cockpit-guide-coverage-meta">
                <span>入口页 {row.entryPageTitle}</span>
                <span>工作带 {row.entryPageGroup}</span>
                <span>承接草稿 {row.relatedDrafts.length} 条</span>
                <span>关联维度 {row.relatedDimensions.length} 条</span>
              </div>
              <div className="cockpit-guide-coverage-tags">
                {row.relatedDimensions.map((item) => (
                  <span key={`${row.id}-dimension-${item}`}>维度 · {item}</span>
                ))}
                {row.relatedDrafts.slice(0, 2).map((draft) => (
                  <span key={`${row.id}-draft-${draft.id}`}>草稿 · {guideDraftTypeLabel(draft.sourceType)}</span>
                ))}
                {row.relatedDimensions.length === 0 && row.relatedDrafts.length === 0 && (
                  <em>当前还没有显式关联维度或草稿</em>
                )}
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开项目入口 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.entryTarget, onNavigate, onOpenTarget)}
                >
                  <Compass size={14} />
                  <span>进入口页</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开项目覆盖 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.coverageTarget, onNavigate, onOpenTarget)}
                >
                  <MapIcon size={14} />
                  <span>看项目面</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开项目任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看任务</span>
                </button>
              </div>
            </div>
          ))}
          {projectEntryRows.length === 0 && (
            <div className="cockpit-guide-focus-empty">当前还没有重点项目入口数据。</div>
          )}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>对象承接总表</h2>
            <p className="text-muted">把项目、领域对象和任务草稿放到同一层看，直接决定该回对象页还是回任务中心，不再分散在几块卡片里找。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{objectCoverageSummary.total}</strong> 个对象</span>
          <span><strong>{objectCoverageSummary.projects}</strong> 个项目</span>
          <span><strong>{objectCoverageSummary.domains}</strong> 个领域对象</span>
          <span><strong>{objectCoverageSummary.drafts}</strong> 条草稿</span>
          <span><strong>{objectCoverageSummary.ready}</strong> 个稳定对象</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {objectCoverageRows.map((row) => (
            <div key={row.id} className={`cockpit-guide-coverage-row ${row.statusClass}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.kind} · {row.meta}</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${row.statusClass}`}>
                  {row.statusText}
                </span>
              </div>
              <p>{row.summary}</p>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开对象承接 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>看对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开对象任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看任务</span>
                </button>
              </div>
            </div>
          ))}
          {objectCoverageRows.length === 0 && (
            <div className="cockpit-guide-focus-empty">当前还没有对象承接数据。</div>
          )}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>执行闭环总表</h2>
            <p className="text-muted">把发现问题、定位对象、承接任务和补证入口整理成几条真的可走的工作流，避免 cockpit 只会展示不会推进。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-list">
          {executionChainRows.map((row) => (
            <div key={row.id} className="cockpit-guide-coverage-row watch">
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.signal}</small>
                </div>
                <span className="cockpit-guide-coverage-status watch">执行链</span>
              </div>
              <p>{row.summary}</p>
              <div className="cockpit-guide-coverage-tags">
                {row.steps.map((step) => (
                  <button
                    key={`${row.id}-${step}`}
                    type="button"
                    className="cockpit-guide-step-chip"
                    aria-label={`打开执行步骤 ${row.title} ${step}`}
                    onClick={() => openCockpitNavigationTarget(executionStepTarget(step, row.primaryTarget), onNavigate, onOpenTarget)}
                  >
                    {step}
                  </button>
                ))}
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开执行主链 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.primaryTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>开主链</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开执行证据 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.secondaryTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看证据/任务</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>功能架构</h2>
            <p className="text-muted">每个工作带说明这组页面负责什么，以及什么时候该去那里。</p>
          </div>
        </div>
        <div className="cockpit-guide-architecture">
          {GUIDE_GROUPS.map((group) => (
            <section key={group.id} className="cockpit-guide-group">
              <div className="cockpit-guide-group-head">
                <div>
                  <small>{group.summary}</small>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <button
                  type="button"
                  className="antd-btn cockpit-guide-group-btn"
                  aria-label={`打开分组 ${group.title}`}
                  onClick={() => openCockpitNavigationTarget(group.target, onNavigate, onOpenTarget)}
                >
                  <Compass size={14} />
                  <span>打开主入口</span>
                </button>
              </div>
              <div className="cockpit-guide-page-grid">
                {group.pages.map((page) => (
                  <article key={page.id} className="cockpit-guide-page-card">
                    <div className="cockpit-guide-page-head">
                      <strong>{page.title}</strong>
                      <span>{page.id}</span>
                    </div>
                    <p>{page.purpose}</p>
                    <small>{page.whenToUse}</small>
                    <div className="cockpit-guide-page-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开页面 ${page.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: page.id }, onNavigate, onOpenTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>打开页面</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn secondary"
                        aria-label={`查看页面覆盖 ${page.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: page.id }, onNavigate, onOpenTarget)}
                      >
                        <MapIcon size={14} />
                        <span>看覆盖</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>使用原则</h2>
            <p className="text-muted">把 cockpit 当成入口、状态面和承接台，而不是把所有领域 UI 都塞进来。</p>
          </div>
        </div>
        <div className="cockpit-guide-principles">
          <article className="cockpit-guide-principle-card">
            <LayoutDashboard size={16} />
            <strong>先路径，后页面</strong>
            <p>优先按值守、治理、研究、领域挂载这些目标使用，而不是凭感觉跳菜单。</p>
          </article>
          <article className="cockpit-guide-principle-card">
            <MapIcon size={16} />
            <strong>先总图，后补位</strong>
            <p>当你觉得功能缺失，先去系统地图定位是页面缺口、能力域缺口还是领域应用没挂上来。</p>
          </article>
          <article className="cockpit-guide-principle-card">
            <Compass size={16} />
            <strong>入口不等于吞并</strong>
            <p>家庭驾驶舱、OPC、family-hub 保留各自 SSOT 和专业面，cockpit 只负责挂载、导航、治理和状态。</p>
          </article>
        </div>
      </section>
    </div>
  );
}
