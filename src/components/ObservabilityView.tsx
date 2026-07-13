import { useEffect, useMemo, useState } from 'react';
import './Dashboard.css';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import PlatformControlWorkbench from './PlatformControlWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface ObservabilityViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesObservabilityFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function ObservabilityView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: ObservabilityViewProps) {
  const [archData, setArchData] = useState<any>(null);
  const [bosData, setBosData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/arch-health').then((response) => (response.ok ? response.json() : null)),
      fetch('/api/bos/metrics').then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([arch, bos]) => {
        setArchData(arch);
        setBosData(bos);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  const observabilityBacklog = useMemo(() => {
    const domains = Array.isArray(bosData?.domains) ? bosData.domains : [];
    const degradedDomains = domains.filter((domain: any) => (domain.error || 0) > 0 || (domain.avg_latency || 0) >= 700);
    const hottestDomains = (degradedDomains.length ? degradedDomains : domains).slice(0, 3);
    const governanceHealth = archData?.governance?.health || 'unknown';
    const gitDirty = archData?.git?.status && archData.git.status !== 'clean';
    return {
      degradedDomains: hottestDomains,
      governanceHealth,
      gitDirty,
      healthScore: archData?.system?.health_score ?? null,
    };
  }, [archData, bosData]);

  const focusedObservabilityCard = useMemo(() => {
    const domains = Array.isArray(bosData?.domains) ? bosData.domains : [];
    const matchedDomain = domains.find((domain: any) => (
      matchesObservabilityFocusQuery([
        domain.domain,
        String(domain.error ?? ''),
        String(domain.avg_latency ?? ''),
      ], focusTaskQuery)
    ));
    if (matchedDomain) {
      return {
        kicker: '异常域',
        title: matchedDomain.domain,
        detail: `失败 ${matchedDomain.error || 0} 次 · 延迟 ${matchedDomain.avg_latency || 0} ms，先追日志，再回网格核对路由。`,
        objectTarget: { tab: 'Observability', taskQuery: matchedDomain.domain },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedDomain.domain },
      };
    }

    if (matchesObservabilityFocusQuery([
      archData?.governance?.health,
      archData?.git?.status,
      String(archData?.system?.health_score ?? ''),
    ], focusTaskQuery)) {
      return {
        kicker: '健康与治理',
        title: '系统健康与治理保鲜',
        detail: `健康度 ${archData?.system?.health_score ?? 'N/A'} · 治理 ${archData?.governance?.health || 'unknown'} · Git ${archData?.git?.status || 'unknown'}`,
        objectTarget: { tab: 'Observability', taskQuery: focusTaskQuery || 'health' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'health' },
      };
    }

    if (focusPageId === 'Observability') {
      return {
        kicker: '当前页面',
        title: '运行可观测',
        detail: '这页负责把异常域、治理保鲜和跨页追证据串成一个观测面，不让问题只剩指标数字。',
        objectTarget: { tab: 'SystemMap', pageId: 'Observability' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Observability' },
      };
    }

    return null;
  }, [archData, bosData, focusPageId, focusTaskQuery]);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在聚合系统级多维观测数据...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PlatformControlWorkbench currentPage="Observability" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="观测动作区"
        subtitle="先看异常和健康，再进入更具体的性能、日志和告警工作面。"
        statusText={bosData?.summary?.total_calls ? `BOS ${bosData.summary.total_calls} calls` : '等待观测数据'}
        onNavigate={onNavigate}
        items={[
          {
            id: 'perf',
            title: '追性能瓶颈',
            detail: '当延迟和吞吐开始波动时，直接切到性能页看趋势和热点。',
            actionLabel: '看性能页',
            actionType: 'navigate',
            actionValue: 'Performance',
          },
          {
            id: 'logs',
            title: '查日志证据',
            detail: '遇到错误率上升或域流量异常时，去日志页追具体报错。',
            actionLabel: '看日志页',
            actionType: 'navigate',
            actionValue: 'LogViewer',
          },
          {
            id: 'alerts',
            title: '回告警中心',
            detail: '如果已经出现健康度下降，直接回告警中心收敛需要处理的项。',
            actionLabel: '看告警页',
            actionType: 'navigate',
            actionValue: 'AlertCenter',
          },
          {
            id: 'mesh',
            title: '排 BOS 网格',
            detail: '域级流量不稳时，切去 MCP 网格看路由和下游服务。',
            actionLabel: '去网格页',
            actionType: 'navigate',
            actionValue: 'McpMesh',
          },
        ]}
      />

      {focusedObservabilityCard && (
        <section className="services-section overview-ops-panel" aria-label="当前观测承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前观测承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成观测面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedObservabilityCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedObservabilityCard.title}</strong>
              <p>{focusedObservabilityCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开观测焦点对象 ${focusedObservabilityCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedObservabilityCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Activity size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开观测焦点任务 ${focusedObservabilityCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedObservabilityCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <ShieldCheck size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>观测承接工作台</h2>
            <p className="text-muted">把异常域、治理保鲜和跨页承接摆在一起，别只盯着数字看热闹。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">异常域 {observabilityBacklog.degradedDomains.length}</span>
            <span className={`status-badge ${observabilityBacklog.governanceHealth === 'fresh' ? 'online' : 'degraded'}`}>
              治理 {observabilityBacklog.governanceHealth}
            </span>
            <span className={`status-badge ${observabilityBacklog.gitDirty ? 'degraded' : 'online'}`}>
              Git {observabilityBacklog.gitDirty ? 'dirty' : 'clean'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>异常域追踪</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>优先处理报错或高延迟的 BOS 域，先看网格再看日志。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.('McpMesh')}>
                <Activity size={14} />
                <span>去网格页</span>
              </button>
            </div>
            {observabilityBacklog.degradedDomains.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有明显异常域。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {observabilityBacklog.degradedDomains.map((domain: any) => (
                  <button
                    key={`domain-${domain.domain}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看异常域 ${domain.domain}`}
                    onClick={() => onNavigate?.('LogViewer')}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{domain.domain}</strong>
                      <p>失败 {domain.error || 0} 次 · 延迟 {domain.avg_latency || 0} ms</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>先看日志，再回网格核对路由。</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>健康与治理保鲜</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>健康度、Git 差异和治理 freshness 一旦偏离，就该回系统地图和告警中心。</p>
            </div>
            <div className="action-surface-item">
              <div>
                <strong>系统健康度 {observabilityBacklog.healthScore ?? 'N/A'}</strong>
                <p>治理 {observabilityBacklog.governanceHealth} · Git {observabilityBacklog.gitDirty ? 'dirty' : 'clean'}</p>
              </div>
              <button type="button" className="antd-btn small" aria-label="打开观测承接到告警中心" onClick={() => onNavigate?.('AlertCenter')}>
                告警中心
              </button>
            </div>
            <button
              type="button"
              className="action-surface-item"
              aria-label="打开观测承接到系统地图"
              onClick={() => onNavigate?.('SystemMap')}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <div>
                <strong>回系统地图收口</strong>
                <p>把观测异常挂回全站功能缺口和项目覆盖面。</p>
              </div>
              <ShieldCheck size={14} />
            </button>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>下一步页面</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>观测问题一般会流向性能、日志、告警和网格，不再靠脑补跳转。</p>
            </div>
            {[
              { id: 'Performance', label: '性能页', reason: '看趋势、热点和耗时波动。', aria: '打开观测承接到性能页' },
              { id: 'LogViewer', label: '日志页', reason: '追具体错误和时间点。', aria: '打开观测承接到日志页' },
              { id: 'AlertCenter', label: '告警中心', reason: '收敛需要处理的异常项。', aria: '打开观测承接到告警页' },
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
                <Activity size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}>
            <Activity size={18} aria-hidden="true" className="text-accent" />
            BOS I0 网格链路流量
          </h3>

          {bosData && bosData.summary ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>总调用次数</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{bosData.summary.total_calls}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>平均延迟 (ms)</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{bosData.summary.avg_latency}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)', marginBottom: '2px' }}>请求成功率</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-success)' }}>
                  {bosData.summary.total_calls ? Math.round((bosData.summary.success_count / bosData.summary.total_calls) * 100) : 0}%
                </div>
              </div>
            </div>
          ) : <p className="text-muted" style={{ fontSize: '13px' }}>暂无活跃流量数据</p>}
        </div>

        <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}>
            <ShieldCheck size={18} aria-hidden="true" className="text-success" />
            系统架构健康度
          </h3>

          {archData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>系统健康度评分</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--antd-primary)' }}>
                  {archData.system?.health_score || 'N/A'}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>Git (ecos) 代码状态</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: archData.git?.status === 'clean' ? 'var(--antd-success)' : 'var(--antd-warning)' }}>
                  {archData.git?.status === 'clean' ? 'Clean' : `${archData.git?.uncommitted} Diff`}
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', gridColumn: 'span 2' }}>
                <div style={{ fontSize: '11px', color: 'var(--antd-text-secondary)' }}>治理审计周期保鲜</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: archData.governance?.health === 'fresh' ? 'var(--antd-success)' : 'var(--antd-warning)' }}>
                  {archData.governance?.health === 'fresh' ? 'Fresh' : archData.governance?.health || 'N/A'}
                </div>
              </div>
            </div>
          ) : <p className="text-muted" style={{ fontSize: '13px' }}>暂无架构评估数据</p>}
        </div>
      </div>

      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>BOS 域名流量分布明细</h3>
        </div>

        <div className="services-list">
          {bosData?.domains?.length > 0 ? (
            <table className="services-table" aria-label="BOS 路由域名流量分布表">
              <thead>
                <tr>
                  <th scope="col">BOS 域名 (Domain)</th>
                  <th scope="col">总调用量</th>
                  <th scope="col">成功数 (Success)</th>
                  <th scope="col">失败数 (Error)</th>
                  <th scope="col">平均延迟 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {bosData.domains.map((domain: any) => (
                  <tr key={domain.domain} className="service-row">
                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{domain.domain}</td>
                    <td>{domain.total}</td>
                    <td style={{ color: 'var(--antd-success)' }}>{domain.success}</td>
                    <td style={{ color: domain.error > 0 ? 'var(--antd-error)' : 'inherit' }}>{domain.error}</td>
                    <td>{domain.avg_latency} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted" style={{ padding: '24px', fontSize: '13px', textAlign: 'center' }}>暂无域名流量分布数据</p>
          )}
        </div>
      </div>
    </div>
  );
}
