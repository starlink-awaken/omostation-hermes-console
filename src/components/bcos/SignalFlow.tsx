/**
 * SignalFlow — 信号路由流
 *
 * 展示 BCOS 信号类型及其数量，支持公文/会议/调研/代码等信号分类。
 */
import React from 'react';
import { Zap } from 'lucide-react';

export interface SignalItem {
  type: string;
  count: number;
}

export interface SignalFlowProps {
  signals: SignalItem[] | null;
  loading?: boolean;
}

export default function SignalFlow({ signals, loading }: SignalFlowProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-20 rounded bg-surface-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-surface-2" />
              <div className="h-3 w-8 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!signals || signals.length === 0) return null;

  const maxCount = Math.max(...(signals ?? []).map((s) => s.count), 1);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-accent" />
        <h3 className="text-sm font-medium text-secondary">信号路由</h3>
      </div>
      <div className="mt-4 space-y-3">
        {(signals ?? []).map((signal) => (
          <div key={signal.type} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm text-text-primary truncate">
              {signal.type}
            </span>
            <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(signal.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm text-secondary tabular-nums">
              {signal.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
