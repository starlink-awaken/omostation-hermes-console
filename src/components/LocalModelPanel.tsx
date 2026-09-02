/**
 * LocalModelPanel — SSOT 能力 + 三机实时加载态.
 */

import React, { useState, useEffect } from 'react';
import { Server } from 'lucide-react';
import { apiFetch, apiPost } from '../api/client';
import type { LocalModel } from './computeViewTypes';

function nodeColor(runsOn?: string): string {
  if (!runsOn) return '#78716c';
  if (runsOn.startsWith('multi')) return '#7c3aed';
  if (runsOn.includes('mac-mini')) return '#0891b2';
  if (runsOn.includes('Y7000P')) return '#ca8a04';
  return '#16a34a';
}

export default function LocalModelPanel() {
  const [models, setModels] = useState<LocalModel[]>([]);
  const [loadedByNode, setLoadedByNode] = useState<Record<string, string[]>>({});
  const [modelsBusy, setModelsBusy] = useState<string>('');
  const [modelsMsg, setModelsMsg] = useState<string>('');

  const fetchModels = async () => {
    try {
      const res = await apiFetch<{ status: string; models?: LocalModel[]; loaded_by_node?: Record<string, string[]> }>('/api/governance/compute/models');
      if (res.ok && res.data?.status === 'success') {
        setModels(res.data.models || []);
        setLoadedByNode(res.data.loaded_by_node || {});
      }
    } catch { /* 静默:面板非关键路径 */ }
  };

  useEffect(() => { void fetchModels(); }, []);

  const isLoaded = (id: string) =>
    Object.values(loadedByNode).some(list =>
      list.some(x => x === id || x.startsWith(id + ' ') || id.endsWith(x)));

  const modelAction = async (model: string, action: 'load' | 'unload') => {
    setModelsBusy(model); setModelsMsg('');
    try {
      const res = await apiPost<{ status: string; detail?: string; output?: string }>('/api/governance/compute/model-action', { model, action });
      setModelsMsg(res.ok && res.data?.status === 'success'
        ? `✅ ${action} ${model} 完成`
        : `❌ ${res.data?.detail || res.data?.output || res.error || '失败'}`);
      await fetchModels();
    } catch (e: any) {
      setModelsMsg('❌ ' + (e?.message || String(e)));
    } finally {
      setModelsBusy('');
    }
  };

  return (
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
  );
}
