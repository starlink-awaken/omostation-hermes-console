import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, GitBranch, Play, RefreshCw, XCircle } from 'lucide-react';
import './Dashboard.css';
import ActionSurfacePanel from './ActionSurfacePanel';
import KnowledgeExecutionWorkbench from './KnowledgeExecutionWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface WorkflowRecord {
  id: string;
  task: string;
  status: string;
  created: string;
  updated: string;
}

interface WorkflowDetail {
  workflow_id: string;
  task_description: string;
  status: string;
  nodes: {
    id: string;
    task_type: string;
    status: string;
    output: string;
  }[];
}

interface WorkflowsViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type WorkflowClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesWorkflowFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function WorkflowsView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: WorkflowsViewProps) {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWf, setSelectedWf] = useState<WorkflowDetail | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/metaos/workflows');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          setWorkflows(data.workflows);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchWorkflows();
    const interval = setInterval(() => {
      void fetchWorkflows();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!focusTaskQuery) return;
    const matchedWorkflow = workflows.find((workflow) => (
      matchesWorkflowFocusQuery([workflow.id, workflow.task, workflow.status], focusTaskQuery)
    ));
    if (matchedWorkflow) {
      void loadDetail(matchedWorkflow.id);
    }
  }, [focusTaskQuery, workflows]);

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/metaos/workflows/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          setSelectedWf(data.workflow);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setApprovalMessage(null);
    try {
      const res = await fetch(`/api/metaos/workflows/${id}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'ok') {
        setApprovalMessage({ tone: 'success', text: `工作流 ${id} 已授权放行` });
        await loadDetail(id);
        await fetchWorkflows();
      } else {
        setApprovalMessage({ tone: 'error', text: `工作流 ${id} 授权失败：${data.error || '后端未确认授权'}` });
      }
    } catch (e: any) {
      setApprovalMessage({ tone: 'error', text: `工作流 ${id} 授权失败：${e.message || '网络异常'}` });
    } finally {
      setApprovingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: 'var(--antd-success)' }} />;
      case 'running':
        return <Activity size={16} style={{ color: 'var(--antd-primary)' }} />;
      case 'awaiting_approval':
        return <AlertTriangle size={16} style={{ color: 'var(--antd-warning)' }} />;
      default:
        return <XCircle size={16} style={{ color: 'var(--antd-error)' }} />;
    }
  };

  const workflowSummary = useMemo(() => {
    const awaitingApproval = workflows.filter((workflow) => workflow.status === 'awaiting_approval');
    const running = workflows.filter((workflow) => workflow.status === 'running');
    const completed = workflows.filter((workflow) => workflow.status === 'completed');
    const stalled = workflows.filter((workflow) => !['awaiting_approval', 'running', 'completed'].includes(workflow.status));
    return {
      awaitingApproval,
      running,
      completed,
      stalled,
    };
  }, [workflows]);

  const actionItems = useMemo(() => ([
    {
      id: 'workflow-assets',
      title: '回技术资产库补定义',
      detail: '检查技能、管线和资产级 workflow 定义，不让运行面脱离资产面。',
      actionLabel: '进入资产库',
      actionType: 'navigate' as const,
      actionValue: 'Assets',
    },
    {
      id: 'workflow-protocol',
      title: '回协议面补证据',
      detail: '当授权链或节点状态异常时，回协议与元模型操作面核对桥接状态。',
      actionLabel: '进入协议面',
      actionType: 'navigate' as const,
      actionValue: 'Protocol',
    },
    {
      id: 'workflow-tasks',
      title: '把异常送入任务中心',
      detail: '运行异常、长期待授权和失败记录都要转成任务承接。',
      actionLabel: '进入任务中心',
      actionType: 'navigate' as const,
      actionValue: 'TaskCenter',
    },
  ]), []);

  const workflowClosureRows = useMemo<WorkflowClosureRow[]>(() => {
    const firstAwaiting = workflowSummary.awaitingApproval[0];
    const firstRuntime = [...workflowSummary.running, ...workflowSummary.stalled][0];
    const firstCompleted = workflowSummary.completed[0];
    const selectedNode = selectedWf?.nodes?.find((node) => node.status === 'awaiting_approval') || selectedWf?.nodes?.[0];

    return [
      {
        id: 'approval-hitl',
        title: '待授权与 HITL 放行',
        summary: '先把卡在 RED 门控的工作流拉出来授权，不让它们沉在历史列表里。',
        signal: firstAwaiting ? `待授权 ${workflowSummary.awaitingApproval.length}` : '当前无待授权',
        nextAction: firstAwaiting
          ? `优先处理 ${firstAwaiting.id}，确认人工放行是否合理，再继续往后跑。`
          : '当前没有待授权流，抽查最近一次授权链是否还能走通。',
        statusTone: firstAwaiting ? 'degraded' : 'online',
        objectTarget: { tab: 'Workflows', taskQuery: firstAwaiting?.id || 'approval' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstAwaiting?.id || 'approval' },
      },
      {
        id: 'runtime-evidence',
        title: '运行中与补证追踪',
        summary: '运行中或异常流不能只看状态，要继续追节点、输出和证据，确认问题卡在哪一步。',
        signal: firstRuntime ? `待补证 ${workflowSummary.running.length + workflowSummary.stalled.length}` : '当前无待补证',
        nextAction: firstRuntime
          ? `打开 ${firstRuntime.id} 的详情，确认节点输出、异常状态和补证方向。`
          : '当前没有运行中或异常流，抽查最近一次详情展开链路是否仍然可用。',
        statusTone: firstRuntime ? 'degraded' : 'online',
        objectTarget: { tab: 'Workflows', taskQuery: firstRuntime?.id || selectedNode?.id || 'runtime' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstRuntime?.id || selectedNode?.id || 'runtime' },
      },
      {
        id: 'assets-protocol',
        title: '回资产与协议补位',
        summary: '工作流问题最后常常是定义面的问题，要回资产库和协议面补技能、桥接和约束。',
        signal: selectedNode ? `节点 ${selectedNode.id}` : `已完成 ${workflowSummary.completed.length}`,
        nextAction: selectedNode
          ? `围绕 ${selectedNode.id} 回资产和协议面核对定义、桥接和治理边界。`
          : '当前没有已展开节点，优先从最近一次工作流回资产和协议面做定义复核。',
        statusTone: selectedNode ? 'degraded' : 'online',
        objectTarget: { tab: 'Assets', taskQuery: selectedNode?.id || firstCompleted?.id || 'workflow-assets' },
        taskTarget: { tab: 'TaskCenter', taskQuery: selectedNode?.id || firstCompleted?.id || 'workflow-assets' },
      },
      {
        id: 'systemmap-task',
        title: '系统地图与任务收口',
        summary: '工作流异常最终要挂回系统地图和任务中心，不然只能看到运行症状，看不到全站落点。',
        signal: firstCompleted ? `已完成 ${workflowSummary.completed.length}` : `总记录 ${workflows.length}`,
        nextAction: '把工作流异常或待跟进项正式送进任务中心，并回系统地图确认架构落点。',
        statusTone: workflows.length > 0 ? 'degraded' : 'online',
        objectTarget: { tab: 'SystemMap', pageId: 'Workflows' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || firstAwaiting?.id || firstRuntime?.id || 'Workflows' },
      },
    ];
  }, [focusTaskQuery, selectedWf?.nodes, workflowSummary.awaitingApproval, workflowSummary.completed, workflowSummary.running, workflowSummary.stalled, workflows.length]);

  const focusedWorkflowCard = useMemo(() => {
    const matchedWorkflow = workflows.find((workflow) => (
      matchesWorkflowFocusQuery([workflow.id, workflow.task, workflow.status], focusTaskQuery)
    ));
    if (matchedWorkflow) {
      return {
        kicker: '工作流记录',
        title: matchedWorkflow.task || matchedWorkflow.id,
        detail: `${matchedWorkflow.id} · ${matchedWorkflow.status}，先看节点详情，再决定回资产、协议还是任务面继续承接。`,
        objectTarget: { tab: 'Workflows', taskQuery: matchedWorkflow.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedWorkflow.id },
      };
    }

    if (selectedWf && matchesWorkflowFocusQuery([
      selectedWf.workflow_id,
      selectedWf.task_description,
      selectedWf.status,
      ...selectedWf.nodes.map((node) => `${node.id} ${node.task_type} ${node.status}`),
    ], focusTaskQuery)) {
      return {
        kicker: '工作流详情',
        title: selectedWf.task_description || selectedWf.workflow_id,
        detail: `${selectedWf.workflow_id} · ${selectedWf.status}，当前详情已经展开，可直接转成任务或回全站补位。`,
        objectTarget: { tab: 'Workflows', taskQuery: selectedWf.workflow_id },
        taskTarget: { tab: 'TaskCenter', taskQuery: selectedWf.workflow_id },
      };
    }

    const matchedClosure = workflowClosureRows.find((row) => (
      matchesWorkflowFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '工作流闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'Workflows') {
      return {
        kicker: '当前页面',
        title: 'MetaOS 工作流',
        detail: '这页负责把授权、运行、补证和任务承接放到一个平面上，避免编排问题只剩历史记录。',
        objectTarget: { tab: 'SystemMap', pageId: 'Workflows' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Workflows' },
      };
    }

    return null;
  }, [focusPageId, focusTaskQuery, selectedWf, workflowClosureRows, workflows]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <KnowledgeExecutionWorkbench currentPage="Workflows" onNavigate={onNavigate} />

      <section className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>工作流运行总面</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              不只看历史记录，还要知道哪些在等授权、哪些在运行、哪些已经可以回流任务和治理面。
            </p>
          </div>
          <button
            type="button"
            className="antd-btn"
            onClick={() => {
              setRefreshing(true);
              void fetchWorkflows();
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>
        </div>

        <div className="stats-grid">
          {[
            ['待授权', workflowSummary.awaitingApproval.length, <AlertTriangle key="approval" size={20} />],
            ['运行中', workflowSummary.running.length, <Activity key="running" size={20} />],
            ['已完成', workflowSummary.completed.length, <CheckCircle key="completed" size={20} />],
            ['需补证', workflowSummary.stalled.length, <GitBranch key="stalled" size={20} />],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="stat-card">
              <div className="stat-icon-wrapper pulse-accent">{icon}</div>
              <div className="stat-info">
                <h3>{label}</h3>
                <p className="stat-value">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ActionSurfacePanel
        title="工作流处理区"
        subtitle="先处理待授权，再回资产与协议面补证据，最后把异常承接进任务中心。"
        statusText={workflows.length ? `${workflows.length} 条工作流记录` : '等待工作流记录'}
        items={actionItems}
        onNavigate={onNavigate}
      />

      {focusedWorkflowCard && (
        <section className="services-section overview-ops-panel" aria-label="当前工作流承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前工作流承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成工作流面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedWorkflowCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedWorkflowCard.title}</strong>
              <p>{focusedWorkflowCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开工作流焦点对象 ${focusedWorkflowCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedWorkflowCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Play size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开工作流焦点任务 ${focusedWorkflowCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedWorkflowCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <FileText size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" role="region" aria-label="工作流闭环总表">
        <div className="section-header">
          <div>
            <h2>工作流闭环总表</h2>
            <p className="text-muted">把待授权、运行补证、资产协议补位和系统地图/任务收口并排摆出来，工作流页才不只是历史记录和授权按钮。</p>
          </div>
          <span className="status-badge online">{workflowClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {workflowClosureRows.map((row) => (
            <article
              key={`workflow-closure-${row.id}`}
              className="antd-card"
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
                  className="antd-btn"
                  aria-label={`打开工作流闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Play size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开工作流闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <FileText size={14} />
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
            <h2>工作流承接工作台</h2>
            <p className="text-muted">把授权、运行、补证和任务承接放到一个平面上，避免只盯着某一条历史记录。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">待授权 {workflowSummary.awaitingApproval.length}</span>
            <span className="status-badge degraded">运行中 {workflowSummary.running.length}</span>
            <span className="status-badge online">已完成 {workflowSummary.completed.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>待授权清单</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先把 RED 门控卡住的流拉出来，不让它们在历史列表里沉底。</p>
            </div>
            {workflowSummary.awaitingApproval.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有待授权工作流。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {workflowSummary.awaitingApproval.slice(0, 3).map((workflow) => (
                  <button
                    key={`approval-${workflow.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`处理授权 ${workflow.id}`}
                    onClick={() => void loadDetail(workflow.id)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{workflow.task || workflow.id}</strong>
                      <p>{workflow.id}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>更新时间 {new Date(workflow.updated).toLocaleString()}</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>运行与补证</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>运行中和异常流要么继续跟踪，要么回协议/系统地图补证。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.('SystemMap')}>
                <GitBranch size={14} />
                <span>看系统地图</span>
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[...workflowSummary.running, ...workflowSummary.stalled].slice(0, 3).map((workflow) => (
                <button
                  key={`runtime-${workflow.id}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`查看运行工作流 ${workflow.id}`}
                  onClick={() => void loadDetail(workflow.id)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{workflow.task || workflow.id}</strong>
                    <p>{workflow.status}</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>创建于 {new Date(workflow.created).toLocaleString()}</span>
                  </div>
                  <Play size={14} />
                </button>
              ))}
              {workflowSummary.running.length + workflowSummary.stalled.length === 0 && (
                <p className="text-muted" style={{ margin: 0 }}>当前没有待补证的运行流。</p>
              )}
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>承接页面</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>工作流问题最后都要回到资产、协议、任务和全站缺口上。</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { id: 'Assets', label: '技术资产库', reason: '回技能、管线和 workflow 定义面补位。' },
                { id: 'Protocol', label: '协议与元模型操作面', reason: '核对桥接、治理与协议层约束。' },
                { id: 'TaskCenter', label: '任务中心', reason: '把异常和待跟进流转成明确任务。' },
                { id: 'SystemMap', label: '系统地图', reason: '看这些工作流缺口在全站架构中的落点。' },
              ].map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="action-surface-item"
                  aria-label={`进入承接页面 ${page.label}`}
                  onClick={() => onNavigate?.(page.id)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{page.label}</strong>
                    <p>{page.reason}</p>
                  </div>
                  <FileText size={14} />
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} style={{ color: 'var(--antd-primary)' }} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>MetaOS 工作流历史</h2>
          </div>
          {loading ? (
            <div className="loading-state" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <p>加载中...</p>
            </div>
          ) : workflows.length === 0 ? (
            <p style={{ color: 'var(--antd-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>暂无记录。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} role="list" aria-label="工作流历史列表">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="antd-input"
                  role="listitem"
                  tabIndex={0}
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    height: 'auto',
                    border: selectedWf?.workflow_id === workflow.id ? '1px solid var(--antd-primary)' : '1px solid var(--antd-border-color)',
                    boxShadow: selectedWf?.workflow_id === workflow.id ? 'var(--tech-cyan-glow)' : 'none',
                    background: selectedWf?.workflow_id === workflow.id ? 'rgba(0, 242, 254, 0.05)' : 'rgba(6, 9, 19, 0.6)',
                  }}
                  onClick={() => void loadDetail(workflow.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      void loadDetail(workflow.id);
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--antd-text-primary)', fontFamily: 'monospace' }}>{workflow.id.substring(0, 12)}...</span>
                    {getStatusIcon(workflow.status)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>
                    {workflow.task ? (workflow.task.length > 50 ? `${workflow.task.substring(0, 50)}...` : workflow.task) : '未提供目标描述 (系统自动生成的测试流)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--antd-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {new Date(workflow.created).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          {selectedWf ? (
            <>
              <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} style={{ color: 'var(--antd-primary)' }} />
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>工作流详情 & 人机协作 (HITL)</h2>
              </div>

              {approvalMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--antd-radius-md)',
                    border: `1px solid ${approvalMessage.tone === 'success' ? 'rgba(5, 243, 162, 0.35)' : 'rgba(255, 71, 87, 0.35)'}`,
                    color: approvalMessage.tone === 'success' ? 'var(--antd-success)' : 'var(--antd-error)',
                    background: approvalMessage.tone === 'success' ? 'rgba(5, 243, 162, 0.08)' : 'rgba(255, 71, 87, 0.08)',
                    fontSize: '0.8rem',
                  }}
                >
                  {approvalMessage.text}
                </div>
              )}

              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: 'var(--antd-radius-lg)', border: '1px solid var(--antd-border-color)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--antd-text-primary)' }}>目标任务</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--antd-text-secondary)', margin: 0 }}>{selectedWf.task_description}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--antd-text-primary)' }}>节点追踪</h3>
                {(selectedWf.nodes || []).map((node) => (
                  <div
                    key={node.id}
                    style={{
                      padding: '1rem',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 'var(--antd-radius-md)',
                      border: '1px solid var(--antd-border-color)',
                      borderLeft: node.status === 'awaiting_approval' ? '3px solid var(--antd-warning)' : '1px solid var(--antd-border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--antd-text-primary)' }}>
                        {node.id}
                        <span style={{ color: 'var(--antd-text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>({node.task_type})</span>
                      </span>
                      {getStatusIcon(node.status)}
                    </div>
                    {node.status === 'awaiting_approval' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--antd-warning-bg)', padding: '0.75rem', borderRadius: 'var(--antd-radius-md)', border: '1px solid rgba(255, 184, 0, 0.2)' }}>
                        <span style={{ color: 'var(--antd-warning)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={14} /> 触发 RED 门控：需人工授权执行
                        </span>
                        <button
                          className="antd-btn antd-btn-primary"
                          disabled={approvingId === selectedWf.workflow_id}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', height: '28px', color: 'var(--antd-warning)', borderColor: 'var(--antd-warning)' }}
                          onClick={() => void handleApprove(selectedWf.workflow_id)}
                        >
                          {approvingId === selectedWf.workflow_id ? '授权中...' : '授权放行'}
                        </button>
                      </div>
                    ) : node.output ? (
                      <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--antd-text-secondary)', background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: 'var(--antd-radius-md)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {node.output}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--antd-text-secondary)' }}>
              <Activity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>请在左侧选择工作流以查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
