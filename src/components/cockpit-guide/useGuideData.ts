import { useState, useEffect, useMemo } from 'react';
import { COCKPIT_PAGE_REGISTRY } from '../cockpitPageRegistry';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type {
  GuideMetrics,
  GuideGroup,
  GuideGroupBlueprint,
  GuidePath,
  ProblemEntryCard,
} from './types';

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
    summary: '这是把"知道什么"和"怎么执行"接起来的工作带。',
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
    summary: '这是从"发现问题"到"动手验证"的操作面。',
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

export const GUIDE_GROUPS: GuideGroup[] = GUIDE_GROUP_BLUEPRINTS.map((group) => ({
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

function buildSystemMapRegisteredPageIds(payload: Record<string, unknown>): Set<string> {
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

async function readGuideResponse<T>(
  result: PromiseSettledResult<Response>,
  label: string,
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  if (result.status === 'rejected') {
    return { ok: false, data: null, error: `${label}：${result.reason instanceof Error ? result.reason.message : '请求失败'}` };
  }
  if (!result.value.ok) {
    return { ok: false, data: null, error: `${label} HTTP ${result.value.status}` };
  }
  try {
    return { ok: true, data: await result.value.json() as T };
  } catch {
    return { ok: false, data: null, error: `${label}：响应格式无效` };
  }
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

function matchesGuideFocusQuery(value?: string | null, query?: string) {
  if (!value || !query) return false;
  const haystack = value.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!haystack || !needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}

export function useGuideData() {
  const [metrics, setMetrics] = useState<GuideMetrics>(DEFAULT_METRICS);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [guideRetryToken, setGuideRetryToken] = useState(0);
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null);
  const [draftActionNotice, setDraftActionNotice] = useState<string | null>(null);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const loadGuideMetrics = async () => {
      try {
        const [systemMapResult, tasksResult] = await Promise.allSettled([
          fetch('/api/cockpit/system-map'),
          fetch('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40'),
        ]);
        const [{ ok: systemMapOk, data: payload, error: systemMapError }, { ok: tasksOk, data: tasksPayload, error: tasksError }] = await Promise.all([
          readGuideResponse<Record<string, unknown>>(systemMapResult, '系统地图数据'),
          readGuideResponse<{ items?: unknown[] }>(tasksResult, '任务草稿数据'),
        ]);
        if (!systemMapOk || !payload) {
          if (alive) setMetricsError(systemMapError || '系统地图数据暂不可用');
          return;
        }
        if (alive) setMetricsError(tasksOk ? null : tasksError || '任务草稿数据暂不可用');
        if (!alive) return;
        const attentionItems = (payload.page_maturity?.attention_items || payload.page_maturity?.items || [])
          .filter((item: { status?: string }) => item.status !== 'ready');
        const draftItems = ((tasksPayload?.items || []) as Array<{
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
          setMetricsError(error instanceof Error ? error.message : '导览数据暂不可用');
        }
      }
    };

    void loadGuideMetrics();
    return () => {
      alive = false;
    };
  }, [guideRetryToken]);

  const staticPageCount = useMemo(() =>
    GUIDE_GROUPS.reduce((total, group) => total + group.pages.length, 0),
  []);

  const promoteFeaturedDraft = async (draft: GuideMetrics['featuredDrafts'][number]) => {
    if (pendingDraftId) return;
    setPendingDraftId(draft.id);
    setDraftActionNotice(null);
    setDraftActionError(null);
    try {
      const response = await fetch(`/api/tasks/drafts/${encodeURIComponent(draft.id)}/promote`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '任务草稿承接失败');
      setDraftActionNotice(`已承接为正式计划任务：${payload.title || draft.title}`);
      setGuideRetryToken((token) => token + 1);
    } catch (error) {
      setDraftActionError(error instanceof Error ? error.message : '任务草稿承接失败');
    } finally {
      setPendingDraftId(null);
    }
  };

  return {
    metrics,
    metricsError,
    guideRetryToken,
    pendingDraftId,
    draftActionNotice,
    draftActionError,
    setGuideRetryToken,
    promoteFeaturedDraft,
    staticPageCount,
    GUIDE_GROUPS,
    GUIDE_PATHS,
    GUIDE_PAGES_BY_ID,
  };
}
