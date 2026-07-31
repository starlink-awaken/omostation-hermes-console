import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, ClipboardCheck, Clock, FileText, GitBranch, Play, RefreshCw, XCircle } from 'lucide-react';
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

interface WorkflowListPayload {
  status?: string;
  workflows?: WorkflowRecord[];
  total?: number;
  offset?: number;
  limit?: number;
  has_more?: boolean;
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
  const [workflowQuery, setWorkflowQuery] = useState('');
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWf, setSelectedWf] = useState<WorkflowDetail | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [queueingId, setQueueingId] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [workflowTotal, setWorkflowTotal] = useState(0);
  const [hasMoreWorkflows, setHasMoreWorkflows] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadedWorkflowCount = useRef(0);

  const fetchWorkflows = async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    try {
      const res = await fetch(`/api/metaos/workflows?limit=20&offset=${offset}`);
      const data = await res.json().catch(() => ({})) as WorkflowListPayload;
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || '工作流运行数据不可用');
      }
      const nextWorkflows = Array.isArray(data.workflows) ? data.workflows : [];
      const total = typeof data.total === 'number' ? data.total : nextWorkflows.length;
      const preserveLoadedHistory = !append && loadedWorkflowCount.current > nextWorkflows.length;
      setWorkflows((current) => {
        if (append) {
          const knownIds = new Set(current.map((workflow) => workflow.id));
          loadedWorkflowCount.current = current.length + nextWorkflows.filter((workflow) => !knownIds.has(workflow.id)).length;
          return [...current, ...nextWorkflows.filter((workflow) => !knownIds.has(workflow.id))];
        }
        if (preserveLoadedHistory) {
          const pageIds = new Set(nextWorkflows.map((workflow) => workflow.id));
          return [...nextWorkflows, ...current.filter((workflow) => !pageIds.has(workflow.id))];
        }
        loadedWorkflowCount.current = nextWorkflows.length;
        return nextWorkflows;
      });
      setWorkflowTotal(total);
      setHasMoreWorkflows(data.has_more === true || preserveLoadedHistory);
      setDataError(null);
    } catch (e) {
      console.error('Failed to load workflows:', e);
      setDataError(e instanceof Error ? e.message : '工作流运行数据不可用');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // 页面挂载及定时刷新都从外部运行态同步列表。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchWorkflows();
    const interval = setInterval(() => {
      void fetchWorkflows();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredWorkflows = useMemo(() => {
    const query = workflowQuery.trim().toLowerCase();
    return workflows.filter((workflow) => {
      if (workflowStatusFilter === 'stalled' && ['awaiting_approval', 'running', 'completed'].includes(workflow.status)) return false;
      if (workflowStatusFilter !== 'all' && workflowStatusFilter !== 'stalled' && workflow.status !== workflowStatusFilter) return false;
      if (!query) return true;
      return [workflow.id, workflow.task, workflow.status].join(' ').toLowerCase().includes(query);
    });
  }, [workflowQuery, workflowStatusFilter, workflows]);

  useEffect(() => {
    // 筛选条件变化后关闭已经不可见的详情对象。
    if (selectedWf && !filteredWorkflows.some((workflow) => workflow.id === selectedWf.workflow_id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedWf(null);
      setDetailId(null);
    }
  }, [filteredWorkflows, selectedWf]);

  const loadDetail = async (id: string) => {
    setDetailId(id);
    setDetailError(null);
    try {
      const res = await fetch(`/api/metaos/workflows/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== 'ok' || !data.workflow) {
        throw new Error(data.error || '工作流详情不可用');
      }
      setSelectedWf(data.workflow);
      setDetailError(null);
    } catch (error) {
      console.error('Failed to load workflow detail:', error);
      setDetailError(error instanceof Error ? error.message : '工作流详情不可用');
    }
  };

  useEffect(() => {
    if (!focusTaskQuery) return;
    const matchedWorkflow = filteredWorkflows.find((workflow) => (
      matchesWorkflowFocusQuery([workflow.id, workflow.task, workflow.status], focusTaskQuery)
    ));
    // 导航查询来自页面外部，需要同步到列表筛选并展开匹配详情。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (matchedWorkflow) setWorkflowQuery(focusTaskQuery);
    if (matchedWorkflow) {
      void loadDetail(matchedWorkflow.id);
    }
  }, [focusTaskQuery, filteredWorkflows]);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setApprovalMessage(null);
    try {
      const res = await fetch(`/api/metaos/workflows/${id}/approve`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === 'ok') {
        const approvedNodes = Array.isArray(data.approved_nodes) ? data.approved_nodes : [];
        const receipt = approvedNodes.length > 0
          ? `，已放行 ${approvedNodes.length} 个节点（${approvedNodes.join('、')}），回执 ${data.approved_at || '已记录'}`
          : '';
        setApprovalMessage({ tone: 'success', text: `工作流 ${id} 已授权放行${receipt}` });
        await loadDetail(id);
        await fetchWorkflows();
      } else {
        setApprovalMessage({ tone: 'error', text: `工作流 ${id} 授权失败：${data.error || '后端未确认授权'}` });
      }
    } catch (e: unknown) {
      setApprovalMessage({ tone: 'error', text: `工作流 ${id} 授权失败：${e instanceof Error ? e.message : '网络异常'}` });
    } finally {
      setApprovingId(null);
    }
  };

  const handleQueueFollowup = async (workflow: WorkflowDetail) => {
    setQueueingId(workflow.workflow_id);
    setApprovalMessage(null);
    try {
      const res = await fetch(`/api/cockpit/metaos/workflows/${encodeURIComponent(workflow.workflow_id)}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: workflow.status,
          task: workflow.task_description,
          node_count: workflow.nodes?.length || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || '工作流任务承接失败');
      setApprovalMessage({
        tone: 'success',
        text: data.created === false ? `任务已存在：${data.id}` : `已承接为任务：${data.id}`,
      });
      if (data.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: data.id }, onNavigate, onOpenTarget);
    } catch (error: unknown) {
      setApprovalMessage({ tone: 'error', text: `工作流任务承接失败：${error instanceof Error ? error.message : '网络异常'}` });
    } finally {
      setQueueingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: 'var(--cockpit-success)' }} />;
      case 'running':
        return <Activity size={16} style={{ color: 'var(--cockpit-primary)' }} />;
      case 'awaiting_approval':
        return <AlertTriangle size={16} style={{ color: 'var(--cockpit-warning)' }} />;
      default:
        return <XCircle size={16} style={{ color: 'var(--cockpit-error)' }} />;
    }
  };

  const workflowSummary = useMemo(() => {
    const awaitingApproval = filteredWorkflows.filter((workflow) => workflow.status === 'awaiting_approval');
    const running = filteredWorkflows.filter((workflow) => workflow.status === 'running');
    const completed = filteredWorkflows.filter((workflow) => workflow.status === 'completed');
    const stalled = filteredWorkflows.filter((workflow) => !['awaiting_approval', 'running', 'completed'].includes(workflow.status));
    return {
      awaitingApproval,
      running,
      completed,
      stalled,
    };
  }, [filteredWorkflows]);

  const actionItems = useMemo(() => {
    const workflowContextQuery = selectedWf?.workflow_id || focusTaskQuery || filteredWorkflows[0]?.id || 'Workflows';
    return ([
    {
      id: 'workflow-assets',
      title: '回技术资产库补定义',
      detail: '检查技能、管线和资产级 workflow 定义，不让运行面脱离资产面。',
      actionLabel: '进入资产库',
      actionType: 'navigate' as const,
      actionValue: 'Assets',
      actionTarget: { tab: 'Assets', taskQuery: workflowContextQuery },
    },
    {
      id: 'workflow-protocol',
      title: '回协议面补证据',
      detail: '当授权链或节点状态异常时，回协议与元模型操作面核对桥接状态。',
      actionLabel: '进入协议面',
      actionType: 'navigate' as const,
      actionValue: 'Protocol',
      actionTarget: { tab: 'Protocol', taskQuery: workflowContextQuery },
    },
    {
      id: 'workflow-tasks',
      title: '把异常送入任务中心',
      detail: '运行异常、长期待授权和失败记录都要转成任务承接。',
      actionLabel: '进入任务中心',
      actionType: 'navigate' as const,
      actionValue: 'TaskCenter',
      actionTarget: { tab: 'TaskCenter', taskQuery: workflowContextQuery },
    },
    ]);
  }, [filteredWorkflows, focusTaskQuery, selectedWf?.workflow_id]);

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
      <KnowledgeExecutionWorkbench currentPage="Workflows" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {dataError && (
        <div className="shell-data-banner" role="alert">
          <span>{dataError}，当前列表不代表没有工作流记录。</span>
          <button type="button" onClick={() => { setRefreshing(true); void fetchWorkflows(); }}>重试</button>
        </div>
      )}

      <section className="cockpit-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>工作流运行总面</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              不只看历史记录，还要知道哪些在等授权、哪些在运行、哪些已经可以回流任务和治理面。
            </p>
          </div>
          <button
            type="button"
            className="cockpit-btn"
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
        statusText={filteredWorkflows.length ? `${filteredWorkflows.length}/${workflowTotal} 条工作流记录` : workflowTotal ? '当前筛选无工作流记录' : '等待工作流记录'}
        items={actionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
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
                className="cockpit-btn"
                aria-label={`打开工作流焦点对象 ${focusedWorkflowCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedWorkflowCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Play size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="cockpit-btn"
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
                  aria-label={`打开工作流闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Play size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="cockpit-btn"
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

      <section className="services-section" role="region" aria-label="工作流筛选">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>运行流检索</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              同一组条件作用于摘要、闭环、处理台、历史和详情焦点，避免状态切片后仍然看见旧上下文。
            </p>
          </div>
          <span className="status-badge online">显示 {filteredWorkflows.length}/{workflows.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="search"
            aria-label="搜索工作流"
            placeholder="工作流 ID、任务描述或状态"
            value={workflowQuery}
            onChange={(event) => setWorkflowQuery(event.target.value)}
            style={{
              flex: '1 1 280px',
              minWidth: 220,
              padding: '9px 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <select
            aria-label="按状态筛选工作流"
            value={workflowStatusFilter}
            onChange={(event) => setWorkflowStatusFilter(event.target.value)}
            style={{
              minWidth: 150,
              padding: '9px 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 13,
              outline: 'none',
            }}
          >
            <option value="all">全部状态</option>
            <option value="awaiting_approval">待授权</option>
            <option value="running">运行中</option>
            <option value="stalled">需补证</option>
            <option value="completed">已完成</option>
          </select>
          <button
            type="button"
            className="cockpit-btn"
            aria-label="清除工作流筛选"
            onClick={() => { setWorkflowQuery(''); setWorkflowStatusFilter('all'); }}
            disabled={!workflowQuery && workflowStatusFilter === 'all'}
          >
            清除
          </button>
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
          <article className="cockpit-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

          <article className="cockpit-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>运行与补证</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>运行中和异常流要么继续跟踪，要么回协议/系统地图补证。</p>
              </div>
              <button type="button" className="cockpit-btn" onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', taskQuery: focusTaskQuery || selectedWf?.workflow_id || filteredWorkflows[0]?.id || 'Workflows' }, onNavigate, onOpenTarget)}>
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

          <article className="cockpit-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: focusTaskQuery || selectedWf?.workflow_id || filteredWorkflows[0]?.id || 'Workflows' }, onNavigate, onOpenTarget)}
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
        <div className="cockpit-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} style={{ color: 'var(--cockpit-primary)' }} />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>MetaOS 工作流历史</h2>
          </div>
          {loading ? (
            <div className="loading-state" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <p>加载中...</p>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <p style={{ color: 'var(--cockpit-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>
              {workflows.length === 0 ? '暂无记录。' : '当前筛选下暂无工作流记录。'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} role="list" aria-label="工作流历史列表">
              {filteredWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="cockpit-input"
                  role="listitem"
                  tabIndex={0}
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    height: 'auto',
                    border: selectedWf?.workflow_id === workflow.id ? '1px solid var(--cockpit-primary)' : '1px solid var(--cockpit-border-color)',
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
                    <span style={{ fontWeight: 600, color: 'var(--cockpit-text-primary)', fontFamily: 'monospace' }}>{workflow.id.substring(0, 12)}...</span>
                    {getStatusIcon(workflow.status)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--cockpit-text-secondary)' }}>
                    {workflow.task ? (workflow.task.length > 50 ? `${workflow.task.substring(0, 50)}...` : workflow.task) : '未提供目标描述 (系统自动生成的测试流)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cockpit-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {new Date(workflow.created).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasMoreWorkflows && (
            <button
              type="button"
              className="cockpit-btn"
              aria-label="加载更多工作流历史"
              onClick={() => void fetchWorkflows(workflows.length, true)}
              disabled={loadingMore}
            >
              {loadingMore ? '正在加载...' : `加载更多（已显示 ${workflows.length}/${workflowTotal}）`}
            </button>
          )}
        </div>

        <div className="cockpit-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          {detailError && (
            <div className="shell-data-banner" role="alert">
              <span>{detailError}{selectedWf ? '，当前仍显示上一次成功加载的详情。' : ''}</span>
              <button type="button" onClick={() => detailId && void loadDetail(detailId)}>重试详情</button>
            </div>
          )}
          {selectedWf ? (
            <>
              <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} style={{ color: 'var(--cockpit-primary)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>工作流详情 & 人机协作 (HITL)</h2>
                  <button
                    type="button"
                    className="cockpit-btn"
                    onClick={() => void handleQueueFollowup(selectedWf)}
                    disabled={queueingId === selectedWf.workflow_id}
                  >
                    {queueingId === selectedWf.workflow_id ? <RefreshCw size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                    {queueingId === selectedWf.workflow_id ? '承接中...' : '承接跟进任务'}
                  </button>
                </div>
              </div>

              {approvalMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--cockpit-radius-md)',
                    border: `1px solid ${approvalMessage.tone === 'success' ? 'rgba(5, 243, 162, 0.35)' : 'rgba(255, 71, 87, 0.35)'}`,
                    color: approvalMessage.tone === 'success' ? 'var(--cockpit-success)' : 'var(--cockpit-error)',
                    background: approvalMessage.tone === 'success' ? 'rgba(5, 243, 162, 0.08)' : 'rgba(255, 71, 87, 0.08)',
                    fontSize: '0.8rem',
                  }}
                >
                  {approvalMessage.text}
                </div>
              )}

              <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: 'var(--cockpit-radius-lg)', border: '1px solid var(--cockpit-border-color)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--cockpit-text-primary)' }}>目标任务</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--cockpit-text-secondary)', margin: 0 }}>{selectedWf.task_description}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--cockpit-text-primary)' }}>节点追踪</h3>
                {(selectedWf.nodes || []).map((node) => (
                  <div
                    key={node.id}
                    style={{
                      padding: '1rem',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: 'var(--cockpit-radius-md)',
                      border: '1px solid var(--cockpit-border-color)',
                      borderLeft: node.status === 'awaiting_approval' ? '3px solid var(--cockpit-warning)' : '1px solid var(--cockpit-border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--cockpit-text-primary)' }}>
                        {node.id}
                        <span style={{ color: 'var(--cockpit-text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>({node.task_type})</span>
                      </span>
                      {getStatusIcon(node.status)}
                    </div>
                    {node.status === 'awaiting_approval' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--cockpit-warning-bg)', padding: '0.75rem', borderRadius: 'var(--cockpit-radius-md)', border: '1px solid rgba(255, 184, 0, 0.2)' }}>
                        <span style={{ color: 'var(--cockpit-warning)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={14} /> 触发 RED 门控：需人工授权执行
                        </span>
                        <button
                          className="cockpit-btn cockpit-btn-primary"
                          disabled={approvingId === selectedWf.workflow_id}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', height: '28px', color: 'var(--cockpit-warning)', borderColor: 'var(--cockpit-warning)' }}
                          onClick={() => void handleApprove(selectedWf.workflow_id)}
                        >
                          {approvingId === selectedWf.workflow_id ? '授权中...' : '授权放行'}
                        </button>
                      </div>
                    ) : node.output ? (
                      <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--cockpit-text-secondary)', background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: 'var(--cockpit-radius-md)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {node.output}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : detailError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: '100%', color: 'var(--cockpit-text-secondary)' }}>
              <XCircle size={48} style={{ opacity: 0.45, color: 'var(--cockpit-error)' }} />
              <p style={{ margin: 0 }}>{detailError}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--cockpit-text-secondary)' }}>
              <Activity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>请在左侧选择工作流以查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
