import React, { useEffect, useState } from 'react';
import {
  Compass,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  ArrowRight,
  ClipboardList,
  RefreshCw,
  Trophy,
  X,
  Eye,
  FileCode,
  Sparkles
} from 'lucide-react';
import './Dashboard.css';
import GovernanceDomainWorkbench from './GovernanceDomainWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface OmoStatus {
  system?: {
    current_phase?: string;
    health_score?: number;
    completed_tasks?: number;
    active_tasks?: number;
    blocked_tasks?: number;
  };
  governance?: {
    health_score?: number;
    anomaly_count?: number;
    total_tasks?: number;
    done?: number;
    planned?: number;
  };
}

interface CardItem {
  id: string;
  type: string;
  status: string;
  title: string;
  priority: string;
  domain: string;
  created: string;
}

interface CardCheck {
  compliant: boolean;
  violations: string[];
  constraints_checked: number;
  guidance: string;
}

interface ProposalItem {
  id: string;
  type: string;
  debt_id: string;
  target_model?: string;
  scope?: string;
  status: string;
  created_at?: string;
  description?: string;
}

interface DirectIoViolation {
  file: string;
  line: number;
  detail: string;
}

interface C2GStrategyViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesC2GFocusQuery(values: Array<string | null | undefined>, query?: string | null) {
  if (!query) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

export default function C2GStrategyView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: C2GStrategyViewProps) {
  const [status, setStatus] = useState<OmoStatus | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [check, setCheck] = useState<CardCheck | null>(null);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [violations, setViolations] = useState<DirectIoViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);
  const [approvingIds, setApprovingIds] = useState<Record<string, boolean>>({});
  const [rejectingIds, setRejectingIds] = useState<Record<string, boolean>>({});
  const [queueingProposalIds, setQueueingProposalIds] = useState<Record<string, boolean>>({});
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);
  const [governanceQuery, setGovernanceQuery] = useState('');
  const [governanceStatusFilter, setGovernanceStatusFilter] = useState('all');

  const handleFixDrift = async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const res = await fetch('/api/cockpit/governance/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fix-drift' }),
      });
      const data = await res.json();
      if (res.ok && data.executes === false) {
        setFixResult(`已承接治理修复任务 ${data.id || ''}，请到任务中心审批后执行。`);
        if (data.id) onOpenTarget?.({ tab: 'TaskCenter', taskQuery: data.id });
      } else {
        setFixResult('治理修复承接失败: ' + (data.detail || data.error || '原因未知'));
      }
    } catch (err: any) {
      setFixResult('网络异常: ' + err.message);
    } finally {
      setFixing(false);
    }
  };

  const handleApproveProposal = async (id: string) => {
    setApprovingIds(prev => ({ ...prev, [id]: true }));
    setProposalError(null);
    setProposalSuccess(null);
    try {
      const res = await fetch(`/api/v1/proposals/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setProposalSuccess(data.message || `提案 ${id} 已批准并执行`);
        fetchData();
      } else {
        setProposalError(`批准失败: ${data.error || '未知错误'}`);
      }
    } catch (err: any) {
      setProposalError(`网络错误: ${err.message}`);
    } finally {
      setApprovingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRejectProposal = async (id: string) => {
    setRejectingIds(prev => ({ ...prev, [id]: true }));
    setProposalError(null);
    setProposalSuccess(null);
    try {
      const res = await fetch(`/api/v1/proposals/${id}/reject`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setProposalSuccess(`提案 ${id} 已拒绝`);
        fetchData();
      } else {
        setProposalError(`拒绝失败: ${data.error || '未知错误'}`);
      }
    } catch (err: any) {
      setProposalError(`网络错误: ${err.message}`);
    } finally {
      setRejectingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleQueueProposal = async (id: string) => {
    setQueueingProposalIds(prev => ({ ...prev, [id]: true }));
    setProposalError(null);
    setProposalSuccess(null);
    try {
      const res = await fetch(`/api/cockpit/proposals/${encodeURIComponent(id)}/queue`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || '提案任务承接失败');
      setProposalSuccess(data.created === false ? `任务已存在：${data.id}` : `提案已承接为任务：${data.id}`);
      if (data.id) onOpenTarget?.({ tab: 'TaskCenter', taskQuery: data.id });
    } catch (err: any) {
      setProposalError(`承接失败: ${err.message || '网络异常'}`);
    } finally {
      setQueueingProposalIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const fetchData = async () => {
    try {
      setError(null);
      // Fetch Status
      const statusRes = await fetch('/api/omos/status');
      let statusData = {};
      if (statusRes.ok) {
        statusData = await statusRes.json();
      }

      // Fetch Cards
      const cardsRes = await fetch('/api/cards');
      let cardsData = [];
      if (cardsRes.ok) {
        cardsData = await cardsRes.json();
      }

      // Fetch Compliance Check
      const checkRes = await fetch('/api/cards/check');
      let checkData = null;
      if (checkRes.ok) {
        checkData = await checkRes.json();
      }

      // Fetch Proposals
      let proposalsData = [];
      try {
        const proposalsRes = await fetch('/api/v1/proposals');
        if (proposalsRes.ok) {
          const body = await proposalsRes.json();
          if (body.status === 'ok' && Array.isArray(body.proposals)) {
            proposalsData = body.proposals;
          }
        }
      } catch (pErr) {
        console.error("Failed to fetch proposals", pErr);
      }

      // Fetch Violations
      let violationsData = [];
      try {
        const violationsRes = await fetch('/api/omos/violations');
        if (violationsRes.ok) {
          const body = await violationsRes.json();
          if (body.status === 'ok' && Array.isArray(body.violations)) {
            violationsData = body.violations;
          }
        }
      } catch (vErr) {
        console.error("Failed to fetch violations", vErr);
      }

      setStatus(statusData);
      setCards(cardsData);
      setCheck(checkData);
      setProposals(proposalsData);
      setViolations(violationsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '获取 C2G 数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openCardTask = (cardId?: string) => {
    if (onOpenTarget) {
      onOpenTarget({ tab: 'TaskCenter', taskQuery: cardId });
      return;
    }
    onNavigate?.('TaskCenter');
  };

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在拉取 C2G 战略指挥中心数据...</p>
      </div>
    );
  }

  const sysHealth = status?.system?.health_score ?? 95;
  const govHealth = status?.governance?.health_score ?? 98;
  const currentPhase = status?.system?.current_phase || 'Wave 2 (迭代研发期)';
  const normalizedGovernanceQuery = governanceQuery.trim().toLowerCase();
  const filteredCards = cards.filter((card) => {
    const matchesQuery = !normalizedGovernanceQuery || [card.id, card.type, card.status, card.title, card.priority, card.domain]
      .some((value) => value.toLowerCase().includes(normalizedGovernanceQuery));
    const matchesStatus = governanceStatusFilter === 'all' || card.status === governanceStatusFilter;
    return matchesQuery && matchesStatus;
  });
  const filteredProposals = proposals.filter((proposal) => {
    const matchesQuery = !normalizedGovernanceQuery || [proposal.id, proposal.type, proposal.debt_id, proposal.target_model, proposal.scope, proposal.status, proposal.description]
      .some((value) => value?.toLowerCase().includes(normalizedGovernanceQuery));
    const matchesStatus = governanceStatusFilter === 'all' || proposal.status === governanceStatusFilter;
    return matchesQuery && matchesStatus;
  });
  const filteredViolations = violations.filter((violation) => {
    if (governanceStatusFilter !== 'all') return false;
    return !normalizedGovernanceQuery || [violation.file, String(violation.line), violation.detail]
      .some((value) => value.toLowerCase().includes(normalizedGovernanceQuery));
  });
  const priorityCards = filteredCards.slice(0, 4);
  const activeProposals = filteredProposals.filter((proposal) => proposal.status !== 'rejected').slice(0, 3);
  const directIoViolations = filteredViolations.slice(0, 3);
  const hasGovernanceFilter = Boolean(normalizedGovernanceQuery) || governanceStatusFilter !== 'all';
  const focusedC2GCard = (() => {
    const matchedCard = cards.find((card) => (
      matchesC2GFocusQuery([card.id, card.title, card.priority, card.domain, card.status], focusTaskQuery)
    ));
    if (matchedCard) {
      return {
        kicker: '治理卡片',
        title: matchedCard.title,
        detail: `${matchedCard.priority} · ${matchedCard.status} · ${matchedCard.domain}`,
        objectTarget: { tab: 'C2G', taskQuery: matchedCard.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedCard.id },
      };
    }

    const matchedProposal = proposals.find((proposal) => (
      matchesC2GFocusQuery(
        [proposal.id, proposal.type, proposal.debt_id, proposal.target_model, proposal.scope, proposal.status, proposal.description],
        focusTaskQuery,
      )
    ));
    if (matchedProposal) {
      return {
        kicker: '待审提案',
        title: matchedProposal.type,
        detail: `${matchedProposal.status} · ${matchedProposal.scope || matchedProposal.target_model || matchedProposal.debt_id || matchedProposal.id}`,
        objectTarget: { tab: 'C2G', taskQuery: matchedProposal.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedProposal.debt_id || matchedProposal.id },
      };
    }

    const matchedViolation = violations.find((violation) => (
      matchesC2GFocusQuery([violation.file, violation.detail, String(violation.line)], focusTaskQuery)
    ));
    if (matchedViolation) {
      return {
        kicker: '违规项',
        title: matchedViolation.file,
        detail: `Line ${matchedViolation.line} · ${matchedViolation.detail}`,
        objectTarget: { tab: 'C2G', taskQuery: matchedViolation.file },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedViolation.file },
      };
    }

    if (focusPageId === 'C2G') {
      return {
        kicker: '当前页面',
        title: 'C2G 战略中心',
        detail: '这页负责把治理卡片、待审提案和违规入口串起来，不只是展示治理分数。',
        objectTarget: { tab: 'SystemMap', pageId: 'C2G' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'C2G' },
      };
    }

    return null;
  })();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GovernanceDomainWorkbench currentPage="C2G" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <ActionSurfacePanel
        title="治理执行区"
        subtitle="看完治理状态后，直接跳去系统地图、债务页或任务中心推进下一步。"
        statusText={`卡片 ${filteredCards.length}/${cards.length} · 提案 ${filteredProposals.length}/${proposals.length} · 违规 ${filteredViolations.length}/${violations.length}`}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        items={[
          {
            id: 'system-map',
            title: '回系统地图定范围',
            detail: '治理问题需要先确认组合阻塞、项目缺口和路线图时，直接回系统地图。',
            actionLabel: '去系统地图',
            actionType: 'navigate',
            actionValue: 'SystemMap',
            actionTarget: { tab: 'SystemMap', taskQuery: focusTaskQuery || priorityCards[0]?.id || 'C2G' },
          },
          {
            id: 'debt',
            title: '切到债务页',
            detail: '治理卡片落到长期修复时，去债务账本确认 owner、级别和关闭路径。',
            actionLabel: '去债务页',
            actionType: 'navigate',
            actionValue: 'Debt',
            actionTarget: { tab: 'Debt', taskQuery: focusTaskQuery || priorityCards[0]?.id || 'C2G' },
          },
          {
            id: 'tasks',
            title: '沉到任务中心',
            detail: '需要把治理动作变成可跟踪任务时，直接回任务中心继续推进。',
            actionLabel: '去任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
            actionTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || priorityCards[0]?.id || 'C2G' },
          },
          {
            id: 'copy-sync',
            title: '复制治理同步命令',
            detail: '做治理修正后，先用标准命令同步状态和证据。',
            actionLabel: '复制命令',
            actionType: 'copy',
            actionValue: 'uv run --project "projects/omo" omo state sync --json',
          },
        ]}
      />

      {focusedC2GCard && (
        <section className="services-section overview-ops-panel" aria-label="当前治理承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前治理承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、搜索或任务带来的上下文，直接翻成治理面当前该承接的卡片、提案或违规对象。
              </p>
            </div>
            <span className="status-badge online">{focusedC2GCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedC2GCard.title}</strong>
              <p>{focusedC2GCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开治理焦点对象 ${focusedC2GCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedC2GCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Compass size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开治理焦点任务 ${focusedC2GCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedC2GCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <ClipboardList size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>治理承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把治理卡片、待决提案和违规入口摆在同一层，先决定动作再跳去债务、任务或系统地图继续推进。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">卡片 {filteredCards.length}/{cards.length}</span>
            <span className="status-badge degraded">提案 {filteredProposals.length}/{proposals.length}</span>
            <span className="status-badge online">违规 {filteredViolations.length}/{violations.length}</span>
          </div>
        </div>

        <div
          role="region"
          aria-label="治理对象筛选"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: '14px 0 16px' }}
        >
          <input
            className="antd-input"
            aria-label="搜索治理对象"
            placeholder="卡片、提案、债务、文件或违规内容"
            value={governanceQuery}
            onChange={(event) => setGovernanceQuery(event.target.value)}
            style={{ minWidth: 260, flex: '1 1 280px' }}
          />
          <select
            className="antd-input"
            aria-label="按状态筛选治理对象"
            value={governanceStatusFilter}
            onChange={(event) => setGovernanceStatusFilter(event.target.value)}
            style={{ minWidth: 150, flex: '0 1 180px' }}
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒绝</option>
            <option value="completed">已完成</option>
          </select>
          {hasGovernanceFilter && (
            <button
              type="button"
              className="antd-btn"
              aria-label="清除治理对象筛选"
              onClick={() => { setGovernanceQuery(''); setGovernanceStatusFilter('all'); }}
            >
              <X size={14} />
              <span>清除</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>优先治理卡片</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先处理最紧的卡片，再把动作沉到任务中心或系统地图继续收口。</p>
            </div>
            {priorityCards.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有待处理治理卡片。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {priorityCards.map((card) => (
                  <button
                    key={`card-${card.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看治理卡片 ${card.title}`}
                    onClick={() => openCardTask(card.id)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{card.title}</strong>
                      <p>{card.priority} · {card.status} · {card.domain}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>点击后打开该治理卡片相关任务。</span>
                    </div>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>治理去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>提案和违规本身不是终点，后续还要回债务、系统地图和任务中心继续落地。</p>
            </div>
            {activeProposals.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                {activeProposals.map((proposal) => (
                  <div key={`proposal-${proposal.id}`} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{proposal.type}</strong>
                      <p>{proposal.scope || proposal.target_model || proposal.debt_id || proposal.id}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>状态 {proposal.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {directIoViolations.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                {directIoViolations.map((violation, index) => (
                  <div key={`violation-${index}`} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{violation.file}</strong>
                      <p>{violation.detail}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>行 {violation.line}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {[
              { id: 'Debt', label: '债务页', reason: '需要明确 owner、严重度和关闭路径时进入债务账本。', aria: '打开治理承接到债务页' },
              { id: 'SystemMap', label: '系统地图', reason: '确认治理动作影响的项目、页面和能力覆盖。', aria: '打开治理承接到系统地图' },
              { id: 'TaskCenter', label: '任务中心', reason: '把治理决策变成真正可跟踪的后续动作。', aria: '打开治理承接到任务中心' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: focusTaskQuery || priorityCards[0]?.id || 'C2G' }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <ArrowRight size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>
      
      {/* 顶部控制栏与健康雷达 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.1) 0%, rgba(79, 172, 254, 0.1) 100%)',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 242, 254, 0.25)'
          }}>
            <Compass size={20} className="text-primary" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--antd-text-primary)', margin: 0 }}>C2G 战略决策与规划中枢</h2>
            <p className="text-muted" style={{ fontSize: '12px', margin: '4px 0 0 0' }}>连接 Capability (能力) 至 Governance (治理)，跟踪 SSOT 保鲜度</p>
          </div>
        </div>

        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="antd-btn" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? '正在刷新' : '手动刷新'}</span>
        </button>
      </div>

      {/* 战略核心指标与 SSOT 守门人状态 */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        
        {/* 当前波次与阶段 */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-info">
              <h3>当前战役波次</h3>
              <p className="stat-value" style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0', color: 'var(--antd-primary)' }}>
                {currentPhase}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--antd-success)' }}>
                <Flag size={12} />
                <span>战略目标稳步执行中</span>
              </div>
            </div>
            <div style={{ padding: '6px', background: 'rgba(0, 242, 254, 0.08)', borderRadius: '6px' }}>
              <Layers size={18} className="text-primary" />
            </div>
          </div>
        </div>

        {/* 系统健康与治理评分 */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-info">
              <h3>系统治理健康分</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
                <span className="stat-value" style={{ color: 'var(--antd-success)' }}>{govHealth}</span>
                <span className="text-muted" style={{ fontSize: '12px' }}>/ 100</span>
              </div>
              <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>
                系统稳定度: {sysHealth}% (正常运转)
              </p>
            </div>
            <div style={{ padding: '6px', background: 'rgba(5, 243, 162, 0.08)', borderRadius: '6px' }}>
              <Trophy size={18} className="text-success" />
            </div>
          </div>
        </div>

        {/* SSOT 守门人状态 */}
        <div className="stat-card" style={{ 
          borderLeft: `3px solid ${check?.compliant ? 'var(--antd-success)' : 'var(--antd-error)'}`,
          background: check?.compliant ? 'transparent' : 'rgba(255, 71, 87, 0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="stat-info" style={{ flex: 1 }}>
              <h3>SSOT 漂移与合规守卫</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0' }}>
                {check?.compliant ? (
                  <>
                    <ShieldCheck size={16} className="text-success" />
                    <span style={{ fontWeight: 600, color: 'var(--antd-success)' }}>架构完全合规</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={16} className="text-danger" />
                    <span style={{ fontWeight: 600, color: 'var(--antd-error)' }}>检测到架构漂移</span>
                  </>
                )}
              </div>
              <p className="text-muted" style={{ fontSize: '11px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                {fixResult || check?.guidance || '无约束校验反馈'}
              </p>
            </div>
            
            {!check?.compliant && (
              <button
                onClick={handleFixDrift}
                disabled={fixing}
                className="antd-btn"
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  background: 'rgba(255, 71, 87, 0.12)',
                  color: 'var(--antd-error)',
                  border: '1px solid rgba(255, 71, 87, 0.25)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {fixing ? '正在承接...' : '承接治理修复'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 违规报警栏 */}
      {check && !check.compliant && check.violations.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(255, 71, 87, 0.08)',
          border: '1px solid rgba(255, 71, 87, 0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} className="text-danger" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--antd-error)' }}>架构合规拦截门异常告警 (OMO Rules Boundary)</h4>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6' }}>
              {check.violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 直写违规代码定位舱 */}
      {filteredViolations.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(255, 71, 87, 0.05)',
          border: '1px solid rgba(255, 71, 87, 0.25)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={16} className="text-danger" />
            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--antd-error)' }}>
              Direct-IO 违规代码深度定位舱 (AST Scan Violations)
            </h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {filteredViolations.map((v, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: 'var(--antd-warning)',
                      backgroundColor: 'rgba(255, 184, 0, 0.1)',
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}>
                      Line {v.line}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                      {v.file}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                    {v.detail}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'rgba(255, 71, 87, 0.7)', fontWeight: 600 }}>
                  CRITICAL BLOCK
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主面板内容分区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        
        {/* 左侧区域：活跃卡片 + B.D.S.K 董事会待审提案 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* OMO CARDS 活跃任务列表 */}
          <div className="services-section" style={{ margin: 0 }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>活跃治理卡片 (OMO CARDS)</h3>
                <span style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 242, 254, 0.1)',
                  color: 'var(--antd-primary)',
                  fontWeight: 600
                }}>
                  {cards.length}
                </span>
              </div>
              <button className="antd-btn" style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => openCardTask()}>
                <ClipboardList size={12} style={{ marginRight: '2px' }} />
                进入任务中心
              </button>
            </div>

            <div style={{ minHeight: '300px' }}>
              {filteredCards.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'rgba(255,255,255,0.45)' }}>
                  <CheckCircle2 size={36} style={{ marginBottom: '12px', strokeWidth: 1.5 }} className="text-muted" />
                  <p style={{ margin: 0, fontSize: '13px' }}>{hasGovernanceFilter ? '当前筛选下没有匹配的治理卡片。' : '当前没有活跃的治理卡片。系统处于洁净态。'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredCards.map(card => (
                    <div key={card.id} className="service-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 100px 80px',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: 'rgba(255, 255, 255, 0.015)'
                    }}>
                      {/* ID & Priority */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>#{card.id}</span>
                        <span style={{
                          width: 'fit-content',
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 700,
                          backgroundColor: card.priority.toLowerCase() === 'p0' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 184, 0, 0.15)',
                          color: card.priority.toLowerCase() === 'p0' ? 'var(--antd-error)' : 'var(--antd-warning)',
                          border: `1px solid ${card.priority.toLowerCase() === 'p0' ? 'rgba(255, 71, 87, 0.25)' : 'rgba(255, 184, 0, 0.25)'}`
                        }}>
                          {card.priority.toUpperCase()}
                        </span>
                      </div>

                      {/* Title */}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{card.title}</h4>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px' }}>
                          <span className="text-muted">域: {card.domain}</span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
                          <span className="text-muted">类型: {card.type}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        <span className="status-badge" style={{
                          backgroundColor: card.status === 'in_progress' ? 'rgba(22, 119, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: card.status === 'in_progress' ? 'var(--antd-primary)' : 'rgba(255, 255, 255, 0.65)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {card.status === 'in_progress' ? '进行中' : card.status}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="antd-btn"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          aria-label="查看相关任务"
                          title="在任务中心查看相关任务"
                          onClick={() => openCardTask(card.id)}
                        >
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* B.D.S.K 董事会待审提案舱 */}
          <div className="services-section animate-fade-in" style={{ 
            margin: 0, 
            background: 'linear-gradient(135deg, rgba(22, 119, 255, 0.03) 0%, rgba(0, 242, 254, 0.03) 100%)',
            border: '1px solid rgba(22, 119, 255, 0.15)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            backdropFilter: 'blur(4px)'
          }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} className="text-primary" />
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--antd-text-primary)' }}>
                  B.D.S.K 虚拟董事会待审提案舱 (Board Proposals)
                </h3>
                <span style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(22, 119, 255, 0.15)',
                  color: 'var(--antd-primary)',
                  fontWeight: 600
                }}>
                  {proposals.length}
                </span>
              </div>
            </div>

            {/* 提示或反馈 */}
            {(proposalSuccess || proposalError) && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: proposalSuccess ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                border: `1px solid ${proposalSuccess ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 69, 58, 0.2)'}`,
                color: proposalSuccess ? 'var(--antd-success)' : 'var(--antd-error)'
              }}>
                <span>{proposalSuccess || proposalError}</span>
                <button 
                  onClick={() => { setProposalSuccess(null); setProposalError(null); }}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div style={{ minHeight: '180px' }}>
              {filteredProposals.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'rgba(255,255,255,0.45)' }}>
                  <ShieldCheck size={36} style={{ marginBottom: '12px', strokeWidth: 1.5 }} className="text-success" />
                  <p style={{ margin: 0, fontSize: '13px' }}>{hasGovernanceFilter ? '当前筛选下没有匹配的治理提案。' : '暂无待审批的架构提议或算力调整提案。'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredProposals.map(prop => (
                    <div key={prop.id} className="service-row animate-fade-in" style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr 220px',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: 'rgba(0, 0, 0, 0.15)'
                    }}>
                      {/* Type and Target Model */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          width: 'fit-content',
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontWeight: 700,
                          backgroundColor: 'rgba(22, 119, 255, 0.15)',
                          color: 'var(--antd-primary)',
                          border: '1px solid rgba(22, 119, 255, 0.25)',
                          textTransform: 'uppercase'
                        }}>
                          {prop.type.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
                          ID: {prop.id.slice(0, 8)}
                        </span>
                      </div>

                      {/* Content Details */}
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>
                          针对技术债务 <code>{prop.debt_id}</code> 的提议修复
                        </h4>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', flexWrap: 'wrap' }}>
                          {prop.target_model && (
                            <span className="text-muted">
                              目标模型: <strong style={{ color: 'var(--antd-primary)' }}>{prop.target_model}</strong>
                            </span>
                          )}
                          {prop.scope && (
                            <span className="text-muted">
                              作用域: <strong>{prop.scope}</strong>
                            </span>
                          )}
                          {prop.description && (
                            <span className="text-muted">{prop.description}</span>
                          )}
                          {prop.created_at && (
                            <span className="text-muted">创建时间: {prop.created_at}</span>
                          )}
                        </div>
                      </div>

                      {/* Approve / Reject Actions */}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="antd-btn"
                          aria-label={`承接提案任务 ${prop.id}`}
                          disabled={queueingProposalIds[prop.id] || approvingIds[prop.id] || rejectingIds[prop.id]}
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => void handleQueueProposal(prop.id)}
                        >
                          <ClipboardList size={12} />
                          {queueingProposalIds[prop.id] ? '...' : '承接任务'}
                        </button>
                        {/* Reject */}
                        <button 
                          className="antd-btn text-danger" 
                          disabled={approvingIds[prop.id] || rejectingIds[prop.id]}
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '11px',
                            background: 'rgba(255, 69, 58, 0.1)',
                            border: '1px solid rgba(255, 69, 58, 0.2)',
                            cursor: 'pointer'
                          }} 
                          onClick={() => handleRejectProposal(prop.id)}
                        >
                          {rejectingIds[prop.id] ? '...' : <X size={12} />}
                        </button>
                        {/* Approve */}
                        <button 
                          className="antd-btn text-success" 
                          disabled={approvingIds[prop.id] || rejectingIds[prop.id]}
                          style={{ 
                            padding: '4px 10px', 
                            fontSize: '11px',
                            background: 'rgba(52, 199, 89, 0.1)',
                            border: '1px solid rgba(52, 199, 89, 0.2)',
                            cursor: 'pointer'
                          }} 
                          onClick={() => handleApproveProposal(prop.id)}
                        >
                          {approvingIds[prop.id] ? '正在执行' : <Check size={12} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 右侧：C2G / SSOT 治理铁律看板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* OMO 任务统计仪表 */}
          <div className="services-section" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--antd-text-primary)' }}>治理效能与任务状态</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span className="text-muted">已消除技术债务与任务</span>
                  <span style={{ fontWeight: 600, color: 'var(--antd-success)' }}>
                    {status?.system?.completed_tasks ?? 0}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((status?.system?.completed_tasks ?? 10) / ((status?.system?.completed_tasks ?? 10) + (status?.system?.active_tasks ?? 2))) * 100)}%`,
                    backgroundColor: 'var(--antd-success)'
                  }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span className="text-muted">活跃治理任务</span>
                  <span style={{ fontWeight: 600, color: 'var(--antd-primary)' }}>
                    {status?.system?.active_tasks ?? 0}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((status?.system?.active_tasks ?? 2) / 10) * 100)}%`,
                    backgroundColor: 'var(--antd-primary)'
                  }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span className="text-muted">被阻塞任务</span>
                  <span style={{ fontWeight: 600, color: 'var(--antd-error)' }}>
                    {status?.system?.blocked_tasks ?? 0}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((status?.system?.blocked_tasks ?? 0) / 10) * 100)}%`,
                    backgroundColor: 'var(--antd-error)'
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* SSOT 治理铁律提示 */}
          <div className="services-section" style={{ margin: 0, padding: '20px', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.02) 0%, rgba(79, 172, 254, 0.02) 100%)', border: '1px dashed rgba(0, 242, 254, 0.2)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} className="text-primary" />
              <span>SSOT 架构保鲜三铁律</span>
            </h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '11px', lineHeight: '1.7', color: 'rgba(255,255,255,0.7)' }}>
              <li><strong>同一事实不在多处写</strong>：架构定义与状态只允许有一处真实源头，其他文档仅保持相对路径引用。</li>
              <li><strong>根仓库锁定版本</strong>：任何子模块变更后，需立即在根仓库中 add/commit 提交指针锁定，拒绝漂移。</li>
              <li><strong>变更强制门禁</strong>：所有代码库变更必须前置跑 ssot-guardian 检查，违规自动拦截并发出警示事件。</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
