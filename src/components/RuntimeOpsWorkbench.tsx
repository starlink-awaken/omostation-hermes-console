import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, FileText, Gauge, Network, Search, ShieldAlert, Terminal } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

type RuntimeWorkbenchPage = 'Overview' | 'AlertCenter' | 'Performance' | 'LogViewer' | 'Topology' | 'Sandbox' | string;

type RuntimePathPage = {
  id: string;
  title: string;
  group?: string;
  purpose?: string;
};

type RuntimeUsagePath = {
  id: string;
  title: string;
  intent?: string;
  pages?: RuntimePathPage[];
};

type RuntimeAlert = {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info' | string;
  source: string;
  message: string;
  status: 'active' | 'acknowledged' | 'silenced' | 'resolved' | string;
};

type RuntimeService = {
  name: string;
  status: 'online' | 'offline' | 'degraded' | string;
  cpu?: number;
  memory?: number;
  uptime?: string;
};

type RuntimeOpsWorkbenchProps = {
  currentPage: RuntimeWorkbenchPage;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

type RuntimeWorkbenchState = {
  loading: boolean;
  usagePath: RuntimeUsagePath | null;
  alerts: RuntimeAlert[];
  services: RuntimeService[];
  error: string | null;
};

const DEFAULT_RUNTIME_PAGES: RuntimePathPage[] = [
  { id: 'Overview', title: '概览中心', group: '运行大盘', purpose: '先判断是不是系统级异常。' },
  { id: 'AlertCenter', title: '告警中心', group: '系统治理', purpose: '确认严重告警、处置状态和后续任务。' },
  { id: 'Topology', title: '全局拓扑', group: '运行大盘', purpose: '看异常是不是集中在某条调用链。' },
  { id: 'Performance', title: '性能监控', group: '开发工具', purpose: '确认 CPU、内存、磁盘、网络是否失衡。' },
  { id: 'LogViewer', title: '日志查看器', group: '开发工具', purpose: '把异常缩到具体模块和时间窗。' },
  { id: 'Sandbox', title: '隔离沙箱', group: '开发工具', purpose: '手动复现和执行修复命令。' },
];

function levelWeight(level: string): number {
  if (level === 'critical') return 4;
  if (level === 'error') return 3;
  if (level === 'warning') return 2;
  if (level === 'info') return 1;
  return 0;
}

function pageIcon(pageId: string) {
  if (pageId === 'Overview') return <Gauge size={14} />;
  if (pageId === 'AlertCenter') return <ShieldAlert size={14} />;
  if (pageId === 'Performance') return <BarChart3 size={14} />;
  if (pageId === 'LogViewer') return <FileText size={14} />;
  if (pageId === 'Topology') return <Network size={14} />;
  if (pageId === 'Sandbox') return <Terminal size={14} />;
  return <ArrowRight size={14} />;
}

function nextAction(currentPage: RuntimeWorkbenchPage, activeAlerts: RuntimeAlert[], degradedServices: RuntimeService[]): string {
  if (activeAlerts.some((alert) => alert.level === 'critical' || alert.level === 'error')) {
    if (currentPage !== 'AlertCenter') return '先切到告警中心确认严重告警，再按来源钻到日志或性能页。';
    return '先确认严重告警归属，再去日志或性能页缩小根因。';
  }
  if (degradedServices.length > 0) {
    if (currentPage !== 'Performance') return '先在性能监控确认资源是否打满，再回日志定位异常服务。';
    return '重点看高 CPU / 高内存服务，再跳日志查看同时间窗错误。';
  }
  if (currentPage !== 'LogViewer') return '当前没有明显红灯，可以去日志页抽样验证最近运行质量。';
  return '当前运行面没有明显异常，抽样确认后可回首页或系统地图继续收口。';
}

async function readRuntimeResponse<T>(
  result: PromiseSettledResult<Response>,
  label: string,
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  if (result.status === 'rejected') {
    return { ok: false, data: null, error: `${label}：${result.reason instanceof Error ? result.reason.message : '请求失败'}` };
  }
  if (!result.value.ok) {
    return { ok: false, data: null, error: `${label} HTTP ${result.value.status}` };
  }
  try {
    return { ok: true, data: await result.value.json() as T };
  } catch {
    return { ok: false, data: null, error: `${label}：响应格式无效` };
  }
}

export default function RuntimeOpsWorkbench({ currentPage, onNavigate, onOpenTarget }: RuntimeOpsWorkbenchProps) {
  const [state, setState] = useState<RuntimeWorkbenchState>({
    loading: true,
    usagePath: null,
    alerts: [],
    services: [],
    error: null,
  });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [systemMapResult, alertsResult, servicesResult] = await Promise.allSettled([
          fetch('/api/cockpit/system-map'),
          fetch('/api/alerts?status=active&limit=20'),
          fetch('/api/services/status'),
        ]);

        const nextState: RuntimeWorkbenchState = {
          loading: false,
          usagePath: null,
          alerts: [],
          services: [],
          error: null,
        };

        const [{ ok: systemMapOk, data: systemMap, error: systemMapError }, { ok: alertsOk, data: alertsData, error: alertsError }, { ok: servicesOk, data: servicesData, error: servicesError }] = await Promise.all([
          readRuntimeResponse<{ usage_paths?: RuntimeUsagePath[] }>(systemMapResult, '系统地图数据'),
          readRuntimeResponse<{ items?: RuntimeAlert[] }>(alertsResult, '活跃告警数据'),
          readRuntimeResponse<{ items?: RuntimeService[] }>(servicesResult, '服务状态数据'),
        ]);

        if (systemMapOk && systemMap) {
          const usagePaths = (systemMap.usage_paths || []) as RuntimeUsagePath[];
          nextState.usagePath = usagePaths.find((path) => path.id === 'runtime-diagnostics')
            || usagePaths.find((path) => path.pages?.some((page) => page.id === currentPage))
            || null;
        }

        if (alertsOk && alertsData) {
          nextState.alerts = alertsData.items || [];
        }

        if (servicesOk && servicesData) {
          nextState.services = servicesData.items || [];
        }
        nextState.error = [systemMapError, alertsError, servicesError].filter(Boolean).join('；') || null;

        if (!cancelled) setState(nextState);
      } catch (error) {
        if (!cancelled) {
          setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : '运行诊断数据暂不可用' }));
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentPage, retryToken]);

  const pathPages = useMemo(
    () => (state.usagePath?.pages && state.usagePath.pages.length > 0 ? state.usagePath.pages : DEFAULT_RUNTIME_PAGES),
    [state.usagePath],
  );

  const activeAlerts = useMemo(
    () => state.alerts
      .filter((alert) => alert.status === 'active')
      .sort((left, right) => levelWeight(right.level) - levelWeight(left.level))
      .slice(0, 3),
    [state.alerts],
  );

  const degradedServices = useMemo(
    () => state.services.filter((service) => service.status !== 'online').slice(0, 4),
    [state.services],
  );
  const runtimeContextQuery = activeAlerts[0]?.source || degradedServices[0]?.name || 'runtime';

  const currentIndex = pathPages.findIndex((page) => page.id === currentPage);
  const recommended = nextAction(currentPage, activeAlerts, degradedServices);

  return (
    <section className="services-section runtime-workbench" aria-label="运行诊断工作台">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>运行诊断工作台</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {state.usagePath?.intent || '把概览、拓扑、性能、日志和沙箱串成一条可执行的运行排障路径。'}
          </p>
        </div>
        <span className={`status-badge ${activeAlerts.length > 0 || degradedServices.length > 0 ? 'degraded' : 'online'}`}>
          {state.loading ? '同步中' : activeAlerts.length > 0 || degradedServices.length > 0 ? '需要排查' : '运行平稳'}
        </span>
      </div>

      {state.error && (
        <div className="shell-data-banner" role="alert">
          <span>{state.error}，当前运行热点可能不完整。</span>
          <button type="button" onClick={() => setRetryToken((token) => token + 1)}>重试</button>
        </div>
      )}

      <div className="runtime-workbench-summary">
        <div className="runtime-workbench-card">
          <span>活跃告警</span>
          <strong>{state.alerts.filter((alert) => alert.status === 'active').length}</strong>
          <small>严重/错误优先推进到告警中心和日志页。</small>
        </div>
        <div className="runtime-workbench-card">
          <span>异常服务</span>
          <strong>{state.services.filter((service) => service.status !== 'online').length}</strong>
          <small>离线或降级服务优先去性能监控和拓扑确认范围。</small>
        </div>
        <div className="runtime-workbench-card runtime-workbench-card-wide">
          <span>建议下一步</span>
          <strong>{recommended}</strong>
          <small>当前页：{pathPages[currentIndex]?.title || currentPage}</small>
        </div>
      </div>

      <div className="runtime-workbench-path">
        {pathPages.map((page, index) => (
          <button
            key={page.id}
            className={`runtime-workbench-step ${page.id === currentPage ? 'active' : ''}`}
            aria-label={`进入运行步骤 ${page.title}`}
            onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: runtimeContextQuery }, onNavigate, onOpenTarget)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{page.title}</strong>
              <small>{page.group || page.id}</small>
            </div>
            {pageIcon(page.id)}
          </button>
        ))}
      </div>

      <div className="runtime-workbench-grid">
        <article className="runtime-workbench-panel">
          <div className="runtime-workbench-panel-head">
            <strong>告警热点</strong>
            <button className="antd-btn small" onClick={() => openCockpitNavigationTarget({ tab: 'AlertCenter', taskQuery: activeAlerts[0]?.id || runtimeContextQuery, alertTab: 'active' }, onNavigate, onOpenTarget)}>
              <ShieldAlert size={13} />
              <span>去告警中心</span>
            </button>
          </div>
          <div className="runtime-workbench-list">
            {activeAlerts.map((alert) => (
              <button
                key={alert.id}
                className="runtime-workbench-item"
                aria-label={`查看告警 ${alert.message}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'AlertCenter', taskQuery: alert.id, alertTab: 'active' }, onNavigate, onOpenTarget)}
              >
                <strong>{alert.message}</strong>
                <span>{alert.source} · {alert.level}</span>
              </button>
            ))}
            {activeAlerts.length === 0 && (
              <div className="home-focus-empty runtime-workbench-empty">
                当前没有活跃告警
              </div>
            )}
          </div>
        </article>

        <article className="runtime-workbench-panel">
          <div className="runtime-workbench-panel-head">
            <strong>服务热点</strong>
            <button className="antd-btn small" onClick={() => openCockpitNavigationTarget({ tab: 'Performance', taskQuery: degradedServices[0]?.name || runtimeContextQuery }, onNavigate, onOpenTarget)}>
              <Search size={13} />
              <span>看性能</span>
            </button>
          </div>
          <div className="runtime-workbench-list">
            {degradedServices.map((service) => (
              <button
                key={service.name}
                className="runtime-workbench-item"
                aria-label={`查看服务 ${service.name}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'Performance', taskQuery: service.name }, onNavigate, onOpenTarget)}
              >
                <strong>{service.name}</strong>
                <span>{service.status} · CPU {service.cpu ?? 0}% · 内存 {service.memory ?? 0}%</span>
              </button>
            ))}
            {degradedServices.length === 0 && (
              <div className="home-focus-empty runtime-workbench-empty">
                当前没有异常服务
              </div>
            )}
          </div>
        </article>

        <article className="runtime-workbench-panel">
          <div className="runtime-workbench-panel-head">
            <strong>排查落点</strong>
            <button className="antd-btn small" onClick={() => openCockpitNavigationTarget({ tab: 'LogViewer', taskQuery: runtimeContextQuery }, onNavigate, onOpenTarget)}>
              <FileText size={13} />
              <span>看日志</span>
            </button>
          </div>
          <div className="runtime-workbench-list">
            {[
              { id: 'topology', page: 'Topology', title: '先看全局拓扑', detail: '判断异常是否集中在单条链路。' },
              { id: 'performance', page: 'Performance', title: '再看性能曲线', detail: '确认资源打满还是单点失衡。' },
              { id: 'logs', page: 'LogViewer', title: '最后进日志窗口', detail: '锁定来源、级别和时间窗。' },
              { id: 'sandbox', page: 'Sandbox', title: '需要时进入沙箱', detail: '复现、执行命令、做临时修复。' },
            ].map((item) => (
              <button
                key={item.id}
                className="runtime-workbench-item"
                aria-label={`进入落点 ${item.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: item.page, taskQuery: runtimeContextQuery }, onNavigate, onOpenTarget)}
              >
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
