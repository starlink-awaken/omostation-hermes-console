import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Signal,
  Shield,
} from 'lucide-react';
import GovernanceDomainWorkbench from './GovernanceDomainWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface DomainHealth {
  id: string;
  name: string;
  exists: boolean;
  fresh: boolean;
  issue_count: number;
  issues: Array<{ level: string; message: string }>;
  has_state: boolean;
  has_status: boolean;
  signal_count: number;
  capabilities: string[];
}

interface HealthData {
  timestamp: string;
  total_domains: number;
  document_domains: number;
  healthy_count: number;
  unhealthy_count: number;
  health_rate: string;
  domains: DomainHealth[];
  data_quality?: 'live' | 'unavailable' | string;
  degraded_reasons?: string[];
  configuration?: { path?: string; exists?: boolean; next_action?: string };
}

interface TrendData {
  total_records: number;
  date_range: { start: string; end: string };
  trends: Record<string, {
    health_rate: number;
    avg_issues: number;
    max_issues: number;
    avg_signals: number;
    max_signals: number;
    min_signals: number;
    record_count: number;
  }>;
  anomalies: Array<{ domain: string; type: string; severity: string; message: string }>;
  data_quality?: 'live' | 'unavailable' | string;
  degraded_reasons?: string[];
}

interface SignalData {
  total_signals: number;
  by_domain: Record<string, number>;
  by_type: Record<string, number>;
  patterns: Array<{ pattern: string; level: string; message: string }>;
  risks: Array<{ risk: string; severity: string; message: string }>;
  data_quality?: 'live' | 'unavailable' | string;
  degraded_reasons?: string[];
}

