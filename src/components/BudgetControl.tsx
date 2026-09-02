/**
 * BudgetControl — 每日预算控制滑块.
 */

import React from 'react';
import { useUpdateBudget } from './useComputeQueries';

interface BudgetControlProps {
  dailyBudget: number;
}

export default function BudgetControl({ dailyBudget }: BudgetControlProps) {
  const budgetMutation = useUpdateBudget();

  const updateBudget = (val: number) => {
    budgetMutation.mutate(val, {
      onError: (error) => {
        alert('修改预算异常: ' + error.message);
      },
    });
  };

  return (
    <div className="antd-card">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>每日预算</h2>
        <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
          当前: ${dailyBudget}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={dailyBudget}
          onChange={(e) => updateBudget(Number(e.target.value))}
          style={{ flex: 1 }}
          aria-label="每日预算"
        />
        <span style={{ fontWeight: 500, minWidth: '60px' }}>${dailyBudget}</span>
      </div>
    </div>
  );
}
