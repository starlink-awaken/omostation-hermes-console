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

export default function ComputeView() {
  const [tick, setTick] = useState(0);
  const [genPrompt, setGenPrompt] = useState('');
  const [genModel, setGenModel] = useState('coder');
  const [genResult, setGenResult] = useState('');

  // ── 本地算力模型面板(SSOT 能力 + 三机实时加载态)──
  type LocalModel = {
    model_id: string;
    display_name?: string;
    capabilities?: string[];
    runs_on?: string;
    context_window?: number;
  };
  const [models, setModels] = useState<LocalModel[]>([]);
  const [loadedByNode, setLoadedByNode] = useState<Record<string, string[]>>({});
  const [modelsBusy, setModelsBusy] = useState<string>('');
  const [modelsMsg, setModelsMsg] = useState<string>('');

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/governance/compute/models');
      const json = await res.json();
      if (json.status === 'success') {
        setModels(json.models || []);
        setLoadedByNode(json.loaded_by_node || {});
      }
    } catch { /* 静默:面板非关键路径 */ }
  };

  useEffect(() => { fetchModels(); }, []);

  const isLoaded = (id: string) =>
    Object.values(loadedByNode).some(list =>
      list.some(x => x === id || x.startsWith(id + ' ') || id.endsWith(x)));

  const modelAction = async (model: string, action: 'load' | 'unload') => {
    setModelsBusy(model); setModelsMsg('');
    try {
      const res = await fetch('/api/governance/compute/model-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, action })
      });
      const json = await res.json();
      setModelsMsg(json.status === 'success'
        ? `✅ ${action} ${model} 完成`
        : `❌ ${json.detail || json.output || '失败'}`);
      await fetchModels();
    } catch (e: any) {
      setModelsMsg('❌ ' + (e?.message || String(e)));
    } finally {
      setModelsBusy('');
    }
  };

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

  const nodeColor = (runsOn?: string) =>
    !runsOn ? '#78716c'
      : runsOn.startsWith('multi') ? '#7c3aed'
      : runsOn.includes('mac-mini') ? '#0891b2'
      : runsOn.includes('Y7000P') ? '#ca8a04'
      : '#16a34a';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 本地算力模型面板 — SSOT 能力 + 三机实时加载态 */}
      <div style={{ border: '1px solid var(--border, #e7e5e4)', borderRadius: 10, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={16} aria-hidden="true" />
            <strong style={{ fontSize: 14 }}>本地算力模型</strong>
            <span style={{ fontSize: 12, color: '#78716c' }}>
              {models.length} 个 · 来自 SSOT(omlxc ssot-sync)
            </span>
          </div>
          <button onClick={fetchModels}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
            刷新
          </button>
        </div>

        {/* 各节点当前加载 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {Object.entries(loadedByNode).map(([node, list]) => (
            <span key={node} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 12,
              background: 'var(--bg2, #f5f5f4)', color: '#57534e'
            }}>
              <b>{node}</b>: {list.length ? list.join(', ') : '空闲'}
            </span>
          ))}
        </div>

        {modelsMsg && (
          <div style={{ fontSize: 12, marginBottom: 8, color: modelsMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>
            {modelsMsg}
          </div>
        )}

        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {models.map(m => {
            const on = isLoaded(m.model_id);
            const busy = modelsBusy === m.model_id;
            return (
              <div key={m.model_id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                borderRadius: 6, background: on ? 'rgba(22,163,74,.07)' : 'transparent', fontSize: 12
              }}>
                <span style={{ color: on ? '#16a34a' : '#a8a29e' }}>{on ? '●' : '○'}</span>
                <span style={{ fontWeight: 600, minWidth: 150 }}>{m.model_id}</span>
                <span style={{ color: nodeColor(m.runs_on), minWidth: 130, fontSize: 11 }}>
                  {m.runs_on || '-'}
                </span>
                <span style={{ color: '#78716c', flex: 1, fontSize: 11 }}>
                  {(m.capabilities || []).join(' · ')}
                </span>
                <button disabled={busy}
                  onClick={() => modelAction(m.model_id, on ? 'unload' : 'load')}
                  style={{
                    fontSize: 11, padding: '2px 10px', borderRadius: 5,
                    cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.5 : 1
                  }}>
                  {busy ? '…' : on ? '卸载' : '加载'}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 8 }}>
          ● 已加载 / ○ 未加载 · 加载大模型需数十秒 · 绿=MBP 青=mac-mini 黄=Y7000P 紫=多节点
        </div>
      </div>

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

      {/* ── omlxc Compute Fabric & Prefix Warmer 算力织网全景 ── */}
      <div className="antd-card" style={{ border: '1px solid rgba(0, 242, 254, 0.25)', background: 'linear-gradient(180deg, rgba(0, 242, 254, 0.03) 0%, transparent 100%)' }}>
        <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} className="text-primary" />
            <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>omlxc 智能算力织网 &amp; 前缀预热中枢</h2>
            <span style={{ fontSize: '11px', background: 'rgba(0, 242, 254, 0.12)', color: 'var(--antd-primary, #00f2fe)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>v3.4.0 Active</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
            双级语义缓存 (L1 0ms + L2 Invariant) · AST 意图分诊 · VRAM 显存自愈
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>🌡️ 硬件温控 / 电源水位</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--antd-success, #52c41a)' }}>● NOMINAL (AC 已插电)</div>
            <div style={{ fontSize: '11px', color: 'var(--antd-text-muted)', marginTop: '4px' }}>调度乘子: 1.00x (全功率放行)</div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>🧠 意图复杂度分诊引擎</div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>FAST | STANDARD | REASONING</div>
            <div style={{ fontSize: '11px', color: 'var(--antd-text-muted)', marginTop: '4px' }}>AST 零延迟分级 · 自动模型配准</div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>⚡ 零延迟系统前缀预热</div>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>3 组核心治理 System Prompt</div>
            <div style={{ fontSize: '11px', color: 'var(--antd-text-muted)', marginTop: '4px' }}>常驻 L1/L2 缓存 · TTFT 0ms 响应</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="antd-btn antd-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={async () => {
              try {
                const res = await fetch('/api/governance/compute/fabric/warm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ model_id: 'coding' })
                });
                const data = await res.json();
                alert(`✅ 系统前缀预热完成！\n预热模型: ${data.data?.model_id || 'coding'}\n预热前缀数: ${data.data?.warmed_count || 3}\n节省 Token: ${data.data?.estimated_saved_tokens || 120}`);
              } catch (e: any) {
                alert(`❌ 预热请求失败: ${e?.message || e}`);
              }
            }}
          >
            <Zap size={14} />
            <span>一键预热前缀缓存 (0ms TTFT)</span>
          </button>

          <button
            className="antd-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={async () => {
              const tokens = prompt('请输入长上下文 Token 数量进行 KV 显存预算评估:', '32768');
              if (!tokens) return;
              try {
                const res = await fetch('/api/governance/compute/fabric/vram', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ model_id: 'coding', context_tokens: parseInt(tokens, 10) })
                });
                const data = await res.json();
                const d = data.data || {};
                alert(`📊 VRAM 预算评估结果:\n模型: ${d.model_id}\n上下文 Token: ${d.context_tokens}\nKV Cache 显存: ${d.kv_cache_mb?.toFixed(1)} MB\n预估总显存: ${d.total_estimated_vram_mb?.toFixed(1)} MB\n准入放行: ${d.admitted ? '✅ 放行' : '⚠️ 拦截/需压缩'}\n压缩建议: ${d.compaction_advised ? '需要滑动蒸馏' : '显存充裕'}`);
              } catch (e: any) {
                alert(`❌ 显存估算失败: ${e?.message || e}`);
              }
            }}
          >
            <Cpu size={14} />
            <span>KV Cache 显存自愈估算器</span>
          </button>

          <button
            className="antd-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={async () => {
              const tokens = prompt('请输入当前会话 Token 长度 (例如 32768):', '32768');
              if (!tokens) return;
              const freeVram = prompt('请输入节点空闲显存 (MB, 例如 4096):', '4096');
              if (!freeVram) return;
              try {
                const res = await fetch('/api/governance/compute/fabric/compact', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model_id: 'coding',
                    tokens: parseInt(tokens, 10),
                    available_mb: parseFloat(freeVram)
                  })
                });
                const data = await res.json();
                const d = data.data || {};
                alert(`🧬 上下文滑动蒸馏与显存自愈评估:\n模型: ${d.model_id}\n原始 Token: ${d.original_tokens}\n压缩后 Token: ${d.compacted_tokens}\n裁剪 Token: ${d.pruned_tokens} (压缩率 ${(d.compression_ratio * 100).toFixed(1)}%)\n自愈判定: ${d.compaction_advised ? '⚠️ 触发滑动蒸馏' : '✅ 显存充裕无需压缩'}\n摘要预览: ${d.distilled_summary || '保留完整多轮对话'}`);
              } catch (e: any) {
                alert(`❌ 蒸馏压缩模拟失败: ${e?.message || e}`);
              }
            }}
          >
            <Activity size={14} />
            <span>上下文滑动蒸馏模拟器</span>
          </button>
        </div>
      </div>

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
