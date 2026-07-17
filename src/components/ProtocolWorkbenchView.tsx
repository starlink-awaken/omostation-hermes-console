import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Copy, GitBranch, Layers, RefreshCw, Route, Search, ShieldAlert, X } from 'lucide-react';
import './Dashboard.css';
import ActionSurfacePanel from './ActionSurfacePanel';
import EcosWorkflowWorkbench from './EcosWorkflowWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

type ProtocolLayer = {
  id: string;
  title: string;
  status: string;
  role: string;
  facts: string[];
  next_action: string;
};

type ProtocolWorkflow = {
  id: string;
  task: string;
  status: string;
  updated_at?: string | null;
};

type ProtocolPayload = {
  status?: string;
  summary: {
    workflow_definitions: number;
    workflow_actions: number;
    workflow_backends: number;
    recent_runs: number;
    ready_layers: number;
    watch_layers: number;
    page_score: number;
  };
  layers: ProtocolLayer[];
  recent_workflows: ProtocolWorkflow[];
  commands: Array<{
    id: string;
    label: string;
    value: string;
    detail: string;
  }>;
  related_pages: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  roadmap_item?: {
    id: string;
    title?: string;
    priority?: string;
    problem?: string;
  } | null;
  playbook?: {
    id: string;
    title?: string;
    goal?: string;
  } | null;
};

type ProtocolSurfaceId = 'layers' | 'workflows' | 'evidence' | 'governance';

