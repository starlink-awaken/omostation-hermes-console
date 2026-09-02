/**
 * DimensionBars — 15 维均分条形图
 *
 * 使用 recharts BarChart 展示各维度均分，颜色按分值梯度：
 * 1-2 红 / 3 黄 / 4-5 绿。
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

export interface DimensionBarData {
  /** 维度 key */
  key: string;
  /** 维度中文标签 */
  label: string;
  /** 均分值 */
  score: number;
}

export interface DimensionBarsProps {
  /** 维度均分数据 */
  data: DimensionBarData[];
  /** 图表高度 */
  height?: number;
}

/** 根据分值返回对应颜色 token */
function scoreColor(score: number): string {
  if (score <= 2) return 'var(--color-status-error)';
  if (score <= 3) return 'var(--color-status-warn)';
  return 'var(--color-status-ok)';
}

export default function DimensionBars({ data, height = 300 }: DimensionBarsProps) {
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5" data-testid="dimension-bars">
      <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
        维度均分
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-grid-stroke)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border-subtle)' }}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            domain={[0, 5]}
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border-subtle)' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--chart-tooltip-text)',
              fontSize: 12,
            }}
            formatter={(value: number) => [value.toFixed(2), '均分']}
            labelFormatter={(label) => `维度: ${label}`}
          />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={scoreColor(entry.score)} />
            ))}
            <LabelList
              dataKey="score"
              position="top"
              formatter={(v: number) => v.toFixed(1)}
              style={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
