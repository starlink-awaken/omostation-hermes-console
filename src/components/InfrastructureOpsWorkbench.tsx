import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, Cpu, FileText, Gauge, Network, Route, Server, Workflow } from 'lucide-react';
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
  bosHealth: BosHealth | null;
  bosServices: BosService[];
  runtime: RuntimeService[];
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

export default function InfrastructureOpsWorkbench({ currentPage, onNavigate, onOpenTarget }: InfrastructureOpsWorkbenchProps) {
  const [state, setState] = useState<InfrastructureState>({
    loading: true,
    compute: null,
    bosHealth: null,
    bosServices: [],
    runtime: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [computeRes, bosHealthRes, bosServicesRes, runtimeRes] = await Promise.all([
          fetch('/api/governance/compute/status'),
          fetch('/api/bos/health'),
          fetch('/api/bos/services'),
          fetch('/api/services/status'),
        ]);

        const nextState: InfrastructureState = {
          loading: false,
          compute: null,
          bosHealth: null,
          bosServices: [],
          runtime: [],
        };

        if (computeRes.ok) nextState.compute = await computeRes.json();
        if (bosHealthRes.ok) nextState.bosHealth = await bosHealthRes.json();
        if (bosServicesRes.ok) {
          const bosServices = await bosServicesRes.json();
          nextState.bosServices = bosServices.services || [];
        }
        if (runtimeRes.ok) {
          const runtime = await runtimeRes.json();
          nextState.runtime = runtime.items || [];
        }

        if (!cancelled) setState(nextState);
      } catch (error) {
        if (!cancelled) {
          setState((previous) => ({ ...previous, loading: false }));
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

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

  const recommended = nextInfraAction(currentPage, degradedServices, unhealthyNodes, unhealthyModels, state.bosHealth);

  return (
    <section className="services-section infra-workbench" aria-label="基础设施工作台">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>基础设施工作台</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            把 BOS 网格、服务拓扑、算力节点和运行异常串成一条基础设施诊断链路。
          </p>
        </div>
        <span className={`status-badge ${state.loading ? 'online' : degradedServices.length > 0 || unhealthyNodes.length > 0 || unhealthyModels.length > 0 ? 'degraded' : 'online'}`}>
          {state.loading ? '同步中' : degradedServices.length > 0 || unhealthyNodes.length > 0 || unhealthyModels.length > 0 ? '需要排查' : '基础设施平稳'}
        </span>
      </div>

      <div className="infra-workbench-summary">
        <div className="infra-workbench-card">
          <span>网格路由</span>
          <strong>{state.bosHealth?.total_routes || state.bosServices.length}</strong>
          <small>成功率 {Math.round((state.bosHealth?.metrics?.success_rate || 0) * 100)}%</small>
        </div>
        <div className="infra-workbench-card">
          <span>异常节点</span>
          <strong>{unhealthyNodes.length}</strong>
          <small>模型异常 {unhealthyModels.length} · 运行异常 {degradedServices.length}</small>
        </div>
        <div className="infra-workbench-card infra-workbench-card-wide">
          <span>建议下一步</span>
          <strong>{recommended}</strong>
          <small>近期调用 {state.compute?.summary?.recent_calls || 0} · 平均延迟 {Math.round(state.compute?.summary?.avg_latency_ms || 0)} ms</small>
        </div>
      </div>

      <div className="infra-workbench-path">
        {INFRA_STEPS.map((step, index) => (
          <button
            key={step.id}
            className={`infra-workbench-step ${step.id === currentPage ? 'active' : ''}`}
            aria-label={`进入基础设施步骤 ${step.title}`}
            onClick={() => onNavigate?.(step.id)}
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
            <button className="antd-btn small" onClick={() => onNavigate?.('McpMesh')}>
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
            <button className="antd-btn small" onClick={() => onNavigate?.('Compute')}>
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
              <div className="home-focus-empty infra-workbench-empty">当前没有异常节点或模型</div>
            )}
          </div>
        </article>

        <article className="infra-workbench-panel">
          <div className="infra-workbench-panel-head">
            <strong>链路落点</strong>
            <button className="antd-btn small" onClick={() => onNavigate?.('Topology')}>
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
