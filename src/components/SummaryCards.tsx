/**
 * SummaryCards — 算力概览数据卡片.
 */

import React from 'react';
import { Cpu, Zap, DollarSign, TrendingUp } from 'lucide-react';
import type { ComputeStatus } from './computeViewTypes';

interface SummaryCardsProps {
  data: ComputeStatus;
}

export default function SummaryCards({ data }: SummaryCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <div className="antd-card" style={{ textAlign: 'center' }}>
        <Cpu size={24} className="text-primary" style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '24px', fontWeight: 700 }}>{(data.total_calls ?? 0).toLocaleString()}</div>
        <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>总调用次数</div>
      </div>
      <div className="antd-card" style={{ textAlign: 'center' }}>
        <Zap size={24} className="text-warning" style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '24px', fontWeight: 700 }}>{(data.total_tokens ?? 0).toLocaleString()}</div>
        <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>总 Token 数</div>
      </div>
      <div className="antd-card" style={{ textAlign: 'center' }}>
        <DollarSign size={24} className="text-success" style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '24px', fontWeight: 700 }}>${(data.total_cost_usd ?? 0).toFixed(4)}</div>
        <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>本地成本</div>
      </div>
      <div className="antd-card" style={{ textAlign: 'center' }}>
        <TrendingUp size={24} className="text-info" style={{ marginBottom: '8px' }} />
        <div style={{ fontSize: '24px', fontWeight: 700 }}>${(data.total_saved_usd ?? 0).toFixed(4)}</div>
        <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>节省成本</div>
      </div>
    </div>
  );
}
