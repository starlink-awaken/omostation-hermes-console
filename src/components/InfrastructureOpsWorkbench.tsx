import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, ClipboardCheck, Cpu, FileText, Gauge, Network, Route, Server, Workflow } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

type InfraPage = 'McpMesh' | 'Topology' | 'Compute' | 'Overview' | 'LogViewer' | string;

type InfraStep = {
  id: InfraPage;
  title: string;
  group: string;
};

type RuntimeService = {
  name: string;
  status: string;
  cpu?: number;
  memory?: number;
  uptime?: string;
};

type ComputeNode = {
  id: string;
  name: string;
  status: string;
  type?: string;
  cpu_usage?: number;
  gpu_usage?: number;
};

type ComputeModel = {
  model_name: string;
  status: string;
  provider?: string;
  latency_p50?: number | null;
  calls_today?: number;
};

type ComputePayload = {
  summary?: {
    recent_calls?: number;
    avg_latency_ms?: number;
    avg_tokens_per_second?: number;
  };
  cost_board?: {
    interception_rate?: number;
    actual_total_cost_usd?: number;
  };
  nodes?: ComputeNode[];
  available_models?: ComputeModel[];
};

type BosHealth = {
  status?: string;
  total_routes?: number;
  domains?: Record<string, number>;
  metrics?: {
    success_rate?: number;
    services_healthy?: number;
    services_degraded?: number;
  };
};

type BosService = {
  uri: string;
  domain: string;
  action: string;
  transport: string;
};

