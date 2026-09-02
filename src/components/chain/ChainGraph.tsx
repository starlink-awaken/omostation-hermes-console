/**
 * ChainGraph — reactflow DAG 可视化组件。
 *
 * 接收 steps 数据渲染 DAG：每个 step 是一个节点，
 * 条件边（when）用不同颜色，on_failure 标记红色节点。
 */
import React, { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import type { Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';

export interface ChainStep {
  name: string;
  command: string;
  args?: string[];
  when?: string;
  on_failure?: string;
  retry?: number;
  capture_output_to?: string;
}

interface ChainGraphProps {
  steps: ChainStep[];
}

/** 简单的 DAG 布局：按步骤顺序水平排列，条件分支向下偏移。 */
function buildGraph(steps: ChainStep[]): { nodes: Node[]; edges: Edge[] } {
  if (steps.length === 0) return { nodes: [], edges: [] };

  const nodes: Node[] = steps.map((step, i) => {
    const hasOnFailure = !!step.on_failure;
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      id: `step-${i}`,
      position: { x: col * 280 + 40, y: row * 160 + 40 },
      data: {
        label: (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">{step.name}</span>
            <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono truncate max-w-[160px]">
              {step.command}
            </span>
            {step.when && (
              <span className="text-[10px] text-[var(--color-chart-3)]">when: {step.when}</span>
            )}
            {hasOnFailure && (
              <span className="text-[10px] text-[var(--color-status-error)]">on_failure: {step.on_failure}</span>
            )}
          </div>
        ),
      },
      style: {
        background: 'var(--color-surface-2)',
        color: 'var(--color-text-primary)',
        border: hasOnFailure
          ? '1px solid var(--color-status-error)'
          : '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        fontSize: '12px',
        width: 200,
      },
    };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const step = steps[i];
    // 顺序边（默认蓝色）
    edges.push({
      id: `e-${i}-${i + 1}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      animated: true,
      label: step.when || undefined,
      labelStyle: { fontSize: 10, fill: 'var(--color-chart-3)' },
      labelBgStyle: { fill: 'var(--color-surface-0)' },
      style: { stroke: step.when ? 'var(--color-chart-3)' : 'var(--color-accent)', strokeWidth: 2 },
    });

    // on_failure 边（红色，跳过后一步）
    if (step.on_failure && i + 2 < steps.length) {
      edges.push({
        id: `e-fail-${i}`,
        source: `step-${i}`,
        target: `step-${i + 2}`,
        animated: false,
        label: `on_failure: ${step.on_failure}`,
        labelStyle: { fontSize: 10, fill: 'var(--color-status-error)' },
        labelBgStyle: { fill: 'var(--color-surface-0)' },
        style: { stroke: 'var(--color-status-error)', strokeWidth: 1.5, strokeDasharray: '5 5' },
      });
    }
  }

  return { nodes, edges };
}

export default function ChainGraph({ steps }: ChainGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildGraph(steps), [steps]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div
      className="w-full h-[400px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-0)]"
      role="img"
      aria-label="链路 DAG 可视化"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls
          className="!bg-[var(--color-surface-2)] !border-[var(--color-border-subtle)]"
          style={{ fill: 'var(--color-accent)' }}
        />
        <Background color="var(--color-border-subtle)" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
