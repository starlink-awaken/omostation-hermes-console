/**
 * PerformanceMonitorPage — 性能监控.
 *
 * 从 fullsite 移植的改进:
 *   - 降级/热点服务自动检测 (status != online OR cpu/memory >= 80%)
 *   - 服务搜索筛选 + 状态筛选
 *   - 空筛选结果提示
 *   - 刷新中 spinner 状态 + 禁用按钮
 *   - 空数据/错误态 a11y
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Cpu, HardDrive, RefreshCw, Wifi } from 'lucide-react';
import './PerformanceMonitorPage.css';

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
  uptime: string;
}

export default function PerformanceMonitorPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [serviceQuery, setServiceQuery] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [metricsRes, servicesRes] = await Promise.all([
        fetch(`/api/metrics/system?range=${timeRange}`),
        fetch('/api/services/status'),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.items || []);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
      setError(err instanceof Error ? err.message : '性能数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // 降级/热点服务自动检测
  const { degradedServices, hotServices, leadPerformanceService } = useMemo(() => {
    const degraded = services.filter((s) => s.status !== 'online' || (s.cpu ?? 0) >= 80 || (s.memory ?? 0) >= 80);
    const hot = services.filter((s) => (s.cpu ?? 0) >= 80 || (s.memory ?? 0) >= 80);
    const lead = hot.sort((a, b) => (b.cpu ?? 0) - (a.cpu ?? 0))[0] || null;
    return { degradedServices: degraded, hotServices: hot, leadPerformanceService: lead };
  }, [services]);

  // 服务筛选
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      if (serviceStatusFilter !== 'all' && service.status !== serviceStatusFilter) return false;
      if (serviceQuery) {
        const query = serviceQuery.toLowerCase();
        if (!service.name.toLowerCase().includes(query) && !service.status.includes(query)) return false;
      }
      return true;
    });
  }, [services, serviceQuery, serviceStatusFilter]);

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

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="performance-monitor-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>性能监控</h1>
        </div>
        <button
          className="antd-btn"
          onClick={() => void fetchData(true)}
          disabled={refreshing}
          aria-label="刷新性能数据"
        >
          <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? '刷新中...' : '刷新'}</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div role="alert" style={{
          padding: '16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} />
            <strong>性能数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error}</div>
          <button
            className="antd-btn"
            style={{ marginTop: '8px' }}
            onClick={() => void fetchData(true)}
          >
            <RefreshCw size={14} />
            <span>重试</span>
          </button>
        </div>
      )}

      {/* 降级/热点服务警告 */}
      {degradedServices.length > 0 && (
        <div style={{
          padding: '12px 16px',
          border: '1px solid rgba(255, 184, 0, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 184, 0, 0.06)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={16} style={{ color: 'var(--antd-warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--antd-warning)', marginBottom: '4px' }}>
              {degradedServices.length} 个服务需要关注
            </div>
            <div style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              {leadPerformanceService && (
                <>热点: {leadPerformanceService.name} (CPU: {leadPerformanceService.cpu ?? 'N/A'}%, 内存: {leadPerformanceService.memory ?? 'N/A'}%)</>
              )}
              {hotServices.length > 0 && !leadPerformanceService && (
                <>高负载: {hotServices.map(s => s.name).join(', ')}</>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 时间范围选择 */}
      <div className="time-range-selector" style={{ display: 'flex', gap: '8px' }}>
        {(['1h', '6h', '24h', '7d'] as const).map((range) => (
          <button
            key={range}
            className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
            onClick={() => setTimeRange(range)}
          >
            {range === '1h' ? '1小时' : range === '6h' ? '6小时' : range === '24h' ? '24小时' : '7天'}
          </button>
        ))}
      </div>

      {/* 系统指标图表 */}
      {metrics && (
        <div className="metrics-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="chart-card antd-card">
            <div className="chart-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Cpu size={20} />
              <h3 style={{ margin: 0, fontSize: '14px' }}>CPU 使用率</h3>
            </div>
            {metrics.cpu && metrics.cpu.length > 0 && (
              <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                {metrics.cpu.slice(-30).map((point, i) => (
                  <div key={i} style={{ flex: 1, background: '#3b82f6', height: `${Math.min(point.value, 100)}%`, minHeight: 2, borderRadius: '2px 2px 0 0' }} />
                ))}
              </div>
            )}
          </div>
          <div className="chart-card antd-card">
            <div className="chart-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <HardDrive size={20} />
              <h3 style={{ margin: 0, fontSize: '14px' }}>内存使用率</h3>
            </div>
            {metrics.memory && metrics.memory.length > 0 && (
              <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                {metrics.memory.slice(-30).map((point, i) => (
                  <div key={i} style={{ flex: 1, background: '#10b981', height: `${Math.min(point.value, 100)}%`, minHeight: 2, borderRadius: '2px 2px 0 0' }} />
                ))}
              </div>
            )}
          </div>
          <div className="chart-card antd-card">
            <div className="chart-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <HardDrive size={20} />
              <h3 style={{ margin: 0, fontSize: '14px' }}>磁盘使用率</h3>
            </div>
            {metrics.disk && metrics.disk.length > 0 && (
              <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                {metrics.disk.slice(-30).map((point, i) => (
                  <div key={i} style={{ flex: 1, background: point.value >= 80 ? '#ef4444' : '#f59e0b', height: `${Math.min(point.value, 100)}%`, minHeight: 2, borderRadius: '2px 2px 0 0' }} />
                ))}
              </div>
            )}
          </div>
          <div className="chart-card antd-card">
            <div className="chart-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Wifi size={20} />
              <h3 style={{ margin: 0, fontSize: '14px' }}>网络流量</h3>
            </div>
            {metrics.network && metrics.network.length > 0 && (
              <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                {metrics.network.slice(-30).map((point, i) => (
                  <div key={i} style={{ flex: 1, background: '#8b5cf6', height: `${Math.min(point.value, 100)}%`, minHeight: 2, borderRadius: '2px 2px 0 0' }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 服务状态 */}
      <section className="services-status">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>服务状态</h2>
          <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
            {filteredServices.length}/{services.length} 服务
          </span>
        </div>

        {/* 筛选控件 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="搜索服务名或状态..."
            value={serviceQuery}
            onChange={(e) => setServiceQuery(e.target.value)}
            className="antd-input"
            style={{ flex: '1 1 200px', minWidth: 180 }}
            aria-label="搜索服务"
          />
          <select
            value={serviceStatusFilter}
            onChange={(e) => setServiceStatusFilter(e.target.value as typeof serviceStatusFilter)}
            className="antd-input"
            aria-label="按状态筛选"
          >
            <option value="all">全部状态</option>
            <option value="online">在线</option>
            <option value="degraded">降级</option>
            <option value="offline">离线</option>
          </select>
          {(serviceQuery || serviceStatusFilter !== 'all') && (
            <button
              className="antd-btn"
              onClick={() => { setServiceQuery(''); setServiceStatusFilter('all'); }}
            >
              清除筛选
            </button>
          )}
        </div>

        {/* 空筛选结果 */}
        {filteredServices.length === 0 && services.length > 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
            <AlertTriangle size={24} className="text-muted" style={{ marginBottom: '8px' }} />
            <div>当前筛选下没有匹配的服务</div>
          </div>
        )}

        {/* 空数据 */}
        {services.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
            <Cpu size={24} className="text-muted" style={{ marginBottom: '8px' }} />
            <div>暂无服务数据</div>
          </div>
        )}

        <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {filteredServices.map((service, index) => (
            <div key={index} className="service-card antd-card">
              <div className="service-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="service-name" style={{ fontWeight: 600 }}>{service.name}</div>
                <div
                  className="service-status"
                  style={{ color: getStatusColor(service.status), fontSize: '12px', fontWeight: 500 }}
                >
                  {getStatusText(service.status)}
                </div>
              </div>
              <div className="service-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {typeof service.cpu === 'number' && (
                  <div className="metric" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Cpu size={14} />
                    <span>CPU: {service.cpu}%</span>
                    <div className="metric-bar" style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div
                        className="metric-fill"
                        style={{
                          width: `${Math.min(service.cpu, 100)}%`,
                          height: '100%',
                          backgroundColor: service.cpu > 80 ? '#e74c3c' : '#3b82f6',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                )}
                {typeof service.memory === 'number' && (
                  <div className="metric" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <HardDrive size={14} />
                    <span>内存: {service.memory}%</span>
                    <div className="metric-bar" style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <div
                        className="metric-fill"
                        style={{
                          width: `${Math.min(service.memory, 100)}%`,
                          height: '100%',
                          backgroundColor: service.memory > 80 ? '#e74c3c' : '#10b981',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="service-uptime" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                <Cpu size={12} />
                <span>运行时间: {service.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
