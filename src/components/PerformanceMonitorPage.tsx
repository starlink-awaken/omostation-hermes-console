import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, Activity, RefreshCw } from 'lucide-react';
import LineChart from './charts/LineChart';
import AreaChart from './charts/AreaChart';

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
  cpu: number;
  memory: number;
  uptime: string;
}

export default function PerformanceMonitorPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');

  useEffect(() => {
    const fetchData = async () => {
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
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [timeRange]);

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
      <div className="loading-state">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="performance-monitor-page">
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
        <button className="btn btn-outline">
          <RefreshCw size={14} />
          刷新
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
        <h2>服务状态</h2>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
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
                  <span>CPU: {service.cpu}%</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ 
                        width: `${service.cpu}%`,
                        backgroundColor: service.cpu > 80 ? '#e74c3c' : '#3b82f6',
                      }}
                    />
                  </div>
                </div>
                <div className="metric">
                  <HardDrive size={14} />
                  <span>内存: {service.memory}%</span>
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ 
                        width: `${service.memory}%`,
                        backgroundColor: service.memory > 80 ? '#e74c3c' : '#10b981',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="service-uptime">
                <Activity size={14} />
                <span>运行时间: {service.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
