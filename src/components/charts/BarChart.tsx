import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  [key: string]: string | number | null | undefined;
}

interface BarChartProps {
  data: DataPoint[];
  xField: string;
  yField: string | string[];
  title: string;
  color?: string | string[];
  stacked?: boolean;
  height?: number;
}

export default function BarChart({
  data,
  xField,
  yField,
  title,
  color = '#3b82f6',
  stacked = false,
  height = 300,
}: BarChartProps) {
  const fields = Array.isArray(yField) ? yField : [yField];
  const colors = Array.isArray(color) ? color : [color];

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
          <XAxis
            dataKey={xField}
            stroke="#888888"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
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
          {fields.map((field, index) => (
            <Bar
              key={field}
              dataKey={field}
              fill={colors[index % colors.length]}
              stackId={stacked ? 'stack' : undefined}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
