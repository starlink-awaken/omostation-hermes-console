/**
 * WarnList — P74 沉默工作流列表
 *
 * 按阈值分类展示沉默工作流：30d/7d/1d，标注 name、status、days、threshold。
 */
import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

export interface WorkflowWarnItem {
  name: string;
  status: 'silent' | 'active' | 'degraded';
  days: number;
  threshold: number;
}

export interface WarnListProps {
  workflows: WorkflowWarnItem[] | null;
  loading?: boolean;
}

function getThresholdLabel(threshold: number): string {
  if (threshold <= 1) return '日级';
  if (threshold <= 7) return '周级';
  return '月级';
}

function getThresholdTone(threshold: number): string {
  if (threshold <= 1) return 'text-status-error';
  if (threshold <= 7) return 'text-status-warn';
  return 'text-status-warn';
}

function StatusBadge({ status }: { status: WorkflowWarnItem['status'] }) {
  if (status === 'silent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-error-muted px-2 py-0.5 text-xs text-status-error">
        <AlertTriangle size={12} />
        沉默
      </span>
    );
  }
  if (status === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-warn-muted px-2 py-0.5 text-xs text-status-warn">
        降级
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-ok-muted px-2 py-0.5 text-xs text-status-ok">
      活跃
    </span>
  );
}

export default function WarnList({ workflows, loading }: WarnListProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-surface-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 w-32 rounded bg-surface-2" />
              <div className="h-3 w-12 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!workflows || workflows.length === 0) return null;

  // 按阈值分组
  const grouped = workflows.reduce<Record<string, WorkflowWarnItem[]>>((acc, w) => {
    const label = getThresholdLabel(w.threshold);
    if (!acc[label]) acc[label] = [];
    acc[label].push(w);
    return acc;
  }, {});

  const groupOrder = ['月级', '周级', '日级'];

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-status-warn" />
        <h3 className="text-sm font-medium text-secondary">沉默工作流</h3>
      </div>
      <div className="mt-4 space-y-5">
        {groupOrder
          .filter((label) => grouped[label])
          .map((label) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={12} className={getThresholdTone(grouped[label][0].threshold)} />
                <span className="text-xs text-tertiary">
                  {label}阈值 ({grouped[label][0].threshold}d)
                </span>
              </div>
              <ul className="space-y-2">
                {grouped[label].map((w) => (
                  <li
                    key={w.name}
                    className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary truncate">{w.name}</p>
                      <p className="text-xs text-tertiary">
                        已沉默 <span className="text-status-error font-medium">{w.days}</span> 天
                        {' / '}
                        阈值 {w.threshold} 天
                      </p>
                    </div>
                    <StatusBadge status={w.status} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}
