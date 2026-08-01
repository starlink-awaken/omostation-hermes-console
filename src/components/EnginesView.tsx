/**
 * EnginesView — 引擎调度总线.
 *
 * 从 fullsite 移植的改进:
 *   - 管线搜索筛选 (pipelineQuery)
 *   - 事件类型筛选 (eventTypeFilter)
 *   - MetaOS 规划+执行两阶段工作流 (handlePlanTask + handleExecuteTask)
 *   - 数据错误提示 banner + retryToken 重试
 *   - 加载态 a11y (role="status" aria-live)
 *   - 节点详情实时状态追踪 (从事件流聚合)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Cpu, GitCommit, List, Play, RefreshCw, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import WorkflowGraph from './WorkflowGraph';

// ── Types ──

interface EventLog {
  id: string;
  type: string;
  time: string;
  source: string;
  payload?: {
    node_id?: string;
    step_index?: number;
    [key: string]: unknown;
  };
}

interface PipelineListResponse {
  pipelines: string[];
}

interface EngineResult {
  error?: string;
  id?: string;
  [key: string]: unknown;
}

interface MetaosPlan extends EngineResult {
  nodes?: Array<{ id: string; index?: number; label?: string }>;
  edges?: Array<{ source: string; target: string }>;
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
      const response = await apiPost<EngineResult>('/api/cockpit/engine/queue', {
        engine: 'pipeline',
        pipeline,
        task: input,
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
    mutationFn: async (task: string) => {
      const response = await apiPost<MetaosPlan>('/api/metaos/plan', { task });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to generate plan');
      }
      return response.data;
    },
  });
}

function useExecuteTask() {
  return useMutation({
    mutationFn: async ({ task, plan }: { task: string; plan?: MetaosPlan }) => {
      const response = await apiPost<EngineResult>('/api/cockpit/engine/queue', {
        engine: 'metaos',
        task,
        plan,
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to execute task');
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
  const [runResult, setRunResult] = useState<EngineResult | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pipelineQuery, setPipelineQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [metaosPlan, setMetaosPlan] = useState<MetaosPlan | null>(null);

  const { data: pipelines, isLoading, error } = usePipelines();
  const runMutation = useRunPipeline();
  const planMutation = useMetaosPlan();
  const executeMutation = useExecuteTask();

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
        const eventData = JSON.parse(e.data) as EventLog;

        if (eventData.type === 'node_running' || eventData.type === 'node_completed' || eventData.type === 'node_failed' || eventData.type === 'node_awaiting_approval') {
          const nodeId = eventData.payload?.node_id;
          if (typeof nodeId === 'string') {
            setActiveSteps(prev => prev.includes(nodeId) ? prev : [...prev, nodeId]);
          }
        } else if (eventData.type === 'pipeline:step:ok' || eventData.type === 'pipeline:step:error') {
          const stepIndex = eventData.payload?.step_index;
          if (typeof stepIndex === 'number') {
            setActiveSteps(prev => {
              const stepId = `step_${stepIndex}`;
              return prev.includes(stepId) ? prev : [...prev, stepId];
            });
          }
        } else if (eventData.type === 'pipeline:started' || eventData.type === 'workflow_started') {
          setActiveSteps([]);
        }

        setEvents(prev => [eventData, ...prev].slice(0, 50));
      } catch {
        // parsing error or keep-alive ping
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
    // refreshToken 变化时重建 SSE 连接
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // 管线搜索筛选
  const filteredPipelines = useMemo(() => {
    const query = pipelineQuery.trim().toLowerCase();
    if (!query) return pipelines || [];
    return (pipelines || []).filter((p) => p.toLowerCase().includes(query));
  }, [pipelineQuery, pipelines]);

  // 事件类型筛选
  const eventTypes = useMemo(() => Array.from(new Set(events.map((event) => event.type).filter(Boolean))), [events]);
  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'all') return events;
    return events.filter((event) => event.type === eventTypeFilter);
  }, [eventTypeFilter, events]);

  const handleRunPipeline = () => {
    if (!selectedPipeline || !pipelineInput.trim()) return;
    setMetaosPlan(null);
    runMutation.mutate(
      { pipeline: selectedPipeline, input: pipelineInput },
      {
        onSuccess: (data) => { setRunResult(data); },
        onError: (err) => { setRunResult({ error: err.message }); },
      }
    );
  };

  const handlePlanTask = () => {
    if (!pipelineInput.trim()) return;
    setRunResult(null);
    setMetaosPlan(null);
    planMutation.mutate(pipelineInput, {
      onSuccess: (data) => {
        if (data.status === 'ok') {
          setMetaosPlan(data);
        } else {
          setRunResult(data);
        }
      },
      onError: (err) => { setRunResult({ error: err.message }); },
    });
  };

  const handleExecuteTask = () => {
    if (!pipelineInput.trim()) return;
    executeMutation.mutate(
      { task: pipelineInput, plan: metaosPlan || undefined },
      {
        onSuccess: (data) => { setRunResult(data); },
        onError: (err) => { setRunResult({ error: err.message }); },
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
        <button
          className="antd-btn"
          onClick={() => setRefreshToken((t) => t + 1)}
          aria-label="刷新引擎数据"
        >
          <RefreshCw size={14} />
          <span>刷新</span>
        </button>
      </div>

      {/* 数据错误 banner */}
      {dataError && (
        <div className="shell-data-banner" role="alert" style={{
          padding: '12px 16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{dataError}</span>
          <button
            className="antd-btn small"
            onClick={() => { setDataError(null); setRefreshToken((t) => t + 1); }}
          >
            <RefreshCw size={12} />
            <span>重试</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && displayPipelines.length === 0 && (
        <div className="loading-state" role="status" aria-live="polite" style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" aria-hidden="true" style={{ marginBottom: '8px' }} />
          <p>正在读取调度引擎管线...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
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

      {/* Pipeline Control + Event Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Pipeline Runner */}
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <List size={16} aria-hidden="true" className="text-primary" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>管线控制</h2>
            </div>
          </div>

          {/* Pipeline search */}
          <div style={{ marginBottom: '12px' }}>
            <input
              type="search"
              placeholder="搜索管线..."
              value={pipelineQuery}
              onChange={(e) => setPipelineQuery(e.target.value)}
              className="antd-input"
              style={{ width: '100%' }}
              aria-label="搜索管线"
            />
          </div>

          {filteredPipelines.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                选择管线 ({filteredPipelines.length}/{displayPipelines.length})
              </label>
              <select
                value={selectedPipeline}
                onChange={(e) => setSelectedPipeline(e.target.value)}
                className="antd-input"
                style={{ width: '100%' }}
                aria-label="选择管线"
              >
                {filteredPipelines.map((pipeline) => (
                  <option key={pipeline} value={pipeline}>{pipeline}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              执行指令 / 目标
            </label>
            <textarea
              value={pipelineInput}
              onChange={(e) => setPipelineInput(e.target.value)}
              placeholder="例如：分析当前系统的性能指标..."
              className="antd-input"
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              aria-label="输入参数"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="antd-btn"
              onClick={handlePlanTask}
              disabled={planMutation.isPending || !pipelineInput.trim()}
              aria-label="生成计划"
            >
              <Sparkles size={14} />
              <span>{planMutation.isPending ? '规划中...' : '新任务'}</span>
            </button>
            {metaosPlan && (
              <button
                className="antd-btn antd-btn-primary"
                onClick={handleExecuteTask}
                disabled={executeMutation.isPending}
                aria-label="承接计划"
              >
                <Play size={14} />
                <span>{executeMutation.isPending ? '执行中...' : '承接计划'}</span>
              </button>
            )}
            {!metaosPlan && (
              <button
                className="antd-btn antd-btn-primary"
                onClick={handleRunPipeline}
                disabled={runMutation.isPending || !selectedPipeline}
                aria-label="运行管线"
              >
                <Play size={14} />
                <span>{runMutation.isPending ? '运行中...' : '运行'}</span>
              </button>
            )}
          </div>

          {/* Run Result */}
          {runResult && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GitCommit size={14} className="text-success" />
                  <strong style={{ fontSize: '13px' }}>运行结果</strong>
                </div>
                <button className="antd-btn small" onClick={() => setRunResult(null)} aria-label="清除结果">清除</button>
              </div>
              <pre style={{
                padding: '12px',
                background: runResult.error ? 'rgba(255, 71, 87, 0.08)' : 'rgba(0, 242, 254, 0.03)',
                border: `1px solid ${runResult.error ? 'rgba(255, 71, 87, 0.35)' : 'rgba(0, 242, 254, 0.08)'}`,
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                color: runResult.error ? 'var(--antd-error)' : 'var(--antd-text-primary)',
                margin: 0,
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {JSON.stringify(runResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right: Event Log */}
        <div className="antd-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} className="text-info" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>事件日志</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {filteredEvents.length}/{events.length} 条
            </span>
          </div>

          {/* Event type filter */}
          {eventTypes.length > 0 && (
            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="antd-input"
                style={{ flex: 1 }}
                aria-label="按事件类型筛选"
              >
                <option value="all">全部类型</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {eventTypeFilter !== 'all' && (
                <button className="antd-btn small" onClick={() => setEventTypeFilter('all')}>清除</button>
              )}
            </div>
          )}

          <div role="log" aria-label="事件日志流" aria-live="polite" style={{ maxHeight: '400px', overflow: 'auto' }}>
            {filteredEvents.length === 0 ? (
              <p style={{ color: 'var(--antd-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>暂无事件</p>
            ) : (
              filteredEvents.map((event, index) => (
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
                    <span style={{ color: 'var(--antd-text-muted)' }}>{event.time ? new Date(event.time).toLocaleTimeString() : ''}</span>
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
              ))
            )}
          </div>
        </div>
      </div>

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
