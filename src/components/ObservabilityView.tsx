import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import { Activity, AlertTriangle, ClipboardCheck, RefreshCw, Route, Search, ShieldCheck, X } from 'lucide-react';
import PlatformControlWorkbench from './PlatformControlWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface ObservabilityViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesObservabilityFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

async function readObservabilityResponse<T>(
  result: PromiseSettledResult<Response>,
  label: string,
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  if (result.status === 'rejected') {
    return { ok: false, data: null, error: `${label}：${result.reason instanceof Error ? result.reason.message : '请求失败'}` };
  }
  const payload = await result.value.json().catch(() => ({}));
  if (!result.value.ok) {
    return { ok: false, data: null, error: payload.error || `${label} HTTP ${result.value.status}` };
  }
  return { ok: true, data: payload as T };
}

type ObservabilityClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

type ObservabilityDomain = {
  domain: string;
  total?: number;
  success?: number;
  error?: number;
  avg_latency?: number;
};

type ObservabilityBosData = {
  status?: string;
  data_quality?: string;
  domains?: ObservabilityDomain[];
  summary?: { total_calls?: number };
};

type ObservabilityArchData = {
  governance?: { health?: string };
  git?: { status?: string };
  system?: { health_score?: number };
};

export default function ObservabilityView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: ObservabilityViewProps) {
  const [archData, setArchData] = useState<ObservabilityArchData | null>(null);
  const [bosData, setBosData] = useState<ObservabilityBosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [domainQuery, setDomainQuery] = useState('');
  const [domainStatus, setDomainStatus] = useState<'all' | 'degraded' | 'healthy'>('all');
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    const domains = Array.isArray(bosData?.domains) ? bosData.domains : [];
    if (focusTaskQuery && domains.some((domain) => matchesObservabilityFocusQuery([domain.domain, String(domain.error ?? ''), String(domain.avg_latency ?? '')], focusTaskQuery))) {
      // 外部导航查询命中观测域时同步当前筛选条件。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDomainQuery(focusTaskQuery);
    }
  }, [bosData?.domains, focusTaskQuery]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [archResult, bosResult] = await Promise.allSettled([
          fetch('/api/v1/arch-health'),
          fetch('/api/bos/metrics'),
        ]);
        const [{ ok: archOk, data: arch, error: archError }, { ok: bosResponseOk, data: bos, error: bosError }] = await Promise.all([
          readObservabilityResponse<ObservabilityArchData>(archResult, '架构健康数据'),
          readObservabilityResponse<ObservabilityBosData>(bosResult, 'BOS 指标数据'),
        ]);
        const bosUnavailable = bosResponseOk && (bos?.data_quality === 'unavailable' || bos?.status === 'unavailable');
        if (archOk && arch) setArchData(arch);
        if (bosResponseOk && bos && !bosUnavailable) setBosData(bos);
        const failures = [archError, bosError, bosUnavailable ? 'BOS 指标数据：当前不可用' : null].filter(Boolean);
        setError(failures.length ? failures.join('；') : null);
      } catch (loadError) {
        console.error('Failed to load observability data:', loadError);
        setError(loadError instanceof Error ? loadError.message : '可观测数据不可用');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [retryToken]);

  const filteredDomains = useMemo(() => {
    const domains = Array.isArray(bosData?.domains) ? bosData.domains : [];
    const normalizedQuery = domainQuery.trim().toLowerCase();
    return domains.filter((domain) => {
      const matchesQuery = !normalizedQuery || String(domain.domain || '').toLowerCase().includes(normalizedQuery);
      const degraded = (domain.error || 0) > 0 || (domain.avg_latency || 0) >= 700;
      const matchesStatus = domainStatus === 'all' || (domainStatus === 'degraded' ? degraded : !degraded);
      return matchesQuery && matchesStatus;
    });
  }, [bosData, domainQuery, domainStatus]);

  const observabilityBacklog = useMemo(() => {
    const degradedDomains = filteredDomains.filter((domain) => (domain.error || 0) > 0 || (domain.avg_latency || 0) >= 700);
    const hottestDomains = (degradedDomains.length ? degradedDomains : filteredDomains).slice(0, 3);
    const governanceHealth = archData?.governance?.health || 'unknown';
    const gitDirty = archData?.git?.status && archData.git.status !== 'clean';
    return {
      degradedDomains: hottestDomains,
      governanceHealth,
      gitDirty,
      healthScore: archData?.system?.health_score ?? null,
    };
  }, [archData, filteredDomains]);

  const observabilityClosureRows = useMemo<ObservabilityClosureRow[]>(() => {
    const firstDomain = observabilityBacklog.degradedDomains[0];
    const governanceWatching = observabilityBacklog.governanceHealth !== 'fresh';
    return [
      {
        id: 'domain-log',
        title: '异常域追日志证据',
        summary: '先把高错误率或高延迟的 BOS 域落到日志证据，再决定是路由问题还是应用问题。',
        signal: firstDomain ? `${firstDomain.domain} · 失败 ${firstDomain.error || 0}` : `异常域 ${observabilityBacklog.degradedDomains.length}`,
        nextAction: firstDomain
          ? `先看 ${firstDomain.domain} 的日志与时间点，再回网格核对路由。`
          : '当前没有明显异常域，抽查日志链路是否还能支撑追证据。',
        statusTone: firstDomain ? 'degraded' : 'online',
        objectTarget: { tab: 'LogViewer', taskQuery: firstDomain?.domain || 'observability' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstDomain?.domain || 'observability' },
      },
      {
        id: 'mesh-route',
        title: '网格路由复核',
        summary: '域级流量异常不只看日志，还要回网格确认路由、下游服务和 BOS 链路是不是稳定。',
        signal: firstDomain ? `待复核 ${firstDomain.domain}` : `总调用 ${bosData?.summary?.total_calls ?? 0}`,
        nextAction: firstDomain
          ? `回 MCP 网格看 ${firstDomain.domain} 的路由与下游服务，再决定问题落点。`
          : '当前没有热点异常域，抽查一条 BOS 路由链是否仍然通畅。',
        statusTone: firstDomain ? 'degraded' : 'online',
        objectTarget: { tab: 'McpMesh', taskQuery: firstDomain?.domain || 'mesh' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstDomain?.domain || 'mesh' },
      },
      {
        id: 'alert-performance',
        title: '告警与性能收口',
        summary: '观测问题最终要回告警和性能页收口，确认是否已形成需要处理的正式异常项。',
        signal: observabilityBacklog.healthScore !== null ? `健康度 ${observabilityBacklog.healthScore}` : '等待健康评分',
        nextAction: '先回告警中心看异常项，再去性能页核趋势和热点，别让观测只停在当前页。',
        statusTone: observabilityBacklog.degradedDomains.length > 0 || governanceWatching ? 'degraded' : 'online',
        objectTarget: { tab: 'AlertCenter', taskQuery: focusTaskQuery || 'observability' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'observability' },
      },
      {
        id: 'systemmap-task',
        title: '系统地图与任务中心回挂',
        summary: '观测异常最后要回挂全站覆盖面和任务承接，不然只能看到问题，看不到治理落点。',
        signal: governanceWatching ? `治理 ${observabilityBacklog.governanceHealth}` : `Git ${observabilityBacklog.gitDirty ? 'dirty' : 'clean'}`,
        nextAction: '把观测异常挂回系统地图和任务中心，补项目、页面和治理层的后续动作。',
        statusTone: governanceWatching || observabilityBacklog.gitDirty ? 'degraded' : 'online',
        objectTarget: { tab: 'SystemMap', pageId: 'Observability' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'Observability' },
      },
    ];
  }, [bosData?.summary?.total_calls, focusTaskQuery, observabilityBacklog.degradedDomains, observabilityBacklog.gitDirty, observabilityBacklog.governanceHealth, observabilityBacklog.healthScore]);

  const focusedObservabilityCard = useMemo(() => {
    const domains = Array.isArray(bosData?.domains) ? bosData.domains : [];
    const matchedDomain = domains.find((domain) => (
      matchesObservabilityFocusQuery([
        domain.domain,
        String(domain.error ?? ''),
        String(domain.avg_latency ?? ''),
      ], focusTaskQuery)
    ));
    if (matchedDomain) {
      return {
        kicker: '异常域',
        title: matchedDomain.domain,
        detail: `失败 ${matchedDomain.error || 0} 次 · 延迟 ${matchedDomain.avg_latency || 0} ms，先追日志，再回网格核对路由。`,
        objectTarget: { tab: 'Observability', taskQuery: matchedDomain.domain },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedDomain.domain },
      };
    }

    if (matchesObservabilityFocusQuery([
      archData?.governance?.health,
      archData?.git?.status,
      String(archData?.system?.health_score ?? ''),
    ], focusTaskQuery)) {
      return {
        kicker: '健康与治理',
        title: '系统健康与治理保鲜',
        detail: `健康度 ${archData?.system?.health_score ?? 'N/A'} · 治理 ${archData?.governance?.health || 'unknown'} · Git ${archData?.git?.status || 'unknown'}`,
        objectTarget: { tab: 'Observability', taskQuery: focusTaskQuery || 'health' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'health' },
      };
    }

    const matchedClosure = observabilityClosureRows.find((row) => (
      matchesObservabilityFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '观测闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'Observability') {
      return {
        kicker: '当前页面',
        title: '运行可观测',
        detail: '这页负责把异常域、治理保鲜和跨页追证据串成一个观测面，不让问题只剩指标数字。',
        objectTarget: { tab: 'SystemMap', pageId: 'Observability' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Observability' },
      };
    }

    return null;
  }, [archData, bosData, focusPageId, focusTaskQuery, observabilityClosureRows]);
  const observabilityContextQuery = observabilityBacklog.degradedDomains[0]?.domain || domainQuery.trim() || focusTaskQuery || 'Observability';
  const observabilityTaskDraft = useMemo(() => {
    const firstDomain = observabilityBacklog.degradedDomains[0];
    const title = firstDomain ? `处理观测异常：${firstDomain.domain}` : '补齐运行可观测治理链路';
    const description = firstDomain
      ? `${firstDomain.domain} 当前失败 ${firstDomain.error || 0} 次，平均延迟 ${firstDomain.avg_latency || 0} ms。请关联日志、网格路由和告警证据，确认根因并完成治理收口。`
      : '当前没有明确热点域，先抽查架构健康、BOS 指标、日志和告警链路，确认运行可观测面仍能支撑异常治理。';
    return {
      title,
      description,
      taskTarget: { tab: 'TaskCenter' as const, taskQuery: firstDomain?.domain || 'Observability' },
      objectTarget: { tab: firstDomain ? 'LogViewer' as const : 'Observability' as const, taskQuery: firstDomain?.domain || 'Observability' },
    };
  }, [observabilityBacklog.degradedDomains]);
  const createObservabilityTask = async () => {
    setTaskPending(true);
    setTaskNotice(null);
    setTaskError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: observabilityTaskDraft.title,
          description: observabilityTaskDraft.description,
          priority: observabilityBacklog.degradedDomains.length > 0 ? 'high' : 'medium',
          risk_level: 'L1',
          evidence_required: ['BOS 指标时间点', '日志或网格路由证据', '告警关联与处理结果', 'task closeout'],
          tags: ['observability', 'runtime-governance'],
          source: {
            type: 'cockpit.observability',
            id: observabilityBacklog.degradedDomains[0]?.domain || 'observability',
            title: '运行可观测',
            target: observabilityTaskDraft.objectTarget,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '观测任务登记失败');
      setTaskNotice(`已登记观测治理任务：${payload.title || observabilityTaskDraft.title}`);
      if (payload.id) openCockpitNavigationTarget({ ...observabilityTaskDraft.taskTarget, taskQuery: String(payload.id) }, onNavigate, onOpenTarget);
    } catch (requestError) {
      setTaskError(requestError instanceof Error ? requestError.message : '观测任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在聚合系统级多维观测数据...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PlatformControlWorkbench currentPage="Observability" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {error && (
        <div className="shell-data-banner" role="alert">
          <span>{error}，当前观测数字不代表系统为 0。</span>
          <button type="button" onClick={() => setRetryToken((token) => token + 1)}>
            <RefreshCw size={14} aria-hidden="true" />
            <span>重试</span>
          </button>
        </div>
      )}

      <ActionSurfacePanel
        title="观测动作区"
        subtitle="先看异常和健康，再进入更具体的性能、日志和告警工作面。"
        statusText={bosData?.summary?.total_calls ? `BOS ${bosData.summary.total_calls} calls` : '等待观测数据'}
        onNavigate={onNavigate}
        items={[
          {
            id: 'perf',
            title: '追性能瓶颈',
            detail: '当延迟和吞吐开始波动时，直接切到性能页看趋势和热点。',
            actionLabel: '看性能页',
            actionType: 'navigate',
            actionValue: 'Performance',
            actionTarget: { tab: 'Performance', taskQuery: observabilityContextQuery },
          },
          {
            id: 'logs',
            title: '查日志证据',
            detail: '遇到错误率上升或域流量异常时，去日志页追具体报错。',
            actionLabel: '看日志页',
            actionType: 'navigate',
            actionValue: 'LogViewer',
            actionTarget: { tab: 'LogViewer', taskQuery: observabilityContextQuery },
          },
          {
            id: 'alerts',
            title: '回告警中心',
            detail: '如果已经出现健康度下降，直接回告警中心收敛需要处理的项。',
            actionLabel: '看告警页',
            actionType: 'navigate',
            actionValue: 'AlertCenter',
            actionTarget: { tab: 'AlertCenter', taskQuery: observabilityContextQuery },
          },
          {
            id: 'mesh',
            title: '排 BOS 网格',
            detail: '域级流量不稳时，切去 MCP 网格看路由和下游服务。',
            actionLabel: '去网格页',
            actionType: 'navigate',
            actionValue: 'McpMesh',
            actionTarget: { tab: 'McpMesh', taskQuery: observabilityContextQuery },
          },
        ]}
        onOpenTarget={onOpenTarget}
      />

      <section className="services-section" aria-label="观测域筛选">
        <div className="section-header">
          <div>
            <h2>观测域筛选</h2>
            <p className="text-muted">统一收敛热点、闭环承接和 BOS 域明细，按域名或健康状态定位证据。</p>
          </div>
          <span className="status-badge online">匹配 {filteredDomains.length}/{Array.isArray(bosData?.domains) ? bosData.domains.length : 0}</span>
        </div>
        <div className="list-filters">
          <label className="filter-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">搜索观测域</span>
            <input
              type="search"
              value={domainQuery}
              onChange={(event) => setDomainQuery(event.target.value)}
              placeholder="搜索观测域"
              aria-label="搜索观测域"
            />
          </label>
          <label>
            <span className="sr-only">观测域状态</span>
            <select aria-label="观测域状态" value={domainStatus} onChange={(event) => setDomainStatus(event.target.value as 'all' | 'degraded' | 'healthy')}>
              <option value="all">全部状态</option>
              <option value="degraded">异常域</option>
              <option value="healthy">健康域</option>
            </select>
          </label>
          {(domainQuery || domainStatus !== 'all') && (
            <button type="button" className="antd-btn" onClick={() => { setDomainQuery(''); setDomainStatus('all'); }}>
              <X size={14} aria-hidden="true" />
              <span>清除筛选</span>
            </button>
          )}
        </div>
      </section>

      {focusedObservabilityCard && (
        <section className="services-section overview-ops-panel" aria-label="当前观测承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前观测承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成观测面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedObservabilityCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedObservabilityCard.title}</strong>
              <p>{focusedObservabilityCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开观测焦点对象 ${focusedObservabilityCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedObservabilityCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Activity size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开观测焦点任务 ${focusedObservabilityCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedObservabilityCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <ShieldCheck size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" role="region" aria-label="观测闭环总表">
        <div className="section-header">
          <div>
            <h2>观测闭环总表</h2>
            <p className="text-muted">把异常域、网格、告警、性能和治理回挂并排摆出来，观测页才不只是看数字和点按钮。</p>
          </div>
          <span className="status-badge online">{observabilityClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {observabilityClosureRows.map((row) => (
            <article
              key={`observability-closure-${row.id}`}
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
                  type="button"
                  className="antd-btn"
                  aria-label={`打开观测闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开观测闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section" role="region" aria-label="观测治理任务">
        <div className="section-header">
          <div>
            <h2>观测治理任务</h2>
            <p className="text-muted">把当前异常域或观测链路缺口直接登记为正式任务，继续补日志、路由、告警和 closeout 证据。</p>
          </div>
          <span className={`status-badge ${observabilityBacklog.degradedDomains.length > 0 ? 'degraded' : 'online'}`}>
            {observabilityBacklog.degradedDomains.length > 0 ? '发现异常' : '抽查承接'}
          </span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{observabilityTaskDraft.title}</strong>
            <p>{observabilityTaskDraft.description}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="antd-btn"
              disabled={taskPending}
              aria-label={`登记观测治理任务 ${observabilityTaskDraft.title}`}
              onClick={() => { void createObservabilityTask(); }}
            >
              <ClipboardCheck size={14} />
              <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开观测治理对象 ${observabilityTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(observabilityTaskDraft.objectTarget, onNavigate, onOpenTarget)}
            >
              <Activity size={14} />
              <span>看证据</span>
            </button>
          </div>
        </article>
        {(taskNotice || taskError) && (
          <div className="shell-data-banner" role="status" aria-live="polite">
            {taskNotice || taskError}
          </div>
        )}
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>观测承接工作台</h2>
            <p className="text-muted">把异常域、治理保鲜和跨页承接摆在一起，别只盯着数字看热闹。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">异常域 {observabilityBacklog.degradedDomains.length}</span>
            <span className={`status-badge ${observabilityBacklog.governanceHealth === 'fresh' ? 'online' : 'degraded'}`}>
              治理 {observabilityBacklog.governanceHealth}
            </span>
            <span className={`status-badge ${observabilityBacklog.gitDirty ? 'degraded' : 'online'}`}>
              Git {observabilityBacklog.gitDirty ? 'dirty' : 'clean'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>异常域追踪</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>优先处理报错或高延迟的 BOS 域，先看网格再看日志。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'McpMesh', taskQuery: observabilityContextQuery }, onNavigate, onOpenTarget)}>
                <Activity size={14} />
                <span>去网格页</span>
              </button>
            </div>
            {observabilityBacklog.degradedDomains.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有明显异常域。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {observabilityBacklog.degradedDomains.map((domain) => (
                  <button
                    key={`domain-${domain.domain}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看异常域 ${domain.domain}`}
                    onClick={() => openCockpitNavigationTarget({ tab: 'LogViewer', taskQuery: domain.domain }, onNavigate, onOpenTarget)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{domain.domain}</strong>
                      <p>失败 {domain.error || 0} 次 · 延迟 {domain.avg_latency || 0} ms</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>先看日志，再回网格核对路由。</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>健康与治理保鲜</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>健康度、Git 差异和治理 freshness 一旦偏离，就该回系统地图和告警中心。</p>
            </div>
            <div className="action-surface-item">
              <div>
                <strong>系统健康度 {observabilityBacklog.healthScore ?? 'N/A'}</strong>
                <p>治理 {observabilityBacklog.governanceHealth} · Git {observabilityBacklog.gitDirty ? 'dirty' : 'clean'}</p>
              </div>
              <button type="button" className="antd-btn small" aria-label="打开观测承接到告警中心" onClick={() => openCockpitNavigationTarget({ tab: 'AlertCenter', taskQuery: observabilityContextQuery }, onNavigate, onOpenTarget)}>
                告警中心
              </button>
            </div>
            <button
              type="button"
              className="action-surface-item"
              aria-label="打开观测承接到系统地图"
              onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', taskQuery: observabilityContextQuery }, onNavigate, onOpenTarget)}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <div>
                <strong>回系统地图收口</strong>
                <p>把观测异常挂回全站功能缺口和项目覆盖面。</p>
              </div>
              <ShieldCheck size={14} />
            </button>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>下一步页面</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>观测问题一般会流向性能、日志、告警和网格，不再靠脑补跳转。</p>
            </div>
            {[
              { id: 'Performance', label: '性能页', reason: '看趋势、热点和耗时波动。', aria: '打开观测承接到性能页' },
              { id: 'LogViewer', label: '日志页', reason: '追具体错误和时间点。', aria: '打开观测承接到日志页' },
              { id: 'AlertCenter', label: '告警中心', reason: '收敛需要处理的异常项。', aria: '打开观测承接到告警页' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: observabilityContextQuery }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <Activity size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <div className="observability-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}>
            <Activity size={18} aria-hidden="true" className="text-accent" />
            BOS I0 网格链路流量
          </h3>

          {bosData && bosData.summary ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>总调用次数</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{bosData.summary.total_calls}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>平均延迟 (ms)</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{bosData.summary.avg_latency}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '2px' }}>请求成功率</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-success)' }}>
                  {bosData.summary.total_calls ? Math.round((bosData.summary.success_count / bosData.summary.total_calls) * 100) : 0}%
                </div>
              </div>
            </div>
          ) : <p className="text-muted" style={{ fontSize: '13px' }}>暂无活跃流量数据</p>}
        </div>

        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}>
            <ShieldCheck size={18} aria-hidden="true" className="text-success" />
            系统架构健康度
          </h3>

          {archData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>系统健康度评分</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-primary)' }}>
                  {archData.system?.health_score || 'N/A'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>Git (ecos) 代码状态</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: archData.git?.status === 'clean' ? 'var(--antd-success)' : 'var(--antd-warning)' }}>
                  {archData.git?.status === 'clean' ? 'Clean' : `${archData.git?.uncommitted} Diff`}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>治理审计周期保鲜</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: archData.governance?.health === 'fresh' ? 'var(--antd-success)' : 'var(--antd-warning)' }}>
                  {archData.governance?.health === 'fresh' ? 'Fresh' : archData.governance?.health || 'N/A'}
                </div>
              </div>
            </div>
          ) : <p className="text-muted" style={{ fontSize: '13px' }}>暂无架构评估数据</p>}
        </div>
      </div>

      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>BOS 域名流量分布明细</h3>
        </div>

        <div className="services-list">
          {filteredDomains.length > 0 ? (
            <table className="services-table" aria-label="BOS 路由域名流量分布表">
              <thead>
                <tr>
                  <th scope="col">BOS 域名 (Domain)</th>
                  <th scope="col">总调用量</th>
                  <th scope="col">成功数 (Success)</th>
                  <th scope="col">失败数 (Error)</th>
                  <th scope="col">平均延迟 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {filteredDomains.map((domain) => (
                  <tr key={domain.domain} className="service-row">
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{domain.domain}</td>
                    <td>{domain.total}</td>
                    <td style={{ color: 'var(--antd-success)' }}>{domain.success}</td>
                    <td style={{ color: domain.error > 0 ? 'var(--antd-error)' : 'inherit' }}>{domain.error}</td>
                    <td>{domain.avg_latency} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted" style={{ padding: '24px', fontSize: '13px', textAlign: 'center' }}>
              {Array.isArray(bosData?.domains) && bosData.domains.length > 0 ? '当前筛选下没有匹配的域名流量数据' : '暂无域名流量分布数据'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
