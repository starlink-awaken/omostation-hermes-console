import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  [key: string]: any;
}

interface AreaChartProps {
  data: DataPoint[];
  xField: string;
  yField: string;
  title: string;
  color?: string;
  gradient?: boolean;
  height?: number;
}

export default function AreaChart({
  data,
  xField,
  yField,
  title,
  color = '#3b82f6',
  gradient = true,
  height = 300,
}: AreaChartProps) {
  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      {data.length === 0 ? (
        <div className="chart-empty-state" role="status">暂无真实数据</div>
      ) : (
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            {gradient && (
              <linearGradient id={`gradient-${yField}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey={yField}
            stroke={color}
            strokeWidth={2}
            fill={gradient ? `url(#gradient-${yField})` : color}
            fillOpacity={gradient ? 1 : 0.3}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
