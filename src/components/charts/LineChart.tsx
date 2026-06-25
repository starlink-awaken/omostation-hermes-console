import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  [key: string]: any;
}

interface LineChartProps {
  data: DataPoint[];
  xField: string;
  yField: string;
  title: string;
  color?: string;
  showThreshold?: boolean;
  threshold?: number;
  thresholdColor?: string;
  height?: number;
  onPointClick?: (point: DataPoint) => void;
}

export default function LineChart({
  data,
  xField,
  yField,
  title,
  color = '#3b82f6',
  showThreshold = false,
  threshold,
  thresholdColor = '#ef4444',
  height = 300,
  onPointClick,
}: LineChartProps) {
  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onClick={(e) => {
            if (e && e.activePayload && onPointClick) {
              onPointClick(e.activePayload[0].payload);
            }
          }}
        >
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
          <Line
            type="monotone"
            dataKey={yField}
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          {showThreshold && threshold !== undefined && (
            <ReferenceLine
              y={threshold}
              stroke={thresholdColor}
              strokeDasharray="3 3"
              label={{
                value: `阈值: ${threshold}`,
                position: 'right',
                fill: thresholdColor,
                fontSize: 12,
              }}
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
