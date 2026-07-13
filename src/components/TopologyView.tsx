import { useState, useEffect, memo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Server, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import './Dashboard.css';
import ActionSurfacePanel from './ActionSurfacePanel';
import InfrastructureOpsWorkbench from './InfrastructureOpsWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

const ServiceNode = memo(({ data }: any) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle size={12} style={{ color: 'var(--antd-success)' }} />;
      case 'offline': return <XCircle size={12} style={{ color: 'var(--antd-error)' }} />;
      case 'degraded': return <AlertTriangle size={12} style={{ color: 'var(--antd-warning)' }} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'var(--antd-success)';
      case 'offline': return 'var(--antd-error)';
      case 'degraded': return 'var(--antd-warning)';
      default: return 'var(--antd-text-muted)';
    }
  };

  return (
    <div style={{ 
      padding: '12px 16px', 
      borderRadius: 'var(--antd-radius-lg)',
      background: 'rgba(6, 9, 19, 0.9)',
      border: `1px solid ${getStatusColor(data.status)}`,
      color: '#fff',
      minWidth: '160px',
      boxShadow: `0 0 15px rgba(0, 242, 254, 0.05), inset 0 0 10px rgba(0,0,0,0.8)`,
      backdropFilter: 'blur(8px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Cybertech grid background effect inside node */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
        background: 'linear-gradient(rgba(0, 242, 254, 0.015) 50%, rgba(0,0,0,0.2) 50%)',
        backgroundSize: '100% 4px', pointerEvents: 'none', zIndex: 0, opacity: 0.5
      }} />
      
      <Handle type="target" position={Position.Top} style={{ background: getStatusColor(data.status), width: 8, height: 8 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
        <Server size={14} style={{ color: getStatusColor(data.status) }} />
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--antd-text-primary)' }}>{data.name}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--antd-text-secondary)', position: 'relative', zIndex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {getStatusIcon(data.status)} 
          <span style={{ textTransform: 'capitalize', color: getStatusColor(data.status), fontWeight: 500 }}>{data.status}</span>
        </span>
        {data.latency && <span style={{ color: 'var(--antd-primary)', textShadow: '0 0 4px rgba(0, 242, 254, 0.3)' }}>{data.latency}</span>}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: getStatusColor(data.status), width: 8, height: 8 }} />
    </div>
  );
});

const nodeTypes = {
  serviceNode: ServiceNode,
};

interface TopologyViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesTopologyFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function serviceStatus(service: any): 'online' | 'offline' | 'degraded' {
  if (service.circuit === '断路' || service.status === 'offline' || service.status === 'stopped') return 'offline';
  if (service.circuit === '半开' || service.status === 'degraded' || service.status === 'warning') return 'degraded';
  if (service.health === 'unreachable' || service.health === 'unhealthy' || service.health === 'error') return 'offline';
  if (service.health === 'degraded' || service.health === 'warning') return 'degraded';
  if (service.port_listening === false) return 'offline';
  return 'online';
}

function serviceLatency(service: any): string | undefined {
  if (service.latency) return service.latency;
  if (service.health && service.health !== 'healthy') return service.health;
  return undefined;
}

function dependencyNames(service: any): string[] {
  const candidates = [service.dependencies, service.depends_on, service.upstream];
  return candidates.flatMap((value) => {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.name || item.id || item.service || item.target;
      return null;
    }).filter(Boolean) as string[];
  });
}

