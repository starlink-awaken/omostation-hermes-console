/**
 * RoleCard — 常驻 Agent 单角色状态卡.
 *
 * 显示角色名、状态徽标、图标，用于 ResidentMonitor 的五角色概览区.
 */
import React from 'react';
import {
  Database,
  Brain,
  Play,
  Eye,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export type RoleStatus = 'ok' | 'degraded' | 'failed';

export interface RoleCardProps {
  /** 角色标识 */
  name: string;
  /** 角色中文标签 */
  label: string;
  /** 当前状态 */
  status: RoleStatus;
  /** 可选的补充描述 */
  description?: string;
}

const roleIconMap: Record<string, LucideIcon> = {
  sediment: Database,
  decision: Brain,
  execute: Play,
  monitor: Eye,
  heartbeat: HeartPulse,
};

const statusTone: Record<RoleStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  ok: 'success',
  degraded: 'warning',
  failed: 'neutral',
};

const statusLabel: Record<RoleStatus, string> = {
  ok: '正常',
  degraded: '降级',
  failed: '不可用',
};

export default function RoleCard({ name, label, status, description }: RoleCardProps) {
  const Icon = roleIconMap[name] ?? HeartPulse;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2 p-4 flex items-start gap-3">
      <div className="rounded-md bg-surface-3 p-2.5 shrink-0">
        <Icon size={20} className="text-accent" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-primary truncate">{label}</span>
          <StatusBadge
            tone={statusTone[status]}
            label={statusLabel[status]}
            dot
            className="shrink-0"
          />
        </div>
        {description && (
          <p className="text-xs text-text-secondary truncate">{description}</p>
        )}
      </div>
    </div>
  );
}
