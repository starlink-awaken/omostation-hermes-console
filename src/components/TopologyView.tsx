/**
 * TopologyView — 全局服务拓扑可视化.
 *
 * 从 fullsite 移植:
 *   - reactflow 交互式节点-边图 (圆形布局)
 *   - 自定义 ServiceNode 组件 (状态图标 + 延迟显示)
 *   - 节点搜索 + 状态筛选 (online/degraded/offline)
 *   - 异常节点自动识别
 *   - retryToken 重试模式
 *   - buildTopology 纯函数 (可测试)
 */

import React, { useState, useEffect, useMemo, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { AlertTriangle, CheckCircle, RefreshCw, Server, XCircle } from 'lucide-react';

// ── Types ──

type ServiceNodeData = {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  latency?: string;
  uptime?: string | number;
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

// ── Pure helpers ──

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

/**
 * 从原始服务数据构建拓扑图 (纯函数).
 * 导出用于测试复用.
 */
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
        style: { stroke: dependencyStatus === 'offline' ? 'var(--antd-error)' : 'var(--antd-primary)', strokeWidth: 2, opacity: 0.6 },
        markerEnd: { type: MarkerType.ArrowClosed, color: dependencyStatus === 'offline' ? 'var(--antd-error)' : 'var(--antd-primary)' },
      });
    });
  });

  return { nodes, edges };
}

// ── Custom Node ──

const ServiceNode = memo(({ data }: { data: ServiceNodeData }) => {
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
      boxShadow: '0 0 15px rgba(0, 242, 254, 0.05), inset 0 0 10px rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
        background: 'linear-gradient(rgba(0, 242, 254, 0.015) 50%, rgba(0,0,0,0.2) 50%)',
        backgroundSize: '100% 4px', pointerEvents: 'none', zIndex: 0, opacity: 0.5,
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

// ── Component ──

export default function TopologyView() {
  const [services, setServices] = useState<TopologyService[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [topologyQuery, setTopologyQuery] = useState('');
  const [topologyStatusFilter, setTopologyStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');

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
          setLoading(false);
          return;
        }
        setServices(rawServices);
        const { nodes: builtNodes, edges: builtEdges } = buildTopology(rawServices);
        setNodes(builtNodes);
        setEdges(builtEdges);
        setError('');
      } catch (err) {
        console.error('Failed to fetch services:', err);
        setError(err instanceof Error ? err.message : '服务数据不可用');
      } finally {
        setLoading(false);
      }
    };

    void fetchServices();
  }, [retryToken]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const status = serviceStatus(service);
      if (topologyStatusFilter !== 'all' && status !== topologyStatusFilter) return false;
      if (topologyQuery) {
        const query = topologyQuery.toLowerCase();
        const name = (service.name || service.id || '').toLowerCase();
        if (!name.includes(query) && !status.includes(query)) return false;
      }
      return true;
    });
  }, [services, topologyQuery, topologyStatusFilter]);

  // 自动识别异常节点
  const attentionServices = useMemo(() => {
    return filteredServices
      .filter((s) => serviceStatus(s) !== 'online')
      .map((s) => ({
        id: String(s.id || s.name || ''),
        name: String(s.name || s.id || '未知'),
        status: serviceStatus(s),
        dependencyCount: dependencyNames(s).length,
      }));
  }, [filteredServices]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>全局服务拓扑</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
            {filteredServices.length}/{services.length} 节点 · {edges.length} 关系
          </span>
          <button
            className="antd-btn"
            onClick={() => { setLoading(true); setRetryToken((t) => t + 1); }}
            aria-label="重试拓扑探测"
          >
            <RefreshCw size={14} />
            <span>重试</span>
          </button>
        </div>
      </div>

      {/* 异常节点提示 */}
      {attentionServices.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px', borderRadius: 'var(--antd-radius-md)', background: 'rgba(255, 184, 0, 0.06)', border: '1px solid rgba(255, 184, 0, 0.2)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--antd-warning)' }} />
          <span style={{ fontSize: '13px' }}>
            {attentionServices.length} 个异常节点需要关注: {attentionServices.slice(0, 3).map(s => s.name).join(', ')}
            {attentionServices.length > 3 && ` 等`}
          </span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="搜索服务名或状态..."
          value={topologyQuery}
          onChange={(e) => setTopologyQuery(e.target.value)}
          className="antd-input"
          style={{ flex: 1 }}
          aria-label="搜索拓扑节点"
        />
        <select
          value={topologyStatusFilter}
          onChange={(e) => setTopologyStatusFilter(e.target.value as typeof topologyStatusFilter)}
          className="antd-input"
          aria-label="按状态筛选"
        >
          <option value="all">全部状态</option>
          <option value="online">在线</option>
          <option value="degraded">降级</option>
          <option value="offline">离线</option>
        </select>
        {(topologyQuery || topologyStatusFilter !== 'all') && (
          <button
            className="antd-btn"
            onClick={() => { setTopologyQuery(''); setTopologyStatusFilter('all'); }}
          >
            清除筛选
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>正在探测服务拓扑...</div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div role="alert" style={{
          padding: '16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
          textAlign: 'center',
        }}>
          <AlertTriangle size={32} style={{ marginBottom: '8px' }} />
          <div style={{ marginBottom: '8px' }}>{error}</div>
          <button className="antd-btn" onClick={() => { setLoading(true); setRetryToken((t) => t + 1); }}>
            <RefreshCw size={14} />
            <span>重试</span>
          </button>
        </div>
      )}

      {/* ReactFlow Graph */}
      {!loading && !error && services.length > 0 && (
        <div className="antd-card" style={{ width: '100%', height: '500px', padding: 0, overflow: 'hidden' }}>
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
            }} />
          </ReactFlow>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && services.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <Server size={24} className="text-muted" style={{ marginBottom: '8px' }} />
          <div>暂无服务数据</div>
        </div>
      )}
    </div>
  );
}
