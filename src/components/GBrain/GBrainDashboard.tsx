import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Database, Users, Settings2, FileText, Activity, ShieldAlert, Heart, Shield } from 'lucide-react';
import { api } from './api';
import { LoginPage } from './Login';
import { AgentsPage } from './Agents';
import { CalibrationPage } from './Calibration';
import { RequestLogPage } from './RequestLog';
import MemoryInjector from '../MemoryInjector';

interface FeedEvent {
  agent: string;
  operation: string;
  scopes: string;
  latency_ms: number;
  status: string;
  timestamp: string;
}

type KnowledgeDashboardSubTab = 'monitor' | 'memory' | 'agents' | 'calibration' | 'logs';

interface DashboardPageProps {
  initialSubTab?: KnowledgeDashboardSubTab;
  initialQuery?: string;
}

export function DashboardPage({ initialSubTab = 'monitor', initialQuery }: DashboardPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [subTab, setSubTab] = useState<KnowledgeDashboardSubTab>(initialSubTab);
  
  const [stats, setStats] = useState({ connected_agents: 0, requests_today: 0, active_tokens: 0 });
  const [health, setHealth] = useState({ expiring_soon: 0, error_rate: '0%' });
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [loadError, setLoadError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const loadStatsAndHealth = async (): Promise<boolean> => {
    try {
      const statsData = await api.stats();
      setStats(statsData);
      const healthData = await api.health();
      setHealth(healthData);
      setLoadError(null);
      setIsAuthenticated(true);
      return true;
    } catch (err: any) {
      if (err.message === 'Unauthorized' || err.message === 'HTTP 401') {
        setIsAuthenticated(false);
        setLoadError(null);
      } else {
        setLoadError(err instanceof Error ? err.message : 'GBrain 管理接口不可用');
      }
      return false;
    }
  };

  useEffect(() => {
    if (!isAuthenticated || loadError) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const reconnectDelay = 5000;

    const connectEvents = () => {
      if (cancelled) return;
      setSseStatus('connecting');
      es = new EventSource('/admin/events');
      eventSourceRef.current = es;
      es.onopen = () => setSseStatus('connected');
      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as FeedEvent;
          setEvents(prev => [event, ...prev].slice(0, 50));
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        eventSourceRef.current = null;
        if (cancelled) return;
        setSseStatus('disconnected');
        // Re-check auth before retrying, then keep the live feed recoverable.
        void loadStatsAndHealth().then((available) => {
          if (!available || cancelled) return;
          reconnectTimer = setTimeout(connectEvents, reconnectDelay);
        });
      };
    };

    const start = async () => {
      const available = await loadStatsAndHealth();
      if (!available || cancelled) return;

      connectEvents();

      interval = setInterval(() => {
        void loadStatsAndHealth();
      }, 15000);
    };
    void start();

    return () => {
      cancelled = true;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, loadError]);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  // If unauthorized, show inner login component
  if (!isAuthenticated) {
    return (
      <div className="antd-card animate-fade-in" style={{ padding: '2rem', maxWidth: '500px', margin: '40px auto', border: '1px solid var(--antd-border-color)' }}>
        <LoginPage onLogin={() => {
          setIsAuthenticated(true);
          loadStatsAndHealth();
        }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <section className="antd-card animate-fade-in" role="alert" style={{ padding: '24px', border: '1px solid var(--antd-border-color)' }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>GBrain 管理接口暂不可用</h2>
        <p className="text-muted" style={{ margin: '8px 0 0' }}>
          统计、凭证和访问日志没有成功读取，页面不会把空数据当成真实的 0。请确认 GBrain admin 服务已挂载后重试。
        </p>
        <p style={{ margin: '12px 0', fontSize: 13 }}>原因：{loadError}</p>
        <button type="button" className="antd-btn" onClick={() => setLoadError(null)}>
          重试
        </button>
      </section>
    );
  }

  return (
    <div className="knowledge-center-container">
      {/* Dynamic Sub Navigation Tabs */}
      <nav className="knowledge-tabs-container" aria-label="知识中枢子导航">
        <button 
          className={`knowledge-tab-btn ${subTab === 'monitor' ? 'active' : ''}`}
          onClick={() => setSubTab('monitor')}
        >
          <BarChart3 size={15} />
          <span>运行看板</span>
        </button>
        <button 
          className={`knowledge-tab-btn ${subTab === 'memory' ? 'active' : ''}`}
          onClick={() => setSubTab('memory')}
        >
          <Database size={15} />
          <span>记忆交互</span>
        </button>
        <button 
          className={`knowledge-tab-btn ${subTab === 'agents' ? 'active' : ''}`}
          onClick={() => setSubTab('agents')}
        >
          <Users size={15} />
          <span>智能体管理</span>
        </button>
        <button 
          className={`knowledge-tab-btn ${subTab === 'calibration' ? 'active' : ''}`}
          onClick={() => setSubTab('calibration')}
        >
          <Settings2 size={15} />
          <span>大模型校准</span>
        </button>
        <button 
          className={`knowledge-tab-btn ${subTab === 'logs' ? 'active' : ''}`}
          onClick={() => setSubTab('logs')}
        >
          <FileText size={15} />
          <span>访问日志</span>
        </button>
      </nav>

      {/* Sub Tab View Content */}
      <div className="knowledge-tab-content">
        {subTab === 'monitor' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Stats Grid using cockpit-native styling */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper pulse-accent" aria-hidden="true">
                  <Users size={20} />
                </div>
                <div className="stat-info">
                  <h3>连接智能体</h3>
                  <p className="stat-value">{stats.connected_agents}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
                  <Activity size={20} />
                </div>
                <div className="stat-info">
                  <h3>今日请求数</h3>
                  <p className="stat-value">{stats.requests_today}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper pulse-accent" style={{ background: 'rgba(147, 197, 253, 0.08)', color: '#93c5fd' }} aria-hidden="true">
                  <Shield size={20} />
                </div>
                <div className="stat-info">
                  <h3>活跃凭证 (Tokens)</h3>
                  <p className="stat-value">{stats.active_tokens}</p>
                </div>
              </div>
            </div>

            {/* Split layout for Live Activity and Health Metrics */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 320 }} className="services-list">
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--antd-border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--antd-text-primary)', margin: 0 }}>
                    实时事件流 (Live Activity)
                  </h2>
                  <span style={{ 
                    fontSize: 11, 
                    padding: '3px 8px', 
                    borderRadius: 'var(--antd-radius-md)', 
                    background: sseStatus === 'connected' ? 'var(--antd-success-bg)' : 'rgba(255, 184, 0, 0.08)',
                    color: sseStatus === 'connected' ? 'var(--antd-success)' : 'var(--antd-warning)',
                    border: `1px solid ${sseStatus === 'connected' ? 'rgba(5,243,162,0.15)' : 'rgba(255, 184, 0, 0.15)'}`
                  }}>
                    {sseStatus === 'connected' ? '● 正在监听' : sseStatus === 'connecting' ? '● 正在重连...' : '● 已断开'}
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  {events.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--antd-text-secondary)' }}>
                      {sseStatus === 'connected' ? '等待智能体接入中...' : '正在建立长连接...'}
                    </div>
                  ) : (
                    <table className="services-table" style={{ border: 'none' }}>
                      <thead>
                        <tr>
                          <th>智能体 (Agent)</th>
                          <th>操作类型</th>
                          <th>权限域 (Scopes)</th>
                          <th>耗时</th>
                          <th>状态</th>
                          <th>发生时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((e, i) => (
                          <tr key={i} className="service-row">
                            <td className="mono" style={{ fontWeight: 500 }}>{e.agent}</td>
                            <td className="mono">{e.operation}</td>
                            <td>
                              {e.scopes.split(',').map(s => (
                                <span key={s} className={`badge badge-${s.trim()}`} style={{ marginRight: 4 }}>
                                  {s.trim()}
                                </span>
                              ))}
                            </td>
                            <td className="mono">{e.latency_ms} ms</td>
                            <td>
                              <span className={`status-badge ${e.status === 'ok' ? 'online' : 'offline'}`}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: e.status === 'ok' ? 'var(--antd-success)' : 'var(--antd-error)', display: 'inline-block' }}></span>
                                <span style={{ marginLeft: 4 }}>{e.status}</span>
                              </span>
                            </td>
                            <td style={{ color: 'var(--antd-text-secondary)' }}>{timeAgo(e.timestamp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Side token health stats */}
              <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'fit-content', padding: 24, minWidth: 260, border: '1px solid var(--antd-border-color)', borderRadius: 'var(--antd-radius-lg)', background: 'var(--antd-bg-container)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--antd-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Heart size={16} className="text-warning" />
                  凭证健康度
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--antd-text-secondary)' }}>即将过期凭证</span>
                    <span className="mono" style={{ fontWeight: 600, color: health.expiring_soon > 0 ? 'var(--antd-warning)' : 'var(--antd-text-primary)' }}>{health.expiring_soon}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'var(--antd-text-secondary)' }}>近 24 小时错误率</span>
                    <span className="mono" style={{ fontWeight: 600, color: health.error_rate !== '0%' ? 'var(--antd-error)' : 'var(--antd-success)' }}>{health.error_rate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'memory' && (
          <div className="animate-fade-in">
            <MemoryInjector />
          </div>
        )}

        {subTab === 'agents' && (
          <div className="animate-fade-in antd-card" style={{ padding: 24, border: '1px solid var(--antd-border-color)' }}>
            <AgentsPage focusQuery={initialQuery} />
          </div>
        )}

        {subTab === 'calibration' && (
          <div className="animate-fade-in antd-card" style={{ padding: 24, border: '1px solid var(--antd-border-color)' }}>
            <CalibrationPage />
          </div>
        )}

        {subTab === 'logs' && (
          <div className="animate-fade-in antd-card" style={{ padding: 24, border: '1px solid var(--antd-border-color)' }}>
            <RequestLogPage />
          </div>
        )}
      </div>
    </div>
  );
}
