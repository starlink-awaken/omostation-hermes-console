import React, { useState, useEffect, useMemo } from 'react';
import { Cpu, Play, Activity, List, GitCommit, RefreshCw } from 'lucide-react';
import WorkflowGraph from './WorkflowGraph';
import type { Node } from 'reactflow';
import PlatformControlWorkbench from './PlatformControlWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface EventLog {
  id: string;
  type: string;
  time: string;
  source: string;
  payload?: {
    node_id?: string;
    step_index?: number;
  };
}

type EngineNode = {
  id: string;
  index?: number;
  label?: string;
};

type EngineEdge = {
  source: string;
  target: string;
};

type EngineResult = {
  error?: string;
  id?: string;
  [key: string]: unknown;
};

type MetaosPlan = EngineResult & {
  nodes?: EngineNode[];
  edges?: EngineEdge[];
};

interface EnginesViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesEnginesFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function EnginesView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: EnginesViewProps) {
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [activeSteps, setActiveSteps] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node<{ label: string }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [pipelineInput, setPipelineInput] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<EngineResult | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pipelineQuery, setPipelineQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  
  const [planning, setPlanning] = useState(false);
  const [metaosPlan, setMetaosPlan] = useState<MetaosPlan | null>(null);
  const filteredPipelines = useMemo(() => {
    const query = pipelineQuery.trim().toLowerCase();
    if (!query) return pipelines;
    return pipelines.filter((pipeline) => pipeline.toLowerCase().includes(query));
  }, [pipelineQuery, pipelines]);
  const eventTypes = useMemo(() => Array.from(new Set(events.map((event) => event.type).filter(Boolean))), [events]);
  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'all') return events;
    return events.filter((event) => event.type === eventTypeFilter);
  }, [eventTypeFilter, events]);
  const recentEvents = filteredEvents.slice(0, 4);
  const focusPipelines = filteredPipelines.slice(0, 4);

  const fetchData = async () => {
    try {
      const pipeRes = await fetch('/api/pipelines');
      const pipeData = await pipeRes.json().catch(() => ({}));
      if (!pipeRes.ok || !Array.isArray(pipeData.pipelines)) {
        throw new Error(pipeData.error || `管线服务不可用（HTTP ${pipeRes.status}）`);
      }
      setPipelines(pipeData.pipelines);
      setDataError(null);
      if (pipeData.pipelines.length > 0 && !selectedPipeline) {
        setSelectedPipeline(pipeData.pipelines[0]);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines', error);
      setDataError(error instanceof Error ? error.message : '管线数据不可用');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 引擎页同时建立管线轮询和 SSE 事件订阅。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    const interval = setInterval(fetchData, 10000); // Polling for pipelines
    
    // SSE setup for real-time events
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (e) => {
      try {
        const eventData = JSON.parse(e.data) as EventLog;
        
        if (eventData.type === 'node_running' || eventData.type === 'node_completed' || eventData.type === 'node_failed' || eventData.type === 'node_awaiting_approval') {
            const nodeId = eventData.payload?.node_id;
            if (typeof nodeId === 'string') {
                setActiveSteps(prev => {
                    return prev.includes(nodeId) ? prev : [...prev, nodeId];
                });
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

        setEvents(prev => {
          // Keep the latest 50 events to avoid memory bloat
          const updated = [eventData, ...prev];
          return updated.slice(0, 50);
        });
      } catch {
        // parsing error or keep-alive ping
      }
    };
    
    return () => {
      clearInterval(interval);
      eventSource.close();
    };
    // fetchData intentionally owns this effect's polling lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  useEffect(() => {
    if (!focusTaskQuery) return;
    const matchedPipeline = pipelines.find((pipeline) => matchesEnginesFocusQuery([pipeline], focusTaskQuery));
    if (matchedPipeline) {
      // 外部导航查询命中管线时，同步到当前执行选择。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPipeline(matchedPipeline);
    }
  }, [focusTaskQuery, pipelines]);

  const handleRunPipeline = async () => {
    if (!selectedPipeline) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/cockpit/engine/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'pipeline', pipeline: selectedPipeline, task: pipelineInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || '管线任务承接失败');
      setRunResult(data);
      if (data.id) {
        openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: data.id }, onNavigate, onOpenTarget);
      }
    } catch (e: unknown) {
      setRunResult({ error: e instanceof Error ? e.message : '管线任务承接失败' });
    } finally {
      setRunning(false);
    }
  };

  const handlePlanTask = async () => {
    if (!pipelineInput) return;
    setPlanning(true);
    setRunResult(null);
    setMetaosPlan(null);
    try {
      const res = await fetch('/api/metaos/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: pipelineInput })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setMetaosPlan(data);
      } else {
        setRunResult(data);
      }
    } catch (e: unknown) {
      setRunResult({ error: e instanceof Error ? e.message : 'MetaOS 规划失败' });
    } finally {
      setPlanning(false);
    }
  };

  const handleExecuteTask = async () => {
    if (!pipelineInput) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/cockpit/engine/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'metaos', task: pipelineInput, plan: metaosPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'MetaOS 任务承接失败');
      setRunResult(data);
      if (data.id) {
        openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: data.id }, onNavigate, onOpenTarget);
      }
    } catch (e: unknown) {
      setRunResult({ error: e instanceof Error ? e.message : 'MetaOS 任务承接失败' });
    } finally {
      setRunning(false);
    }
  };

  if (loading && pipelines.length === 0) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取调度引擎管线...</p>
      </div>
    );
  }

  const focusedEnginesCard = (() => {
    const matchedPipeline = pipelines.find((pipeline) => matchesEnginesFocusQuery([pipeline], focusTaskQuery));
    if (matchedPipeline) {
      return {
        kicker: '执行管线',
        title: matchedPipeline,
        detail: selectedPipeline === matchedPipeline ? '当前已选中，可直接规划或调度。' : '这是当前上下文最相关的引擎管线，先带入执行器再继续。',
        objectTarget: { tab: 'Engines', taskQuery: matchedPipeline },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedPipeline },
      };
    }

    const matchedEvent = recentEvents.find((event) => (
      matchesEnginesFocusQuery([event.id, event.type, event.source], focusTaskQuery)
    ));
    if (matchedEvent) {
      return {
        kicker: '执行事件',
        title: matchedEvent.type,
        detail: `${matchedEvent.source} · ${matchedEvent.time}`,
        objectTarget: { tab: 'Engines', taskQuery: matchedEvent.source || matchedEvent.type },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedEvent.source || matchedEvent.type },
      };
    }

    if (focusPageId === 'Engines') {
      return {
        kicker: '当前页面',
        title: '引擎调度',
        detail: '这页负责把管线、执行信号和后续入口串成引擎执行面，不让调度只剩表单和事件流。',
        objectTarget: { tab: 'SystemMap', pageId: 'Engines' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Engines' },
      };
    }

    return null;
  })();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PlatformControlWorkbench currentPage="Engines" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {dataError && (
        <div className="shell-data-banner" role="alert">
          <span>{dataError}，当前不能据此判断没有可用管线。</span>
          <button type="button" onClick={() => setRefreshToken((token) => token + 1)}>
            <RefreshCw size={14} aria-hidden="true" />
            <span>重试管线</span>
          </button>
        </div>
      )}

      <ActionSurfacePanel
        title="引擎协作区"
        subtitle="调度前后直接跳去相关页面，不用自己在导航里来回翻。"
        statusText={pipelines.length > 0 ? `${pipelines.length} 条管线` : '未发现管线'}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        items={[
          {
            id: 'assets',
            title: '先挑能力资产',
            detail: '调度前先回资产页确认技能、管线和工作流定义是否匹配目标。',
            actionLabel: '去资产页',
            actionType: 'navigate',
            actionValue: 'Assets',
            actionTarget: { tab: 'Assets', taskQuery: focusTaskQuery || selectedPipeline || pipelines[0] || 'Engines' },
          },
          {
            id: 'workflows',
            title: '看历史编排',
            detail: '任务已跑起来后，直接去工作流页看审批点和节点详情。',
            actionLabel: '去工作流',
            actionType: 'navigate',
            actionValue: 'Workflows',
            actionTarget: { tab: 'Workflows', taskQuery: focusTaskQuery || selectedPipeline || pipelines[0] || 'Engines' },
          },
          {
            id: 'sandbox',
            title: '做隔离验证',
            detail: '调度前想先做小实验时，去 Sandbox 验证片段代码或思路。',
            actionLabel: '去沙箱',
            actionType: 'navigate',
            actionValue: 'Sandbox',
            actionTarget: { tab: 'Sandbox', taskQuery: focusTaskQuery || selectedPipeline || pipelines[0] || 'Engines' },
          },
          {
            id: 'suggestion',
            title: '复制示例目标',
            detail: '先从一个更像实战的目标起步，减少空表单发呆时间。',
            actionLabel: '复制目标',
            actionType: 'copy',
            actionValue: '分析当前系统的性能指标与失败热点，并给出下一步治理动作',
          },
        ]}
      />

      {focusedEnginesCard && (
        <section className="services-section overview-ops-panel" aria-label="当前引擎承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前引擎承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成引擎面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedEnginesCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedEnginesCard.title}</strong>
              <p>{focusedEnginesCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开引擎焦点对象 ${focusedEnginesCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedEnginesCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Cpu size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开引擎焦点任务 ${focusedEnginesCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedEnginesCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <GitCommit size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>引擎承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把可选管线、最近执行信号和下一步入口放一起，避免引擎页只剩表单和事件流。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge online">管线 {pipelines.length}</span>
            <span className="status-badge degraded">事件 {filteredEvents.length}/{events.length}</span>
            <span className="status-badge degraded">激活步骤 {activeSteps.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>优先管线</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先挑最常用或当前正在看的管线，直接带入执行器。</p>
            </div>
            <div role="region" aria-label="引擎管线筛选" style={{ display: 'grid', gap: 8 }}>
              <input
                className="antd-input"
                type="search"
                aria-label="搜索引擎管线"
                placeholder="搜索管线名称"
                value={pipelineQuery}
                onChange={(event) => setPipelineQuery(event.target.value)}
              />
              {pipelineQuery && (
                <button type="button" className="antd-btn" aria-label="清除引擎管线筛选" onClick={() => setPipelineQuery('')}>
                  清除管线筛选
                </button>
              )}
              <span className="text-muted" style={{ fontSize: 12 }}>显示 {filteredPipelines.length}/{pipelines.length} 条管线</span>
            </div>
            {pipelines.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有可选管线。</p>
            ) : focusPipelines.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>没有匹配的管线。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {focusPipelines.map((pipeline) => (
                  <button
                    key={`pipeline-${pipeline}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`选择引擎管线 ${pipeline}`}
                    onClick={() => setSelectedPipeline(pipeline)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{pipeline}</strong>
                      <p>{selectedPipeline === pipeline ? '当前已选中' : '点击后切为当前执行管线'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>选定后就能直接规划或调度。</span>
                    </div>
                    <Play size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>执行去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>执行前后要继续回资产、工作流和沙箱三处收口。</p>
            </div>
            <div role="region" aria-label="引擎事件筛选" style={{ display: 'grid', gap: 8 }}>
              <select
                className="antd-input"
                aria-label="按事件类型筛选引擎事件"
                value={eventTypeFilter}
                onChange={(event) => setEventTypeFilter(event.target.value)}
              >
                <option value="all">全部事件类型</option>
                {eventTypes.map((eventType) => <option key={eventType} value={eventType}>{eventType}</option>)}
              </select>
              {eventTypeFilter !== 'all' && (
                <button type="button" className="antd-btn" aria-label="清除引擎事件筛选" onClick={() => setEventTypeFilter('all')}>
                  清除事件筛选
                </button>
              )}
              <span className="text-muted" style={{ fontSize: 12 }}>显示 {filteredEvents.length}/{events.length} 条事件</span>
            </div>
            {recentEvents.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                {recentEvents.map((event) => (
                  <div key={`event-${event.id}`} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{event.type}</strong>
                      <p>{event.source}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{event.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {[
              { id: 'Assets', label: '资产页', reason: '执行前确认技能、管线与工作流定义是否匹配。', aria: '打开引擎承接到资产页' },
              { id: 'Workflows', label: '工作流页', reason: '执行后查看审批点、节点状态和失败链路。', aria: '打开引擎承接到工作流页' },
              { id: 'Sandbox', label: '沙箱页', reason: '先做隔离验证，再把结果带回正式调度。', aria: '打开引擎承接到沙箱页' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: focusTaskQuery || selectedPipeline || pipelines[0] || 'Engines' }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <GitCommit size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <div className="engines-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Pipeline Runner */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={20} style={{ color: 'var(--antd-primary)' }} />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>管线编排器</h2>
        </div>
        
        <WorkflowGraph 
          pipelineName={metaosPlan ? undefined : selectedPipeline} 
          initialNodes={metaosPlan?.nodes}
          initialEdges={metaosPlan?.edges}
          activeSteps={activeSteps} 
          onNodeClick={(_, node) => setSelectedNode(node)}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <label htmlFor="pipeline-select" style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>选择执行管线</label>
          <select 
            id="pipeline-select"
            className="antd-input" 
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            style={{ width: '100%', height: '36px' }}
          >
            {pipelines.map(p => (
              <option key={p} value={p} style={{ background: 'var(--antd-bg-elevated)', color: 'var(--antd-text-primary)' }}>{p}</option>
            ))}
            {pipelines.length === 0 && <option>未发现可用管线</option>}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="pipeline-input" style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>执行指令 / 目标</label>
          <textarea 
            id="pipeline-input"
            className="antd-input" 
            placeholder="例如：分析当前系统的性能指标..."
            value={pipelineInput}
            onChange={(e) => setPipelineInput(e.target.value)}
            style={{ minHeight: '100px', resize: 'vertical', height: 'auto', padding: '8px 12px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="antd-btn" 
            onClick={handlePlanTask}
            disabled={planning || running || !pipelineInput}
            style={{ flex: 1, height: '36px' }}
          >
            {planning ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--antd-primary)' }}></div> : <Activity size={16} />}
            {planning ? '规划中...' : '新任务'}
          </button>

          {metaosPlan && (
            <button 
              className="antd-btn antd-btn-primary" 
              onClick={handleExecuteTask}
              disabled={running}
              style={{ flex: 1, height: '36px', borderColor: 'var(--antd-success)', color: 'var(--antd-success)' }}
            >
              {running ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--antd-success)' }}></div> : <Play size={16} />}
              {running ? '正在承接...' : '承接计划'}
            </button>
          )}

          {!metaosPlan && (
            <button 
              className="antd-btn antd-btn-primary" 
              onClick={handleRunPipeline}
              disabled={running || !selectedPipeline}
              style={{ flex: 1, height: '36px' }}
            >
              {running ? <div className="spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--antd-primary)' }}></div> : <Play size={16} />}
              {running ? '正在承接...' : '承接管线任务'}
            </button>
          )}
        </div>

        {runResult && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: 'rgba(0,0,0,0.4)', 
            borderRadius: 'var(--antd-radius-md)',
            border: '1px solid var(--antd-border-color)',
            maxHeight: '200px',
            overflowY: 'auto',
            fontSize: '0.85rem',
            fontFamily: 'monospace'
          }}>
            <pre aria-live="polite" style={{ whiteSpace: 'pre-wrap', color: runResult.error ? 'var(--antd-error)' : 'var(--antd-primary)', margin: 0 }}>
              {JSON.stringify(runResult, null, 2)}
            </pre>
          </div>
        )}

        {selectedNode && (
          <div 
            className="animate-fade-in" 
            role="region"
            aria-label={`节点详情 ${selectedNode.data?.label || selectedNode.id}`}
            style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: 'var(--antd-bg-elevated)', 
              borderRadius: 'var(--antd-radius-lg)',
              border: '1px solid var(--antd-primary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--antd-text-primary)' }}>节点详情: {selectedNode.data?.label || selectedNode.id}</h3>
              <button 
                onClick={() => setSelectedNode(null)} 
                aria-label="关闭详情"
                style={{ background: 'none', border: 'none', color: 'var(--antd-text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            
            {(() => {
                const stepIndexMatch = selectedNode.id.match(/\d+/);
                const stepIndex = stepIndexMatch ? parseInt(stepIndexMatch[0], 10) : -1;
                
                const nodeEvents = events.filter(e => e.payload?.step_index === stepIndex || e.source === selectedNode.data?.label);
                
                let status = 'waiting';
                if (nodeEvents.some(e => e.type === 'pipeline:step:ok')) status = 'ok';
                else if (nodeEvents.some(e => e.type === 'pipeline:step:error')) status = 'error';
                else if (activeSteps.includes(selectedNode.id)) status = 'running';
                
                return (
                    <div style={{ fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                          <p style={{ margin: 0 }}><strong>ID:</strong> {selectedNode.id}</p>
                          <p style={{ margin: 0 }}>
                            <strong>状态:</strong>{' '}
                            <span style={{ 
                              color: status === 'ok' ? 'var(--antd-success)' : 
                                     status === 'error' ? 'var(--antd-error)' : 
                                     status === 'running' ? 'var(--antd-primary)' : 'var(--antd-text-secondary)',
                              fontWeight: 'bold'
                            }}>
                              {status.toUpperCase()}
                            </span>
                          </p>
                        </div>
                        
                        {nodeEvents.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <strong style={{ color: 'var(--antd-text-secondary)' }}>输出日志:</strong>
                                <div 
                                  aria-live="polite"
                                  style={{ 
                                    marginTop: '0.5rem', 
                                    maxHeight: '200px', 
                                    overflowY: 'auto', 
                                    background: 'rgba(0,0,0,0.5)', 
                                    padding: '0.75rem', 
                                    borderRadius: 'var(--antd-radius-md)', 
                                    fontFamily: 'monospace', 
                                    color: 'var(--antd-text-primary)' 
                                  }}
                                >
                                    {nodeEvents.map((e, i) => (
                                        <div key={i} style={{ marginBottom: '0.75rem', wordBreak: 'break-all', borderBottom: i < nodeEvents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: i < nodeEvents.length - 1 ? '0.75rem' : '0' }}>
                                            <div style={{ color: 'var(--antd-text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                              [{new Date(e.time).toLocaleTimeString()}] {e.type}
                                            </div>
                                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                                {JSON.stringify(e.payload, null, 2)}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
          </div>
        )}
      </div>

      {/* Event Log */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} style={{ color: 'var(--antd-warning)' }} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>消息总线追踪</h2>
          </div>
          <List size={16} style={{ color: 'var(--antd-text-secondary)' }} />
        </div>

        <div 
          role="log"
          aria-label="消息总线追踪日志流"
          aria-live="polite"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '500px', paddingRight: '0.5rem' }}
        >
          {events.length === 0 ? (
            <p style={{ color: 'var(--antd-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>总线暂无事件流。</p>
          ) : (
            filteredEvents.map((ev, i) => (
              <div key={i} className="animate-fade-in" style={{ 
                animationDelay: `${i * 0.05}s`,
                padding: '0.75rem', 
                background: 'rgba(255,255,255,0.01)', 
                borderLeft: '2px solid var(--antd-warning)',
                borderRadius: `0 var(--antd-radius-md) var(--antd-radius-md) 0`,
                borderBottom: '1px solid rgba(0, 242, 254, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--antd-text-primary)' }}>{ev.type}</span>
                  <span style={{ color: 'var(--antd-text-secondary)' }}>{new Date(ev.time).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--antd-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <GitCommit size={10} /> 来源: {ev.source}
                </div>
                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--antd-text-secondary)', background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: 'var(--antd-radius-md)', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
