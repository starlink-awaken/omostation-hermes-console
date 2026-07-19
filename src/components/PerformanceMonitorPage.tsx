import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Copy, Cpu, HardDrive, RefreshCw, Wifi } from 'lucide-react';
import ActionSurfacePanel from './ActionSurfacePanel';
import LineChart from './charts/LineChart';
import AreaChart from './charts/AreaChart';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import RuntimeOpsWorkbench from './RuntimeOpsWorkbench';

interface MetricData {
  timestamp: string;
  value: number;
}

interface SystemMetrics {
  cpu: MetricData[];
  memory: MetricData[];
  disk: MetricData[];
  network: MetricData[];
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  cpu?: number | null;
  memory?: number | null;
  uptime?: string | number | null;
}

interface PerformanceMonitorPageProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type PerformanceClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesPerformanceFocusQuery(values: Array<string | number | null | undefined>, query?: string | null) {
  if (!query) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

async function readPerformanceResponse<T>(
  result: PromiseSettledResult<Response>,
  fallback: T,
): Promise<{ ok: boolean; data: T }> {
  if (result.status !== 'fulfilled' || !result.value.ok) return { ok: false, data: fallback };
  try {
    return { ok: true, data: await result.value.json() as T };
  } catch {
    return { ok: false, data: fallback };
  }
}

export default function PerformanceMonitorPage({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: PerformanceMonitorPageProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<'all' | ServiceStatus['status']>('all');
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskPending, setTaskPending] = useState(false);

  useEffect(() => {
    if (focusTaskQuery && services.some((service) => matchesPerformanceFocusQuery([service.name, service.status, service.cpu, service.memory, service.uptime], focusTaskQuery))) {
      setServiceQuery(focusTaskQuery);
    }
  }, [focusTaskQuery, services]);

  useEffect(() => {
    const fetchData = async () => {
      setRefreshing(true);
      setError(null);
      try {
        const [metricsResult, servicesResult] = await Promise.allSettled([
          fetch(`/api/metrics/system?range=${timeRange}`),
          fetch('/api/services/status'),
        ]);

        const [{ ok: metricsOk, data: metricsData }, { ok: servicesOk, data: servicesData }] = await Promise.all([
          readPerformanceResponse<SystemMetrics | null>(metricsResult, null),
          readPerformanceResponse<{ items?: ServiceStatus[] }> (servicesResult, { items: [] }),
        ]);
        setMetrics(metricsData);
        setServices(servicesData.items || []);
        const failures = [
          !metricsOk ? '系统指标' : null,
          !servicesOk ? '服务状态' : null,
        ].filter(Boolean);
        setError(failures.length > 0 ? `性能监控数据暂不可用：${failures.join('、')}` : null);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
        setError(error instanceof Error ? error.message : '性能监控数据暂不可用');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [timeRange, refreshToken]);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online': return '#27ae60';
      case 'offline': return '#e74c3c';
      case 'degraded': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online': return '在线';
      case 'offline': return '离线';
      case 'degraded': return '降级';
      default: return '未知';
    }
  };

  const filteredServices = services.filter((service) => {
    if (serviceStatusFilter !== 'all' && service.status !== serviceStatusFilter) return false;
    const query = serviceQuery.trim().toLowerCase();
    if (!query) return true;
    return [service.name, service.status, service.uptime]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const degradedServices = filteredServices.filter((service) => service.status !== 'online' || (service.cpu ?? 0) >= 80 || (service.memory ?? 0) >= 80);
  const hotServices = (degradedServices.length ? degradedServices : filteredServices).slice(0, 3);
  const leadPerformanceService = hotServices[0] || filteredServices[0] || null;
  const firstDegradedService = degradedServices[0] || null;
  const performanceTaskDraft = (() => {
    const serviceName = leadPerformanceService?.name || '性能监控';
    const statusText = leadPerformanceService ? getStatusText(leadPerformanceService.status) : '待确认';
    const cpuText = typeof leadPerformanceService?.cpu === 'number' ? `${leadPerformanceService.cpu}%` : '未提供';
    const memoryText = typeof leadPerformanceService?.memory === 'number' ? `${leadPerformanceService.memory}%` : '未提供';
    const title = `补齐性能页对 ${serviceName} 的承接`;
    const checklist = [
      `先看告警：确认 ${serviceName} 是否已经形成异常事件`,
      `再看日志：把 ${serviceName} 的报错、超时或资源抖动拉成证据`,
      `回任务中心：把 ${serviceName} 的持续治理动作挂成正式任务`,
    ];
    const description = leadPerformanceService
      ? `${serviceName} 当前状态 ${statusText}，CPU ${cpuText}，内存 ${memoryText}。这不是只看曲线，要把异常服务一路带回告警、日志和任务承接。`
      : '当前还没有明确的热点服务样本，先补一条性能异常承接链，保证后续问题不会只停在图表层。';
    const copyText = [
      `标题: ${title}`,
      `对象: ${serviceName}`,
      `任务描述: ${description}`,
      '建议动作:',
      ...checklist.map((item, index) => `${index + 1}. ${item}`),
      '验收标准:',
      `- ${serviceName} 的性能异常已进入告警或日志证据链`,
      `- TaskCenter 可直接检索 ${serviceName} 的性能治理任务`,
      '- 性能页不再只是图表展示，而有明确后续去向',
    ].join('\n');

    return {
      title,
      description,
      checklist,
      copyText,
      taskTarget: { tab: 'TaskCenter', taskQuery: serviceName },
      alertTarget: { tab: 'AlertCenter', taskQuery: serviceName },
      logTarget: { tab: 'LogViewer', taskQuery: serviceName },
    };
  })();
  const createPerformanceTask = async () => {
    const serviceName = leadPerformanceService?.name || '性能监控';
    setTaskPending(true);
    setTaskError(null);
    setDraftNotice(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: performanceTaskDraft.title,
          description: performanceTaskDraft.description,
          priority: firstDegradedService ? 'high' : 'medium',
          risk_level: 'L1',
          evidence_required: ['性能指标时间点', '告警或日志证据', '根因与处理结果', 'task closeout'],
          tags: ['performance', 'runtime-governance'],
          source: {
            type: 'cockpit.performance-monitor',
            id: serviceName,
            title: '性能监控',
            target: { tab: 'Performance', taskQuery: serviceName },
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '性能任务登记失败');
      setDraftNotice(`已登记性能治理任务：${payload.title || serviceName}`);
      if (payload.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: payload.id }, onNavigate, onOpenTarget);
    } catch (taskRequestError) {
      setTaskError(taskRequestError instanceof Error ? taskRequestError.message : '性能任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };
  const performanceClosureRows: PerformanceClosureRow[] = [
    {
      id: 'hotspot-triage',
      title: '热点服务与异常分级',
      summary: '性能页最先要接住的，是离线、降级和高压服务，不然曲线再漂亮也只是在看热闹。',
      signal: firstDegradedService ? `${firstDegradedService.name} · ${getStatusText(firstDegradedService.status)}` : `样本 ${services.length}`,
      nextAction: firstDegradedService
        ? `优先围绕 ${firstDegradedService.name} 定位 CPU/内存异常，再决定先去告警还是日志页。`
        : '当前没有明显异常服务，抽查一次性能页到后续证据页的承接链路。',
      statusTone: firstDegradedService ? 'degraded' : 'online',
      objectTarget: { tab: 'Performance', taskQuery: firstDegradedService?.name || 'performance-hotspot' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstDegradedService?.name || 'performance-hotspot' },
    },
    {
      id: 'alerts-correlation',
      title: '告警联动与事件确认',
      summary: '性能波动如果不回告警页确认事件级别，很容易在图表层面反复看，最后还是不知道先救哪一个。',
      signal: firstDegradedService ? `告警候选 ${firstDegradedService.name}` : '待抽查告警联动',
      nextAction: firstDegradedService
        ? `带着 ${firstDegradedService.name} 回告警中心，确认它有没有形成正式异常事件。`
        : '当前没有明显热点服务，抽查性能到告警页的联动链路是否仍然可用。',
      statusTone: firstDegradedService ? 'degraded' : 'online',
      objectTarget: { tab: 'AlertCenter', taskQuery: firstDegradedService?.name || 'performance-alerts' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstDegradedService?.name || 'performance-alerts' },
    },
    {
      id: 'logs-systemmap',
      title: '日志追证与系统地图回挂',
      summary: '性能问题最后要回日志抓正文，再回系统地图挂到具体页面或路径上，不然只能知道慢，不知道卡哪。',
      signal: leadPerformanceService ? `追证 ${leadPerformanceService.name}` : '待抽查回挂',
      nextAction: leadPerformanceService
        ? `把 ${leadPerformanceService.name} 带去日志页抓证据，再回系统地图确认它影响哪条使用路径。`
        : '当前没有明确热点对象，抽查性能到日志和系统地图的回挂链路。',
      statusTone: leadPerformanceService ? 'degraded' : 'online',
      objectTarget: { tab: 'LogViewer', taskQuery: leadPerformanceService?.name || 'performance-logs' },
      taskTarget: { tab: 'SystemMap', pageId: 'Performance' },
    },
    {
      id: 'task-closeout',
      title: '任务承接与持续治理',
      summary: '真正需要反复盯的性能问题，最后都得进任务中心，不然每次都是重新看图重新猜。',
      signal: leadPerformanceService ? `待承接 ${leadPerformanceService.name}` : '当前无热点对象',
      nextAction: leadPerformanceService
        ? `把 ${leadPerformanceService.name} 的性能治理动作正式送进任务中心持续追。`
        : '当前没有明确热点对象，抽查性能补位任务链路是否还能顺利落到任务中心。',
      statusTone: leadPerformanceService ? 'degraded' : 'online',
      objectTarget: { tab: 'Performance', taskQuery: leadPerformanceService?.name || 'performance-task-closeout' },
      taskTarget: { tab: 'TaskCenter', taskQuery: leadPerformanceService?.name || 'performance-task-closeout' },
    },
  ];
  const focusedPerformanceCard = (() => {
    const matchedService = services.find((service) => (
      matchesPerformanceFocusQuery(
        [service.name, service.status, service.cpu, service.memory, service.uptime],
        focusTaskQuery,
      )
    ));
    if (matchedService) {
      return {
        kicker: '热点服务',
        title: matchedService.name,
        detail: `${getStatusText(matchedService.status)} · CPU ${typeof matchedService.cpu === 'number' ? `${matchedService.cpu}%` : '未提供'} · 内存 ${typeof matchedService.memory === 'number' ? `${matchedService.memory}%` : '未提供'}`,
        objectTarget: { tab: 'Performance', taskQuery: matchedService.name },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedService.name },
      };
    }

    const matchedClosure = performanceClosureRows.find((row) => (
      matchesPerformanceFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '性能闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'Performance') {
      return {
        kicker: '当前页面',
        title: '性能监控',
        detail: '这页负责把性能波动、异常服务和后续告警/日志/任务承接串起来，不只是看曲线。',
        objectTarget: { tab: 'SystemMap', pageId: 'Performance' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Performance' },
      };
    }

    return null;
  })();
  const performanceActionItems = [
    {
      id: 'perf-alerts',
      title: '回告警中心收敛异常',
      detail: '当监控出现明显波动时，先回告警中心确认当前异常级别和处理优先级。',
      actionLabel: '进入告警页',
      actionType: 'navigate' as const,
      actionValue: 'AlertCenter',
      actionTarget: performanceTaskDraft.alertTarget,
    },
    {
      id: 'perf-logs',
      title: '去日志页追证据',
      detail: '把有波动的服务继续带到日志页，确认具体报错与时间点。',
      actionLabel: '进入日志页',
      actionType: 'navigate' as const,
      actionValue: 'LogViewer',
      actionTarget: performanceTaskDraft.logTarget,
    },
    {
      id: 'perf-tasks',
      title: '挂任务继续治理',
      detail: '持续高压、离线或降级服务需要正式进入任务承接。',
      actionLabel: '进入任务中心',
      actionType: 'navigate' as const,
      actionValue: 'TaskCenter',
      actionTarget: performanceTaskDraft.taskTarget,
    },
  ];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="performance-monitor-page">
      <RuntimeOpsWorkbench currentPage="Performance" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <ActionSurfacePanel
        title="性能动作区"
        subtitle="先定位有波动的服务，再切告警和日志确认原因，最后把持续问题挂任务。"
        statusText={services.length ? `${services.length} 个服务样本` : '等待性能数据'}
        items={performanceActionItems}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      {focusedPerformanceCard && (
        <section className="services-section overview-ops-panel" aria-label="当前性能承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前性能承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把搜索、系统地图或告警页带来的上下文，直接落到性能面当前该盯住的服务。
              </p>
            </div>
            <span className="status-badge online">{focusedPerformanceCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedPerformanceCard.title}</strong>
              <p>{focusedPerformanceCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开性能焦点对象 ${focusedPerformanceCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedPerformanceCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <AlertTriangle size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开性能焦点任务 ${focusedPerformanceCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedPerformanceCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <Activity size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" role="region" aria-label="性能闭环总表">
        <div className="section-header">
          <div>
            <h2>性能闭环总表</h2>
            <p className="text-muted">把热点服务、告警联动、日志追证、系统地图回挂和任务承接并排摆出来，性能页才不只是曲线板。</p>
          </div>
          <span className="status-badge online">{performanceClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {performanceClosureRows.map((row) => (
            <article
              key={`performance-closure-${row.id}`}
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
                  aria-label={`打开性能闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <AlertTriangle size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开性能闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Activity size={14} />
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
            <h2>性能承接工作台</h2>
            <p className="text-muted">把热点服务、性能去向和下一步收口页摆到一起，不让图表只停在看趋势这一步。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">异常服务 {degradedServices.length}</span>
            <span className="status-badge online">显示服务 {filteredServices.length}/{services.length}</span>
            <span className="status-badge degraded">时间范围 {timeRange}</span>
          </div>
        </div>

        <div role="region" aria-label="性能服务筛选" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <input
            type="search"
            aria-label="搜索性能服务"
            placeholder="服务名称、状态或运行时长"
            value={serviceQuery}
            onChange={(event) => setServiceQuery(event.target.value)}
            style={{ flex: '1 1 260px', minWidth: 220 }}
          />
          <select
            aria-label="按状态筛选性能服务"
            value={serviceStatusFilter}
            onChange={(event) => setServiceStatusFilter(event.target.value as typeof serviceStatusFilter)}
          >
            <option value="all">全部状态</option>
            <option value="online">在线</option>
            <option value="degraded">降级</option>
            <option value="offline">离线</option>
          </select>
          {(serviceQuery || serviceStatusFilter !== 'all') && (
            <button
              type="button"
              className="antd-btn small"
              aria-label="清除性能服务筛选"
              onClick={() => { setServiceQuery(''); setServiceStatusFilter('all'); }}
            >
              清除筛选
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>热点服务</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>优先处理离线、降级或资源使用偏高的服务。</p>
            </div>
            {hotServices.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>{services.length ? '没有匹配的性能服务。' : '当前没有可追踪的服务样本。'}</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {hotServices.map((service) => (
                  <button
                    key={`perf-${service.name}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看性能服务 ${service.name}`}
                    onClick={() => openCockpitNavigationTarget({ tab: service.status === 'online' ? 'LogViewer' : 'AlertCenter', taskQuery: service.name }, onNavigate, onOpenTarget)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{service.name}</strong>
                      <p>{getStatusText(service.status)} · CPU {typeof service.cpu === 'number' ? `${service.cpu}%` : '未提供'} · 内存 {typeof service.memory === 'number' ? `${service.memory}%` : '未提供'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>继续去告警或日志页确认成因。</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>追证据去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>性能波动一般要继续去告警、日志和系统地图三处收口。</p>
            </div>
            {[
              { id: 'AlertCenter', label: '告警中心', reason: '确认当前是否已形成异常事件。', aria: '打开性能承接到告警页' },
              { id: 'LogViewer', label: '日志页', reason: '查看报错、超时与时间点。', aria: '打开性能承接到日志页' },
              { id: 'SystemMap', label: '系统地图', reason: '把性能问题挂回全站使用路径。', aria: '打开性能承接到系统地图' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: leadPerformanceService?.name || focusTaskQuery || 'Performance' }, onNavigate, onOpenTarget)}
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

      <section className="services-section" role="region" aria-label="性能补位任务">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>性能补位任务</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把当前热点服务直接翻成可追的补位任务，不让性能页停在“看到了波动”这一步。
            </p>
          </div>
          <span className="status-badge degraded">任务草稿</span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{performanceTaskDraft.title}</strong>
            <p>{performanceTaskDraft.description}</p>
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {performanceTaskDraft.checklist.map((item, index) => (
                <small key={`${performanceTaskDraft.title}-${index}`} className="text-muted">{index + 1}. {item}</small>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="antd-btn"
              disabled={taskPending}
              aria-label={`登记性能治理任务 ${performanceTaskDraft.title}`}
              onClick={() => { void createPerformanceTask(); }}
            >
              <Activity size={14} />
              <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`复制性能补位任务 ${performanceTaskDraft.title}`}
              onClick={async () => {
                await navigator.clipboard.writeText(performanceTaskDraft.copyText);
                setDraftNotice(`已复制性能补位任务：${performanceTaskDraft.title}`);
              }}
            >
              <Copy size={14} />
              <span>复制补位任务</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开性能补位告警 ${performanceTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(performanceTaskDraft.alertTarget, onNavigate, onOpenTarget)}
            >
              <AlertTriangle size={14} />
              <span>回告警中心</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开性能补位日志 ${performanceTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(performanceTaskDraft.logTarget, onNavigate, onOpenTarget)}
            >
              <Activity size={14} />
              <span>去日志页</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开性能补位任务 ${performanceTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(performanceTaskDraft.taskTarget, onNavigate, onOpenTarget)}
            >
              <Activity size={14} />
              <span>送进任务中心</span>
            </button>
          </div>
        </article>
        {draftNotice && (
          <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{draftNotice}</p>
        )}
        {taskError && (
          <p role="alert" className="text-danger" style={{ margin: 0, fontSize: 12 }}>{taskError}</p>
        )}
      </section>

      {error && (
        <div role="alert" className="inline-error-state">
          <span>{error}</span>
          <button className="btn btn-outline" aria-label="重试性能指标" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={14} />
            重试
          </button>
        </div>
      )}

      {/* 时间范围选择 */}
      <div className="time-range-selector">
        <button
          className={`time-range-btn ${timeRange === '1h' ? 'active' : ''}`}
          onClick={() => setTimeRange('1h')}
        >
          1小时
        </button>
        <button
          className={`time-range-btn ${timeRange === '6h' ? 'active' : ''}`}
          onClick={() => setTimeRange('6h')}
        >
          6小时
        </button>
        <button
          className={`time-range-btn ${timeRange === '24h' ? 'active' : ''}`}
          onClick={() => setTimeRange('24h')}
        >
          24小时
        </button>
        <button
          className={`time-range-btn ${timeRange === '7d' ? 'active' : ''}`}
          onClick={() => setTimeRange('7d')}
        >
          7天
        </button>
        <button className="btn btn-outline" aria-label="刷新性能指标" onClick={() => setRefreshToken((value) => value + 1)} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* 系统指标图表 */}
      <div className="metrics-charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <Cpu size={20} />
            <h3>CPU 使用率</h3>
          </div>
          {metrics?.cpu && (
            <AreaChart
              data={metrics.cpu}
              xField="timestamp"
              yField="value"
              title=""
              color="#3b82f6"
              height={200}
            />
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <HardDrive size={20} />
            <h3>内存使用率</h3>
          </div>
          {metrics?.memory && (
            <AreaChart
              data={metrics.memory}
              xField="timestamp"
              yField="value"
              title=""
              color="#10b981"
              height={200}
            />
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <HardDrive size={20} />
            <h3>磁盘使用率</h3>
          </div>
          {metrics?.disk && (
            <LineChart
              data={metrics.disk}
              xField="timestamp"
              yField="value"
              title=""
              color="#f59e0b"
              showThreshold={true}
              threshold={80}
              thresholdColor="#ef4444"
              height={200}
            />
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <Wifi size={20} />
            <h3>网络流量</h3>
          </div>
          {metrics?.network && (
            <AreaChart
              data={metrics.network}
              xField="timestamp"
              yField="value"
              title=""
              color="#8b5cf6"
              height={200}
            />
          )}
        </div>
      </div>

      {/* 服务状态 */}
      <section className="services-status">
        <h2>服务状态 ({filteredServices.length}/{services.length})</h2>
        <div className="services-grid">
          {filteredServices.length === 0 ? (
            <p className="text-muted">当前筛选下没有匹配的服务状态。</p>
          ) : filteredServices.map((service) => (
            <div key={service.name} className="service-card">
              <div className="service-header">
                <div className="service-name">{service.name}</div>
                <div
                  className="service-status"
                  style={{ color: getStatusColor(service.status) }}
                >
                  {getStatusText(service.status)}
                </div>
              </div>
              <div className="service-metrics">
                <div className="metric">
                  <Cpu size={14} />
                  <span>CPU: {typeof service.cpu === 'number' ? `${service.cpu}%` : '未提供'}</span>
                  {typeof service.cpu === 'number' && <div className="metric-bar">
                    <div className="metric-fill" style={{ width: `${service.cpu}%`, backgroundColor: service.cpu > 80 ? '#e74c3c' : '#3b82f6' }} />
                  </div>}
                </div>
                <div className="metric">
                  <HardDrive size={14} />
                  <span>内存: {typeof service.memory === 'number' ? `${service.memory}%` : '未提供'}</span>
                  {typeof service.memory === 'number' && <div className="metric-bar">
                    <div className="metric-fill" style={{ width: `${service.memory}%`, backgroundColor: service.memory > 80 ? '#e74c3c' : '#10b981' }} />
                  </div>}
                </div>
              </div>
              <div className="service-uptime">
                <Activity size={14} />
                <span>运行时间: {service.uptime ?? '未提供'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
