/**
 * ResidentMonitor — 常驻 Agent 监控页主入口.
 *
 * 五类角色（sediment/decision/execute/monitor/heartbeat）状态概览 +
 * 五面板（daemon/events/sediment/alert/ledger）数据切换.
 * API 不可达时明确降级提示.
 */
import React, { useState } from 'react';
import {
  Bot,
  Activity,
  Database,
  Brain,
  Play,
  Eye,
  HeartPulse,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { SkeletonLines } from '../ui/LoadingSkeleton';
import StatusBadge from '../ui/StatusBadge';
import RoleCard from './RoleCard';
import EventStream from './EventStream';
import type { ResidentEvent } from './EventStream';
// ── Types ──

interface ResidentDaemon {
  running?: boolean;
  uptime?: string;
  version?: string;
  [key: string]: unknown;
}

interface ResidentData {
  available: boolean;
  status?: 'ok' | 'degraded' | 'failed';
  daemon?: ResidentDaemon;
  events?: ResidentEvent[];
  sediment?: unknown[];
  alert?: unknown[];
  ledger?: unknown[];
  error?: string;
}

type PanelKey = 'daemon' | 'events' | 'sediment' | 'alert' | 'ledger';

interface PanelDef {
  key: PanelKey;
  label: string;
  icon: React.ElementType;
}

// ── Constants ──

const ROLE_DEFS: { key: string; label: string }[] = [
  { key: 'sediment', label: '沉淀' },
  { key: 'decision', label: '决策' },
  { key: 'execute', label: '执行' },
  { key: 'monitor', label: '监控' },
  { key: 'heartbeat', label: '心跳' },
];

const PANELS: PanelDef[] = [
  { key: 'daemon', label: '守护进程', icon: Bot },
  { key: 'events', label: '事件流', icon: Activity },
  { key: 'sediment', label: '沉淀', icon: Database },
  { key: 'alert', label: '告警', icon: AlertTriangle },
  { key: 'ledger', label: '账本', icon: Brain },
];

// ── Hooks ──

function useResidentData() {
  return useQuery({
    queryKey: ['resident-monitor'],
    queryFn: async () => {
      const response = await apiFetch<ResidentData>('/api/resident');
      if (!response.ok) {
        // API 不可达时返回降级标记而非抛错，以便 UI 展示明确提示
        return { available: false, error: response.error || '请求失败' } as ResidentData;
      }
      return response.data;
    },
    staleTime: 15000,
    refetchInterval: 15000,
    retry: 1,
  });
}

// ── Components ──

function DaemonPanel({ daemon }: { daemon: ResidentDaemon | undefined }) {
  if (!daemon) {
    return <EmptyState title="无守护进程数据" message="daemon 字段为空" />;
  }
  const entries = Object.entries(daemon);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md border border-border-subtle bg-surface-1 p-3">
          <div className="text-xs text-text-tertiary mb-1">{key}</div>
          <div className="text-sm text-text-primary font-mono break-all">
            {typeof value === 'boolean' ? (
              <StatusBadge
                tone={value ? 'success' : 'error'}
                label={value ? '是' : '否'}
                dot={false}
              />
            ) : (
              String(value)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GenericListPanel({ items, emptyLabel }: { items: unknown[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <EmptyState title="暂无数据" message={emptyLabel} />;
  }
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-md border border-border-subtle bg-surface-1 p-3">
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(item, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default function ResidentMonitor() {
  const { data, isLoading, isError, error, refetch } = useResidentData();
  const [activePanel, setActivePanel] = useState<PanelKey>('events');

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Agent 监控" subtitle="常驻 Agent 五类角色状态与事件流" />
        <SkeletonLines count={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Agent 监控" subtitle="常驻 Agent 五类角色状态与事件流" />
        <EmptyState
          icon={<AlertTriangle size={32} className="text-status-error" />}
          title="请求失败"
          message={error instanceof Error ? error.message : '未知错误'}
          action={
            <button
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              <RefreshCw size={12} />
              重试
            </button>
          }
        />
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Agent 监控"
          subtitle="常驻 Agent 五类角色状态与事件流"
          badge={<StatusBadge tone="warning" label="降级" dot />}
        />
        <div className="rounded-lg border border-status-warn-muted bg-status-warn-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-status-warn" aria-hidden="true" />
            <span className="text-sm font-medium text-status-warn">API 不可达</span>
          </div>
          <p className="text-xs text-text-secondary">
            {data?.error || '无法连接 /api/resident，常驻 Agent 服务可能未启动。'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ROLE_DEFS.map((role) => (
            <RoleCard
              key={role.key}
              name={role.key}
              label={role.label}
              status="failed"
              description="不可达"
            />
          ))}
        </div>
      </div>
    );
  }

  const overallStatus = data.status ?? 'ok';
  const events = data.events ?? [];
  const sediment = data.sediment ?? [];
  const alertItems = data.alert ?? [];
  const ledger = data.ledger ?? [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Agent 监控"
        subtitle="常驻 Agent 五类角色状态与事件流"
        badge={
          <StatusBadge
            tone={overallStatus === 'ok' ? 'success' : overallStatus === 'degraded' ? 'warning' : 'error'}
            label={overallStatus === 'ok' ? '运行中' : overallStatus === 'degraded' ? '降级' : '异常'}
            dot
          />
        }
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border-subtle bg-surface-2 text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
          >
            <RefreshCw size={12} />
            刷新
          </button>
        }
      />

      <section aria-label="角色状态">
        <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
          {overallStatus === 'ok' ? (
            <HeartPulse size={16} className="text-status-ok" aria-hidden="true" />
          ) : (
            <AlertTriangle
              size={16}
              className={overallStatus === 'degraded' ? 'text-status-warn' : 'text-status-error'}
              aria-hidden="true"
            />
          )}
          角色概览
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {ROLE_DEFS.map((role) => (
            <RoleCard
              key={role.key}
              name={role.key}
              label={role.label}
              status={!data.available ? 'failed' : data.status === 'degraded' ? 'degraded' : 'ok'}
            />
          ))}
        </div>
      </section>

      <section aria-label="数据面板">
        <div className="flex gap-1 mb-4 border-b border-border-subtle pb-0 overflow-x-auto">
          {PANELS.map((panel) => {
            const Icon = panel.icon;
            const isActive = activePanel === panel.key;
            return (
              <button
                key={panel.key}
                onClick={() => setActivePanel(panel.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={14} aria-hidden="true" />
                {panel.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-[200px]">
          {activePanel === 'daemon' && <DaemonPanel daemon={data.daemon} />}
          {activePanel === 'events' && <EventStream events={events} />}
          {activePanel === 'sediment' && (
            <GenericListPanel items={sediment} emptyLabel="暂无沉淀数据" />
          )}
          {activePanel === 'alert' && (
            <GenericListPanel items={alertItems} emptyLabel="暂无告警" />
          )}
          {activePanel === 'ledger' && (
            <GenericListPanel items={ledger} emptyLabel="暂无账本记录" />
          )}
        </div>
      </section>
    </div>
  );
}
