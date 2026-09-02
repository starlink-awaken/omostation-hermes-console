import React, { useEffect, useMemo } from 'react';
import '../Dashboard.css';
import ActionSurfacePanel from '../ActionSurfacePanel';
import { type CockpitNavigationTarget } from '../cockpitNavigation';
import { useResearchHubData } from './useResearchHubData';
import { ResearchClosureTable } from './ResearchClosureTable';
import { ResearchDetailPanel } from './ResearchDetailPanel';
import { ResearchStatsSection } from './ResearchStatsSection';
import { ResearchFilterBar } from './ResearchFilterBar';
import { RecentResearchList } from './RecentResearchList';
import { ResearchWorkbenchSection } from './ResearchWorkbenchSection';
import { FocusedResearchCard } from './FocusedResearchCard';
import { type ResearchClosureRow } from './types';
import { matchesResearchFocusQuery } from './utils';

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
      <ResearchStatsSection
        payload={data.payload}
        refreshing={data.refreshing}
        sourceError={data.sourceError}
        researchObjectQuery={researchObjectQuery}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onRefresh={() => data.load()}
      />

      <ActionSurfacePanel
        title="研究推进区"
        subtitle="先发起或继续研究，再跳到补材料或落任务的页面。"
        statusText={data.payload.summary.active ? `${data.payload.summary.active} 条活跃研究` : '等待研究对象'}
        items={actionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      {focusedResearchCard && (
        <FocusedResearchCard
          kicker={focusedResearchCard.kicker}
          title={focusedResearchCard.title}
          detail={focusedResearchCard.detail}
          objectTarget={focusedResearchCard.objectTarget}
          taskTarget={focusedResearchCard.taskTarget}
          onNavigate={onNavigate}
          onOpenTarget={onOpenTarget}
        />
      )}

      <ResearchClosureTable
        rows={researchClosureRows}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <ResearchFilterBar
        query={data.researchQuery}
        statusFilter={data.researchStatusFilter}
        filteredCount={filteredResearch.length}
        totalCount={data.payload.summary.total}
        onQueryChange={data.setResearchQuery}
        onStatusChange={data.setResearchStatusFilter}
        onClear={() => { data.setResearchQuery(''); data.setResearchStatusFilter('all'); }}
      />

      <RecentResearchList
        items={filteredResearch}
        totalCount={data.payload.recent.length}
        hasMore={data.payload.has_more}
        loadingMore={data.loadingMore}
        displayedCount={data.payload.recent.length}
        onOpenDetail={(id) => void data.openDetail(id)}
        onLoadMore={(offset, append) => void data.load(offset, append)}
      />

      {data.selectedResearchId !== null && (
        <ResearchDetailPanel
          researchDetail={data.researchDetail}
          selectedResearchId={data.selectedResearchId}
          detailLoading={data.detailLoading}
          detailError={data.detailError}
          onClose={data.closeDetail}
        />
      )}

      <ResearchWorkbenchSection
        workbench={researchWorkbench}
        knowledgeTarget={knowledgeTarget}
        taskTarget={taskTarget}
        publicationTarget={publicationTarget}
        researchObjectQuery={researchObjectQuery}
        queueError={data.queueError}
        queueingResearchId={data.queueingResearchId}
        relatedPages={data.payload.related_pages}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onQueueTask={(id) => void data.queueResearchTask(id)}
        onOpenDetail={(id) => void data.openDetail(id)}
        onDismissQueueError={() => data.setQueueError(null)}
      />
    </div>
  );
}
