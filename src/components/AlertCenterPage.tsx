import React, { useState, useEffect } from 'react';
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

export default function AlertCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