type ProtocolSurfaceCard = {
  id: ProtocolSurfaceId;
  title: string;
  summary: string;
  detail: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

type ProtocolClosureRow = ProtocolSurfaceCard & {
  signal: string;
  handoff: string;
  statusTone: 'online' | 'degraded';
};

interface ProtocolWorkbenchViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

const EMPTY_PAYLOAD: ProtocolPayload = {
  summary: {
    workflow_definitions: 0,
    workflow_actions: 0,
    workflow_backends: 0,
    recent_runs: 0,
    ready_layers: 0,
    watch_layers: 0,
    page_score: 0,
  },
  layers: [],
  recent_workflows: [],
  commands: [],
  related_pages: [],
  roadmap_item: null,
  playbook: null,
};

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return fallback;
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function statusLabel(status: string) {
  if (status === 'ready') return '就绪';
  if (status === 'watch') return '观察';
  return '未知';
}

function shortTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function matchesProtocolFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function inferProtocolSurface(query?: string): ProtocolSurfaceId {
  if (matchesProtocolFocusQuery(['workflow', 'run', '编排', '运行', '调度'], query)) return 'workflows';
  if (matchesProtocolFocusQuery(['command', 'copy', 'evidence', 'audit', '命令', '补证', '审计'], query)) return 'evidence';
  if (matchesProtocolFocusQuery(['governance', 'roadmap', 'systemmap', 'system map', 'task', '治理', '路线图', '任务'], query)) return 'governance';
  return 'layers';
}

export default function ProtocolWorkbenchView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: ProtocolWorkbenchViewProps) {
  const [payload, setPayload] = useState<ProtocolPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [protocolDraftNotice, setProtocolDraftNotice] = useState<string | null>(null);
  const [protocolTaskPending, setProtocolTaskPending] = useState(false);
  const [protocolTaskError, setProtocolTaskError] = useState<string | null>(null);
  const [protocolQuery, setProtocolQuery] = useState('');
  const [protocolStatusFilter, setProtocolStatusFilter] = useState('all');

  const load = async () => {
    const data = await fetchJson<ProtocolPayload>('/api/cockpit/protocol-hub', EMPTY_PAYLOAD);
    setPayload(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const actionItems = useMemo(() => {
    const commandItems = payload.commands.slice(0, 2).map((command) => ({
      id: command.id,
      title: command.label,
      detail: command.detail,
      actionLabel: '复制命令',
      actionType: 'copy' as const,
      actionValue: command.value,
    }));
    const pageItems = payload.related_pages.slice(0, 2).map((page) => ({
      id: `page-${page.id}`,
      title: page.title,
      detail: page.reason,
      actionLabel: '进入页面',
      actionType: 'navigate' as const,
      actionValue: page.id,
    }));
    return [...commandItems, ...pageItems];
  }, [payload.commands, payload.related_pages]);

  const assetsTarget = useMemo(() => (
    payload.related_pages.find((page) => /assets|资产/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Assets'
  ), [payload.related_pages]);

  const workflowTarget = useMemo(() => (
    payload.related_pages.find((page) => /workflow|编排/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Workflows'
  ), [payload.related_pages]);

  const governanceTarget = useMemo(() => (
    payload.related_pages.find((page) => /systemmap|system map|overview|task|治理|总览/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'SystemMap'
  ), [payload.related_pages]);

  const protocolSurfaces = useMemo<ProtocolSurfaceCard[]>(() => ([
    {
      id: 'layers',
      title: '协议层桥',
      summary: '看 ecos、MOF、model-driven 和 workflow 的桥接是否完整。',
      detail: '适合先确认定义层有没有断层，再决定去资产面还是继续巡检 workflow。',
      objectTarget: { tab: assetsTarget, taskQuery: focusTaskQuery || 'protocol-layer' },
      taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'protocol-layer' },
    },
    {
      id: 'workflows',
      title: '最近编排',
      summary: '核对最近 workflow 有没有真的承接协议层。',
      detail: '定义存在不代表能跑，最近运行记录能证明它是活的还是纸面系统。',
      objectTarget: { tab: workflowTarget, taskQuery: focusTaskQuery || 'workflow' },
      taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'workflow' },
    },
    {
      id: 'evidence',
      title: '补证命令',
      summary: '复制检查命令，给协议页补执行证据。',
      detail: '当页面里只有定义没有运行痕迹，先补证据再回来看状态变化。',
      objectTarget: { tab: 'Protocol', taskQuery: focusTaskQuery || 'protocol-evidence' },
      taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'protocol-evidence' },
    },
    {
      id: 'governance',
      title: '治理收口',
      summary: '把路线图、playbook 和治理面串成最后承接。',
      detail: '协议问题最后都得落进治理或任务中心，不然只是看见问题，没有闭环。',
      objectTarget: { tab: governanceTarget, taskQuery: focusTaskQuery || 'protocol-governance' },
      taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'protocol-governance' },
    },
  ]), [assetsTarget, focusTaskQuery, governanceTarget, workflowTarget]);
  const inferredProtocolSurface = useMemo(() => inferProtocolSurface(focusTaskQuery), [focusTaskQuery]);
  const [activeProtocolSurfaceId, setActiveProtocolSurfaceId] = useState<ProtocolSurfaceId>(inferredProtocolSurface);

  useEffect(() => {
    setActiveProtocolSurfaceId(inferredProtocolSurface);
  }, [inferredProtocolSurface]);

  const activeProtocolSurface = useMemo(
    () => protocolSurfaces.find((surface) => surface.id === activeProtocolSurfaceId) || protocolSurfaces[0],
    [activeProtocolSurfaceId, protocolSurfaces],
  );

  const protocolBacklog = useMemo(() => {
    const watchLayers = payload.layers.filter((layer) => layer.status !== 'ready');
    const activeRuns = payload.recent_workflows.filter((workflow) => workflow.status !== 'completed');
    return {
      watchCount: watchLayers.length,
      activeRunCount: activeRuns.length,
      layerItems: (watchLayers.length ? watchLayers : payload.layers).slice(0, 3),
      activeRuns: activeRuns.slice(0, 3),
      pageItems: payload.related_pages.slice(0, 3),
    };
  }, [payload.layers, payload.recent_workflows, payload.related_pages]);

  const protocolClosureRows = useMemo<ProtocolClosureRow[]>(() => ([
    {
      ...protocolSurfaces[0],
      signal: protocolBacklog.watchCount ? `观察层 ${protocolBacklog.watchCount}` : `就绪层 ${payload.summary.ready_layers}`,
      handoff: `对象去 ${assetsTarget}，任务去 TaskCenter，先把桥接层卡点定位清楚。`,
      statusTone: protocolBacklog.watchCount ? 'degraded' : 'online',
    },
    {
      ...protocolSurfaces[1],
      signal: protocolBacklog.activeRunCount ? `未闭环运行 ${protocolBacklog.activeRunCount}` : `最近运行 ${payload.summary.recent_runs}`,
      handoff: `对象去 ${workflowTarget}，任务去 TaskCenter，确认 workflow 是真跑过还是只挂在定义里。`,
      statusTone: protocolBacklog.activeRunCount ? 'degraded' : 'online',
    },
    {
      ...protocolSurfaces[2],
      signal: payload.commands.length ? `补证命令 ${payload.commands.length}` : '暂无补证命令',
      handoff: '先复制检查命令，再把补证动作送进 TaskCenter，避免协议页停在浏览层。',
      statusTone: payload.commands.length ? 'degraded' : 'online',
    },
    {
      ...protocolSurfaces[3],
      signal: [payload.roadmap_item, payload.playbook].filter(Boolean).length
        ? `治理锚点 ${[payload.roadmap_item, payload.playbook].filter(Boolean).length}`
        : `承接页 ${protocolBacklog.pageItems.length}`,
      handoff: `对象去 ${governanceTarget}，任务去 TaskCenter，把协议问题沉成治理项或明确执行动作。`,
      statusTone: payload.roadmap_item || payload.playbook || protocolBacklog.pageItems.length ? 'degraded' : 'online',
    },
  ]), [
    assetsTarget,
    governanceTarget,
    payload.commands.length,
    payload.playbook,
    payload.roadmap_item,
    payload.summary.ready_layers,
    payload.summary.recent_runs,
    protocolBacklog.activeRunCount,
    protocolBacklog.pageItems.length,
    protocolBacklog.watchCount,
    protocolSurfaces,
    workflowTarget,
  ]);

  const normalizedProtocolQuery = protocolQuery.trim().toLowerCase();
  const protocolObjectMatches = (values: Array<string | null | undefined>) => (
    !normalizedProtocolQuery || values.some((value) => value?.toLowerCase().includes(normalizedProtocolQuery))
  );
  const filteredProtocolClosureRows = protocolClosureRows.filter((row) => {
    const matchesStatus = protocolStatusFilter === 'all'
      || (protocolStatusFilter === 'watch' && row.statusTone === 'degraded')
      || (protocolStatusFilter === 'ready' && row.statusTone === 'online');
    return matchesStatus && protocolObjectMatches([row.title, row.summary, row.signal, row.handoff]);
  });
  const filteredProtocolLayers = payload.layers.filter((layer) => {
    const matchesStatus = protocolStatusFilter === 'all' || layer.status === protocolStatusFilter;
    return matchesStatus && protocolObjectMatches([layer.id, layer.title, layer.role, layer.next_action, ...layer.facts]);
  });
  const filteredProtocolWorkflows = payload.recent_workflows.filter((workflow) => (
    (protocolStatusFilter === 'all' || workflow.status === protocolStatusFilter)
      && protocolObjectMatches([workflow.id, workflow.task, workflow.status])
  ));
  const filteredProtocolCommands = payload.commands.filter((command) => (
    protocolStatusFilter === 'all' && protocolObjectMatches([command.id, command.label, command.value, command.detail])
  ));
  const filteredProtocolPages = payload.related_pages.filter((page) => (
    protocolStatusFilter === 'all' && protocolObjectMatches([page.id, page.title, page.reason])
  ));
  const hasProtocolFilter = Boolean(normalizedProtocolQuery) || protocolStatusFilter !== 'all';

  const focusedProtocolCard = useMemo(() => {
    const matchedCommand = payload.commands.find((command) => (
      matchesProtocolFocusQuery([command.id, command.label, command.detail, command.value], focusTaskQuery)
    ));
    if (matchedCommand) {
      return {
        kicker: '待补证据命令',
        title: matchedCommand.label,
        detail: matchedCommand.detail,
        objectTarget: { tab: 'Protocol', taskQuery: matchedCommand.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedCommand.id },
      };
    }

    const matchedLayer = payload.layers.find((layer) => (
      matchesProtocolFocusQuery([layer.id, layer.title, layer.role, layer.next_action, ...layer.facts], focusTaskQuery)
    ));
    if (matchedLayer) {
      return {
        kicker: '待排查协议层',
        title: matchedLayer.title,
        detail: matchedLayer.next_action,
        objectTarget: { tab: matchedLayer.status === 'ready' ? workflowTarget : assetsTarget, taskQuery: matchedLayer.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedLayer.id },
      };
    }

    const matchedWorkflow = payload.recent_workflows.find((workflow) => (
      matchesProtocolFocusQuery([workflow.id, workflow.task, workflow.status], focusTaskQuery)
    ));
    if (matchedWorkflow) {
      return {
        kicker: '最近编排记录',
        title: matchedWorkflow.task,
        detail: `${matchedWorkflow.id} · ${shortTime(matchedWorkflow.updated_at)}`,
        objectTarget: { tab: workflowTarget, taskQuery: matchedWorkflow.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedWorkflow.id },
      };
    }

    const matchedPage = payload.related_pages.find((page) => (
      matchesProtocolFocusQuery([page.id, page.title, page.reason], focusTaskQuery)
    ));
    if (matchedPage) {
      return {
        kicker: '承接页面',
        title: matchedPage.title,
        detail: matchedPage.reason,
        objectTarget: { tab: matchedPage.id, taskQuery: matchedPage.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedPage.id },
      };
    }

    if (payload.roadmap_item && matchesProtocolFocusQuery([
      payload.roadmap_item.id,
      payload.roadmap_item.title,
      payload.roadmap_item.priority,
      payload.roadmap_item.problem,
    ], focusTaskQuery)) {
      return {
        kicker: '路线图焦点',
        title: payload.roadmap_item.title || '协议路线图项',
        detail: payload.roadmap_item.problem || '继续推进协议层补位。',
        objectTarget: { tab: governanceTarget, taskQuery: payload.roadmap_item.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: payload.roadmap_item.id },
      };
    }

    if (payload.playbook && matchesProtocolFocusQuery([
      payload.playbook.id,
      payload.playbook.title,
      payload.playbook.goal,
    ], focusTaskQuery)) {
      return {
        kicker: '巡检清单',
        title: payload.playbook.title || '协议层完整性检查',
        detail: payload.playbook.goal || '继续按固定路径巡检协议层。',
        objectTarget: { tab: 'SystemMap', taskQuery: payload.playbook.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: payload.playbook.id },
      };
    }

    if (focusPageId === 'Protocol') {
      return {
        kicker: '当前页面',
        title: '协议工作台',
        detail: '这页负责把 ecos、workflow、model-driven 和治理写回串成一个能巡检、能补证、能跳转的入口。',
        objectTarget: { tab: 'SystemMap', pageId: 'Protocol' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Protocol' },
      };
    }

    return null;
  }, [
    activeProtocolSurfaceId,
    assetsTarget,
    focusPageId,
    focusTaskQuery,
    governanceTarget,
    payload.commands,
    payload.layers,
    payload.playbook,
    payload.recent_workflows,
    payload.related_pages,
    payload.roadmap_item,
    workflowTarget,
  ]);

  const protocolTaskDraft = useMemo(() => {
    const focusLabel = focusTaskQuery || activeProtocolSurface.title;
    const title = `补齐协议承接：${activeProtocolSurface.title}`;
    const description = `把 ${focusLabel} 对应的问题从协议页继续送往 ${activeProtocolSurface.objectTarget.tab} 和任务中心，不要停在命令或定义展示。`;
    const checklist = [
      `先在 ${activeProtocolSurface.title} 确认当前问题卡在定义、运行、证据还是治理收口`,
      `把关联对象带到 ${activeProtocolSurface.objectTarget.tab} 继续验证或补证`,
      '把下一步动作送进任务中心，保证协议问题可以追踪、复盘、继续执行',
    ];
    const copyTextValue = [
      `标题: ${title}`,
      `焦点对象: ${focusLabel}`,
      `协议子面板: ${activeProtocolSurface.title}`,
      `任务描述: ${description}`,
      '建议动作:',
      ...checklist.map((item, index) => `${index + 1}. ${item}`),
      '验收标准:',
      `- ${activeProtocolSurface.title} 不再只是查看入口，而有明确对象与任务承接`,
      `- ${activeProtocolSurface.objectTarget.tab} 与 TaskCenter 至少有一条明确跳转链`,
      '- 当前协议问题已经沉成可继续推进的正式动作',
    ].join('\n');

    return {
      title,
      description,
      checklist,
      copyText: copyTextValue,
      objectTarget: activeProtocolSurface.objectTarget,
      taskTarget: activeProtocolSurface.taskTarget,
    };
  }, [activeProtocolSurface, focusTaskQuery]);

  const createProtocolTask = async () => {
    setProtocolTaskPending(true);
    setProtocolTaskError(null);
    setProtocolDraftNotice(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: protocolTaskDraft.title,
          description: protocolTaskDraft.description,
          priority: 'high',
          risk_level: 'L1',
          evidence_required: ['协议定义或元模型快照', '工作流运行证据', '桥接或治理处理结果', 'task closeout'],
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '协议任务登记失败');
      setProtocolDraftNotice(`已登记协议治理任务：${payload.title || protocolTaskDraft.title}`);
      if (payload.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: payload.id }, onNavigate, onOpenTarget);
    } catch (taskError) {
      setProtocolTaskError(taskError instanceof Error ? taskError.message : '协议任务登记失败');
    } finally {
      setProtocolTaskPending(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取 ecos、model-driven、workflow 和治理桥接状态...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>协议与元模型操作面</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              以前这些能力散在 `Assets`、`SystemMap` 和命令行里，现在把它们拉回一个能巡检、能跳转、能复制命令的入口。
            </p>
          </div>
          <button className="antd-btn" onClick={() => {
            setRefreshing(true);
            void load();
          }}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>
        </div>

        <div className="stats-grid">
          {[
            ['workflow 定义', payload.summary.workflow_definitions, <Layers key="layers" size={20} />],
            ['actions', payload.summary.workflow_actions, <Route key="route" size={20} />],
            ['backends', payload.summary.workflow_backends, <GitBranch key="branch" size={20} />],
            ['页面成熟度', `${payload.summary.page_score}%`, <ShieldAlert key="shield" size={20} />],
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

        {(payload.roadmap_item || payload.playbook) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {payload.roadmap_item && (
              <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
                <span className="status-badge degraded">{payload.roadmap_item.priority || 'P?'}</span>
                <h3 style={{ margin: '10px 0 8px', fontSize: 15 }}>{payload.roadmap_item.title || '路线图项'}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{payload.roadmap_item.problem || '协议层演进项。'}</p>
              </article>
            )}
            {payload.playbook && (
              <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
                <span className="status-badge online">巡检清单</span>
                <h3 style={{ margin: '10px 0 8px', fontSize: 15 }}>{payload.playbook.title || '协议层完整性检查'}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{payload.playbook.goal || '用固定路径巡检协议层。'}</p>
              </article>
            )}
          </div>
        )}
      </section>

      {focusedProtocolCard && (
        <section className="services-section overview-ops-panel" aria-label="当前协议承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前协议承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成协议层下一跳。
              </p>
            </div>
            <span className="status-badge online">{focusedProtocolCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedProtocolCard.title}</strong>
              <p>{focusedProtocolCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开协议焦点对象 ${focusedProtocolCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedProtocolCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <ClipboardCheck size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开协议焦点任务 ${focusedProtocolCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedProtocolCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" aria-label="协议维度地图">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>协议维度地图</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              把协议面的桥接层、最近编排、补证命令和治理收口直接摆出来，减少只看到定义却不知道下一步去哪的断层。
            </p>
          </div>
          <span className="status-badge online">4 个子面板</span>
        </div>
        <div
          role="region"
          aria-label="协议对象筛选"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '14px 0 16px' }}
        >
          <Search size={16} className="text-muted" aria-hidden="true" />
          <input
            type="search"
            className="antd-input"
            aria-label="搜索协议对象"
            placeholder="层、工作流、命令或承接页面"
            value={protocolQuery}
            onChange={(event) => setProtocolQuery(event.target.value)}
            style={{ minWidth: 260, flex: '1 1 280px' }}
          />
          <select
            className="antd-input"
            aria-label="按协议状态筛选"
            value={protocolStatusFilter}
            onChange={(event) => setProtocolStatusFilter(event.target.value)}
            style={{ minWidth: 150, flex: '0 1 180px' }}
          >
            <option value="all">全部协议对象</option>
            <option value="watch">观察层</option>
            <option value="ready">就绪层</option>
            <option value="running">运行中</option>
            <option value="completed">已完成</option>
          </select>
          {hasProtocolFilter && (
            <button
              type="button"
              className="antd-btn"
              aria-label="清除协议对象筛选"
              onClick={() => { setProtocolQuery(''); setProtocolStatusFilter('all'); }}
            >
              <X size={14} />
              <span>清除</span>
            </button>
          )}
          <span className="text-muted" style={{ fontSize: 12 }}>
            闭环 {filteredProtocolClosureRows.length}/{protocolClosureRows.length} · 层 {filteredProtocolLayers.length}/{payload.layers.length} · 编排 {filteredProtocolWorkflows.length}/{payload.recent_workflows.length}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {protocolSurfaces.map((surface) => (
            <article key={surface.id} className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <small className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{surface.id}</small>
                <strong style={{ fontSize: 15 }}>{surface.title}</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{surface.summary}</p>
              </div>
              <div style={{ minHeight: 54, padding: '10px 12px', borderRadius: 'var(--antd-radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <small className="text-muted" style={{ display: 'block', marginBottom: 4 }}>怎么用</small>
                <span style={{ fontSize: 12, lineHeight: 1.6 }}>{surface.detail}</span>
              </div>
              <button
                type="button"
                className="antd-btn small"
                aria-label={`切换协议子面板 ${surface.title}`}
                onClick={() => setActiveProtocolSurfaceId(surface.id)}
              >
                <Route size={13} />
                <span>{surface.id === activeProtocolSurfaceId ? '当前查看' : '切到此层'}</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section" role="region" aria-label="当前协议子面板">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>当前协议子面板</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              先确认当前正在看的协议层，再把相关对象和任务送到真正的承接页。
            </p>
          </div>
          <span className="status-badge degraded">{activeProtocolSurface.title}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{activeProtocolSurface.title}</strong>
              <p>{activeProtocolSurface.detail}</p>
            </div>
          </article>
          <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <strong style={{ fontSize: 15 }}>相关去向</strong>
              <small className="text-muted">这层最常见的对象承接与任务收口。</small>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开协议相关对象 ${activeProtocolSurface.title}`}
                onClick={() => openCockpitNavigationTarget(activeProtocolSurface.objectTarget, onNavigate, onOpenTarget)}
              >
                <ClipboardCheck size={14} />
                <span>打开相关对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开协议相关任务 ${activeProtocolSurface.title}`}
                onClick={() => openCockpitNavigationTarget(activeProtocolSurface.taskTarget, onNavigate, onOpenTarget)}
              >
                <GitBranch size={14} />
                <span>打开承接任务</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="services-section" role="region" aria-label="协议闭环总表">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>协议闭环总表</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              把每个协议子面板的当前信号、对象承接和任务收口并排摆出来，避免知道问题在哪，却不知道下一跳该落哪。
            </p>
          </div>
          <span className="status-badge online">{protocolClosureRows.length} 条路由</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredProtocolClosureRows.length === 0 ? (
            <div className="antd-card" style={{ padding: 18, textAlign: 'center' }}>
              <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的协议闭环对象。</p>
            </div>
          ) : filteredProtocolClosureRows.map((row) => (
            <article
              key={`protocol-closure-${row.id}`}
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
                <small className="text-muted">承接路径</small>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.handoff}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开协议闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开协议闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section" role="region" aria-label="协议补位任务">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>协议补位任务</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              把当前协议层直接翻成一条可复制、可送往任务中心的补位动作，避免协议面停在浏览或抄命令状态。
            </p>
          </div>
          <span className="status-badge degraded">草稿就绪</span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{protocolTaskDraft.title}</strong>
            <p>{protocolTaskDraft.description}</p>
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {protocolTaskDraft.checklist.map((item, index) => (
                <small key={`${protocolTaskDraft.title}-${index}`} className="text-muted">{index + 1}. {item}</small>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="antd-btn"
              disabled={protocolTaskPending}
              aria-label={`登记协议治理任务 ${protocolTaskDraft.title}`}
              onClick={() => { void createProtocolTask(); }}
            >
              <ShieldAlert size={14} />
              <span>{protocolTaskPending ? '登记中...' : '登记正式任务'}</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`复制协议补位任务 ${protocolTaskDraft.title}`}
              onClick={async () => {
                await copyText(protocolTaskDraft.copyText);
                setProtocolDraftNotice(`已复制协议补位任务：${protocolTaskDraft.title}`);
              }}
            >
              <Copy size={14} />
              <span>复制补位任务</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开协议补位对象 ${protocolTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(protocolTaskDraft.objectTarget, onNavigate, onOpenTarget)}
            >
              <Layers size={14} />
              <span>打开相关对象</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开协议补位任务 ${protocolTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(protocolTaskDraft.taskTarget, onNavigate, onOpenTarget)}
            >
              <Route size={14} />
              <span>送进任务中心</span>
            </button>
          </div>
        </article>
        {protocolDraftNotice && (
          <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{protocolDraftNotice}</p>
        )}
        {protocolTaskError && (
          <p role="alert" className="text-danger" style={{ margin: 0, fontSize: 12 }}>{protocolTaskError}</p>
        )}
      </section>

      <ActionSurfacePanel
        title="协议处理区"
        subtitle="先复制检查命令，再跳去相关页面看资产、编排和治理写回。"
        statusText={payload.summary.ready_layers ? `${payload.summary.ready_layers} 层就绪` : '等待层级数据'}
        items={actionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <EcosWorkflowWorkbench onOpenTarget={onOpenTarget} />

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>协议层桥</h2>
            <p className="text-muted">从 ecos 的 MOF 到 model-driven，再到 workflow 与治理写回，这几层要同时成立才算真能用。</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {filteredProtocolLayers.length === 0 ? (
            <div className="antd-card" style={{ padding: 18, textAlign: 'center' }}>
              <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的协议层。</p>
            </div>
          ) : filteredProtocolLayers.map((layer) => (
            <article key={layer.id} className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15 }}>{layer.title}</h3>
                  <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{layer.role}</p>
                </div>
                <span className={`status-badge ${layer.status === 'ready' ? 'online' : 'degraded'}`}>{statusLabel(layer.status)}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--antd-text-secondary)' }}>
                {layer.facts.map((fact) => (
                  <li key={`${layer.id}-${fact}`}>{fact}</li>
                ))}
              </ul>
              <p style={{ margin: 0, fontSize: 13 }}>{layer.next_action}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>最近编排记录</h2>
            <p className="text-muted">协议层不是只看定义，最近 workflow 记录能证明它到底有没有被实际承接。</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {payload.recent_workflows.length === 0 ? (
            <div className="antd-card" style={{ padding: 18 }}>
              <p className="text-muted" style={{ margin: 0 }}>还没有最近 workflow 记录，先跑一条受控检查命令补证据。</p>
            </div>
          ) : filteredProtocolWorkflows.length === 0 ? (
            <div className="antd-card" style={{ padding: 18 }}>
              <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的最近编排记录。</p>
            </div>
          ) : filteredProtocolWorkflows.map((workflow) => (
            <article key={workflow.id} className="antd-card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
              <div>
                <strong>{workflow.task}</strong>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{workflow.id} · {shortTime(workflow.updated_at)}</p>
              </div>
              <span className={`status-badge ${workflow.status === 'running' ? 'degraded' : workflow.status === 'completed' ? 'online' : 'offline'}`}>
                {workflow.status}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>协议补证与承接</h2>
            <p className="text-muted">把待排查层、待补证据和承接页面放在一起，协议面才算能真正驱动执行。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">观察层 {protocolBacklog.watchCount}</span>
            <span className="status-badge degraded">未闭环运行 {protocolBacklog.activeRunCount}</span>
            <span className="status-badge online">承接页 {protocolBacklog.pageItems.length}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>待排查协议层</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先抓观察层，没有观察层时也给出当前最关键的一层入口。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.(workflowTarget)}>
                <Route size={14} />
                <span>看工作流页</span>
              </button>
            </div>
            {protocolBacklog.layerItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>暂无协议层数据。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {protocolBacklog.layerItems.map((layer) => (
                  <button
                    key={`layer-${layer.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`排查协议层 ${layer.title}`}
                    onClick={() => onNavigate?.(layer.status === 'ready' ? workflowTarget : assetsTarget)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{layer.title}</strong>
                      <p>{layer.next_action}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {statusLabel(layer.status)} · {layer.facts[0] || layer.role}
                      </span>
                    </div>
                    <Layers size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>待补证据</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>命令先复制，运行状态再回看，别让协议页只停在“看定义”。</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {filteredProtocolCommands.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的补证命令。</p>
              ) : filteredProtocolCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  className="action-surface-item"
                  onClick={() => void copyText(command.value)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{command.label}</strong>
                    <p>{command.detail}</p>
                    <code style={{ fontSize: 12, color: 'var(--antd-primary)' }}>{command.value}</code>
                  </div>
                  <Copy size={14} />
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {protocolBacklog.activeRuns.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>最近运行都已闭环，继续按清单巡检即可。</p>
              ) : protocolBacklog.activeRuns.map((workflow) => (
                <div key={`run-${workflow.id}`} className="action-surface-item" style={{ alignItems: 'center' }}>
                  <div>
                    <strong>{workflow.task}</strong>
                    <p>{workflow.id} · {shortTime(workflow.updated_at)}</p>
                  </div>
                  <span className={`status-badge ${workflow.status === 'running' ? 'degraded' : 'offline'}`}>{workflow.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>承接页面与路线</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>协议层问题最后都要落到页面、路线图和治理面上。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.(governanceTarget)}>
                <ClipboardCheck size={14} />
                <span>看治理面</span>
              </button>
            </div>

            {(payload.roadmap_item || payload.playbook) && (
              <div style={{ display: 'grid', gap: 10 }}>
                {payload.roadmap_item && (
                  <div className="action-surface-item">
                    <div>
                      <strong>{payload.roadmap_item.title || '路线图项'}</strong>
                      <p>{payload.roadmap_item.problem || '需要继续推进协议层收口。'}</p>
                    </div>
                    <span className="status-badge degraded">{payload.roadmap_item.priority || 'P?'}</span>
                  </div>
                )}
                {payload.playbook && (
                  <div className="action-surface-item">
                    <div>
                      <strong>{payload.playbook.title || '巡检清单'}</strong>
                      <p>{payload.playbook.goal || '保持协议层巡检节奏。'}</p>
                    </div>
                    <span className="status-badge online">Playbook</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              {filteredProtocolPages.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的承接页面。</p>
              ) : filteredProtocolPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="action-surface-item"
                  aria-label={`查看承接页面 ${page.title}`}
                  onClick={() => onNavigate?.(page.id)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{page.title}</strong>
                    <p>{page.reason}</p>
                  </div>
                  <ClipboardCheck size={14} />
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
