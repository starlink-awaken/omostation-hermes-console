import React, { useState } from 'react';
import LineChart from '../charts/LineChart';
import AreaChart from '../charts/AreaChart';

interface DataPoint {
  [key: string]: any;
}

interface MetricsTrendSectionProps {
  healthScoreData: DataPoint[];
  requestsData: DataPoint[];
  errorRateData: DataPoint[];
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

export default function MetricsTrendSection({
  healthScoreData,
  requestsData,
  errorRateData,
}: MetricsTrendSectionProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1小时' },
    { value: '6h', label: '6小时' },
    { value: '24h', label: '24小时' },
    { value: '7d', label: '7天' },
  ];

  return (
    <section className="metrics-trend-section">
      <div className="section-header">
        <h2 className="section-title">关键指标趋势</h2>
        <div className="time-range-selector">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              className={`time-range-btn ${timeRange === option.value ? 'active' : ''}`}
              onClick={() => setTimeRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-charts-grid">
        <div className="chart-card">
          <LineChart
            data={healthScoreData}
            xField="timestamp"
            yField="value"
            title="健康分数"
            color="#10b981"
            showThreshold={true}
            threshold={90}
            thresholdColor="#f59e0b"
            height={250}
          />
        </div>

        <div className="chart-card">
          <AreaChart
            data={requestsData}
            xField="timestamp"
            yField="value"
            title="请求数"
            color="#3b82f6"
            height={250}
          />
        </div>

        <div className="chart-card">
          <LineChart
            data={errorRateData}
            xField="timestamp"
            yField="value"
            title="错误率"
            color="#ef4444"
            showThreshold={true}
            threshold={5}
            thresholdColor="#ef4444"
            height={250}
          />
        </div>
      </div>
    </section>
  );
}
