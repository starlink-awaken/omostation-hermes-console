/**
 * McpMeshView with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React, { useState } from 'react';
import { Network, Globe, Play, Send, PlusCircle, Activity, Search, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import './Dashboard.css';

// ── Types ──

interface BosService {
  uri: string;
  domain: string;
  action: string;
  transport: string;
}

interface BosHealth {
  status: string;
  total_routes: number;
  domains: Record<string, number>;
  metrics: any;
}

interface ServiceListResponse {
  services: BosService[];
}

interface RegisterResult {
  status: string;
  message?: string;
  error?: string;
}

// ── Hooks ──

function useBosServices() {
  return useQuery({
    queryKey: ['bos-services'],
    queryFn: async () => {
      const response = await apiFetch<ServiceListResponse>('/api/bos/services');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch BOS services');
      }
      return response.data?.services || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useBosHealth() {
  return useQuery({
    queryKey: ['bos-health'],
    queryFn: async () => {
      const response = await apiFetch<BosHealth>('/api/bos/health');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch BOS health');
      }
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useRegisterInstance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, endpoint }: { name: string; endpoint: string }) => {
      const formData = new FormData();
      formData.append('service', name);
      formData.append('mcp_endpoint', endpoint);
      
      const response = await apiPost<RegisterResult>('/api/instance', formData);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to register instance');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bos-services'] });
      queryClient.invalidateQueries({ queryKey: ['bos-health'] });
    },
  });
}

// ── Component ──

export default function McpMeshView() {
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [registerName, setRegisterName] = useState('');
  const [registerEndpoint, setRegisterEndpoint] = useState('');
  const [registerStatus, setRegisterStatus] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // URI 解析器
  const [resolveUri, setResolveUri] = useState('bos://memory/kos/search');
  const [resolveArgs, setResolveArgs] = useState('{\n  "query": "SSOT"\n}');
  const [resolveResult, setResolveResult] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const { data: services, isLoading: servicesLoading, error: servicesError } = useBosServices();
  const { data: health, isLoading: healthLoading } = useBosHealth();
  const registerMutation = useRegisterInstance();

  const isLoading = servicesLoading || healthLoading;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName || !registerEndpoint) return;
    
    setRegisterStatus(null);
    setRegisterError(null);
    
    registerMutation.mutate(
      { name: registerName, endpoint: registerEndpoint },
      {
        onSuccess: (data) => {
          if (data?.status === 'ok') {
            setRegisterStatus('注册成功');
            setRegisterName('');
            setRegisterEndpoint('');
          } else {
            setRegisterError(data?.error || '注册失败');
          }
        },
        onError: (error) => {
          setRegisterError(error.message);
        },
      }
    );
  };

  const handleResolve = async () => {
    if (!resolveUri.trim()) return;
    
    setResolving(true);
    setResolveResult(null);
    setResolveError(null);
    
    try {
      let args = {};
      try {
        args = JSON.parse(resolveArgs);
      } catch (e) {
        // Use empty args if JSON is invalid
      }
      
      const response = await apiFetch(`/api/bos/resolve?uri=${encodeURIComponent(resolveUri)}&args=${encodeURIComponent(JSON.stringify(args))}`);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to resolve URI');
      }
      setResolveResult(response.data);
    } catch (error: any) {
      setResolveError(error.message);
    } finally {
      setResolving(false);
    }
  };

  const displayServices = services || [];
  const domains = [...new Set(displayServices.map((s) => s.domain))];

  // Filter services by domain
  const filteredServices = selectedDomain === 'all' 
    ? displayServices 
    : displayServices.filter((s) => s.domain === selectedDomain);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>BOS URI & MCP 网格</h1>
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
      {servicesError && (
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
          <div style={{ fontSize: '14px' }}>{servicesError.message}</div>
        </div>
      )}

      {/* Health Summary */}
      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <ShieldCheck size={24} className="text-success" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{health.status}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>状态</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <Network size={24} className="text-primary" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{health.total_routes}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>总路由数</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <Globe size={24} className="text-info" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{Object.keys(health.domains).length}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>域数量</div>
          </div>
        </div>
      )}

      {/* Domain Filter */}
      {domains.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`antd-btn ${selectedDomain === 'all' ? 'antd-btn-primary' : ''}`}
            onClick={() => setSelectedDomain('all')}
            aria-label="显示所有域"
          >
            全部
          </button>
          {domains.map((domain) => (
            <button
              key={domain}
              className={`antd-btn ${selectedDomain === domain ? 'antd-btn-primary' : ''}`}
              onClick={() => setSelectedDomain(domain)}
              aria-label={`筛选域 ${domain}`}
            >
              {domain}
            </button>
          ))}
        </div>
      )}

      {/* Service List */}
      {filteredServices.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={16} aria-hidden="true" className="text-primary" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>服务列表</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {filteredServices.length} 个服务
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredServices.map((service, index) => (
              <div
                key={`${service.uri}-${index}`}
                style={{
                  padding: '12px',
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px', fontFamily: 'monospace', fontSize: '13px' }}>
                    {service.uri}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                    域: {service.domain} · 动作: {service.action} · 传输: {service.transport}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* URI Resolver */}
      <div className="antd-card">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} aria-hidden="true" className="text-info" />
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>URI 解析器</h2>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              BOS URI
            </label>
            <input
              type="text"
              value={resolveUri}
              onChange={(e) => setResolveUri(e.target.value)}
              placeholder="bos://memory/kos/search"
              className="antd-input"
              style={{ width: '100%', fontFamily: 'monospace' }}
              aria-label="BOS URI"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              参数 (JSON)
            </label>
            <textarea
              value={resolveArgs}
              onChange={(e) => setResolveArgs(e.target.value)}
              placeholder='{"query": "SSOT"}'
              className="antd-input"
              style={{ width: '100%', minHeight: '80px', fontFamily: 'monospace', resize: 'vertical' }}
              aria-label="解析参数"
            />
          </div>
          
          <button
            className="antd-btn antd-btn-primary"
            onClick={handleResolve}
            disabled={resolving || !resolveUri.trim()}
            aria-label="解析 URI"
            style={{ alignSelf: 'flex-start' }}
          >
            <Search size={14} />
            <span>{resolving ? '解析中...' : '解析'}</span>
          </button>
          
          {resolveResult && (
            <div style={{ 
              padding: '12px', 
              background: 'rgba(0, 242, 254, 0.03)',
              border: '1px solid rgba(0, 242, 254, 0.08)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              maxHeight: '300px',
              overflow: 'auto',
            }}>
              {JSON.stringify(resolveResult, null, 2)}
            </div>
          )}
          
          {resolveError && (
            <div style={{ 
              padding: '12px', 
              background: 'rgba(255, 71, 87, 0.08)',
              border: '1px solid rgba(255, 71, 87, 0.35)',
              borderRadius: '4px',
              color: 'var(--antd-error)',
              fontSize: '13px',
            }}>
              {resolveError}
            </div>
          )}
        </div>
      </div>

      {/* Instance Registration */}
      <div className="antd-card">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={16} aria-hidden="true" className="text-success" />
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>实例注册</h2>
          </div>
        </div>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              服务名称
            </label>
            <input
              type="text"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder="例如: my-service"
              className="antd-input"
              style={{ width: '100%' }}
              aria-label="服务名称"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
              MCP 端点
            </label>
            <input
              type="text"
              value={registerEndpoint}
              onChange={(e) => setRegisterEndpoint(e.target.value)}
              placeholder="例如: http://localhost:8080/mcp"
              className="antd-input"
              style={{ width: '100%' }}
              aria-label="MCP 端点"
            />
          </div>
          
          <button
            type="submit"
            className="antd-btn antd-btn-primary"
            disabled={registerMutation.isPending || !registerName || !registerEndpoint}
            aria-label="注册实例"
            style={{ alignSelf: 'flex-start' }}
          >
            <PlusCircle size={14} />
            <span>{registerMutation.isPending ? '注册中...' : '注册'}</span>
          </button>
        </form>

        {registerStatus && (
          <div role="status" style={{ 
            marginTop: '12px',
            padding: '12px', 
            border: '1px solid rgba(82, 196, 26, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(82, 196, 26, 0.08)',
            color: 'var(--antd-success)',
            fontSize: 14,
          }}>
            {registerStatus}
          </div>
        )}

        {registerError && (
          <div role="alert" style={{ 
            marginTop: '12px',
            padding: '12px', 
            border: '1px solid rgba(255, 71, 87, 0.35)',
            borderRadius: 'var(--antd-radius-md)',
            background: 'rgba(255, 71, 87, 0.08)',
            color: 'var(--antd-error)',
            fontSize: 14,
          }}>
            {registerError}
          </div>
        )}
      </div>
    </div>
  );
}
