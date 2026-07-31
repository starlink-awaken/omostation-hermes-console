/**
 * TopologyView with React Query integration.
 */

import React, { useState } from 'react';
import { Network, Globe, Server, Activity, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// ── Types ──

interface Service {
  id: string;
  name: string;
  status: string;
  type: string;
  port?: number;
  dependencies?: string[];
}

interface ServiceListResponse {
  services: Service[];
}

// ── Hook ──

function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await apiFetch<ServiceListResponse>('/api/services');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch services');
      }
      return response.data?.services || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

// ── Component ──

export default function TopologyViewWithQuery() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const { data: services, isLoading, error } = useServices();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return 'var(--antd-success)';
      case 'degraded':
      case 'warning':
        return 'var(--antd-warning)';
      case 'unhealthy':
      case 'error':
      case 'stopped':
        return 'var(--antd-error)';
      default:
        return 'var(--antd-text-muted)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return '健康';
      case 'degraded':
      case 'warning':
        return '降级';
      case 'unhealthy':
      case 'error':
      case 'stopped':
        return '异常';
      default:
        return '未知';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api':
        return <Server size={16} className="text-primary" />;
      case 'service':
        return <Globe size={16} className="text-info" />;
      case 'database':
        return <Activity size={16} className="text-warning" />;
      default:
        return <Network size={16} className="text-muted" />;
    }
  };

  const displayServices = services || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>全局服务拓扑</h1>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

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
            <Activity size={16} />
            <strong>服务数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Service Grid */}
      {displayServices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          {displayServices.map((service) => (
            <div
              key={service.id}
              className="antd-card"
              style={{ 
                cursor: 'pointer',
                borderLeft: `4px solid ${getStatusColor(service.status)}`,
              }}
              onClick={() => setSelectedService(selectedService?.id === service.id ? null : service)}
              role="button"
              tabIndex={0}
              aria-label={`查看服务 ${service.name}`}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedService(selectedService?.id === service.id ? null : service)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                {getTypeIcon(service.type)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{service.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                    类型: {service.type}
                    {service.port && <span> · 端口: {service.port}</span>}
                  </div>
                </div>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 500,
                  color: getStatusColor(service.status),
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: `${getStatusColor(service.status)}15`,
                }}>
                  {getStatusText(service.status)}
                </span>
              </div>
              
              {service.dependencies && service.dependencies.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                  依赖: {service.dependencies.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Service Detail */}
      {selectedService && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>服务详情</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>名称</div>
              <div style={{ fontWeight: 500 }}>{selectedService.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>类型</div>
              <div>{selectedService.type}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>状态</div>
              <span style={{ 
                color: getStatusColor(selectedService.status),
                fontWeight: 500,
              }}>
                {getStatusText(selectedService.status)}
              </span>
            </div>
            {selectedService.port && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>端口</div>
                <div>{selectedService.port}</div>
              </div>
            )}
          </div>
          
          {selectedService.dependencies && selectedService.dependencies.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '8px' }}>依赖服务</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedService.dependencies.map((dep) => (
                  <span
                    key={dep}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(0, 242, 254, 0.1)',
                      color: 'var(--antd-primary)',
                    }}
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
