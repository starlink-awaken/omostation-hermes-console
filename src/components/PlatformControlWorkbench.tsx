import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Cpu, Gift, RefreshCw, Settings2, TerminalSquare } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

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

interface MetricsPayload {
  status?: string;
  data_quality?: string;
  error?: string;
  timestamp?: string;
  services?: number;
  healthy?: number;
  latency?: Record<string, number>;
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

async function fetchJson<T>(url: string, fallback: T, label: string): Promise<{ data: T; error: string | null }> {
  try {
    const response = await fetch(url);
    if (!response) {
      return { data: fallback, error: `${label}：请求无响应` };
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallbackRecord = (fallback && typeof fallback === 'object' ? fallback : {}) as Record<string, unknown>;
      return {
        data: {
          ...fallbackRecord,
          ...(payload && typeof payload === 'object' ? payload : {}),
          status: 'unavailable',
          data_quality: 'unavailable',
        } as T,
        error: `${label} HTTP ${response.status}`,
      };
    }
    return { data: payload as T, error: null };
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return { data: fallback, error: `${label}：${error instanceof Error ? error.message : '请求失败'}` };
  }
}

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
  const [archHealth, setArchHealth] = useState<ArchHealthPayload>({});
  const [bosMetrics, setBosMetrics] = useState<BosMetricsPayload>({});
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<MetricsPayload>({});
  const [quests, setQuests] = useState<QuestPayload>({});
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [archResult, bosResult, pipelineResult, metricsResult, questResult] = await Promise.all([
        fetchJson<ArchHealthPayload>('/api/v1/arch-health', {}, '架构健康'),
        fetchJson<BosMetricsPayload>('/api/bos/metrics', {}, 'BOS 链路'),
        fetchJson<PipelinesPayload>('/api/pipelines', { pipelines: [] }, '调度管线'),
        fetchJson<MetricsPayload>('/api/metrics/history', {}, '服务观测'),
        fetchJson<QuestPayload>('/api/omos/quests', {}, '冒险板'),
      ]);

      if (!active) {
        return;
      }

      setArchHealth(archResult.data || {});
      setBosMetrics(bosResult.data || {});
      setPipelines(pipelineResult.data.pipelines || []);
      setMetrics(metricsResult.data || {});
      setQuests(questResult.data || {});
      setSourceErrors([archResult.error, bosResult.error, pipelineResult.error, metricsResult.error, questResult.error]
        .filter((error): error is string => Boolean(error)));
    };

    void load();
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const unavailableSources = useMemo(() => {
    const sources: string[] = [];
    sources.push(...sourceErrors);
    if (bosMetrics.data_quality === 'unavailable') sources.push('BOS 链路');
    if (metrics.data_quality === 'unavailable') sources.push('服务观测');
    return Array.from(new Set(sources));
  }, [bosMetrics.data_quality, metrics.data_quality, sourceErrors]);

  const summary = useMemo(() => {
    const archScore = archHealth.system?.health_score || 0;
    const bosUnavailable = bosMetrics.data_quality === 'unavailable';
    const avgLatency = bosMetrics.summary?.avg_latency || 0;
    const totalCalls = bosMetrics.summary?.total_calls || 0;
    const successCount = bosMetrics.summary?.success_count || 0;
    const successRate = bosUnavailable ? null : totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0;
    const activeQuests = (quests.quests || []).filter((quest) => quest.completed === 0);
    const topDomain = (bosMetrics.domains || []).slice().sort((left, right) => right.total - left.total)[0];
    const topQuest = activeQuests[0];
    const healthyServices = metrics.healthy || 0;
    const services = metrics.services || 0;

    let nextAction = '先回观测页确认是否有新的系统异常。';
    let nextTab = 'Observability';
    if (bosUnavailable || archScore < 90 || avgLatency > 1200 || (successRate !== null && successRate < 95)) {
      nextAction = `观测面还有波动，先看 Observability 里的链路和健康度。`;
      nextTab = 'Observability';
    } else if (pipelines.length > 0) {
      nextAction = `当前登记了 ${pipelines.length} 条可用管线，可以去调度页推进下一步。`;
      nextTab = 'Engines';
    } else if (services > healthyServices) {
      nextAction = `控制面里还有 ${services - healthyServices} 个服务未健康，先看 Settings。`;
      nextTab = 'Settings';
    } else if (activeQuests.length > 0) {
      nextAction = `还有 ${activeQuests.length} 条家庭冒险在排队，去 QuestBoard 看落地。`;
      nextTab = 'QuestBoard';
    }

    return {
      archScore,
      avgLatency,
      successRate,
      bosUnavailable,
      topDomain,
      topQuest,
      activeQuests,
      healthyServices,
      services,
      nextAction,
      nextTab,
    };
  }, [archHealth, bosMetrics, metrics, pipelines, quests]);

  const platformContextQuery = summary.topDomain?.domain || (summary.topQuest ? String(summary.topQuest.id) : 'platform');
  const nextTarget = summary.nextTab === 'Observability'
    ? { tab: 'Observability', taskQuery: summary.topDomain?.domain || platformContextQuery }
    : summary.nextTab === 'Engines'
      ? { tab: 'Engines', taskQuery: pipelines[0] || 'Engines' }
      : summary.nextTab === 'QuestBoard'
        ? { tab: 'QuestBoard', taskQuery: summary.topQuest ? String(summary.topQuest.id) : 'QuestBoard' }
        : { tab: summary.nextTab, taskQuery: platformContextQuery };

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
          <strong>{summary.archScore || 'N/A'}</strong>
          <small>git {archHealth.git?.status || 'unknown'} · governance {archHealth.governance?.health || 'unknown'}</small>
        </div>
        <div className="platform-workbench-card">
          <span>BOS 链路</span>
          <strong>{summary.bosUnavailable ? '-' : `${summary.successRate}%`}</strong>
          <small>{summary.bosUnavailable ? 'BOS 证据不可用' : `调用 ${bosMetrics.summary?.total_calls || 0} · 延迟 ${summary.avgLatency || 0}ms`}</small>
        </div>
        <div className="platform-workbench-card">
          <span>调度与控制</span>
          <strong>{pipelines.length} 条管线</strong>
          <small>服务 {summary.healthyServices}/{summary.services} healthy · 快照 {shortStamp(metrics.timestamp)}</small>
        </div>
        <div className="platform-workbench-card">
          <span>落地冒险</span>
          <strong>{summary.activeQuests.length}</strong>
          <small>角色 {(quests.profiles || []).length} · 活跃任务 {(quests.quests || []).length}</small>
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
            <small>{bosMetrics.domains?.length || 0} 个 BOS 域</small>
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
              <span>{summary.archScore || 'N/A'} · git {archHealth.git?.status || 'unknown'}</span>
              <small>治理审计 {archHealth.governance?.health || 'unknown'}</small>
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
              <span>服务 {summary.healthyServices}/{summary.services} healthy · 最近 {shortStamp(metrics.timestamp)}</span>
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
