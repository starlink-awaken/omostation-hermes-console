import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ClipboardCheck, Cpu, Gift, RefreshCw, Settings2, TerminalSquare } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import { useArchHealth, useBosMetrics, usePipelines, useQuests, useCreateTask } from '../api/hooks';

interface ArchHealthPayload {
  system?: {
    health_score?: number;
  };
  git?: {
    status?: string;
    uncommitted?: number;
  };
  governance?: {
    health?: string;
  };
}

interface BosMetricsPayload {
  status?: string;
  data_quality?: string;
  error?: string;
  next_action?: string;
  summary?: {
    total_calls?: number;
    avg_latency?: number;
    success_count?: number;
  };
  domains?: Array<{
    domain: string;
    total: number;
    success: number;
    error: number;
    avg_latency: number;
  }>;
}

interface PipelinesPayload {
  pipelines?: string[];
}

interface QuestPayload {
  status?: string;
  quests?: Array<{
    id: number;
    title: string;
    reward: number;
    completed: number;
    assignee: string;
  }>;
  profiles?: Array<{
    role: string;
    name: string;
    level: number;
    wisdomPoints: number;
    responsibilityPoints: number;
  }>;
}

interface PlatformControlWorkbenchProps {
  currentPage: string;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

const PLATFORM_STEPS = [
  {
    id: 'Observability',
    title: '先看观测',
    summary: '先确认架构健康、BOS 链路和异常热点。',
  },
  {
    id: 'Engines',
    title: '定调度',
    summary: '挑管线、计划任务，再决定是否执行。',
  },
  {
    id: 'Settings',
    title: '调控制面',
    summary: '看系统指标与实例注册状态，补基础配置。',
  },
  {
    id: 'Sandbox',
    title: '跑验证',
    summary: '在隔离沙箱里复现实验或验证片段代码。',
  },
  {
    id: 'QuestBoard',
    title: '看落地',
    summary: '检查家庭冒险板，把动作沉到真正的执行面。',
  },
];

function shortStamp(value?: string) {
  if (!value) {
    return '暂无';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function PlatformControlWorkbench({
  currentPage,
  onNavigate,
  onOpenTarget,
}: PlatformControlWorkbenchProps) {
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // React Query hooks replace raw fetch()
  const { data: archHealthData, isLoading: archLoading, isError: archError } = useArchHealth();
  const { data: bosMetricsData, isLoading: bosLoading, isError: bosError } = useBosMetrics();
  const { data: pipelinesData, isLoading: pipelinesLoading, isError: pipelinesError } = usePipelines();
  const { data: questsData, isLoading: questsLoading, isError: questsError } = useQuests();
  const createTaskMutation = useCreateTask();

  // Derive typed data from hooks
  const archHealth = archHealthData as unknown as ArchHealthPayload || {};
  const bosMetrics = bosMetricsData as unknown as BosMetricsPayload || {};
  const pipelines = Array.isArray(pipelinesData) ? pipelinesData : [];
  const quests = questsData as unknown as QuestPayload || {};

  // Availability derived from hook states
  const archAvailable = !archError && !archLoading;
  const bosAvailable = !bosError && !bosLoading;
  const pipelinesAvailable = !pipelinesError && !pipelinesLoading;
  const questsAvailable = !questsError && !questsLoading;

  // Combined unavailable sources
  const unavailableSources: string[] = [];
  if (archError) unavailableSources.push('架构健康');
  if (bosError || bosMetrics.data_quality === 'unavailable') unavailableSources.push('BOS 链路');
  if (pipelinesError) unavailableSources.push('调度管线');
  if (questsError) unavailableSources.push('冒险板');

  // Force refetch on refresh
  void refreshToken;

  const summary = useMemo(() => {
    const archUnavailable = !archAvailable;
    const bosUnavailable = !bosAvailable || bosMetrics.data_quality === 'unavailable';
    const metricsUnavailable = !bosAvailable;
    const pipelinesUnavailable = !pipelinesAvailable;
    const questsUnavailable = !questsAvailable;
    const archScore = archHealth.system?.health_score || 0;
    const avgLatency = bosMetrics.summary?.avg_latency || 0;
    const totalCalls = bosMetrics.summary?.total_calls || 0;
    const successCount = bosMetrics.summary?.success_count || 0;
    const successRate = bosUnavailable ? null : totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0;
    const activeQuests = questsUnavailable ? [] : (quests.quests || []).filter((quest) => quest.completed === 0);
    const topDomain = bosUnavailable ? undefined : (bosMetrics.domains || []).slice().sort((left, right) => right.total - left.total)[0];
    const topQuest = activeQuests[0];

    let nextAction = '先回观测页确认是否有新的系统异常。';
    let nextTab = 'Observability';
    if (bosUnavailable || archUnavailable || metricsUnavailable || archScore < 90 || avgLatency > 1200 || (successRate !== null && successRate < 95)) {
      nextAction = `观测面还有波动，先看 Observability 里的链路和健康度。`;
      nextTab = 'Observability';
    } else if (!pipelinesUnavailable && pipelines.length > 0) {
      nextAction = `当前登记了 ${pipelines.length} 条可用管线，可以去调度页推进下一步。`;
      nextTab = 'Engines';
    } else if (!metricsUnavailable && false) {
      nextAction = `控制面里还有服务未健康，先看 Settings。`;
      nextTab = 'Settings';
    } else if (!questsUnavailable && activeQuests.length > 0) {
      nextAction = `还有 ${activeQuests.length} 条家庭冒险在排队，去 QuestBoard 看落地。`;
      nextTab = 'QuestBoard';
    }

    return {
      archScore,
      avgLatency,
      successRate,
      archUnavailable,
      bosUnavailable,
      metricsUnavailable,
      pipelinesUnavailable,
      questsUnavailable,
      topDomain,
      topQuest,
      activeQuests,
      nextAction,
      nextTab,
    };
  }, [archHealth, bosMetrics, pipelines, quests, archAvailable, bosAvailable, pipelinesAvailable, questsAvailable]);

  const platformContextQuery = summary.topDomain?.domain || (summary.topQuest ? String(summary.topQuest.id) : 'platform');
  const nextTarget = summary.nextTab === 'Observability'
    ? { tab: 'Observability', taskQuery: summary.topDomain?.domain || platformContextQuery }
    : summary.nextTab === 'Engines'
      ? { tab: 'Engines', taskQuery: pipelines[0] || 'Engines' }
      : summary.nextTab === 'QuestBoard'
        ? { tab: 'QuestBoard', taskQuery: summary.topQuest ? String(summary.topQuest.id) : 'QuestBoard' }
        : { tab: summary.nextTab, taskQuery: platformContextQuery };
  const controlTaskTitle = unavailableSources.length > 0
    ? '恢复控制面证据'
    : summary.bosUnavailable || summary.archUnavailable || summary.avgLatency > 1200 || (summary.successRate !== null && summary.successRate < 95)
      ? `处理控制面波动：${summary.topDomain?.domain || currentPage}`
      : summary.pipelinesUnavailable || pipelines.length === 0
        ? '补齐调度管线入口'
        : summary.activeQuests.length > 0
          ? `推进控制面落地：${summary.topQuest?.title || '家庭冒险'}`
          : '抽查控制链路';
  const controlTaskDescription = unavailableSources.length > 0
    ? `${summary.nextAction} 当前有控制面数据源不可用，请恢复证据并完成观测、调度、系统控制、沙箱和落地链路核验。`
    : `${summary.nextAction} 当前上下文：${platformContextQuery}。请补齐控制面证据、处理结果和 TaskCenter closeout。`;
  const createControlTask = async () => {
    setTaskPending(true);
    setTaskNotice(null);
    setTaskError(null);
    try {
      const result = await createTaskMutation.mutateAsync({
        title: controlTaskTitle,
        description: controlTaskDescription,
        priority: unavailableSources.length > 0 || summary.bosUnavailable || summary.archUnavailable ? 'high' : 'medium',
        risk_level: unavailableSources.length > 0 ? 'L2' : 'L1',
        evidence_required: ['控制面状态快照', '观测/调度/服务证据', '验证或处理结果', 'task closeout'],
        tags: ['platform-control', 'runtime-governance'],
        source: {
          type: 'cockpit.platform-control-workbench',
          id: platformContextQuery,
          title: '平台控制工作台',
          target: { tab: currentPage, taskQuery: platformContextQuery },
        },
      } as any);
      setTaskNotice(`已登记控制面任务：${result?.title || controlTaskTitle}`);
      if (result?.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: String(result.id) }, onNavigate, onOpenTarget);
    } catch (requestError) {
      setTaskError(requestError instanceof Error ? requestError.message : '控制面任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };

  const title =
    currentPage === 'Observability'
      ? '观测控制工作台'
      : currentPage === 'Engines'
        ? '调度控制工作台'
        : currentPage === 'Settings'
          ? '系统控制工作台'
          : currentPage === 'Sandbox'
            ? '实验验证工作台'
            : '落地控制工作台';

  return (
    <section className="platform-workbench antd-card">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h2>{title}</h2>
          <p className="text-muted">
            把观测、调度、系统控制、实验沙箱和家庭落地面串成一条完整的控制链。
          </p>
        </div>
      </div>

      {unavailableSources.length > 0 && (
        <div className="overview-inline-error" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>控制面数据需要补证</strong>
            <span>{unavailableSources.join('、')}暂时不可用，不把缺失证据当成平稳状态。</span>
            {bosMetrics.next_action && <small>{bosMetrics.next_action}</small>}
          </div>
          <button type="button" className="antd-btn" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={14} />
            <span>重试</span>
          </button>
        </div>
      )}

      <div className="platform-workbench-summary">
        <div className="platform-workbench-card">
          <span>架构健康</span>
          <strong>{summary.archUnavailable ? 'N/A' : summary.archScore}</strong>
          <small>{summary.archUnavailable ? '架构健康证据不可用' : `git ${archHealth.git?.status || 'unknown'} · governance ${archHealth.governance?.health || 'unknown'}`}</small>
        </div>
        <div className="platform-workbench-card">
          <span>BOS 链路</span>
          <strong>{summary.bosUnavailable ? '-' : `${summary.successRate}%`}</strong>
          <small>{summary.bosUnavailable ? 'BOS 证据不可用' : `调用 ${bosMetrics.summary?.total_calls || 0} · 延迟 ${summary.avgLatency || 0}ms`}</small>
        </div>
        <div className="platform-workbench-card">
          <span>调度与控制</span>
          <strong>{summary.pipelinesUnavailable ? 'N/A' : `${pipelines.length} 条管线`}</strong>
          <small>{summary.metricsUnavailable ? '服务观测证据不可用' : `管线 ${pipelines.length} · 快照 ${shortStamp()}`}</small>
        </div>
        <div className="platform-workbench-card">
          <span>落地冒险</span>
          <strong>{summary.questsUnavailable ? 'N/A' : summary.activeQuests.length}</strong>
          <small>{summary.questsUnavailable ? '冒险板证据不可用' : `角色 ${(quests.profiles || []).length} · 活跃任务 ${(quests.quests || []).length}`}</small>
        </div>
        <button
          type="button"
          className="platform-workbench-card platform-workbench-card-wide"
          onClick={() => openCockpitNavigationTarget(nextTarget, onNavigate, onOpenTarget)}
        >
          <span>建议下一步</span>
          <strong>{summary.nextAction}</strong>
          <small>点击进入 {summary.nextTab}</small>
        </button>
      </div>

      <section className="services-section" role="region" aria-label="控制面任务登记" style={{ marginTop: 16 }}>
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>控制面任务登记</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把观测波动、管线缺口、服务不健康和落地阻塞直接沉到任务中心，保留控制链路的处理证据。
            </p>
          </div>
          <span className={`status-badge ${unavailableSources.length > 0 || summary.bosUnavailable || summary.archUnavailable ? 'degraded' : 'online'}`}>
            {unavailableSources.length > 0 || summary.bosUnavailable || summary.archUnavailable ? '需要处理' : '可抽查'}
          </span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{controlTaskTitle}</strong>
            <p>{controlTaskDescription}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="antd-btn"
              disabled={taskPending}
              aria-label={`登记控制面任务 ${controlTaskTitle}`}
              onClick={() => { void createControlTask(); }}
            >
              <ClipboardCheck size={14} />
              <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
            </button>
            {taskNotice && <span role="status" aria-live="polite" className="text-muted">{taskNotice}</span>}
            {taskError && <span role="alert">{taskError}</span>}
          </div>
        </article>
      </section>

      <div className="platform-workbench-path">
        {PLATFORM_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`platform-workbench-step ${currentPage === step.id ? 'active' : ''}`}
            onClick={() => openCockpitNavigationTarget({ tab: step.id, taskQuery: platformContextQuery }, onNavigate, onOpenTarget)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.summary}</small>
            </div>
            <small>{step.id}</small>
          </button>
        ))}
      </div>

      <div className="platform-workbench-grid">
        <div className="platform-workbench-panel">
          <div className="platform-workbench-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} />
              观测热点
            </strong>
            <small>{summary.bosUnavailable ? 'BOS 域数据不可用' : `${bosMetrics.domains?.length || 0} 个 BOS 域`}</small>
          </div>
          <div className="platform-workbench-list">
            {summary.topDomain ? (
              <button type="button" className="platform-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'Observability', taskQuery: summary.topDomain?.domain }, onNavigate, onOpenTarget)}>
                <strong>{summary.topDomain.domain}</strong>
                <span>调用 {summary.topDomain.total} · 失败 {summary.topDomain.error} · 延迟 {summary.topDomain.avg_latency}ms</span>
                <small>先去 Observability 看域级流量细节。</small>
              </button>
            ) : (
              <div className="platform-workbench-item platform-workbench-empty">
                <strong>{summary.bosUnavailable ? '观测证据不可用' : '观测面当前比较安静'}</strong>
                <span>{summary.bosUnavailable ? bosMetrics.error || 'BOS 尚未产生可核验指标。' : '如果还要继续排查，可以回 Observability 看架构健康和 BOS 摘要。'}</span>
                {summary.bosUnavailable && bosMetrics.next_action && <small>{bosMetrics.next_action}</small>}
              </div>
            )}
            <div className="platform-workbench-item">
              <strong>系统健康度</strong>
              <span>{summary.archUnavailable ? 'N/A' : summary.archScore} · git {summary.archUnavailable ? 'N/A' : archHealth.git?.status || 'unknown'}</span>
              <small>{summary.archUnavailable ? '治理审计证据不可用' : `治理审计 ${archHealth.governance?.health || 'unknown'}`}</small>
            </div>
          </div>
        </div>

        <div className="platform-workbench-panel">
          <div className="platform-workbench-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} />
              调度与控制
            </strong>
            <small>{pipelines.length} pipelines</small>
          </div>
          <div className="platform-workbench-list">
            {pipelines.slice(0, 2).map((pipeline) => (
              <button key={pipeline} type="button" className="platform-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'Engines', taskQuery: pipeline }, onNavigate, onOpenTarget)}>
                <strong>{pipeline}</strong>
                <span>进入调度页计划任务或直接发起执行。</span>
                <small>Engine pipeline</small>
              </button>
            ))}
            <button type="button" className="platform-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'Settings', taskQuery: 'settings' }, onNavigate, onOpenTarget)}>
              <strong>系统控制快照</strong>
              <span>{summary.metricsUnavailable ? '服务观测证据不可用' : `管线 ${pipelines.length} · 最近 ${shortStamp()}`}</span>
              <small>去 Settings 看实例注册和指标历史。</small>
            </button>
            {pipelines.length === 0 && (
              <div className="platform-workbench-item platform-workbench-empty">
                <strong>还没有可调度管线</strong>
                <span>可以先回 Settings 或 Assets 补齐管线入口。</span>
              </div>
            )}
          </div>
        </div>

        <div className="platform-workbench-panel">
          <div className="platform-workbench-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TerminalSquare size={16} />
              验证与落地
            </strong>
            <small>quest {(quests.quests || []).length}</small>
          </div>
          <div className="platform-workbench-list">
            <button type="button" className="platform-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'Sandbox', taskQuery: platformContextQuery }, onNavigate, onOpenTarget)}>
              <strong>隔离验证</strong>
              <span>需要快速复现实验或片段验证时，先去 Sandbox 跑隔离代码。</span>
              <small>AST + 进程级沙箱保护</small>
            </button>
            {summary.topQuest ? (
              <button type="button" className="platform-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'QuestBoard', taskQuery: String(summary.topQuest.id) }, onNavigate, onOpenTarget)}>
                <strong>{summary.topQuest.title}</strong>
                <span>{summary.topQuest.assignee} · 奖励 {summary.topQuest.reward} 点</span>
                <small>去 QuestBoard 看家庭侧真实落地。</small>
              </button>
            ) : (
              <div className="platform-workbench-item platform-workbench-empty">
                <strong>当前没有待完成冒险</strong>
                <span>QuestBoard 现在比较空，适合补新的家庭落地任务。</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="platform-workbench-actions">
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'Observability', taskQuery: platformContextQuery }, onNavigate, onOpenTarget)}>
          <Activity size={14} />
          <span>去观测页</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'Engines', taskQuery: pipelines[0] || platformContextQuery }, onNavigate, onOpenTarget)}>
          <Cpu size={14} />
          <span>去引擎页</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'Settings', taskQuery: platformContextQuery }, onNavigate, onOpenTarget)}>
          <Settings2 size={14} />
          <span>去设置页</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'Sandbox', taskQuery: platformContextQuery }, onNavigate, onOpenTarget)}>
          <TerminalSquare size={14} />
          <span>去沙箱</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'QuestBoard', taskQuery: summary.topQuest ? String(summary.topQuest.id) : platformContextQuery }, onNavigate, onOpenTarget)}>
          <Gift size={14} />
          <span>去冒险板</span>
        </button>
      </div>
    </section>
  );
}
