import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import type { Connection, Edge, Node, NodeMouseHandler } from 'reactflow';
import 'reactflow/dist/style.css';

type WorkflowNodeInput = {
  id: string;
  index?: number;
  label?: string;
};

type WorkflowEdgeInput = {
  source: string;
  target: string;
};

type WorkflowNodeData = {
  label: string;
};

type WorkflowPayload = {
  status?: string;
  nodes?: WorkflowNodeInput[];
  edges?: WorkflowEdgeInput[];
};

interface WorkflowGraphProps {
  pipelineName?: string;
  activeSteps?: string[];
  onNodeClick?: NodeMouseHandler;
  initialNodes?: WorkflowNodeInput[];
  initialEdges?: WorkflowEdgeInput[];
}

export default function WorkflowGraph({ pipelineName, activeSteps = [], onNodeClick, initialNodes, initialEdges }: WorkflowGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (initialNodes && initialEdges) {
      const newNodes: Node<WorkflowNodeData>[] = initialNodes.map((n) => ({
        id: n.id,
        position: { x: 50 + (n.index || 0) * 250, y: 100 + ((n.index || 0) % 2 === 0 ? -50 : 50) },
        data: { label: n.label || n.id },
        style: { 
          background: 'var(--antd-bg-elevated)', 
          color: 'var(--antd-text-primary)', 
          border: '1px solid var(--antd-primary)', 
          borderRadius: 'var(--antd-radius-lg)', 
          padding: '10px',
          boxShadow: activeSteps.includes(n.id) ? 'var(--tech-glow-intense)' : 'none'
        }
      }));
      const newEdges: Edge[] = initialEdges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: 'var(--antd-primary)', strokeWidth: 2 }
      }));
      setNodes(newNodes);
      setEdges(newEdges);
      return;
    }

    if (!pipelineName) return;
    fetch(`/api/pipeline/${pipelineName}/dag`)
      .then(res => res.json())
      .then((data: WorkflowPayload) => {
        if (data.status === 'error') return;
        const newNodes: Node<WorkflowNodeData>[] = (data.nodes || []).map((n) => ({
          id: n.id,
          position: { x: 50 + (n.index || 0) * 250, y: 100 + ((n.index || 0) % 2 === 0 ? -50 : 50) },
          data: { label: n.label },
          style: { 
            background: 'var(--antd-bg-elevated)', 
            color: 'var(--antd-text-primary)', 
            border: '1px solid var(--antd-primary)', 
            borderRadius: 'var(--antd-radius-lg)', 
            padding: '10px',
            boxShadow: activeSteps.includes(n.id) ? 'var(--tech-glow-intense)' : 'none',
            cursor: onNodeClick ? 'pointer' : 'default'
          }
        }));
        const newEdges: Edge[] = (data.edges || []).map((e, i) => ({
          id: `e-${i}`,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: 'var(--antd-primary)', strokeWidth: 2 }
        }));
        setNodes(newNodes);
        setEdges(newEdges);
      });
  }, [pipelineName, activeSteps, setNodes, setEdges, initialNodes, initialEdges, onNodeClick]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--antd-primary)', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: '100%', height: '350px', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--antd-radius-lg)', border: '1px solid var(--antd-border-color)', marginTop: '1rem' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <Controls style={{ fill: 'var(--antd-primary)', background: 'var(--antd-bg-elevated)', border: '1px solid var(--antd-border-color)' }} />
        <Background color="rgba(0, 242, 254, 0.08)" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
