import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  [key: string]: string | number | null | undefined;
}

interface PieChartProps {
  data: DataPoint[];
  nameField: string;
  valueField: string;
  title: string;
  colors?: string[];
  innerRadius?: number;
  height?: number;
  onSliceClick?: (slice: DataPoint) => void;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PieChart({
  data,
  nameField,
  valueField,
  title,
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  height = 300,
  onSliceClick,
}: PieChartProps) {
  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={valueField}
            nameKey={nameField}
            onClick={(e) => {
              if (onSliceClick && e) {
                onSliceClick(e);
              }
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              border: '1px solid var(--chart-tooltip-border)',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              color: 'var(--chart-tooltip-text)',
            }}
          />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
