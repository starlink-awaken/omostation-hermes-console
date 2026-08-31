import React, { useEffect, useMemo, useState } from 'react';
import {
  AppWindow,
  CheckCircle,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileText,
  Map,
  Play,
  RefreshCw,
  Route,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import './Dashboard.css';
import GovernanceDomainWorkbench from './GovernanceDomainWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { type CockpitNavigationTarget } from './cockpitNavigation';
import { apiFetch, apiPost } from '../api/client';

type DomainApp = {
  id: string;
  name: string;
  domain: { id: string; name: string };
  kind: string;
  integration_mode: string;
  layer: string;
  risk_level: 'low' | 'medium' | 'high' | string;
  health: string;
  runtime: {
    status: string;
    launch: { status: string; url?: string | null; checked: boolean; port?: number };
    api: { status: string; url?: string | null; checked: boolean; port?: number };
  };
  warnings: string[];
  paths: {
    ssot_root?: { path: string; exists: boolean; updated_at?: string | null } | null;
    app_root?: { path: string; exists: boolean; updated_at?: string | null } | null;
  };
  links: { launch_url?: string | null; api_url?: string | null };
  actions: {
    id: string;
    label: string;
    kind: 'open_url' | 'internal_link' | 'copy_command' | string;
    value: string;
    enabled: boolean;
    risk: string;
    guard: string;
  }[];
  security_gates: {
    id: string;
    level: string;
    title: string;
    detail: string;
  }[];
  security_checks: {
    id: string;
    status: string;
    level: string;
    title: string;
    detail: string;
    evidence: string;
    next_action: string;
    blocking: boolean;
    source?: { path: string; exists: boolean; is_dir?: boolean; updated_at?: string | null } | null;
  }[];
  security_summary: {
    posture: string;
    total: number;
    passed: number;
    warn: number;
    failed: number;
    blocking: number;
    attention: number;
    high_risk_open: number;
  };
  commands: { start?: string | null; verify: string[] };
  capabilities: { read: string[]; write: string[] };
  auth: Record<string, string>;
  freshness: Record<string, string | null | undefined>;
  notes: string[];
};

type DomainAppsPayload = {
  strategy: string;
  summary: {
    total: number;
    ready: number;
    needs_attention: number;
    running: number;
    stopped: number;
    high_risk: number;
    external_mounts: number;
    security_passed: number;
    security_warn: number;
    security_failed: number;
    security_blocking: number;
    security_attention_apps: number;
  };
  items: DomainApp[];
};

type DomainBuildProject = {
  id: string;
  layer?: string;
  cockpit_page?: string;
  status?: string;
  score?: number;
  primary_gap?: string;
  next_action?: string;
};

type DomainBuildRoadmapItem = {
  id: string;
  priority?: string;
  status?: string;
  title?: string;
  cockpit_page?: string;
  problem?: string;
};

type DomainBuildRow = {
  id: string;
  kind: 'project' | 'roadmap';
  title: string;
  meta: string;
  summary: string;
  nextAction: string;
  statusClass: string;
  entryTarget: CockpitNavigationTarget;
  coverageTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

type OpcWorkspace = {
  exists: boolean;
  ssot_root: string;
  updated_at?: string | null;
  positioning?: { title: string; summary: string };
  weekly_priorities: { title: string; detail: string }[];
  content_calendar: {
    week: Record<string, string>[];
    ideas: Record<string, string>[];
  };
  metrics: { name: string; items: Record<string, string>[] }[];
  product_portfolio: {
    matrix: Record<string, string>[];
    pipeline: Record<string, string>[];
    revenue: Record<string, string>[];
  };
  source_paths?: Record<string, string>;
};

/** Minimal system-map payload shape needed for domain-build rows. */
type SystemMapPayload = {
  cockpit_pages?: Array<{ id?: string; title?: string }>;
  project_portfolio?: {
    priority_projects?: DomainBuildProject[];
  };
  roadmap?: {
    items?: DomainBuildRoadmapItem[];
  };
};

const EMPTY_OPC_WORKSPACE: OpcWorkspace = {
  exists: false,
  ssot_root: '@OPC',
  positioning: { title: 'OPC', summary: 'OPC 工作区当前不可用，领域应用清单仍可独立查看。' },
  weekly_priorities: [],
  content_calendar: { week: [], ideas: [] },
  metrics: [],
  product_portfolio: { matrix: [], pipeline: [], revenue: [] },
};

type DomainAttentionFilter = 'all' | 'runtime' | 'security' | 'high_risk';

type DomainAttentionItem = {
  app: DomainApp;
  reasons: string[];
  nextAction: string;
  filterTags: DomainAttentionFilter[];
};

type DomainRouteCard = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  entryValue: string;
  ssotValue: string;
  handoffValue: string;
  nextAction: string;
  primaryActionLabel: string;
  primaryAction: () => void;
  secondaryActionLabel: string;
  secondaryAction?: () => void;
  launchUrl?: string | null;
};

const DOMAIN_SURFACE_PAGE_IDS = new Set(['DomainApps', 'QuestBoard', 'L4Health', 'Settings']);

const healthLabels: Record<string, string> = {
  ready: '就绪',
  needs_build: '待构建',
  needs_attention: '需关注',
  missing: '缺失',
};

const runtimeLabels: Record<string, string> = {
  running: '运行中',
  stopped: '未运行',
  not_applicable: '无需运行',
  listening: '监听中',
  closed: '未监听',
  internal_route: '内置接口',
  external_unchecked: '外部未探测',
  not_configured: '未配置',
};

function badgeClass(value: string): string {
  if (value === 'ready' || value === 'built' || value === 'ssot_present' || value === 'low' || value === 'running' || value === 'listening' || value === 'internal_route' || value === 'passed') return 'online';
  if (value === 'missing' || value === 'high' || value === 'stopped' || value === 'closed' || value === 'failed' || value === 'blocked') return 'offline';
  return 'degraded';
}

function riskText(value: string): string {
  if (value === 'high') return '高风险';
  if (value === 'medium') return '中风险';
  if (value === 'low') return '低风险';
  return value;
}

function securityText(value: string): string {
  if (value === 'passed') return '通过';
  if (value === 'warn') return '警告';
  if (value === 'failed') return '失败';
  if (value === 'attention') return '需处理';
  if (value === 'blocked') return '阻断';
  return value;
}

function shortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function nextActionForApp(app: DomainApp): string {
  const blockingCheck = app.security_checks.find((check) => check.blocking);
  if (blockingCheck?.next_action) return blockingCheck.next_action;
  const failedCheck = app.security_checks.find((check) => check.status === 'failed' || check.status === 'warn');
  if (failedCheck?.next_action) return failedCheck.next_action;
  if (app.warnings[0]) return app.warnings[0];
  if (app.runtime.status === 'stopped') return app.commands.start || '拉起服务或确认该应用只需要按需启动。';
  return app.notes[0] || '进入应用详情继续处理。';
}

function contractStatusText(ready: boolean, missingLabel: string): string {
  return ready ? '已登记' : missingLabel;
}

function capabilityText(app: DomainApp): string {
  const readCount = app.capabilities.read.length;
  const writeCount = app.capabilities.write.length;
  return `读 ${readCount} · 写 ${writeCount}`;
}

function entryText(app: DomainApp): string {
  const launch = app.links.launch_url || app.runtime.launch.url;
  const api = app.links.api_url || app.runtime.api.url;
  if (launch && api) return '应用 / API';
  if (launch) return '应用';
  if (api) return 'API';
  return '未登记';
}

function verifyText(app: DomainApp): string {
  if (app.commands.verify.length === 0) return '未登记';
  if (app.commands.verify.length === 1) return '1 条命令';
  return `${app.commands.verify.length} 条命令`;
}

function attentionReasons(app: DomainApp): string[] {
  const reasons: string[] = [];
  if (app.runtime.status === 'stopped') reasons.push('待启动');
  if (app.security_summary.posture !== 'passed') reasons.push(`安全${securityText(app.security_summary.posture)}`);
  if (app.risk_level === 'high') reasons.push('高风险');
  if (app.health !== 'ready') reasons.push(`健康${healthLabels[app.health] || app.health}`);
  return reasons;
}

function DomainActionButtons({
  actions,
  onQueueAction,
  onExecuteVerification,
  isActionPending,
  verificationPending = false,
}: {
  actions: DomainApp['actions'];
  onQueueAction?: (action: DomainApp['actions'][number]) => void;
  onExecuteVerification?: (action: DomainApp['actions'][number]) => void;
  isActionPending?: (action: DomainApp['actions'][number]) => boolean;
  verificationPending?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
      {actions.map((action) => (
        action.kind === 'copy_command' ? (
          <React.Fragment key={action.id}>
            <button className="antd-btn" onClick={() => void copyText(action.value)} title={action.guard}>
              <Copy size={14} />
              <span>{action.label}</span>
            </button>
            {onQueueAction && action.enabled && (
              <button
                className="antd-btn"
                aria-label={`登记领域应用动作 ${action.label}`}
                onClick={() => onQueueAction(action)}
                disabled={isActionPending?.(action)}
                title="登记为 OMO 计划任务，不会直接执行命令"
              >
                <ClipboardCheck size={14} />
                <span>{isActionPending?.(action) ? '登记中...' : '登记任务'}</span>
              </button>
            )}
            {onExecuteVerification && action.id === 'copy-verify' && action.enabled && (
              <button
                className="antd-btn antd-btn-primary"
                aria-label={`执行领域应用验证 ${action.label}`}
                onClick={() => onExecuteVerification(action)}
                disabled={verificationPending}
                title="仅执行登记的低风险验证命令，并写入 OMO 证据"
              >
                <Play size={14} />
                <span>{verificationPending ? '验证中...' : '执行验证'}</span>
              </button>
            )}
          </React.Fragment>
        ) : (
          <a
            key={action.id}
            className={action.id === 'open' ? 'antd-btn antd-btn-primary' : 'antd-btn'}
            href={action.value}
            target={action.value.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            title={action.guard}
          >
            {action.kind === 'internal_link' ? <FileText size={14} /> : <ExternalLink size={14} />}
            <span>{action.label}</span>
          </a>
        )
      ))}
    </div>
  );
}

function DataTable({ rows, empty }: { rows: Record<string, string>[]; empty: string }) {
  const headers = useMemo(() => Object.keys(rows[0] || {}), [rows]);
  if (rows.length === 0) {
    return <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{empty}</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="services-table">
        <thead>
          <tr>
            {headers.map((header) => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${Object.values(row).join('-')}`}>
              {headers.map((header) => <td key={header}>{row[header] || '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DomainAppCard({
  app,
  focused = false,
  onQueueAction,
  onExecuteVerification,
  isActionPending,
  verificationPending = false,
}: {
  app: DomainApp;
  focused?: boolean;
  onQueueAction?: (action: DomainApp['actions'][number]) => void;
  onExecuteVerification?: (action: DomainApp['actions'][number]) => void;
  isActionPending?: (action: DomainApp['actions'][number]) => boolean;
  verificationPending?: boolean;
}) {
  return (
    <article
      id={`domain-app-${app.id}`}
      className={`stat-card domain-app-card ${focused ? 'domain-app-card-focused' : ''}`}
      style={{ alignItems: 'stretch', minHeight: 260 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <div className={`stat-icon-wrapper pulse-${app.health === 'ready' ? 'success' : 'accent'}`} aria-hidden="true">
            <AppWindow size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{app.name}</h3>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>{app.domain.name} · {app.integration_mode}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <span className={`status-badge ${badgeClass(app.health)}`}>
            {app.health === 'ready' ? <CheckCircle size={13} /> : <ShieldAlert size={13} />}
            <span style={{ marginLeft: 4 }}>{healthLabels[app.health] || app.health}</span>
          </span>
          <span className={`status-badge ${badgeClass(app.runtime.status)}`}>{runtimeLabels[app.runtime.status] || app.runtime.status}</span>
          <span className={`status-badge ${badgeClass(app.risk_level)}`}>{riskText(app.risk_level)}</span>
          <span className={`status-badge ${badgeClass(app.security_summary.posture)}`}>{securityText(app.security_summary.posture)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 16, fontSize: 13 }}>
        <div><strong>类型：</strong>{app.kind}</div>
        <div><strong>认证：</strong>{app.auth.type || '—'}</div>
        <div><strong>运行探针：</strong>{runtimeLabels[app.runtime.launch.status] || app.runtime.launch.status} / {runtimeLabels[app.runtime.api.status] || app.runtime.api.status}</div>
        <div><strong>数据新鲜度：</strong>{String(app.freshness.status || '—')} · {shortDate(app.freshness.updated_at)}</div>
        <div title={app.paths.ssot_root?.path || app.paths.app_root?.path || ''}>
          <strong>边界：</strong>{app.layer}
        </div>
      </div>

      <DomainActionButtons
        actions={app.actions}
        onQueueAction={onQueueAction}
        onExecuteVerification={onExecuteVerification}
        isActionPending={isActionPending}
        verificationPending={verificationPending}
      />

      <div className="domain-security-panel">
        <div className="domain-security-head">
          <strong>安全门</strong>
          <span>
            通过 {app.security_summary.passed} · 警告 {app.security_summary.warn} · 失败 {app.security_summary.failed}
          </span>
        </div>
        <div className="domain-security-checks">
          {app.security_checks.map((check) => (
            <div key={check.id} className={`domain-security-check ${badgeClass(check.status)}`}>
              <span className={`status-badge ${badgeClass(check.status)}`}>{securityText(check.status)}</span>
              <div>
                <strong>{check.title}</strong>
                <small>{check.evidence}</small>
                <small>下一步：{check.next_action}</small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {app.security_gates.length > 0 && (
        <div className="domain-app-gates">
          {app.security_gates.map((gate) => (
            <div key={gate.id} className="domain-app-gate">
              <span className={`status-badge ${badgeClass(gate.level)}`}>{riskText(gate.level)}</span>
              <div>
                <strong>{gate.title}</strong>
                <small>{gate.detail}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {app.warnings.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(245, 158, 11, 0.08)',
            color: 'var(--antd-warning)',
            fontSize: 13,
          }}
        >
          <AlertTriangleText items={app.warnings} />
        </div>
      )}
    </article>
  );
}

function AlertTriangleText({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <ShieldAlert size={16} className="text-warning" />
      <span>{items.join(' · ')}</span>
    </div>
  );
}

interface DomainAppsViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  taskQuery?: string;
}

function matchesDomainApp(app: DomainApp, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return [app.id, app.name, app.domain.id, app.domain.name]
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

function domainBuildStatusClass(value?: string): string {
  if (!value) return 'degraded';
  if (value === 'healthy' || value === 'ready' || value === 'shipped') return 'online';
  if (value === 'watch' || value === 'at_risk' || value === 'planned' || value === 'active') return 'degraded';
  if (value === 'blocked' || value === 'failed') return 'offline';
  return 'degraded';
}

export default function DomainAppsView({ onNavigate, onOpenTarget, taskQuery }: DomainAppsViewProps) {
  const [apps, setApps] = useState<DomainAppsPayload | null>(null);
  const [opc, setOpc] = useState<OpcWorkspace | null>(null);
  const [domainBuildRows, setDomainBuildRows] = useState<DomainBuildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attentionFilter, setAttentionFilter] = useState<DomainAttentionFilter>('all');
  const [appQuery, setAppQuery] = useState('');
  const [appDomainFilter, setAppDomainFilter] = useState('all');
  const [appRuntimeFilter, setAppRuntimeFilter] = useState('all');
  const [focusedAppId, setFocusedAppId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPendingKey, setActionPendingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [appsResult, opcResult, systemMapResult] = await Promise.allSettled([
        apiFetch<DomainAppsPayload>('/api/domain-apps'),
        apiFetch<OpcWorkspace>('/api/opc/workspace'),
        apiFetch<SystemMapPayload>('/api/cockpit/system-map'),
      ]);
      const failures: string[] = [];
      if (appsResult.status !== 'fulfilled' || !appsResult.value.ok) {
        failures.push(appsResult.status === 'fulfilled' ? (appsResult.value.error || '领域应用清单读取失败') : '领域应用清单读取失败');
      }
      if (opcResult.status !== 'fulfilled' || !opcResult.value.ok) {
        failures.push(opcResult.status === 'fulfilled' ? (opcResult.value.error || 'OPC 工作区读取失败') : 'OPC 工作区读取失败');
      }
      if (systemMapResult.status !== 'fulfilled' || !systemMapResult.value.ok) {
        failures.push('系统地图补充数据读取失败');
      }
      if (failures.length > 0) setError(failures.join('；'));
      if (appsResult.status !== 'fulfilled' || !appsResult.value.ok) {
        throw new Error(failures[0] || '领域应用清单读取失败');
      }
      const systemMapPayload = systemMapResult.status === 'fulfilled' && systemMapResult.value.ok ? systemMapResult.value.data : null;
      const pagesById = new globalThis.Map<string, { id: string; title?: string }>(
        ((systemMapPayload?.cockpit_pages || []) as Array<{ id?: string; title?: string }>)
          .filter((page): page is { id: string; title?: string } => Boolean(page.id))
          .map((page) => [page.id, page] as const),
      );
      const projectRows = ((systemMapPayload?.project_portfolio?.priority_projects || []) as DomainBuildProject[])
        .filter((project) => project.cockpit_page && DOMAIN_SURFACE_PAGE_IDS.has(project.cockpit_page))
        .slice(0, 4)
        .map((project) => {
          const page = pagesById.get(project.cockpit_page || '');
          return {
            id: `domain-build-project-${project.id}`,
            kind: 'project' as const,
            title: project.id,
            meta: `${project.layer || '项目'} · 入口 ${page?.title || project.cockpit_page || '系统地图'} · ${project.score ?? 0}%`,
            summary: project.primary_gap || project.next_action || '先回项目覆盖面确认领域入口、任务和安全门是否接通。',
            nextAction: project.next_action || '先从项目面确认领域相关项目的下一步。',
            statusClass: domainBuildStatusClass(project.status),
            entryTarget: { tab: project.cockpit_page || 'DomainApps' },
            coverageTarget: { tab: 'SystemMap', projectId: project.id },
            taskTarget: { tab: 'TaskCenter', taskQuery: project.id },
          };
        });
      const roadmapRows = ((systemMapPayload?.roadmap?.items || []) as DomainBuildRoadmapItem[])
        .filter((item) => item.cockpit_page && DOMAIN_SURFACE_PAGE_IDS.has(item.cockpit_page) && item.status !== 'shipped')
        .slice(0, 4)
        .map((item) => {
          const page = pagesById.get(item.cockpit_page || '');
          return {
            id: `domain-build-roadmap-${item.id}`,
            kind: 'roadmap' as const,
            title: item.title || item.id,
            meta: `${item.priority || '路线图'} · 入口 ${page?.title || item.cockpit_page || '系统地图'} · ${item.status || 'planned'}`,
            summary: item.problem || '先确认这条领域路线图应该落在哪个入口页和任务收口面。',
            nextAction: item.problem || '进入系统地图继续看路线图承接。',
            statusClass: domainBuildStatusClass(item.status),
            entryTarget: { tab: item.cockpit_page || 'DomainApps' },
            coverageTarget: { tab: 'SystemMap', pageId: item.cockpit_page || 'DomainApps' },
            taskTarget: { tab: 'TaskCenter', taskQuery: item.id || item.title || 'roadmap' },
          };
        });
      setApps(appsResult.value.data);
      setOpc(opcResult.status === 'fulfilled' && opcResult.value.ok ? opcResult.value.data : EMPTY_OPC_WORKSPACE);
      setDomainBuildRows([...projectRows, ...roadmapRows]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '领域应用数据读取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 首次挂载时从后端加载领域应用及其运行态。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  useEffect(() => {
    // 外部数据或导航查询变化时，保持聚焦对象与当前列表一致。
    if (!apps?.items.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusedAppId(null);
      return;
    }
    const matchedApp = apps.items.find((app) => matchesDomainApp(app, taskQuery || ''));
    if (matchedApp) {
      setFocusedAppId(matchedApp.id);
      return;
    }
    setFocusedAppId((current) => {
      if (current && apps.items.some((app) => app.id === current)) return current;
      const attentionFallback = apps.items.find((app) => attentionReasons(app).length > 0);
      return attentionFallback?.id || apps.items[0]?.id || null;
    });
  }, [apps, taskQuery]);

  const attentionItems = useMemo<DomainAttentionItem[]>(() => {
    if (!apps) return [];
    return apps.items
      .filter((app) => {
        const query = appQuery.trim().toLowerCase();
        if (appDomainFilter !== 'all' && app.domain.id !== appDomainFilter) return false;
        if (appRuntimeFilter !== 'all' && app.runtime.status !== appRuntimeFilter) return false;
        if (!query) return true;
        return [app.id, app.name, app.domain.id, app.domain.name, app.integration_mode]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .map((app) => {
        const reasons = attentionReasons(app);
        if (reasons.length === 0) return null;
        const filterTags: DomainAttentionFilter[] = [];
        if (app.runtime.status === 'stopped') filterTags.push('runtime');
        if (app.security_summary.posture !== 'passed') filterTags.push('security');
        if (app.risk_level === 'high') filterTags.push('high_risk');
        return {
          app,
          reasons,
          nextAction: nextActionForApp(app),
          filterTags,
        };
      })
      .filter((item): item is DomainAttentionItem => Boolean(item));
  }, [appDomainFilter, appQuery, appRuntimeFilter, apps]);

  const filteredApps = useMemo(() => {
    if (!apps) return [];
    const query = appQuery.trim().toLowerCase();
    return apps.items.filter((app) => {
      if (appDomainFilter !== 'all' && app.domain.id !== appDomainFilter) return false;
      if (appRuntimeFilter !== 'all' && app.runtime.status !== appRuntimeFilter) return false;
      if (!query) return true;
      return [app.id, app.name, app.domain.id, app.domain.name, app.integration_mode]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [appDomainFilter, appQuery, appRuntimeFilter, apps]);

  const appDomainOptions = useMemo(
    () => Object.entries((apps?.items || []).reduce<Record<string, string>>((domains, app) => {
      domains[app.domain.id] = app.domain.name;
      return domains;
    }, {})).sort((left, right) => left[1].localeCompare(right[1])),
    [apps],
  );

  const attentionCounts = useMemo(() => ({
    all: attentionItems.length,
    runtime: attentionItems.filter((item) => item.filterTags.includes('runtime')).length,
    security: attentionItems.filter((item) => item.filterTags.includes('security')).length,
    high_risk: attentionItems.filter((item) => item.filterTags.includes('high_risk')).length,
  }), [attentionItems]);

  const filteredAttentionItems = useMemo(() => {
    if (attentionFilter === 'all') return attentionItems;
    return attentionItems.filter((item) => item.filterTags.includes(attentionFilter));
  }, [attentionFilter, attentionItems]);

  const focusedApp = useMemo(
    () => filteredApps.find((app) => app.id === focusedAppId) || null,
    [filteredApps, focusedAppId],
  );

  const openTaskCenter = (query: string) => {
    if (onOpenTarget) {
      onOpenTarget({ tab: 'TaskCenter', taskQuery: query });
      return;
    }
    onNavigate?.('TaskCenter');
  };

  const openSystemMap = () => {
    if (onOpenTarget) {
      onOpenTarget({ tab: 'SystemMap' });
      return;
    }
    onNavigate?.('SystemMap');
  };

  const queueDomainAction = async (app: DomainApp, action: DomainApp['actions'][number]) => {
    const pendingKey = `queue:${app.id}:${action.id}`;
    if (actionPendingKey) return;
    setActionPendingKey(pendingKey);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await apiPost<{ id?: string; detail?: string }>(`/api/cockpit/domain-apps/${app.id}/actions/${action.id}/queue`, {});
      if (!res.ok) throw new Error(res.error || '领域应用动作登记失败');
      setActionNotice(`已登记”${action.label}”，任务中心将负责后续审批与留证。`);
      await load();
      if (res.data?.id) openTaskCenter(res.data.id);
      else setActionError('领域应用动作已返回成功，但没有任务 ID，无法定位后续审批。');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '领域应用动作登记失败');
    } finally {
      setActionPendingKey(null);
    }
  };

  const executeDomainVerification = async (app: DomainApp) => {
    if (!window.confirm(`将执行 ${app.name} 登记的低风险验证命令，并写入 OMO 执行证据。继续吗？`)) return;
    if (actionPendingKey) return;
    setActionPendingKey(`verify:${app.id}`);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await apiPost<{ id?: string; exit_code?: number; detail?: string }>(`/api/cockpit/domain-apps/${app.id}/verify`, {});
      if (!res.ok) throw new Error(res.error || '领域应用验证执行失败');
      setActionNotice(`验证完成：${app.name} exit ${res.data?.exit_code ?? 'unknown'}，已写入任务证据。`);
      await load();
      if (res.data?.id) openTaskCenter(res.data.id);
      else setActionError('验证已返回结果，但没有任务 ID，无法定位执行证据。');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '领域应用验证执行失败');
    } finally {
      setActionPendingKey(null);
    }
  };

  const actionPendingFor = (app: DomainApp, action: DomainApp['actions'][number]) => (
    actionPendingKey === `queue:${app.id}:${action.id}`
  );

  const verificationPendingFor = (app: DomainApp) => actionPendingKey === `verify:${app.id}`;

  const focusSignals = useMemo(() => {
    if (!focusedApp) return [];
    const signals: { id: string; label: string; detail: string }[] = [];
    if (focusedApp.runtime.status === 'stopped') {
      signals.push({
        id: 'runtime',
        label: '运行面未就绪',
        detail: focusedApp.commands.start || '需要拉起服务，或者确认它应该只按需启动。',
      });
    }
    focusedApp.security_checks
      .filter((check) => check.status !== 'passed')
      .slice(0, 3)
      .forEach((check) => {
        signals.push({
          id: check.id,
          label: check.title,
          detail: check.next_action || check.detail,
        });
      });
    if (focusedApp.risk_level === 'high') {
      signals.push({
        id: 'risk',
        label: '高风险挂载',
        detail: '优先检查认证、写入边界和真实数据暴露面，再决定是否继续内嵌。',
      });
    }
    if (signals.length === 0) {
      signals.push({
        id: 'steady',
        label: '当前没有阻断项',
        detail: nextActionForApp(focusedApp),
      });
    }
    return signals.slice(0, 4);
  }, [focusedApp]);

  const focusLaunchUrl = focusedApp?.links.launch_url || focusedApp?.runtime.launch.url || null;
  const focusApiUrl = focusedApp?.links.api_url || focusedApp?.runtime.api.url || null;
  const focusVerifyCommand = focusedApp?.commands.verify?.join('\n') || '';
  const focusCapabilities = focusedApp
    ? [...focusedApp.capabilities.read, ...focusedApp.capabilities.write].filter(Boolean)
    : [];
  const contractSummary = useMemo(() => {
    const items = apps?.items || [];
    return {
      ssotReady: items.filter((app) => app.paths.ssot_root?.exists).length,
      entryReady: items.filter((app) => Boolean(app.links.launch_url || app.runtime.launch.url || app.links.api_url || app.runtime.api.url)).length,
      verifyReady: items.filter((app) => app.commands.verify.length > 0).length,
      authReady: items.filter((app) => Boolean(app.auth.type)).length,
      writeDeclared: items.filter((app) => app.capabilities.write.length > 0).length,
      freshnessReady: items.filter((app) => Boolean(app.freshness.status)).length,
    };
  }, [apps]);

  const domainBuildSummary = useMemo(() => ({
    total: domainBuildRows.length,
    projects: domainBuildRows.filter((row) => row.kind === 'project').length,
    roadmap: domainBuildRows.filter((row) => row.kind === 'roadmap').length,
    attention: domainBuildRows.filter((row) => row.statusClass !== 'online').length,
  }), [domainBuildRows]);

  const domainRouteCards: DomainRouteCard[] = filteredApps.map((app) => {
    const launchUrl = app.links.launch_url || app.runtime.launch.url || app.links.api_url || app.runtime.api.url || null;
    return {
      id: `route-${app.id}`,
      title: app.name,
      subtitle: `${app.domain.name} · ${app.integration_mode}`,
      summary: app.notes[0] || `${app.name} 继续保持 ${app.domain.name} 为事实 SSOT，Cockpit 只负责入口、状态和任务承接。`,
      entryValue: entryText(app),
      ssotValue: app.paths.ssot_root?.path || app.domain.name,
      handoffValue: app.id,
      nextAction: nextActionForApp(app),
      primaryActionLabel: '查看应用剖面',
      primaryAction: () => setFocusedAppId(app.id),
      secondaryActionLabel: '去任务承接',
      secondaryAction: () => openTaskCenter(app.id),
      launchUrl,
    };
  });

  if (opc) {
    domainRouteCards.push({
      id: 'route-opc-workspace-summary',
      title: 'OPC 作战台',
      subtitle: opc.exists ? 'OPC · SSOT 聚合视图' : 'OPC · 待补入口',
      summary: opc.positioning?.summary || 'OPC 保持领域 SSOT，Cockpit 负责入口、状态、周动作和发布承接。',
      entryValue: 'DomainApps / TaskCenter',
      ssotValue: opc.ssot_root || '@OPC',
      handoffValue: opc.weekly_priorities[0]?.title || '本周三件事 / 发布节奏 / 核心指标',
      nextAction: opc.weekly_priorities[0]?.detail || '进入 OPC 作战台整理本周动作和排期。',
      primaryActionLabel: '查看 OPC 作战台',
      primaryAction: () => document.getElementById('opc-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      secondaryActionLabel: '去任务承接',
      secondaryAction: () => openTaskCenter('opc'),
      launchUrl: null,
    });
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在加载领域应用...</p>
      </div>
    );
  }

  if (!apps || !opc) {
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 16,
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(239, 68, 68, 0.08)',
          color: 'var(--antd-error)',
        }}
      >
        <ShieldAlert size={18} />
        <span>{error || '领域应用数据不可用'}</span>
        <button type="button" className="antd-btn" onClick={() => void load()}>
          <RefreshCw size={14} aria-hidden="true" />
          <span>重试领域应用</span>
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <GovernanceDomainWorkbench currentPage="DomainApps" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {error && (
        <div className="system-map-action-feedback error" role="alert">
          <ShieldAlert size={14} />
          <span>{error}</span>
          <button type="button" className="antd-btn small" onClick={() => void load()}>
            <RefreshCw size={13} aria-hidden="true" />
            <span>重试补充数据</span>
          </button>
        </div>
      )}

      <ActionSurfacePanel
        title="领域挂载执行区"
        subtitle="领域应用不只看运行态，直接联动家庭任务、治理和 OPC 作战台。"
        statusText={`ready ${apps.summary.ready} · attention ${apps.summary.security_warn + apps.summary.security_failed}`}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        items={[
          {
            id: 'tasks',
            title: '沉到任务中心',
            detail: '领域应用的安全门或运行问题需要继续跟踪时，回任务中心接住。',
            actionLabel: '去任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
            actionTarget: { tab: 'TaskCenter', taskQuery: taskQuery || filteredApps[0]?.id || 'DomainApps' },
          },
          {
            id: 'l4',
            title: '看域健康',
            detail: '如果问题已经扩散到领域层信号和状态，直接去 L4 健康页确认。',
            actionLabel: '去 L4 健康',
            actionType: 'navigate',
            actionValue: 'L4Health',
            actionTarget: { tab: 'L4Health', taskQuery: taskQuery || filteredApps[0]?.domain.id || filteredApps[0]?.id || 'DomainApps' },
          },
          {
            id: 'knowledge',
            title: '回知识中枢',
            detail: '领域应用经验和规范需要沉淀时，回知识页整理为长期资产。',
            actionLabel: '去知识页',
            actionType: 'navigate',
            actionValue: 'Knowledge',
            actionTarget: { tab: 'Knowledge', taskQuery: taskQuery || filteredApps[0]?.id || 'DomainApps' },
          },
          {
            id: 'copy-opc',
            title: '复制 OPC 周目标模板',
            detail: '给 OPC 作战台整理本周动作时，直接从固定模板起步。',
            actionLabel: '复制模板',
            actionType: 'copy',
            actionValue: '本周三件事 / 发布节奏 / 核心指标 / 风险与下一步',
          },
        ]}
      />

      {(actionNotice || actionError) && (
        <div
          className={`system-map-action-feedback ${actionError ? 'error' : 'success'}`}
          role={actionError ? 'alert' : 'status'}
          style={{ marginTop: 16 }}
        >
          {actionError || actionNotice}
        </div>
      )}

      <section className="services-section" aria-label="领域承接路径" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>领域承接路径</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把 Cockpit 入口、领域 SSOT、运行对象和任务承接页连成一条线，避免从 Dashboard 跳进来后还得自己猜下一步。
            </p>
          </div>
          <span className={`status-badge ${domainRouteCards.length > 1 ? 'online' : 'degraded'}`}>
            已编排 {domainRouteCards.length} 条
          </span>
        </div>

        <div className="domain-route-grid">
          {domainRouteCards.map((card) => (
            <article key={card.id} className="domain-route-card">
              <div className="domain-route-head">
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.subtitle}</p>
                </div>
                <button
                  className="antd-btn small"
                  aria-label={`打开领域承接 ${card.title}`}
                  onClick={card.primaryAction}
                >
                  <FileText size={13} />
                  <span>{card.primaryActionLabel}</span>
                </button>
              </div>

              <p className="domain-route-summary">{card.summary}</p>

              <div className="domain-route-links">
                <div className="domain-route-link">
                  <span>Cockpit 入口</span>
                  <strong>{card.entryValue}</strong>
                  <small>入口页先负责挂载、状态和跳转，不直接接管领域真数据。</small>
                </div>
                <div className="domain-route-link">
                  <span>领域 SSOT</span>
                  <strong>{card.ssotValue}</strong>
                  <small>真实内容和结构继续留在领域侧，Cockpit 只读聚合或有限写回。</small>
                </div>
                <div className="domain-route-link">
                  <span>任务承接</span>
                  <strong>{card.handoffValue}</strong>
                  <small>{card.nextAction}</small>
                </div>
              </div>

              <div className="domain-route-actions">
                {card.secondaryAction ? (
                  <button
                    className="antd-btn small"
                    aria-label={`打开领域承接任务 ${card.title}`}
                    onClick={card.secondaryAction}
                  >
                    <AppWindow size={13} />
                    <span>{card.secondaryActionLabel}</span>
                  </button>
                ) : null}
                {card.launchUrl ? (
                  <a className="antd-btn small" href={card.launchUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} />
                    <span>打开入口</span>
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {focusedApp && (
        <section className="domain-app-focus-banner" role="region" aria-label="当前聚焦领域应用">
          <div>
            <span>来源任务已定位到领域应用</span>
            <strong>当前聚焦：{focusedApp.name}</strong>
            <small>{focusedApp.id} · {focusedApp.domain.name} · {nextActionForApp(focusedApp)}</small>
          </div>
          <button
            className="antd-btn small"
            onClick={() => document.getElementById(`domain-app-${focusedApp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            <AppWindow size={13} />
            <span>查看应用卡片</span>
          </button>
        </section>
      )}

      {focusedApp && (
        <section className="services-section" role="region" aria-label="当前聚焦应用闭环">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>当前聚焦应用闭环</h2>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                从应用剖面继续往任务、系统地图和真实入口走，别让领域应用停在“看见状态”这一步。
              </p>
            </div>
            <span className={`status-badge ${focusedApp.runtime.status === 'running' ? 'online' : 'degraded'}`}>
              {focusedApp.domain.name} · {focusedApp.runtime.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>任务承接</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  先把 {focusedApp.name} 的风险、启动和验证动作沉到任务中心，后续才能留痕和跟踪。
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button className="antd-btn small" aria-label="打开聚焦应用任务" onClick={() => openTaskCenter(focusedApp.id)}>
                  <AppWindow size={13} />
                  <span>按应用筛任务</span>
                </button>
                <button className="antd-btn small" aria-label="打开聚焦领域任务" onClick={() => openTaskCenter(focusedApp.domain.name)}>
                  <FileText size={13} />
                  <span>按领域筛任务</span>
                </button>
              </div>
            </article>

            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>系统收口</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  应用挂载问题如果已经影响全站入口、能力域或治理视图，就回系统地图确认它的真实落点。
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button className="antd-btn small" aria-label="打开聚焦应用系统地图" onClick={openSystemMap}>
                  <FileText size={13} />
                  <span>回系统地图</span>
                </button>
                <button
                  className="antd-btn small"
                  aria-label="复制聚焦应用验证命令"
                  onClick={() => void copyText(focusVerifyCommand || focusedApp.commands.start || '')}
                  disabled={!focusVerifyCommand && !focusedApp.commands.start}
                >
                  <Copy size={13} />
                  <span>复制命令</span>
                </button>
              </div>
            </article>

            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>真实入口</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  入口、API 和认证是否可用，最好在这里顺手验证，不要只停在文档登记。
                </p>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <small className="text-muted">认证 {focusedApp.auth.type || '未登记'} · 新鲜度 {String(focusedApp.freshness.status || '—')}</small>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {focusLaunchUrl && (
                    <a className="antd-btn small" aria-label="打开聚焦应用真实入口" href={focusLaunchUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} />
                      <span>打开应用入口</span>
                    </a>
                  )}
                  {focusApiUrl && (
                    <a className="antd-btn small" aria-label="打开聚焦应用真实接口" href={focusApiUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={13} />
                      <span>打开 API 入口</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      {focusedApp && (
        <section className="system-map-page-focus" role="region" aria-label="当前聚焦应用剖面">
          <div className="system-map-page-focus-head">
            <div>
              <span className={`status-badge ${badgeClass(focusedApp.health)}`}>
                {healthLabels[focusedApp.health] || focusedApp.health}
              </span>
              <h3>{focusedApp.name}</h3>
              <p>{focusedApp.domain.name} · {focusedApp.integration_mode} · {focusedApp.layer}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <span className={`status-badge ${badgeClass(focusedApp.runtime.status)}`}>
                {runtimeLabels[focusedApp.runtime.status] || focusedApp.runtime.status}
              </span>
              <span className={`status-badge ${badgeClass(focusedApp.risk_level)}`}>
                {riskText(focusedApp.risk_level)}
              </span>
              <span className={`status-badge ${badgeClass(focusedApp.security_summary.posture)}`}>
                {securityText(focusedApp.security_summary.posture)}
              </span>
            </div>
          </div>

          <div className="system-map-page-focus-grid">
            <div className="system-map-page-focus-panel">
              <strong>运行与入口</strong>
              <div className="system-map-page-focus-links" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <span>启动 {runtimeLabels[focusedApp.runtime.launch.status] || focusedApp.runtime.launch.status}</span>
                <span>API {runtimeLabels[focusedApp.runtime.api.status] || focusedApp.runtime.api.status}</span>
                <span>新鲜度 {String(focusedApp.freshness.status || '—')}</span>
                <span>认证 {focusedApp.auth.type || '—'}</span>
              </div>
              <small className="system-map-page-focus-next">
                {focusLaunchUrl || focusApiUrl ? '入口已登记，可直接打开验证。' : '入口未登记，先补 launch/api URL 再进入挂载。'}
              </small>
            </div>

            <div className="system-map-page-focus-panel">
              <strong>安全与风险</strong>
              <div className="system-map-page-focus-signals">
                {focusSignals.map((signal) => (
                  <div key={signal.id} className="system-map-page-focus-signal">
                    <span>{signal.label}</span>
                    <small>{signal.detail}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="system-map-page-focus-panel">
              <strong>边界与能力</strong>
              <div className="system-map-page-focus-signals">
                <div className="system-map-page-focus-signal">
                  <span>SSOT 根</span>
                  <small>{focusedApp.paths.ssot_root?.path || '未登记'}</small>
                </div>
                <div className="system-map-page-focus-signal">
                  <span>应用根</span>
                  <small>{focusedApp.paths.app_root?.path || '未登记'}</small>
                </div>
                <div className="system-map-page-focus-signal">
                  <span>能力范围</span>
                  <small>{focusCapabilities.length > 0 ? focusCapabilities.join(' · ') : '未登记读写能力'}</small>
                </div>
              </div>
            </div>

            <div className="system-map-page-focus-panel">
              <strong>验证与下一步</strong>
              <small className="system-map-page-focus-next">下一步：{nextActionForApp(focusedApp)}</small>
              <div className="system-map-page-focus-signals">
                <div className="system-map-page-focus-signal">
                  <span>启动命令</span>
                  <small>{focusedApp.commands.start || '未登记启动命令'}</small>
                </div>
                <div className="system-map-page-focus-signal">
                  <span>验证命令</span>
                  <small>{focusVerifyCommand || '未登记验证命令'}</small>
                </div>
              </div>
            </div>
          </div>

          <div className="system-map-page-focus-actions-grid">
            <button className="system-map-page-focus-action" onClick={() => openTaskCenter(focusedApp.id)}>
              <span>任务中心</span>
              <small>按应用筛任务</small>
            </button>
            <button className="system-map-page-focus-action" onClick={() => openTaskCenter(focusedApp.domain.name)}>
              <span>领域追踪</span>
              <small>按领域筛任务</small>
            </button>
            {focusLaunchUrl && (
              <a className="system-map-page-focus-action" href={focusLaunchUrl} target="_blank" rel="noreferrer">
                <span>打开应用</span>
                <small>{focusLaunchUrl}</small>
              </a>
            )}
            {focusApiUrl && (
              <a className="system-map-page-focus-action" href={focusApiUrl} target="_blank" rel="noreferrer">
                <span>打开 API</span>
                <small>{focusApiUrl}</small>
              </a>
            )}
            {focusedApp.commands.start && (
              <button className="system-map-page-focus-action" onClick={() => void copyText(focusedApp.commands.start || '')}>
                <span>复制启动命令</span>
                <small>{focusedApp.commands.start}</small>
              </button>
            )}
            {focusVerifyCommand && (
              <button className="system-map-page-focus-action" onClick={() => void copyText(focusVerifyCommand)}>
                <span>复制验证命令</span>
                <small>{focusedApp.commands.verify[0]}</small>
              </button>
            )}
          </div>
        </section>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success"><AppWindow size={20} /></div>
          <div className="stat-info">
            <h3>登记应用</h3>
            <p className="stat-value">{apps.summary.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <h3>就绪</h3>
            <p className="stat-value">{apps.summary.ready}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent"><ExternalLink size={20} /></div>
          <div className="stat-info">
            <h3>运行中</h3>
            <p className="stat-value">{apps.summary.running} / {apps.summary.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-warning"><ShieldAlert size={20} /></div>
          <div className="stat-info">
            <h3>高风险</h3>
            <p className="stat-value">{apps.summary.high_risk}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <h3>安全通过</h3>
            <p className="stat-value">{apps.summary.security_passed}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-warning"><ShieldAlert size={20} /></div>
          <div className="stat-info">
            <h3>安全待处理</h3>
            <p className="stat-value">{apps.summary.security_warn + apps.summary.security_failed}</p>
          </div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 8, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16 }}>领域应用</h2>
        <button className="antd-btn" onClick={load}>
          <RefreshCw size={14} />
          <span>刷新</span>
        </button>
      </div>

      <section className="services-section" aria-label="领域应用筛选" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>应用筛选</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              同一组筛选同时作用于关注工作台、合同矩阵、应用剖面和领域承接路径。
            </p>
          </div>
          <span className="status-badge online">显示 {filteredApps.length} / {apps.items.length}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 4, minWidth: 220 }}>
            <span className="text-muted" style={{ fontSize: 12 }}>关键词</span>
            <input
              aria-label="搜索领域应用"
              value={appQuery}
              onChange={(event) => setAppQuery(event.target.value)}
              placeholder="应用、领域或挂载方式"
            />
          </label>
          <label style={{ display: 'grid', gap: 4, minWidth: 180 }}>
            <span className="text-muted" style={{ fontSize: 12 }}>领域</span>
            <select aria-label="按领域筛选应用" value={appDomainFilter} onChange={(event) => setAppDomainFilter(event.target.value)}>
              <option value="all">全部领域</option>
              {appDomainOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, minWidth: 160 }}>
            <span className="text-muted" style={{ fontSize: 12 }}>运行态</span>
            <select aria-label="按运行态筛选应用" value={appRuntimeFilter} onChange={(event) => setAppRuntimeFilter(event.target.value)}>
              <option value="all">全部运行态</option>
              <option value="running">运行中</option>
              <option value="stopped">未运行</option>
              <option value="not_applicable">无需运行</option>
            </select>
          </label>
          {(appQuery || appDomainFilter !== 'all' || appRuntimeFilter !== 'all') && (
            <button
              className="antd-btn small"
              aria-label="清除领域应用筛选"
              onClick={() => {
                setAppQuery('');
                setAppDomainFilter('all');
                setAppRuntimeFilter('all');
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      </section>

      <section className="services-section" aria-label="领域关注工作台" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>领域关注工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              先处理待启动服务、高风险挂载和安全未过项，减少从首页跳进来之后还要自己扫卡片的成本。
            </p>
          </div>
          <span className={`status-badge ${filteredAttentionItems.length > 0 ? 'degraded' : 'online'}`}>
            {filteredAttentionItems.length > 0 ? `待处理 ${filteredAttentionItems.length}` : '当前已清空'}
          </span>
        </div>
        <div className="domain-attention-filters">
          {[
            ['all', '全部关注', attentionCounts.all],
            ['runtime', '待启动', attentionCounts.runtime],
            ['security', '安全关注', attentionCounts.security],
            ['high_risk', '高风险', attentionCounts.high_risk],
          ].map(([id, label, count]) => (
            <button
              key={id}
              className={`domain-attention-filter ${attentionFilter === id ? 'active' : ''}`}
              onClick={() => setAttentionFilter(id as DomainAttentionFilter)}
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
        <div className="domain-attention-grid">
          {filteredAttentionItems.map(({ app, reasons, nextAction }) => (
            <article key={app.id} className="domain-attention-card">
              <div className="domain-attention-head">
                <div>
                  <h3>{app.name}</h3>
                  <p>{app.domain.name} · {app.integration_mode}</p>
                </div>
                <span className={`status-badge ${badgeClass(app.runtime.status)}`}>
                  {runtimeLabels[app.runtime.status] || app.runtime.status}
                </span>
              </div>
              <div className="domain-attention-tags">
                {reasons.map((reason) => (
                  <span key={`${app.id}-${reason}`}>{reason}</span>
                ))}
              </div>
              <strong className="domain-attention-next">{nextAction}</strong>
              <small className="domain-attention-meta">
                风险 {riskText(app.risk_level)} · 安全 {securityText(app.security_summary.posture)} · Freshness {String(app.freshness.status || '—')}
              </small>
              <div className="home-focus-actions" style={{ marginTop: 0 }}>
                <button className="antd-btn small" onClick={() => setFocusedAppId(app.id)}>
                  <FileText size={13} />
                  <span>查看剖面</span>
                </button>
                <button className="antd-btn small" onClick={() => openTaskCenter(app.id)}>
                  <AppWindow size={13} />
                  <span>跟进任务</span>
                </button>
              </div>
              <DomainActionButtons
                actions={app.actions.slice(0, 3)}
                onQueueAction={(action) => void queueDomainAction(app, action)}
                onExecuteVerification={() => void executeDomainVerification(app)}
                isActionPending={(action) => actionPendingFor(app, action)}
                verificationPending={verificationPendingFor(app)}
              />
            </article>
          ))}
          {filteredAttentionItems.length === 0 && (
            <div className="home-focus-empty">当前筛选下暂无需要处理的领域应用</div>
          )}
        </div>
      </section>

      <section className="services-section" aria-label="领域挂载合同矩阵" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>挂载合同矩阵</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把每个领域应用的 SSOT、入口、启动、验证、认证、读写边界和数据新鲜度摊平，判断它现在只是“挂上去了”，还是已经能被 Cockpit 稳定治理。
            </p>
          </div>
          <span className={`status-badge ${contractSummary.verifyReady === apps.summary.total && contractSummary.authReady === apps.summary.total ? 'online' : 'degraded'}`}>
            合同完备 {contractSummary.verifyReady} / {apps.summary.total}
          </span>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-info">
              <h3>SSOT 已登记</h3>
              <p className="stat-value">{contractSummary.ssotReady} / {apps.summary.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>入口已登记</h3>
              <p className="stat-value">{contractSummary.entryReady} / {apps.summary.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>验证已登记</h3>
              <p className="stat-value">{contractSummary.verifyReady} / {apps.summary.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>认证已登记</h3>
              <p className="stat-value">{contractSummary.authReady} / {apps.summary.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>写能力已声明</h3>
              <p className="stat-value">{contractSummary.writeDeclared} / {apps.summary.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>新鲜度可见</h3>
              <p className="stat-value">{contractSummary.freshnessReady} / {apps.summary.total}</p>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="services-table">
            <thead>
              <tr>
                <th>应用</th>
                <th>挂载方式</th>
                <th>SSOT</th>
                <th>入口</th>
                <th>启动</th>
                <th>验证</th>
                <th>认证</th>
                <th>读写边界</th>
                <th>新鲜度</th>
                <th>下一步</th>
                <th>动作</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => {
                const hasSsot = Boolean(app.paths.ssot_root?.exists);
                const hasEntry = Boolean(app.links.launch_url || app.runtime.launch.url || app.links.api_url || app.runtime.api.url);
                const hasStart = Boolean(app.commands.start);
                const hasVerify = app.commands.verify.length > 0;
                const hasAuth = Boolean(app.auth.type);
                const freshness = String(app.freshness.status || '未登记');
                return (
                  <tr key={`contract-${app.id}`}>
                    <td>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <strong>{app.name}</strong>
                        <small>{app.domain.name} · {app.id}</small>
                      </div>
                    </td>
                    <td>{app.integration_mode}</td>
                    <td>
                      <span className={`status-badge ${hasSsot ? 'online' : 'offline'}`}>
                        {contractStatusText(hasSsot, '未登记')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${hasEntry ? 'online' : 'degraded'}`}>
                        {entryText(app)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${hasStart ? 'online' : 'degraded'}`}>
                        {contractStatusText(hasStart, '按需或未登记')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${hasVerify ? 'online' : 'offline'}`}>
                        {verifyText(app)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${hasAuth ? 'online' : 'offline'}`}>
                        {app.auth.type || '未登记'}
                      </span>
                    </td>
                    <td>{capabilityText(app)}</td>
                    <td>
                      <span className={`status-badge ${badgeClass(freshness)}`}>
                        {freshness}
                      </span>
                    </td>
                    <td style={{ minWidth: 220 }}>{nextActionForApp(app)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="antd-btn small" onClick={() => setFocusedAppId(app.id)}>
                          <FileText size={13} />
                          <span>看剖面</span>
                        </button>
                        <button className="antd-btn small" onClick={() => openTaskCenter(app.id)}>
                          <AppWindow size={13} />
                          <span>跟任务</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="services-section" aria-label="领域建设入口" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>领域建设入口</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把领域相关的重点项目和路线图翻成 cockpit 入口页、系统收口面和任务承接入口，让领域页也能直接承接项目维度。
            </p>
          </div>
          <span className={`status-badge ${domainBuildSummary.attention > 0 ? 'degraded' : 'online'}`}>
            {domainBuildSummary.total > 0 ? `已编排 ${domainBuildSummary.total}` : '待接入'}
          </span>
        </div>

        <div className="home-architecture-kpis">
          {[
            ['建设入口', domainBuildSummary.total],
            ['重点项目', domainBuildSummary.projects],
            ['路线图项', domainBuildSummary.roadmap],
            ['待收口', domainBuildSummary.attention],
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
                <strong>领域项目与路线图</strong>
                <small>先看入口页，再看系统收口面，最后回任务中心跟进动作。</small>
              </div>
              <span className={`status-badge ${domainBuildSummary.attention > 0 ? 'degraded' : 'online'}`}>
                {domainBuildSummary.attention}
              </span>
            </div>
            <div className="home-architecture-list">
              {domainBuildRows.map((row) => (
                <article key={row.id} className="home-architecture-item home-architecture-lane">
                  <strong>{row.title}</strong>
                  <span>{row.kind === 'project' ? '重点项目' : '能力路线图'} · {row.meta}</span>
                  <p className="home-architecture-copy">{row.summary}</p>
                  <small>{row.nextAction}</small>
                  <div className="home-architecture-lane-actions">
                    <button
                      className="antd-btn small"
                      aria-label={`打开领域建设入口 ${row.title}`}
                      onClick={() => onOpenTarget ? onOpenTarget(row.entryTarget) : onNavigate?.(row.entryTarget.tab)}
                    >
                      <ExternalLink size={13} />
                      <span>入口页</span>
                    </button>
                    <button
                      className="antd-btn small secondary"
                      aria-label={`打开领域建设覆盖 ${row.title}`}
                      onClick={() => onOpenTarget ? onOpenTarget(row.coverageTarget) : onNavigate?.(row.coverageTarget.tab)}
                    >
                      <Map size={13} />
                      <span>系统收口</span>
                    </button>
                    <button
                      className="antd-btn small secondary"
                      aria-label={`打开领域建设任务 ${row.title}`}
                      onClick={() => onOpenTarget ? onOpenTarget(row.taskTarget) : onNavigate?.(row.taskTarget.tab)}
                    >
                      <Route size={13} />
                      <span>任务承接</span>
                    </button>
                  </div>
                </article>
              ))}
              {domainBuildRows.length === 0 && (
                <div className="home-focus-empty">当前还没有领域建设入口数据</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <div className="stats-grid domain-app-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {filteredApps.map((app) => (
          <div key={app.id} style={{ display: 'grid', gap: 8 }}>
            <DomainAppCard
              app={app}
              focused={app.id === focusedAppId}
              onQueueAction={(action) => void queueDomainAction(app, action)}
              onExecuteVerification={() => void executeDomainVerification(app)}
              isActionPending={(action) => actionPendingFor(app, action)}
              verificationPending={verificationPendingFor(app)}
            />
            <div className="home-focus-actions" style={{ marginTop: 0 }}>
              <button className="antd-btn small" onClick={() => setFocusedAppId(app.id)}>
                <FileText size={13} />
                <span>查看剖面</span>
              </button>
              <button className="antd-btn small" onClick={() => openTaskCenter(app.id)}>
                <AppWindow size={13} />
                <span>相关任务</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <section id="opc-workspace" className="services-section" style={{ marginTop: 24 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16 }}>OPC 作战台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {opc.positioning?.summary || 'OPC SSOT 聚合视图'}
            </p>
          </div>
          <span className={`status-badge ${opc.exists ? 'success' : 'danger'}`}>
            {opc.exists ? 'SSOT 就绪' : 'SSOT 缺失'}
          </span>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {opc.weekly_priorities.length > 0 ? opc.weekly_priorities.map((item) => (
            <div className="stat-card" key={item.title}>
              <div className="stat-icon-wrapper pulse-accent"><Terminal size={18} /></div>
              <div className="stat-info">
                <h3>{item.title}</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--antd-text-secondary)', fontSize: 13 }}>{item.detail}</p>
              </div>
            </div>
          )) : (
            <div className="stat-card">
              <div className="stat-icon-wrapper pulse-accent"><Terminal size={18} /></div>
              <div className="stat-info">
                <h3>本周动作</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--antd-text-secondary)', fontSize: 13 }}>暂无明确动作</p>
              </div>
            </div>
          )}
        </div>

        <div className="services-section" style={{ marginTop: 18 }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>内容排期</h3>
          </div>
          <DataTable rows={opc.content_calendar.week} empty="暂无排期" />
        </div>

        <div className="stats-grid domain-app-opc-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 18 }}>
          <div className="services-section" style={{ margin: 0 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>产品管线</h3>
            </div>
            <DataTable rows={opc.product_portfolio.pipeline} empty="暂无产品管线" />
          </div>
          <div className="services-section" style={{ margin: 0 }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>核心指标</h3>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {opc.metrics.slice(0, 3).map((section) => (
                <div key={section.name}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{section.name}</div>
                  <DataTable rows={section.items.slice(0, 3)} empty="暂无指标" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
