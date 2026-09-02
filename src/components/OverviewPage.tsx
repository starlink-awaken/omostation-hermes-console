import React from 'react';
import { Server, Cpu, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

interface Service {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: string;
  latency: string;
}

interface RawService {
  name: string;
  circuit?: string;
  uptime?: string;
  latency?: string;
}

/**
 * Fetch services from the backend using the centralized API client.
 * Uses React Query for caching, background refetching, and loading/error states.
 */
function useServicesQuery() {
  return useQuery({
    queryKey: ['services-overview'],
    queryFn: async () => {
      const response = await apiFetch<RawService[]>('/api/services');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch services');
      }
      // 兼容两种响应形态: 直接数组 或 { services: [...] } 包装对象
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).services)) {
        return (data as Record<string, unknown>).services as RawService[];
      }
      return [];
    },
    staleTime: 5000,
    refetchInterval: 5000,
    retry: 3,
  });
}

export default function OverviewPage() {
  const { data: rawServices, isLoading, error: servicesError } = useServicesQuery();

  // API may return array or error object
  const servicesArray: Service[] = Array.isArray(rawServices)
    ? rawServices.map((item) => ({
        id: item.name,
        name: item.name,
        status: item.circuit === '断路' ? 'offline' : item.circuit === '半开' ? 'degraded' : 'online',
        uptime: item.uptime || 'N/A',
        latency: item.latency || '-',
      }))
    : [];

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
            <p className="stat-value">
              {isLoading ? '—' : servicesError ? '—' : `${servicesArray.filter(s => s.status === 'online').length} / ${servicesArray.length}`}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent" aria-hidden="true">
            <Cpu size={20} />
          </div>
          <div className="stat-info">
            <h3>服务健康度</h3>
            <p className="stat-value">
              {isLoading ? '—' : servicesError ? '—' : `${servicesArray.length > 0 ? Math.round((servicesArray.filter(s => s.status === 'online').length / servicesArray.length) * 100) : 0}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px' }}>核心服务节点</h2>
          <button className="antd-btn">查看全部</button>
        </div>

        <div className="services-list">
          {isLoading ? (
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
                {servicesArray.map(svc => (
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
