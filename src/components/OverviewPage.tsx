import React, { useState, useEffect } from 'react';
import { Server, Cpu, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: string;
  latency: string;
}

export default function OverviewPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          const formattedServices: Service[] = data.map((item: any) => ({
            id: item.name,
            name: item.name,
            status: item.circuit === '断路' ? 'offline' : item.circuit === '半开' ? 'degraded' : 'online',
            uptime: item.uptime || 'N/A',
            latency: item.latency || '-',
          }));
          setServices(formattedServices.length > 0 ? formattedServices : []);
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle size={14} aria-hidden="true" className="text-success" />;
      case 'offline': return <XCircle size={14} aria-hidden="true" className="text-danger" />;
      case 'degraded': return <AlertTriangle size={14} aria-hidden="true" className="text-warning" />;
      default: return null;
    }
  };

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
            <Server size={20} />
          </div>
          <div className="stat-info">
            <h3>活跃服务数</h3>
            <p className="stat-value">24 / 28</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent" aria-hidden="true">
            <Cpu size={20} />
          </div>
          <div className="stat-info">
            <h3>大模型请求数</h3>
            <p className="stat-value">12.4k</p>
          </div>
        </div>
      </div>

      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px' }}>核心服务节点</h2>
          <button className="antd-btn">查看全部</button>
        </div>

        <div className="services-list">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" aria-hidden="true"></div>
              <p>正在连接 Agora 服务网格...</p>
            </div>
          ) : (
            <table className="services-table">
              <thead>
                <tr>
                  <th scope="col">服务名称</th>
                  <th scope="col">运行状态</th>
                  <th scope="col">正常运行时间</th>
                  <th scope="col">响应延迟</th>
                </tr>
              </thead>
              <tbody>
                {services.map(svc => (
                  <tr key={svc.id} className="service-row">
                    <td className="font-medium" style={{ fontWeight: 500 }}>{svc.name}</td>
                    <td>
                      <span className={`status-badge ${svc.status}`}>
                        {getStatusIcon(svc.status)}
                        <span style={{ marginLeft: '4px' }}>{svc.status}</span>
                      </span>
                    </td>
                    <td className="text-muted">{svc.uptime}</td>
                    <td className="text-muted">{svc.latency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
