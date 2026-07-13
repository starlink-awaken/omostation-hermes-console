import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, Bot, Brain, Copy, Database, FileText, GitBranch, Route, ShieldAlert } from 'lucide-react';
import { DashboardPage as GBrainDashboard } from './GBrain/GBrainDashboard';
import KnowledgeExecutionWorkbench from './KnowledgeExecutionWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface KnowledgeHubViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type KnowledgeSubTab = 'monitor' | 'memory' | 'agents' | 'calibration' | 'logs';

type KnowledgeSurfaceCard = {
  id: KnowledgeSubTab;
  title: string;
  summary: string;
  detail: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesKnowledgeFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function inferKnowledgeSubTab(query?: string): KnowledgeSubTab {
  if (matchesKnowledgeFocusQuery(['memory', 'context', 'knowledge', 'kos', 'rag', '记忆', '知识', '上下文'], query)) return 'memory';
  if (matchesKnowledgeFocusQuery(['agent', 'agents', '智能体', 'multi-agent', 'mcp'], query)) return 'agents';
  if (matchesKnowledgeFocusQuery(['calibration', 'prompt', 'model', 'policy', '校准', '模型', '策略'], query)) return 'calibration';
  if (matchesKnowledgeFocusQuery(['log', 'logs', 'audit', 'trace', 'request', '日志', '审计', '请求'], query)) return 'logs';
  return 'monitor';
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function KnowledgeHubView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: KnowledgeHubViewProps) {
  const knowledgeSurfaces = useMemo<KnowledgeSurfaceCard[]>(() => ([
    {
      id: 'monitor',
      title: '运行看板',
      summary: '看连接智能体、请求吞吐和凭证健康。',
      detail: '当你先想确认知识面今天能不能支撑工作，再从这里看总运行状态与波动。',
      objectTarget: { tab: 'Overview', taskQuery: 'knowledge-runtime' },
      taskTarget: { tab: 'TaskCenter', taskQuery: 'knowledge-runtime' },
    },
    {
      id: 'memory',
      title: '记忆交互',
      summary: '处理记忆注入、检索与上下文供给。',
      detail: '需要把研究、家庭资料或 SOP 变成可复用上下文时，先切到这层补知识供给。',
      objectTarget: { tab: 'Research', taskQuery: focusTaskQuery || 'memory' },
      taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'memory' },
    },
    {
      id: 'agents',
      title: '智能体管理',
      summary: '看智能体接入、职责与运行态。',
      detail: '当知识问题已经涉及 agent 编排、接入范围或权限面时，从这里接到工作流和资产面。',
      objectTarget: { tab: 'Workflows', taskQuery: 'agents' },
      taskTarget: { tab: 'TaskCenter', taskQuery: 'agents' },
    },
    {
      id: 'calibration',
      title: '大模型校准',
      summary: '处理模型策略、提示和校准动作。',
      detail: '当知识输出不稳、模型行为偏了或策略需要收紧时，去校准层确认约束。',
      objectTarget: { tab: 'Protocol', taskQuery: 'calibration' },
      taskTarget: { tab: 'TaskCenter', taskQuery: 'calibration' },
    },
    {
      id: 'logs',
      title: '访问日志',
      summary: '追请求轨迹、异常与审计证据。',
      detail: '当知识链出现失败、延迟或权限问题时，先看日志再回任务中心做正式承接。',
      objectTarget: { tab: 'LogViewer', taskQuery: 'knowledge' },
      taskTarget: { tab: 'TaskCenter', taskQuery: 'knowledge-logs' },
    },
  ]), [focusTaskQuery]);
  const inferredSubTab = useMemo(() => inferKnowledgeSubTab(focusTaskQuery), [focusTaskQuery]);
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<KnowledgeSubTab>(inferredSubTab);
  const [knowledgeDraftNotice, setKnowledgeDraftNotice] = useState<string | null>(null);

  useEffect(() => {
    setKnowledgeSubTab(inferredSubTab);
  }, [inferredSubTab]);

  const activeKnowledgeSurface = useMemo(
    () => knowledgeSurfaces.find((surface) => surface.id === knowledgeSubTab) || knowledgeSurfaces[0],
    [knowledgeSubTab, knowledgeSurfaces],
  );

  const focusedKnowledgeCard = useMemo(() => {
    if (matchesKnowledgeFocusQuery(['research', 'study', 'publication', 'insight', '家庭系统研究'], focusTaskQuery)) {
      return {
        kicker: '研究回流',
        title: '研究对象与知识上下文',
        detail: '先回研究中枢确认对象，再把上下文、记忆和后续动作补齐到知识面。',
        objectTarget: { tab: 'Research', taskQuery: focusTaskQuery || 'research' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'research' },
      };
    }

    if (matchesKnowledgeFocusQuery(['knowledge', 'memory', 'context', 'kos', 'rag', '记忆', '知识', '上下文'], focusTaskQuery)) {
      return {
        kicker: '知识对象',
        title: '知识上下文承接',
        detail: '当前上下文更像知识、记忆或检索问题，先在知识中枢看是否具备可执行的上下文供给。',
        objectTarget: { tab: 'Knowledge', taskQuery: focusTaskQuery || 'knowledge' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'knowledge' },
      };
    }

    if (matchesKnowledgeFocusQuery(['asset', 'skill', 'workflow', 'protocol', 'engine', '技能', '工作流', '协议', '引擎'], focusTaskQuery)) {
      return {
        kicker: '执行链联动',
        title: '知识到执行链',
        detail: '当前上下文已经碰到资产、协议或工作流边界，先确认知识是否真的能支撑后续执行。',
        objectTarget: { tab: 'Assets', taskQuery: focusTaskQuery || 'assets' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'assets' },
      };
    }

    if (focusPageId === 'Knowledge') {
      return {
        kicker: '当前页面',
        title: '知识中枢',
        detail: '这页负责把记忆、检索、上下文和执行供给收成一个可观察、可承接的知识面。',
        objectTarget: { tab: 'SystemMap', pageId: 'Knowledge' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Knowledge' },
      };
    }

    return null;
  }, [focusPageId, focusTaskQuery]);

  const knowledgeTaskDraft = useMemo(() => {
    const focusLabel = focusTaskQuery || activeKnowledgeSurface.title;
    const title = `补齐知识承接：${activeKnowledgeSurface.title}`;
    const description = `把 ${focusLabel} 对应的问题从知识子面板继续送往 ${activeKnowledgeSurface.objectTarget.tab} 和任务中心，不要停在信息展示。`;
    const checklist = [
      `先在 ${activeKnowledgeSurface.title} 确认当前问题是否有足够上下文`,
      `把关联对象带到 ${activeKnowledgeSurface.objectTarget.tab} 做进一步验证或收口`,
      '把下一步动作沉到任务中心，确保可追踪、可复盘、可继续执行',
    ];
    const copyTextValue = [
      `标题: ${title}`,
      `焦点对象: ${focusLabel}`,
      `知识子面板: ${activeKnowledgeSurface.title}`,
      `任务描述: ${description}`,
      '建议动作:',
      ...checklist.map((item, index) => `${index + 1}. ${item}`),
      '验收标准:',
      `- ${activeKnowledgeSurface.title} 不再只是查看入口，而有明确对象与任务承接`,
      `- ${activeKnowledgeSurface.objectTarget.tab} 与 TaskCenter 至少有一条明确跳转链`,
      '- 当前知识问题已经变成可继续推进的正式动作',
    ].join('\n');

    return {
      title,
      description,
      checklist,
      copyText: copyTextValue,
      objectTarget: activeKnowledgeSurface.objectTarget,
      taskTarget: activeKnowledgeSurface.taskTarget,
    };
  }, [activeKnowledgeSurface, focusTaskQuery]);

  return (
    <div className="gbrain-wrapper animate-fade-in">
      <KnowledgeExecutionWorkbench currentPage="Knowledge" onNavigate={onNavigate} />

      {focusedKnowledgeCard && (
        <section className="services-section overview-ops-panel" aria-label="当前知识承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前知识承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，先翻成知识面应该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedKnowledgeCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedKnowledgeCard.title}</strong>
              <p>{focusedKnowledgeCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开知识焦点对象 ${focusedKnowledgeCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedKnowledgeCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Database size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开知识焦点任务 ${focusedKnowledgeCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedKnowledgeCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <GitBranch size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" aria-label="知识维度地图">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>知识维度地图</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              把知识面的运行、记忆、智能体、校准和日志五个子面板直接摆出来，减少只看到旧看板却不知道怎么用的断层。
            </p>
          </div>
          <span className="status-badge online">5 个子面板</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {knowledgeSurfaces.map((surface) => (
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
                aria-label={`切换知识子面板 ${surface.title}`}
                onClick={() => setKnowledgeSubTab(surface.id)}
              >
                <Route size={13} />
                <span>{surface.id === knowledgeSubTab ? '当前查看' : '切到此层'}</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section" role="region" aria-label="当前知识子面板">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>当前知识子面板</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              先确认当前正在看的知识层，再把相关对象和任务送到真正的承接页。
            </p>
          </div>
          <span className="status-badge degraded">{activeKnowledgeSurface.title}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{activeKnowledgeSurface.title}</strong>
              <p>{activeKnowledgeSurface.detail}</p>
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
                aria-label={`打开知识相关对象 ${activeKnowledgeSurface.title}`}
                onClick={() => openCockpitNavigationTarget(activeKnowledgeSurface.objectTarget, onNavigate, onOpenTarget)}
              >
                <BookOpen size={14} />
                <span>打开相关对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开知识相关任务 ${activeKnowledgeSurface.title}`}
                onClick={() => openCockpitNavigationTarget(activeKnowledgeSurface.taskTarget, onNavigate, onOpenTarget)}
              >
                <ShieldAlert size={14} />
                <span>打开承接任务</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="services-section" role="region" aria-label="知识补位任务">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>知识补位任务</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              把当前知识层直接翻成一条可复制、可送往任务中心的补位动作，避免知识面停在浏览状态。
            </p>
          </div>
          <span className="status-badge degraded">草稿就绪</span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{knowledgeTaskDraft.title}</strong>
            <p>{knowledgeTaskDraft.description}</p>
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {knowledgeTaskDraft.checklist.map((item, index) => (
                <small key={`${knowledgeTaskDraft.title}-${index}`} className="text-muted">{index + 1}. {item}</small>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="antd-btn"
              aria-label={`复制知识补位任务 ${knowledgeTaskDraft.title}`}
              onClick={async () => {
                await copyText(knowledgeTaskDraft.copyText);
                setKnowledgeDraftNotice(`已复制知识补位任务：${knowledgeTaskDraft.title}`);
              }}
            >
              <Copy size={14} />
              <span>复制补位任务</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开知识补位对象 ${knowledgeTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(knowledgeTaskDraft.objectTarget, onNavigate, onOpenTarget)}
            >
              <Bot size={14} />
              <span>打开相关对象</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开知识补位任务 ${knowledgeTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(knowledgeTaskDraft.taskTarget, onNavigate, onOpenTarget)}
            >
              <FileText size={14} />
              <span>送进任务中心</span>
            </button>
          </div>
        </article>
        {knowledgeDraftNotice && (
          <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{knowledgeDraftNotice}</p>
        )}
      </section>

      <div className="services-section" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={16} />
        <span className="text-muted" style={{ fontSize: 13 }}>
          知识中枢继续承接 gbrain 的检索、记忆与执行供给面，并把子面板切换显式抬到 cockpit 外层入口。
        </span>
      </div>

      <GBrainDashboard initialSubTab={knowledgeSubTab} />
    </div>
  );
}
