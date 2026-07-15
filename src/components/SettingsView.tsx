import React, { useState, useEffect, useMemo } from 'react';
import { Activity, ClipboardCheck, GitBranch, Route, ShieldAlert } from 'lucide-react';
import './Dashboard.css';
import PlatformControlWorkbench from './PlatformControlWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import { validateInstanceRegistration } from './instanceRegistration';

interface SettingsViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type SettingsDomainSecurityCheck = {
  id: string;
  status: 'passed' | 'warn' | 'failed';
  title: string;
  detail: string;
  evidence: string;
  next_action: string;
};

type SettingsDomainApp = {
  id: string;
  name: string;
  risk_level?: string;
  auth?: {
    type?: string | null;
  };
  freshness?: {
    status?: string | null;
  };
  runtime?: {
    launch?: {
      url?: string | null;
    };
    api?: {
      url?: string | null;
    };
  };
  security_summary?: {
    posture?: string;
  };
  security_checks: SettingsDomainSecurityCheck[];
};

type SettingsDomainAppsPayload = {
  summary?: {
    total?: number;
    security_attention_apps?: number;
    high_risk?: number;
  };
  items: SettingsDomainApp[];
};

type SettingsSecurityRouteRow = {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  nextAction: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesSettingsFocusQuery(values: Array<string | null | undefined>, query?: string | null) {
  if (!query) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

function securityRouteTone(status: SettingsDomainSecurityCheck['status'] | 'missing_auth' | 'high_risk'): SettingsSecurityRouteRow['statusTone'] {
  if (status === 'failed' || status === 'missing_auth') return 'offline';
  if (status === 'warn' || status === 'high_risk') return 'degraded';
  return 'online';
}

function securityRouteLabel(status: SettingsDomainSecurityCheck['status'] | 'missing_auth' | 'high_risk') {
  if (status === 'failed') return '失败';
  if (status === 'warn') return '警告';
  if (status === 'missing_auth') return '缺认证';
  if (status === 'high_risk') return '高风险';
  return '通过';
}

export default function SettingsView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: SettingsViewProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [domainApps, setDomainApps] = useState<SettingsDomainAppsPayload | null>(null);
  const [instanceUrl, setInstanceUrl] = useState('');
  const [instanceService, setInstanceService] = useState('');
  const [registerResult, setRegisterResult] = useState<any>(null);
  const healthyServices = typeof metrics?.healthy === 'number' ? metrics.healthy : 0;
  const totalServices = typeof metrics?.services === 'number' ? metrics.services : 0;
  const latencyEntries = metrics?.latency && typeof metrics.latency === 'object'
    ? Object.entries(metrics.latency).slice(0, 3)
    : [];
  const registerStatus = registerResult?.error ? '失败' : registerResult ? '已返回' : '待提交';
  const registrationFocus = [
    {
      id: 'metric-health',
      label: '健康路由',
      value: totalServices > 0 ? `${healthyServices}/${totalServices}` : '等待指标',
      detail: '先确认控制面健康路由是否足够支撑新增实例接入。',
    },
    {
      id: 'metric-latency',
      label: '延迟分布',
      value: latencyEntries.length > 0 ? latencyEntries.map(([key, value]) => `${key}:${value}`).join(' · ') : '等待延迟样本',
      detail: '路由延迟抖动时，先回观测面确认是否已有全局波动。',
    },
    {
      id: 'register-status',
      label: '注册状态',
      value: registerStatus,
      detail: registerResult?.error ? '先处理注册错误，再去网格确认实例接入。' : '注册完成后回网格和应用中心确认实例挂载。',
    },
  ];
  const settingsSecurityRoutes = useMemo<SettingsSecurityRouteRow[]>(() => {
    const items = domainApps?.items || [];
    const routes = items.flatMap((app) => {
      const checkRoutes = app.security_checks
        .filter((check) => check.status !== 'passed')
        .slice(0, 2)
        .map((check) => ({
          id: `${app.id}-${check.id}`,
          title: `${app.name} · ${check.title}`,
          summary: check.detail || '先回应用中心确认安全门，再决定继续放行还是阻断挂载。',
          evidence: check.evidence || `认证 ${app.auth?.type || '未声明'} · 新鲜度 ${app.freshness?.status || '未知'}`,
          nextAction: check.next_action || '把这条安全门送进任务中心持续跟踪。',
          statusTone: securityRouteTone(check.status),
          statusLabel: securityRouteLabel(check.status),
          objectTarget: { tab: 'DomainApps', taskQuery: app.id },
          taskTarget: { tab: 'TaskCenter', taskQuery: check.id || app.id },
        }));

      if (checkRoutes.length > 0) return checkRoutes;

      if (!app.auth?.type) {
        return [{
          id: `${app.id}-missing-auth`,
          title: `${app.name} · 认证方式未声明`,
          summary: '控制面能看到入口，不代表这个挂载已经有清晰认证边界。',
          evidence: `入口 ${app.runtime?.launch?.url || app.runtime?.api?.url || '待补'} · 认证 未声明`,
          nextAction: '先补认证方式和入口声明，再继续判断是否允许挂载。',
          statusTone: securityRouteTone('missing_auth'),
          statusLabel: securityRouteLabel('missing_auth'),
          objectTarget: { tab: 'DomainApps', taskQuery: app.id },
          taskTarget: { tab: 'TaskCenter', taskQuery: app.id },
        }];
      }

      if (app.risk_level === 'high' || app.security_summary?.posture === 'attention') {
        return [{
          id: `${app.id}-high-risk`,
          title: `${app.name} · 高风险挂载`,
          summary: '这种领域入口可以先挂载，但不能跳过控制面上的安全与配置复核。',
          evidence: `认证 ${app.auth?.type || '未声明'} · 新鲜度 ${app.freshness?.status || '未知'}`,
          nextAction: '回应用中心复核写入边界、认证方式和真实数据暴露面。',
          statusTone: securityRouteTone('high_risk'),
          statusLabel: securityRouteLabel('high_risk'),
          objectTarget: { tab: 'DomainApps', taskQuery: app.id },
          taskTarget: { tab: 'TaskCenter', taskQuery: app.id },
        }];
      }

      return [];
    }).slice(0, 4);

    if (routes.length > 0) return routes;

    return [{
      id: 'domain-security-steady',
      title: '领域挂载控制面',
      summary: '当前没有明显阻断项，但设置页仍要持续承接领域应用的认证、入口和安全门。',
      evidence: `已登记 ${items.length} 个领域应用`,
      nextAction: '回应用中心抽查一个领域应用的挂载状态和安全门。',
      statusTone: 'online',
      statusLabel: '待抽查',
      objectTarget: { tab: 'DomainApps' },
      taskTarget: { tab: 'TaskCenter', taskQuery: 'domain-apps' },
    }];
  }, [domainApps]);

  const domainSecuritySummary = useMemo(() => {
    const items = domainApps?.items || [];
    return {
      total: domainApps?.summary?.total ?? items.length,
      attention: settingsSecurityRoutes.filter((item) => item.statusTone !== 'online').length,
      highRisk: domainApps?.summary?.high_risk ?? items.filter((app) => app.risk_level === 'high').length,
      authReady: items.filter((app) => Boolean(app.auth?.type)).length,
    };
  }, [domainApps, settingsSecurityRoutes]);

  const focusedSettingsCard = (() => {
    const matchedFocus = registrationFocus.find((item) => (
      matchesSettingsFocusQuery([item.label, item.value, item.detail], focusTaskQuery)
    ));
    if (matchedFocus) {
      return {
        kicker: '控制面对象',
        title: matchedFocus.label,
        detail: `${matchedFocus.value} · ${matchedFocus.detail}`,
        objectTarget: { tab: 'Settings', taskQuery: matchedFocus.label },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedFocus.label },
      };
    }

    const matchedSecurityRoute = settingsSecurityRoutes.find((item) => (
      matchesSettingsFocusQuery([item.title, item.summary, item.evidence, item.nextAction], focusTaskQuery)
    ));
    if (matchedSecurityRoute) {
      return {
        kicker: '领域安全门',
        title: matchedSecurityRoute.title,
        detail: `${matchedSecurityRoute.statusLabel} · ${matchedSecurityRoute.nextAction}`,
        objectTarget: matchedSecurityRoute.objectTarget,
        taskTarget: matchedSecurityRoute.taskTarget,
      };
    }

    if (matchesSettingsFocusQuery([instanceService, instanceUrl, registerStatus], focusTaskQuery)) {
      return {
        kicker: '实例接入',
        title: instanceService || '实例注册',
        detail: `${instanceUrl || '等待接入点'} · ${registerStatus}`,
        objectTarget: { tab: 'Settings', taskQuery: instanceService || '实例注册' },
        taskTarget: { tab: 'TaskCenter', taskQuery: instanceService || '实例注册' },
      };
    }

    if (focusPageId === 'Settings') {
      return {
        kicker: '当前页面',
        title: '底层设置',
        detail: '这页负责把控制面指标、实例接入和后续观测/网格/应用承接串起来，不只是一个设置表单。',
        objectTarget: { tab: 'SystemMap', pageId: 'Settings' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Settings' },
      };
    }

    return null;
  })();

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics/history');
      if (res.ok) setMetrics(await res.json());
    } catch (e) {}
  };

  const fetchDomainApps = async () => {
    try {
      const res = await fetch('/api/domain-apps');
      if (!res.ok) return;
      setDomainApps(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchMetrics();
    fetchDomainApps();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateInstanceRegistration(instanceService, instanceUrl);
    if (validationError) {
      setRegisterResult({ error: validationError });
      return;
    }
    try {
      const fd = new FormData();
      fd.append('service', instanceService);
      fd.append('mcp_endpoint', instanceUrl);
      const res = await fetch('/api/instance', { method: 'POST', body: fd });
      setRegisterResult(await res.json());
    } catch (e: any) {
      setRegisterResult({ error: e.message });
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PlatformControlWorkbench currentPage="Settings" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="控制面动作区"
        subtitle="控制面看完指标后，直接跳去实例、观测和领域挂载的下一步。"
        statusText={metrics?.services ? `${metrics.healthy}/${metrics.services} healthy` : '等待指标'}
        onNavigate={onNavigate}
        items={[
          {
            id: 'obs',
            title: '回观测面',
            detail: '系统指标有抖动时，立刻回 Observability 看架构健康和 BOS 摘要。',
            actionLabel: '去观测页',
            actionType: 'navigate',
            actionValue: 'Observability',
          },
          {
            id: 'mesh',
            title: '检查实例接入',
            detail: '新注册实例后，去网格页确认服务是否真正进入总线和路由。',
            actionLabel: '去网格页',
            actionType: 'navigate',
            actionValue: 'McpMesh',
          },
          {
            id: 'domain-apps',
            title: '看领域挂载',
            detail: '控制面问题涉及领域应用时，直接去应用中心看运行态和安全门。',
            actionLabel: '去应用中心',
            actionType: 'navigate',
            actionValue: 'DomainApps',
          },
          {
            id: 'sample-endpoint',
            title: '复制实例样例',
            detail: '先用一个标准接入点格式，减少手填错误。',
            actionLabel: '复制样例',
            actionType: 'copy',
            actionValue: 'http://127.0.0.1:7431',
          },
        ]}
      />

      {focusedSettingsCard && (
        <section className="services-section overview-ops-panel" aria-label="当前控制面承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前控制面承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、搜索或任务带来的上下文，直接翻成控制面当前该承接的指标或接入对象。
              </p>
            </div>
            <span className="status-badge online">{focusedSettingsCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedSettingsCard.title}</strong>
              <p>{focusedSettingsCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开控制面焦点对象 ${focusedSettingsCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedSettingsCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <GitBranch size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开控制面焦点任务 ${focusedSettingsCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedSettingsCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <Activity size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>控制面承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把控制面健康、实例接入状态和后续入口摆到前面，避免设置页只剩指标和表单。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge online">路由 {healthyServices}/{totalServices || 0}</span>
            <span className="status-badge degraded">注册 {registerStatus}</span>
            <span className="status-badge degraded">延迟样本 {latencyEntries.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>控制面焦点</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先看健康路由、延迟样本和注册状态，再决定跳去哪一面继续承接。</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {registrationFocus.map((item) => (
                <div key={item.id} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>接入去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>控制面动作完成后，继续去观测、网格、系统地图和应用中心确认真实状态。</p>
            </div>
            {[
              { id: 'Observability', label: '观测页', reason: '确认控制面抖动是否已扩散成全局异常。', aria: '打开控制面承接到观测页' },
              { id: 'McpMesh', label: '网格页', reason: '确认新实例是否真正进入网格和路由表。', aria: '打开控制面承接到网格页' },
              { id: 'SystemMap', label: '系统地图', reason: '确认实例接入是否影响全站覆盖与能力矩阵。', aria: '打开控制面承接到系统地图' },
              { id: 'DomainApps', label: '应用中心', reason: '涉及领域应用时继续核对挂载、安全和运行态。', aria: '打开控制面承接到应用中心' },
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
                <GitBranch size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <section className="services-section" role="region" aria-label="领域接通与安全门">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>领域接通与安全门</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              设置页不只接实例注册，也要接住家庭驾驶舱、OPC、family-hub 这类领域挂载的认证、配置和安全门。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge online">已登记 {domainSecuritySummary.total}</span>
            <span className="status-badge degraded">待处理 {domainSecuritySummary.attention}</span>
            <span className="status-badge degraded">高风险 {domainSecuritySummary.highRisk}</span>
            <span className="status-badge online">认证已声明 {domainSecuritySummary.authReady}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {settingsSecurityRoutes.map((route) => (
            <article
              key={route.id}
              className="antd-card"
              style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 15 }}>{route.title}</strong>
                  <span className={`status-badge ${route.statusTone}`}>{route.statusLabel}</span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{route.summary}</p>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <small className="text-muted">当前证据</small>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{route.evidence}</span>
                <small className="text-muted">下一步：{route.nextAction}</small>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开领域安全对象 ${route.title}`}
                  onClick={() => openCockpitNavigationTarget(route.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开领域安全任务 ${route.title}`}
                  onClick={() => openCockpitNavigationTarget(route.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      
      {/* Metrics History Card */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} aria-hidden="true" className="text-success" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>系统运行状态指标</h2>
        </div>
        
        {metrics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', fontSize: '13px' }}>
              <span style={{ color: 'var(--antd-text-secondary)' }}>监控快照时间: </span> {metrics.timestamp}
            </div>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--antd-text-secondary)' }}>微服务总数: </span> {metrics.services}</div>
              <div><span style={{ color: 'var(--antd-text-secondary)' }}>健康路由数: </span> <span className="text-success" style={{ fontWeight: 600 }}>{metrics.healthy}</span></div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--antd-text-secondary)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>延迟分位数分布 (Latency Metrics):</span>
              <pre style={{ margin: 0, color: 'var(--antd-primary)', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
                {JSON.stringify(metrics.latency, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: '13px' }}>正在加载并同步系统指标数据...</p>
        )}
      </div>

      {/* Instance Registration Card */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={18} aria-hidden="true" className="text-accent" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>注册分布式新实例 (Instance)</h2>
        </div>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="reg-service-name" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>目标服务名称 (Service Name)</label>
            <input 
              id="reg-service-name"
              required 
              type="text" 
              className="antd-input" 
              value={instanceService} 
              onChange={e => setInstanceService(e.target.value)} 
              placeholder="例如: gbrain-local" 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="reg-mcp-url" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>MCP 接入点地址 (Endpoint URL)</label>
            <input 
              id="reg-mcp-url"
              required 
              type="text" 
              className="antd-input" 
              value={instanceUrl} 
              onChange={e => setInstanceUrl(e.target.value)} 
              placeholder="http://127.0.0.1:7431" 
            />
          </div>
          
          <button type="submit" className="antd-btn antd-btn-primary" style={{ width: 'fit-content' }}>注册实例</button>
        </form>

        {registerResult && (
          <div style={{ 
            padding: '12px', 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: '4px', 
            border: `1px solid ${registerResult.error ? 'var(--antd-error)' : 'var(--antd-primary)'}` 
          }}>
            <pre style={{ margin: 0, fontSize: '12px', color: registerResult.error ? 'var(--antd-error)' : 'var(--antd-success)', fontFamily: 'monospace' }}>
              {JSON.stringify(registerResult, null, 2)}
            </pre>
            {registerResult.task_id && (
              <button
                type="button"
                className="antd-btn"
                style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                aria-label="打开实例验收任务"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: registerResult.task_id }, onNavigate, onOpenTarget)}
              >
                <ClipboardCheck size={14} />
                打开验收任务
              </button>
            )}
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
