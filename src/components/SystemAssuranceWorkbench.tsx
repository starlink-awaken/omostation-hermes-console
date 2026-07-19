import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ClipboardCheck, ExternalLink, Layers, RefreshCw, ShieldCheck } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

type LayerStatus = {
  layer?: string;
  name?: string;
  status?: string;
  error?: string;
  data?: {
    source?: string;
    snapshot?: {
      version?: string;
      generated_at?: string;
      daemon?: { healthy?: boolean };
      m1_node_count?: number;
      protocols?: Record<string, { status?: string; remaining_pct?: number }>;
    };
  };
};

type LayerPayload = {
  summary?: { total_layers?: number; healthy?: number; degraded?: number; down?: number };
  layers?: LayerStatus[];
  status?: string;
  error?: string;
};

type M0Payload = {
  version?: string;
  generated_at?: string;
  daemon?: { healthy?: boolean };
  m1_node_count?: number;
  protocols?: Record<string, { status?: string; remaining_pct?: number }>;
  status?: string;
  error?: string;
};

type E2EPayload = { result?: string; error?: string; status?: string };
type OmoPayload = { summary?: string; total?: number; open?: number; closed?: number; error?: string; status?: string };
type ProtocolPayload = { status?: string; protocols?: unknown[]; error?: string };
type CronPayload = { total_tasks?: number; today_count?: number; ok_count?: number; error_count?: number; error?: string; status?: string };
type GovernancePayload = { health_score?: number; total_debt?: number; unresolved?: number; resolution_rate?: number; latest_audit?: string; error?: string; status?: string };
type BosTrendPayload = { total_all_time?: number; last_24h?: { calls?: number; success_rate?: number; avg_latency?: number }; error?: string; status?: string };
type ContextPayload = { phase?: number; theme?: string; phase_status?: string; active_goals?: { id?: string; desc?: string; status?: string }[]; cards_summary?: { total?: number; active?: number; p0_open?: number }; next_guidance?: string; error?: string; status?: string };
type ConvergencePayload = {
  convergence_pct?: number;
  total_entry_points?: number;
  converged_to_cockpit?: number;
  remaining?: string[];
  error?: string;
  status?: string;
};
type ServiceHealthPayload = {
  status?: string;
  service?: string;
  endpoint?: string;
  architecture?: string;
  converged_to?: string;
  m0_snapshot?: string;
  error?: string;
};

type SystemAssuranceWorkbenchProps = {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

type AssuranceState = {
  layers: LayerPayload;
  m0: M0Payload;
  protocols: ProtocolPayload;
  e2e: E2EPayload;
  omo: OmoPayload;
  convergence: ConvergencePayload;
  cron: CronPayload;
  governance: GovernancePayload;
  bosTrends: BosTrendPayload;
  context: ContextPayload;
  ecosStatus: ServiceHealthPayload;
  ecosHealth: ServiceHealthPayload;
  omoHealth: ServiceHealthPayload;
};

const EMPTY_STATE: AssuranceState = {
  layers: {},
  m0: {},
  protocols: {},
  e2e: {},
  omo: {},
  convergence: {},
  cron: {},
  governance: {},
  bosTrends: {},
  context: {},
  ecosStatus: {},
  ecosHealth: {},
  omoHealth: {},
};

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ...(fallback && typeof fallback === 'object' ? fallback : {}),
        ...(payload && typeof payload === 'object' ? payload : {}),
        status: 'unavailable',
      } as T;
    }
    return payload as T;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return { ...(fallback && typeof fallback === 'object' ? fallback : {}), status: 'unavailable' } as T;
  }
}

function statusTone(status?: string) {
  if (['ok', 'healthy', 'ready', 'passed'].includes((status || '').toLowerCase())) return 'online';
  if (['down', 'offline', 'error', 'failed', 'unavailable'].includes((status || '').toLowerCase())) return 'offline';
  return 'degraded';
}

function statusLabel(status?: string) {
  if (statusTone(status) === 'online') return '正常';
  if (statusTone(status) === 'offline') return '不可用';
  return '观察';
}

