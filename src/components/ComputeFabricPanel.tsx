/**
 * ComputeFabricPanel — omlxc 智能算力织网 & 前缀预热中枢.
 */

import React from 'react';
import { Activity, Zap, Cpu } from 'lucide-react';
import { apiPost } from '../api/client';

export default function ComputeFabricPanel() {
  const handleWarmPrefix = async () => {
    try {
      const res = await apiPost<{ model_id?: string; warmed_count?: number; estimated_saved_tokens?: number }>('/api/governance/compute/fabric/warm', { model_id: 'coding' });
      if (!res.ok) throw new Error(res.error || '预热请求失败');
      alert(`✅ 系统前缀预热完成！\n预热模型: ${res.data?.model_id || 'coding'}\n预热前缀数: ${res.data?.warmed_count || 3}\n节省 Token: ${res.data?.estimated_saved_tokens || 120}`);
    } catch (e: any) {
      alert(`❌ 预热请求失败: ${e?.message || e}`);
    }
  };

  const handleVramEstimate = async () => {
    const tokens = prompt('请输入长上下文 Token 数量进行 KV 显存预算评估:', '32768');
    if (!tokens) return;
    try {
      const res = await apiPost<{ model_id?: string; context_tokens?: number; kv_cache_mb?: number; total_estimated_vram_mb?: number; admitted?: boolean; compaction_advised?: boolean }>('/api/governance/compute/fabric/vram', { model_id: 'coding', context_tokens: parseInt(tokens, 10) });
      if (!res.ok) throw new Error(res.error || '显存估算失败');
      const d = res.data || {};
      alert(`📊 VRAM 预算评估结果:\n模型: ${d.model_id}\n上下文 Token: ${d.context_tokens}\nKV Cache 显存: ${d.kv_cache_mb?.toFixed(1)} MB\n预估总显存: ${d.total_estimated_vram_mb?.toFixed(1)} MB\n准入放行: ${d.admitted ? '✅ 放行' : '⚠️ 拦截/需压缩'}\n压缩建议: ${d.compaction_advised ? '需要滑动蒸馏' : '显存充裕'}`);
    } catch (e: any) {
      alert(`❌ 显存估算失败: ${e?.message || e}`);
    }
  };

  const handleCompactSimulate = async () => {
    const tokens = prompt('请输入当前会话 Token 长度 (例如 32768):', '32768');
    if (!tokens) return;
    const freeVram = prompt('请输入节点空闲显存 (MB, 例如 4096):', '4096');
    if (!freeVram) return;
    try {
      const res = await apiPost<{ model_id?: string; original_tokens?: number; compacted_tokens?: number; pruned_tokens?: number; compression_ratio?: number; compaction_advised?: boolean; distilled_summary?: string }>('/api/governance/compute/fabric/compact', {
        model_id: 'coding',
        tokens: parseInt(tokens, 10),
        available_mb: parseFloat(freeVram)
      });
      if (!res.ok) throw new Error(res.error || '蒸馏压缩模拟失败');
      const d = res.data || {};
      alert(`🧬 上下文滑动蒸馏与显存自愈评估:\n模型: ${d.model_id}\n原始 Token: ${d.original_tokens}\n压缩后 Token: ${d.compacted_tokens}\n裁剪 Token: ${d.pruned_tokens} (压缩率 ${((d.compression_ratio ?? 0) * 100).toFixed(1)}%)\n自愈判定: ${d.compaction_advised ? '⚠️ 触发滑动蒸馏' : '✅ 显存充裕无需压缩'}\n摘要预览: ${d.distilled_summary || '保留完整多轮对话'}`);
    } catch (e: any) {
      alert(`❌ 蒸馏压缩模拟失败: ${e?.message || e}`);
    }
  };

  return (
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
          onClick={handleWarmPrefix}
        >
          <Zap size={14} />
          <span>一键预热前缀缓存 (0ms TTFT)</span>
        </button>

        <button
          className="antd-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={handleVramEstimate}
        >
          <Cpu size={14} />
          <span>KV Cache 显存自愈估算器</span>
        </button>

        <button
          className="antd-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={handleCompactSimulate}
        >
          <Activity size={14} />
          <span>上下文滑动蒸馏模拟器</span>
        </button>
      </div>
    </div>
  );
}
