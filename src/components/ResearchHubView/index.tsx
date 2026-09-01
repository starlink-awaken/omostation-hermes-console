import React, { useEffect, useMemo } from 'react';
import { AlertTriangle, BookOpen, ClipboardList, Compass, Copy, ExternalLink, GitBranch, RefreshCw, Search } from 'lucide-react';
import '../Dashboard.css';
import ActionSurfacePanel from '../ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';
import { useResearchHubData } from './useResearchHubData';
import { ResearchClosureTable } from './ResearchClosureTable';
import { ResearchDetailPanel } from './ResearchDetailPanel';
import { type ResearchClosureRow, type ResearchItem } from './types';
import { copyText, matchesResearchFocusQuery, shortTime, statusText } from './utils';

interface ResearchHubViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

export default function ResearchHubView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: ResearchHubViewProps) {
  const data = useResearchHubData(onNavigate, onOpenTarget);

  const filteredResearch = useMemo(() => {
    const query = data.researchQuery.trim().toLowerCase();
    return data.payload.recent.filter((item) => {
      if (data.researchStatusFilter !== 'all' && item.status !== data.researchStatusFilter) return false;
      if (!query) return true;
      return [item.id, item.topic, item.summary, item.status, item.agent, item.next_action, ...item.tags]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [data.payload.recent, data.researchQuery, data.researchStatusFilter]);

  useEffect(() => {
    if (!focusTaskQuery) return;
    const matchedResearch = filteredResearch.find((item) => (
      matchesResearchFocusQuery([
        item.id,
        item.topic,
        item.summary,
        item.status,
        item.agent,
        item.next_action,
        item.last_event?.label,
        ...item.tags,
      ], focusTaskQuery)
    ));
    if (matchedResearch && matchedResearch.id !== data.selectedResearchId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void data.openDetail(matchedResearch.id);
    }
  }, [filteredResearch, focusTaskQuery, data.selectedResearchId]);

  useEffect(() => {
    if (data.selectedResearchId !== null && !filteredResearch.some((item) => item.id === data.selectedResearchId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      data.closeDetail();
    }
  }, [filteredResearch, data.selectedResearchId]);

  const actionItems = useMemo(() => {
    const researchContextQuery = data.selectedResearchId ? String(data.selectedResearchId) : focusTaskQuery || 'Research';
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
      actionTarget: { tab: page.id, taskQuery: researchContextQuery },
    }));
    return [...commandItems, ...pageItems];
  }, [focusTaskQuery, data.payload.commands, data.payload.related_pages, data.selectedResearchId]);

  const knowledgeTarget = useMemo(() => (
    data.payload.pipeline.find((step) => /knowledge|知识/i.test(`${step.id} ${step.title}`))?.id
    ?? data.payload.related_pages.find((page) => /knowledge|知识|context/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Knowledge'
  ), [data.payload.pipeline, data.payload.related_pages]);

  const taskTarget = useMemo(() => (
    data.payload.related_pages.find((page) => /task|任务/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'TaskCenter'
  ), [data.payload.related_pages]);

  const publicationTarget = useMemo(() => (
    data.payload.related_pages.find((page) => /overview|概览|发布|strategy|作战|systemmap|system map/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Overview'
  ), [data.payload.related_pages]);

  const researchWorkbench = useMemo(() => {
    const contextCandidates = filteredResearch.filter((item) => item.source_count < 3 || item.tags.length === 0 || !item.agent);
    const taskCandidates = filteredResearch.filter((item) => item.follow_up_count > 0 || /任务|跟进|执行|落地/i.test(item.next_action));
    const publishCandidates = filteredResearch.filter((item) => item.status !== 'archived');

    return {
      contextCount: contextCandidates.length,
      taskCount: taskCandidates.length,
      publishCount: publishCandidates.length,
      contextItems: (contextCandidates.length ? contextCandidates : filteredResearch).slice(0, 3),
      taskItems: (taskCandidates.length ? taskCandidates : filteredResearch).slice(0, 3),
      publishItems: (publishCandidates.length ? publishCandidates : filteredResearch).slice(0, 3),
    };
  }, [filteredResearch]);

  const researchObjectQuery = focusTaskQuery || (filteredResearch[0] ? String(filteredResearch[0].id) : undefined);

  const researchClosureRows = useMemo<ResearchClosureRow[]>(() => {
    const firstRecent = filteredResearch[0];
    const firstContext = researchWorkbench.contextItems[0];
    const firstTask = researchWorkbench.taskItems[0];
    const firstPublish = researchWorkbench.publishItems[0];

    return [
      {
        id: 'detail',
        title: '研究对象详情',
        summary: '先打开研究对象详情，确认正文、时间线、追问和发布证据，再决定往哪一页继续走。',
        signal: firstRecent ? `最近对象 ${firstRecent.topic}` : `活跃研究 ${data.payload.summary.active}`,
        nextAction: firstRecent ? `先打开 ${firstRecent.topic} 的详情，确认它是缺上下文、缺任务还是缺发布回流。` : '先发起一条研究对象，再建立详情承接。',
        statusTone: firstRecent ? 'degraded' : 'online',
        objectTarget: { tab: 'Research', taskQuery: firstRecent ? String(firstRecent.id) : 'Research' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstRecent ? String(firstRecent.id) : 'Research' },
      },
      {
        id: 'context',
        title: '知识补上下文',
        summary: '来源、标签或负责人偏薄时，先回知识页补上下文，让研究对象不再孤立。',
        signal: researchWorkbench.contextCount > 0 ? `待补上下文 ${researchWorkbench.contextCount}` : `知识就绪 ${data.payload.summary.active}`,
        nextAction: firstContext ? `把 ${firstContext.topic} 送去知识页补来源、标签和负责人。` : '当前研究上下文较完整，抽查一条知识承接是否仍然可用。',
        statusTone: researchWorkbench.contextCount > 0 ? 'degraded' : 'online',
        objectTarget: { tab: knowledgeTarget, taskQuery: firstContext ? String(firstContext.id) : 'research-context' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstContext ? String(firstContext.id) : 'research-context' },
      },
      {
        id: 'task',
        title: '研究任务正式收口',
        summary: '有追问和下一步动作的研究对象，不能只停在研究页，需要送进任务中心继续执行。',
        signal: researchWorkbench.taskCount > 0 ? `待落任务 ${researchWorkbench.taskCount}` : `追问总数 ${data.payload.summary.follow_ups}`,
        nextAction: firstTask ? `把 ${firstTask.topic} 的下一步动作送进任务中心，补责任人和验收口。` : '当前没有明显待落任务对象，抽查研究到任务中心的链路是否还通。',
        statusTone: researchWorkbench.taskCount > 0 ? 'degraded' : 'online',
        objectTarget: { tab: taskTarget, taskQuery: firstTask ? String(firstTask.id) : 'research-task' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstTask ? String(firstTask.id) : 'research-task' },
      },
      {
        id: 'publish',
        title: '发布回流与复盘',
        summary: '研究做完不是结束，还要回到发布/概览面完成回流、复盘和下一轮动作沉淀。',
        signal: researchWorkbench.publishCount > 0 ? `待发布回流 ${researchWorkbench.publishCount}` : `已发布 ${data.payload.summary.published}`,
        nextAction: firstPublish ? `从 ${firstPublish.topic} 开始，回发布面做回流和复盘。` : '当前没有待发布对象，抽查已发布研究的回流是否完整。',
        statusTone: researchWorkbench.publishCount > 0 ? 'degraded' : 'online',
        objectTarget: { tab: publicationTarget, taskQuery: firstPublish ? String(firstPublish.id) : 'research-publish' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstPublish ? String(firstPublish.id) : 'research-publish' },
      },
    ];
  }, [
    knowledgeTarget,
    filteredResearch,
    data.payload.summary.active,
    data.payload.summary.follow_ups,
    data.payload.summary.published,
    publicationTarget,
    researchWorkbench.contextCount,
    researchWorkbench.contextItems,
    researchWorkbench.publishCount,
    researchWorkbench.publishItems,
    researchWorkbench.taskCount,
    researchWorkbench.taskItems,
    taskTarget,
  ]);

  const focusedResearchCard = useMemo(() => {
    const matchedResearch = filteredResearch.find((item) => (
      matchesResearchFocusQuery([
        item.id,
        item.topic,
        item.summary,
        item.status,
        item.agent,
        item.next_action,
        item.last_event?.label,
        ...item.tags,
      ], focusTaskQuery)
    ));
    if (matchedResearch) {
      return {
        kicker: '研究对象',
        title: matchedResearch.topic,
        detail: matchedResearch.summary || matchedResearch.next_action,
        objectTarget: { tab: 'Research', taskQuery: String(matchedResearch.id) },
        taskTarget: { tab: 'TaskCenter', taskQuery: String(matchedResearch.id) },
      };
    }

    const matchedCommand = data.payload.commands.find((command) => (
      matchesResearchFocusQuery([command.id, command.label, command.value, command.detail], focusTaskQuery)
    ));
    if (matchedCommand) {
      return {
        kicker: '研究命令',
        title: matchedCommand.label,
        detail: matchedCommand.detail,
        objectTarget: { tab: 'Research', taskQuery: matchedCommand.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedCommand.id },
      };
    }

    const matchedPage = data.payload.related_pages.find((page) => (
      matchesResearchFocusQuery([page.id, page.title, page.reason], focusTaskQuery)
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

    const matchedClosure = researchClosureRows.find((row) => (
      matchesResearchFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '研究闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'Research') {
      return {
        kicker: '当前页面',
        title: '研究中枢',
        detail: '这页负责把研究对象、上下文、发布和后续动作收成站内入口，不让研究停在命令和正文里。',
        objectTarget: { tab: 'SystemMap', pageId: 'Research' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Research' },
      };
    }

    return null;
  }, [filteredResearch, focusPageId, focusTaskQuery, data.payload.commands, data.payload.related_pages, researchClosureRows]);

  if (data.loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取研究主旅程、最近研究对象和发布节奏...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>研究主旅程</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              把 `cockpit research` 从 CLI 命令堆，整理成一个能看见对象、上下文、发布和后续动作的站内入口。
            </p>
          </div>
          <button className="antd-btn" onClick={() => {
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
              <strong>研究数据需要补证</strong>
              <span>{data.sourceError}，当前空状态不代表没有研究对象。</span>
            </div>
            <button type="button" className="antd-btn" onClick={() => { data.load(); }}>重试</button>
          </div>
        )}

        <div className="stats-grid">
          {[
            ['活跃研究', data.payload.summary.active, <Search key="search" size={20} />],
            ['已发布', data.payload.summary.published, <BookOpen key="book" size={20} />],
            ['追问总数', data.payload.summary.follow_ups, <GitBranch key="branch" size={20} />],
            ['参与 Agent', data.payload.summary.agents, <Compass key="compass" size={20} />],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="stat-card">
              <div className="stat-icon-wrapper pulse-info">{icon}</div>
              <div className="stat-info">
                <h3>{label}</h3>
                <p className="stat-value">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
          <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>研究到执行链</h3>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>先确认研究对象，再补上下文，最后落任务。</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {data.payload.pipeline.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className="action-surface-item"
                  onClick={() => openCockpitNavigationTarget({ tab: step.id, taskQuery: researchObjectQuery }, onNavigate, onOpenTarget)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{index + 1}. {step.title}</strong>
                    <p>{step.summary}</p>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, background: 'rgba(255,255,255,0.02)' }}>
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>常用命令</h3>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>先复制，再执行，避免靠记忆敲错。</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {data.payload.commands.map((command) => (
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
          </article>
        </div>
      </section>

      <ActionSurfacePanel
        title="研究推进区"
        subtitle="先发起或继续研究，再跳到补材料或落任务的页面。"
        statusText={data.payload.summary.active ? `${data.payload.summary.active} 条活跃研究` : '等待研究对象'}
        items={actionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      {focusedResearchCard && (
        <section className="services-section overview-ops-panel" aria-label="当前研究承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前研究承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成研究面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedResearchCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedResearchCard.title}</strong>
              <p>{focusedResearchCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开研究焦点对象 ${focusedResearchCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedResearchCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Search size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开研究焦点任务 ${focusedResearchCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedResearchCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <GitBranch size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <ResearchClosureTable
        rows={researchClosureRows}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <section className="services-section" role="region" aria-label="研究筛选">
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>研究对象检索</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              同一组条件作用于研究闭环、承接工作台、对象列表和详情焦点，先切片再继续补上下文、落任务或发布回流。
            </p>
          </div>
          <span className="status-badge online">显示 {filteredResearch.length}/{data.payload.summary.total}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="search"
            aria-label="搜索研究对象"
            placeholder="主题、摘要、标签、Agent 或下一步"
            value={data.researchQuery}
            onChange={(event) => data.setResearchQuery(event.target.value)}
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
            aria-label="按状态筛选研究对象"
            value={data.researchStatusFilter}
            onChange={(event) => data.setResearchStatusFilter(event.target.value)}
            style={{
              minWidth: 140,
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
            <option value="active">活跃</option>
            <option value="archived">归档</option>
            <option value="quarantined">隔离</option>
          </select>
          <button
            type="button"
            className="antd-btn"
            aria-label="清除研究筛选"
            onClick={() => { data.setResearchQuery(''); data.setResearchStatusFilter('all'); }}
            disabled={!data.researchQuery && data.researchStatusFilter === 'all'}
          >
            清除
          </button>
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>最近研究对象</h2>
            <p className="text-muted">它们现在处在什么状态、上一次发生了什么，以及下一步应该做什么。</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {filteredResearch.length === 0 ? (
            <div className="antd-card" style={{ padding: 20 }}>
              <p className="text-muted" style={{ margin: 0 }}>{data.payload.recent.length === 0 ? '还没有研究对象，先从"发起研究"那条命令开始。' : '当前筛选下没有匹配的研究对象。'}</p>
            </div>
          ) : filteredResearch.map((item) => (
            <article key={item.id} className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15 }}>{item.topic}</h3>
                  <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{item.summary || '暂无摘要'}</p>
                </div>
                <span className={`status-badge ${item.status === 'active' ? 'online' : item.status === 'archived' ? 'degraded' : 'offline'}`}>
                  {statusText(item.status)}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--antd-text-secondary)' }}>
                <span>来源 {item.source_count}</span>
                <span>追问 {item.follow_up_count}</span>
                <span>Agent {item.agent || '未指定'}</span>
              </div>
              {item.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {item.tags.map((tag) => (
                    <span key={`${item.id}-${tag}`} className="system-map-chip degraded">{tag}</span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--antd-text-secondary)' }}>
                <strong style={{ color: 'var(--antd-text-primary)' }}>{item.last_event?.label || '暂无事件'}</strong>
                <span> · {shortTime(item.last_event?.created_at || item.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13 }}>{item.next_action}</p>
              <button
                type="button"
                className="action-surface-item"
                aria-label={`查看研究详情 ${item.topic}`}
                onClick={() => void data.openDetail(item.id)}
                style={{ width: '100%', justifyContent: 'space-between', marginTop: 2 }}
              >
                <span>查看对象详情</span>
                <ExternalLink size={14} />
              </button>
            </article>
          ))}
        </div>
        {data.payload.has_more && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <button
              type="button"
              className="antd-btn"
              aria-label="加载更多研究对象"
              onClick={() => void data.load(data.payload.recent.length, true)}
              disabled={data.loadingMore}
            >
              {data.loadingMore ? '正在加载...' : `加载更多（已显示 ${data.payload.recent.length}/${data.payload.summary.total}）`}
            </button>
          </div>
        )}
      </section>

      {data.selectedResearchId !== null && (
        <ResearchDetailPanel
          researchDetail={data.researchDetail}
          selectedResearchId={data.selectedResearchId}
          detailLoading={data.detailLoading}
          detailError={data.detailError}
          onClose={data.closeDetail}
        />
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>研究承接工作台</h2>
            <p className="text-muted">先补上下文，再落任务，最后回到发布与复盘，不让研究对象停在半空里。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">待补上下文 {researchWorkbench.contextCount}</span>
            <span className="status-badge degraded">待落任务 {researchWorkbench.taskCount}</span>
            <span className="status-badge online">待发布回流 {researchWorkbench.publishCount}</span>
          </div>
        </div>
        {data.queueError && (
          <div className="overview-inline-error" role="alert" aria-live="polite" style={{ marginBottom: 12 }}>
            <AlertTriangle size={16} />
            <span>研究任务承接失败：{data.queueError}</span>
            <button type="button" className="antd-btn small" onClick={() => data.setQueueError(null)}>关闭</button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>待补上下文</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>标签、来源或负责人偏薄的对象，先补知识上下文。</p>
            </div>
            {researchWorkbench.contextItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>暂无待补位对象。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {researchWorkbench.contextItems.map((item) => (
                  <button
                    key={`context-${item.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`补上下文 ${item.topic}`}
                    onClick={() => openCockpitNavigationTarget({ tab: knowledgeTarget, taskQuery: String(item.id) }, onNavigate, onOpenTarget)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{item.topic}</strong>
                      <p>{item.summary || item.next_action}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        来源 {item.source_count} · 标签 {item.tags.length} · {item.agent ? `Agent ${item.agent}` : '缺少负责人'}
                      </span>
                    </div>
                    <ClipboardList size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>待落任务</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>有追问、有下一步但还没进入执行闭环的对象，直接送去任务中心。</p>
            </div>
            {researchWorkbench.taskItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>暂无待落任务对象。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {researchWorkbench.taskItems.map((item) => (
                  <button
                    key={`task-${item.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`落任务 ${item.topic}`}
                    onClick={() => void data.queueResearchTask(item.id)}
                    disabled={data.queueingResearchId === item.id}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{item.topic}</strong>
                      <p>{item.next_action}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        追问 {item.follow_up_count} · 最近事件 {item.last_event?.label || '暂无'}
                      </span>
                    </div>
                    {data.queueingResearchId === item.id ? <RefreshCw size={14} className="animate-spin" /> : <GitBranch size={14} />}
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>待发布与回流</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先看对象详情，再进入发布/总览面做回流和复盘。</p>
              </div>
              <button
                type="button"
                className="antd-btn"
                onClick={() => openCockpitNavigationTarget({ tab: publicationTarget, taskQuery: researchObjectQuery }, onNavigate, onOpenTarget)}
              >
                <BookOpen size={14} />
                <span>进入发布面</span>
              </button>
            </div>
            {researchWorkbench.publishItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>暂无待发布对象。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {researchWorkbench.publishItems.map((item) => (
                  <button
                    key={`publish-${item.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看发布承接 ${item.topic}`}
                    onClick={() => void data.openDetail(item.id)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{item.topic}</strong>
                      <p>{item.summary || item.next_action}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        状态 {statusText(item.status)} · 最近 {shortTime(item.last_event?.created_at || item.created_at)}
                      </span>
                    </div>
                    <ExternalLink size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>
        </div>

        {data.payload.related_pages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
            {data.payload.related_pages.map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: researchObjectQuery }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left' }}
              >
                <div>
                  <strong>{page.title}</strong>
                  <p>{page.reason}</p>
                </div>
                <ClipboardList size={14} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
