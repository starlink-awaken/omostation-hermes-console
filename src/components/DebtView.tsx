import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, CheckCircle, AlertCircle, RefreshCw, ClipboardCheck } from 'lucide-react';
import './Dashboard.css';
import GovernanceDomainWorkbench from './GovernanceDomainWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface DebtItem {
  id: string;
  title: string;
  severity: string;
  lifecycle_state: string;
  opened_at: string;
  owner: string;
  dimension: string;
}

interface DebtViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type DebtClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesDebtFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function DebtView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: DebtViewProps) {
  const [data, setData] = useState<{ total: number; open: number; closed: number; items: DebtItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [queueingDebtId, setQueueingDebtId] = useState<string | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  // 过滤与搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedDimension, setSelectedDimension] = useState('all');

  const fetchDebt = async () => {
    try {
      const r = await fetch('/api/debt');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDebt();
  }, []);

  useEffect(() => {
    if (!focusTaskQuery) return;
    setSearchQuery(focusTaskQuery);
  }, [focusTaskQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDebt();
  };

  const handleQueueDebt = async (item: DebtItem) => {
    setQueueingDebtId(item.id);
    setQueueNotice(null);
    setQueueError(null);
    try {
      const response = await fetch(`/api/cockpit/debt/${encodeURIComponent(item.id)}/queue`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || `HTTP ${response.status}`);
      setQueueNotice(payload.created === false ? `任务已存在：${payload.id}` : `已承接为任务：${payload.id}`);
      openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: payload.id }, onNavigate, onOpenTarget);
    } catch (caught: any) {
      setQueueError(caught?.message || '债务任务承接失败');
    } finally {
      setQueueingDebtId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取技术债务账本 (Debt Ledger)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="antd-card" style={{ padding: '32px', textAlign: 'center', margin: '24px 0' }}>
        <p style={{ color: 'var(--antd-error)', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>⚠️ 加载债务数据失败</p>
        <p className="text-muted">{error}</p>
        <button onClick={handleRefresh} className="antd-btn" style={{ marginTop: '16px' }}>重试</button>
      </div>
    );
  }

  if (!data) return null;

  // 提取所有可用的维度
  const dimensions = ['all', ...Array.from(new Set(data.items.map(item => item.dimension)))];

  // 过滤计算
  const filteredItems = data.items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || item.severity.toLowerCase() === selectedSeverity.toLowerCase();
    const matchesDimension = selectedDimension === 'all' || item.dimension.toLowerCase() === selectedDimension.toLowerCase();

    return matchesSearch && matchesSeverity && matchesDimension;
  });
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedSeverity !== 'all' || selectedDimension !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('all');
    setSelectedDimension('all');
  };
  const focusDebtItems = [...filteredItems]
    .sort((left, right) => {
      const weight = (severity: string) => (
        severity.toLowerCase() === 'p0' ? 3
          : severity.toLowerCase() === 'p1' ? 2
            : severity.toLowerCase() === 'p2' ? 1
              : 0
      );
      return weight(right.severity) - weight(left.severity);
    })
    .slice(0, 4);
  const firstDebtItem = focusDebtItems[0] || data.items[0] || null;
  const openDebtCount = data.items.filter((item) => item.lifecycle_state === 'open').length;
  const debtClosureRows: DebtClosureRow[] = [
    {
      id: 'triage-priority',
      title: '高危债务与优先分诊',
      summary: '债务页首先要接住的是优先级，不然账本再全，用户还是得自己猜先处理哪个。',
      signal: firstDebtItem ? `${firstDebtItem.severity.toUpperCase()} · ${openDebtCount} open` : `open ${data.open}`,
      nextAction: firstDebtItem
        ? `优先围绕 ${firstDebtItem.title} 定位责任域和处理顺序，再决定回治理还是系统地图。`
        : '当前没有明显高危债务，抽查债务页到治理面的优先分诊链路。',
      statusTone: firstDebtItem ? 'degraded' : 'online',
      objectTarget: { tab: 'Debt', taskQuery: firstDebtItem?.id || 'debt-triage' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstDebtItem?.id || 'debt-triage' },
    },
    {
      id: 'governance-decision',
      title: '治理决策与责任归位',
      summary: '债务不是简单记账，很多高危项最后都要回治理页重新排优先级和责任归位。',
      signal: firstDebtItem ? `${firstDebtItem.owner} · ${firstDebtItem.dimension}` : '待抽查治理链',
      nextAction: firstDebtItem
        ? `带着 ${firstDebtItem.title} 回 C2G 确认优先级、owner 和治理动作。`
        : '当前没有明显待治理债务，抽查债务到治理决策页的承接链路。',
      statusTone: firstDebtItem ? 'degraded' : 'online',
      objectTarget: { tab: 'C2G', taskQuery: firstDebtItem?.id || 'debt-governance' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstDebtItem?.owner || firstDebtItem?.id || 'debt-governance' },
    },
    {
      id: 'systemmap-impact',
      title: '系统地图影响回挂',
      summary: '真正棘手的债务要回系统地图确认影响的是项目、页面还是能力域，不然处理动作很容易漂在空中。',
      signal: firstDebtItem ? `${firstDebtItem.dimension} 维度` : '待抽查影响面',
      nextAction: firstDebtItem
        ? `把 ${firstDebtItem.title} 回挂到系统地图，确认它影响的是哪条路径和哪一层。`
        : '当前没有明显待回挂债务，抽查债务页到系统地图的影响面收口链路。',
      statusTone: firstDebtItem ? 'degraded' : 'online',
      objectTarget: { tab: 'SystemMap', pageId: 'Debt' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstDebtItem?.id || 'debt-systemmap' },
    },
    {
      id: 'task-closeout',
      title: '任务承接与长期跟踪',
      summary: '长期债务不进任务中心，就只会反复出现在账本里，处理永远靠记忆和口头同步。',
      signal: firstDebtItem ? `待承接 ${firstDebtItem.id}` : `closed ${data.closed}`,
      nextAction: firstDebtItem
        ? `把 ${firstDebtItem.title} 的处理动作正式送进任务中心持续跟。`
        : '当前没有明显待承接债务，抽查债务到任务中心的 closeout 链路。',
      statusTone: firstDebtItem ? 'degraded' : 'online',
      objectTarget: { tab: 'Debt', taskQuery: firstDebtItem?.id || 'debt-closeout' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstDebtItem?.id || 'debt-closeout' },
    },
  ];
  const focusedDebtCard = (() => {
    const matchedDebt = data.items.find((item) => (
      matchesDebtFocusQuery([item.id, item.title, item.severity, item.lifecycle_state, item.owner, item.dimension], focusTaskQuery)
    ));
    if (matchedDebt) {
      return {
        kicker: '债务项',
        title: matchedDebt.title,
        detail: `${matchedDebt.severity.toUpperCase()} · ${matchedDebt.dimension} · ${matchedDebt.lifecycle_state} · owner ${matchedDebt.owner}`,
        objectTarget: { tab: 'Debt', taskQuery: matchedDebt.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedDebt.id },
      };
    }

    const matchedClosure = debtClosureRows.find((row) => (
      matchesDebtFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '债务闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'Debt') {
      return {
        kicker: '当前页面',
        title: '技术债务',
        detail: '这页负责把债务账本、影响维度和治理去向串起来，不让债务只剩表格筛选。',
        objectTarget: { tab: 'SystemMap', pageId: 'Debt' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Debt' },
      };
    }

    return null;
  })();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <GovernanceDomainWorkbench currentPage="Debt" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <ActionSurfacePanel
        title="债务处理区"
        subtitle="先筛债务，再快速回治理、系统地图和领域页，不用自己在导航里来回找。"
        statusText={`open ${data.open} / total ${data.total}`}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        items={[
          {
            id: 'c2g',
            title: '回治理决策',
            detail: '高危债务需要重新排优先级或进入治理卡片时，直接回 C2G。',
            actionLabel: '去 C2G',
            actionType: 'navigate',
            actionValue: 'C2G',
            actionTarget: { tab: 'C2G', taskQuery: focusTaskQuery || firstDebtItem?.id || 'Debt' },
          },
          {
            id: 'system-map',
            title: '看项目影响',
            detail: '债务要确认影响面时，回系统地图看项目组合和能力缺口。',
            actionLabel: '去系统地图',
            actionType: 'navigate',
            actionValue: 'SystemMap',
            actionTarget: { tab: 'SystemMap', taskQuery: focusTaskQuery || firstDebtItem?.id || 'Debt' },
          },
          {
            id: 'domain-apps',
            title: '查领域挂载',
            detail: '安全或运行类债务常常会落到领域应用，直接去应用中心处理。',
            actionLabel: '去应用中心',
            actionType: 'navigate',
            actionValue: 'DomainApps',
            actionTarget: { tab: 'DomainApps', taskQuery: focusTaskQuery || firstDebtItem?.dimension || firstDebtItem?.id || 'Debt' },
          },
          {
            id: 'copy-filter',
            title: '复制高危筛选提示',
            detail: '先用一个固定搜索词起步，减少人工翻表的时间。',
            actionLabel: '复制筛选词',
            actionType: 'copy',
            actionValue: 'severity:p0 lifecycle_state:open',
          },
        ]}
      />

      {(queueNotice || queueError) && (
        <div role={queueError ? 'alert' : 'status'} aria-live="polite" style={{ marginTop: 12 }}>
          <span className={`status-badge ${queueError ? 'degraded' : 'online'}`}>
            {queueError || queueNotice}
          </span>
        </div>
      )}

      {focusedDebtCard && (
        <section className="services-section overview-ops-panel" aria-label="当前债务承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前债务承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成债务面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedDebtCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedDebtCard.title}</strong>
              <p>{focusedDebtCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开债务焦点对象 ${focusedDebtCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedDebtCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <ShieldAlert size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开债务焦点任务 ${focusedDebtCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedDebtCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <CheckCircle size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" role="region" aria-label="债务闭环总表">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>债务闭环总表</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把高危分诊、治理决策、系统地图影响和任务承接并排摆出来，债务页才不只是账本和筛选器。
            </p>
          </div>
          <span className="status-badge online">{debtClosureRows.length} 条闭环</span>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {debtClosureRows.map((row) => (
            <article
              key={`debt-closure-${row.id}`}
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
                  aria-label={`打开债务闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ShieldAlert size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开债务闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <CheckCircle size={14} />
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
            <h2 style={{ fontSize: 16, margin: 0 }}>债务承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把高危债务、影响维度和后续入口前置，避免债务页只剩筛选表格。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">open {data.open}</span>
            <span className="status-badge online">closed {data.closed}</span>
            <span className="status-badge degraded">focus {focusDebtItems.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>优先债务</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先处理最该收口的债务项，再决定回治理、领域或系统地图。</p>
            </div>
            {focusDebtItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有需要额外处理的债务。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {focusDebtItems.map((item) => (
                  <div key={`debt-${item.id}`} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.severity.toUpperCase()} · {item.dimension} · {item.lifecycle_state}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>owner {item.owner}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>债务去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>债务账本本身不是终点，真正处理还要回治理、系统地图和任务中心。</p>
            </div>
            {[
              { id: 'C2G', label: '治理决策', reason: '重新排优先级或进入治理卡片。', aria: '打开债务承接到治理页' },
              { id: 'SystemMap', label: '系统地图', reason: '确认债务影响的项目、页面与能力缺口。', aria: '打开债务承接到系统地图' },
              { id: 'TaskCenter', label: '任务中心', reason: '把长期债务变成可跟踪的执行项。', aria: '打开债务承接到任务中心' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => onNavigate?.(page.id)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <ShieldAlert size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>
      
      {/* Overview stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>总登记债务</h3>
            <p className="stat-value" style={{ textShadow: '0 0 8px rgba(0, 242, 254, 0.2)' }}>{data.total}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-error)' }}>
          <div className="stat-info">
            <h3>未解决 (Open)</h3>
            <p className="stat-value" style={{ color: 'var(--antd-error)', textShadow: '0 0 8px rgba(255, 71, 87, 0.2)' }}>{data.open}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div className="stat-info">
            <h3>已消除 (Closed)</h3>
            <p className="stat-value" style={{ color: 'var(--antd-success)', textShadow: '0 0 8px rgba(5, 243, 162, 0.2)' }}>{data.closed}</p>
          </div>
        </div>
      </div>

      {/* 搜索与过滤控制条 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* 搜索 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'rgba(255, 255, 255, 0.45)' }} />
          <input
            type="text"
            placeholder="搜索债务标题、ID 或负责人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* 过滤 */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* 按严重性 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>级别:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="all">全部级别</option>
              <option value="p0">P0 (高危)</option>
              <option value="p1">P1 (中危)</option>
              <option value="p2">P2 (低危)</option>
            </select>
          </div>

          {/* 按维度 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>维度:</span>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {dimensions.map(dim => (
                <option key={dim} value={dim}>
                  {dim === 'all' ? '全部维度' : dim.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 刷新 */}
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="antd-btn" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="antd-btn"
            aria-label="清除债务筛选"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            <span>清除筛选</span>
          </button>
        </div>
      </div>

      <div className="text-muted" style={{ margin: '10px 0', fontSize: 12 }} aria-live="polite">
        当前显示 {filteredItems.length} / {data.items.length} 条债务
      </div>

      {/* Debt Table list */}
      <div className="services-list" style={{ marginTop: '0' }}>
        <table className="services-table" aria-label="技术债务清单列表">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">债务标题</th>
              <th scope="col">架构维度</th>
              <th scope="col">等级</th>
              <th scope="col">治理状态</th>
              <th scope="col">所有者</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.45)' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  没有找到符合过滤条件的债务项
                </td>
              </tr>
            ) : (
              filteredItems.slice(0, 50).map(item => (
                <tr key={item.id} className="service-row">
                  <td className="text-muted" style={{ fontFamily: 'monospace' }}>{item.id}</td>
                  <td style={{ fontWeight: 500, color: 'var(--antd-text-primary)' }}>{item.title}</td>
                  <td>
                    <span style={{ 
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(0, 242, 254, 0.06)',
                      color: 'var(--antd-primary)',
                      border: '1px solid rgba(0, 242, 254, 0.15)'
                    }}>
                      {item.dimension}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      backgroundColor: item.severity.toLowerCase() === 'p0' ? 'rgba(255, 71, 87, 0.15)' : item.severity.toLowerCase() === 'p1' ? 'rgba(255, 184, 0, 0.15)' : 'rgba(22, 119, 255, 0.1)',
                      color: item.severity.toLowerCase() === 'p0' ? 'var(--antd-error)' : item.severity.toLowerCase() === 'p1' ? 'var(--antd-warning)' : 'var(--antd-primary)',
                      border: `1px solid ${item.severity.toLowerCase() === 'p0' ? 'rgba(255,71,87,0.25)' : item.severity.toLowerCase() === 'p1' ? 'rgba(255,184,0,0.25)' : 'rgba(0,242,254,0.2)'}`
                    }}>
                      {item.severity.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ 
                      color: item.lifecycle_state === 'closed' ? 'var(--antd-success)' : 'var(--antd-warning)' 
                    }}>
                      {item.lifecycle_state === 'closed' ? <CheckCircle size={12} style={{ marginRight: '4px' }} /> : <ShieldAlert size={12} style={{ marginRight: '4px' }} />}
                      {item.lifecycle_state}
                    </span>
                  </td>
                  <td className="text-muted">{item.owner}</td>
                  <td>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`承接债务 ${item.title}`}
                      onClick={() => handleQueueDebt(item)}
                      disabled={queueingDebtId === item.id}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                    >
                      <ClipboardCheck size={13} />
                      <span>{queueingDebtId === item.id ? '承接中' : '承接任务'}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
