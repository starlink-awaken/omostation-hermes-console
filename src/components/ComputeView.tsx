/**
 * ComputeView with React Query integration.
 *
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React from 'react';
import { Server, Activity, Shield } from 'lucide-react';
import './Dashboard.css';
import { useComputeStatus, useToggleCircuitBreaker } from './useComputeQueries';
import LocalModelPanel from './LocalModelPanel';
import ComputeFabricPanel from './ComputeFabricPanel';
import NodeTrafficTable from './NodeTrafficTable';
import CodeGenerationPanel from './CodeGenerationPanel';
import BudgetControl from './BudgetControl';
import SummaryCards from './SummaryCards';

export default function ComputeView() {
  const { data: computeData, isLoading, error } = useComputeStatus();
  const circuitBreakerMutation = useToggleCircuitBreaker();

  const toggleCircuitBreaker = () => {
    const nextVal = !(computeData?.circuit_broken);
    circuitBreakerMutation.mutate(nextVal, {
      onError: (error) => {
        alert('修改熔断状态失败: ' + error.message);
      },
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 本地算力模型面板 — SSOT 能力 + 三机实时加载态 */}
      <LocalModelPanel />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>算力调配大盘</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`antd-btn ${computeData?.circuit_broken ? 'antd-btn-danger' : ''}`}
            onClick={toggleCircuitBreaker}
            disabled={circuitBreakerMutation.isPending}
            aria-label={computeData?.circuit_broken ? '恢复熔断' : '触发熔断'}
          >
            <Shield size={14} />
            <span>{computeData?.circuit_broken ? '恢复熔断' : '触发熔断'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div role="alert" style={{
          padding: '16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity size={16} />
            <strong>算力数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Summary Cards */}
      {computeData && <SummaryCards data={computeData} />}

      {/* ── omlxc Compute Fabric & Prefix Warmer 算力织网全景 ── */}
      <ComputeFabricPanel />

      {/* Budget Control */}
      {computeData && <BudgetControl dailyBudget={computeData.daily_budget} />}

      {/* Node Traffic Table */}
      {computeData && <NodeTrafficTable nodes={computeData.nodes} />}

      {/* Code Generation */}
      <CodeGenerationPanel />
    </div>
  );
}
