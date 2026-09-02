/**
 * LowScoreTable — 低分 TOP-N 表
 *
 * 显示低分命令列表，点击行触发 onSelect 回调以展示详情。
 */
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface LowScoreItem {
  /** 命令路径 */
  cmd_path: string;
  /** 命令名（展示用） */
  name: string;
  /** 综合评分 */
  score: number;
  /** 最弱维度 */
  weakest_dimension: string;
}

export interface LowScoreTableProps {
  /** 低分命令数据 */
  data: LowScoreItem[];
  /** 行点击回调 */
  onSelect?: (cmdPath: string) => void;
  /** 当前选中的命令路径 */
  selectedPath?: string;
}

/** 根据分值返回行色调 */
function rowTone(score: number): string {
  if (score <= 2) return 'status-badge-error';
  if (score <= 3) return 'status-badge-warning';
  return 'status-badge-info';
}

export default function LowScoreTable({
  data,
  onSelect,
  selectedPath,
}: LowScoreTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5" data-testid="low-score-table">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
          低分命令
        </h3>
        <p className="text-sm text-[var(--color-text-tertiary)]">暂无低分命令</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5" data-testid="low-score-table">
      <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
        <AlertTriangle size={16} className="text-[var(--color-status-warn)]" />
        低分 TOP-{data.length}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)]">
              <th className="text-left py-2 px-3 text-[var(--color-text-secondary)] font-medium">
                命令
              </th>
              <th className="text-left py-2 px-3 text-[var(--color-text-secondary)] font-medium">
                评分
              </th>
              <th className="text-left py-2 px-3 text-[var(--color-text-secondary)] font-medium">
                最弱维度
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.map((item) => (
              <tr
                key={item.cmd_path}
                className={`border-b border-[var(--color-border-subtle)] cursor-pointer transition-colors duration-150 ${
                  selectedPath === item.cmd_path
                    ? 'bg-[var(--color-accent-muted)]'
                    : 'hover:bg-[var(--color-surface-2)]'
                }`}
                onClick={() => onSelect?.(item.cmd_path)}
                data-testid={`low-score-row-${item.cmd_path}`}
              >
                <td className="py-2 px-3 text-[var(--color-text-primary)] font-mono text-xs">
                  {item.name}
                </td>
                <td className="py-2 px-3">
                  <span className={`status-badge ${rowTone(item.score)}`}>
                    {item.score.toFixed(1)}
                  </span>
                </td>
                <td className="py-2 px-3 text-[var(--color-text-secondary)]">
                  {item.weakest_dimension}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