interface L4HealthViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesL4FocusQuery(values: Array<string | number | null | undefined>, query?: string | null) {
  if (!query) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

export default function L4HealthView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: L4HealthViewProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const degradedReasons = Array.from(new Set([
    ...(healthData?.degraded_reasons || []),
    ...(trendData?.degraded_reasons || []),
    ...(signalData?.degraded_reasons || []),
  ]));
  const unhealthyDomains = (healthData?.domains || [])
    .filter((domain) => !domain.fresh || domain.issue_count > 0 || !domain.has_state || !domain.has_status)
    .slice(0, 4);
  const focusRisks = (signalData?.risks || []).slice(0, 3);
  const focusedL4Card = (() => {
    const matchedDomain = (healthData?.domains || []).find((domain) => (
      matchesL4FocusQuery(
        [domain.id, domain.name, domain.issue_count, domain.signal_count, domain.capabilities.join(',')],
        focusTaskQuery,
      )
    ));
    if (matchedDomain) {
      return {
        kicker: '域对象',
        title: matchedDomain.name || matchedDomain.id,
        detail: `问题 ${matchedDomain.issue_count} · 信号 ${matchedDomain.signal_count} · ${matchedDomain.fresh ? 'fresh' : 'stale'} · ${matchedDomain.has_state && matchedDomain.has_status ? 'KEMS 完整' : 'KEMS 缺口'}`,
        objectTarget: { tab: 'L4Health', taskQuery: matchedDomain.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedDomain.id },
      };
    }

    const matchedRisk = (signalData?.risks || []).find((risk) => (
      matchesL4FocusQuery([risk.risk, risk.severity, risk.message], focusTaskQuery)
    ));
    if (matchedRisk) {
      return {
        kicker: '风险信号',
        title: matchedRisk.risk || '域风险',
        detail: `${matchedRisk.severity} · ${matchedRisk.message}`,
        objectTarget: { tab: 'Observability', taskQuery: matchedRisk.risk || matchedRisk.message },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedRisk.risk || matchedRisk.message },
      };
    }

    if (focusPageId === 'L4Health') {
      return {
        kicker: '当前页面',
        title: 'L4 域健康',
        detail: '这页负责把异常域、域级风险和后续应用中心/系统地图/观测页承接串起来，不只是做健康表格。',
        objectTarget: { tab: 'SystemMap', pageId: 'L4Health' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'L4Health' },
      };
    }

    return null;
  })();

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取健康数据
      const healthResponse = await fetch('/api/l4/health');
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setHealthData(health);
      }

      // 获取趋势数据
      const trendResponse = await fetch('/api/l4/trend');
      if (trendResponse.ok) {
        const trend = await trendResponse.json();
        setTrendData(trend);
      }

      // 获取信号数据
      const signalResponse = await fetch('/api/l4/signals');
      if (signalResponse.ok) {
        const signal = await signalResponse.json();
        setSignalData(signal);
      }

      setLastUpdate(new Date().toLocaleString('zh-CN'));
    } catch (err) {
      setError('获取数据失败');
      console.error('Error fetching L4 health data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (fresh: boolean) => {
    return fresh ? (
      <CheckCircle size={16} className="text-success" />
    ) : (
      <XCircle size={16} className="text-danger" />
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#e74c3c';
      case 'error': return '#e74c3c';
      case 'warning': return '#f39c12';
      case 'info': return '#3498db';
      default: return '#95a5a6';
    }
  };

  if (loading && !healthData) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在加载 L4 域健康数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <XCircle size={24} className="text-danger" />
        <p>{error}</p>
        <button onClick={fetchData} className="antd-btn">
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="l4-health-view">
      <GovernanceDomainWorkbench currentPage="L4Health" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="域健康处理区"
        subtitle="发现域异常后，直接跳到领域应用、系统地图或观测页继续收敛。"
        statusText={healthData?.data_quality === 'unavailable' ? '域健康读数不可用' : healthData ? `healthy ${healthData.healthy_count} / ${healthData.total_domains}` : '等待域健康数据'}
        onNavigate={onNavigate}
        items={[
          {
            id: 'domain-apps',
            title: '回领域应用',
            detail: '先看哪些领域应用的运行态和安全门正在拖累域健康。',
            actionLabel: '去应用中心',
            actionType: 'navigate',
            actionValue: 'DomainApps',
          },
          {
            id: 'system-map',
            title: '看系统地图',
            detail: '域问题已经影响项目组合或能力覆盖时，回系统地图确认影响范围。',
            actionLabel: '去系统地图',
            actionType: 'navigate',
            actionValue: 'SystemMap',
          },
          {
            id: 'observability',
            title: '看观测页',
            detail: '域问题需要更细的信号和链路证据时，去观测页继续排查。',
            actionLabel: '去观测页',
            actionType: 'navigate',
            actionValue: 'Observability',
          },
          {
            id: 'copy-check',
            title: '复制域巡检提示',
            detail: '先用一条固定检查提示词，减少每次从零开始想排查方向。',
            actionLabel: '复制提示',
            actionType: 'copy',
            actionValue: '检查该域的 freshness、issue_count、signal_count、patterns 与 risks',
          },
        ]}
      />

      {focusedL4Card && (
        <section className="services-section overview-ops-panel" aria-label="当前域健康承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前域健康承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、搜索或任务抛来的上下文，直接翻成域健康面当前该承接的域或风险对象。
              </p>
            </div>
            <span className="status-badge online">{focusedL4Card.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedL4Card.title}</strong>
              <p>{focusedL4Card.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开域健康焦点对象 ${focusedL4Card.title}`}
                onClick={() => openCockpitNavigationTarget(focusedL4Card.objectTarget, onNavigate, onOpenTarget)}
              >
                <Shield size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开域健康焦点任务 ${focusedL4Card.title}`}
                onClick={() => openCockpitNavigationTarget(focusedL4Card.taskTarget, onNavigate, onOpenTarget)}
              >
                <AlertTriangle size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>域健康承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              先挑最不健康的域和最危险的信号，再决定回应用中心、系统地图还是观测页继续收口。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">异常域 {unhealthyDomains.length}</span>
            <span className="status-badge degraded">风险 {focusRisks.length}</span>
            <span className="status-badge online">健康率 {healthData?.health_rate || 'N/A'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>待处理域</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>优先处理 freshness 失效、问题数较多或 KEMS 不完整的域。</p>
            </div>
            {unhealthyDomains.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有需要优先处理的域。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {unhealthyDomains.map((domain) => (
                  <button
                    key={`domain-${domain.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看域健康 ${domain.id}`}
                    onClick={() => onNavigate?.(domain.has_status ? 'DomainApps' : 'SystemMap')}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{domain.name || domain.id}</strong>
                      <p>问题 {domain.issue_count} · 信号 {domain.signal_count} · {domain.fresh ? '需补结构' : 'freshness 失效'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>点击后进入更适合承接该域问题的页面。</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>风险去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>风险和模式只负责提示，真正收口还要回领域应用、系统地图和观测页。</p>
            </div>
            {focusRisks.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                {focusRisks.map((risk, index) => (
                  <div key={`risk-${index}`} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{risk.risk || `风险 ${index + 1}`}</strong>
                      <p>{risk.message}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>严重度 {risk.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {[
              { id: 'DomainApps', label: '应用中心', reason: '从领域应用运行态与安全门核对域问题。', aria: '打开域健康承接到应用中心' },
              { id: 'SystemMap', label: '系统地图', reason: '确认域问题是否已扩散到项目组合或能力覆盖。', aria: '打开域健康承接到系统地图' },
              { id: 'Observability', label: '观测页', reason: '继续查看更细的信号、模式与运行证据。', aria: '打开域健康承接到观测页' },
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
                <Shield size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      {degradedReasons.length > 0 && (
        <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', marginBottom: 20, border: '1px solid rgba(255, 184, 0, 0.35)', borderRadius: 'var(--antd-radius-md)', background: 'rgba(255, 184, 0, 0.08)', color: 'var(--antd-warning)' }}>
          <AlertTriangle size={18} aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <strong>L4 健康数据未完成读取</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--antd-text-secondary)', fontSize: 12 }}>{degradedReasons.join('；')}</p>
            {healthData?.configuration?.next_action && <p style={{ margin: '4px 0 0', color: 'var(--antd-text-secondary)', fontSize: 12 }}>{healthData.configuration.next_action}</p>}
          </div>
          <button onClick={fetchData} className="antd-btn" aria-label="重试 L4 健康数据">重试</button>
        </div>
      )}

      {/* 概览卡片 */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
            <Activity size={20} />
          </div>
          <div className="stat-info">
            <h3>总域数</h3>
            <p className="stat-value">{healthData?.total_domains || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <h3>健康域数</h3>
            <p className="stat-value">{healthData?.healthy_count || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-danger" aria-hidden="true">
            <XCircle size={20} />
          </div>
          <div className="stat-info">
            <h3>不健康域数</h3>
            <p className="stat-value">{healthData?.unhealthy_count || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent" aria-hidden="true">
            <Shield size={20} />
          </div>
          <div className="stat-info">
            <h3>健康率</h3>
            <p className="stat-value">{healthData?.health_rate || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* 域健康状态表格 */}
      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px' }}>域健康状态</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#95a5a6' }}>
              最后更新: {lastUpdate}
            </span>
            <button
              onClick={fetchData}
              className="antd-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={14} />
              刷新
            </button>
          </div>
        </div>

        <div className="services-list">
          <table className="services-table">
            <thead>
              <tr>
                <th scope="col">域 ID</th>
                <th scope="col">名称</th>
                <th scope="col">状态</th>
                <th scope="col">问题数</th>
                <th scope="col">信号数</th>
                <th scope="col">Capabilities</th>
                <th scope="col">KEMS</th>
              </tr>
            </thead>
            <tbody>
              {healthData?.domains.map((domain) => (
                <tr key={domain.id} className="service-row">
                  <td className="font-medium" style={{ fontWeight: 500 }}>
                    {domain.id}
                  </td>
                  <td className="text-muted">{domain.name}</td>
                  <td>
                    <span className={`status-badge ${domain.fresh ? 'online' : 'offline'}`}>
                      {getStatusIcon(domain.fresh)}
                      <span style={{ marginLeft: '4px' }}>
                        {domain.fresh ? '健康' : '不健康'}
                      </span>
                    </span>
                  </td>
                  <td className="text-muted">{domain.issue_count}</td>
                  <td className="text-muted">{domain.signal_count}</td>
                  <td className="text-muted">{domain.capabilities.length}</td>
                  <td>
                    <span className={`status-badge ${domain.has_state && domain.has_status ? 'online' : 'offline'}`}>
                      {domain.has_state && domain.has_status ? '完整' : '不完整'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 趋势分析 */}
      {trendData && trendData.total_records > 0 && (
        <div className="services-section" style={{ marginTop: '20px' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px' }}>
              <TrendingUp size={16} style={{ marginRight: '8px' }} />
              趋势分析
            </h2>
            <span style={{ fontSize: '12px', color: '#95a5a6' }}>
              {trendData.total_records} 条记录
            </span>
          </div>

          {trendData.anomalies.length > 0 ? (
            <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
              <h4 style={{ marginBottom: '8px', color: '#856404' }}>
                <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                检测到异常
              </h4>
              {trendData.anomalies.map((anomaly, index) => (
                <div key={index} style={{ marginBottom: '4px', fontSize: '14px', color: '#856404' }}>
                  • {anomaly.message}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px', background: '#d4edda', borderRadius: '4px', border: '1px solid #28a745' }}>
              <span style={{ color: '#155724' }}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                未发现异常
              </span>
            </div>
          )}
        </div>
      )}

      {/* 信号分析 */}
      {signalData && (
        <div className="services-section" style={{ marginTop: '20px' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px' }}>
              <Signal size={16} style={{ marginRight: '8px' }} />
              信号分析
            </h2>
            <span style={{ fontSize: '12px', color: '#95a5a6' }}>
              {signalData.total_signals} 个信号
            </span>
          </div>

          {/* 按域分布 */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>按域分布</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {Object.entries(signalData.by_domain).map(([domain, count]) => (
                <div
                  key={domain}
                  style={{
                    padding: '8px 12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{domain}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2c3e50' }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 检测到的模式 */}
          {signalData.patterns.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>检测到的模式</h4>
              {signalData.patterns.map((pattern, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: getSeverityColor(pattern.level) }}>
                    {pattern.level}
                  </span>
                  <span style={{ fontSize: '14px' }}>{pattern.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* 风险评估 */}
          {signalData.risks.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>风险评估</h4>
              {signalData.risks.map((risk, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    background: '#f8d7da',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #f5c6cb',
                  }}
                >
                  <AlertTriangle size={16} style={{ color: '#721c24' }} />
                  <span style={{ fontSize: '14px', color: '#721c24' }}>{risk.message}</span>
                </div>
              ))}
            </div>
          )}

          {signalData.risks.length === 0 && (
            <div style={{ padding: '12px', background: '#d4edda', borderRadius: '4px', border: '1px solid #28a745' }}>
              <span style={{ color: '#155724' }}>
                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                未发现风险
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
