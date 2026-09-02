/**
 * NorthStarCard — 北极星指标卡
 *
 * 展示 BCOS 北极星价值度量的核心指标：数值 + 趋势箭头。
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface NorthStarData {
  value: number;
  trend: 'up' | 'down' | 'stable';
  details?: Record<string, string | number>;
}

export interface NorthStarCardProps {
  data: NorthStarData | null;
  loading?: boolean;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={20} className="text-status-ok" />;
  if (trend === 'down') return <TrendingDown size={20} className="text-status-error" />;
  return <Minus size={20} className="text-secondary" />;
}

function TrendLabel({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <span className="text-status-ok text-sm">上升</span>;
  if (trend === 'down') return <span className="text-status-error text-sm">下降</span>;
  return <span className="text-secondary text-sm">稳定</span>;
}

export default function NorthStarCard({ data, loading }: NorthStarCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-surface-2" />
          <div className="h-10 w-20 rounded bg-surface-2" />
          <div className="h-3 w-16 rounded bg-surface-2" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-secondary">北极星价值度量</h3>
        <TrendIcon trend={data.trend} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-semibold text-text-primary">{data.value}</span>
        <TrendLabel trend={data.trend} />
      </div>
      {data.details && Object.keys(data.details).length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border-subtle pt-4">
          {Object.entries(data.details).map(([key, val]) => (
            <div key={key}>
              <dt className="text-xs text-tertiary">{key}</dt>
              <dd className="text-sm text-text-primary">{String(val)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
