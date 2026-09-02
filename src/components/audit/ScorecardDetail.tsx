/**
 * ScorecardDetail — 单命令评分卡详情
 *
 * 展示 15 维雷达图 + evidence + suggestion。
 */
import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { FileText, Lightbulb } from 'lucide-react';

export interface ScorecardDimension {
  /** 维度 key */
  key: string;
  /** 维度中文标签 */
  label: string;
  /** 分值 */
  score: number;
  /** 证据 */
  evidence: string;
}

export interface ScorecardData {
  /** 命令路径 */
  cmd_path: string;
  /** 命令名 */
  name: string;
  /** 各维度评分 */
  dimensions: ScorecardDimension[];
  /** 综合建议 */
  suggestion: string;
}

export interface ScorecardDetailProps {
  /** 评分卡数据 */
  data: ScorecardData;
  /** 关闭详情回调 */
  onClose?: () => void;
}

export default function ScorecardDetail({ data, onClose }: ScorecardDetailProps) {
  const radarData = data.dimensions.map((d) => ({
    label: d.label,
    score: d.score,
  }));

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5" data-testid="scorecard-detail">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          {data.name}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            关闭
          </button>
        )}
      </div>

      {/* 雷达图 */}
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--color-border-subtle)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 5]}
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--chart-tooltip-text)',
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toFixed(1), '评分']}
          />
          <Radar
            name={data.name}
            dataKey="score"
            stroke="var(--color-accent)"
            fill="var(--color-accent)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* 各维度 evidence */}
      <div className="mt-4 space-y-2">
        <h4 className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <FileText size={14} />
          评分依据
        </h4>
        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
          {data.dimensions?.map((d) => (
            <div
              key={d.key}
              className="flex items-start gap-2 text-xs"
              data-testid={`evidence-${d.key}`}
            >
              <span className="shrink-0 font-mono text-[var(--color-text-tertiary)] w-20">
                {d.label}
              </span>
              <span className="text-[var(--color-text-secondary)]">
                {d.evidence || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 建议 */}
      {data.suggestion && (
        <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-muted)] border border-[var(--color-border-subtle)]">
          <h4 className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5 mb-1.5">
            <Lightbulb size={14} className="text-[var(--color-status-warn)]" />
            改进建议
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {data.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}
