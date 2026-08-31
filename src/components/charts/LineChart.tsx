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
  [key: string]: string | number | null | undefined;
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
      {data.length === 0 ? (
        <div className="chart-empty-state" role="status">暂无真实数据</div>
      ) : (
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
      )}
    </div>
  );
}
