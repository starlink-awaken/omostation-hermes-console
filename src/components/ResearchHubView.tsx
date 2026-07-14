import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ClipboardList, Clock3, Compass, Copy, ExternalLink, GitBranch, RefreshCw, Search, X } from 'lucide-react';
import './Dashboard.css';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

type ResearchSummary = {
  total: number;
  active: number;
  archived: number;
  quarantined: number;
  published: number;
  follow_ups: number;
  agents: number;
};

type ResearchEvent = {
  type?: string | null;
  label?: string | null;
  created_at?: string | null;
  description?: string | null;
};

type ResearchItem = {
  id: number;
  topic: string;
  summary?: string;
  created_at?: string | null;
  source_count: number;
  tags: string[];
  agent?: string;
  status: string;
  follow_up_count: number;
  last_event?: ResearchEvent | null;
  next_action: string;
};

type ResearchHubPayload = {
  status?: string;
  summary: ResearchSummary;
  recent: ResearchItem[];
  commands: Array<{
    id: string;
    label: string;
    value: string;
    detail: string;
  }>;
  pipeline: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
  related_pages: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
};

type ResearchDetailPayload = {
  status?: string;
  item?: {
    id: number;
    topic: string;
    summary?: string;
    full_text?: string;
    created_at?: string | null;
    source_count: number;
    tags: string[];
    follow_ups: Array<{ question?: string; answer?: string; [key: string]: unknown }>;
    agent?: string | null;
    status: string;
  };
  timeline: Array<ResearchEvent & { event_type?: string | null }>;
  dossier: {
    parents: Array<Record<string, unknown>>;
    children: Array<Record<string, unknown>>;
    publications: Array<{ style?: string; path?: string; published_at?: string | null; [key: string]: unknown }>;
  };
  half_life?: { days?: number; status?: string; [key: string]: unknown };
};

type ResearchClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

interface ResearchHubViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