export function buildTopology(rawServices: any[]): { nodes: Node[]; edges: Edge[] } {
  const nodeKeys = new Map<string, string>();
  rawServices.forEach((service) => {
    const key = String(service.id || service.name || '');
    if (!key) return;
    nodeKeys.set(key, key);
    if (service.name) nodeKeys.set(String(service.name), key);
  });

  const centerX = 350;
  const centerY = 200;
  const radius = Math.max(180, Math.min(320, rawServices.length * 32));
  const nodes: Node[] = rawServices.map((service, index) => {
    const key = String(service.id || service.name || `service-${index}`);
    const angle = (index / Math.max(rawServices.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const status = serviceStatus(service);
    return {
      id: key,
      type: 'serviceNode',
      position: { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) },
      data: { name: service.name || key, status, latency: serviceLatency(service), uptime: service.uptime },
    };
  });

  const edges: Edge[] = [];
  rawServices.forEach((service) => {
    const target = String(service.id || service.name || '');
    if (!target) return;
    dependencyNames(service).forEach((dependency) => {
      const source = nodeKeys.get(String(dependency));
      if (!source || source === target) return;
      const dependencyService = rawServices.find((item) => String(item.id || item.name || '') === source);
      const dependencyStatus = serviceStatus(dependencyService || {});
      edges.push({
        id: `edge-${source}-${target}`,
        source,
        target,
        animated: dependencyStatus === 'online',
        style: { stroke: dependencyStatus === 'offline' ? 'var(--antd-error)' : 'var(--antd-primary)', strokeWidth: 2, opacity: 0.6 },
        markerEnd: { type: MarkerType.ArrowClosed, color: dependencyStatus === 'offline' ? 'var(--antd-error)' : 'var(--antd-primary)' },
      });
    });
  });

  return { nodes, edges };
}

export default function TopologyView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: TopologyViewProps) {
  const [services, setServices] = useState<any[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('服务拓扑数据不可用');
        const payload = await response.json();
        const rawServices = Array.isArray(payload) ? payload : (Array.isArray(payload.items) ? payload.items : []);
        if (rawServices.length === 0) {
          setServices([]);
          setNodes([]);
          setEdges([]);
          setError('暂无可用服务拓扑');
          return;
        }
        setError('');
        setServices(rawServices);

        const topology = buildTopology(rawServices);
        setNodes(topology.nodes);
        setEdges(topology.edges);
      } catch (error) {
        console.error('Failed to load topology:', error);
        setServices([]);
        setNodes([]);
        setEdges([]);
        setError(error instanceof Error ? error.message : '服务拓扑数据不可用');
      } finally {
        setLoading(false);
      }
    };

    void fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, [retryToken, setNodes, setEdges]);

  const attentionServices = services
    .map((service) => ({
      id: String(service.id || service.name || 'unknown'),
      name: service.name || String(service.id || 'unknown'),
      status: serviceStatus(service),
      dependencyCount: dependencyNames(service).length,
    }))
    .filter((service) => service.status !== 'online' || service.dependencyCount === 0)
    .slice(0, 4);
  const topologyActionItems = [
    {
      id: 'topology-compute',
      title: '回算力页确认基础设施',
      detail: '离线或未连通节点先去算力与服务页确认启动、端口和资源状态。',
      actionLabel: '进入算力页',
      actionType: 'navigate' as const,
      actionValue: 'Compute',
    },
    {
      id: 'topology-mesh',
      title: '回网格页核对依赖',
      detail: '有关系但状态异常的节点，优先回网格页确认连接和路由约束。',
      actionLabel: '进入网格页',
      actionType: 'navigate' as const,
      actionValue: 'McpMesh',
    },
    {
      id: 'topology-logs',
      title: '去日志页追证据',
      detail: '当拓扑只显示异常节点而没有原因时，继续回日志页核对真实报错。',
      actionLabel: '进入日志页',
      actionType: 'navigate' as const,
      actionValue: 'LogViewer',
    },
  ];
  const focusedTopologyCard = (() => {
    const matchedService = services
      .map((service) => ({
        id: String(service.id || service.name || 'unknown'),
        name: service.name || String(service.id || 'unknown'),
        status: serviceStatus(service),
        dependencyCount: dependencyNames(service).length,
      }))
      .find((service) => (
        matchesTopologyFocusQuery([service.id, service.name, service.status], focusTaskQuery)
      ));

    if (matchedService) {
      const statusText = matchedService.status === 'offline'
        ? '离线'
        : matchedService.status === 'degraded'
          ? '降级'
          : '待补关系';
      return {
        kicker: '拓扑对象',
        title: matchedService.name,
        detail: `${statusText} · 依赖 ${matchedService.dependencyCount}，先在拓扑上确认范围，再决定去算力、网格或日志页深挖。`,
        objectTarget: { tab: 'Topology', taskQuery: matchedService.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedService.id },
      };
    }

    if (focusPageId === 'Topology') {
      return {
        kicker: '当前页面',
        title: '全局拓扑',
        detail: '这页负责把服务关系、异常节点和后续追查去向放在一张图里，不让运行问题只停在“知道有问题”。',
        objectTarget: { tab: 'SystemMap', pageId: 'Topology' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Topology' },
      };
    }

    return null;
  })();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <InfrastructureOpsWorkbench currentPage="Topology" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="拓扑动作区"
        subtitle="先确认异常节点和孤立依赖，再回算力、网格和日志页缩小真实根因。"
        statusText={`${services.length} 节点 / ${edges.length} 关系 / ${attentionServices.length} 待确认`}
        items={topologyActionItems}
        onNavigate={onNavigate}
      />

      {focusedTopologyCard && (
        <section className="services-section overview-ops-panel" aria-label="当前拓扑承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前拓扑承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成拓扑面当前该盯住的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedTopologyCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedTopologyCard.title}</strong>
              <p>{focusedTopologyCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开拓扑焦点对象 ${focusedTopologyCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedTopologyCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Server size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开拓扑焦点任务 ${focusedTopologyCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedTopologyCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <AlertTriangle size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>拓扑承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把拓扑上的异常节点、孤立节点和后续追查页放在地图前面，避免只停在“看到关系”这一步。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge online">节点 {services.length}</span>
            <span className="status-badge degraded">关系 {edges.length}</span>
            <span className="status-badge degraded">异常 {attentionServices.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>异常节点</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>离线、降级或没有依赖关系证据的节点优先处理。</p>
            </div>
            {attentionServices.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有需要额外确认的节点。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {attentionServices.map((service) => (
                  <button
                    key={`topology-${service.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看拓扑服务 ${service.name}`}
                    onClick={() => onNavigate?.(service.status === 'offline' ? 'Compute' : 'McpMesh')}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{service.name}</strong>
                      <p>{service.status === 'offline' ? '离线' : service.status === 'degraded' ? '降级' : '待补关系'} · 依赖 {service.dependencyCount}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>点击后去更适合承接的页面继续排查。</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>追查去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>拓扑图给出范围，真正承接还要回算力、网格和日志页继续缩小问题。</p>
            </div>
            {[
              { id: 'Compute', label: '算力页', reason: '确认节点是否启动、端口是否监听。', aria: '打开拓扑承接到算力页' },
              { id: 'McpMesh', label: '网格页', reason: '确认服务之间的连接与路由约束。', aria: '打开拓扑承接到网格页' },
              { id: 'LogViewer', label: '日志页', reason: '把异常节点带回日志核对真实报错。', aria: '打开拓扑承接到日志页' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => onNavigate?.(page.id)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <Server size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <div className="antd-card" style={{ width: '100%', height: 'calc(100vh - 260px)', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--antd-border-color)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>全局网络拓扑地图</h2>
        <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>只展示真实运行探针和服务声明的依赖关系，不根据节点名称推断调用流。</p>
        {!loading && !error && edges.length === 0 && (
          <p className="text-muted" style={{ fontSize: '12px', margin: '8px 0 0' }}>当前探针未提供显式关系证据，节点状态可见，连线暂不推断。</p>
        )}
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div className="loading-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className="spinner" aria-hidden="true" style={{ marginBottom: '16px' }}></div>
            <p className="text-muted">正在探测微服务网格拓扑...</p>
          </div>
        ) : error ? (
          <div role="alert" className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={32} className="text-warning" />
            <h3>{error}</h3>
            <p className="text-muted">拓扑只展示真实运行探针，不使用静态或模拟服务数据。</p>
            <button className="btn btn-outline" onClick={() => { setLoading(true); setRetryToken((value) => value + 1); }}>重试拓扑探测</button>
          </div>
        ) : (
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-right"
          >
            <Background color="rgba(0, 242, 254, 0.05)" gap={24} size={1} />
            <Controls style={{ 
              background: 'var(--antd-bg-elevated)', 
              border: '1px solid var(--antd-border-color)', 
              fill: 'var(--antd-text-primary)' 
            }} />
          </ReactFlow>
        )}
      </div>
      </div>
    </div>
  );
}
