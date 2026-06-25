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

export default function TopologyView() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        let rawServices = [];
        if (response.ok) {
          rawServices = await response.json();
        } else {
          // Fallback mock data
          rawServices = [
            { name: 'Agora Mesh', circuit: '闭合', uptime: '99.9%', latency: '12ms' },
            { name: 'Minerva Research', circuit: '闭合', uptime: '99.5%', latency: '45ms' },
            { name: 'SharedBrain Bridge', circuit: '断路', uptime: '0%', latency: '-' },
            { name: 'LLM Gateway', circuit: '半开', uptime: '98.2%', latency: '850ms' },
            { name: 'KOS Substrate', circuit: '闭合', uptime: '100%', latency: '2ms' },
          ];
        }

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        
        const centerX = 350;
        const centerY = 200;
        const radius = 180;

        const meshNode = rawServices.find((s: any) => s.name.includes('Agora')) || rawServices[0];
        const otherNodes = rawServices.filter((s: any) => s !== meshNode);

        // Add Mesh (Central Node)
        if (meshNode) {
          const status = meshNode.circuit === '断路' ? 'offline' : meshNode.circuit === '半开' ? 'degraded' : 'online';
          newNodes.push({
            id: meshNode.name,
            type: 'serviceNode',
            position: { x: centerX, y: centerY },
            data: { name: meshNode.name, status, latency: meshNode.latency, uptime: meshNode.uptime }
          });
        }

        // Add Others
        otherNodes.forEach((svc: any, index: number) => {
          const angle = (index / otherNodes.length) * 2 * Math.PI - Math.PI / 2; // Start from top
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          const status = svc.circuit === '断路' ? 'offline' : svc.circuit === '半开' ? 'degraded' : 'online';

          newNodes.push({
            id: svc.name,
            type: 'serviceNode',
            position: { x, y },
            data: { name: svc.name, status, latency: svc.latency, uptime: svc.uptime }
          });

          // Connect to mesh
          if (meshNode) {
            newEdges.push({
              id: `edge-${meshNode.name}-${svc.name}`,
              source: meshNode.name,
              target: svc.name,
              animated: status === 'online', // animate flow if online
              style: { stroke: status === 'offline' ? 'var(--antd-error)' : 'var(--antd-primary)', strokeWidth: 2, opacity: 0.6 },
              markerEnd: { 
                type: MarkerType.ArrowClosed, 
                color: status === 'offline' ? 'var(--antd-error)' : 'var(--antd-primary)' 
              }
            });
          }
        });

        setNodes(newNodes);
        setEdges(newEdges);
      } catch (error) {
        console.error('Failed to load topology:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, [setNodes, setEdges]);

  return (
    <div className="antd-card animate-fade-in" style={{ width: '100%', height: 'calc(100vh - 200px)', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--antd-border-color)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>全局网络拓扑地图 (Sage View)</h2>
        <p className="text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>上帝视角：实时服务网格拓扑调用流、心跳响应与熔断状态</p>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div className="loading-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className="spinner" aria-hidden="true" style={{ marginBottom: '16px' }}></div>
            <p className="text-muted">正在探测微服务网格拓扑...</p>
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
  );
}
