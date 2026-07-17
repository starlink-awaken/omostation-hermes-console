import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ClipboardCheck,
  Filter,
  Search,
  Download,
  Settings,
  Plus,
} from 'lucide-react';
import ActionSurfacePanel from './ActionSurfacePanel';
import RuntimeOpsWorkbench from './RuntimeOpsWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface Alert {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  description?: string;
  status: 'active' | 'acknowledged' | 'silenced' | 'resolved';
  created_at: string;
  updated_at: string;
  acknowledged_by?: string;
  resolved_by?: string;
  resolved_at?: string;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  level: Alert['level'];
  channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

type TabType = 'active' | 'history' | 'rules';

interface AlertCenterPageProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  initialTab?: TabType;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type AlertClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesAlertFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

async function readAlertResponse<T>(
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

export default function AlertCenterPage({
  onNavigate,
  onOpenTarget,
  initialTab = 'active',
  focusPageId,
  focusTaskQuery,
}: AlertCenterPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name: '', condition: '', level: 'warning', channels: 'slack', enabled: true });
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionAlertId, setActionAlertId] = useState<string | null>(null);
  const [queueingAlertId, setQueueingAlertId] = useState<string | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleActionId, setRuleActionId] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertsResult, rulesResult] = await Promise.allSettled([
          fetch('/api/alerts'),
          fetch('/api/alerts/rules'),
        ]);

        const [{ ok: alertsOk, data: alertsData, error: alertsError }, { ok: rulesOk, data: rulesData, error: rulesError }] = await Promise.all([
          readAlertResponse<{ items?: Alert[] }>(alertsResult, '告警数据'),
          readAlertResponse<{ items?: AlertRule[] }>(rulesResult, '规则数据'),
        ]);
        if (alertsOk && alertsData) setAlerts(alertsData.items || []);
        if (rulesOk && rulesData) setRules(rulesData.items || []);
        setDataError([alertsError, rulesError].filter(Boolean).join('；') || null);
      } catch (error) {
        console.error('Failed to fetch alerts data:', error);
        setDataError(error instanceof Error ? error.message : '告警服务暂不可用');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  useEffect(() => {
    if (!focusTaskQuery) return;
    if (rules.some((rule) => matchesAlertFocusQuery([rule.id, rule.name, rule.condition, rule.level], focusTaskQuery))) {
      setActiveTab('rules');
      return;
    }
    const matchedAlert = alerts.find((alert) => (
      matchesAlertFocusQuery([alert.id, alert.message, alert.source, alert.description, alert.level, alert.status], focusTaskQuery)
    ));
    if (matchedAlert) {
      setActiveTab(matchedAlert.status === 'active' ? 'active' : 'history');
    }
  }, [alerts, focusTaskQuery, rules]);

  const handleAcknowledge = async (alertId: string) => {
    setActionAlertId(alertId);
    setActionError(null);
    try {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error(response.statusText);
      setAlerts((current) => current.map(a =>
        a.id === alertId ? { ...a, status: 'acknowledged' } : a
      ));
      setRefreshToken((value) => value + 1);
      setActionNotice('告警已确认，状态会在后续刷新中保留。');
    } catch (error) {
      setActionError(`确认告警失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setActionAlertId(null);
    }
  };

  const handleSilence = async (alertId: string) => {
    setActionAlertId(alertId);
    setActionError(null);
    try {
      const response = await fetch(`/api/alerts/${alertId}/silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 60 }),
      });
      if (!response.ok) throw new Error(response.statusText);
      setAlerts((current) => current.map(a =>
        a.id === alertId ? { ...a, status: 'silenced' } : a
      ));
      setRefreshToken((value) => value + 1);
      setActionNotice('告警已静默，状态会在后续刷新中保留。');
    } catch (error) {
      setActionError(`静默告警失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setActionAlertId(null);
    }
  };

  const handleResolve = async (alertId: string) => {
    setActionAlertId(alertId);
    setActionError(null);
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error(response.statusText);
      setAlerts((current) => current.map(a =>
        a.id === alertId ? { ...a, status: 'resolved' } : a
      ));
      setRefreshToken((value) => value + 1);
      setActionNotice('告警已解决，状态会在后续刷新中保留。');
    } catch (error) {
      setActionError(`解决告警失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setActionAlertId(null);
    }
  };

  const handleQueueAlert = async (alert: Alert) => {
    setQueueingAlertId(alert.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/cockpit/alerts/${encodeURIComponent(alert.id)}/queue`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || payload.error || '告警任务承接失败');
      setActionNotice(payload.created === false ? `任务已存在：${payload.id}` : `告警已承接为任务：${payload.id}`);
      if (payload.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: payload.id }, onNavigate, onOpenTarget);
    } catch (error) {
      setActionError(`承接告警失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setQueueingAlertId(null);
    }
  };

  const createRule = async () => {
    if (ruleSaving) return;
    setRuleSaving(true);
    setActionError(null);
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleForm.name.trim(),
          condition: ruleForm.condition.trim(),
          level: ruleForm.level,
          channels: ruleForm.channels.split(',').map((value) => value.trim()).filter(Boolean),
          enabled: ruleForm.enabled,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText);
      if (!payload || typeof payload.id !== 'string' || !Array.isArray(payload.channels)) {
        throw new Error('规则服务返回了无效的规则对象');
      }
      setRules((current) => [...current, payload]);
      setRuleForm({ name: '', condition: '', level: 'warning', channels: 'slack', enabled: true });
      setRuleFormOpen(false);
      setRefreshToken((value) => value + 1);
      setActionNotice('告警规则已创建。');
    } catch (error) {
      setActionError(`创建规则失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setRuleSaving(false);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    if (ruleActionId) return;
    setRuleActionId(rule.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText);
      setRules((current) => current.map((item) => item.id === rule.id ? payload : item));
      setRefreshToken((value) => value + 1);
      setActionNotice(`规则已${payload.enabled ? '启用' : '停用'}。`);
    } catch (error) {
      setActionError(`更新规则失败：${error instanceof Error ? error.message : '内置规则不可编辑'}`);
    } finally {
      setRuleActionId(null);
    }
  };

  const exportHistory = () => {
    const csv = ['时间,级别,来源,消息,状态', ...historyAlerts.map((alert) => [
      alert.created_at, alert.level, alert.source, alert.message, alert.status,
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cockpit-alert-history-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: Alert['level']) => {
    switch (level) {
      case 'critical':
        return <AlertCircle size={16} className="text-danger" />;
      case 'error':
        return <AlertTriangle size={16} className="text-danger" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-warning" />;
      case 'info':
        return <Info size={16} className="text-info" />;
      default:
        return <Info size={16} className="text-muted" />;
    }
  };

  const getLevelStats = () => {
    const activeAlerts = alerts.filter(a => a.status === 'active');
    return {
      critical: activeAlerts.filter(a => a.level === 'critical').length,
      error: activeAlerts.filter(a => a.level === 'error').length,
      warning: activeAlerts.filter(a => a.level === 'warning').length,
      info: activeAlerts.filter(a => a.level === 'info').length,
    };
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterLevel !== 'all' && alert.level !== filterLevel) return false;
    if (filterSource !== 'all' && alert.source !== filterSource) return false;
    if (searchQuery) {
      const searchableText = [
        alert.id,
        alert.level,
        alert.source,
        alert.message,
        alert.description,
        alert.status,
        alert.acknowledged_by,
        alert.resolved_by,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchableText.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const activeAlerts = filteredAlerts.filter(a => a.status === 'active');
  const historyAlerts = filteredAlerts.filter(a => a.status !== 'active');

  const stats = getLevelStats();
  const actionableAlerts = (activeAlerts.length ? activeAlerts : alerts).slice(0, 3);
  const allActiveAlerts = alerts.filter((alert) => alert.status === 'active');
  const allHistoryAlerts = alerts.filter((alert) => alert.status !== 'active');
  const firstActiveAlert = allActiveAlerts[0] || alerts[0] || null;
  const firstHistoryAlert = allHistoryAlerts[0] || null;
  const firstRule = rules[0] || null;
  const alertContextQuery = firstActiveAlert?.id || firstHistoryAlert?.id || 'AlertCenter';
  const alertClosureRows: AlertClosureRow[] = [
    {
      id: 'severity-triage',
      title: '告警分级与优先处理',
      summary: '告警页首先要接住的是优先级，不然活跃告警一多，用户还是得自己猜先处理谁。',
      signal: firstActiveAlert ? `活跃 ${allActiveAlerts.length}` : '当前无活跃告警',
      nextAction: firstActiveAlert
        ? `优先围绕 ${firstActiveAlert.message} 定级，再决定先去性能还是日志页追证。`
        : '当前没有活跃告警，抽查一次告警到后续页的承接链是否仍然可用。',
      statusTone: firstActiveAlert ? 'degraded' : 'online',
      objectTarget: { tab: 'AlertCenter', taskQuery: firstActiveAlert?.id || 'alert-triage', alertTab: 'active' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstActiveAlert?.id || 'alert-triage' },
    },
    {
      id: 'evidence-correlation',
      title: '性能日志证据联动',
      summary: '告警只有级别还不够，必须回性能和日志页把时间点、来源和异常正文连起来。',
      signal: firstActiveAlert ? `${firstActiveAlert.source} · ${firstActiveAlert.level}` : '待抽查证据链',
      nextAction: firstActiveAlert
        ? `把 ${firstActiveAlert.source} 的异常带去性能和日志页，确认趋势和真实报错是否对上。`
        : '当前没有明显待追告警，抽查告警到性能/日志的证据联动链路。',
      statusTone: firstActiveAlert ? 'degraded' : 'online',
      objectTarget: { tab: 'Performance', taskQuery: firstActiveAlert?.source || 'alert-performance' },
      taskTarget: { tab: 'LogViewer', taskQuery: firstActiveAlert?.source || 'alert-logs' },
    },
    {
      id: 'rules-governance',
      title: '规则治理与历史复盘',
      summary: '规则和历史不是摆设，它们决定告警是不是在瞎响，还是已经被正确治理过。',
      signal: firstRule ? `规则 ${rules.length}` : `历史 ${allHistoryAlerts.length}`,
      nextAction: firstRule
        ? `先核对 ${firstRule.name} 的条件和通道，再回历史看它是不是造成了误报或漏报。`
        : firstHistoryAlert
          ? `先复盘 ${firstHistoryAlert.message} 的处理结果，再决定是否要补规则。`
          : '当前没有规则或历史样本，补一条最小可验证规则并确认历史页可用。',
      statusTone: firstRule || firstHistoryAlert ? 'degraded' : 'online',
      objectTarget: { tab: 'AlertCenter', taskQuery: firstRule?.id || firstHistoryAlert?.id || 'alert-rules', alertTab: firstRule ? 'rules' : 'history' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstRule?.id || firstHistoryAlert?.id || 'alert-rules' },
    },
    {
      id: 'systemmap-task',
      title: '系统地图与任务回挂',
      summary: '反复出现或长期静默的告警，不能只留在告警页，要回系统地图挂缺口，再由任务中心长期跟。',
      signal: firstActiveAlert ? `待回挂 ${allActiveAlerts.length}` : `历史 ${allHistoryAlerts.length}`,
      nextAction: firstActiveAlert
        ? '把重复告警正式回挂到系统地图，再把长期治理动作沉到任务中心。'
        : '当前没有活跃告警，抽查告警历史回系统地图和任务中心的收口链路。',
      statusTone: alerts.length > 0 ? 'degraded' : 'online',
      objectTarget: { tab: 'SystemMap', pageId: 'AlertCenter' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstActiveAlert?.id || firstHistoryAlert?.id || 'AlertCenter' },
    },
  ];
  const diagnosticTargets = [
    {
      id: 'alert-performance',
      title: '先看性能波动',
      detail: '当告警来自资源或耗时异常时，先去性能页看趋势和受影响服务。',
      actionLabel: '进入性能页',
      actionType: 'navigate' as const,
      actionValue: 'Performance',
      actionTarget: { tab: 'Performance', taskQuery: alertContextQuery },
    },
    {
      id: 'alert-logs',
      title: '再查日志证据',
      detail: '把告警项对应的时间点和来源带到日志页，确认真实报错。',
      actionLabel: '进入日志页',
      actionType: 'navigate' as const,
      actionValue: 'LogViewer',
      actionTarget: { tab: 'LogViewer', taskQuery: alertContextQuery },
    },
    {
      id: 'alert-tasks',
      title: '最后挂到任务中心',
      detail: '高频告警、反复静默和长期未解决项，都要转成明确任务。',
      actionLabel: '进入任务中心',
      actionType: 'navigate' as const,
      actionValue: 'TaskCenter',
      actionTarget: { tab: 'TaskCenter', taskQuery: alertContextQuery },
    },
  ];
  const focusedAlertCard = (() => {
    const matchedAlert = alerts.find((alert) => (
      matchesAlertFocusQuery([alert.id, alert.message, alert.source, alert.description, alert.level, alert.status], focusTaskQuery)
    ));
    if (matchedAlert) {
      return {
        kicker: matchedAlert.status === 'active' ? '活跃告警' : '历史告警',
        title: matchedAlert.message,
        detail: `${matchedAlert.source} · ${matchedAlert.level} · ${matchedAlert.status}`,
        objectTarget: { tab: 'AlertCenter', taskQuery: matchedAlert.id, alertTab: matchedAlert.status === 'active' ? 'active' : 'history' },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedAlert.id },
      };
    }

    const matchedRule = rules.find((rule) => (
      matchesAlertFocusQuery([rule.id, rule.name, rule.condition, rule.level, ...rule.channels], focusTaskQuery)
    ));
    if (matchedRule) {
      return {
        kicker: '告警规则',
        title: matchedRule.name,
        detail: `${matchedRule.condition} · ${matchedRule.level} · ${matchedRule.enabled ? '启用' : '禁用'}`,
        objectTarget: { tab: 'AlertCenter', taskQuery: matchedRule.id, alertTab: 'rules' },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedRule.id },
      };
    }

    const matchedClosure = alertClosureRows.find((row) => (
      matchesAlertFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '告警闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'AlertCenter') {
      return {
        kicker: '当前页面',
        title: '告警中心',
        detail: '这页负责把活跃告警、历史、规则和后续证据链收成统一异常入口。',
        objectTarget: { tab: 'SystemMap', pageId: 'AlertCenter' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'AlertCenter' },
      };
    }

    return null;
  })();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="alert-center-page">
      <RuntimeOpsWorkbench currentPage="AlertCenter" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {dataError && (
        <div role="alert" className="alert-action-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>告警中心数据加载失败：{dataError}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            aria-label="重试告警中心数据"
            onClick={() => {
              setDataError(null);
              setLoading(true);
              setRefreshToken((value) => value + 1);
            }}
          >
            重试
          </button>
        </div>
      )}

      <ActionSurfacePanel
        title="告警动作区"
        subtitle="先分级、再追性能与日志证据，最后把异常正式挂进任务承接。"
        statusText={activeAlerts.length ? `${activeAlerts.length} 条活跃告警` : '当前无活跃告警'}
        items={diagnosticTargets}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />
      {actionNotice && <div role="status" className="alert-action-notice">{actionNotice}</div>}
      {actionError && <div role="alert" className="alert-action-error">{actionError}</div>}

      {focusedAlertCard && (
        <section className="services-section overview-ops-panel" aria-label="当前告警承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前告警承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成告警面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedAlertCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedAlertCard.title}</strong>
              <p>{focusedAlertCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开告警焦点对象 ${focusedAlertCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedAlertCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <AlertTriangle size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开告警焦点任务 ${focusedAlertCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedAlertCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <CheckCircle size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" role="region" aria-label="告警闭环总表">
        <div className="section-header">
          <div>
            <h2>告警闭环总表</h2>
            <p className="text-muted">把分级、证据、规则治理和系统地图/任务回挂并排摆出来，告警页才不只是事件列表和按钮。</p>
          </div>
          <span className="status-badge online">{alertClosureRows.length} 条闭环</span>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {alertClosureRows.map((row) => (
            <article
              key={`alert-closure-${row.id}`}
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
                  aria-label={`打开告警闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <AlertTriangle size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开告警闭环任务 ${row.title}`}
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
            <h2>告警承接工作台</h2>
            <p className="text-muted">把最高优先级告警、待追证据来源和后续页面放在一起，不让处理流程断在告警中心。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">严重 {stats.critical}</span>
            <span className="status-badge degraded">警告 {stats.warning + stats.error}</span>
            <span className="status-badge online">历史 {historyAlerts.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>优先处理告警</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先处理活跃且级别更高的告警，再决定去性能还是日志面继续追。</p>
            </div>
            {actionableAlerts.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有需要处理的告警。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {actionableAlerts.map((alert) => (
                  <button
                    key={`alert-${alert.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`处理告警 ${alert.message}`}
                    onClick={() => openCockpitNavigationTarget({ tab: alert.source.includes('mesh') ? 'LogViewer' : 'Performance', taskQuery: alert.id || alert.source }, onNavigate, onOpenTarget)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{alert.message}</strong>
                      <p>{alert.source} · {alert.level}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{alert.description || '继续追性能与日志证据。'}</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>处理去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>性能、日志、系统地图和任务中心是最常见的后续页。</p>
            </div>
            {[
              { id: 'Performance', label: '性能页', reason: '看资源与延迟趋势。', aria: '打开告警承接到性能页' },
              { id: 'LogViewer', label: '日志页', reason: '看报错正文和时间点。', aria: '打开告警承接到日志页' },
              { id: 'SystemMap', label: '系统地图', reason: '把重复告警挂回全站缺口。', aria: '打开告警承接到系统地图' },
              { id: 'TaskCenter', label: '任务中心', reason: '把长期未收敛的告警转任务。', aria: '打开告警承接到任务中心' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: alertContextQuery }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <CheckCircle size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      {/* 告警统计 */}
      <section className="alert-stats">
        <div className="stats-grid">
          <div className="stat-card stat-critical">
            <AlertCircle size={24} />
            <div className="stat-info">
              <h3>严重</h3>
              <p className="stat-value">{stats.critical}</p>
            </div>
          </div>
          <div className="stat-card stat-error">
            <AlertTriangle size={24} />
            <div className="stat-info">
              <h3>错误</h3>
              <p className="stat-value">{stats.error}</p>
            </div>
          </div>
          <div className="stat-card stat-warning">
            <AlertTriangle size={24} />
            <div className="stat-info">
              <h3>警告</h3>
              <p className="stat-value">{stats.warning}</p>
            </div>
          </div>
          <div className="stat-card stat-info">
            <Info size={24} />
            <div className="stat-info">
              <h3>信息</h3>
              <p className="stat-value">{stats.info}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 标签页 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          活跃告警
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          告警历史
        </button>
        <button
          className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          告警规则
        </button>
      </div>

      {/* 过滤器 */}
      <div className="filters">
        <div className="filter-group">
          <Filter size={16} />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="all">全部级别</option>
            <option value="critical">严重</option>
            <option value="error">错误</option>
            <option value="warning">警告</option>
            <option value="info">信息</option>
          </select>
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">全部来源</option>
            {[...new Set(alerts.map((alert) => alert.source))].map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="搜索告警..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 活跃告警 */}
      {activeTab === 'active' && (
        <div className="alerts-list">
          {activeAlerts.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} className="text-success" />
              <h3>暂无活跃告警</h3>
              <p>所有系统运行正常</p>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="alert-card"
                style={{ borderLeftColor: getLevelIcon(alert.level).props.className?.includes('danger') ? '#e74c3c' : '#f39c12' }}
              >
                <div className="alert-header">
                  <div className="alert-level">
                    {getLevelIcon(alert.level)}
                    <span className="level-text">{alert.level.toUpperCase()}</span>
                  </div>
                  <div className="alert-source">[{alert.source}]</div>
                  <div className="alert-time">
                    {new Date(alert.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="alert-message">{alert.message}</div>
                {alert.description && (
                  <div className="alert-description">{alert.description}</div>
                )}
                <div className="alert-actions">
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={actionAlertId === alert.id}
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    {actionAlertId === alert.id ? '处理中' : '确认'}
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    disabled={actionAlertId === alert.id}
                    onClick={() => handleSilence(alert.id)}
                  >
                    {actionAlertId === alert.id ? '处理中' : '静默'}
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={actionAlertId === alert.id}
                    onClick={() => handleResolve(alert.id)}
                  >
                    {actionAlertId === alert.id ? '处理中' : '解决'}
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    aria-label={`承接告警任务 ${alert.message}`}
                    disabled={queueingAlertId === alert.id || actionAlertId === alert.id}
                    onClick={() => void handleQueueAlert(alert)}
                  >
                    <ClipboardCheck size={13} />
                    {queueingAlertId === alert.id ? '承接中' : '承接任务'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 告警历史 */}
      {activeTab === 'history' && (
        <div className="alerts-history">
          <div className="history-header">
            <button className="btn btn-outline" onClick={exportHistory}>
              <Download size={16} />
              导出
            </button>
          </div>
          <table className="alerts-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>级别</th>
                <th>来源</th>
                <th>消息</th>
                <th>状态</th>
                <th>操作人</th>
              </tr>
            </thead>
            <tbody>
              {historyAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td>{new Date(alert.created_at).toLocaleString('zh-CN')}</td>
                  <td>
                    <span className={`level-badge level-${alert.level}`}>
                      {alert.level}
                    </span>
                  </td>
                  <td>{alert.source}</td>
                  <td>{alert.message}</td>
                  <td>
                    <span className={`status-badge status-${alert.status}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td>{alert.acknowledged_by || alert.resolved_by || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 告警规则 */}
      {activeTab === 'rules' && (
        <div className="alerts-rules">
          <div className="rules-header">
            <button className="btn btn-primary" onClick={() => setRuleFormOpen((value) => !value)}>
              <Plus size={16} />
              {ruleFormOpen ? '收起表单' : '新增规则'}
            </button>
          </div>
          {ruleFormOpen && (
            <form
              className="antd-card"
              style={{ display: 'grid', gap: 10, padding: 16, marginBottom: 16 }}
              onSubmit={(event) => { event.preventDefault(); void createRule(); }}
            >
              <input required aria-label="规则名称" placeholder="规则名称" value={ruleForm.name} onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))} />
              <input required aria-label="规则条件" placeholder="规则条件，例如 health_rate < 90%" value={ruleForm.condition} onChange={(event) => setRuleForm((current) => ({ ...current, condition: event.target.value }))} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <select aria-label="规则级别" value={ruleForm.level} onChange={(event) => setRuleForm((current) => ({ ...current, level: event.target.value }))}>
                  <option value="critical">严重</option>
                  <option value="error">错误</option>
                  <option value="warning">警告</option>
                  <option value="info">信息</option>
                </select>
                <input aria-label="通知渠道" placeholder="通知渠道，逗号分隔" value={ruleForm.channels} onChange={(event) => setRuleForm((current) => ({ ...current, channels: event.target.value }))} />
                <label><input type="checkbox" checked={ruleForm.enabled} onChange={(event) => setRuleForm((current) => ({ ...current, enabled: event.target.checked }))} /> 启用</label>
                <button type="submit" className="btn btn-primary" disabled={ruleSaving}>
                  {ruleSaving ? '保存中...' : '保存规则'}
                </button>
              </div>
            </form>
          )}
          <table className="rules-table">
            <thead>
              <tr>
                <th>规则名称</th>
                <th>条件</th>
                <th>级别</th>
                <th>通知渠道</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td><code>{rule.condition}</code></td>
                  <td>
                    <span className={`level-badge level-${rule.level}`}>
                      {rule.level}
                    </span>
                  </td>
                  <td>{rule.channels.join(', ')}</td>
                  <td>
                    <span className={`status-badge ${rule.enabled ? 'status-enabled' : 'status-disabled'}`}>
                      {rule.enabled ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" aria-label={`${rule.enabled ? '停用' : '启用'}规则 ${rule.name}`} disabled={ruleActionId === rule.id} onClick={() => { void toggleRule(rule); }}>
                      <Settings size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