function sourceUnavailable(source: { status?: string; error?: string }) {
  return source.status === 'unavailable' || Boolean(source.error);
}

function layerStatusLabel(layer: LayerStatus) {
  if (layer.status === 'ok') return '正常';
  if (layer.status === 'down') return '离线';
  return layer.status || '未知';
}

export default function SystemAssuranceWorkbench({ onNavigate, onOpenTarget }: SystemAssuranceWorkbenchProps) {
  const [state, setState] = useState<AssuranceState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [layers, m0, protocols, e2e, omo, convergence, cron, governance, bosTrends, context, ecosStatus, ecosHealth, omoHealth] = await Promise.all([
        fetchJson<LayerPayload>('/api/v1/status', {}),
        fetchJson<M0Payload>('/api/v1/m0', {}),
        fetchJson<ProtocolPayload>('/api/protocols', {}),
        fetchJson<E2EPayload>('/api/e2e', {}),
        fetchJson<OmoPayload>('/api/omo-report', {}),
        fetchJson<ConvergencePayload>('/api/convergence/status', {}),
        fetchJson<CronPayload>('/api/cron/summary', {}),
        fetchJson<GovernancePayload>('/api/governance/summary', {}),
        fetchJson<BosTrendPayload>('/api/bos/trends', {}),
        fetchJson<ContextPayload>('/api/context', {}),
        fetchJson<ServiceHealthPayload>('/api/ecos/status', {}),
        fetchJson<ServiceHealthPayload>('/api/ecos/health', {}),
        fetchJson<ServiceHealthPayload>('/api/omos/health', {}),
      ]);
      if (!active) return;
      setState({ layers, m0, protocols, e2e, omo, convergence, cron, governance, bosTrends, context, ecosStatus, ecosHealth, omoHealth });
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const unavailableSources = useMemo(() => {
    const sources: string[] = [];
    if (sourceUnavailable(state.layers)) sources.push('层健康');
    if (sourceUnavailable(state.m0)) sources.push('M0 快照');
    if (sourceUnavailable(state.protocols)) sources.push('协议 API');
    if (sourceUnavailable(state.e2e)) sources.push('E2E');
    if (sourceUnavailable(state.omo)) sources.push('OMO 报告');
    if (sourceUnavailable(state.convergence)) sources.push('入口收敛');
    if (sourceUnavailable(state.cron)) sources.push('Cron 摘要');
    if (sourceUnavailable(state.governance)) sources.push('治理摘要');
    if (sourceUnavailable(state.bosTrends)) sources.push('BOS 趋势');
    if (sourceUnavailable(state.context)) sources.push('L4 context');
    if (sourceUnavailable(state.ecosStatus)) sources.push('eCOS 状态');
    if (sourceUnavailable(state.ecosHealth)) sources.push('eCOS 健康');
    if (sourceUnavailable(state.omoHealth)) sources.push('OMO 健康');
    return sources;
  }, [state]);

  const layerSummary = state.layers.summary || {};
  const layerUnavailable = state.layers.status === 'unavailable' || !!state.layers.error || layerSummary.total_layers === undefined;
  const layerTone = layerUnavailable ? 'offline' : layerSummary.down ? 'offline' : layerSummary.degraded ? 'degraded' : 'online';
  const e2eTone = state.e2e.error || state.e2e.status === 'unavailable' ? 'offline' : state.e2e.result?.includes('passed') ? 'online' : 'degraded';
  const omoTone = sourceUnavailable(state.omo) ? 'offline' : (state.omo.open || 0) > 0 ? 'degraded' : 'online';
  const convergenceTone = state.convergence.error || state.convergence.status === 'unavailable' ? 'offline' : (state.convergence.convergence_pct || 0) >= 80 ? 'online' : 'degraded';
  const ecosTone = state.ecosStatus.error || state.ecosStatus.status === 'unavailable' ? 'offline' : statusTone(state.ecosStatus.status || 'ok');
  const omoHealthTone = state.omoHealth.error || state.omoHealth.status === 'unavailable' ? 'offline' : statusTone(state.omoHealth.status || 'ok');
  const layerContextQuery = state.layers.layers?.[0]?.name || 'layers';
  const protocolContextQuery = Object.keys(state.m0.protocols || {})[0] || 'protocol';
  const verificationContextQuery = state.e2e.result || 'verification';
  const governanceContextQuery = state.omo.open ? 'open' : 'governance';
  const convergenceContextQuery = state.convergence.remaining?.[0] || 'convergence';
  const openAssuranceTarget = (target: CockpitNavigationTarget) => openCockpitNavigationTarget(target, onNavigate, onOpenTarget);
  const assuranceGap = unavailableSources.length > 0
    || layerUnavailable
    || e2eTone !== 'online'
    || omoTone !== 'online'
    || convergenceTone !== 'online';
  const assuranceTaskTitle = unavailableSources[0]
    ? `补齐系统保证证据：${unavailableSources[0]}`
    : (state.omo.open || 0) > 0
      ? `收敛治理债务：${state.omo.open} 项开放项`
      : convergenceTone !== 'online'
        ? `推进入口收敛：${state.convergence.remaining?.[0] || '未收敛入口'}`
        : e2eTone !== 'online'
          ? '补齐 E2E 验证证据'
          : '执行系统保证复核';
  const assuranceTaskDescription = unavailableSources.length > 0
    ? `系统保证工作台检测到 ${unavailableSources.join('、')} 不可用。请恢复证据源，重新执行核验，并完成 TaskCenter closeout。`
    : `系统保证工作台检测到横向保障缺口：${assuranceTaskTitle}。请补齐层健康、协议、E2E、治理债务或入口收敛证据，并记录处理结果。`;

  const createAssuranceTask = async () => {
    setTaskPending(true);
    setTaskNotice(null);
    setTaskError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assuranceTaskTitle,
          description: assuranceTaskDescription,
          priority: unavailableSources.length > 0 || e2eTone === 'offline' ? 'high' : 'medium',
          risk_level: unavailableSources.length > 0 ? 'L2' : 'L1',
          evidence_required: ['系统保证快照', '相关层、协议或服务证据', '验证与收敛结果', 'task closeout'],
          tags: ['system-assurance', 'governance'],
          source: {
            type: 'cockpit.system-assurance-workbench',
            id: 'system-assurance',
            title: '系统保证工作台',
            target: { tab: 'Overview', taskQuery: assuranceTaskTitle },
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '系统保证任务登记失败');
      setTaskNotice(`已登记系统保证任务：${payload.title || assuranceTaskTitle}`);
      if (payload.id) openAssuranceTarget({ tab: 'TaskCenter', taskQuery: String(payload.id) });
    } catch (requestError) {
      setTaskError(requestError instanceof Error ? requestError.message : '系统保证任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };

  return (
    <section className="services-section overview-ops-panel" role="region" aria-label="系统保证工作台">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>系统保证工作台</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            把层健康、协议快照、E2E、OMO 报告和入口收敛放到同一个可核验入口。
          </p>
        </div>
        <button type="button" className="antd-btn small" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
          <RefreshCw size={13} />
          <span>{loading ? '检查中' : '重新检查'}</span>
        </button>
        {!loading && assuranceGap && (
          <button type="button" className="antd-btn small" onClick={() => void createAssuranceTask()} disabled={taskPending} aria-label={`登记系统保证任务 ${assuranceTaskTitle}`}>
            <ClipboardCheck size={13} />
            <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
          </button>
        )}
      </div>

      {(taskNotice || taskError) && (
        <div className={taskError ? 'overview-inline-error' : 'shell-data-banner'} role={taskError ? 'alert' : 'status'}>
          {taskError ? <AlertTriangle size={16} /> : <ClipboardCheck size={16} />}
          <span>{taskError || taskNotice}</span>
        </div>
      )}

      {unavailableSources.length > 0 && (
        <div className="overview-inline-error" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>系统保证证据不完整</strong>
            <span>{unavailableSources.join('、')}暂时不可用，当前摘要不能视为完整健康结论。</span>
          </div>
        </div>
      )}

      <div className="overview-coverage-grid">
        <article className={`overview-coverage-card ${layerTone}`}>
          <div className="overview-ops-head">
            <strong><Layers size={15} /> 层健康</strong>
            <span className={`status-badge ${layerTone}`}>{layerUnavailable ? '不可用' : `${layerSummary.healthy || 0}/${layerSummary.total_layers || 0}`}</span>
          </div>
          <p>{layerUnavailable ? state.layers.error || '层健康证据尚未返回。' : layerSummary.down ? `${layerSummary.down} 层离线` : layerSummary.degraded ? `${layerSummary.degraded} 层需要观察` : '所有已探测层均正常'}</p>
          <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'Observability', taskQuery: layerContextQuery })}>
            <ExternalLink size={13} />
            <span>看层详情</span>
          </button>
        </article>

        <article className={`overview-coverage-card ${statusTone(state.m0.error ? 'unavailable' : state.m0.daemon?.healthy ? 'ready' : 'watch')}`}>
          <div className="overview-ops-head">
            <strong><ShieldCheck size={15} /> L0 / M0</strong>
            <span className={`status-badge ${statusTone(state.m0.error ? 'unavailable' : state.m0.daemon?.healthy ? 'ready' : 'watch')}`}>{state.m0.error ? '不可用' : state.m0.version || '未读到快照'}</span>
          </div>
          <p>Daemon {state.m0.daemon?.healthy ? '健康' : state.m0.error ? '证据缺失' : '待确认'} · M1 节点 {state.m0.m1_node_count ?? '-'}</p>
          <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'Protocol', taskQuery: protocolContextQuery })}>
            <ExternalLink size={13} />
            <span>看协议工作台</span>
          </button>
        </article>

        <article className={`overview-coverage-card ${e2eTone}`}>
          <div className="overview-ops-head">
            <strong><Activity size={15} /> E2E 验证</strong>
            <span className={`status-badge ${e2eTone}`}>{statusLabel(e2eTone === 'online' ? 'passed' : e2eTone)}</span>
          </div>
          <p>{state.e2e.result || state.e2e.error || '尚未取得验证结果'}</p>
          <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'TaskCenter', taskQuery: verificationContextQuery })}>
            <ClipboardCheck size={13} />
            <span>承接验证任务</span>
          </button>
        </article>

        <article className={`overview-coverage-card ${omoTone}`}>
          <div className="overview-ops-head">
            <strong><ClipboardCheck size={15} /> OMO 报告</strong>
            <span className={`status-badge ${omoTone}`}>{sourceUnavailable(state.omo) ? '不可用' : `${state.omo.open || 0} 开放`}</span>
          </div>
          <p>{state.omo.summary || '尚未取得 OMO 报告'}</p>
          <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'Debt', taskQuery: governanceContextQuery })}>
            <ExternalLink size={13} />
            <span>看治理债务</span>
          </button>
        </article>

        <article className={`overview-coverage-card ${convergenceTone}`}>
          <div className="overview-ops-head">
            <strong>入口收敛</strong>
            <span className={`status-badge ${convergenceTone}`}>{state.convergence.convergence_pct ?? '-'}%</span>
          </div>
          <p>已收敛 {state.convergence.converged_to_cockpit ?? '-'} / {state.convergence.total_entry_points ?? '-'} · 剩余 {(state.convergence.remaining || []).length}</p>
          <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'SystemMap', taskQuery: convergenceContextQuery })}>
            <ExternalLink size={13} />
            <span>看系统收敛</span>
          </button>
        </article>
      </div>

      <div className="overview-ops-grid" style={{ marginTop: 12 }}>
        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>eCOS 收敛服务</strong>
            <span className={`status-badge ${ecosTone}`}>{state.ecosStatus.error ? '不可用' : state.ecosStatus.status || '正常'}</span>
          </div>
          <div className="overview-ops-list">
            <div className="overview-ops-item">
              <strong>{state.ecosStatus.service || 'eCOS dashboard'}</strong>
              <span>{state.ecosStatus.converged_to || state.ecosStatus.endpoint || '未返回收敛目标'}</span>
              <small>{state.ecosStatus.m0_snapshot || state.ecosStatus.error || '状态来自 /api/ecos/status'}</small>
            </div>
          </div>
        </article>

        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>服务健康探针</strong>
            <span className={`status-badge ${omoHealthTone}`}>{state.omoHealth.error ? '不可用' : state.omoHealth.status || '正常'}</span>
          </div>
          <div className="overview-ops-list">
            <div className="overview-ops-item">
              <strong>eCOS 健康</strong>
              <span>{sourceUnavailable(state.ecosHealth) ? '不可用' : state.ecosHealth.service || '已返回健康信号'}</span>
              <small>{state.ecosHealth.error || '已探测 /api/ecos/health'}</small>
            </div>
            <div className="overview-ops-item">
              <strong>OMO 健康</strong>
              <span>{sourceUnavailable(state.omoHealth) ? '不可用' : state.omoHealth.service || '已返回健康信号'}</span>
              <small>{state.omoHealth.error || '已探测 /api/omos/health'}</small>
            </div>
          </div>
        </article>
      </div>

      <div className="overview-ops-grid" style={{ marginTop: 12 }}>
        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>层探针明细</strong>
            <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'Observability', taskQuery: layerContextQuery })}>
              <ExternalLink size={13} />
              <span>观测</span>
            </button>
          </div>
          <div className="overview-ops-list">
            {(state.layers.layers || []).map((layer) => (
              <button key={`${layer.layer}-${layer.name}`} type="button" className="overview-ops-item" onClick={() => openAssuranceTarget({ tab: 'Observability', taskQuery: layer.name || layer.layer || layerContextQuery })}>
                <strong>{layer.layer} · {layer.name}</strong>
                <span className={`status-badge ${statusTone(layer.status)}`}>{layerStatusLabel(layer)}</span>
                <small>{layer.error || layer.data?.source || '已返回探针数据'}</small>
              </button>
            ))}
            {(state.layers.layers || []).length === 0 && <div className="home-focus-empty overview-ops-empty">没有层探针明细</div>}
          </div>
        </article>

        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>M0 协议新鲜度</strong>
            <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'Protocol', taskQuery: protocolContextQuery })}>
              <ExternalLink size={13} />
              <span>协议</span>
            </button>
          </div>
          <div className="overview-ops-list">
            {Object.entries(state.m0.protocols || {}).map(([name, protocol]) => (
              <button key={name} type="button" className="overview-ops-item" onClick={() => openAssuranceTarget({ tab: 'Protocol', taskQuery: name })}>
                <strong>{name}</strong>
                <span>{protocol.status || 'unknown'} · 剩余 {protocol.remaining_pct ?? '-'}%</span>
                <small>来自 M0 runtime snapshot</small>
              </button>
            ))}
            {Object.keys(state.m0.protocols || {}).length === 0 && <div className="home-focus-empty overview-ops-empty">没有 M0 协议明细</div>}
          </div>
        </article>

        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>验证承接</strong>
            <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'TaskCenter', taskQuery: verificationContextQuery })}>
              <ClipboardCheck size={13} />
              <span>任务</span>
            </button>
          </div>
          <div className="overview-ops-list">
            <div className="overview-ops-item">
              <strong>E2E 原始状态</strong>
              <span>{state.e2e.result || '未返回结果'}</span>
              <small>{state.e2e.error || '可从任务中心承接验证补证。'}</small>
            </div>
            <div className="overview-ops-item">
              <strong>OMO 未闭环</strong>
              <span>{sourceUnavailable(state.omo) ? '-' : state.omo.open ?? '-'} 条开放债务</span>
              <small>{state.omo.summary || '报告尚未返回。'}</small>
            </div>
          </div>
        </article>
      </div>

      <div className="overview-ops-grid" style={{ marginTop: 12 }}>
        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>自动化流水线</strong>
            <span className={`status-badge ${sourceUnavailable(state.cron) ? 'offline' : 'degraded'}`}>{sourceUnavailable(state.cron) ? '不可用' : `${state.cron.today_count ?? 0} 今日`}</span>
          </div>
          <div className="overview-ops-list">
            <div className="overview-ops-item">
              <strong>Cron 任务</strong>
              <span>总计 {state.cron.total_tasks ?? '-'} · 今日 {state.cron.today_count ?? '-'}</span>
              <small>成功 {state.cron.ok_count ?? '-'} · 错误 {state.cron.error_count ?? '-'}</small>
            </div>
          </div>
        </article>

        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>治理审计</strong>
            <span className={`status-badge ${sourceUnavailable(state.governance) ? 'offline' : (state.governance.unresolved || 0) > 0 ? 'degraded' : 'online'}`}>{sourceUnavailable(state.governance) ? '不可用' : `健康 ${state.governance.health_score ?? '-'}`}</span>
          </div>
          <div className="overview-ops-list">
            <div className="overview-ops-item">
              <strong>未解决项</strong>
              <span>{state.governance.unresolved ?? '-'} · 解决率 {state.governance.resolution_rate ?? '-'}%</span>
              <small>{state.governance.latest_audit ? `最近审计 ${state.governance.latest_audit}` : state.governance.error || '尚未取得审计时间'}</small>
            </div>
          </div>
        </article>

        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>BOS 趋势</strong>
            <span className={`status-badge ${sourceUnavailable(state.bosTrends) ? 'offline' : state.bosTrends.total_all_time ? 'online' : 'degraded'}`}>{sourceUnavailable(state.bosTrends) ? '不可用' : state.bosTrends.total_all_time ? `${state.bosTrends.total_all_time} 总调用` : '无样本'}</span>
          </div>
          <div className="overview-ops-list">
            <div className="overview-ops-item">
              <strong>最近 24 小时</strong>
              <span>调用 {state.bosTrends.last_24h?.calls ?? '-'} · 成功率 {state.bosTrends.last_24h?.success_rate ?? '-'}%</span>
              <small>{state.bosTrends.last_24h?.avg_latency !== undefined ? `平均延迟 ${state.bosTrends.last_24h.avg_latency}ms` : state.bosTrends.error || '等待真实 BOS 样本'}</small>
            </div>
          </div>
        </article>

        <article className="overview-ops-column">
          <div className="overview-ops-head">
            <strong>L4 context</strong>
            <span className={`status-badge ${state.context.error ? 'offline' : 'degraded'}`}>{state.context.error ? '不可用' : `P${state.context.phase ?? '-'}`}</span>
          </div>
          <div className="overview-ops-list">
            <div className="overview-ops-item">
              <strong>{state.context.theme || '尚未取得 L4 主题'}</strong>
              <span>活跃目标 {state.context.active_goals?.filter((goal) => goal.status === 'pending' || goal.status === 'active').length ?? '-'} · P0 {state.context.cards_summary?.p0_open ?? '-'}</span>
              <small>{state.context.next_guidance || state.context.error || '进入 C2G 或任务中心查看目标承接。'}</small>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'C2G', taskQuery: state.context.active_goals?.[0]?.id || 'C2G' })}>
                <ExternalLink size={13} />
                <span>看 C2G</span>
              </button>
              <button type="button" className="antd-btn small" onClick={() => openAssuranceTarget({ tab: 'TaskCenter', taskQuery: state.context.active_goals?.[0]?.id || verificationContextQuery })}>
                <ClipboardCheck size={13} />
                <span>看目标任务</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      <div className="overview-ops-list" style={{ marginTop: 12 }}>
        <div className="overview-ops-item">
          <strong>协议 API</strong>
          <span>{state.protocols.error ? state.protocols.error : state.protocols.protocols ? `返回 ${state.protocols.protocols.length} 条协议记录` : state.protocols.status === 'unavailable' ? '不可用' : '已返回，但未提供可计数协议列表'}</span>
          <small>详细定义与工作流运行证据进入协议工作台查看。</small>
        </div>
      </div>
    </section>
  );
}
