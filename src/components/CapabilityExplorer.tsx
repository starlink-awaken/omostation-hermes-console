/**
 * CapabilityExplorer — 能力全景浏览器
 *
 * 展示全生态能力: MCP 服务器 (24) / MCP 工具 (541) / BOS 服务 (184) / CLI 命令 (103)
 * 支持按层过滤 + 关键词搜索
 *
 * 数据源: GET /api/capability/* (读取 docs/generated/capability-registry.yaml)
 */

import React, { useState, useMemo } from 'react';
import { Search, Server, Database, Terminal, Globe, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import './Dashboard.css';

// ── Types ──

interface CapabilityTotals {
  mcp_servers: number;
  mcp_tools: number;
  bos_services: number;
  bos_domains: number;
  cli_commands: number;
}

interface McpServer {
  id: string;
  name: string;
  layer: string;
  file: string;
  transport: string;
  tool_count: number;
  tools: string[];
  exists: boolean;
}

interface CapabilitySummary {
  available: boolean;
  generated_at: string;
  version: string;
  totals: CapabilityTotals;
}

interface ServersResponse {
  servers: McpServer[];
  count: number;
}

interface BosResponse {
  domain_counts: Record<string, number>;
  total: number;
}

// ── Layer colors ──

const LAYER_COLORS: Record<string, string> = {
  L0: '#ef4444', L1: '#f97316', L2: '#eab308', L3: '#22c55e',
  L4: '#3b82f6', I0: '#8b5cf6', M0: '#ec4899', X: '#6b7280',
};

const LAYERS = ['L0', 'L1', 'L2', 'L3', 'L4', 'I0', 'M0', 'X'];

// ── Component ──

export default function CapabilityExplorer() {
  const [layerFilter, setLayerFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedServer, setExpandedServer] = useState<string | null>(null);

  const { data: summary } = useQuery<CapabilitySummary>({
    queryKey: ['capability-summary'],
    queryFn: () => apiFetch<CapabilitySummary>('/api/capability/summary'),
    refetchInterval: 60000,
  });

  const { data: serversData } = useQuery<ServersResponse>({
    queryKey: ['capability-servers', layerFilter],
    queryFn: () => apiFetch<ServersResponse>(`/api/capability/servers${layerFilter ? `?layer=${layerFilter}` : ''}`),
  });

  const { data: bosData } = useQuery<BosResponse>({
    queryKey: ['capability-bos'],
    queryFn: () => apiFetch<BosResponse>('/api/capability/bos'),
  });

  const servers = serversData?.servers ?? [];
  const totals = summary?.totals;

  // 搜索过滤
  const filteredServers = useMemo(() => {
    if (!searchQuery) return servers;
    const q = searchQuery.toLowerCase();
    return servers.filter(
      s =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.tools.some(t => t.toLowerCase().includes(q)),
    );
  }, [servers, searchQuery]);

  return (
    <div className="capability-explorer" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
          <Layers size={28} color="#3b82f6" />
          能力全景浏览器
        </h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>
          {summary?.available
            ? `生成于 ${summary.generated_at} · 版本 ${summary.version}`
            : '注册表未生成，运行 make sync-capability-registry'}
        </p>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard icon={<Terminal size={20} />} label="CLI 命令" value={totals?.cli_commands ?? '—'} color="#22c55e" />
        <StatCard icon={<Server size={20} />} label="MCP 工具" value={totals?.mcp_tools ?? '—'} sub={`${totals?.mcp_servers ?? 0} servers`} color="#3b82f6" />
        <StatCard icon={<Globe size={20} />} label="BOS 服务" value={totals?.bos_services ?? '—'} sub={`${totals?.bos_domains ?? 0} domains`} color="#8b5cf6" />
        <StatCard icon={<Database size={20} />} label="MCP 服务器" value={totals?.mcp_servers ?? '—'} color="#f97316" />
      </div>

      {/* 搜索栏 */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="搜索服务器/工具名..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        {/* 层过滤 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setLayerFilter('')}
            style={layerFilter === '' ? activeBtn : inactiveBtn}
          >
            全部
          </button>
          {LAYERS.map(layer => (
            <button
              key={layer}
              onClick={() => setLayerFilter(layerFilter === layer ? '' : layer)}
              style={layerFilter === layer ? { ...activeBtn, background: LAYER_COLORS[layer] } : inactiveBtn}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>

      {/* MCP 服务器表 */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
          MCP 服务器 ({filteredServers.length})
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {filteredServers.map(server => (
            <div key={server.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div
                onClick={() => setExpandedServer(expandedServer === server.id ? null : server.id)}
                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                {expandedServer === server.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span
                  style={{
                    background: LAYER_COLORS[server.layer] || '#6b7280',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    minWidth: '32px',
                    textAlign: 'center',
                  }}
                >
                  {server.layer}
                </span>
                <span style={{ fontWeight: 600, flex: 1 }}>{server.id}</span>
                <span style={{ color: '#6b7280', fontSize: '13px' }}>{server.name}</span>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                  {server.tool_count} tools
                </span>
                {!server.exists && <span style={{ color: '#ef4444', fontSize: '11px' }}>⚠️ 未找到</span>}
              </div>
              {expandedServer === server.id && (
                <div style={{ padding: '8px 16px 16px 48px', background: '#f9fafb' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    传输: {server.transport} · 文件: {server.file}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {server.tools.map(tool => (
                      <span
                        key={tool}
                        style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredServers.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>无匹配服务器</div>
          )}
        </div>
      </div>

      {/* BOS 域分布 */}
      {bosData && Object.keys(bosData.domain_counts).length > 0 && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
          <div style={{ fontWeight: 600, marginBottom: '12px' }}>BOS 服务域分布 ({bosData.total} 服务)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            {Object.entries(bosData.domain_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([domain, count]) => (
                <div
                  key={domain}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f3f4f6', borderRadius: '6px' }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{domain || '(root)'}</span>
                  <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stat Card ──

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; color: string }) {
  return (
    <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ color: '#6b7280', fontSize: '13px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#9ca3af' }}>{sub}</div>}
    </div>
  );
}

const activeBtn: React.CSSProperties = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: '6px',
  background: '#3b82f6',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
};

const inactiveBtn: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  background: 'white',
  color: '#374151',
  cursor: 'pointer',
  fontSize: '13px',
};
