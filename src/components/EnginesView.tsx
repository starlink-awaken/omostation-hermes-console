/**
 * EnginesView with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React, { useState, useEffect } from 'react';
import { Cpu, Play, Activity, List, GitCommit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import WorkflowGraph from './WorkflowGraph';

// ── Types ──

interface EventLog {
  id: string;
  type: string;
  time: string;
  source: string;
  payload: any;
}

interface PipelineListResponse {
  pipelines: string[];
}

interface PipelineRunResult {
  status: string;
  output?: string;
  error?: string;
}

// ── Hooks ──

function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await apiFetch<PipelineListResponse>('/api/pipelines');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch pipelines');
      }
      return response.data?.pipelines || [];
    },
    staleTime: 10000,
    refetchInterval: 10000,
    retry: 3,
  });
}

function useRunPipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pipeline, input }: { pipeline: string; input: string }) => {
      const response = await apiPost<PipelineRunResult>('/api/pipelines/run', {
        pipeline,
        input,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to run pipeline');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

function useMetaosPlan() {
  return useMutation({
    mutationFn: async ({ goal, context }: { goal: string; context: string }) => {
      const response = await apiPost('/api/metaos/plan', { goal, context });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to generate plan');
      }
      return response.data;
    },
  });
}

// ── Component ──

export default function EnginesView() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [pipelineInput, setPipelineInput] = useState('');
  const [runResult, setRunResult] = useState<any>(null);

  const { data: pipelines, isLoading, error } = usePipelines();
  const runMutation = useRunPipeline();
  const planMutation = useMetaosPlan();

  // Set default pipeline when data loads
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelines[0]);
    }
  }, [pipelines, selectedPipeline]);

  // SSE setup for real-time events
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (e) => {
      try {
        const eventData = JSON.parse(e.data);
        
        if (eventData.type === 'node_running' || eventData.type === 'node_completed' || eventData.type === 'node_failed' || eventData.type === 'node_awaiting_approval') {
          const nodeId = eventData.payload?.node_id;
          if (nodeId !== undefined) {
            setActiveSteps(prev => {
              return prev.includes(nodeId) ? prev : [...prev, nodeId];
            });
          }
        } else if (eventData.type === 'pipeline:step:ok' || eventData.type === 'pipeline:step:error') {
          const stepIndex = eventData.payload?.step_index;
          if (stepIndex !== undefined) {
            setActiveSteps(prev => {
              const stepId = `step_${stepIndex}`;
              return prev.includes(stepId) ? prev : [...prev, stepId];
            });
          }
        } else if (eventData.type === 'pipeline:started' || eventData.type === 'workflow_started') {
          setActiveSteps([]);
        }

        setEvents(prev => {
          const updated = [eventData, ...prev];
          return updated.slice(0, 50);
        });
      } catch (err) {
        // parsing error or keep-alive ping
      }
    };
    eventSource.onerror = () => {
      // Reconnect after 5 seconds
      setTimeout(() => {
        eventSource.close();
      }, 5000);
    };
    return () => eventSource.close();
  }, []);

  const handleRunPipeline = () => {
    if (!selectedPipeline || !pipelineInput.trim()) return;
    
    runMutation.mutate(
      { pipeline: selectedPipeline, input: pipelineInput },
      {
        onSuccess: (data) => {
          setRunResult(data);
        },
        onError: (error) => {
          setRunResult({ status: 'error', error: error.message });
        },
      }
    );
  };

  const handlePlan = () => {
    if (!pipelineInput.trim()) return;
    
    planMutation.mutate(
      { goal: pipelineInput, context: '' },
      {
        onSuccess: (data) => {
          setRunResult({ status: 'plan', output: JSON.stringify(data, null, 2) });
        },
        onError: (error) => {
          setRunResult({ status: 'error', error: error.message });
        },
      }
    );
  };

  const displayPipelines = pipelines || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>引擎调度总线</h1>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div role="alert" style={{ 
          padding: '16px', 
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={16} />
            <strong>引擎数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Pipeline Control */}
      {displayPipelines.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <List size={16} aria-hidden="true" className="text-primary" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>管线控制</h2>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                选择管线
              </label>
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="antd-input"
                style={{ width: '100%' }}
                aria-label="选择管线"
              >
                {displayPipelines.map((pipeline) => (
                  <option key={pipeline} value={pipeline}>{pipeline}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                输入参数
              </label>
              <textarea
                value={pipelineInput}
                onChange={(e) => setPipelineInput(e.target.value)}
                placeholder="输入管线参数..."
                className="antd-input"
                style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                aria-label="输入参数"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="antd-btn antd-btn-primary"
                onClick={handleRunPipeline}
                disabled={runMutation.isPending || !selectedPipeline || !pipelineInput.trim()}
                aria-label="运行管线"
              >
                <Play size={14} />
                <span>{runMutation.isPending ? '运行中...' : '运行'}</span>
              </button>
              <button
                className="antd-btn"
                onClick={handlePlan}
                disabled={planMutation.isPending || !pipelineInput.trim()}
                aria-label="生成计划"
              >
                <Sparkles size={14} />
                <span>{planMutation.isPending ? '生成中...' : '生成计划'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Result */}
      {runResult && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCommit size={16} aria-hidden="true" className="text-success" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>运行结果</h2>
            </div>
            <button
              className="antd-btn small"
              onClick={() => setRunResult(null)}
              aria-label="清除结果"
            >
              清除
            </button>
          </div>
          
          <div style={{ 
            padding: '12px', 
            background: runResult.status === 'error' ? 'rgba(255, 71, 87, 0.08)' : 'rgba(0, 242, 254, 0.03)',
            border: `1px solid ${runResult.status === 'error' ? 'rgba(255, 71, 87, 0.35)' : 'rgba(0, 242, 254, 0.08)'}`,
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            color: runResult.status === 'error' ? 'var(--antd-error)' : 'var(--antd-text-primary)',
          }}>
            {runResult.error || runResult.output || JSON.stringify(runResult, null, 2)}
          </div>
        </div>
      )}

      {/* Event Log */}
      {events.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} aria-hidden="true" className="text-info" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>事件日志</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              最近 {events.length} 条
            </span>
          </div>
          
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {events.map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--antd-border-color)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--antd-primary)' }}>{event.type}</span>
                  <span style={{ color: 'var(--antd-text-muted)' }}>{event.time}</span>
                </div>
                <div style={{ color: 'var(--antd-text-secondary)' }}>
                  {event.source && <span>来源: {event.source} · </span>}
                  {event.payload && (
                    <span style={{ wordBreak: 'break-all' }}>
                      {JSON.stringify(event.payload).slice(0, 100)}
                      {JSON.stringify(event.payload).length > 100 ? '...' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Graph */}
      {selectedNode && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>工作流图</h2>
          </div>
          <WorkflowGraph
            nodes={selectedNode.nodes || []}
            edges={selectedNode.edges || []}
            onNodeClick={setSelectedNode}
          />
        </div>
      )}
    </div>
  );
}
