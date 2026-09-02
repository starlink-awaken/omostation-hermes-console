/**
 * CapabilityExplorer — 能力全景浏览器
 *
 * 四维能力全景: MCP 服务器 / BOS 服务 / CLI 命令 / 工作流 & 技能
 * 三个 tab: MCP/BOS | CLI 命令 | 工作流 & 技能
 *
 * 数据源:
 *   - GET /api/capability/summary  (总量统计)
 *   - GET /api/capability/servers  (MCP 服务器列表)
 *   - GET /api/capability/bos      (BOS 服务域分布)
 *   - GET /api/commands            (CLI 命令列表)
 */

import React, { useState, useMemo } from 'react';
import {
  Search, Server, Terminal, Globe, GitBranch, Layers,
  ChevronDown, ChevronRight, Wrench, Copy, Check,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import PageHeader from './ui/PageHeader';
import EmptyState from './ui/EmptyState';
import type { Command } from '../commands/CommandCard';
import './Dashboard.css';

// ── Types ──

interface CapabilityTotals {
  mcp_servers: number;
  mcp_tools: number;
  bos_services: number;
  bos_domains: number;
  cli_commands: number;
  workflows?: number;
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

interface CommandsResponse {
  available: boolean;
  commands: Command[];
  total: number;
}

type TabId = 'mcp-bos' | 'cli' | 'workflows-skills';

// ── 工作流 & 技能类型 ──

interface WorkflowItem {
  id: string;
  file: string;
  exists: boolean;
  [key: string]: unknown;
}

interface SkillItem {
  id: string;
  file: string;
  exists: boolean;
  [key: string]: unknown;
}

// ── Layer colors (动态值，保留 inline style) ──

const LAYER_COLORS: Record<string, string> = {
  L0: '#ef4444', L1: '#f97316', L2: '#eab308', L3: '#22c55e',
  L4: '#3b82f6', I0: '#8b5cf6', M0: '#ec4899', X: '#6b7280',
};
const LAYERS = ['L0', 'L1', 'L2', 'L3', 'L4', 'I0', 'M0', 'X'];

export default function CapabilityExplorer() {
  const [activeTab, setActiveTab] = useState<TabId>('mcp-bos');
  const [layerFilter, setLayerFilter] = useState('');
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

  const { data: commandsData } = useQuery<CommandsResponse>({
    queryKey: ['commands'],
    queryFn: () => apiFetch<CommandsResponse>('/api/commands'),
  });

  const { data: workflowsData } = useQuery<{ workflows: WorkflowItem[] }>({
    queryKey: ['capability-workflows'],
    queryFn: () => apiFetch<{ workflows: WorkflowItem[] }>('/api/capability/workflows'),
  });

  const { data: skillsData } = useQuery<{ skills: SkillItem[] }>({
    queryKey: ['capability-skills'],
    queryFn: () => apiFetch<{ skills: SkillItem[] }>('/api/capability/skills'),
  });

  const servers = serversData?.servers ?? [];
  const totals = summary?.totals;

  const filteredServers = useMemo(() => {
    if (!searchQuery) return servers;
    const q = searchQuery.toLowerCase();
    return servers.filter(
      s => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) ||
        s.tools.some(t => t.toLowerCase().includes(q)),
    );
  }, [servers, searchQuery]);

  const workflowCount = totals?.workflows ?? workflowsData?.workflows?.length ?? 0;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'mcp-bos', label: 'MCP / BOS', icon: <Server size={16} /> },
    { id: 'cli', label: 'CLI 命令', icon: <Terminal size={16} /> },
    { id: 'workflows-skills', label: '工作流 & 技能', icon: <GitBranch size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-surface-0 px-6 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="能力全景浏览器"
        subtitle={summary?.available
          ? `生成于 ${summary.generated_at} · 版本 ${summary.version}`
          : '注册表未生成，运行 make sync-capability-registry'}
      />

      {/* 4 个总量卡 */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
        {([
          { icon: <Server size={20} />, label: 'MCP 服务器', value: totals?.mcp_servers ?? '—' },
          { icon: <Globe size={20} />, label: 'BOS 服务', value: totals?.bos_services ?? '—' },
          { icon: <Terminal size={20} />, label: 'CLI 命令', value: totals?.cli_commands ?? '—' },
          { icon: <GitBranch size={20} />, label: '工作流', value: workflowCount },
        ] as const).map(({ icon, label, value }) => (
          <div key={label} className="bg-surface-2 rounded-lg border border-border-subtle p-4">
            <div className="flex items-center gap-2 mb-2 text-text-secondary">{icon}<span className="text-sm">{label}</span></div>
            <div className="text-3xl font-bold text-text-primary">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-subtle mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.id
                ? 'bg-surface-2 text-text-primary border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-1'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'mcp-bos' && (
        <McpBosTab servers={filteredServers} searchQuery={searchQuery}
          onSearchChange={setSearchQuery} layerFilter={layerFilter}
          onLayerFilterChange={setLayerFilter} expandedServer={expandedServer}
          onExpandServer={setExpandedServer} bosData={bosData} />
      )}
      {activeTab === 'cli' && <CliTab commands={commandsData?.commands ?? []} />}
      {activeTab === 'workflows-skills' && (
        <WorkflowsSkillsTab
          workflows={workflowsData?.workflows ?? []}
          skills={skillsData?.skills ?? []}
          isLoading={workflowsData === undefined || skillsData === undefined}
        />
      )}
    </div>
  );
}

// ── MCP / BOS Tab ──

function McpBosTab({ servers, searchQuery, onSearchChange, layerFilter,
  onLayerFilterChange, expandedServer, onExpandServer, bosData }: {
  servers: McpServer[]; searchQuery: string; onSearchChange: (q: string) => void;
  layerFilter: string; onLayerFilterChange: (l: string) => void;
  expandedServer: string | null; onExpandServer: (id: string | null) => void;
  bosData: BosResponse | undefined;
}) {
  return (
    <>
      {/* 搜索栏 */}
      <div className="mb-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input type="text" placeholder="搜索服务器/工具名..."
            value={searchQuery} onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-1 border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => onLayerFilterChange('')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${layerFilter === '' ? 'bg-accent text-white' : 'text-text-secondary bg-surface-2 border border-border-subtle hover:bg-surface-3'}`}>
            全部
          </button>
          {LAYERS.map(layer => (
            <button key={layer} onClick={() => onLayerFilterChange(layerFilter === layer ? '' : layer)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-white"
              style={{ background: layerFilter === layer ? LAYER_COLORS[layer] : undefined }}>
              {layerFilter === layer ? layer : (
                <span className="text-text-secondary bg-surface-2 border border-border-subtle rounded-md px-3 py-1.5 -m-1.5 hover:bg-surface-3 inline-block">{layer}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* MCP 服务器表 */}
      <div className="bg-surface-2 rounded-lg border border-border-subtle overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border-subtle font-semibold text-text-primary text-sm">
          MCP 服务器 ({servers.length})
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {servers.map(server => (
            <div key={server.id} className="border-b border-border-subtle last:border-b-0">
              <div onClick={() => onExpandServer(expandedServer === server.id ? null : server.id)}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-surface-3 transition-colors">
                {expandedServer === server.id
                  ? <ChevronDown size={16} className="text-text-tertiary" />
                  : <ChevronRight size={16} className="text-text-tertiary" />}
                <span className="text-white px-2 py-0.5 rounded text-xs font-semibold min-w-[32px] text-center"
                  style={{ background: LAYER_COLORS[server.layer] || '#6b7280' }}>{server.layer}</span>
                <span className="font-semibold text-text-primary flex-1">{server.id}</span>
                <span className="text-text-secondary text-sm">{server.name}</span>
                <span className="bg-accent-muted text-accent px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {server.tool_count} tools
                </span>
                {!server.exists && <span className="text-status-error text-xs">未找到</span>}
              </div>
              {expandedServer === server.id && (
                <div className="px-4 py-3 pl-12 bg-surface-1">
                  <div className="text-xs text-text-tertiary mb-2">传输: {server.transport} · 文件: {server.file}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {server.tools.map(tool => (
                      <span key={tool} className="bg-surface-2 border border-border-subtle px-2 py-0.5 rounded text-xs font-mono text-text-secondary">{tool}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {servers.length === 0 && <EmptyState message="无匹配服务器" className="border-0" />}
        </div>
      </div>

      {/* BOS 域分布 */}
      {bosData && Object.keys(bosData.domain_counts || {}).length > 0 && (
        <div className="bg-surface-2 rounded-lg border border-border-subtle p-4">
          <div className="font-semibold text-text-primary text-sm mb-3">BOS 服务域分布 ({bosData.total} 服务)</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {Object.entries(bosData.domain_counts || {}).sort(([, a], [, b]) => b - a).map(([domain, count]) => (
              <div key={domain} className="flex justify-between items-center px-3 py-2 bg-surface-1 rounded-md">
                <span className="font-mono text-sm text-text-secondary">{domain || '(root)'}</span>
                <span className="font-semibold text-accent">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── CLI Tab ──

function CliTab({ commands }: { commands: Command[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const commandsByCategory = useMemo(() => {
    const filtered = searchQuery
      ? commands.filter(c => {
          const q = searchQuery.toLowerCase();
          return c.name.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q);
        })
      : commands;
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.category) ?? [];
      list.push(cmd);
      map.set(cmd.category, list);
    }
    return map;
  }, [commands, searchQuery]);

  if (commands.length === 0) {
    return <EmptyState icon={<Terminal size={32} />} title="暂无命令数据"
      message="后端 /api/commands 未返回数据，请确认服务已启动。" />;
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input type="text" placeholder="搜索命令名或摘要..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-surface-1 border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent" />
      </div>

      {[...commandsByCategory.entries()].map(([category, cmds]) => (
        <div key={category} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Terminal size={16} className="text-text-tertiary" />
            <h3 className="text-sm font-semibold text-text-primary">{category}</h3>
            <span className="text-xs text-text-tertiary bg-surface-1 px-2 py-0.5 rounded">{cmds.length}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
            {cmds.map(cmd => <CommandCard key={cmd.name} command={cmd} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Command Card (CLI tab 简化版) ──

function CommandCard({ command }: { command: Command }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(command.example); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2 p-4 transition-colors hover:bg-surface-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <code className="text-sm font-mono font-semibold text-text-primary truncate">{command.name}</code>
        <span className="shrink-0 text-xs text-text-tertiary bg-surface-1 px-2 py-0.5 rounded">{command.category}</span>
      </div>
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">{command.summary}</p>
      <div className="flex items-center gap-2 bg-surface-1 rounded-md px-3 py-2">
        <code className="flex-1 text-xs font-mono text-text-secondary truncate">{command.example}</code>
        <button onClick={handleCopy} className="shrink-0 p-1 rounded hover:bg-surface-3 text-text-tertiary hover:text-text-secondary transition-colors" aria-label="复制示例">
          {copied ? <Check size={14} className="text-status-ok" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Workflows & Skills Tab ──

function WorkflowsSkillsTab({
  workflows,
  skills,
  isLoading,
}: {
  workflows: WorkflowItem[];
  skills: SkillItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-text-tertiary">加载中…</div>
      </div>
    );
  }

  const sections = [
    { title: '工作流', icon: <GitBranch size={18} className="text-accent" />, items: workflows, Icon: Layers },
    { title: '技能', icon: <Wrench size={18} className="text-accent" />, items: skills, Icon: Wrench },
  ];

  return (
    <div className="space-y-8">
      {sections.map(({ title, icon, items, Icon }) => (
        <div key={title}>
          <div className="flex items-center gap-2 mb-4">
            {icon}
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            <span className="text-xs text-text-tertiary bg-surface-1 px-2 py-0.5 rounded">{items.length}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {(items ?? []).map(item => (
              <div key={item.id} className="rounded-lg border border-border-subtle bg-surface-2 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-text-tertiary" />
                  <span className="text-sm font-mono font-semibold text-text-primary">{item.id}</span>
                </div>
                <p className="text-xs text-text-tertiary truncate">{String(item.file || '')}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
