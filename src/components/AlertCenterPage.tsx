/**
 * AlertCenterPage with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React, { useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';

// ── Types ──

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

interface AlertListResponse {
  items: Alert[];
}

interface AlertRuleListResponse {
  items: AlertRule[];
}

// ── Hooks ──

function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await apiFetch<AlertListResponse>('/api/alerts');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch alerts');
      }
      return response.data?.items || [];
    },
    staleTime: 15000,
    refetchInterval: 15000,
    retry: 3,
  });
}

function useAlertRules() {
  return useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const response = await apiFetch<AlertRuleListResponse>('/api/alerts/rules');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch alert rules');
      }
      return response.data?.items || [];
    },
    staleTime: 60000,
    retry: 3,
  });
}

function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiPost(`/api/alerts/${alertId}/acknowledge`, {});
      if (!response.ok) {
        throw new Error(response.error || 'Failed to acknowledge alert');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

function useSilenceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ alertId, duration }: { alertId: string; duration: number }) => {
      const response = await apiPost(`/api/alerts/${alertId}/silence`, { duration });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to silence alert');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiPost(`/api/alerts/${alertId}/resolve`, {});
      if (!response.ok) {
        throw new Error(response.error || 'Failed to resolve alert');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// ── Component ──

type TabType = 'active' | 'history' | 'rules';

export default function AlertCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useAlerts();
  const { data: rules, isLoading: rulesLoading } = useAlertRules();
  const acknowledgeMutation = useAcknowledgeAlert();
  const silenceMutation = useSilenceAlert();
  const resolveMutation = useResolveAlert();

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

  const getLevelColor = (level: Alert['level']) => {
    switch (level) {
      case 'critical':
        return '#e74c3c';
      case 'error':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      case 'info':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const getStatusColor = (status: Alert['status']) => {
    switch (status) {
      case 'active':
        return '#e74c3c';
      case 'acknowledged':
        return '#f39c12';
      case 'silenced':
        return '#95a5a6';
      case 'resolved':
        return '#2ecc71';
      default:
        return '#95a5a6';
    }
  };

  const getStatusText = (status: Alert['status']) => {
    switch (status) {
      case 'active':
        return '活跃';
      case 'acknowledged':
        return '已确认';
      case 'silenced':
        return '已静音';
      case 'resolved':
        return '已解决';
      default:
        return '未知';
    }
  };

  const displayAlerts = alerts || [];
  const displayRules = rules || [];

  // Filter alerts based on active tab
  const filteredAlerts = displayAlerts.filter((alert) => {
    if (activeTab === 'active') {
      if (alert.status === 'resolved') return false;
    } else if (activeTab === 'history') {
      if (alert.status !== 'resolved') return false;
    }

    if (filterLevel !== 'all' && alert.level !== filterLevel) return false;
    if (filterSource !== 'all' && alert.source !== filterSource) return false;
    if (searchQuery && !alert.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    return true;
  });

  const sources = [...new Set(displayAlerts.map((a) => a.source))];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} aria-hidden="true" className="text-warning" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>告警中心</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="antd-btn" aria-label="导出告警">
            <Download size={14} />
            <span>导出</span>
          </button>
          <button className="antd-btn antd-btn-primary" aria-label="创建告警规则">
            <Plus size={14} />
            <span>创建规则</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--antd-border-color)' }}>
        {(['active', 'history', 'rules'] as TabType[]).map((tab) => (
          <button
            key={tab}
            className={`antd-btn ${activeTab === tab ? 'antd-btn-primary' : ''}`}
            onClick={() => setActiveTab(tab)}
            aria-selected={activeTab === tab}
            role="tab"
          >
            {tab === 'active' ? '活跃告警' : tab === 'history' ? '历史告警' : '告警规则'}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab !== 'rules' && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} className="text-muted" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="antd-input"
              aria-label="按级别过滤"
            >
              <option value="all">所有级别</option>
              <option value="critical">严重</option>
              <option value="error">错误</option>
              <option value="warning">警告</option>
              <option value="info">信息</option>
            </select>
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="antd-input"
            aria-label="按来源过滤"
          >
            <option value="all">所有来源</option>
            {sources.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} className="text-muted" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索告警消息..."
              className="antd-input"
              style={{ paddingLeft: '36px', width: '100%' }}
              aria-label="搜索告警"
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {(alertsLoading || rulesLoading) && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

      {/* Error State */}
      {alertsError && (
        <div role="alert" style={{ 
          padding: '16px', 
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} />
            <strong>告警数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{alertsError.message}</div>
        </div>
      )}

      {/* Alert List */}
      {activeTab !== 'rules' && !alertsLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
              <CheckCircle size={24} className="text-success" style={{ marginBottom: '8px' }} />
              <div>暂无{activeTab === 'active' ? '活跃' : '历史'}告警</div>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="antd-card"
                style={{ 
                  borderLeft: `4px solid ${getLevelColor(alert.level)}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {getLevelIcon(alert.level)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{alert.message}</div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      {alert.source} · {new Date(alert.created_at).toLocaleString()}
                    </div>
                    {alert.description && (
                      <div style={{ fontSize: '13px', color: 'var(--antd-text-secondary)', marginTop: '4px' }}>
                        {alert.description}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getStatusColor(alert.status),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getStatusColor(alert.status)}15`,
                  }}>
                    {getStatusText(alert.status)}
                  </span>
                  {alert.status === 'active' && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="antd-btn small"
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={acknowledgeMutation.isPending}
                        aria-label={`确认告警 ${alert.id}`}
                      >
                        确认
                      </button>
                      <button
                        className="antd-btn small"
                        onClick={() => silenceMutation.mutate({ alertId: alert.id, duration: 60 })}
                        disabled={silenceMutation.isPending}
                        aria-label={`静音告警 ${alert.id}`}
                      >
                        静音
                      </button>
                      <button
                        className="antd-btn small"
                        onClick={() => resolveMutation.mutate(alert.id)}
                        disabled={resolveMutation.isPending}
                        aria-label={`解决告警 ${alert.id}`}
                      >
                        解决
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rules List */}
      {activeTab === 'rules' && !rulesLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayRules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
              <Settings size={24} className="text-muted" style={{ marginBottom: '8px' }} />
              <div>暂无告警规则</div>
            </div>
          ) : (
            displayRules.map((rule) => (
              <div
                key={rule.id}
                className="antd-card"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <Settings size={16} className="text-muted" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{rule.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      条件: {rule.condition}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      级别: {rule.level} · 渠道: {rule.channels.join(', ')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: rule.enabled ? 'var(--antd-success)' : 'var(--antd-text-muted)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: rule.enabled ? 'rgba(82, 196, 26, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                  }}>
                    {rule.enabled ? '启用' : '禁用'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
