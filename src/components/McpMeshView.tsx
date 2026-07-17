import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, Globe, Network, PlusCircle, Send, ShieldCheck } from 'lucide-react';
import './Dashboard.css';
import ActionSurfacePanel from './ActionSurfacePanel';
import InfrastructureOpsWorkbench from './InfrastructureOpsWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import { validateInstanceRegistration } from './instanceRegistration';

const MESH_DOMAINS = ['all', 'memory', 'governance', 'analysis', 'persona', 'capability'];

interface BosService {
  uri: string;
  domain: string;
  action: string;
  transport: string;
}

interface BosHealth {
  status: string;
  total_routes: number;
  domains: Record<string, number>;
  metrics: any;
}

interface McpMeshViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type MeshClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesMeshQuery(value?: string | null, query?: string) {
  if (!value || !query) return false;
  const haystack = value.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!haystack || !needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}

async function readMeshResponse<T>(
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

export default function McpMeshView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: McpMeshViewProps) {
  const [services, setServices] = useState<BosService[]>([]);
  const [health, setHealth] = useState<BosHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [meshQuery, setMeshQuery] = useState('');
  const [transportFilter, setTransportFilter] = useState('all');
  
  // 实例注册表单
  const [registerName, setRegisterName] = useState('');
  const [registerEndpoint, setRegisterEndpoint] = useState('');
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [registerTaskId, setRegisterTaskId] = useState<string | null>(null);
  const [registerTaskCreated, setRegisterTaskCreated] = useState<boolean | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // URI 解析器
  const [resolveUri, setResolveUri] = useState('bos://memory/kos/search');
  const [resolveArgs, setResolveArgs] = useState('{\n  "query": "SSOT"\n}');
  const [resolveResult, setResolveResult] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [servicesResult, healthResult] = await Promise.allSettled([
        fetch('/api/bos/services'),
        fetch('/api/bos/health')
      ]);

      const [{ ok: servicesOk, data: servicesData, error: servicesError }, { ok: healthOk, data: healthData, error: healthError }] = await Promise.all([
        readMeshResponse<{ services?: BosService[] }>(servicesResult, 'BOS 服务列表'),
        readMeshResponse<BosHealth>(healthResult, 'BOS 健康探针'),
      ]);
      if (servicesOk && servicesData) setServices(servicesData.services || []);
      if (healthOk && healthData) setHealth(healthData);
      setDataError([servicesError, healthError].filter(Boolean).join('；') || null);
    } catch (e) {
      console.error('Failed to fetch McpMesh data:', e);
      setDataError(e instanceof Error ? e.message : '网格数据暂不可用');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [refreshToken]);

  useEffect(() => {
    if (!focusTaskQuery) return;
    const matchedService = services.find((service) =>
      matchesMeshQuery(service.domain, focusTaskQuery)
      || matchesMeshQuery(service.uri, focusTaskQuery)
      || matchesMeshQuery(service.action, focusTaskQuery),
    ) || null;
    if (matchedService) {
      setSelectedDomain(matchedService.domain);
      setResolveUri(matchedService.uri);
      return;
    }
    const matchedDomain = MESH_DOMAINS.find((domain) => domain !== 'all' && matchesMeshQuery(domain, focusTaskQuery)) || null;
    if (matchedDomain) {
      setSelectedDomain(matchedDomain);
      setRegisterName(matchedDomain);
    }
  }, [focusTaskQuery, services]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEndpoint) return;
    setRegisterStatus(null);
    setRegisterTaskId(null);
    setRegisterTaskCreated(null);
    setRegisterError(null);
    const validationError = validateInstanceRegistration(registerName, registerEndpoint);
    if (validationError) {
      setRegisterError(validationError);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('service', registerName);
      formData.append('mcp_endpoint', registerEndpoint);

      const res = await fetch('/api/instance', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setRegisterTaskId(data.task_id || null);
        setRegisterTaskCreated(data.task_created ?? null);
        setRegisterStatus(
          data.task_created === false
            ? `${data.msg || '注册成功！'} 但验收任务创建失败，请稍后重试。`
            : (data.msg || '注册成功！'),
        );
        setRegisterName('');
        setRegisterEndpoint('');
        await fetchData(); // 刷新网格
      } else {
        setRegisterError(data.error || '注册失败');
      }
    } catch (err: any) {
      setRegisterError(err.message || '注册发生错误');
    }
  };

  const handleResolve = async () => {
    if (!resolveUri) return;
    setResolving(true);
    setResolveError(null);
    setResolveResult(null);

    try {
      // 校验 JSON
      let parsedArgs = '{}';
      try {
        if (resolveArgs.trim()) {
          JSON.parse(resolveArgs);
          parsedArgs = resolveArgs;
        }
      } catch (je) {
        throw new Error('参数 Arguments 必须是合法的 JSON 格式');
      }

      const res = await fetch(`/api/bos/resolve?uri=${encodeURIComponent(resolveUri)}&arguments=${encodeURIComponent(parsedArgs)}`);
      const data = await res.json();
      if (res.ok) {
        setResolveResult(data);
      } else {
        setResolveError(data.error || '解析调用失败');
      }
    } catch (err: any) {
      setResolveError(err.message || '网络或服务端异常');
    } finally {
      setResolving(false);
    }
  };

  const transportOptions = useMemo(() => Array.from(new Set(services.map((service) => service.transport).filter(Boolean))), [services]);
  const filteredServices = useMemo(() => {
    const query = meshQuery.trim().toLowerCase();
    return services.filter((service) => {
      if (selectedDomain !== 'all' && service.domain !== selectedDomain) return false;
      if (transportFilter !== 'all' && service.transport !== transportFilter) return false;
      if (!query) return true;
      return [service.uri, service.domain, service.action, service.transport]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [meshQuery, selectedDomain, services, transportFilter]);
  const domains = MESH_DOMAINS;

  const meshBacklog = (() => {
    const domainCounts = domains
      .filter((domain) => domain !== 'all')
      .map((domain) => ({ domain, count: services.filter((service) => service.domain === domain).length }))
      .sort((left, right) => right.count - left.count);
    const missingDomains = domainCounts.filter((entry) => entry.count === 0);
    return {
      domainCounts: domainCounts.slice(0, 3),
      missingDomains: missingDomains.length ? missingDomains : domainCounts.slice(-2),
      registrationCount: services.filter((service) => service.transport === 'http').length,
    };
  })();

  const meshActionItems = [
    {
      id: 'mesh-observability',
      title: '回观测面追异常',
      detail: '域路由出现高延迟或错误时，先回观测面核对告警和日志证据。',
      actionLabel: '进入观测页',
      actionType: 'navigate' as const,
      actionValue: 'Observability',
      actionTarget: { tab: 'Observability', taskQuery: focusTaskQuery || services[0]?.domain || 'McpMesh' },
    },
    {
      id: 'mesh-compute',
      title: '查算力分流',
      detail: '下游服务异常或热点不均时，继续到算力面看节点和预算状态。',
      actionLabel: '进入算力页',
      actionType: 'navigate' as const,
      actionValue: 'Compute',
      actionTarget: { tab: 'Compute', taskQuery: focusTaskQuery || services[0]?.domain || 'McpMesh' },
    },
    {
      id: 'mesh-domain-apps',
      title: '回应用中心补挂载',
      detail: '缺失域路由或新增实例注册后，顺手回应用中心核对领域应用承接。',
      actionLabel: '进入应用中心',
      actionType: 'navigate' as const,
      actionValue: 'DomainApps',
      actionTarget: { tab: 'DomainApps', taskQuery: focusTaskQuery || services[0]?.domain || 'McpMesh' },
    },
  ];

  const topDomain = meshBacklog.domainCounts[0] || null;
  const firstMissingDomain = meshBacklog.missingDomains[0] || null;
  const firstService = filteredServices[0] || services[0] || null;
  const resolveSignal = resolveResult
    ? '已完成一次解析'
    : resolving
      ? '解析中'
      : resolveError
        ? '解析待修'
        : `待验证 ${resolveUri.split('/')[2] || 'URI'}`;
  const meshClosureRows: MeshClosureRow[] = [
    {
      id: 'domain-observability',
      title: '热点域与观测追证',
      summary: '热点域不能只在路由表里看数量，最后要回观测和日志看真实延迟、错误和告警证据。',
      signal: topDomain ? `${topDomain.domain.toUpperCase()} ${topDomain.count} 条` : `总路由 ${services.length}`,
      nextAction: topDomain
        ? `先围绕 ${topDomain.domain.toUpperCase()} 域回观测面核对异常，再决定是否扩实例或改路由。`
        : '当前没有明显热点域，抽查一条网格路由到观测面的承接链是否仍然可用。',
      statusTone: topDomain ? 'degraded' : 'online',
      objectTarget: { tab: 'Observability', taskQuery: topDomain?.domain || 'mesh-observability' },
      taskTarget: { tab: 'TaskCenter', taskQuery: topDomain?.domain || 'mesh-observability' },
    },
    {
      id: 'domain-app-mount',
      title: '缺失域与应用补挂',
      summary: '缺失域不是单纯的网格空位，它通常意味着领域入口、挂载对象或服务注册还没真正接上。',
      signal: firstMissingDomain ? `待补 ${meshBacklog.missingDomains.length}` : '域覆盖完整',
      nextAction: firstMissingDomain
        ? `先补 ${firstMissingDomain.domain.toUpperCase()} 域注册，再回应用中心核对对应领域入口是否已经挂上。`
        : '当前没有缺失域，抽查应用中心与网格域之间的映射关系是否还是一致的。',
      statusTone: firstMissingDomain ? 'degraded' : 'online',
      objectTarget: { tab: 'DomainApps', taskQuery: firstMissingDomain?.domain || 'mesh-domain-apps' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstMissingDomain?.domain || 'mesh-domain-apps' },
    },
    {
      id: 'protocol-compute',
      title: '协议桥接与算力分流',
      summary: '网格问题经常不是单页问题，要回协议面核对约束，再去算力面确认分流和下游节点是不是健康。',
      signal: firstService ? `${firstService.domain.toUpperCase()} · ${firstService.transport}` : `HTTP ${meshBacklog.registrationCount}`,
      nextAction: firstService
        ? `围绕 ${firstService.uri} 回协议面核对桥接约束，再去算力面确认它压到了哪些节点。`
        : '当前没有已注册服务，先补一条实例注册，再确认协议与算力链路是否承接得住。',
      statusTone: firstService ? 'degraded' : 'online',
      objectTarget: { tab: 'Protocol', taskQuery: firstService?.domain || 'mesh-protocol' },
      taskTarget: { tab: 'Compute', taskQuery: firstService?.domain || 'mesh-compute' },
    },
    {
      id: 'resolve-task-closeout',
      title: '解析验收与任务收口',
      summary: 'URI 解析器和实例注册不是终点，验证过的解析结果要沉成任务，不然下次还是靠人脑记住。',
      signal: resolveSignal,
      nextAction: resolveResult
        ? '把这次解析和注册验收结果送进任务中心，补清楚后续处理动作。'
        : registerStatus
          ? '注册刚成功，继续做一次解析验收，再把结果沉到任务中心。'
          : '先完成一次 URI 解析或实例注册验收，再把后续动作正式送进任务中心。',
      statusTone: resolveResult || registerStatus ? 'degraded' : 'online',
      objectTarget: { tab: 'McpMesh', taskQuery: resolveUri || registerName || 'mesh-resolve' },
      taskTarget: { tab: 'TaskCenter', taskQuery: resolveUri || registerName || 'mesh-resolve' },
    },
  ];

  const focusedMeshCard = useMemo(() => {
    const matchedService = focusTaskQuery
      ? services.find((service) =>
        matchesMeshQuery(service.domain, focusTaskQuery)
        || matchesMeshQuery(service.uri, focusTaskQuery)
        || matchesMeshQuery(service.action, focusTaskQuery),
      ) || null
      : null;
    const matchedDomain = focusTaskQuery
      ? meshBacklog.domainCounts.find((entry) => matchesMeshQuery(entry.domain, focusTaskQuery))
        || meshBacklog.missingDomains.find((entry) => matchesMeshQuery(entry.domain, focusTaskQuery))
        || null
      : null;

    if (matchedService) {
      return {
        title: matchedService.uri,
        meta: `从系统地图带回来的 ${matchedService.domain.toUpperCase()} 路由对象`,
        state: `${matchedService.domain} · ${matchedService.transport} · ${matchedService.action}`,
        nextAction: '继续核对该域路由、下游实例和跨页证据，不让问题停在 URI 解析器里。',
        objectTarget: { tab: 'McpMesh', taskQuery: matchedService.domain } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedService.domain } as CockpitNavigationTarget,
      };
    }

    if (matchedDomain) {
      return {
        title: matchedDomain.domain.toUpperCase(),
        meta: '从全站审计带回来的网格域对象',
        state: `${matchedDomain.count} 条路由 · 当前聚焦域`,
        nextAction: matchedDomain.count === 0
          ? '先补该域实例注册，再回应用中心和任务中心做承接。'
          : '继续核对热点域的实例注册、观测证据和任务承接。',
        objectTarget: { tab: 'McpMesh', taskQuery: matchedDomain.domain } as CockpitNavigationTarget,
        taskTarget: {
          tab: matchedDomain.count === 0 ? 'DomainApps' : 'TaskCenter',
          taskQuery: matchedDomain.domain,
        } as CockpitNavigationTarget,
      };
    }

    const matchedClosure = focusTaskQuery
      ? meshClosureRows.find((row) => (
        matchesMeshQuery(row.title, focusTaskQuery)
        || matchesMeshQuery(row.summary, focusTaskQuery)
        || matchesMeshQuery(row.signal, focusTaskQuery)
        || matchesMeshQuery(row.nextAction, focusTaskQuery)
      )) || null
      : null;
    if (matchedClosure) {
      return {
        title: matchedClosure.title,
        meta: '从网格闭环总表带回来的收口对象',
        state: matchedClosure.signal,
        nextAction: matchedClosure.nextAction,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'McpMesh') {
      return {
        title: '网格与 MCP',
        meta: '从页面闭环审计带回来的运行大盘页面',
        state: `${services.length} 条路由 · ${meshBacklog.missingDomains.length} 个待补域`,
        nextAction: '先把热点域、缺失域和跨页承接动作收口，再决定回观测、算力还是应用中心。',
        objectTarget: { tab: 'SystemMap', pageId: 'McpMesh' } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: 'McpMesh' } as CockpitNavigationTarget,
      };
    }

    return null;
  }, [focusPageId, focusTaskQuery, meshBacklog.domainCounts, meshBacklog.missingDomains, services]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取 Agora 网格拓扑与 BOS 路由注册表...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <InfrastructureOpsWorkbench currentPage="McpMesh" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {dataError && (
        <div role="alert" className="antd-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', color: 'var(--antd-error)', border: '1px solid rgba(255,71,87,0.2)' }}>
          <span>网格数据加载失败：{dataError}</span>
          <button
            type="button"
            className="antd-btn"
            aria-label="重试网格数据"
            onClick={() => {
              setDataError(null);
              setLoading(true);
              setRefreshToken((value) => value + 1);
            }}
          >
            重试
          </button>
        </div>
      )}
      
      {/* 顶部统计面板 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>网格已注册 BOS 路由</h3>
            <p className="stat-value">{health?.total_routes || services.length}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div className="stat-info">
            <h3>网格健康度</h3>
            <p className="stat-value" style={{ color: 'var(--antd-success)' }}>
              {health?.status === 'ok' ? 'Healthy' : 'Degraded'}
            </p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-accent)' }}>
          <div className="stat-info">
            <h3>BOS 解析域分类</h3>
            <p className="stat-value" style={{ fontSize: '20px', fontWeight: 600, marginTop: '8px', color: 'var(--antd-primary)' }}>
              Memory / Governance / Analysis / Persona / Capability
            </p>
          </div>
        </div>
      </div>

      <ActionSurfacePanel
        title="网格动作区"
        subtitle="先看路由域和实例注册，再决定回观测、算力还是应用中心继续收口。"
        statusText={services.length ? `${services.length} 条 BOS 路由` : '等待路由数据'}
        items={meshActionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      {focusedMeshCard && (
        <section className="services-section" aria-label="当前网格承接焦点">
          <div className="section-header">
            <div>
              <h2>当前网格承接焦点</h2>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                网格页先把你刚定位到的域路由或页面对象承接住，再决定往任务中心、应用中心还是系统地图继续下钻。
              </p>
            </div>
            <button
              type="button"
              className="antd-btn small"
              aria-label="回系统地图继续定位"
              onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', taskQuery: focusTaskQuery || firstService?.domain || 'McpMesh' }, onNavigate, onOpenTarget)}
            >
              <Network size={13} />
              <span>回系统地图</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div>
                <strong style={{ display: 'block', fontSize: 15 }}>{focusedMeshCard.title}</strong>
                <small className="text-muted">{focusedMeshCard.meta}</small>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <span className="text-muted" style={{ fontSize: 12 }}>当前状态</span>
                  <strong style={{ display: 'block', marginTop: 4 }}>{focusedMeshCard.state}</strong>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: 12 }}>下一步</span>
                  <strong style={{ display: 'block', marginTop: 4, fontSize: 13 }}>{focusedMeshCard.nextAction}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开网格焦点对象 ${focusedMeshCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedMeshCard.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Network size={13} />
                  <span>看对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开网格焦点任务 ${focusedMeshCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedMeshCard.taskTarget, onNavigate, onOpenTarget)}
                >
                  <ShieldCheck size={13} />
                  <span>看任务承接</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="services-section" role="region" aria-label="网格闭环总表">
        <div className="section-header">
          <div>
            <h2>网格闭环总表</h2>
            <p className="text-muted">把热点域追证、缺失域补挂、协议/算力联动和解析验收任务一起摆出来，网格页才不只是路由与注册表。</p>
          </div>
          <span className="status-badge online">{meshClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {meshClosureRows.map((row) => (
            <article
              key={`mesh-closure-${row.id}`}
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
                  aria-label={`打开网格闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Network size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开网格闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <ShieldCheck size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>网格承接工作台</h2>
            <p className="text-muted">把热点域、待补域和实例注册承接成下一步动作，不让网格页只剩一堆路由表。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge online">已注册路由 {filteredServices.length}/{services.length}</span>
            <span className="status-badge degraded">待补域 {meshBacklog.missingDomains.length}</span>
            <span className="status-badge degraded">HTTP 实例 {meshBacklog.registrationCount}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>热点路由域</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先筛到热点域，再回观测面或日志页看真实异常证据。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'Observability', taskQuery: focusTaskQuery || firstService?.domain || 'McpMesh' }, onNavigate, onOpenTarget)}>
                <Activity size={14} />
                <span>看观测页</span>
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {meshBacklog.domainCounts.map((entry) => (
                <button
                  key={`domain-focus-${entry.domain}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`筛选网格域 ${entry.domain}`}
                  onClick={() => setSelectedDomain(entry.domain)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{entry.domain.toUpperCase()}</strong>
                    <p>{entry.count} 条路由</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>先聚焦当前域，再看解析与注册情况。</span>
                  </div>
                  <Network size={14} />
                </button>
              ))}
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>待补域与注册</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>缺失域不应该一直空着，直接转去应用中心和注册表单补位。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: focusTaskQuery || firstMissingDomain?.domain || firstService?.domain || 'McpMesh' }, onNavigate, onOpenTarget)}>
                <PlusCircle size={14} />
                <span>看应用中心</span>
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {meshBacklog.missingDomains.map((entry) => (
                <button
                  key={`missing-${entry.domain}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`补网格域 ${entry.domain}`}
                  onClick={() => {
                    setRegisterName(entry.domain);
                    setSelectedDomain('all');
                  }}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{entry.domain.toUpperCase()}</strong>
                    <p>{entry.count === 0 ? '当前还没有路由注册' : '需要继续扩充实例注册'}</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>点击后直接预填注册表单名称。</span>
                  </div>
                  <PlusCircle size={14} />
                </button>
              ))}
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>跨页承接</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>网格问题最后要回算力、观测和任务面上，不该只停在解析器里。</p>
            </div>
            {[
              { id: 'Compute', label: '算力页', reason: '查分流节点和预算风险。', aria: '打开网格承接到算力页' },
              { id: 'TaskCenter', label: '任务中心', reason: '把缺失域和注册失败转成任务。', aria: '打开网格承接到任务中心' },
              { id: 'Protocol', label: '协议面', reason: '核对路由约束和协议桥接。', aria: '打开网格承接到协议面' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: focusTaskQuery || firstService?.domain || 'McpMesh' }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <ShieldCheck size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      {/* 在线解析与实例注册双栏分区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        
        {/* 左栏：BOS URI 在线解析调用面板 */}
        <div className="services-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} className="text-primary" />
              <span>BOS URI 路由解析调试器</span>
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                目标 BOS URI
              </label>
              <input
                type="text"
                placeholder="bos://domain/action..."
                value={resolveUri}
                onChange={(e) => setResolveUri(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                调用参数 (JSON)
              </label>
              <textarea
                rows={4}
                placeholder="{}"
                value={resolveArgs}
                onChange={(e) => setResolveArgs(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#a9d1d9',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              onClick={handleResolve}
              disabled={resolving || !resolveUri}
              className="antd-btn"
              style={{
                width: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'var(--antd-primary)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Send size={14} />
              <span>{resolving ? '正在解析' : '开始解析'}</span>
            </button>

            {/* 解析结果 */}
            {resolveError && (
              <div style={{ color: 'var(--antd-error)', fontSize: '12px', padding: '8px', background: 'rgba(255,71,87,0.08)', borderRadius: '4px', border: '1px solid rgba(255,71,87,0.2)' }}>
                ⚠️ 解析错误: {resolveError}
              </div>
            )}

            {resolveResult && (
              <div style={{ marginTop: '10px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--antd-success)', marginBottom: '8px' }}>
                  解析成功 - 路由匹配详情:
                </h4>
                <pre style={{
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#00f2fe',
                  fontSize: '12px',
                  overflowX: 'auto',
                  maxHeight: '260px'
                }}>
                  {JSON.stringify(resolveResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* 右栏：分布式 MCP 实例注册表单 */}
        <div className="services-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="section-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={16} className="text-success" />
              <span>动态注册 MCP 新实例</span>
            </h3>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                服务标识 (Service Identifier)
              </label>
              <input
                type="text"
                placeholder="例如: family-hub"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                MCP Endpoint (Stdio / HTTP 挂载路径)
              </label>
              <input
                type="text"
                placeholder="例如: http://localhost:8000/mcp"
                value={registerEndpoint}
                onChange={(e) => setRegisterEndpoint(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              className="antd-btn"
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(5, 243, 162, 0.1)',
                color: 'var(--antd-success)',
                border: '1px solid rgba(5, 243, 162, 0.25)',
                cursor: 'pointer',
                fontWeight: 600,
                marginTop: '10px'
              }}
            >
              提交实例注册
            </button>

            {registerStatus && (
              <div style={{ color: registerTaskCreated === false ? 'var(--antd-warning)' : 'var(--antd-success)', fontSize: '12px', marginTop: '6px' }}>
                ✓ {registerStatus}
                {registerTaskId && registerTaskCreated !== false && (
                  <button
                    type="button"
                    className="antd-btn small"
                    aria-label={`打开 MCP 验收任务 ${registerTaskId}`}
                    onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: registerTaskId }, onNavigate, onOpenTarget)}
                    style={{ marginLeft: 8 }}
                  >
                    打开验收任务
                  </button>
                )}
              </div>
            )}
            {registerError && (
              <div style={{ color: 'var(--antd-error)', fontSize: '12px', marginTop: '6px' }}>
                ⚠️ {registerError}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 下方：BOS URI 全量路由注册表 */}
      <div className="services-section" style={{ marginTop: '0' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={16} className="text-primary" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>BOS URI 网格路由明细</h3>
          </div>

          {/* 筛选域、传输方式与路由文本 */}
          <div role="region" aria-label="网格路由筛选" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <input
              type="search"
              aria-label="搜索网格路由"
              placeholder="URI、Action 或传输方式"
              value={meshQuery}
              onChange={(event) => setMeshQuery(event.target.value)}
              style={{ minWidth: 190, padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
            />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>域:</span>
            <select
              aria-label="按域筛选网格路由"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {domains.map(d => (
                <option key={d} value={d}>
                  {d === 'all' ? '全部' : d.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              aria-label="按传输方式筛选网格路由"
              value={transportFilter}
              onChange={(event) => setTransportFilter(event.target.value)}
              style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
            >
              <option value="all">全部传输</option>
              {transportOptions.map((transport) => <option key={transport} value={transport}>{transport}</option>)}
            </select>
            {(meshQuery || selectedDomain !== 'all' || transportFilter !== 'all') && (
              <button type="button" className="antd-btn small" aria-label="清除网格路由筛选" onClick={() => { setMeshQuery(''); setSelectedDomain('all'); setTransportFilter('all'); }}>
                清除筛选
              </button>
            )}
          </div>
        </div>

        <div className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>显示 {filteredServices.length}/{services.length} 条路由</div>

        <div className="services-list">
          <table className="services-table" aria-label="BOS 网格路由清单">
            <thead>
              <tr>
                <th scope="col">BOS 协议 URI</th>
                <th scope="col">解析所属域</th>
                <th scope="col">绑定的 Action</th>
                <th scope="col">传输通道 (Transport)</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.45)' }}>
                    暂无对应域的路由定义
                  </td>
                </tr>
              ) : (
                filteredServices.map((svc, i) => (
                  <tr key={i} className="service-row">
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{svc.uri}</td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0, 242, 254, 0.05)',
                        color: 'var(--antd-primary)',
                        border: '1px solid rgba(0, 242, 254, 0.15)'
                      }}>
                        {svc.domain.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }} className="text-muted">{svc.action}</td>
                    <td>
                      <span className="status-badge" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {svc.transport}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
