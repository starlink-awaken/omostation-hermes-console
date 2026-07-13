import React, { useEffect, useMemo, useState } from 'react';
import { AppWindow, ClipboardCheck, Compass, Layers, ShieldCheck } from 'lucide-react';

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

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response || !response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return fallback;
  }
}

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
}: GovernanceDomainWorkbenchProps) {
  const [systemMap, setSystemMap] = useState<SystemMapGovernanceLite>({});
  const [debt, setDebt] = useState<DebtPayload>({});
  const [omoStatus, setOmoStatus] = useState<OmoStatusPayload>({});
  const [l4Health, setL4Health] = useState<L4HealthPayload>({});

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [systemMapPayload, debtPayload, omoStatusPayload, l4HealthPayload] = await Promise.all([
        fetchJson<SystemMapGovernanceLite>('/api/cockpit/system-map', {}),
        fetchJson<DebtPayload>('/api/debt', {}),
        fetchJson<OmoStatusPayload>('/api/omos/status', {}),
        fetchJson<L4HealthPayload>('/api/l4/health', {}),
      ]);

      if (!active) {
        return;
      }

      setSystemMap(systemMapPayload || {});
      setDebt(debtPayload || {});
      setOmoStatus(omoStatusPayload || {});
      setL4Health(l4HealthPayload || {});
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const projectSummary = systemMap.project_portfolio?.summary;
    const domainSummary = systemMap.domain_apps?.summary;
    const blockedProjects = projectSummary?.blocked || 0;
    const openDebt = debt.open || 0;
    const securityAttention = domainSummary?.security_attention_apps || 0;
    const unhealthyDomains = l4Health.unhealthy_count || 0;

    let nextAction = '先回系统地图确定组合阻塞，再决定治理落点。';
    let nextTab = 'SystemMap';
    if (blockedProjects > 0) {
      nextAction = `项目组合里还有 ${blockedProjects} 个阻塞项，先从系统地图或 C2G 收敛。`;
      nextTab = 'C2G';
    } else if (openDebt > 0) {
      nextAction = `技术债账本里还有 ${openDebt} 条未关闭事项，先清债。`;
      nextTab = 'Debt';
    } else if (securityAttention > 0) {
      nextAction = `有 ${securityAttention} 个领域应用还在吃安全关注，先看领域挂载。`;
      nextTab = 'DomainApps';
    } else if (unhealthyDomains > 0) {
      nextAction = `L4 还有 ${unhealthyDomains} 个不健康域，先看域健康。`;
      nextTab = 'L4Health';
    }

    return {
      projectSummary,
      domainSummary,
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
  }, [debt, l4Health, systemMap]);

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

      <div className="governance-workbench-summary">
        <div className="governance-workbench-card">
          <span>项目组合</span>
          <strong>{summary.projectSummary?.score ?? 0}%</strong>
          <small>阻塞 {summary.projectSummary?.blocked ?? 0} · 风险 {summary.projectSummary?.at_risk ?? 0}</small>
        </div>
        <div className="governance-workbench-card">
          <span>技术债账本</span>
          <strong>{summary.openDebt}</strong>
          <small>总数 {debt.total ?? 0} · 已关闭 {debt.closed ?? 0}</small>
        </div>
        <div className="governance-workbench-card">
          <span>领域挂载</span>
          <strong>{summary.domainSummary?.score ?? 0}%</strong>
          <small>运行中 {summary.domainSummary?.running ?? 0} · 安全关注 {summary.securityAttention}</small>
        </div>
        <div className="governance-workbench-card">
          <span>L4 健康率</span>
          <strong>{l4Health.health_rate || '0%'}</strong>
          <small>健康 {l4Health.healthy_count ?? 0} · 异常 {summary.unhealthyDomains}</small>
        </div>
        <button
          type="button"
          className="governance-workbench-card governance-workbench-card-wide"
          onClick={() => onNavigate?.(summary.nextTab)}
        >
          <span>建议下一步</span>
          <strong>{summary.nextAction}</strong>
          <small>点击进入 {summary.nextTab}</small>
        </button>
      </div>

      <div className="governance-workbench-path">
        {GOVERNANCE_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`governance-workbench-step ${currentPage === step.id ? 'active' : ''}`}
            onClick={() => onNavigate?.(step.id)}
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
              <button type="button" className="governance-workbench-item" onClick={() => onNavigate?.('SystemMap')}>
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
              <button type="button" className="governance-workbench-item" onClick={() => onNavigate?.('C2G')}>
                <strong>{summary.topRoadmap.title || '路线图项'}</strong>
                <span>{summary.topRoadmap.problem || '去 C2G 看当前治理策略。'}</span>
                <small>{summary.topRoadmap.priority || '未标优先级'}</small>
              </button>
            )}
            {summary.topGap && (
              <button type="button" className="governance-workbench-item" onClick={() => onNavigate?.('SystemMap')}>
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
            <small>active {omoStatus.system?.active_tasks ?? 0} · blocked {omoStatus.system?.blocked_tasks ?? 0}</small>
          </div>
          <div className="governance-workbench-list">
            {summary.topDebt ? (
              <button type="button" className="governance-workbench-item" onClick={() => onNavigate?.('Debt')}>
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
              <span>system {omoStatus.system?.health_score ?? 0} · governance {omoStatus.governance?.health_score ?? 0}</span>
              <small>异常 {omoStatus.governance?.anomaly_count ?? 0} · 总任务 {omoStatus.governance?.total_tasks ?? 0}</small>
            </div>
          </div>
        </div>

        <div className="governance-workbench-panel">
          <div className="governance-workbench-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AppWindow size={16} />
              领域与域健康
            </strong>
            <small>{l4Health.total_domains ?? 0} 个域</small>
          </div>
          <div className="governance-workbench-list">
            {summary.topAttentionApp ? (
              <button type="button" className="governance-workbench-item" onClick={() => onNavigate?.('DomainApps')}>
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
              <button type="button" className="governance-workbench-item" onClick={() => onNavigate?.('L4Health')}>
                <strong>{summary.topUnhealthyDomain.name}</strong>
                <span>{summary.topUnhealthyDomain.fresh ? '当前信号新鲜。' : '当前域状态不新鲜，需核对。'}</span>
                <small>问题 {summary.topUnhealthyDomain.issue_count} · 信号 {summary.topUnhealthyDomain.signal_count}</small>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="governance-workbench-actions">
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('SystemMap')}>
          <Layers size={14} />
          <span>去系统地图</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('C2G')}>
          <Compass size={14} />
          <span>去 C2G</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('Debt')}>
          <ClipboardCheck size={14} />
          <span>去债务页</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('DomainApps')}>
          <AppWindow size={14} />
          <span>去领域应用</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('L4Health')}>
          <ShieldCheck size={14} />
          <span>去 L4 健康</span>
        </button>
      </div>
    </section>
  );
}
