/**
 * CommandCard — 单个命令展示卡
 *
 * 显示命令名、摘要、示例（可复制）、maturity/risk 徽标、
 * delegated_target 与 chain_enabled 标记。
 */
import React, { useState } from 'react';
import { Copy, Check, Link2, Link2Off } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export interface Command {
  name: string;
  summary: string;
  category: string;
  example: string;
  owner: string;
  maturity: 'stable' | 'beta' | 'experimental' | 'deprecated';
  risk: 'low' | 'medium' | 'high';
  delegated_target: string;
  chain_enabled: boolean;
}

const MATURITY_TONE: Record<Command['maturity'], 'success' | 'warning' | 'error' | 'neutral'> = {
  stable: 'success',
  beta: 'warning',
  experimental: 'error',
  deprecated: 'neutral',
};

const RISK_TONE: Record<Command['risk'], 'success' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
};

export interface CommandCardProps {
  command: Command;
}

export default function CommandCard({ command }: CommandCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command.example);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore
    }
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2 p-4 transition-colors hover:bg-surface-3">
      {/* 头部：名称 + 分类 */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <code className="text-sm font-mono font-semibold text-text-primary truncate">
            {command.name}
          </code>
          <span className="shrink-0 text-xs text-text-tertiary bg-surface-1 px-2 py-0.5 rounded">
            {command.category}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge
            label={command.maturity}
            tone={MATURITY_TONE[command.maturity]}
            dot={false}
            className="text-xs"
          />
          <StatusBadge
            label={command.risk}
            tone={RISK_TONE[command.risk]}
            dot={false}
            className="text-xs"
          />
        </div>
      </div>

      {/* 摘要 */}
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">{command.summary}</p>

      {/* 示例（可复制） */}
      <div className="flex items-center gap-2 bg-surface-1 rounded-md px-3 py-2 mb-3">
        <code className="flex-1 text-xs font-mono text-text-secondary truncate">
          {command.example}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-1 rounded hover:bg-surface-3 text-text-tertiary hover:text-text-secondary transition-colors"
          aria-label="复制示例"
        >
          {copied ? <Check size={14} className="text-status-ok" /> : <Copy size={14} />}
        </button>
      </div>

      {/* 底部：owner + delegated + chain */}
      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        <span>owner: {command.owner}</span>
        {command.delegated_target && (
          <span className="flex items-center gap-1">
            <Link2 size={12} />
            {command.delegated_target}
          </span>
        )}
        <span className="flex items-center gap-1">
          {command.chain_enabled ? (
            <>
              <Link2 size={12} className="text-status-ok" />
              <span className="text-status-ok">chain</span>
            </>
          ) : (
            <>
              <Link2Off size={12} />
              <span>no chain</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
