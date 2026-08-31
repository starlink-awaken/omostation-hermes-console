import React, { useMemo, useState } from 'react';
import { AppWindow, ClipboardCheck, Compass, Layers, ShieldCheck } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import { useSystemMap, useDebt, useOmoStatus, useL4Health, useCreateTask } from '../api/hooks';

interface RoadmapItem {
  id: string;
  title?: string;
  priority?: string;
  problem?: string;
}

interface CapabilityGap {
  id: string;
  title?: string;
  severity?: string;
  next?: string;
}

interface PriorityProject {
  id: string;
  status?: string;
  score?: number;
  primary_gap?: string;
  next_action?: string;
}

interface DomainAttentionApp {
  id: string;
  name?: string;
  runtime_status?: string;
  risk_level?: string;
  security_posture?: string;
  next_action?: string;
}

interface SystemMapGovernanceLite {
  project_portfolio?: {
    summary?: {
      score?: number;
      status?: string;
      blocked?: number;
      at_risk?: number;
    };
    priority_projects?: PriorityProject[];
  };
  domain_apps?: {
    summary?: {
      score?: number;
      ready?: number;
      running?: number;
      security_attention_apps?: number;
    };
    attention_items?: DomainAttentionApp[];
    next_action?: string;
  };
  roadmap?: {
    items?: RoadmapItem[];
  };
  gaps?: CapabilityGap[];
}

interface DebtItem {
  id: string;
  title: string;
  severity: string;
  lifecycle_state: string;
  owner: string;
  dimension: string;
}

interface DebtPayload {
  total?: number;
  open?: number;
  closed?: number;
  items?: DebtItem[];
}

interface OmoStatusPayload {
  system?: {
    current_phase?: string;
    health_score?: number;
    active_tasks?: number;
    blocked_tasks?: number;
  };
  governance?: {
    health_score?: number;
    anomaly_count?: number;
    total_tasks?: number;
  };
}

interface L4HealthDomain {
  id: string;
  name: string;
  fresh: boolean;
  issue_count: number;
  signal_count: number;
}

interface L4HealthPayload {
  total_domains?: number;
  healthy_count?: number;
  unhealthy_count?: number;
  health_rate?: string;
  domains?: L4HealthDomain[];
}

