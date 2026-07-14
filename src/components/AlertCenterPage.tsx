import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [alertsRes, rulesRes] = await Promise.all([
          fetch('/api/alerts'),
          fetch('/api/alerts/rules'),
        ]);

        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data.items || []);
        }

        if (rulesRes.ok) {
          const data = await rulesRes.json();
          setRules(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch alerts data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, status: 'acknowledged' } : a
      ));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleSilence = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 60 }),
      });
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, status: 'silenced' } : a
      ));
    } catch (error) {
      console.error('Failed to silence alert:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, status: 'resolved' } : a
      ));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
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
    if (searchQuery && !alert.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
    },
    {
      id: 'alert-logs',
      title: '再查日志证据',
      detail: '把告警项对应的时间点和来源带到日志页，确认真实报错。',
      actionLabel: '进入日志页',
      actionType: 'navigate' as const,
      actionValue: 'LogViewer',
    },
    {
      id: 'alert-tasks',
      title: '最后挂到任务中心',
      detail: '高频告警、反复静默和长期未解决项，都要转成明确任务。',
      actionLabel: '进入任务中心',
      actionType: 'navigate' as const,
      actionValue: 'TaskCenter',
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
      <RuntimeOpsWorkbench currentPage="AlertCenter" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="告警动作区"
        subtitle="先分级、再追性能与日志证据，最后把异常正式挂进任务承接。"
        statusText={activeAlerts.length ? `${activeAlerts.length} 条活跃告警` : '当前无活跃告警'}
        items={diagnosticTargets}
        onNavigate={onNavigate}
      />

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
                    onClick={() => onNavigate?.(alert.source.includes('mesh') ? 'LogViewer' : 'Performance')}
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
                onClick={() => onNavigate?.(page.id)}
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
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    确认
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleSilence(alert.id)}
                  >
                    静默
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleResolve(alert.id)}
                  >
                    解决
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
            <button className="btn btn-outline">
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
            <button className="btn btn-primary">
              <Plus size={16} />
              新增规则
            </button>
          </div>
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
                    <button className="btn btn-sm btn-outline">
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