const EMPTY_PAYLOAD: ResearchHubPayload = {
  summary: {
    total: 0,
    active: 0,
    archived: 0,
    quarantined: 0,
    published: 0,
    follow_ups: 0,
    agents: 0,
  },
  recent: [],
  commands: [],
  pipeline: [],
  related_pages: [],
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

function statusText(status?: string) {
  if (status === 'active') return '活跃';
  if (status === 'archived') return '归档';
  if (status === 'quarantined') return '隔离';
  return '未知';
}

function shortTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function matchesResearchFocusQuery(values: Array<string | number | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

export default function ResearchHubView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: ResearchHubViewProps) {
  const [payload, setPayload] = useState<ResearchHubPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedResearchId, setSelectedResearchId] = useState<number | null>(null);
  const [researchDetail, setResearchDetail] = useState<ResearchDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = async () => {
    const data = await fetchJson<ResearchHubPayload>('/api/cockpit/research-hub', EMPTY_PAYLOAD);
    setPayload(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!focusTaskQuery) return;
    const matchedResearch = payload.recent.find((item) => (
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
    if (matchedResearch && matchedResearch.id !== selectedResearchId) {
      void openDetail(matchedResearch.id);
    }
  }, [focusTaskQuery, payload.recent, selectedResearchId]);

  const openDetail = async (researchId: number) => {
    setSelectedResearchId(researchId);
    setResearchDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    const data = await fetchJson<ResearchDetailPayload>(
      `/api/cockpit/research-hub/${researchId}`,
      { status: 'error', timeline: [], dossier: { parents: [], children: [], publications: [] } },
    );
    if (data.status !== 'ok' || !data.item) {
      setDetailError('研究对象详情暂时读取失败，请稍后重试。');
    } else {
      setResearchDetail(data);
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedResearchId(null);
    setResearchDetail(null);
    setDetailError(null);
  };

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

  const knowledgeTarget = useMemo(() => (
    payload.pipeline.find((step) => /knowledge|知识/i.test(`${step.id} ${step.title}`))?.id
    ?? payload.related_pages.find((page) => /knowledge|知识|context/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Knowledge'
  ), [payload.pipeline, payload.related_pages]);

  const taskTarget = useMemo(() => (
    payload.related_pages.find((page) => /task|任务/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'TaskCenter'
  ), [payload.related_pages]);

  const publicationTarget = useMemo(() => (
    payload.related_pages.find((page) => /overview|概览|发布|strategy|作战|systemmap|system map/i.test(`${page.id} ${page.title} ${page.reason}`))?.id
    ?? 'Overview'
  ), [payload.related_pages]);

  const researchWorkbench = useMemo(() => {
    const contextCandidates = payload.recent.filter((item) => item.source_count < 3 || item.tags.length === 0 || !item.agent);
    const taskCandidates = payload.recent.filter((item) => item.follow_up_count > 0 || /任务|跟进|执行|落地/i.test(item.next_action));
    const publishCandidates = payload.recent.filter((item) => item.status !== 'archived');

    return {
      contextCount: contextCandidates.length,
      taskCount: taskCandidates.length,
      publishCount: publishCandidates.length,
      contextItems: (contextCandidates.length ? contextCandidates : payload.recent).slice(0, 3),
      taskItems: (taskCandidates.length ? taskCandidates : payload.recent).slice(0, 3),
      publishItems: (publishCandidates.length ? publishCandidates : payload.recent).slice(0, 3),
    };
  }, [payload.recent]);

  const researchClosureRows = useMemo<ResearchClosureRow[]>(() => {
    const firstRecent = payload.recent[0];
    const firstContext = researchWorkbench.contextItems[0];
    const firstTask = researchWorkbench.taskItems[0];
    const firstPublish = researchWorkbench.publishItems[0];

    return [
      {
        id: 'detail',
        title: '研究对象详情',
        summary: '先打开研究对象详情，确认正文、时间线、追问和发布证据，再决定往哪一页继续走。',
        signal: firstRecent ? `最近对象 ${firstRecent.topic}` : `活跃研究 ${payload.summary.active}`,
        nextAction: firstRecent ? `先打开 ${firstRecent.topic} 的详情，确认它是缺上下文、缺任务还是缺发布回流。` : '先发起一条研究对象，再建立详情承接。',
        statusTone: firstRecent ? 'degraded' : 'online',
        objectTarget: { tab: 'Research', taskQuery: firstRecent ? String(firstRecent.id) : 'Research' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstRecent ? String(firstRecent.id) : 'Research' },
      },
      {
        id: 'context',
        title: '知识补上下文',
        summary: '来源、标签或负责人偏薄时，先回知识页补上下文，让研究对象不再孤立。',
        signal: researchWorkbench.contextCount > 0 ? `待补上下文 ${researchWorkbench.contextCount}` : `知识就绪 ${payload.summary.active}`,
        nextAction: firstContext ? `把 ${firstContext.topic} 送去知识页补来源、标签和负责人。` : '当前研究上下文较完整，抽查一条知识承接是否仍然可用。',
        statusTone: researchWorkbench.contextCount > 0 ? 'degraded' : 'online',
        objectTarget: { tab: knowledgeTarget, taskQuery: firstContext ? String(firstContext.id) : 'research-context' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstContext ? String(firstContext.id) : 'research-context' },
      },
      {
        id: 'task',
        title: '研究任务正式收口',
        summary: '有追问和下一步动作的研究对象，不能只停在研究页，需要送进任务中心继续执行。',
        signal: researchWorkbench.taskCount > 0 ? `待落任务 ${researchWorkbench.taskCount}` : `追问总数 ${payload.summary.follow_ups}`,
        nextAction: firstTask ? `把 ${firstTask.topic} 的下一步动作送进任务中心，补责任人和验收口。` : '当前没有明显待落任务对象，抽查研究到任务中心的链路是否还通。',
        statusTone: researchWorkbench.taskCount > 0 ? 'degraded' : 'online',
        objectTarget: { tab: taskTarget, taskQuery: firstTask ? String(firstTask.id) : 'research-task' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstTask ? String(firstTask.id) : 'research-task' },
      },
      {
        id: 'publish',
        title: '发布回流与复盘',
        summary: '研究做完不是结束，还要回到发布/概览面完成回流、复盘和下一轮动作沉淀。',
        signal: researchWorkbench.publishCount > 0 ? `待发布回流 ${researchWorkbench.publishCount}` : `已发布 ${payload.summary.published}`,
        nextAction: firstPublish ? `从 ${firstPublish.topic} 开始，回发布面做回流和复盘。` : '当前没有待发布对象，抽查已发布研究的回流是否完整。',
        statusTone: researchWorkbench.publishCount > 0 ? 'degraded' : 'online',
        objectTarget: { tab: publicationTarget, taskQuery: firstPublish ? String(firstPublish.id) : 'research-publish' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstPublish ? String(firstPublish.id) : 'research-publish' },
      },
    ];
  }, [
    knowledgeTarget,
    payload.recent,
    payload.summary.active,
    payload.summary.follow_ups,
    payload.summary.published,
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
    const matchedResearch = payload.recent.find((item) => (
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

    const matchedCommand = payload.commands.find((command) => (
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

    const matchedPage = payload.related_pages.find((page) => (
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
  }, [focusPageId, focusTaskQuery, payload.commands, payload.recent, payload.related_pages, researchClosureRows]);

  if (loading) {
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
            setRefreshing(true);
            void load();
          }}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>
        </div>

        <div className="stats-grid">
          {[
            ['活跃研究', payload.summary.active, <Search key="search" size={20} />],
            ['已发布', payload.summary.published, <BookOpen key="book" size={20} />],
            ['追问总数', payload.summary.follow_ups, <GitBranch key="branch" size={20} />],
            ['参与 Agent', payload.summary.agents, <Compass key="compass" size={20} />],
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
              {payload.pipeline.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className="action-surface-item"
                  onClick={() => onNavigate?.(step.id)}
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
              {payload.commands.map((command) => (
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
        statusText={payload.summary.active ? `${payload.summary.active} 条活跃研究` : '等待研究对象'}
        items={actionItems}
        onNavigate={onNavigate}
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

      <section className="services-section" role="region" aria-label="研究闭环总表">
        <div className="section-header">
          <div>
            <h2>研究闭环总表</h2>
            <p className="text-muted">把详情、知识、任务和发布回流并排摆出来，研究页才不只是对象列表和正文抽屉。</p>
          </div>
          <span className="status-badge online">{researchClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {researchClosureRows.map((row) => (
            <article
              key={`research-closure-${row.id}`}
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
                  aria-label={`打开研究闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Search size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开研究闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <GitBranch size={14} />
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
            <h2>最近研究对象</h2>
            <p className="text-muted">它们现在处在什么状态、上一次发生了什么，以及下一步应该做什么。</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {payload.recent.length === 0 ? (
            <div className="antd-card" style={{ padding: 20 }}>
              <p className="text-muted" style={{ margin: 0 }}>还没有研究对象，先从“发起研究”那条命令开始。</p>
            </div>
          ) : payload.recent.map((item) => (
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
                onClick={() => void openDetail(item.id)}
                style={{ width: '100%', justifyContent: 'space-between', marginTop: 2 }}
              >
                <span>查看对象详情</span>
                <ExternalLink size={14} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedResearchId !== null && (
        <section className="services-section" role="region" aria-label="研究对象详情">
          <div className="section-header">
            <div>
              <h2>{researchDetail?.item?.topic || `研究对象 #${selectedResearchId}`}</h2>
              <p className="text-muted">对象正文、证据关系、时间线和发布记录。</p>
            </div>
            <button type="button" className="icon-btn" aria-label="关闭研究对象详情" onClick={closeDetail} title="关闭详情">
              <X size={16} />
            </button>
          </div>

          {detailLoading && <p className="text-muted">正在读取研究对象详情...</p>}
          {detailError && <p className="text-muted">{detailError}</p>}
          {researchDetail?.item && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="antd-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span className={`status-badge ${researchDetail.item.status === 'active' ? 'online' : researchDetail.item.status === 'archived' ? 'degraded' : 'offline'}`}>
                    {statusText(researchDetail.item.status)}
                  </span>
                  <span className="text-muted">来源 {researchDetail.item.source_count}</span>
                  <span className="text-muted">Agent {researchDetail.item.agent || '未指定'}</span>
                  {researchDetail.half_life?.days !== undefined && (
                    <span className="text-muted"><Clock3 size={13} style={{ verticalAlign: '-2px' }} /> 新鲜度 {researchDetail.half_life.days} 天</span>
                  )}
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 14 }}>{researchDetail.item.summary || '暂无摘要'}</p>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--antd-text-secondary)', fontSize: 13 }}>
                  {researchDetail.item.full_text || '暂无完整正文。'}
                </div>
                {researchDetail.item.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    {researchDetail.item.tags.map((tag) => <span key={tag} className="system-map-chip degraded">{tag}</span>)}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <article className="antd-card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>时间线</h3>
                  {researchDetail.timeline.length === 0 ? <p className="text-muted">暂无事件。</p> : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {researchDetail.timeline.map((event, index) => (
                        <div key={`${event.created_at || 'event'}-${index}`} style={{ borderLeft: '2px solid var(--antd-primary)', paddingLeft: 12 }}>
                          <strong>{event.label || event.event_type || event.type || '研究事件'}</strong>
                          <p style={{ margin: '4px 0', fontSize: 13 }}>{event.description || '暂无描述'}</p>
                          <span className="text-muted" style={{ fontSize: 12 }}>{shortTime(event.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="antd-card" style={{ padding: 18 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>发布记录</h3>
                  {researchDetail.dossier.publications.length === 0 ? <p className="text-muted">尚未发布。</p> : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {researchDetail.dossier.publications.map((publication, index) => (
                        <div key={`${publication.path || 'publication'}-${index}`}>
                          <strong>{publication.style || '研究输出'}</strong>
                          <p style={{ margin: '4px 0', fontSize: 13 }}>{publication.path || '未记录输出路径'}</p>
                          <span className="text-muted" style={{ fontSize: 12 }}>{shortTime(publication.published_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <article className="antd-card" style={{ padding: 18 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>追问与关系</h3>
                <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
                  <span>追问 {researchDetail.item.follow_ups.length} 条</span>
                  <span>父级研究 {researchDetail.dossier.parents.length} 条，子级研究 {researchDetail.dossier.children.length} 条</span>
                  {researchDetail.item.follow_ups.slice(0, 3).map((followUp, index) => (
                    <span key={`follow-up-${index}`} className="text-muted">{followUp.question || '未命名追问'}</span>
                  ))}
                </div>
              </article>
            </div>
          )}
        </section>
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
                    onClick={() => onNavigate?.(knowledgeTarget)}
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
                    onClick={() => onNavigate?.(taskTarget)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{item.topic}</strong>
                      <p>{item.next_action}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        追问 {item.follow_up_count} · 最近事件 {item.last_event?.label || '暂无'}
                      </span>
                    </div>
                    <GitBranch size={14} />
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
              <button type="button" className="antd-btn" onClick={() => onNavigate?.(publicationTarget)}>
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
                    onClick={() => void openDetail(item.id)}
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

        {payload.related_pages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
            {payload.related_pages.map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                onClick={() => onNavigate?.(page.id)}
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