type InfrastructureOpsWorkbenchProps = {
  currentPage: InfraPage;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

type InfrastructureState = {
  loading: boolean;
  compute: ComputePayload | null;
  computeAvailable: boolean;
  bosHealth: BosHealth | null;
  bosHealthAvailable: boolean;
  bosServices: BosService[];
  bosServicesAvailable: boolean;
  runtime: RuntimeService[];
  runtimeAvailable: boolean;
  error: string | null;
};

const INFRA_STEPS: InfraStep[] = [
  { id: 'McpMesh', title: '网格与 MCP', group: '基础设施' },
  { id: 'Topology', title: '全局拓扑', group: '基础设施' },
  { id: 'Compute', title: '算力调配', group: '基础设施' },
  { id: 'Overview', title: '概览中心', group: '运行总面' },
  { id: 'LogViewer', title: '日志查看器', group: '开发工具' },
];

function infraIcon(pageId: InfraPage) {
  if (pageId === 'McpMesh') return <Workflow size={14} />;
  if (pageId === 'Topology') return <Network size={14} />;
  if (pageId === 'Compute') return <Cpu size={14} />;
  if (pageId === 'Overview') return <Gauge size={14} />;
  if (pageId === 'LogViewer') return <FileText size={14} />;
  return <ArrowRight size={14} />;
}

function nextInfraAction(currentPage: InfraPage, degradedServices: RuntimeService[], unhealthyNodes: ComputeNode[], unhealthyModels: ComputeModel[], bosHealth: BosHealth | null): string {
  if ((bosHealth?.metrics?.services_degraded || 0) > 0 && currentPage !== 'McpMesh') {
    return '先看网格与 MCP，确认是路由退化还是服务缺失。';
  }
  if (unhealthyNodes.length > 0 && currentPage !== 'Compute') {
    return '先去算力调配确认离线节点和高负载 GPU，再判断是否需要降级。';
  }
  if (degradedServices.length > 0 && currentPage !== 'Topology') {
    return '先看全局拓扑，确认异常是单节点还是整条链路。';
  }
  if (unhealthyModels.length > 0 && currentPage !== 'Compute') {
    return '模型健康有波动，建议回算力页确认 provider 和配额状态。';
  }
  if (currentPage !== 'Overview') {
    return '基础设施层暂时平稳，可以回概览中心合并看运行与项目风险。';
  }
  return '当前基础设施层没有明显红灯，抽样检查日志和慢链路即可。';
}

async function readInfrastructureResponse<T>(
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

export default function InfrastructureOpsWorkbench({ currentPage, onNavigate, onOpenTarget }: InfrastructureOpsWorkbenchProps) {
  const [state, setState] = useState<InfrastructureState>({
    loading: true,
    compute: null,
    computeAvailable: false,
    bosHealth: null,
    bosHealthAvailable: false,
    bosServices: [],
    bosServicesAvailable: false,
    runtime: [],
    runtimeAvailable: false,
    error: null,
  });
  const [retryToken, setRetryToken] = useState(0);
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [computeResult, bosHealthResult, bosServicesResult, runtimeResult] = await Promise.allSettled([
          fetch('/api/governance/compute/status'),
          fetch('/api/bos/health'),
          fetch('/api/bos/services'),
          fetch('/api/services/status'),
        ]);

        const [{ ok: computeOk, data: compute, error: computeError }, { ok: bosHealthOk, data: bosHealth, error: bosHealthError }, { ok: bosServicesOk, data: bosServices, error: bosServicesError }, { ok: runtimeOk, data: runtime, error: runtimeError }] = await Promise.all([
          readInfrastructureResponse<ComputePayload>(computeResult, '计算状态数据'),
          readInfrastructureResponse<BosHealth>(bosHealthResult, 'BOS 健康数据'),
          readInfrastructureResponse<{ services?: BosService[] }>(bosServicesResult, 'BOS 服务目录'),
          readInfrastructureResponse<{ items?: RuntimeService[] }>(runtimeResult, '运行服务状态'),
        ]);

        const nextState: InfrastructureState = {
          loading: false,
          compute: null,
          computeAvailable: computeOk,
          bosHealth: null,
          bosHealthAvailable: bosHealthOk,
          bosServices: [],
          bosServicesAvailable: bosServicesOk,
          runtime: [],
          runtimeAvailable: runtimeOk,
          error: null,
        };

        if (computeOk) nextState.compute = compute;
        if (bosHealthOk) nextState.bosHealth = bosHealth;
        if (bosServicesOk && bosServices) {
          nextState.bosServices = bosServices.services || [];
        }
        if (runtimeOk && runtime) {
          nextState.runtime = runtime.items || [];
        }
        nextState.error = [computeError, bosHealthError, bosServicesError, runtimeError].filter(Boolean).join('；') || null;

        if (!cancelled) setState(nextState);
      } catch (error) {
        if (!cancelled) {
          setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : '基础设施数据暂不可用' }));
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentPage, retryToken]);

  const degradedServices = useMemo(
    () => state.runtime.filter((service) => service.status !== 'online'),
    [state.runtime],
  );

  const unhealthyNodes = useMemo(
    () => (state.compute?.nodes || []).filter((node) => node.status !== 'online' || (node.gpu_usage || 0) >= 85 || (node.cpu_usage || 0) >= 85),
    [state.compute],
  );

  const unhealthyModels = useMemo(
    () => (state.compute?.available_models || []).filter((model) => model.status !== 'healthy'),
    [state.compute],
  );

  const topDomains = useMemo(
    () => Object.entries(state.bosHealth?.domains || {})
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4),
    [state.bosHealth],
  );

  const recommended = state.error
    ? '基础设施证据不完整，先恢复失败数据源再判断下一步。'
    : nextInfraAction(currentPage, degradedServices, unhealthyNodes, unhealthyModels, state.bosHealth);
  const infrastructureContextQuery = unhealthyNodes[0]?.id || unhealthyModels[0]?.model_name || topDomains[0]?.[0] || currentPage;
  const noInfrastructureSources = !state.loading
    && Boolean(state.error)
    && !state.computeAvailable
    && !state.bosHealthAvailable
    && !state.bosServicesAvailable
    && !state.runtimeAvailable;
  const gridUnavailable = !state.bosHealthAvailable && !state.bosServicesAvailable;
  const infrastructureTaskTitle = noInfrastructureSources
    ? '恢复基础设施诊断数据源'
    : unhealthyNodes.length > 0
      ? `排查基础设施节点：${unhealthyNodes[0].name}`
      : unhealthyModels.length > 0
        ? `排查基础设施模型：${unhealthyModels[0].model_name}`
        : degradedServices.length > 0
          ? `处理运行服务异常：${degradedServices[0].name}`
          : '抽查基础设施诊断链路';
  const infrastructureTaskDescription = noInfrastructureSources
    ? '基础设施工作台的计算、BOS、服务目录和运行态数据源均不可用。请恢复数据源并完成网格、算力、服务和日志链路验收。'
    : `${recommended} 当前上下文：${infrastructureContextQuery}。请关联基础设施指标、服务状态、网格或日志证据，并完成 TaskCenter closeout。`;
  const createInfrastructureTask = async () => {
    setTaskPending(true);
    setTaskNotice(null);
    setTaskError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: infrastructureTaskTitle,
          description: infrastructureTaskDescription,
          priority: noInfrastructureSources || unhealthyNodes.length > 0 || unhealthyModels.length > 0 ? 'high' : 'medium',
          risk_level: noInfrastructureSources ? 'L2' : 'L1',
          evidence_required: ['基础设施状态快照', '网格/服务/算力证据', '日志或处理结果', 'task closeout'],
          tags: ['infrastructure', 'runtime-governance'],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '基础设施任务登记失败');
      setTaskNotice(`已登记基础设施任务：${payload.title || infrastructureTaskTitle}`);
      if (payload.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: String(payload.id) }, onNavigate, onOpenTarget);
    } catch (requestError) {
      setTaskError(requestError instanceof Error ? requestError.message : '基础设施任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };

  return (
    <section className="services-section infra-workbench" aria-label="基础设施工作台">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>基础设施工作台</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            把 BOS 网格、服务拓扑、算力节点和运行异常串成一条基础设施诊断链路。
          </p>
        </div>
        <span className={`status-badge ${state.loading ? 'online' : noInfrastructureSources ? 'offline' : state.error || degradedServices.length > 0 || unhealthyNodes.length > 0 || unhealthyModels.length > 0 ? 'degraded' : 'online'}`}>
          {state.loading ? '同步中' : noInfrastructureSources ? '数据不可用' : state.error || degradedServices.length > 0 || unhealthyNodes.length > 0 || unhealthyModels.length > 0 ? '需要排查' : '基础设施平稳'}
        </span>
      </div>

      {state.error && (
        <div className="shell-data-banner" role="alert">
          <span>{state.error}，当前基础设施诊断可能不完整。</span>
          <button type="button" onClick={() => setRetryToken((token) => token + 1)}>重试</button>
        </div>
      )}

      <div className="infra-workbench-summary">
        <div className="infra-workbench-card">
          <span>网格路由</span>
          <strong>{gridUnavailable ? 'N/A' : state.bosHealth ? state.bosHealth.total_routes || state.bosServices.length : state.bosServices.length}</strong>
          <small>成功率 {gridUnavailable ? 'N/A' : state.bosHealth?.metrics?.success_rate !== undefined ? `${Math.round(state.bosHealth.metrics.success_rate * 100)}%` : '暂无'}</small>
        </div>
        <div className="infra-workbench-card">
          <span>异常节点</span>
          <strong>{state.computeAvailable ? unhealthyNodes.length : 'N/A'}</strong>
          <small>模型异常 {state.computeAvailable ? unhealthyModels.length : 'N/A'} · 运行异常 {state.runtimeAvailable ? degradedServices.length : 'N/A'}</small>
        </div>
        <div className="infra-workbench-card infra-workbench-card-wide">
          <span>建议下一步</span>
          <strong>{recommended}</strong>
          <small>{state.compute?.summary ? `近期调用 ${state.compute.summary.recent_calls || 0} · 平均延迟 ${Math.round(state.compute.summary.avg_latency_ms || 0)} ms` : noInfrastructureSources ? '算力摘要不可用' : '算力摘要暂无'}</small>
        </div>
      </div>

      <div className="action-surface-item" style={{ alignItems: 'flex-start' }}>
        <div>
          <strong>{infrastructureTaskTitle}</strong>
          <p>{infrastructureTaskDescription}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="antd-btn"
            disabled={taskPending}
            aria-label={`登记基础设施任务 ${infrastructureTaskTitle}`}
            onClick={() => { void createInfrastructureTask(); }}
          >
            <ClipboardCheck size={14} />
            <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
          </button>
          {taskNotice && <span role="status" aria-live="polite" className="text-muted">{taskNotice}</span>}
          {taskError && <span role="alert">{taskError}</span>}
        </div>
      </div>

      <div className="infra-workbench-path">
        {INFRA_STEPS.map((step, index) => (
          <button
            key={step.id}
            className={`infra-workbench-step ${step.id === currentPage ? 'active' : ''}`}
            aria-label={`进入基础设施步骤 ${step.title}`}
            onClick={() => openCockpitNavigationTarget({ tab: step.id, taskQuery: infrastructureContextQuery }, onNavigate, onOpenTarget)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.group}</small>
            </div>
            {infraIcon(step.id)}
          </button>
        ))}
      </div>

      <div className="infra-workbench-grid">
        <article className="infra-workbench-panel">
          <div className="infra-workbench-panel-head">
            <strong>网格热点</strong>
            <button className="antd-btn small" onClick={() => openCockpitNavigationTarget({ tab: 'McpMesh', taskQuery: topDomains[0]?.[0] || infrastructureContextQuery }, onNavigate, onOpenTarget)}>
              <Route size={13} />
              <span>去网格页</span>
            </button>
          </div>
          <div className="infra-workbench-list">
            {topDomains.map(([domain, count]) => (
              <button
                key={domain}
                className="infra-workbench-item"
                aria-label={`查看网格域 ${domain}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'McpMesh', taskQuery: domain }, onNavigate, onOpenTarget)}
              >
                <strong>{domain}</strong>
                <span>{count} 条路由</span>
                <small>站内继续钻域路由、URI 和解析结果。</small>
              </button>
            ))}
            {topDomains.length === 0 && (
              <div className="home-focus-empty infra-workbench-empty">当前没有可用网格摘要</div>
            )}
          </div>
        </article>

        <article className="infra-workbench-panel">
          <div className="infra-workbench-panel-head">
            <strong>节点与模型</strong>
            <button className="antd-btn small" onClick={() => openCockpitNavigationTarget({ tab: 'Compute', taskQuery: unhealthyNodes[0]?.id || unhealthyModels[0]?.model_name || infrastructureContextQuery }, onNavigate, onOpenTarget)}>
              <Cpu size={13} />
              <span>去算力页</span>
            </button>
          </div>
          <div className="infra-workbench-list">
            {unhealthyNodes.slice(0, 4).map((node) => (
              <button
                key={node.id}
                className="infra-workbench-item"
                aria-label={`查看算力节点 ${node.name}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'Compute', taskQuery: node.id || node.name }, onNavigate, onOpenTarget)}
              >
                <strong>{node.name}</strong>
                <span>{node.status} · CPU {node.cpu_usage || 0}% · GPU {node.gpu_usage || 0}%</span>
                <small>{node.type || '节点'} · 进入算力页看预算与负载。</small>
              </button>
            ))}
            {unhealthyNodes.length === 0 && unhealthyModels.slice(0, 3).map((model) => (
              <button
                key={model.model_name}
                className="infra-workbench-item"
                aria-label={`查看模型 ${model.model_name}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'Compute', taskQuery: model.model_name }, onNavigate, onOpenTarget)}
              >
                <strong>{model.model_name}</strong>
                <span>{model.provider || 'provider'} · {model.status}</span>
                <small>查看 latency、calls 和 provider 配额。</small>
              </button>
            ))}
            {unhealthyNodes.length === 0 && unhealthyModels.length === 0 && (
              <div className="home-focus-empty infra-workbench-empty">{state.computeAvailable ? '当前没有异常节点或模型' : '算力数据不可用'}</div>
            )}
          </div>
        </article>

        <article className="infra-workbench-panel">
          <div className="infra-workbench-panel-head">
            <strong>运行服务</strong>
            <button className="antd-btn small" onClick={() => openCockpitNavigationTarget({ tab: 'Performance', taskQuery: degradedServices[0]?.name || infrastructureContextQuery }, onNavigate, onOpenTarget)}>
              <Activity size={13} />
              <span>去性能页</span>
            </button>
          </div>
          <div className="infra-workbench-list">
            {state.runtime.slice(0, 4).map((service) => (
              <button
                key={service.name}
                className="infra-workbench-item"
                aria-label={`查看运行服务 ${service.name}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'Performance', taskQuery: service.name }, onNavigate, onOpenTarget)}
              >
                <strong>{service.name}</strong>
                <span>{service.status} · CPU {service.cpu ?? 0}% · 内存 {service.memory ?? 0}%</span>
                <small>{service.uptime ? `运行 ${service.uptime}` : '进入性能页看运行趋势。'}</small>
              </button>
            ))}
            {state.runtime.length === 0 && (
              <div className="home-focus-empty infra-workbench-empty">{state.runtimeAvailable ? '当前没有可用运行服务' : '运行服务数据不可用'}</div>
            )}
          </div>
        </article>

        <article className="infra-workbench-panel">
          <div className="infra-workbench-panel-head">
            <strong>链路落点</strong>
            <button className="antd-btn small" onClick={() => openCockpitNavigationTarget({ tab: 'Topology', taskQuery: infrastructureContextQuery }, onNavigate, onOpenTarget)}>
              <Network size={13} />
              <span>去拓扑页</span>
            </button>
          </div>
          <div className="infra-workbench-list">
            {[
              { id: 'topology', page: 'Topology', title: '先看全局拓扑', detail: '确认是不是整个链路有断点。' },
              { id: 'compute', page: 'Compute', title: '再看算力预算', detail: '确认是节点离线还是 provider 额度挤压。' },
              { id: 'overview', page: 'Overview', title: '回到运行总面', detail: '把基础设施异常和项目风险合并看。' },
              { id: 'logs', page: 'LogViewer', title: '最后看日志窗口', detail: '定位具体实例、URI 或 provider 的错误。' },
            ].map((item) => (
              <button
                key={item.id}
                className="infra-workbench-item"
                aria-label={`进入基础设施落点 ${item.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: item.page, taskQuery: topDomains[0]?.[0] || unhealthyNodes[0]?.name || 'infrastructure' }, onNavigate, onOpenTarget)}
              >
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
