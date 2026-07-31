/**
 * ComputeView with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React, { useState, useEffect } from 'react';
import { Server, DollarSign, Cpu, Activity, Zap, TrendingUp, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import './Dashboard.css';

// ── Types ──

interface NodeTraffic {
  node_id: string;
  node_label: string;
  route_type: string;
  calls: number;
  tokens: number;
  estimated_cost_usd: number;
  equivalent_cloud_cost_usd: number;
  saved_vs_cloud_usd: number;
  latency_ms_avg: number | null;
  tokens_per_second_avg: number | null;
}

interface ComputeStatus {
  nodes: NodeTraffic[];
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cloud_cost_usd: number;
  total_saved_usd: number;
  circuit_broken: boolean;
  daily_budget: number;
}

interface GenerateResult {
  status: string;
  content?: string;
  error?: string;
  detail?: string;
}

// ── Hooks ──

function useComputeStatus() {
  return useQuery({
    queryKey: ['compute-status'],
    queryFn: async () => {
      const response = await apiFetch<ComputeStatus>('/api/compute/status');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch compute status');
      }
      return response.data;
    },
    staleTime: 6000,
    refetchInterval: 6000,
    retry: 3,
  });
}

function useGenerateCode() {
  return useMutation({
    mutationFn: async ({ prompt, model }: { prompt: string; model: string }) => {
      const response = await apiPost<GenerateResult>('/api/governance/compute/generate', {
        prompt,
        model: model || 'coder',
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to generate code');
      }
      return response.data;
    },
  });
}

function useToggleCircuitBreaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (broken: boolean) => {
      const response = await apiPost('/api/omos/circuit-break', { broken });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to toggle circuit breaker');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compute-status'] });
    },
  });
}

function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (budget: number) => {
      const response = await apiPost('/api/omos/budget', { budget });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update budget');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compute-status'] });
    },
  });
}

// ── Component ──

export default function ComputeViewWithQuery() {
  const [tick, setTick] = useState(0);
  const [genPrompt, setGenPrompt] = useState('');
  const [genModel, setGenModel] = useState('coder');
  const [genResult, setGenResult] = useState('');

  const { data: computeData, isLoading, error } = useComputeStatus();
  const generateMutation = useGenerateCode();
  const circuitBreakerMutation = useToggleCircuitBreaker();
  const budgetMutation = useUpdateBudget();

  // Animation tick for CPU/GPU visualization
  useEffect(() => {
    const animTimer = setInterval(() => {
      setTick(t => t + 1);
    }, 1500);
    return () => clearInterval(animTimer);
  }, []);

  const runGenerate = () => {
    if (!genPrompt.trim()) return;
    setGenResult('');
    generateMutation.mutate(
      { prompt: genPrompt, model: genModel },
      {
        onSuccess: (data) => {
          if (data?.status === 'success') {
            setGenResult(data.content || '(空)');
          } else {
            setGenResult('❌ ' + (data?.error || '生成失败'));
          }
        },
        onError: (error) => {
          setGenResult('❌ ' + error.message);
        },
      }
    );
  };

  const toggleCircuitBreaker = () => {
    const nextVal = !(computeData?.circuit_broken);
    circuitBreakerMutation.mutate(nextVal, {
      onError: (error) => {
        alert('修改熔断状态失败: ' + error.message);
      },
    });
  };

  const updateBudget = (val: number) => {
    budgetMutation.mutate(val, {
      onError: (error) => {
        alert('修改预算异常: ' + error.message);
      },
    });
  };

  // Calculate animation values
  const sinWave = Math.sin(tick * 0.3) * 5;
  const cosWave = Math.cos(tick * 0.2) * 3;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>算力调配大盘</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`antd-btn ${computeData?.circuit_broken ? 'antd-btn-danger' : ''}`}
            onClick={toggleCircuitBreaker}
            disabled={circuitBreakerMutation.isPending}
            aria-label={computeData?.circuit_broken ? '恢复熔断' : '触发熔断'}
          >
            <Shield size={14} />
            <span>{computeData?.circuit_broken ? '恢复熔断' : '触发熔断'}</span>
          </button>
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
            <strong>算力数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Summary Cards */}
      {computeData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <Cpu size={24} className="text-primary" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{computeData.total_calls.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>总调用次数</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <Zap size={24} className="text-warning" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{computeData.total_tokens.toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>总 Token 数</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <DollarSign size={24} className="text-success" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>${computeData.total_cost_usd.toFixed(4)}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>本地成本</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <TrendingUp size={24} className="text-info" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>${computeData.total_saved_usd.toFixed(4)}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>节省成本</div>
          </div>
        </div>
      )}

      {/* Budget Control */}
      {computeData && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>每日预算</h2>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              当前: ${computeData.daily_budget}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="0"
              max="1000"
              step="10"
              value={computeData.daily_budget}
              onChange={(e) => updateBudget(Number(e.target.value))}
              style={{ flex: 1 }}
              aria-label="每日预算"
            />
            <span style={{ fontWeight: 500, minWidth: '60px' }}>${computeData.daily_budget}</span>
          </div>
        </div>
      )}

      {/* Node Traffic Table */}
      {computeData && computeData.nodes.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>节点流量</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--antd-border-color)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>节点</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>调用</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Token</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>成本</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>云成本</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>节省</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>延迟</th>
                </tr>
              </thead>
              <tbody>
                {computeData.nodes.map((node) => (
                  <tr key={node.node_id} style={{ borderBottom: '1px solid var(--antd-border-color)' }}>
                    <td style={{ padding: '8px' }}>{node.node_label}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{node.calls.toLocaleString()}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{node.tokens.toLocaleString()}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>${node.estimated_cost_usd.toFixed(4)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>${node.equivalent_cloud_cost_usd.toFixed(4)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--antd-success)' }}>
                      ${node.saved_vs_cloud_usd.toFixed(4)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {node.latency_ms_avg ? `${node.latency_ms_avg.toFixed(0)}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Generation */}
      <div className="antd-card">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} aria-hidden="true" className="text-warning" />
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>本地代码生成</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
            经 /api/governance/compute/generate → BOS → omlx
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={genModel}
              onChange={(e) => setGenModel(e.target.value)}
              className="antd-input"
              style={{ width: '120px' }}
              aria-label="选择模型"
            >
              <option value="coder">coder</option>
              <option value="fast">fast</option>
              <option value="precise">precise</option>
            </select>
            <input
              type="text"
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder="输入提示词..."
              className="antd-input"
              style={{ flex: 1 }}
              aria-label="输入提示词"
              onKeyDown={(e) => e.key === 'Enter' && runGenerate()}
            />
            <button
              className="antd-btn antd-btn-primary"
              onClick={runGenerate}
              disabled={generateMutation.isPending || !genPrompt.trim()}
              aria-label="生成代码"
            >
              {generateMutation.isPending ? '生成中...' : '生成'}
            </button>
          </div>
          
          {genResult && (
            <div style={{ 
              padding: '12px', 
              background: genResult.startsWith('❌') ? 'rgba(255, 71, 87, 0.08)' : 'rgba(0, 242, 254, 0.03)',
              border: `1px solid ${genResult.startsWith('❌') ? 'rgba(255, 71, 87, 0.35)' : 'rgba(0, 242, 254, 0.08)'}`,
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              color: genResult.startsWith('❌') ? 'var(--antd-error)' : 'var(--antd-text-primary)',
            }}>
              {genResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
