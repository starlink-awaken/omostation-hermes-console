/**
 * DebtView with React Query integration.
 */

import React, { useState } from 'react';
import { Search, ShieldAlert, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import './Dashboard.css';

// ── Types ──

interface DebtItem {
  id: string;
  title: string;
  severity: string;
  lifecycle_state: string;
  opened_at: string;
  owner: string;
  dimension: string;
}

interface DebtData {
  total: number;
  open: number;
  closed: number;
  items: DebtItem[];
}

// ── Hook ──

function useDebt() {
  return useQuery({
    queryKey: ['debt'],
    queryFn: async () => {
      const response = await apiFetch<DebtData>('/api/debt');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch debt data');
      }
      return response.data;
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 3,
  });
}

// ── Component ──

export default function DebtView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedDimension, setSelectedDimension] = useState('all');

  const { data, isLoading, error } = useDebt();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#3498db';
      case 'low': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical': return '严重';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'open': return '#e74c3c';
      case 'in_progress': return '#f39c12';
      case 'closed': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getStateText = (state: string) => {
    switch (state) {
      case 'open': return '待处理';
      case 'in_progress': return '处理中';
      case 'closed': return '已关闭';
      default: return '未知';
    }
  };

  const displayItems = data?.items || [];

  // Filter items
  const filteredItems = displayItems.filter((item) => {
    if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) return false;
    if (selectedDimension !== 'all' && item.dimension !== selectedDimension) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const dimensions = [...new Set(displayItems.map((item) => item.dimension))];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} aria-hidden="true" className="text-warning" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>技术债务治理舱</h1>
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
            <AlertCircle size={16} />
            <strong>债务数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Summary */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{data.total}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>总债务</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--antd-error)' }}>{data.open}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>待处理</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--antd-success)' }}>{data.closed}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>已关闭</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {displayItems.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="antd-input"
            aria-label="按严重程度过滤"
          >
            <option value="all">所有严重程度</option>
            <option value="critical">严重</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select
            value={selectedDimension}
            onChange={(e) => setSelectedDimension(e.target.value)}
            className="antd-input"
            aria-label="按维度过滤"
          >
            <option value="all">所有维度</option>
            {dimensions.map((dim) => (
              <option key={dim} value={dim}>{dim}</option>
            ))}
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索债务..."
            className="antd-input"
            style={{ flex: 1 }}
            aria-label="搜索债务"
          />
        </div>
      )}

      {/* Debt List */}
      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
              <CheckCircle size={24} className="text-success" style={{ marginBottom: '8px' }} />
              <div>暂无技术债务</div>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="antd-card"
                style={{ 
                  borderLeft: `4px solid ${getSeverityColor(item.severity)}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                    维度: {item.dimension} · 负责人: {item.owner} · 创建时间: {new Date(item.opened_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getSeverityColor(item.severity),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getSeverityColor(item.severity)}15`,
                  }}>
                    {getSeverityText(item.severity)}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getStateColor(item.lifecycle_state),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getStateColor(item.lifecycle_state)}15`,
                  }}>
                    {getStateText(item.lifecycle_state)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
