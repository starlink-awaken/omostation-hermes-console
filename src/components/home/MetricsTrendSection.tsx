import React, { useState, useMemo } from 'react';
import LineChart from '../charts/LineChart';
import AreaChart from '../charts/AreaChart';

interface DataPoint {
  timestamp: string;
  value: number;
}

interface MetricsTrendSectionProps {
  healthScoreData: DataPoint[];
  requestsData: DataPoint[];
  errorRateData: DataPoint[];
  dataQuality?: string;
  degradedReasons?: string[];
  onTimeRangeChange?: (range: TimeRange) => void;
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

const TIME_RANGE_HOURS: Record<TimeRange, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24,
  '7d': 168,
};

function sliceDataByRange(data: DataPoint[], range: TimeRange): DataPoint[] {
  const hours = TIME_RANGE_HOURS[range];
  const cutoff = Date.now() - hours * 3600000;
  return data.filter(d => new Date(d.timestamp).getTime() >= cutoff);
}

export default function MetricsTrendSection({
  healthScoreData,
  requestsData,
  errorRateData,
  dataQuality = 'unavailable',
  degradedReasons = [],
  onTimeRangeChange,
}: MetricsTrendSectionProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1小时' },
    { value: '6h', label: '6小时' },
    { value: '24h', label: '24小时' },
    { value: '7d', label: '7天' },
  ];

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    onTimeRangeChange?.(range);
  };

  const filteredHealthScore = useMemo(() => sliceDataByRange(healthScoreData, timeRange), [healthScoreData, timeRange]);
  const filteredRequests = useMemo(() => sliceDataByRange(requestsData, timeRange), [requestsData, timeRange]);
  const filteredErrorRate = useMemo(() => sliceDataByRange(errorRateData, timeRange), [errorRateData, timeRange]);

  return (
    <section className="metrics-trend-section">
      <div className="section-header">
        <h2 className="section-title">关键指标趋势</h2>
        <div className="time-range-selector">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              className={`time-range-btn ${timeRange === option.value ? 'active' : ''}`}
              onClick={() => handleTimeRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {dataQuality !== 'complete' && (
        <div className="shell-data-banner" role="status">
          <strong>指标数据：{dataQuality === 'partial' ? '部分可用' : '不可用'}</strong>
          <span>{degradedReasons.length > 0 ? degradedReasons.join('；') : '当前没有足够的可信历史样本。'}</span>
        </div>
      )}

      <div className="metrics-charts-grid">
        <div className="chart-card">
          <LineChart
            data={filteredHealthScore}
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
            data={filteredRequests}
            xField="timestamp"
            yField="value"
            title="请求数"
            color="#3b82f6"
            height={250}
          />
        </div>

        <div className="chart-card">
          <LineChart
            data={filteredErrorRate}
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
