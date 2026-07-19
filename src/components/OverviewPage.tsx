import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ClipboardCheck, Compass, Copy, ExternalLink, FileText, Layers, RefreshCw, Route, Server, ShieldAlert, Zap } from 'lucide-react';
import ActionSurfacePanel from './ActionSurfacePanel';
import RuntimeOpsWorkbench from './RuntimeOpsWorkbench';
import SystemAssuranceWorkbench from './SystemAssuranceWorkbench';
import { COCKPIT_WORK_MODES } from './cockpitWorkModes';

type OverviewNavigationTarget = {
  tab: string;
  projectId?: string | null;
  usagePathId?: string | null;
  taskQuery?: string;
  gapId?: string | null;
  coverageDimensionId?: string | null;
  pageId?: string | null;
  featureDomainId?: string | null;
};

type RegistryService = {
  name: string;
  type: string;
  port?: number | null;
  status: string;
  port_listening?: boolean;
  health?: string;
  layer?: string;
};

type RuntimeService = {
  name: string;
  status: 'online' | 'offline' | 'degraded' | string;
  cpu?: number;
  memory?: number;
  uptime?: string;
};

type PriorityProject = {
  id: string;
  layer?: string;
  status?: string;
  score?: number;
  primary_gap?: string;
  next_action?: string;
};

type ProjectAction = {
  id: string;
  label: string;
  kind: 'navigate' | 'copy_text' | 'copy_command' | string;
  value: string;
  enabled: boolean;
  risk?: string;
  executes?: boolean;
  guard?: string;
  project_id?: string;
  category?: string;
  reason?: string;
};

type ProjectItem = {
  id: string;
  cockpit_page?: string;
  role?: string;
  triage_commands?: ProjectAction[];
  actions?: ProjectAction[];
  portfolio?: {
    next_action?: string;
  };
};

type CockpitPage = {
  id: string;
  title: string;
  group: string;
  purpose?: string;
  dimensions?: string[];
};

type FeatureDomain = {
  id: string;
  title: string;
  english?: string;
  cockpit_page?: string;
  coverage?: string;
  capability_items?: string[];
  providers?: string[];
};

type UsagePath = {
  id: string;
  title: string;
  intent: string;
  steps?: string[];
  pages?: {
    id?: string;
    title?: string;
    group?: string;
    purpose?: string;
  }[];
};

type OperatingPlaybook = {
  id: string;
  title: string;
  goal: string;
  frequency?: string;
  owner?: string;
  risk?: string;
  steps?: {
    id?: string;
    page_id?: string;
    action?: string;
    done_when?: string;
    page?: {
      id?: string;
      title?: string;
      group?: string;
    };
  }[];
};

type RoadmapLane = {
  id: string;
  title: string;
  count: number;
};

type PageGroupSummary = {
  group: string;
  count: number;
  pages: CockpitPage[];
};

type DomainAttentionItem = {
  id: string;
  name?: string;
  runtime_status?: string;
  risk_level?: string;
  security_posture?: string;
  next_action?: string;
};

type SystemMapPayload = {
  project_focus?: {
    summary?: {
      needs_action?: number;
      operational_gap?: number;
      runtime_gap?: number;
      verification_gap?: number;
      verification_ready?: number;
      ready_and_running?: number;
    };
  };
  project_capability_coverage?: {
    summary?: {
      score?: number;
      warning_cells?: number;
      failed_cells?: number;
    };
  };
  domain_apps?: {
    summary?: {
      total?: number;
      running?: number;
      high_risk?: number;
      external_mounts?: number;
      score?: number;
    };
    attention_items?: DomainAttentionItem[];
  };
  page_maturity?: {
    summary?: {
      total?: number;
      ready?: number;
      watch?: number;
      gap?: number;
      score?: number;
    };
  };
  project_portfolio?: {
    summary?: {
      score?: number;
      status?: string;
      blocked?: number;
      at_risk?: number;
      healthy?: number;
      projects?: number;
    };
    priority_projects?: PriorityProject[];
    weakest_dimensions?: {
      id: string;
      title?: string;
      score?: number;
      failed?: number;
      warning?: number;
      attention_projects?: { id: string; next_action?: string }[];
    }[];
  };
  projects?: ProjectItem[];
  cockpit_pages?: CockpitPage[];
  feature_domains?: FeatureDomain[];
  usage_paths?: UsagePath[];
  playbooks?: OperatingPlaybook[];
  roadmap?: {
    lanes?: RoadmapLane[];
  };
};

type DraftTask = {
  id?: string;
  title?: string;
  description?: string;
  priority?: string;
  read_only?: boolean;
  source?: {
    id?: string;
    title?: string;
    type?: string;
  };
};

type DomainAppRegistryItem = {
  id: string;
  name: string;
  description?: string;
  domain?: { id?: string; name?: string };
  runtime?: {
    status?: string;
    launch?: { status?: string; url?: string | null };
    api?: { status?: string; url?: string | null };
  };
  security_summary?: { posture?: string };
  auth?: { type?: string };
  freshness?: { status?: string | null };
  commands?: { start?: string | null; verify?: string | string[] };
};

type AlertPayload = {
  items?: {
    id: string;
    level: string;
    source: string;
    message: string;
    status: string;
  }[];
};

type OverviewPageProps = {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: OverviewNavigationTarget) => void;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
};

type OverviewSprintRow = {
  draftId: string;
  draftTitle: string;
  pageId: string;
  pageTitle: string;
  group: string;
  purpose: string;
  priority: string;
  nextAction: string;
  pathTitle: string | null;
  playbookTitle: string | null;
  featureDomainTitle: string | null;
  objectTarget: OverviewNavigationTarget;
  taskTarget: OverviewNavigationTarget;
  pathTarget: OverviewNavigationTarget | null;
  copyText: string;
};

type OverviewClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: OverviewNavigationTarget;
  taskTarget: OverviewNavigationTarget;
};

type OverviewState = {
  loading: boolean;
  registry: RegistryService[];
  registryAvailable: boolean;
  runtime: RuntimeService[];
  runtimeAvailable: boolean;
  alerts: AlertPayload['items'];
  alertsAvailable: boolean;
  systemMap: SystemMapPayload | null;
  systemMapAvailable: boolean;
  drafts: DraftTask[];
  draftsAvailable: boolean;
  domainApps: DomainAppRegistryItem[];
  domainAppsAvailable: boolean;
  error: string;
};

function normalizeStatus(value: string): 'online' | 'offline' | 'degraded' {
  if (['online', 'running', 'active', 'healthy', 'configured', 'ready'].includes(value)) return 'online';
  if (['offline', 'stopped', 'missing', 'unreachable'].includes(value)) return 'offline';
  return 'degraded';
}

function badgeClass(value: string): string {
  return normalizeStatus(value);
}

function statusText(value: string): string {
  if (['online', 'running', 'active', 'healthy', 'configured', 'ready'].includes(value)) return '在线';
  if (['offline', 'stopped', 'missing', 'unreachable'].includes(value)) return '离线';
  if (value === 'degraded') return '降级';
  if (value === 'idle') return '空闲';
  return value || '未知';
}