interface GovernanceDomainWorkbenchProps {
  currentPage: string;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

const GOVERNANCE_STEPS = [
  {
    id: 'SystemMap',
    title: '先看全图',
    summary: '从系统地图确认组合阻塞、路线图和能力缺口。',
  },
  {
    id: 'C2G',
    title: '定治理动作',
    summary: '把战略卡片、提案和治理状态收敛成决策入口。',
  },
  {
    id: 'Debt',
    title: '清技术债',
    summary: '定位高优债务，确认 owner、维度和关闭路径。',
  },
  {
    id: 'DomainApps',
    title: '推领域挂载',
    summary: '处理领域应用的运行态、安全门和外部挂载。',
  },
  {
    id: 'L4Health',
    title: '看域健康',
    summary: '核对域信号、异常和跨域健康率。',
  },
];

function severityLabel(value?: string) {
  switch ((value || '').toLowerCase()) {
    case 'p0':
    case 'critical':
      return '高危';
    case 'p1':
    case 'warning':
    case 'medium':
      return '中危';
    case 'p2':
    case 'low':
      return '低危';
    default:
      return value || '未标记';
  }
}

export default function GovernanceDomainWorkbench({
  currentPage,
  onNavigate,
  onOpenTarget,
}: GovernanceDomainWorkbenchProps) {
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // React Query hooks replace raw fetch()
  const { data: systemMapData, isLoading: systemMapLoading, isError: systemMapError } = useSystemMap();
  const { data: debtData, isLoading: debtLoading, isError: debtError } = useDebt();
  const { data: omoStatusData, isLoading: omoStatusLoading, isError: omoStatusError } = useOmoStatus();
  const { data: l4HealthData, isLoading: l4HealthLoading, isError: l4HealthError } = useL4Health();
  const createTaskMutation = useCreateTask();

  // Derive typed data from hooks
  const systemMap = systemMapData as unknown as SystemMapGovernanceLite || {};
  const debt = debtData as unknown as DebtPayload || {};
  const omoStatus = omoStatusData as unknown as OmoStatusPayload || {};
  const l4Health = l4HealthData as unknown as L4HealthPayload || {};

  // Availability derived from hook states
  const systemMapAvailable = !systemMapError && !systemMapLoading;
  const debtAvailable = !debtError && !debtLoading;
  const omoStatusAvailable = !omoStatusError && !omoStatusLoading;
  const l4HealthAvailable = !l4HealthError && !l4HealthLoading;

  // Combined errors
  const sourceErrors: string[] = [];
  if (systemMapError) sourceErrors.push('系统地图');
  if (debtError) sourceErrors.push('技术债账本');
  if (omoStatusError) sourceErrors.push('OMO 状态');
  if (l4HealthError) sourceErrors.push('L4 健康');

  // Force refetch on refresh
  void refreshToken;

  const summary = useMemo(() => {
    const projectSummary = systemMap.project_portfolio?.summary;
    const domainSummary = systemMap.domain_apps?.summary;
    const blockedProjects = projectSummary?.blocked || 0;
    const openDebt = debt.open || 0;
    const securityAttention = domainSummary?.security_attention_apps || 0;
    const unhealthyDomains = l4Health.unhealthy_count || 0;

    let nextAction = '先回系统地图确定组合阻塞，再决定治理落点。';
    let nextTab = 'SystemMap';
    if (!systemMapAvailable) {
      nextAction = '系统地图证据暂不可用，先重试后再判断组合阻塞。';
      nextTab = 'SystemMap';
    } else if (blockedProjects > 0) {
      nextAction = `项目组合里还有 ${blockedProjects} 个阻塞项，先从系统地图或 C2G 收敛。`;
      nextTab = 'C2G';
    } else if (!debtAvailable) {
      nextAction = '技术债账本证据暂不可用，先重试后再判断清债优先级。';
      nextTab = 'Debt';
    } else if (openDebt > 0) {
      nextAction = `技术债账本里还有 ${openDebt} 条未关闭事项，先清债。`;
      nextTab = 'Debt';
    } else if (securityAttention > 0) {
      nextAction = `有 ${securityAttention} 个领域应用还在吃安全关注，先看领域挂载。`;
      nextTab = 'DomainApps';
    } else if (!l4HealthAvailable) {
      nextAction = 'L4 健康证据暂不可用，先重试后再判断异常域。';
      nextTab = 'L4Health';
    } else if (unhealthyDomains > 0) {
      nextAction = `L4 还有 ${unhealthyDomains} 个不健康域，先看域健康。`;
      nextTab = 'L4Health';
    }

    return {
      projectSummary,
      domainSummary,
      systemMapUnavailable: !systemMapAvailable,
      debtUnavailable: !debtAvailable,
      omoStatusUnavailable: !omoStatusAvailable,
      l4HealthUnavailable: !l4HealthAvailable,
      openDebt,
      blockedProjects,
      securityAttention,
      unhealthyDomains,
      nextAction,
      nextTab,
      topProject: systemMap.project_portfolio?.priority_projects?.[0],
      topGap: systemMap.gaps?.[0],
      topRoadmap: systemMap.roadmap?.items?.[0],
      topDebt: debt.items?.find((item) => item.lifecycle_state !== 'closed') || debt.items?.[0],
      topAttentionApp: systemMap.domain_apps?.attention_items?.[0],
      topUnhealthyDomain: l4Health.domains?.find((domain) => !domain.fresh) || l4Health.domains?.[0],
    };
  }, [debt, l4Health, systemMap, systemMapAvailable, debtAvailable, omoStatusAvailable, l4HealthAvailable]);

  const governanceContextQuery = summary.topProject?.id
    || summary.topDebt?.id
    || summary.topAttentionApp?.id
    || summary.topUnhealthyDomain?.id
    || 'governance';
  const nextTarget = summary.nextTab === 'C2G'
    ? { tab: 'C2G', taskQuery: summary.topProject?.id || summary.topGap?.id || governanceContextQuery }
    : summary.nextTab === 'Debt'
      ? { tab: 'Debt', taskQuery: summary.topDebt?.id || 'Debt' }
      : summary.nextTab === 'DomainApps'
        ? { tab: 'DomainApps', taskQuery: summary.topAttentionApp?.id || 'DomainApps' }
        : summary.nextTab === 'L4Health'
          ? { tab: 'L4Health', taskQuery: summary.topUnhealthyDomain?.id || 'L4Health' }
          : { tab: 'SystemMap', taskQuery: governanceContextQuery };

  const governanceTaskTitle = summary.systemMapUnavailable || summary.debtUnavailable || summary.l4HealthUnavailable
    ? '恢复治理数据证据'
    : summary.blockedProjects > 0
      ? `收敛阻塞项目：${summary.topProject?.id || governanceContextQuery}`
      : summary.openDebt > 0
        ? `清理治理债务：${summary.topDebt?.title || governanceContextQuery}`
        : summary.securityAttention > 0
          ? `补齐领域安全：${summary.topAttentionApp?.name || governanceContextQuery}`
          : summary.unhealthyDomains > 0
            ? `修复不健康域：${summary.topUnhealthyDomain?.name || governanceContextQuery}`
            : '抽查治理闭环';
  const governanceTaskDescription = summary.systemMapUnavailable || summary.debtUnavailable || summary.l4HealthUnavailable
    ? `${summary.nextAction} 请恢复治理数据源，并完成系统地图、债务、领域应用和 L4 健康证据核验。`
    : `${summary.nextAction} 当前上下文：${governanceContextQuery}。请补齐对象证据、处理结果和 TaskCenter closeout。`;
  const createGovernanceTask = async () => {
    setTaskPending(true);
    setTaskNotice(null);
    setTaskError(null);
    try {
      const result = await createTaskMutation.mutateAsync({
        title: governanceTaskTitle,
        description: governanceTaskDescription,
        priority: summary.blockedProjects > 0 || summary.openDebt > 0 || summary.securityAttention > 0 || summary.unhealthyDomains > 0 ? 'high' : 'medium',
        risk_level: summary.systemMapUnavailable || summary.debtUnavailable || summary.l4HealthUnavailable ? 'L2' : 'L1',
        evidence_required: ['治理对象状态快照', '处理前后证据', '跨域影响确认', 'task closeout'],
        tags: ['governance', 'domain-closure'],
        source: {
          type: 'cockpit.governance-domain-workbench',
          id: currentPage,
          title: '系统治理工作台',
          target: { tab: currentPage, taskQuery: governanceTaskTitle },
        },
      } as any);
      setTaskNotice(`已登记治理任务：${result?.title || governanceTaskTitle}`);
      if (result?.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: String(result.id) }, onNavigate, onOpenTarget);
    } catch (requestError) {
      setTaskError(requestError instanceof Error ? requestError.message : '治理任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };

  const title =
    currentPage === 'C2G'
      ? '治理决策工作台'
      : currentPage === 'Debt'
        ? '债务治理工作台'
        : currentPage === 'DomainApps'
          ? '领域挂载工作台'
          : currentPage === 'L4Health'
            ? '域健康工作台'
            : '治理与领域工作台';

  return (
    <section className="governance-workbench antd-card">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h2>{title}</h2>
          <p className="text-muted">
            把系统地图、治理决策、技术债、领域挂载和 L4 域健康连成一条可执行的治理主干。
          </p>
        </div>
      </div>

      {sourceErrors.length > 0 && (
        <div className="overview-inline-error" role="alert">
          <ShieldCheck size={16} />
          <div>
            <strong>治理数据需要补证</strong>
            <span>{sourceErrors.join('；')}，当前治理数字可能不完整。</span>
          </div>
          <button type="button" className="antd-btn" onClick={() => setRefreshToken((value) => value + 1)}>重试</button>
        </div>
      )}

      <div className="governance-workbench-summary">
        <div className="governance-workbench-card">
          <span>项目组合</span>
          <strong>{summary.systemMapUnavailable ? 'N/A' : `${summary.projectSummary?.score ?? 0}%`}</strong>
          <small>{summary.systemMapUnavailable ? '系统地图证据不可用' : `阻塞 ${summary.projectSummary?.blocked ?? 0} · 风险 ${summary.projectSummary?.at_risk ?? 0}`}</small>
        </div>
        <div className="governance-workbench-card">
          <span>技术债账本</span>
          <strong>{summary.debtUnavailable ? 'N/A' : summary.openDebt}</strong>
          <small>{summary.debtUnavailable ? '技术债证据不可用' : `总数 ${debt.total ?? 0} · 已关闭 ${debt.closed ?? 0}`}</small>
        </div>
        <div className="governance-workbench-card">
          <span>领域挂载</span>
          <strong>{summary.systemMapUnavailable ? 'N/A' : `${summary.domainSummary?.score ?? 0}%`}</strong>
          <small>{summary.systemMapUnavailable ? '领域挂载证据不可用' : `运行中 ${summary.domainSummary?.running ?? 0} · 安全关注 ${summary.securityAttention}`}</small>
        </div>
        <div className="governance-workbench-card">
          <span>L4 健康率</span>
          <strong>{summary.l4HealthUnavailable ? 'N/A' : l4Health.health_rate || '0%'}</strong>
          <small>{summary.l4HealthUnavailable ? 'L4 健康证据不可用' : `健康 ${l4Health.healthy_count ?? 0} · 异常 ${summary.unhealthyDomains}`}</small>
        </div>
        <button
          type="button"
          className="governance-workbench-card governance-workbench-card-wide"
          onClick={() => openCockpitNavigationTarget(nextTarget, onNavigate, onOpenTarget)}
        >
          <span>建议下一步</span>
          <strong>{summary.nextAction}</strong>
          <small>点击进入 {summary.nextTab}</small>
        </button>
      </div>

      <section className="services-section" role="region" aria-label="治理任务登记" style={{ marginTop: 16 }}>
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>治理任务登记</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把项目阻塞、技术债、领域安全和域健康异常直接沉到任务中心，保留跨域证据和收口路径。
            </p>
          </div>
          <span className={`status-badge ${summary.blockedProjects || summary.openDebt || summary.securityAttention || summary.unhealthyDomains ? 'degraded' : 'online'}`}>
            {summary.blockedProjects || summary.openDebt || summary.securityAttention || summary.unhealthyDomains ? '发现治理事项' : '抽查承接'}
          </span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{governanceTaskTitle}</strong>
            <p>{governanceTaskDescription}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="antd-btn"
              disabled={taskPending}
              aria-label={`登记治理任务 ${governanceTaskTitle}`}
              onClick={() => { void createGovernanceTask(); }}
            >
              <ClipboardCheck size={14} />
              <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
            </button>
            {taskNotice && <span role="status" aria-live="polite" className="text-muted">{taskNotice}</span>}
            {taskError && <span role="alert">{taskError}</span>}
          </div>
        </article>
      </section>

      <div className="governance-workbench-path">
        {GOVERNANCE_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`governance-workbench-step ${currentPage === step.id ? 'active' : ''}`}
            onClick={() => openCockpitNavigationTarget({ tab: step.id, taskQuery: governanceContextQuery }, onNavigate, onOpenTarget)}
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

      <div className="governance-workbench-grid">
        <div className="governance-workbench-panel">
          <div className="governance-workbench-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Compass size={16} />
              战略与组合
            </strong>
            <small>{omoStatus.system?.current_phase || '未登记阶段'}</small>
          </div>
          <div className="governance-workbench-list">
            {summary.topProject ? (
              <button type="button" className="governance-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', taskQuery: summary.topProject.id }, onNavigate, onOpenTarget)}>
                <strong>{summary.topProject.id}</strong>
                <span>{summary.topProject.primary_gap || '优先项目仍需处理。'}</span>
                <small>{summary.topProject.status || '未知'} · {summary.topProject.score ?? 0}%</small>
              </button>
            ) : (
              <div className="governance-workbench-item governance-workbench-empty">
                <strong>组合暂时平静</strong>
                <span>还没有优先项目时，回系统地图看路线图和维度得分。</span>
              </div>
            )}
            {summary.topRoadmap && (
              <button type="button" className="governance-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'C2G', taskQuery: summary.topRoadmap.id }, onNavigate, onOpenTarget)}>
                <strong>{summary.topRoadmap.title || '路线图项'}</strong>
                <span>{summary.topRoadmap.problem || '去 C2G 看当前治理策略。'}</span>
                <small>{summary.topRoadmap.priority || '未标优先级'}</small>
              </button>
            )}
            {summary.topGap && (
              <button type="button" className="governance-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', taskQuery: summary.topGap.id }, onNavigate, onOpenTarget)}>
                <strong>{summary.topGap.title || '能力缺口'}</strong>
                <span>{summary.topGap.next || '回系统地图确认下一步。'}</span>
                <small>{severityLabel(summary.topGap.severity)}</small>
              </button>
            )}
          </div>
        </div>

        <div className="governance-workbench-panel">
          <div className="governance-workbench-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardCheck size={16} />
              债务与治理
            </strong>
            <small>{summary.omoStatusUnavailable ? 'OMO 状态证据不可用' : `active ${omoStatus.system?.active_tasks ?? 0} · blocked ${omoStatus.system?.blocked_tasks ?? 0}`}</small>
          </div>
          <div className="governance-workbench-list">
            {summary.topDebt ? (
              <button type="button" className="governance-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'Debt', taskQuery: summary.topDebt.id }, onNavigate, onOpenTarget)}>
                <strong>{summary.topDebt.title}</strong>
                <span>{summary.topDebt.owner} · {summary.topDebt.dimension}</span>
                <small>{summary.topDebt.severity.toUpperCase()} · {summary.topDebt.lifecycle_state}</small>
              </button>
            ) : (
              <div className="governance-workbench-item governance-workbench-empty">
                <strong>暂时没有未关债务</strong>
                <span>可以去 C2G 或系统地图继续补长期路线图。</span>
              </div>
            )}
            <div className="governance-workbench-item">
              <strong>治理健康</strong>
              <span>{summary.omoStatusUnavailable ? 'system N/A · governance N/A' : `system ${omoStatus.system?.health_score ?? 0} · governance ${omoStatus.governance?.health_score ?? 0}`}</span>
              <small>{summary.omoStatusUnavailable ? '治理状态证据不可用' : `异常 ${omoStatus.governance?.anomaly_count ?? 0} · 总任务 ${omoStatus.governance?.total_tasks ?? 0}`}</small>
            </div>
          </div>
        </div>

        <div className="governance-workbench-panel">
          <div className="governance-workbench-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AppWindow size={16} />
              领域与域健康
            </strong>
            <small>{summary.l4HealthUnavailable ? '域数量证据不可用' : `${l4Health.total_domains ?? 0} 个域`}</small>
          </div>
          <div className="governance-workbench-list">
            {summary.topAttentionApp ? (
              <button type="button" className="governance-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: summary.topAttentionApp.id }, onNavigate, onOpenTarget)}>
                <strong>{summary.topAttentionApp.name || summary.topAttentionApp.id}</strong>
                <span>{summary.topAttentionApp.next_action || '进入领域应用页继续处理。'}</span>
                <small>{summary.topAttentionApp.runtime_status || '未知'} · {summary.topAttentionApp.security_posture || '未登记'}</small>
              </button>
            ) : (
              <div className="governance-workbench-item governance-workbench-empty">
                <strong>领域挂载侧暂无注意项</strong>
                <span>可以继续回 L4 健康页看域信号和长期异常。</span>
              </div>
            )}
            {summary.topUnhealthyDomain && (
              <button type="button" className="governance-workbench-item" onClick={() => openCockpitNavigationTarget({ tab: 'L4Health', taskQuery: summary.topUnhealthyDomain.id }, onNavigate, onOpenTarget)}>
                <strong>{summary.topUnhealthyDomain.name}</strong>
                <span>{summary.topUnhealthyDomain.fresh ? '当前信号新鲜。' : '当前域状态不新鲜，需核对。'}</span>
                <small>问题 {summary.topUnhealthyDomain.issue_count} · 信号 {summary.topUnhealthyDomain.signal_count}</small>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="governance-workbench-actions">
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', taskQuery: summary.topProject?.id || summary.topGap?.id || governanceContextQuery }, onNavigate, onOpenTarget)}>
          <Layers size={14} />
          <span>去系统地图</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'C2G', taskQuery: summary.topRoadmap?.id || governanceContextQuery }, onNavigate, onOpenTarget)}>
          <Compass size={14} />
          <span>去 C2G</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'Debt', taskQuery: summary.topDebt?.id || governanceContextQuery }, onNavigate, onOpenTarget)}>
          <ClipboardCheck size={14} />
          <span>去债务页</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: summary.topAttentionApp?.id || governanceContextQuery }, onNavigate, onOpenTarget)}>
          <AppWindow size={14} />
          <span>去领域应用</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: 'L4Health', taskQuery: summary.topUnhealthyDomain?.id || governanceContextQuery }, onNavigate, onOpenTarget)}>
          <ShieldCheck size={14} />
          <span>去 L4 健康</span>
        </button>
      </div>
    </section>
  );
}
