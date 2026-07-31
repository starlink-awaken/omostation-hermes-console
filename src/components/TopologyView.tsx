import { useState, useEffect, useMemo, memo } from 'react';
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

type ServiceNodeData = {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  latency?: string;
  uptime?: string | number;
};

const ServiceNode = memo(({ data }: { data: ServiceNodeData }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle size={12} style={{ color: 'var(--cockpit-success)' }} />;
      case 'offline': return <XCircle size={12} style={{ color: 'var(--cockpit-error)' }} />;
      case 'degraded': return <AlertTriangle size={12} style={{ color: 'var(--cockpit-warning)' }} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'var(--cockpit-success)';
      case 'offline': return 'var(--cockpit-error)';
      case 'degraded': return 'var(--cockpit-warning)';
      default: return 'var(--cockpit-text-muted)';
    }
  };

  return (
    <div style={{ 
      padding: '12px 16px', 
      borderRadius: 'var(--cockpit-radius-lg)',
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
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--cockpit-text-primary)' }}>{data.name}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--cockpit-text-secondary)', position: 'relative', zIndex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {getStatusIcon(data.status)} 
          <span style={{ textTransform: 'capitalize', color: getStatusColor(data.status), fontWeight: 500 }}>{data.status}</span>
        </span>
        {data.latency && <span style={{ color: 'var(--cockpit-primary)', textShadow: '0 0 4px rgba(0, 242, 254, 0.3)' }}>{data.latency}</span>}
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

type TopologyClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

type TopologyService = {
  id?: string;
  name?: string;
  status?: string;
  health?: string;
  circuit?: string;
  port_listening?: boolean;
  latency?: string;
  uptime?: string | number;
  dependencies?: unknown;
  depends_on?: unknown;
  upstream?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function matchesTopologyFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function serviceStatus(service: TopologyService): 'online' | 'offline' | 'degraded' {
  if (service.circuit === '断路' || service.status === 'offline' || service.status === 'stopped') return 'offline';
  if (service.circuit === '半开' || service.status === 'degraded' || service.status === 'warning') return 'degraded';
  if (service.health === 'unreachable' || service.health === 'unhealthy' || service.health === 'error') return 'offline';
  if (service.health === 'degraded' || service.health === 'warning') return 'degraded';
  if (service.port_listening === false) return 'offline';
  return 'online';
}

function serviceLatency(service: TopologyService): string | undefined {
  if (service.latency) return String(service.latency);
  if (service.health && service.health !== 'healthy') return service.health;
  return undefined;
}

function dependencyNames(service: TopologyService): string[] {
  const candidates = [service.dependencies, service.depends_on, service.upstream];
  return candidates.flatMap((value) => {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (isRecord(item)) {
        const name = item.name || item.id || item.service || item.target;
        return typeof name === 'string' ? name : null;
      }
      return null;
    }).filter(Boolean) as string[];
  });
}

// 拓扑构图函数被组件测试和运行时复用，保留在此文件作为稳定的纯函数边界。
// eslint-disable-next-line react-refresh/only-export-components
export function buildTopology(rawServices: TopologyService[]): { nodes: Node[]; edges: Edge[] } {
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
        style: { stroke: dependencyStatus === 'offline' ? 'var(--cockpit-error)' : 'var(--cockpit-primary)', strokeWidth: 2, opacity: 0.6 },
        markerEnd: { type: MarkerType.ArrowClosed, color: dependencyStatus === 'offline' ? 'var(--cockpit-error)' : 'var(--cockpit-primary)' },
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
  const [services, setServices] = useState<TopologyService[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [topologyQuery, setTopologyQuery] = useState('');
  const [topologyStatusFilter, setTopologyStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');

  useEffect(() => {
    if (focusTaskQuery && services.some((service) => matchesTopologyFocusQuery([service.id, service.name, service.status], focusTaskQuery))) {
      // 外部导航查询需要同步到拓扑筛选条件。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTopologyQuery(focusTaskQuery);
    }
  }, [focusTaskQuery, services]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('服务拓扑数据不可用');
        const payload: unknown = await response.json();
        const rawServices: TopologyService[] = Array.isArray(payload)
          ? payload.filter(isRecord) as TopologyService[]
          : isRecord(payload) && Array.isArray(payload.items)
            ? payload.items.filter(isRecord) as TopologyService[]
            : [];
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

  const filteredServices = useMemo(() => services.filter((service) => {
    const status = serviceStatus(service);
    if (topologyStatusFilter !== 'all' && status !== topologyStatusFilter) return false;
    const query = topologyQuery.trim().toLowerCase();
    if (!query) return true;
    return [service.id, service.name, service.status, service.health, status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  }), [services, topologyQuery, topologyStatusFilter]);

  useEffect(() => {
    const topology = buildTopology(filteredServices);
    setNodes(topology.nodes);
    setEdges(topology.edges);
  }, [filteredServices, setNodes, setEdges]);

  const attentionServices = filteredServices
    .map((service) => ({
      id: String(service.id || service.name || 'unknown'),
      name: service.name || String(service.id || 'unknown'),
      status: serviceStatus(service),
      dependencyCount: dependencyNames(service).length,
    }))
    .filter((service) => service.status !== 'online' || service.dependencyCount === 0)
    .slice(0, 4);
  const createTopologyTask = async () => {
    const service = attentionServices[0];
    const subject = service?.name || '全局拓扑';
    setTaskPending(true);
    setTaskNotice(null);
    setTaskError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `拓扑依赖治理：${subject}`,
          description: `针对 ${subject} 的拓扑异常核对显式依赖、节点健康和下游影响，并把结果回写到算力、网格与日志证据链。`,
          priority: service?.status === 'offline' ? 'high' : 'medium',
          risk_level: 'L1',
          evidence_required: ['拓扑节点与依赖快照', '节点健康或端口证据', '网格与日志处理结果', 'task closeout'],
          tags: ['topology', 'runtime-governance'],
          source: {
            type: 'cockpit.topology-view',
            id: service?.id || subject,
            title: '全局拓扑',
            target: { tab: 'Topology', taskQuery: subject },
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '拓扑任务登记失败');
      setTaskNotice(`已登记拓扑治理任务：${payload.title || subject}`);
      if (payload.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: payload.id }, onNavigate, onOpenTarget);
    } catch (taskRequestError) {
      setTaskError(taskRequestError instanceof Error ? taskRequestError.message : '拓扑任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };
  const firstAttentionService = attentionServices[0] || null;
  const firstOfflineService = attentionServices.find((service) => service.status === 'offline') || null;
  const firstIsolatedService = attentionServices.find((service) => service.dependencyCount === 0) || null;
  const topologyActionItems = [
    {
      id: 'topology-compute',
      title: '回算力页确认基础设施',
      detail: '离线或未连通节点先去算力与服务页确认启动、端口和资源状态。',
      actionLabel: '进入算力页',
      actionType: 'navigate' as const,
      actionValue: 'Compute',
      actionTarget: { tab: 'Compute', taskQuery: focusTaskQuery || firstAttentionService?.id || 'Topology' },
    },
    {
      id: 'topology-mesh',
      title: '回网格页核对依赖',
      detail: '有关系但状态异常的节点，优先回网格页确认连接和路由约束。',
      actionLabel: '进入网格页',
      actionType: 'navigate' as const,
      actionValue: 'McpMesh',
      actionTarget: { tab: 'McpMesh', taskQuery: focusTaskQuery || firstAttentionService?.id || 'Topology' },
    },
    {
      id: 'topology-logs',
      title: '去日志页追证据',
      detail: '当拓扑只显示异常节点而没有原因时，继续回日志页核对真实报错。',
      actionLabel: '进入日志页',
      actionType: 'navigate' as const,
      actionValue: 'LogViewer',
      actionTarget: { tab: 'LogViewer', taskQuery: focusTaskQuery || firstAttentionService?.id || 'Topology' },
    },
  ];
  const topologyClosureRows: TopologyClosureRow[] = [
    {
      id: 'node-compute',
      title: '异常节点与算力排障',
      summary: '拓扑页先负责指出异常节点，但节点到底是停了、端口没起还是资源爆了，还得回算力面继续排障。',
      signal: firstOfflineService ? `离线 ${attentionServices.filter((service) => service.status === 'offline').length}` : `异常 ${attentionServices.length}`,
      nextAction: firstOfflineService
        ? `优先围绕 ${firstOfflineService.name} 回算力页确认启动、端口监听和资源状态。`
        : firstAttentionService
          ? `先看 ${firstAttentionService.name} 的基础状态，确认它是降级还是仅缺依赖证据。`
          : '当前没有明显异常节点，抽查一次拓扑到算力面的承接链是否还能走通。',
      statusTone: firstAttentionService ? 'degraded' : 'online',
      objectTarget: { tab: 'Compute', taskQuery: firstOfflineService?.id || firstAttentionService?.id || 'topology-compute' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstOfflineService?.id || firstAttentionService?.id || 'topology-compute' },
    },
    {
      id: 'dependency-mesh',
      title: '依赖关系与网格核对',
      summary: '拓扑图只告诉你关系有没有露出来，真正的连接、路由和约束，还得回网格面继续核对。',
      signal: firstIsolatedService ? `孤点 ${firstIsolatedService.name}` : `关系 ${edges.length}`,
      nextAction: firstIsolatedService
        ? `优先核对 ${firstIsolatedService.name} 为什么没有依赖证据，再回网格页看路由和注册。`
        : edges.length > 0
          ? '当前已有显式关系，抽查一条关键依赖是否能在网格页继续落证。'
          : '当前还没有显式关系证据，先回网格页核对注册和依赖声明。',
      statusTone: firstIsolatedService || edges.length === 0 ? 'degraded' : 'online',
      objectTarget: { tab: 'McpMesh', taskQuery: firstIsolatedService?.id || firstAttentionService?.id || 'topology-mesh' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstIsolatedService?.id || firstAttentionService?.id || 'topology-mesh' },
    },
    {
      id: 'logs-evidence',
      title: '日志证据与任务承接',
      summary: '拓扑异常如果不回日志抓真实报错，最后只能知道哪儿坏了，不知道为什么坏，也沉不成正式动作。',
      signal: firstAttentionService ? `追证 ${firstAttentionService.name}` : '待补日志证据',
      nextAction: firstAttentionService
        ? `把 ${firstAttentionService.name} 带去日志页抓证据，再决定要不要立刻送进任务中心。`
        : '当前没有明显异常对象，抽查一次拓扑到日志和任务中心的承接链是否仍然可用。',
      statusTone: firstAttentionService ? 'degraded' : 'online',
      objectTarget: { tab: 'LogViewer', taskQuery: firstAttentionService?.id || 'topology-logs' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstAttentionService?.id || 'topology-logs' },
    },
    {
      id: 'systemmap-task',
      title: '系统地图与任务回挂',
      summary: '拓扑问题如果已经反复出现，就不该只留在运行面，要回系统地图挂成全站缺口，再由任务中心持续追。',
      signal: attentionServices.length > 0 ? `待回挂 ${attentionServices.length}` : `节点 ${services.length}`,
      nextAction: attentionServices.length > 0
        ? '把重复异常正式回挂到系统地图，再在任务中心保留长期承接动作。'
        : '当前没有明显待回挂对象，抽查拓扑页与系统地图、任务中心的互跳链路。',
      statusTone: services.length > 0 ? 'degraded' : 'online',
      objectTarget: { tab: 'SystemMap', pageId: 'Topology' },
      taskTarget: { tab: 'TaskCenter', taskQuery: 'Topology' },
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

    const matchedClosure = topologyClosureRows.find((row) => (
      matchesTopologyFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '拓扑闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
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
      <InfrastructureOpsWorkbench currentPage="Topology" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <ActionSurfacePanel
        title="拓扑动作区"
        subtitle="先确认异常节点和孤立依赖，再回算力、网格和日志页缩小真实根因。"
        statusText={`显示 ${filteredServices.length}/${services.length} 节点 / ${edges.length} 关系 / ${attentionServices.length} 待确认`}
        items={topologyActionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <section className="services-section" aria-label="拓扑正式任务">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>拓扑正式任务</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>把异常节点或依赖链直接登记为可审批、可留证、可 closeout 的治理任务。</p>
          </div>
          <button
            type="button"
            className="cockpit-btn"
            disabled={taskPending}
            aria-label="登记拓扑治理任务"
            onClick={() => { void createTopologyTask(); }}
          >
            <AlertTriangle size={14} />
            <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
          </button>
        </div>
        {(taskNotice || taskError) && (
          <p role={taskError ? 'alert' : 'status'} className={taskError ? 'text-danger' : 'text-muted'} style={{ margin: '8px 0 0', fontSize: 12 }}>
            {taskError || taskNotice}
          </p>
        )}
      </section>

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
                className="cockpit-btn"
                aria-label={`打开拓扑焦点对象 ${focusedTopologyCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedTopologyCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Server size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="cockpit-btn"
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

      <section className="services-section" role="region" aria-label="拓扑闭环总表">
        <div className="section-header">
          <div>
            <h2>拓扑闭环总表</h2>
            <p className="text-muted">把异常节点排障、依赖核对、日志追证和系统地图回挂并排摆出来，拓扑页才不只是关系图和异常名单。</p>
          </div>
          <span className="status-badge online">{topologyClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {topologyClosureRows.map((row) => (
            <article
              key={`topology-closure-${row.id}`}
              className="cockpit-card"
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
                  className="cockpit-btn"
                  aria-label={`打开拓扑闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Server size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="cockpit-btn"
                  aria-label={`打开拓扑闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <AlertTriangle size={14} />
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
            <h2>拓扑承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把拓扑上的异常节点、孤立节点和后续追查页放在地图前面，避免只停在“看到关系”这一步。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge online">显示节点 {filteredServices.length}/{services.length}</span>
            <span className="status-badge degraded">关系 {edges.length}</span>
            <span className="status-badge degraded">异常 {attentionServices.length}</span>
          </div>
        </div>

        <div role="region" aria-label="拓扑节点筛选" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <input
            type="search"
            aria-label="搜索拓扑节点"
            placeholder="服务名、状态或健康信号"
            value={topologyQuery}
            onChange={(event) => setTopologyQuery(event.target.value)}
            style={{ flex: '1 1 260px', minWidth: 220 }}
          />
          <select
            aria-label="按状态筛选拓扑节点"
            value={topologyStatusFilter}
            onChange={(event) => setTopologyStatusFilter(event.target.value as typeof topologyStatusFilter)}
          >
            <option value="all">全部状态</option>
            <option value="online">在线</option>
            <option value="degraded">降级</option>
            <option value="offline">离线</option>
          </select>
          {(topologyQuery || topologyStatusFilter !== 'all') && (
            <button
              type="button"
              className="cockpit-btn small"
              aria-label="清除拓扑节点筛选"
              onClick={() => { setTopologyQuery(''); setTopologyStatusFilter('all'); }}
            >
              清除筛选
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="cockpit-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>异常节点</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>离线、降级或没有依赖关系证据的节点优先处理。</p>
            </div>
            {attentionServices.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>{services.length ? '没有匹配的拓扑节点。' : '当前没有需要额外确认的节点。'}</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {attentionServices.map((service) => (
                  <button
                    key={`topology-${service.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看拓扑服务 ${service.name}`}
                    onClick={() => openCockpitNavigationTarget({
                      tab: service.status === 'offline' ? 'Compute' : 'McpMesh',
                      taskQuery: service.name,
                    }, onNavigate, onOpenTarget)}
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

          <article className="cockpit-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                onClick={() => openCockpitNavigationTarget({
                  tab: page.id,
                  taskQuery: firstAttentionService?.name || topologyQuery.trim() || undefined,
                }, onNavigate, onOpenTarget)}
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

      <div className="cockpit-card" style={{ width: '100%', height: 'calc(100vh - 260px)', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--cockpit-border-color)' }}>
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
              background: 'var(--cockpit-bg-elevated)', 
              border: '1px solid var(--cockpit-border-color)', 
              fill: 'var(--cockpit-text-primary)' 
            }} />
          </ReactFlow>
        )}
      </div>
      </div>
    </div>
  );
}