function summaryStatusText(value?: string): string {
  if (value === 'blocked') return '阻塞';
  if (value === 'at_risk') return '风险';
  if (value === 'healthy') return '健康';
  if (value === 'watch') return '观察';
  return '未知';
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

const OVERVIEW_DRAFT_TASKS_URL = '/api/tasks?include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40';

async function readOverviewResponse<T>(result: PromiseSettledResult<Response>, fallback: T): Promise<{ ok: boolean; data: T }> {
  if (result.status !== 'fulfilled' || !result.value.ok) return { ok: false, data: fallback };
  try {
    return { ok: true, data: await result.value.json() as T };
  } catch {
    return { ok: false, data: fallback };
  }
}

const DRAFT_SOURCE_LABELS: Record<string, string> = {
  system_map_verification_ready: '验证',
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

const PAGE_GROUP_ORDER = ['入口', '运行大盘', '智能与知识', '系统治理', '开发工具', '领域应用', '系统配置'];

function draftPriorityWeight(priority?: string): number {
  return DRAFT_PRIORITY_WEIGHT[priority || ''] || 0;
}

function draftSourceLabel(type?: string): string {
  if (!type) return '草稿';
  return DRAFT_SOURCE_LABELS[type] || '草稿';
}

function openOverviewTarget(
  target: OverviewNavigationTarget,
  onNavigate?: (tab: string) => void,
  onOpenTarget?: (target: OverviewNavigationTarget) => void,
) {
  if (onOpenTarget) {
    onOpenTarget(target);
    return;
  }
  onNavigate?.(target.tab);
}

function draftTarget(draft: DraftTask): OverviewNavigationTarget {
  if (draft.source?.type === 'system_map_domain_app') {
    return { tab: 'DomainApps', taskQuery: draft.source?.id || draft.title || draft.id };
  }
  if (draft.source?.type === 'system_map_capability_gap') {
    return { tab: 'SystemMap', gapId: draft.source?.id || draft.id || null };
  }
  if (draft.source?.type === 'system_map_page_maturity') {
    return { tab: 'SystemMap', pageId: draft.source?.id || draft.id || null };
  }
  return { tab: 'TaskCenter', taskQuery: draft.source?.id || draft.title || draft.id };
}

function coverageTone(score: number, failureCount = 0, warningCount = 0): 'online' | 'offline' | 'degraded' {
  if (failureCount > 0 || score < 70) return 'offline';
  if (warningCount > 0 || score < 85) return 'degraded';
  return 'online';
}

function buildPageGroups(pages: CockpitPage[]): PageGroupSummary[] {
  const grouped = new globalThis.Map<string, CockpitPage[]>();
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

function matchesDomainRegistryItem(app: DomainAppRegistryItem, query?: string): boolean {
  if (!query) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return [
    app.id,
    app.name,
    app.description,
    app.domain?.id,
    app.domain?.name,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle) || needle.includes(String(value).toLowerCase()));
}

function matchesFocusQuery(value?: string | null, query?: string): boolean {
  if (!value || !query) return false;
  const haystack = value.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!haystack || !needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}

function playbookTarget(playbook: OperatingPlaybook): OverviewNavigationTarget {
  const stepIds = (playbook.steps || [])
    .map((step) => step.page_id || step.page?.id)
    .filter(Boolean) as string[];
  const pageId = stepIds.find((id) => id !== 'Home' && id !== 'SystemMap') || stepIds[0];
  if (pageId) return { tab: pageId };
  return { tab: 'TaskCenter', taskQuery: playbook.id || playbook.title };
}

function FocusedOverviewClosureSection({
  cockpitPages,
  priorityProjects,
  readOnlyDrafts,
  domainAttention,
  domainApps,
  closureRows,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
  onNavigate,
  onOpenTarget,
}: {
  cockpitPages: CockpitPage[];
  priorityProjects: PriorityProject[];
  readOnlyDrafts: DraftTask[];
  domainAttention: DomainAttentionItem[];
  domainApps: DomainAppRegistryItem[];
  closureRows: OverviewClosureRow[];
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: OverviewNavigationTarget) => void;
}) {
  const pageDraft = focusPageId
    ? readOnlyDrafts.find((draft) => draft.source?.type === 'system_map_page_maturity' && draft.source?.id === focusPageId) || null
    : null;
  const pageMeta = focusPageId
    ? cockpitPages.find((page) => page.id === focusPageId) || null
    : null;
  const priorityProject = focusProjectId
    ? priorityProjects.find((project) => project.id === focusProjectId) || null
    : null;
  const projectDraft = focusProjectId
    ? readOnlyDrafts.find((draft) =>
      draft.source?.id === focusProjectId
      || matchesFocusQuery(draft.id, focusProjectId)
      || matchesFocusQuery(draft.title, focusProjectId),
    ) || null
    : null;
  const queryDraft = focusTaskQuery
    ? readOnlyDrafts.find((draft) =>
      matchesFocusQuery(draft.source?.id, focusTaskQuery)
      || matchesFocusQuery(draft.id, focusTaskQuery)
      || matchesFocusQuery(draft.title, focusTaskQuery),
    ) || null
    : null;
  const domainItem = focusTaskQuery
    ? domainAttention.find((item) =>
      matchesFocusQuery(item.id, focusTaskQuery)
      || matchesFocusQuery(item.name, focusTaskQuery),
    ) || null
    : null;
  const linkedDomainApp = domainItem
    ? domainApps.find((app) => matchesDomainRegistryItem(app, domainItem.id) || matchesDomainRegistryItem(app, domainItem.name)) || null
    : null;
  const matchedClosure = focusTaskQuery
    ? closureRows.find((row) =>
      matchesFocusQuery(row.title, focusTaskQuery)
      || matchesFocusQuery(row.summary, focusTaskQuery)
      || matchesFocusQuery(row.signal, focusTaskQuery)
      || matchesFocusQuery(row.nextAction, focusTaskQuery),
    ) || null
    : null;

  const card = (pageDraft || pageMeta || focusPageId) ? {
    title: pageMeta?.title || focusPageId || pageDraft?.source?.id || pageDraft?.title || '未命名页面',
    meta: '从系统地图带回来的页面补位对象',
    state: [pageMeta?.group, pageDraft ? `${draftSourceLabel(pageDraft.source?.type)} · ${pageDraft.priority || 'pending'}` : null]
      .filter(Boolean)
      .join(' · ') || '页面对象',
    nextAction: pageDraft?.description || pageMeta?.purpose || '回系统地图继续看页面成熟度和承接缺口。',
    objectTarget: { tab: 'SystemMap', pageId: focusPageId || pageDraft?.source?.id || null } as OverviewNavigationTarget,
    taskTarget: { tab: 'TaskCenter', taskQuery: pageDraft?.source?.id || focusPageId || pageDraft?.id || null } as OverviewNavigationTarget,
  } : domainItem ? {
    title: linkedDomainApp?.name || domainItem.name || domainItem.id,
    meta: `${linkedDomainApp?.domain?.name || '领域挂载'} · 从系统地图带回来的领域对象`,
    state: [
      `运行 ${statusText(linkedDomainApp?.runtime?.status || domainItem.runtime_status || 'unknown')}`,
      `风险 ${domainItem.risk_level || 'unknown'}`,
      `安全 ${statusText(linkedDomainApp?.security_summary?.posture || domainItem.security_posture || 'unknown')}`,
    ].join(' · '),
    nextAction: queryDraft?.description || domainItem.next_action || '回应用中心继续核对运行态、安全门和挂载状态。',
    objectTarget: { tab: 'DomainApps', taskQuery: linkedDomainApp?.id || domainItem.id } as OverviewNavigationTarget,
    taskTarget: { tab: 'TaskCenter', taskQuery: queryDraft?.source?.id || queryDraft?.id || domainItem.id } as OverviewNavigationTarget,
  } : queryDraft ? {
    title: queryDraft.title || queryDraft.id || queryDraft.source?.id || '未命名任务',
    meta: `从系统地图带回来的${draftSourceLabel(queryDraft.source?.type)}承接对象`,
    state: `${draftSourceLabel(queryDraft.source?.type)} · ${queryDraft.priority || 'pending'}`,
    nextAction: queryDraft.description || '回任务中心继续承接这条草稿。',
    objectTarget: draftTarget(queryDraft),
    taskTarget: { tab: 'TaskCenter', taskQuery: queryDraft.source?.id || queryDraft.id || queryDraft.title } as OverviewNavigationTarget,
  } : matchedClosure ? {
    title: matchedClosure.title,
    meta: '从概览闭环总表带回来的总控对象',
    state: matchedClosure.signal,
    nextAction: matchedClosure.nextAction,
    objectTarget: matchedClosure.objectTarget,
    taskTarget: matchedClosure.taskTarget,
  } : (priorityProject || focusProjectId) ? {
    title: priorityProject?.id || focusProjectId || '未命名项目',
    meta: '从系统地图带回来的优先项目',
    state: [
      priorityProject?.layer || '项目',
      summaryStatusText(priorityProject?.status),
      `${priorityProject?.score || 0}%`,
    ].join(' · '),
    nextAction: projectDraft?.description || priorityProject?.next_action || priorityProject?.primary_gap || '回系统地图继续看项目闭环。',
    objectTarget: { tab: 'SystemMap', projectId: priorityProject?.id || focusProjectId || null } as OverviewNavigationTarget,
    taskTarget: { tab: 'TaskCenter', taskQuery: projectDraft?.source?.id || projectDraft?.id || priorityProject?.id || focusProjectId || null } as OverviewNavigationTarget,
  } : null;

  if (!card) return null;

  return (
    <section className="services-section overview-ops-panel" aria-label="当前概览承接焦点">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>当前概览承接焦点</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            概览页先把你刚从系统地图带回来的对象入口和任务承接摆出来，避免总览层只停在抽象指标。
          </p>
        </div>
        <button className="antd-btn small" aria-label="回系统地图继续定位" onClick={() => openOverviewTarget(card.objectTarget, onNavigate, onOpenTarget)}>
          <FileText size={13} />
          <span>回系统地图</span>
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
              aria-label={`打开概览焦点对象 ${card.title}`}
              onClick={() => openOverviewTarget(card.objectTarget, onNavigate, onOpenTarget)}
            >
              <ExternalLink size={13} />
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
              aria-label={`打开概览焦点任务 ${card.title}`}
              onClick={() => openOverviewTarget(card.taskTarget, onNavigate, onOpenTarget)}
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

export default function OverviewPage({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: OverviewPageProps) {
  const [overviewSprintDraftId, setOverviewSprintDraftId] = useState('');
  const [overviewSprintNotice, setOverviewSprintNotice] = useState<string | null>(null);
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null);
  const [draftActionNotice, setDraftActionNotice] = useState<string | null>(null);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);
  const [registryQuery, setRegistryQuery] = useState('');
  const [registryStatusFilter, setRegistryStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');
  const [state, setState] = useState<OverviewState>({
    loading: true,
    registry: [],
    registryAvailable: false,
    runtime: [],
    runtimeAvailable: false,
    alerts: [],
    alertsAvailable: false,
    systemMap: null,
    systemMapAvailable: false,
    drafts: [],
    draftsAvailable: false,
    domainApps: [],
    domainAppsAvailable: false,
    error: '',
  });

  const load = async () => {
    setState((previous) => ({ ...previous, loading: true, error: '' }));
    try {
      const [registryResult, runtimeResult, alertsResult, systemMapResult, draftsResult, domainAppsResult] = await Promise.allSettled([
        fetch('/api/services'),
        fetch('/api/services/status'),
        fetch('/api/alerts?status=active&limit=10'),
        fetch('/api/cockpit/system-map'),
        fetch(OVERVIEW_DRAFT_TASKS_URL),
        fetch('/api/domain-apps'),
      ]);

      const [registryRes, runtimeRes, alertsRes, systemMapRes, draftsRes, domainAppsRes] = await Promise.all([
        readOverviewResponse<RegistryService[]>(registryResult, []),
        readOverviewResponse<{ items?: RuntimeService[] }>(runtimeResult, { items: [] }),
        readOverviewResponse<AlertPayload>(alertsResult, { items: [] }),
        readOverviewResponse<SystemMapPayload>(systemMapResult, {}),
        readOverviewResponse<{ items?: DraftTask[] }>(draftsResult, { items: [] }),
        readOverviewResponse<{ items?: DomainAppRegistryItem[] }>(domainAppsResult, { items: [] }),
      ]);
      const nextState: OverviewState = {
        loading: false,
        registry: [],
        registryAvailable: registryRes.ok,
        runtime: [],
        runtimeAvailable: runtimeRes.ok,
        alerts: [],
        alertsAvailable: alertsRes.ok,
        systemMap: null,
        systemMapAvailable: systemMapRes.ok,
        drafts: [],
        draftsAvailable: draftsRes.ok,
        domainApps: [],
        domainAppsAvailable: domainAppsRes.ok,
        error: '',
      };
      const failures = [
        ['服务登记', registryRes.ok],
        ['运行状态', runtimeRes.ok],
        ['活动告警', alertsRes.ok],
        ['系统地图', systemMapRes.ok],
        ['任务草稿', draftsRes.ok],
        ['领域应用', domainAppsRes.ok],
      ].filter(([, ok]) => !ok).map(([label]) => label);
      nextState.error = failures.length > 0 ? `概览部分数据暂不可用：${failures.join('、')}` : '';

      if (registryRes.ok) nextState.registry = registryRes.data;
      if (runtimeRes.ok) {
        const runtime = runtimeRes.data;
        nextState.runtime = runtime.items || [];
      }
      if (alertsRes.ok) {
        const alerts = alertsRes.data;
        nextState.alerts = alerts.items || [];
      }
      if (systemMapRes.ok) {
        nextState.systemMap = systemMapRes.data;
      }
      if (draftsRes.ok) {
        const drafts = draftsRes.data;
        nextState.drafts = drafts.items || [];
      }
      if (domainAppsRes.ok) {
        const domainApps = domainAppsRes.data;
        nextState.domainApps = domainApps.items || [];
      }

      setState(nextState);
    } catch (error) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : '运行总面数据读取失败',
      }));
    }
  };

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      void load();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const promoteDraft = async (draft: DraftTask) => {
    if (!draft.id || pendingDraftId) return;
    setPendingDraftId(draft.id);
    setDraftActionNotice(null);
    setDraftActionError(null);
    try {
      const response = await fetch(`/api/tasks/drafts/${encodeURIComponent(draft.id)}/promote`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || response.statusText || '任务草稿承接失败');
      }
      setDraftActionNotice(`已承接为正式计划任务：${payload.title || draft.title || draft.id}`);
      await load();
    } catch (error) {
      setDraftActionError(error instanceof Error ? error.message : '任务草稿承接失败');
    } finally {
      setPendingDraftId(null);
    }
  };

  const activeAlerts = useMemo(
    () => (state.alerts || []).filter((alert) => alert.status === 'active'),
    [state.alerts],
  );

  const unstableRuntime = useMemo(
    () => state.runtime.filter((service) => service.status !== 'online'),
    [state.runtime],
  );

  const filteredRegistry = useMemo(() => {
    const query = registryQuery.trim().toLowerCase();
    return state.registry.filter((service) => {
      const status = normalizeStatus(service.health || service.status);
      if (registryStatusFilter !== 'all' && status !== registryStatusFilter) return false;
      if (!query) return true;
      return [service.name, service.type, service.layer, service.status, service.health, String(service.port || '')]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [registryQuery, registryStatusFilter, state.registry]);

  const summary = state.systemMap?.project_portfolio?.summary;
  const priorityProjects = state.systemMap?.project_portfolio?.priority_projects || [];
  const weakestDimensions = state.systemMap?.project_portfolio?.weakest_dimensions || [];
  const cockpitPages = state.systemMap?.cockpit_pages || [];
  const pageGroups = useMemo(() => buildPageGroups(cockpitPages), [cockpitPages]);
  const featureDomains = state.systemMap?.feature_domains || [];
  const usagePaths = state.systemMap?.usage_paths || [];
  const playbooks = state.systemMap?.playbooks || [];
  const roadmapLanes = state.systemMap?.roadmap?.lanes || [];
  const projectFocus = state.systemMap?.project_focus?.summary;
  const capabilityCoverage = state.systemMap?.project_capability_coverage?.summary;
  const domainApps = state.systemMap?.domain_apps?.summary;
  const domainAttention = state.systemMap?.domain_apps?.attention_items || [];
  const pageMaturity = state.systemMap?.page_maturity?.summary;
  const registryUnavailable = !state.registryAvailable;
  const runtimeUnavailable = !state.runtimeAvailable;
  const alertsUnavailable = !state.alertsAvailable;
  const systemMapUnavailable = !state.systemMapAvailable;
  const readOnlyDrafts = useMemo(
    () => state.drafts.filter((draft) => draft.read_only && draft.source?.type && DRAFT_SOURCE_LABELS[draft.source.type]),
    [state.drafts],
  );
  const focusDrafts = useMemo(
    () => [...readOnlyDrafts]
      .sort((left, right) => draftPriorityWeight(right.priority) - draftPriorityWeight(left.priority))
      .slice(0, 6),
    [readOnlyDrafts],
  );
  const pageDrafts = useMemo(
    () => readOnlyDrafts.filter((draft) => draft.source?.type === 'system_map_page_maturity').slice(0, 2),
    [readOnlyDrafts],
  );
  const overviewSprintRows = useMemo<OverviewSprintRow[]>(() => (
    pageDrafts.map((draft) => {
      const pageId = draft.source?.id || draft.id || draft.title || 'unknown-page';
      const pageMeta = cockpitPages.find((page) => page.id === pageId) || null;
      const usagePath = usagePaths.find((path) => path.pages?.some((page) => page.id === pageId)) || null;
      const playbook = playbooks.find((item) => (item.steps || []).some((step) => (step.page_id || step.page?.id) === pageId)) || null;
      const featureDomain = featureDomains.find((domain) => domain.cockpit_page === pageId || domain.providers?.includes(pageId)) || null;
      const pageTitle = pageMeta?.title || draft.source?.title || pageId;
      const purpose = pageMeta?.purpose || draft.description || '待补用途说明';
      const nextAction = draft.description || `继续补齐 ${pageTitle} 的页面承接。`;
      const copyText = [
        `标题: ${draft.title || `页面成熟度：补齐 ${pageTitle}`}`,
        `页面: ${pageTitle}`,
        `页面ID: ${pageId}`,
        `优先级: ${draft.priority || 'pending'}`,
        `任务描述: ${nextAction}`,
        `进入路径: ${usagePath?.title || '还没挂进明确使用路径'}`,
        `能力域: ${featureDomain?.title || '未登记能力域'}`,
        `操作清单: ${playbook?.title || '未登记操作清单'}`,
        '验收标准:',
        `- ${pageTitle} 至少接入一条可走路径或补清楚为什么暂时没有`,
        `- ${pageTitle} 在任务中心可直接检索到补位动作`,
        `- ${pageTitle} 不再只停留在概览或系统地图的薄弱提示`,
      ].join('\n');

      return {
        draftId: draft.id || pageId,
        draftTitle: draft.title || `页面成熟度：补齐 ${pageTitle}`,
        pageId,
        pageTitle,
        group: pageMeta?.group || '未分组',
        purpose,
        priority: draft.priority || 'pending',
        nextAction,
        pathTitle: usagePath?.title || null,
        playbookTitle: playbook?.title || null,
        featureDomainTitle: featureDomain?.title || null,
        objectTarget: { tab: 'SystemMap', pageId },
        taskTarget: { tab: 'TaskCenter', taskQuery: pageId },
        pathTarget: usagePath ? { tab: 'SystemMap', usagePathId: usagePath.id } : null,
        copyText,
      };
    })
  ), [cockpitPages, featureDomains, pageDrafts, playbooks, usagePaths]);
  const activeOverviewSprintRow = useMemo(
    () => overviewSprintRows.find((row) => row.draftId === overviewSprintDraftId) || overviewSprintRows[0] || null,
    [overviewSprintDraftId, overviewSprintRows],
  );
  useEffect(() => {
    if (overviewSprintRows.length === 0) {
      if (overviewSprintDraftId) setOverviewSprintDraftId('');
      return;
    }
    if (!overviewSprintDraftId || !overviewSprintRows.some((row) => row.draftId === overviewSprintDraftId)) {
      setOverviewSprintDraftId(overviewSprintRows[0].draftId);
    }
  }, [overviewSprintDraftId, overviewSprintRows]);
  const domainDrafts = useMemo(
    () => readOnlyDrafts.filter((draft) => draft.source?.type === 'system_map_domain_app'),
    [readOnlyDrafts],
  );
  const domainExecutionCards = useMemo(() => {
    const attentionItems = domainAttention.slice(0, 3).map((item) => {
      const linkedApp = state.domainApps.find((app) => matchesDomainRegistryItem(app, item.id) || matchesDomainRegistryItem(app, item.name));
      const linkedDraft = domainDrafts.find((draft) => (
        draft.source?.id === item.id
        || draft.source?.title?.includes(item.id)
        || (item.name ? draft.title?.includes(item.name) : false)
      )) || null;
      return {
        id: item.id,
        objectTitle: linkedApp?.name || item.name || item.id,
        objectMeta: linkedApp?.domain?.name || '领域对象',
        runtimeStatus: linkedApp?.runtime?.status || item.runtime_status || 'unknown',
        securityStatus: linkedApp?.security_summary?.posture || item.security_posture || 'unknown',
        freshnessStatus: linkedApp?.freshness?.status || '未登记',
        taskTitle: linkedDraft?.title || '待补领域任务',
        nextAction: linkedDraft?.description || item.next_action || '回应用中心继续确认运行态和安全门。',
        appQuery: linkedApp?.id || item.id,
        draftQuery: linkedDraft?.source?.id || linkedDraft?.id || item.id,
      };
    });

    if (attentionItems.length > 0) {
      return attentionItems;
    }

    const fallbackCards = domainDrafts.slice(0, 3).map((draft) => {
      const linkedApp = state.domainApps.find((app) =>
        matchesDomainRegistryItem(app, draft.source?.id)
        || matchesDomainRegistryItem(app, draft.source?.title)
        || matchesDomainRegistryItem(app, draft.title),
      ) || null;

      return {
        id: draft.source?.id || draft.id || draft.title || 'domain-draft',
        objectTitle: linkedApp?.name || draft.source?.title || draft.title || '未命名领域对象',
        objectMeta: linkedApp?.domain?.name || '领域对象',
        runtimeStatus: linkedApp?.runtime?.status || 'unknown',
        securityStatus: linkedApp?.security_summary?.posture || 'unknown',
        freshnessStatus: linkedApp?.freshness?.status || '未登记',
        taskTitle: draft.title || '待补领域任务',
        nextAction: draft.description || '回任务中心或应用中心继续承接。',
        appQuery: linkedApp?.id || draft.source?.id || draft.id || draft.title || null,
        draftQuery: draft.source?.id || draft.id || draft.title || null,
      };
    });

    if (fallbackCards.length > 0) {
      return fallbackCards;
    }

    return state.domainApps.slice(0, 3).map((app) => ({
      id: app.id,
      objectTitle: app.name,
      objectMeta: app.domain?.name || '领域对象',
      runtimeStatus: app.runtime?.status || 'unknown',
      securityStatus: app.security_summary?.posture || 'unknown',
      freshnessStatus: app.freshness?.status || '未登记',
      taskTitle: '待补领域任务',
      nextAction: '当前还没有匹配到领域草稿，先回应用中心确认运行态和安全门。',
      appQuery: app.id,
      draftQuery: app.id,
    }));
  }, [domainAttention, domainDrafts, state.domainApps]);
  const modePlaybooks = useMemo(() => {
    const pagesByTitle = new globalThis.Map(
      cockpitPages.map((page) => [page.title, page.id]),
    );

    return COCKPIT_WORK_MODES.map((mode) => {
      const relatedPageIds = new Set<string>([mode.entry.tab, mode.taskTarget.tab]);
      mode.focus.forEach((label) => {
        relatedPageIds.add(label);
        const pageId = pagesByTitle.get(label);
        if (pageId) relatedPageIds.add(pageId);
      });

      const usagePath = usagePaths.find((path) =>
        (path.steps || []).some((step) => relatedPageIds.has(step))
        || (path.pages || []).some((page) => page.id && relatedPageIds.has(page.id)),
      ) || null;

      const playbook = playbooks.find((item) =>
        (item.steps || []).some((step) => step.page_id && relatedPageIds.has(step.page_id))
      ) || null;

      return {
        mode,
        usagePath,
        playbook,
      };
    });
  }, [cockpitPages, playbooks, usagePaths]);

  const triageActions = useMemo(() => {
    const projects = state.systemMap?.projects || [];
    const priorityIds = new Set(priorityProjects.map((project) => project.id));
    return projects
      .filter((project) => priorityIds.has(project.id))
      .flatMap((project) =>
        (project.triage_commands || []).slice(0, 2).map((command) => ({
          projectId: project.id,
          cockpitPage: project.cockpit_page || 'SystemMap',
          role: project.role || project.id,
          command,
        })),
      )
      .slice(0, 6);
  }, [priorityProjects, state.systemMap]);

  const servicesNeedingAttention = useMemo(
    () => state.registry.filter((service) => normalizeStatus(service.health || service.status) !== 'online' || service.port_listening === false).slice(0, 8),
    [state.registry],
  );
  const overviewActionItems = useMemo(
    () => [
      {
        id: 'overview-alerts',
        title: '先收口活跃告警',
        detail: `当前有 ${activeAlerts.length} 条活跃告警，先回告警中心确认优先级和承接顺序。`,
        actionLabel: '进入告警页',
        actionType: 'navigate' as const,
        actionValue: 'AlertCenter',
        actionTarget: { tab: 'AlertCenter', taskQuery: focusTaskQuery || activeAlerts[0]?.id || 'Overview' },
      },
      {
        id: 'overview-tasks',
        title: '再处理修复草稿',
        detail: `当前累计 ${readOnlyDrafts.length} 条只读草稿，先把验证、页面、领域和缺口任务排进处理队列。`,
        actionLabel: '进入任务中心',
        actionType: 'navigate' as const,
        actionValue: 'TaskCenter',
        actionTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || readOnlyDrafts[0]?.source?.id || readOnlyDrafts[0]?.id || 'Overview' },
      },
      {
        id: 'overview-domain-apps',
        title: '最后核对领域挂载',
        detail: `当前有 ${domainAttention.length} 个领域应用待关注，回应用中心确认运行态和安全门。`,
        actionLabel: '进入应用中心',
        actionType: 'navigate' as const,
        actionValue: 'DomainApps',
        actionTarget: { tab: 'DomainApps', taskQuery: focusTaskQuery || domainAttention[0]?.id || 'Overview' },
      },
    ],
        [activeAlerts.length, domainAttention.length, readOnlyDrafts.length],
  );
  const overviewClosureRows = useMemo<OverviewClosureRow[]>(() => {
    const firstWeakDimension = weakestDimensions[0] || null;
    const firstCoverageDraft = focusDrafts[0] || null;
    const firstDomainCard = domainExecutionCards[0] || null;
    const firstUsagePath = usagePaths[0] || null;
    const firstPlaybook = playbooks[0] || null;
    const firstFeatureDomain = featureDomains[0] || null;
    const firstUnstableRuntime = unstableRuntime[0] || null;
    const firstTriageAction = triageActions[0] || null;

    return [
      {
        id: 'coverage-repair',
        title: '全站覆盖与修复收口',
        summary: '概览页最先要接住的，是覆盖缺口和修复草稿，不然系统地图和任务中心之间还是断开的。',
        signal: firstWeakDimension ? `${firstWeakDimension.title || firstWeakDimension.id} ${firstWeakDimension.score || 0}%` : `草稿 ${focusDrafts.length}`,
        nextAction: firstCoverageDraft
          ? `优先处理 ${firstCoverageDraft.title || firstCoverageDraft.id}，回系统地图确认缺口，再送进任务中心。`
          : '当前没有明显修复草稿，抽查概览到系统地图和任务中心的覆盖收口链路。',
        statusTone: firstWeakDimension || firstCoverageDraft ? 'degraded' : 'online',
        objectTarget: firstWeakDimension
          ? { tab: 'SystemMap', coverageDimensionId: firstWeakDimension.id }
          : { tab: 'SystemMap' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstCoverageDraft?.source?.id || firstCoverageDraft?.title || '覆盖修复' },
      },
      {
        id: 'domain-execution',
        title: '领域挂载与执行闭环',
        summary: '领域对象、运行态和任务承接必须在概览页上一起看，不然用户还得猜该先回应用中心还是先回任务。',
        signal: firstDomainCard ? `${firstDomainCard.objectTitle} · ${statusText(firstDomainCard.runtimeStatus)}` : `领域 ${domainExecutionCards.length}`,
        nextAction: firstDomainCard
          ? `先围绕 ${firstDomainCard.objectTitle} 回应用中心核对运行态，再把任务承接动作正式落下。`
          : '当前没有明显领域闭环对象，抽查应用中心到任务中心的挂载承接链路。',
        statusTone: firstDomainCard ? 'degraded' : 'online',
        objectTarget: { tab: 'DomainApps', taskQuery: firstDomainCard?.appQuery || 'domain-execution' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstDomainCard?.draftQuery || 'domain-execution' },
      },
      {
        id: 'architecture-usage',
        title: '功能架构与使用路径收口',
        summary: '概览页不该只列页面和路径数量，它要把功能架构、使用路径和操作清单真正串成可走的站内路线。',
        signal: firstUsagePath ? `${firstUsagePath.title} · ${firstUsagePath.pages?.length || 0} 页` : `能力域 ${featureDomains.length}`,
        nextAction: firstPlaybook
          ? `先沿着 ${firstUsagePath?.title || firstFeatureDomain?.title || '当前路径'} 下钻，再用 ${firstPlaybook.title} 把动作落到任务。`
          : '当前没有完整操作清单，先回系统地图补使用路径，再把执行步骤沉进任务中心。',
        statusTone: firstUsagePath || firstFeatureDomain ? 'degraded' : 'online',
        objectTarget: firstUsagePath
          ? { tab: 'SystemMap', usagePathId: firstUsagePath.id }
          : { tab: 'SystemMap', featureDomainId: firstFeatureDomain?.id || null },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstPlaybook?.title || firstUsagePath?.title || '功能架构' },
      },
      {
        id: 'runtime-repair',
        title: '运行态势与修复动作收口',
        summary: '运行态势、修复动作和日志/性能证据要在概览页上形成一条链，不然总面还是只能看热闹。',
        signal: firstUnstableRuntime ? `${firstUnstableRuntime.name} · ${statusText(firstUnstableRuntime.status)}` : `修复动作 ${triageActions.length}`,
        nextAction: firstTriageAction
          ? `围绕 ${firstTriageAction.projectId} 的修复动作继续看性能或日志，再决定是否升级成长期任务。`
          : firstUnstableRuntime
            ? `先去性能页确认 ${firstUnstableRuntime.name} 的波动，再回日志页抓证据。`
            : '当前没有明显运行修复对象，抽查概览到性能、日志和任务中心的修复链路。',
        statusTone: firstUnstableRuntime || firstTriageAction ? 'degraded' : 'online',
        objectTarget: firstUnstableRuntime
          ? { tab: 'Performance', taskQuery: firstUnstableRuntime.name }
          : { tab: 'LogViewer', taskQuery: firstTriageAction?.projectId || 'runtime-repair' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstTriageAction?.projectId || firstUnstableRuntime?.name || 'runtime-repair' },
      },
    ];
  }, [
    domainExecutionCards,
    featureDomains,
    focusDrafts,
    playbooks,
    triageActions,
    unstableRuntime,
    usagePaths,
    weakestDimensions,
  ]);

  if (state.loading && state.registry.length === 0 && state.runtime.length === 0 && !state.systemMap) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在加载运行总面...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <RuntimeOpsWorkbench currentPage="Overview" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />
      <SystemAssuranceWorkbench onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {(draftActionNotice || draftActionError) && (
        <div className={`shell-data-banner ${draftActionError ? 'error' : 'success'}`} role="status" aria-live="polite">
          {draftActionError || draftActionNotice}
        </div>
      )}

      <ActionSurfacePanel
        title="总面动作区"
        subtitle="概览页先负责定优先级，再把动作分流到告警、任务和领域应用几个真正承接的页面。"
        statusText={`${activeAlerts.length} 告警 / ${readOnlyDrafts.length} 草稿 / ${servicesNeedingAttention.length} 待关注服务`}
        items={overviewActionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <FocusedOverviewClosureSection
        cockpitPages={cockpitPages}
        priorityProjects={priorityProjects}
        readOnlyDrafts={readOnlyDrafts}
        domainAttention={domainAttention}
        domainApps={state.domainApps}
        closureRows={overviewClosureRows}
        focusPageId={focusPageId}
        focusProjectId={focusProjectId}
        focusTaskQuery={focusTaskQuery}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <section className="services-section overview-ops-panel" role="region" aria-label="概览闭环总表">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>概览闭环总表</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把覆盖修复、领域执行、架构使用和运行修复四条主线放在同一层，概览页才能真正承担总控入口，而不是信息堆场。
            </p>
          </div>
          <span className="status-badge online">{overviewClosureRows.length} 条闭环</span>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {overviewClosureRows.map((row) => (
            <article
              key={`overview-closure-${row.id}`}
              className="antd-card"
              style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 15 }}>{row.title}</strong>
                  <span className={`status-badge ${row.statusTone}`}>{row.signal}</span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{row.summary}</p>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <small className="text-muted">下一步</small>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.nextAction}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="antd-btn small"
                  aria-label={`打开概览闭环对象 ${row.title}`}
                  onClick={() => openOverviewTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ExternalLink size={13} />
                  <span>看对象</span>
                </button>
                <button
                  className="antd-btn small"
                  aria-label={`打开概览闭环任务 ${row.title}`}
                  onClick={() => openOverviewTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={13} />
                  <span>看任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {overviewSprintRows.length > 0 && activeOverviewSprintRow && (
        <section className="services-section overview-ops-panel" aria-label="概览冲刺工坊">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>概览冲刺工坊</h2>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                概览页不只是看薄弱项，还要把弱页面直接翻成一条能走的冲刺链: 回对象、看路径、补清单、送任务。
              </p>
            </div>
            <span className="status-badge degraded">弱页 {overviewSprintRows.length}</span>
          </div>

          <div className="overview-mode-grid">
            {overviewSprintRows.map((row) => (
              <article key={row.draftId} className="overview-mode-card">
                <div className="overview-ops-head">
                  <div>
                    <strong>{row.pageTitle}</strong>
                    <small className="overview-mode-role">{row.draftTitle}</small>
                  </div>
                  <span className={`status-badge ${row.priority === 'high' || row.priority === 'critical' ? 'offline' : 'degraded'}`}>
                    {row.priority}
                  </span>
                </div>
                <p className="overview-mode-summary">{row.nextAction}</p>
                <div className="overview-mode-actions">
                  <button
                    className="antd-btn small"
                    aria-label={`聚焦冲刺页 ${row.pageTitle}`}
                    onClick={() => setOverviewSprintDraftId(row.draftId)}
                  >
                    <Zap size={13} />
                    <span>{activeOverviewSprintRow.draftId === row.draftId ? '当前冲刺' : '聚焦冲刺'}</span>
                  </button>
                  <button
                    className="antd-btn small"
                    aria-label={`打开冲刺任务 ${row.draftTitle}`}
                    onClick={() => openOverviewTarget(row.taskTarget, onNavigate, onOpenTarget)}
                  >
                    <ClipboardCheck size={13} />
                    <span>看任务</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          <section className="services-section" role="region" aria-label="当前冲刺页" style={{ marginTop: 16 }}>
            <div className="section-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>{activeOverviewSprintRow.pageTitle}</h3>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  {activeOverviewSprintRow.purpose}
                </p>
              </div>
              <span className="status-badge degraded">{activeOverviewSprintRow.priority}</span>
            </div>
            <div className="overview-mode-links">
              <div className="overview-mode-link">
                <span>进入路径</span>
                <strong>{activeOverviewSprintRow.pathTitle || '还没挂进明确使用路径'}</strong>
              </div>
              <div className="overview-mode-link">
                <span>能力域</span>
                <strong>{activeOverviewSprintRow.featureDomainTitle || '未登记能力域'}</strong>
              </div>
              <div className="overview-mode-link">
                <span>操作清单</span>
                <strong>{activeOverviewSprintRow.playbookTitle || '未登记操作清单'}</strong>
              </div>
              <div className="overview-mode-link">
                <span>下一步</span>
                <strong>{activeOverviewSprintRow.nextAction}</strong>
              </div>
            </div>
            <div className="overview-mode-actions">
              <button
                className="antd-btn small"
                aria-label={`复制冲刺任务 ${activeOverviewSprintRow.draftTitle}`}
                onClick={async () => {
                  await copyText(activeOverviewSprintRow.copyText);
                  setOverviewSprintNotice(`已复制冲刺任务：${activeOverviewSprintRow.draftTitle}`);
                }}
              >
                <Copy size={13} />
                <span>复制任务</span>
              </button>
              <button
                className="antd-btn small"
                aria-label={`打开冲刺对象 ${activeOverviewSprintRow.draftTitle}`}
                onClick={() => openOverviewTarget(activeOverviewSprintRow.objectTarget, onNavigate, onOpenTarget)}
              >
                <ExternalLink size={13} />
                <span>看页面对象</span>
              </button>
              <button
                className="antd-btn small"
                aria-label={activeOverviewSprintRow.pathTitle ? `打开冲刺路径 ${activeOverviewSprintRow.draftTitle}` : `打开冲刺收口任务 ${activeOverviewSprintRow.draftTitle}`}
                onClick={() => openOverviewTarget(activeOverviewSprintRow.pathTarget || activeOverviewSprintRow.taskTarget, onNavigate, onOpenTarget)}
              >
                {activeOverviewSprintRow.pathTitle ? <Route size={13} /> : <Compass size={13} />}
                <span>{activeOverviewSprintRow.pathTitle ? '看进入路径' : '去任务收口'}</span>
              </button>
            </div>
            {overviewSprintNotice && (
              <p className="text-muted" style={{ margin: '8px 0 0', fontSize: 12 }}>{overviewSprintNotice}</p>
            )}
          </section>
        </section>
      )}

      <section className="services-section overview-ops-panel">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>按工作模式进入</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              不同角色和场景先看哪里、再去哪里、任务落到哪一页，这里直接给出整站使用编排。
            </p>
          </div>
          <button className="antd-btn" onClick={() => openOverviewTarget({ tab: 'Home', taskQuery: focusTaskQuery || 'Overview' }, onNavigate, onOpenTarget)}>
            <Route size={14} />
            <span>回首页模式台</span>
          </button>
        </div>

        <div className="overview-mode-grid">
          {modePlaybooks.map(({ mode, usagePath, playbook }) => (
            <article key={mode.id} className="overview-mode-card">
              <div className="overview-ops-head">
                <div>
                  <strong>{mode.title}</strong>
                  <small className="overview-mode-role">{mode.role}</small>
                </div>
                <button
                  className="antd-btn small"
                  aria-label={`打开工作模式 ${mode.title}`}
                  onClick={() => openOverviewTarget(mode.entry, onNavigate, onOpenTarget)}
                >
                  <ExternalLink size={13} />
                  <span>进入入口</span>
                </button>
              </div>

              <p className="overview-mode-summary">{mode.summary}</p>

              <div className="overview-mode-chips">
                {mode.focus.map((item) => (
                  <span key={`${mode.id}-${item}`} className="overview-mode-chip">{item}</span>
                ))}
              </div>

              <div className="overview-mode-links">
                <div className="overview-mode-link">
                  <span>入口页面</span>
                  <strong>{mode.entry.tab}</strong>
                  <small>先进入当前模式的承接页。</small>
                </div>
                <div className="overview-mode-link">
                  <span>关联路径</span>
                  <strong>{usagePath?.title || '待补路径'}</strong>
                  <small>{usagePath?.intent || '建议补一条把入口页串成任务流的使用路径。'}</small>
                </div>
                <div className="overview-mode-link">
                  <span>承接清单</span>
                  <strong>{playbook?.title || '待补清单'}</strong>
                  <small>{playbook?.goal || '建议补一份按场景执行的操作清单。'}</small>
                </div>
              </div>

              <div className="overview-mode-actions">
                <button
                  className="antd-btn small"
                  aria-label={`打开模式任务 ${mode.title}`}
                  onClick={() => openOverviewTarget(mode.taskTarget, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={13} />
                  <span>去任务承接</span>
                </button>
                {usagePath ? (
                  <button
                    className="antd-btn small"
                    aria-label={`打开模式路径 ${mode.title}`}
                    onClick={() => openOverviewTarget({ tab: 'SystemMap', usagePathId: usagePath.id }, onNavigate, onOpenTarget)}
                  >
                    <Compass size={13} />
                    <span>看使用路径</span>
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {state.error && (
        <div className="overview-inline-error" role="alert">
          <AlertTriangle size={16} />
          <span>{state.error}</span>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
            <Server size={20} />
          </div>
          <div className="stat-info">
            <h3>服务登记</h3>
            <p className="stat-value">{registryUnavailable ? 'N/A' : state.registry.length}</p>
            <span className="task-stat-subline">{registryUnavailable ? '登记数据不可用' : `运行中 ${state.registry.filter((service) => ['running', 'active'].includes(service.status)).length}`}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-warning" aria-hidden="true">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-info">
            <h3>活跃告警</h3>
            <p className="stat-value">{alertsUnavailable ? 'N/A' : activeAlerts.length}</p>
            <span className="task-stat-subline">{alertsUnavailable ? '告警数据不可用' : runtimeUnavailable ? '运行状态数据不可用' : `异常服务 ${unstableRuntime.length}`}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent" aria-hidden="true">
            <ShieldAlert size={20} />
          </div>
          <div className="stat-info">
            <h3>项目风险</h3>
            <p className="stat-value">{systemMapUnavailable ? 'N/A' : `${summary?.blocked || 0} / ${summary?.projects || 0}`}</p>
            <span className="task-stat-subline">{systemMapUnavailable ? '项目风险数据不可用' : `${summaryStatusText(summary?.status)} · 风险 ${summary?.at_risk || 0}`}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <h3>组合得分</h3>
            <p className="stat-value">{systemMapUnavailable ? 'N/A' : `${summary?.score || 0}%`}</p>
            <span className="task-stat-subline">{systemMapUnavailable ? '组合评分数据不可用' : `健康项目 ${summary?.healthy || 0}`}</span>
          </div>
        </div>
      </div>

      <section className="services-section overview-ops-panel">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>全站覆盖与修复</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把运行缺口、验证补证、页面成熟度、领域挂载和能力矩阵放到同一层看，直接决定修复入口。
            </p>
          </div>
          <button className="antd-btn" onClick={() => openOverviewTarget({ tab: 'SystemMap' }, onNavigate, onOpenTarget)}>
            <FileText size={14} />
            <span>打开系统地图</span>
          </button>
        </div>

        <div className="overview-coverage-grid">
          <button
            className={`overview-coverage-card ${coverageTone(summary?.score || 0, projectFocus?.runtime_gap || 0, projectFocus?.needs_action || 0)}`}
            aria-label="打开全站覆盖卡片 运行缺口"
            onClick={() => openOverviewTarget({ tab: 'SystemMap' }, onNavigate, onOpenTarget)}
          >
            <span>运行缺口</span>
            <strong>{systemMapUnavailable ? 'N/A' : projectFocus?.runtime_gap || 0}</strong>
            <small>{systemMapUnavailable ? '运行缺口数据不可用' : `待动作 ${projectFocus?.needs_action || 0} · 就绪并运行 ${projectFocus?.ready_and_running || 0}`}</small>
          </button>
          <button
            className={`overview-coverage-card ${coverageTone(100 - ((projectFocus?.verification_gap || 0) * 15), projectFocus?.verification_gap || 0, projectFocus?.verification_ready || 0)}`}
            aria-label="打开全站覆盖卡片 验证补证"
            onClick={() => openOverviewTarget({ tab: 'TaskCenter', taskQuery: '验证' }, onNavigate, onOpenTarget)}
          >
            <span>验证补证</span>
            <strong>{systemMapUnavailable ? 'N/A' : projectFocus?.verification_ready || 0}</strong>
            <small>{systemMapUnavailable ? '验证证据数据不可用' : `验证缺口 ${projectFocus?.verification_gap || 0} · 草稿 ${readOnlyDrafts.filter((draft) => draft.source?.type === 'system_map_verification_ready').length}`}</small>
          </button>
          <button
            className={`overview-coverage-card ${coverageTone(pageMaturity?.score || 0, pageMaturity?.gap || 0, pageMaturity?.watch || 0)}`}
            aria-label="打开全站覆盖卡片 页面成熟度"
            onClick={() => openOverviewTarget({ tab: 'TaskCenter', taskQuery: '页面' }, onNavigate, onOpenTarget)}
          >
            <span>页面成熟度</span>
            <strong>{systemMapUnavailable ? 'N/A' : `${pageMaturity?.score || 0}%`}</strong>
            <small>{systemMapUnavailable ? '页面成熟度数据不可用' : `ready ${pageMaturity?.ready || 0} · watch ${pageMaturity?.watch || 0}`}</small>
          </button>
          <button
            className={`overview-coverage-card ${coverageTone(domainApps?.score || 0, domainApps?.high_risk || 0, domainApps?.external_mounts || 0)}`}
            aria-label="打开全站覆盖卡片 领域挂载"
            onClick={() => openOverviewTarget({ tab: 'DomainApps' }, onNavigate, onOpenTarget)}
          >
            <span>领域挂载</span>
            <strong>{systemMapUnavailable ? 'N/A' : `${domainApps?.score || 0}%`}</strong>
            <small>{systemMapUnavailable ? '领域挂载数据不可用' : `运行 ${domainApps?.running || 0} / ${domainApps?.total || 0} · 高风险 ${domainApps?.high_risk || 0}`}</small>
          </button>
          <button
            className={`overview-coverage-card ${coverageTone(capabilityCoverage?.score || 0, capabilityCoverage?.failed_cells || 0, capabilityCoverage?.warning_cells || 0)}`}
            aria-label="打开全站覆盖卡片 能力矩阵"
            onClick={() => openOverviewTarget({ tab: 'SystemMap' }, onNavigate, onOpenTarget)}
          >
            <span>能力矩阵</span>
            <strong>{systemMapUnavailable ? 'N/A' : `${capabilityCoverage?.score || 0}%`}</strong>
            <small>{systemMapUnavailable ? '能力矩阵数据不可用' : `warning ${capabilityCoverage?.warning_cells || 0} · failed ${capabilityCoverage?.failed_cells || 0}`}</small>
          </button>
        </div>

        <div className="overview-coverage-columns">
          <article className="overview-coverage-panel">
            <div className="overview-ops-head">
              <strong>修复收件箱</strong>
              <button className="antd-btn small" aria-label="打开全站覆盖到任务中心" onClick={() => openOverviewTarget({ tab: 'TaskCenter' }, onNavigate, onOpenTarget)}>
                <ExternalLink size={13} />
                <span>去任务中心</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {focusDrafts.map((draft) => (
                <article
                  key={draft.id || draft.title}
                  className="overview-ops-item"
                >
                  <button
                    className="overview-ops-item-main"
                    aria-label={`打开修复草稿 ${draft.title || draft.id}`}
                    onClick={() => openOverviewTarget(draftTarget(draft), onNavigate, onOpenTarget)}
                  >
                    <strong>{draft.title || draft.id || '未命名草稿'}</strong>
                    <span>{draftSourceLabel(draft.source?.type)} · {draft.priority || 'pending'}</span>
                    <small>{draft.description || draft.source?.id || '进入对应入口继续处理。'}</small>
                  </button>
                  <div className="overview-ops-item-actions">
                    <button
                      className="antd-btn small"
                      aria-label={`承接为正式计划任务 ${draft.title || draft.id}`}
                      title="承接为正式计划任务"
                      disabled={!draft.id || Boolean(pendingDraftId)}
                      onClick={() => void promoteDraft(draft)}
                    >
                      <ClipboardCheck size={13} />
                      <span>{pendingDraftId === draft.id ? '承接中...' : '承接任务'}</span>
                    </button>
                  </div>
                </article>
              ))}
              {focusDrafts.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前没有覆盖类修复草稿</div>
              )}
            </div>
          </article>

          <article className="overview-coverage-panel">
            <div className="overview-ops-head">
              <strong>高优先薄弱面</strong>
              <button className="antd-btn small" aria-label="打开全站覆盖到领域应用" onClick={() => openOverviewTarget({ tab: 'DomainApps' }, onNavigate, onOpenTarget)}>
                <ExternalLink size={13} />
                <span>去应用中心</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {weakestDimensions.slice(0, 3).map((dimension) => (
                <button
                  key={dimension.id}
                  className="overview-ops-item"
                  aria-label={`打开薄弱面 ${dimension.title || dimension.id}`}
                  onClick={() => openOverviewTarget({ tab: 'SystemMap', coverageDimensionId: dimension.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{dimension.title || dimension.id}</strong>
                  <span>{dimension.score || 0}% · 缺口 {dimension.failed || 0} · 提醒 {dimension.warning || 0}</span>
                  <small>{dimension.attention_projects?.[0]?.next_action || '进入系统地图修复台查看详情。'}</small>
                </button>
              ))}
              {domainAttention.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  className="overview-ops-item"
                  aria-label={`打开领域关注 ${item.id}`}
                  onClick={() => openOverviewTarget({ tab: 'DomainApps', taskQuery: item.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{item.name || item.id}</strong>
                  <span>{item.runtime_status || 'unknown'} · {item.risk_level || 'unknown'} · {item.security_posture || 'unknown'}</span>
                  <small>{item.next_action || '进入应用中心查看详情。'}</small>
                </button>
              ))}
              {weakestDimensions.length === 0 && domainAttention.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前没有薄弱面关注项</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="services-section overview-ops-panel">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>领域执行闭环</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把领域对象、任务承接、当前状态和下一步放在一起，让概览页就能判断该先回应用中心还是先回任务中心。
            </p>
          </div>
          <button className="antd-btn" onClick={() => openOverviewTarget({ tab: 'DomainApps' }, onNavigate, onOpenTarget)}>
            <Compass size={14} />
            <span>打开应用中心</span>
          </button>
        </div>

        <div className="overview-mode-grid">
          {domainExecutionCards.map((card) => (
            <article key={card.id} className="overview-mode-card">
              <div className="overview-ops-head">
                <div>
                  <strong>{card.objectTitle}</strong>
                  <small className="overview-mode-role">{card.objectMeta}</small>
                </div>
                <button
                  className="antd-btn small"
                  aria-label={`打开领域闭环对象 ${card.objectTitle}`}
                  onClick={() => openOverviewTarget({ tab: 'DomainApps', taskQuery: card.appQuery }, onNavigate, onOpenTarget)}
                >
                  <ExternalLink size={13} />
                  <span>看对象</span>
                </button>
              </div>

              <div className="overview-mode-links">
                <div className="overview-mode-link">
                  <span>对象状态</span>
                  <strong>{statusText(card.runtimeStatus)} · {statusText(card.securityStatus)}</strong>
                  <small>新鲜度 {card.freshnessStatus}</small>
                </div>
                <div className="overview-mode-link">
                  <span>任务承接</span>
                  <strong>{card.taskTitle}</strong>
                  <small>{card.nextAction}</small>
                </div>
              </div>

              <div className="overview-mode-actions">
                <button
                  className="antd-btn small"
                  aria-label={`打开领域闭环任务 ${card.objectTitle}`}
                  onClick={() => openOverviewTarget({ tab: 'TaskCenter', taskQuery: card.draftQuery }, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={13} />
                  <span>看任务承接</span>
                </button>
              </div>
            </article>
          ))}
          {domainExecutionCards.length === 0 && (
            <div className="home-focus-empty overview-ops-empty">当前没有待承接的领域闭环对象</div>
          )}
        </div>
      </section>

      <section className="services-section overview-ops-panel">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>深链作战入口</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              从概览页直接落到具体维度、具体项目和具体页面补位，少一次回总图再筛选。
            </p>
          </div>
          <button className="antd-btn" onClick={() => openOverviewTarget({ tab: 'SystemMap' }, onNavigate, onOpenTarget)}>
            <FileText size={14} />
            <span>打开系统地图</span>
          </button>
        </div>

        <div className="overview-ops-grid">
          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>薄弱维度</strong>
            </div>
            <div className="overview-ops-list">
              {weakestDimensions.slice(0, 3).map((dimension) => (
                <button
                  key={`deep-dimension-${dimension.id}`}
                  className="overview-ops-item"
                  aria-label={`打开深链维度 ${dimension.title || dimension.id}`}
                  onClick={() => openOverviewTarget({ tab: 'SystemMap', coverageDimensionId: dimension.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{dimension.title || dimension.id}</strong>
                  <span>{dimension.score || 0}% · 缺口 {dimension.failed || 0} · 提醒 {dimension.warning || 0}</span>
                  <small>{dimension.attention_projects?.[0]?.next_action || '进入系统地图维度修复台。'}</small>
                </button>
              ))}
              {weakestDimensions.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前没有薄弱维度</div>
              )}
            </div>
          </article>

          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>优先项目</strong>
            </div>
            <div className="overview-ops-list">
              {priorityProjects.slice(0, 3).map((project) => (
                <button
                  key={`deep-project-${project.id}`}
                  className="overview-ops-item"
                  aria-label={`打开深链项目 ${project.id}`}
                  onClick={() => openOverviewTarget({ tab: 'SystemMap', projectId: project.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{project.id}</strong>
                  <span>{project.layer || '项目'} · {summaryStatusText(project.status)} · {project.score || 0}%</span>
                  <small>{project.next_action || project.primary_gap || '进入项目详情继续处理。'}</small>
                </button>
              ))}
              {priorityProjects.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前没有优先项目</div>
              )}
            </div>
          </article>

          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>页面补位</strong>
            </div>
            <div className="overview-ops-list">
              {pageDrafts.map((draft) => (
                <button
                  key={`deep-page-${draft.id || draft.source?.id}`}
                  className="overview-ops-item"
                  aria-label={`打开深链页面 ${draft.source?.id || draft.id}`}
                  onClick={() => openOverviewTarget(draftTarget(draft), onNavigate, onOpenTarget)}
                >
                  <strong>{draft.source?.id || draft.title || draft.id || '页面草稿'}</strong>
                  <span>{draftSourceLabel(draft.source?.type)} · {draft.priority || 'pending'}</span>
                  <small>{draft.description || '进入页面能力剖面继续补位。'}</small>
                </button>
              ))}
              {pageDrafts.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前没有页面补位项</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="services-section overview-ops-panel">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>功能架构蓝图</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              从页面分组、能力域、使用路径、操作清单到路线图车道，把网站真正提供的功能面和使用面放到同一张图上。
            </p>
          </div>
          <button className="antd-btn" onClick={() => openOverviewTarget({ tab: 'SystemMap' }, onNavigate, onOpenTarget)}>
            <FileText size={14} />
            <span>打开完整蓝图</span>
          </button>
        </div>

        <div className="overview-coverage-grid">
          <button
            className={`overview-coverage-card ${pageGroups.length > 0 ? 'online' : 'degraded'}`}
            aria-label="打开功能架构卡片 页面分组"
            onClick={() => openOverviewTarget({ tab: pageGroups[0]?.pages[0]?.id || 'SystemMap' }, onNavigate, onOpenTarget)}
          >
            <span>页面分组</span>
            <strong>{pageGroups.length}</strong>
            <small>共 {cockpitPages.length} 页 · 首层入口 {pageGroups[0]?.group || '待补齐'}</small>
          </button>
          <button
            className={`overview-coverage-card ${featureDomains.length > 0 ? 'online' : 'degraded'}`}
            aria-label="打开功能架构卡片 能力域"
            onClick={() => openOverviewTarget({ tab: 'SystemMap', featureDomainId: featureDomains[0]?.id || null }, onNavigate, onOpenTarget)}
          >
            <span>能力域</span>
            <strong>{featureDomains.length}</strong>
            <small>native / mounted 一起看 · 热点 {featureDomains[0]?.title || '待补齐'}</small>
          </button>
          <button
            className={`overview-coverage-card ${usagePaths.length > 0 ? 'online' : 'degraded'}`}
            aria-label="打开功能架构卡片 使用路径"
            onClick={() => openOverviewTarget({ tab: 'SystemMap', usagePathId: usagePaths[0]?.id || null }, onNavigate, onOpenTarget)}
          >
            <span>使用路径</span>
            <strong>{usagePaths.length}</strong>
            <small>高频入口 {usagePaths[0]?.title || '待补齐'} · 把页面串成任务流</small>
          </button>
          <button
            className={`overview-coverage-card ${playbooks.length > 0 ? 'online' : 'degraded'}`}
            aria-label="打开功能架构卡片 操作清单"
            onClick={() => openOverviewTarget(playbooks[0] ? playbookTarget(playbooks[0]) : { tab: 'TaskCenter' }, onNavigate, onOpenTarget)}
          >
            <span>操作清单</span>
            <strong>{playbooks.length}</strong>
            <small>代表清单 {playbooks[0]?.title || '待补齐'} · 从意图落到动作</small>
          </button>
          <button
            className={`overview-coverage-card ${roadmapLanes.length > 0 ? 'online' : 'degraded'}`}
            aria-label="打开功能架构卡片 路线图车道"
            onClick={() => openOverviewTarget({ tab: 'SystemMap' }, onNavigate, onOpenTarget)}
          >
            <span>路线图车道</span>
            <strong>{roadmapLanes.length}</strong>
            <small>当前车道 {roadmapLanes.map((lane) => lane.title).slice(0, 2).join(' · ') || '待补齐'}</small>
          </button>
        </div>

        <div className="overview-ops-grid">
          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>页面与入口分层</strong>
              <button className="antd-btn small" aria-label="打开功能架构到首页" onClick={() => openOverviewTarget({ tab: 'Home', taskQuery: focusTaskQuery || 'architecture' }, onNavigate, onOpenTarget)}>
                <Layers size={13} />
                <span>回首页</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {pageGroups.slice(0, 4).map((group) => (
                <button
                  key={group.group}
                  className="overview-ops-item"
                  aria-label={`打开页面分组 ${group.group}`}
                  onClick={() => openOverviewTarget({ tab: group.pages[0]?.id || 'SystemMap' }, onNavigate, onOpenTarget)}
                >
                  <strong>{group.group}</strong>
                  <span>{group.count} 页 · {group.pages[0]?.title || '未命名页面'}</span>
                  <small>{group.pages.slice(0, 3).map((page) => page.title).join(' · ') || '进入该分层查看页面。'}</small>
                </button>
              ))}
              {pageGroups.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前还没有页面分组摘要</div>
              )}
            </div>
          </article>

          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>能力域与使用路径</strong>
              <button className="antd-btn small" aria-label="打开功能架构到系统地图" onClick={() => openOverviewTarget({ tab: 'SystemMap', featureDomainId: featureDomains[0]?.id || null, usagePathId: usagePaths[0]?.id || null }, onNavigate, onOpenTarget)}>
                <Compass size={13} />
                <span>去能力地图</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {featureDomains.slice(0, 3).map((domain) => (
                <button
                  key={`overview-domain-${domain.id}`}
                  className="overview-ops-item"
                  aria-label={`打开能力域 ${domain.title || domain.id}`}
                  onClick={() => openOverviewTarget({ tab: 'SystemMap', featureDomainId: domain.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{domain.title || domain.id}</strong>
                  <span>{domain.cockpit_page || 'SystemMap'} · {domain.providers?.length || 0} 个提供者</span>
                  <small>{domain.capability_items?.slice(0, 3).join(' · ') || domain.english || '进入能力域剖面查看详情。'}</small>
                </button>
              ))}
              {usagePaths.slice(0, 2).map((path) => (
                <button
                  key={`overview-usage-${path.id}`}
                  className="overview-ops-item"
                  aria-label={`打开使用路径 ${path.title || path.id}`}
                  onClick={() => openOverviewTarget({ tab: 'SystemMap', usagePathId: path.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{path.title || path.id}</strong>
                  <span>{path.pages?.length || 0} 页 · {path.steps?.length || 0} 步</span>
                  <small>{path.intent || '进入使用路径工作台查看落点。'}</small>
                </button>
              ))}
              {featureDomains.length === 0 && usagePaths.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前还没有能力域和使用路径摘要</div>
              )}
            </div>
          </article>

          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>操作清单与路线图</strong>
              <button className="antd-btn small" aria-label="打开功能架构到任务中心" onClick={() => openOverviewTarget({ tab: 'TaskCenter', taskQuery: playbooks[0]?.title || usagePaths[0]?.title || 'architecture' }, onNavigate, onOpenTarget)}>
                <ClipboardCheck size={13} />
                <span>去任务中心</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {playbooks.slice(0, 3).map((playbook) => (
                <button
                  key={`overview-playbook-${playbook.id}`}
                  className="overview-ops-item"
                  aria-label={`打开操作清单 ${playbook.title || playbook.id}`}
                  onClick={() => openOverviewTarget(playbookTarget(playbook), onNavigate, onOpenTarget)}
                >
                  <strong>{playbook.title || playbook.id}</strong>
                  <span>{playbook.frequency || 'on-demand'} · {playbook.owner || 'operator'}</span>
                  <small>{playbook.goal || '进入操作清单继续执行。'}</small>
                </button>
              ))}
              {roadmapLanes.slice(0, 3).map((lane) => (
                <button
                  key={`overview-roadmap-${lane.id}`}
                  className="overview-ops-item"
                  aria-label={`打开路线图车道 ${lane.title}`}
                  onClick={() => openOverviewTarget({ tab: 'SystemMap' }, onNavigate, onOpenTarget)}
                >
                  <strong>{lane.title}</strong>
                  <span>{lane.count} 项</span>
                  <small>进入系统地图路线图区域继续细看优先级和阶段。</small>
                </button>
              ))}
              {playbooks.length === 0 && roadmapLanes.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前还没有操作清单和路线图摘要</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="services-section overview-ops-panel">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>运行总面</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把服务态势、项目风险、修复命令和登记表放到一处，减少来回切页才知道下一步的成本。
            </p>
          </div>
          <button className="antd-btn" onClick={() => void load()}>
            <RefreshCw size={14} />
            <span>刷新总面</span>
          </button>
        </div>

        <div className="overview-ops-grid">
          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>服务态势</strong>
              <button className="antd-btn small" aria-label="打开运行总面到性能页" onClick={() => openOverviewTarget({ tab: 'Performance', taskQuery: unstableRuntime[0]?.name || focusTaskQuery || 'Overview' }, onNavigate, onOpenTarget)}>
                <ExternalLink size={13} />
                <span>去性能页</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {unstableRuntime.slice(0, 4).map((service) => (
                <button
                  key={service.name}
                  className="overview-ops-item"
                  aria-label={`查看运行服务 ${service.name}`}
                  onClick={() => openOverviewTarget({ tab: 'Performance', taskQuery: service.name }, onNavigate, onOpenTarget)}
                >
                  <strong>{service.name}</strong>
                  <span>{statusText(service.status)} · CPU {service.cpu ?? 0}% · 内存 {service.memory ?? 0}%</span>
                  <small>运行时间 {service.uptime || '—'}</small>
                </button>
              ))}
              {unstableRuntime.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前运行态没有明显异常服务</div>
              )}
            </div>
          </article>

          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>项目关注</strong>
              <button className="antd-btn small" aria-label="打开运行总面到系统地图" onClick={() => openOverviewTarget({ tab: 'SystemMap', projectId: priorityProjects[0]?.id || null }, onNavigate, onOpenTarget)}>
                <FileText size={13} />
                <span>去系统地图</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {priorityProjects.slice(0, 4).map((project) => (
                <button
                  key={project.id}
                  className="overview-ops-item"
                  aria-label={`查看项目关注 ${project.id}`}
                  onClick={() => openOverviewTarget({ tab: 'SystemMap', projectId: project.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{project.id}</strong>
                  <span>{project.layer || '项目'} · {summaryStatusText(project.status)} · {project.score || 0}%</span>
                  <small>{project.next_action || project.primary_gap || '进入系统地图查看详情。'}</small>
                </button>
              ))}
              {priorityProjects.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前没有优先项目关注项</div>
              )}
            </div>
          </article>

          <article className="overview-ops-column">
            <div className="overview-ops-head">
              <strong>修复动作</strong>
              <button className="antd-btn small" aria-label="打开运行总面到日志页" onClick={() => openOverviewTarget({ tab: 'LogViewer', taskQuery: triageActions[0]?.projectId || unstableRuntime[0]?.name || 'Overview' }, onNavigate, onOpenTarget)}>
                <Zap size={13} />
                <span>去日志页</span>
              </button>
            </div>
            <div className="overview-ops-list">
              {triageActions.map(({ projectId, cockpitPage, role, command }) => (
                <div key={`${projectId}-${command.id}`} className="overview-ops-command">
                  <div>
                    <strong>{projectId}</strong>
                    <span>{role}</span>
                    <small>{command.reason || command.label}</small>
                  </div>
                  <div className="overview-ops-command-actions">
                    <button className="antd-btn small" onClick={() => openOverviewTarget({ tab: cockpitPage, taskQuery: projectId }, onNavigate, onOpenTarget)}>
                      <ExternalLink size={13} />
                      <span>入口</span>
                    </button>
                    <button
                      className="antd-btn small"
                      aria-label={`复制动作 ${projectId} ${command.label}`}
                      onClick={() => void copyText(command.value)}
                    >
                      <Copy size={13} />
                      <span>{command.label}</span>
                    </button>
                  </div>
                </div>
              ))}
              {triageActions.length === 0 && (
                <div className="home-focus-empty overview-ops-empty">当前没有可复制的修复动作</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="services-section overview-ops-panel">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>登记服务表</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              直接看服务登记、端口监听和健康状态，确认问题是在注册层、运行层还是验证层。
            </p>
          </div>
          <span className={`status-badge ${servicesNeedingAttention.length > 0 ? 'degraded' : 'online'}`}>
            显示 {filteredRegistry.length}/{state.registry.length} · 待关注 {servicesNeedingAttention.length}
          </span>
        </div>

        <section role="region" aria-label="登记服务筛选" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px auto', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="search"
            className="antd-input"
            aria-label="搜索登记服务"
            placeholder="服务名、类型、层级或端口"
            value={registryQuery}
            onChange={(event) => setRegistryQuery(event.target.value)}
          />
          <select className="antd-input" aria-label="按健康状态筛选登记服务" value={registryStatusFilter} onChange={(event) => setRegistryStatusFilter(event.target.value as typeof registryStatusFilter)}>
            <option value="all">全部健康状态</option>
            <option value="online">健康</option>
            <option value="degraded">观察</option>
            <option value="offline">离线</option>
          </select>
          {(registryQuery || registryStatusFilter !== 'all') && (
            <button type="button" className="antd-btn" aria-label="清除登记服务筛选" onClick={() => { setRegistryQuery(''); setRegistryStatusFilter('all'); }}>
              清除筛选
            </button>
          )}
          <span className="text-muted" style={{ fontSize: 12, gridColumn: '1 / -1' }}>当前显示 {filteredRegistry.length} 条登记服务，可直接进入性能页查看对象详情。</span>
        </section>

        <div style={{ overflowX: 'auto' }}>
          <table className="services-table">
            <thead>
              <tr>
                <th>服务</th>
                <th>层级</th>
                <th>类型</th>
                <th>端口</th>
                <th>状态</th>
                <th>健康</th>
                <th>监听</th>
                <th>操作</th>
            </tr>
            </thead>
            <tbody>
              {filteredRegistry.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>当前筛选下没有登记服务</td></tr>
              ) : filteredRegistry.map((service) => (
                <tr key={`${service.name}-${service.port || 'none'}`}>
                  <td>{service.name}</td>
                  <td>{service.layer || '—'}</td>
                  <td>{service.type || '—'}</td>
                  <td>{service.port || '—'}</td>
                  <td>
                    <span className={`status-badge ${badgeClass(service.status)}`}>{statusText(service.status)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${badgeClass(service.health || service.status)}`}>{statusText(service.health || service.status)}</span>
                  </td>
                  <td>{service.port_listening === undefined ? '—' : service.port_listening ? '是' : '否'}</td>
                  <td>
                    <button
                      type="button"
                      className="antd-btn small"
                      aria-label={`查看登记服务 ${service.name}`}
                      onClick={() => openOverviewTarget({ tab: 'Performance', taskQuery: service.name }, onNavigate, onOpenTarget)}
                    >
                      <ExternalLink size={13} />
                      <span>查看</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {weakestDimensions.length > 0 && (
          <div className="overview-weak-dimensions">
            {weakestDimensions.map((dimension) => (
              <button
                key={dimension.id}
                className="overview-weak-dimension"
                aria-label={`查看弱项维度 ${dimension.title || dimension.id}`}
                onClick={() => openOverviewTarget({ tab: 'SystemMap', coverageDimensionId: dimension.id }, onNavigate, onOpenTarget)}
              >
                <strong>{dimension.title || dimension.id}</strong>
                <span>{dimension.score || 0}% · 缺口 {dimension.failed || 0} · 提醒 {dimension.warning || 0}</span>
                <small>{dimension.attention_projects?.[0]?.next_action || '进入系统地图修复台查看详情。'}</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
