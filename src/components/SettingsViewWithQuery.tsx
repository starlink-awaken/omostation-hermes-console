/**
 * SettingsView with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React, { useState } from 'react';
import { Activity, GitBranch } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import './Dashboard.css';

// ── Types ──

interface MetricsHistory {
  timestamp: string;
  services: number;
  healthy: number;
  latency: Record<string, number>;
}

interface InstanceRegistration {
  service: string;
  mcp_endpoint: string;
}

interface RegisterResult {
  success?: boolean;
  error?: string;
  message?: string;
}

// ── Hooks ──

function useMetricsHistory() {
  return useQuery({
    queryKey: ['metrics-history'],
    queryFn: async () => {
      const response = await apiFetch<MetricsHistory>('/api/metrics/history');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch metrics');
      }
      return response.data;
    },
    staleTime: 10000, // 10 seconds
    refetchInterval: 10000,
    retry: 3,
  });
}

function useRegisterInstance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: InstanceRegistration) => {
      const formData = new FormData();
      formData.append('service', data.service);
      formData.append('mcp_endpoint', data.mcp_endpoint);
      
      const response = await apiPost<RegisterResult>('/api/instance', formData);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to register instance');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate metrics to refresh after registration
      queryClient.invalidateQueries({ queryKey: ['metrics-history'] });
    },
  });
}

// ── Component ──

export default function SettingsViewWithQuery() {
  const [instanceUrl, setInstanceUrl] = useState('');
  const [instanceService, setInstanceService] = useState('');
  
  const { data: metrics, isLoading, error } = useMetricsHistory();
  const registerMutation = useRegisterInstance();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      service: instanceService,
      mcp_endpoint: instanceUrl,
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      
      {/* Metrics History Card */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} aria-hidden="true" className="text-success" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>系统运行状态指标</h2>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--antd-text-secondary)' }}>
            加载中...
          </div>
        ) : error ? (
          <div role="alert" style={{ 
            padding: '12px', 
            border: '1px solid rgba(255, 71, 87, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(255, 71, 87, 0.08)',
            color: 'var(--antd-error)',
            fontSize: 14,
          }}>
            指标加载失败: {error.message}
          </div>
        ) : metrics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', fontSize: '13px' }}>
              <span style={{ color: 'var(--antd-text-secondary)' }}>监控快照时间: </span> {metrics.timestamp}
            </div>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--antd-text-secondary)' }}>微服务总数: </span> {metrics.services}</div>
              <div><span style={{ color: 'var(--antd-text-secondary)' }}>健康路由数: </span> <span className="text-success" style={{ fontWeight: 600 }}>{metrics.healthy}</span></div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(0, 242, 254, 0.03)', border: '1px solid rgba(0, 242, 254, 0.08)', borderRadius: '4px' }}>
              <span style={{ color: 'var(--antd-text-secondary)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>延迟分位数分布 (Latency Metrics):</span>
              <pre style={{ margin: 0, color: 'var(--antd-primary)', fontSize: '12px', overflowX: 'auto', fontFamily: 'monospace' }}>
                {JSON.stringify(metrics.latency, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--antd-text-secondary)' }}>
            暂无指标数据
          </div>
        )}
      </div>

      {/* Instance Registration Card */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitBranch size={18} aria-hidden="true" className="text-primary" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>实例注册</h2>
        </div>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              服务名称
            </label>
            <input
              type="text"
              value={instanceService}
              onChange={(e) => setInstanceService(e.target.value)}
              placeholder="例如: my-service"
              className="antd-input"
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              MCP 端点
            </label>
            <input
              type="text"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder="例如: http://localhost:8080/mcp"
              className="antd-input"
              style={{ width: '100%' }}
            />
          </div>
          
          <button
            type="submit"
            className="antd-btn antd-btn-primary"
            disabled={registerMutation.isPending || !instanceService || !instanceUrl}
            style={{ alignSelf: 'flex-start' }}
          >
            {registerMutation.isPending ? '注册中...' : '注册实例'}
          </button>
        </form>

        {registerMutation.isSuccess && (
          <div role="status" style={{ 
            padding: '12px', 
            border: '1px solid rgba(82, 196, 26, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(82, 196, 26, 0.08)',
            color: 'var(--antd-success)',
            fontSize: 14,
          }}>
            实例注册成功
          </div>
        )}

        {registerMutation.isError && (
          <div role="alert" style={{ 
            padding: '12px', 
            border: '1px solid rgba(255, 71, 87, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(255, 71, 87, 0.08)',
            color: 'var(--antd-error)',
            fontSize: 14,
          }}>
            注册失败: {registerMutation.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
