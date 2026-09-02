import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, GitBranch, Layers, RefreshCw, Route, Search, ShieldAlert, X } from 'lucide-react';
import '../Dashboard.css';
import ActionSurfacePanel from '../ActionSurfacePanel';
import EcosWorkflowWorkbench from '../EcosWorkflowWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';
import { useProtocolWorkbenchData } from './useProtocolWorkbenchData';
import { ProtocolSurfaceCards } from './ProtocolSurfaceCards';
import { ProtocolClosureTable } from './ProtocolClosureTable';
import { ProtocolLayerBridge } from './ProtocolLayerBridge';
import { ProtocolEvidenceSection } from './ProtocolEvidenceSection';
import ProtocolDetail from './ProtocolDetail';
import ProtocolEditor from './ProtocolEditor';
import ProtocolList from './ProtocolList';
import {
  type ProtocolClosureRow,
  type ProtocolPayload,
  type ProtocolSurfaceCard,
  type ProtocolSurfaceId,
} from './types';
import { copyText, inferProtocolSurface, matchesProtocolFocusQuery, shortTime } from './utils';

interface ProtocolWorkbenchViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

export default function ProtocolWorkbenchView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: ProtocolWorkbenchViewProps) {
  const data = useProtocolWorkbenchData(onNavigate, onOpenTarget);

  const assetsTarget = useMemo(() => (
    data.payload.related_pages.find((page) => /assets|资产/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Assets'
  ), [data.payload.related_pages]);

  const workflowTarget = useMemo(() => (
    data.payload.related_pages.find((page) => /workflow|编排/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Workflows'
  ), [data.payload.related_pages]);

  const governanceTarget = useMemo(() => (
    data.payload.related_pages.find((page) => /systemmap|system map|overview|task|治理|总览/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'SystemMap'
  ), [data.payload.related_pages]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveProtocolSurfaceId(inferredProtocolSurface);
  }, [inferredProtocolSurface]);

  const activeProtocolSurface = useMemo(
    () => protocolSurfaces.find((surface) => surface.id === activeProtocolSurfaceId) || protocolSurfaces[0],
    [activeProtocolSurfaceId, protocolSurfaces],
  );

  const protocolBacklog = useMemo(() => {
    const watchLayers = data.payload.layers.filter((layer) => layer.status !== 'ready');
    const activeRuns = data.payload.recent_workflows.filter((workflow) => workflow.status !== 'completed');
    return {
      watchCount: watchLayers.length,
      activeRunCount: activeRuns.length,
      layerItems: (watchLayers.length ? watchLayers : data.payload.layers).slice(0, 3),
      activeRuns: activeRuns.slice(0, 3),
      pageItems: data.payload.related_pages.slice(0, 3),
    };
  }, [data.payload.layers, data.payload.recent_workflows, data.payload.related_pages]);

  const protocolClosureRows = useMemo<ProtocolClosureRow[]>(() => ([
    {
      ...protocolSurfaces[0],
      signal: protocolBacklog.watchCount ? `观察层 ${protocolBacklog.watchCount}` : `就绪层 ${data.payload.summary.ready_layers}`,
      handoff: `对象去 ${assetsTarget}，任务去 TaskCenter，先把桥接层卡点定位清楚。`,
      statusTone: protocolBacklog.watchCount ? 'degraded' : 'online',
    },
    {
      ...protocolSurfaces[1],
      signal: protocolBacklog.activeRunCount ? `未闭环运行 ${protocolBacklog.activeRunCount}` : `最近运行 ${data.payload.summary.recent_runs}`,
      handoff: `对象去 ${workflowTarget}，任务去 TaskCenter，确认 workflow 是真跑过还是只挂在定义里。`,
      statusTone: protocolBacklog.activeRunCount ? 'degraded' : 'online',
    },
    {
      ...protocolSurfaces[2],
      signal: data.payload.commands.length ? `补证命令 ${data.payload.commands.length}` : '暂无补证命令',
      handoff: '先复制检查命令，再把补证动作送进 TaskCenter，避免协议页停在浏览层。',
      statusTone: data.payload.commands.length ? 'degraded' : 'online',
    },
    {
      ...protocolSurfaces[3],
      signal: [data.payload.roadmap_item, data.payload.playbook].filter(Boolean).length
        ? `治理锚点 ${[data.payload.roadmap_item, data.payload.playbook].filter(Boolean).length}`
        : `承接页 ${protocolBacklog.pageItems.length}`,
      handoff: `对象去 ${governanceTarget}，任务去 TaskCenter，把协议问题沉成治理项或明确执行动作。`,
      statusTone: data.payload.roadmap_item || data.payload.playbook || protocolBacklog.pageItems.length ? 'degraded' : 'online',
    },
  ]), [
    assetsTarget,
    governanceTarget,
    data.payload.commands.length,
    data.payload.playbook,
    data.payload.roadmap_item,
    data.payload.summary.ready_layers,
    data.payload.summary.recent_runs,
    protocolBacklog.activeRunCount,
    protocolBacklog.pageItems.length,
    protocolBacklog.watchCount,
    protocolSurfaces,
    workflowTarget,
  ]);

  const normalizedProtocolQuery = data.protocolQuery.trim().toLowerCase();
  const protocolObjectMatches = (values: Array<string | null | undefined>) => (
    !normalizedProtocolQuery || values.some((value) => value?.toLowerCase().includes(normalizedProtocolQuery))
  );
  const filteredProtocolClosureRows = protocolClosureRows.filter((row) => {
    const matchesStatus = data.protocolStatusFilter === 'all'
      || (data.protocolStatusFilter === 'watch' && row.statusTone === 'degraded')
      || (data.protocolStatusFilter === 'ready' && row.statusTone === 'online');
    return matchesStatus && protocolObjectMatches([row.title, row.summary, row.signal, row.handoff]);
  });
  const filteredProtocolLayers = data.payload.layers.filter((layer) => {
    const matchesStatus = data.protocolStatusFilter === 'all' || layer.status === data.protocolStatusFilter;
    return matchesStatus && protocolObjectMatches([layer.id, layer.title, layer.role, layer.next_action, ...layer.facts]);
  });
  const filteredProtocolWorkflows = data.payload.recent_workflows.filter((workflow) => (
    (data.protocolStatusFilter === 'all' || workflow.status === data.protocolStatusFilter)
      && protocolObjectMatches([workflow.id, workflow.task, workflow.status])
  ));
  const filteredProtocolCommands = data.payload.commands.filter((command) => (
    data.protocolStatusFilter === 'all' && protocolObjectMatches([command.id, command.label, command.value, command.detail])
  ));
  const filteredProtocolPages = data.payload.related_pages.filter((page) => (
    data.protocolStatusFilter === 'all' && protocolObjectMatches([page.id, page.title, page.reason])
  ));
  const hasProtocolFilter = Boolean(normalizedProtocolQuery) || data.protocolStatusFilter !== 'all';

  const focusedProtocolCard = useMemo(() => {
    const matchedCommand = data.payload.commands.find((command) => (
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

    const matchedLayer = data.payload.layers.find((layer) => (
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

    const matchedWorkflow = data.payload.recent_workflows.find((workflow) => (
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

    const matchedPage = data.payload.related_pages.find((page) => (
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

    if (data.payload.roadmap_item && matchesProtocolFocusQuery([
      data.payload.roadmap_item.id,
      data.payload.roadmap_item.title,
      data.payload.roadmap_item.priority,
      data.payload.roadmap_item.problem,
    ], focusTaskQuery)) {
      return {
        kicker: '路线图焦点',
        title: data.payload.roadmap_item.title || '协议路线图项',
        detail: data.payload.roadmap_item.problem || '继续推进协议层补位。',
        objectTarget: { tab: governanceTarget, taskQuery: data.payload.roadmap_item.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: data.payload.roadmap_item.id },
      };
    }

    if (data.payload.playbook && matchesProtocolFocusQuery([
      data.payload.playbook.id,
      data.payload.playbook.title,
      data.payload.playbook.goal,
    ], focusTaskQuery)) {
      return {
        kicker: '巡检清单',
        title: data.payload.playbook.title || '协议层完整性检查',
        detail: data.payload.playbook.goal || '继续按固定路径巡检协议层。',
        objectTarget: { tab: 'SystemMap', taskQuery: data.payload.playbook.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: data.payload.playbook.id },
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
    assetsTarget,
    focusPageId,
    focusTaskQuery,
    governanceTarget,
    data.payload.commands,
    data.payload.layers,
    data.payload.playbook,
    data.payload.recent_workflows,
    data.payload.related_pages,
    data.payload.roadmap_item,
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

  const actionItems = useMemo(() => {
    const commandItems = data.payload.commands.slice(0, 2).map((command) => ({
      id: command.id,
      title: command.label,
      detail: command.detail,
      actionLabel: '复制命令',
      actionType: 'copy' as const,
      actionValue: command.value,
    }));
    const pageItems = data.payload.related_pages.slice(0, 2).map((page) => ({
      id: `page-${page.id}`,
      title: page.title,
      detail: page.reason,
      actionLabel: '进入页面',
      actionType: 'navigate' as const,
      actionValue: page.id,
      actionTarget: { tab: page.id, taskQuery: focusTaskQuery || 'Protocol' },
    }));
    return [...commandItems, ...pageItems];
  }, [focusTaskQuery, data.payload.commands, data.payload.related_pages]);

  if (data.loading) {
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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            data.load();
          }}>
            <RefreshCw size={14} className={data.refreshing ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>
        </div>

        {data.sourceError && (
          <div className="overview-inline-error" role="alert">
            <AlertTriangle size={16} />
            <div>
              <strong>协议证据不完整</strong>
              <span>{data.sourceError}，当前空状态不代表协议层没有能力。</span>
            </div>
            <button type="button" className="antd-btn" onClick={() => { data.load(); }}>重试</button>
          </div>
        )}

        <div className="stats-grid">
          {[
            ['workflow 定义', data.payload.summary.workflow_definitions, <Layers key="layers" size={20} />],
            ['actions', data.payload.summary.workflow_actions, <Route key="route" size={20} />],
            ['backends', data.payload.summary.workflow_backends, <GitBranch key="branch" size={20} />],
            ['页面成熟度', `${data.payload.summary.page_score}%`, <ShieldAlert key="shield" size={20} />],
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

        {(data.payload.roadmap_item || data.payload.playbook) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {data.payload.roadmap_item && (
              <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
                <span className="status-badge degraded">{data.payload.roadmap_item.priority || 'P?'}</span>
                <h3 style={{ margin: '10px 0 8px', fontSize: 15 }}>{data.payload.roadmap_item.title || '路线图项'}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{data.payload.roadmap_item.problem || '协议层演进项。'}</p>
              </article>
            )}
            {data.payload.playbook && (
              <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
                <span className="status-badge online">巡检清单</span>
                <h3 style={{ margin: '10px 0 8px', fontSize: 15 }}>{data.payload.playbook.title || '协议层完整性检查'}</h3>
                <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{data.payload.playbook.goal || '用固定路径巡检协议层。'}</p>
              </article>
            )}
          </div>
        )}
      </section>

      <ProtocolDetail
        card={focusedProtocolCard}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

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
            value={data.protocolQuery}
            onChange={(event) => data.setProtocolQuery(event.target.value)}
            style={{ minWidth: 260, flex: '1 1 280px' }}
          />
          <select
            className="antd-input"
            aria-label="按协议状态筛选"
            value={data.protocolStatusFilter}
            onChange={(event) => data.setProtocolStatusFilter(event.target.value)}
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
              onClick={() => { data.setProtocolQuery(''); data.setProtocolStatusFilter('all'); }}
            >
              <X size={14} />
              <span>清除</span>
            </button>
          )}
          <span className="text-muted" style={{ fontSize: 12 }}>
            闭环 {filteredProtocolClosureRows.length}/{protocolClosureRows.length} · 层 {filteredProtocolLayers.length}/{data.payload.layers.length} · 编排 {filteredProtocolWorkflows.length}/{data.payload.recent_workflows.length}
          </span>
        </div>
        <ProtocolSurfaceCards
          surfaces={protocolSurfaces}
          activeSurfaceId={activeProtocolSurfaceId}
          onSurfaceChange={setActiveProtocolSurfaceId}
        />
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

      <ProtocolClosureTable
        rows={filteredProtocolClosureRows}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <ProtocolEditor
        draft={protocolTaskDraft}
        surfaceTitle={activeProtocolSurface.title}
        surfaceId={activeProtocolSurface.id}
        pending={data.protocolTaskPending}
        notice={data.protocolDraftNotice}
        error={data.protocolTaskError}
        onCreateTask={data.createProtocolTask}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <ActionSurfacePanel
        title="协议处理区"
        subtitle="先复制检查命令，再跳去相关页面看资产、编排和治理写回。"
        statusText={data.payload.summary.ready_layers ? `${data.payload.summary.ready_layers} 层就绪` : '等待层级数据'}
        items={actionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <EcosWorkflowWorkbench onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <ProtocolLayerBridge layers={filteredProtocolLayers} />

      <ProtocolList
        workflows={filteredProtocolWorkflows}
        totalRuns={data.payload.summary.recent_runs}
        hasMore={data.payload.has_more ?? false}
        loadingMore={data.loadingMore}
        onLoadMore={data.load}
      />

      <ProtocolEvidenceSection
        payload={data.payload}
        filteredCommands={filteredProtocolCommands}
        filteredPages={filteredProtocolPages}
        workflowTarget={workflowTarget}
        governanceTarget={governanceTarget}
        assetsTarget={assetsTarget}
        focusTaskQuery={focusTaskQuery}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />
    </div>
  );
}
