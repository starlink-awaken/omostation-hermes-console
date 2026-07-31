/**
 * WorkflowsView with React Query integration.
 */

import React, { useState } from 'react';
import { GitCommit, Play, Activity, RefreshCw, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// ── Types ──

interface Workflow {
  id: string;
  name: string;
  status: string;
  steps: number;
  current_step: number;
  created_at: string;
  updated_at: string;
}

interface WorkflowListResponse {
  workflows: Workflow[];
}

// ── Hook ──

function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await apiFetch<WorkflowListResponse>('/api/metaos/workflows');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch workflows');
      }
      return response.data?.workflows || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

// ── Component ──

export default function WorkflowsViewWithQuery() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const { data: workflows, isLoading, error } = useWorkflows();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'var(--antd-primary)';
      case 'completed':
        return 'var(--antd-success)';
      case 'failed':
        return 'var(--antd-error)';
      case 'paused':
        return 'var(--antd-warning)';
      default:
        return 'var(--antd-text-muted)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'paused':
        return '已暂停';
      default:
        return '未知';
    }
  };

  const displayWorkflows = workflows || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitCommit size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>MetaOS 工作流编排</h1>
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
            <strong>工作流数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Workflow List */}
      {displayWorkflows.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GitCommit size={16} aria-hidden="true" className="text-primary" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>工作流列表</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {displayWorkflows.length} 个工作流
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="antd-card"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedWorkflow(selectedWorkflow?.id === workflow.id ? null : workflow)}
                role="button"
                tabIndex={0}
                aria-label={`查看工作流 ${workflow.name}`}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedWorkflow(selectedWorkflow?.id === workflow.id ? null : workflow)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <GitCommit size={16} className="text-muted" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{workflow.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      步骤: {workflow.current_step}/{workflow.steps} · 更新时间: {new Date(workflow.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '8px', 
                    background: 'rgba(0, 242, 254, 0.1)', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{ 
                      width: `${workflow.steps > 0 ? (workflow.current_step / workflow.steps) * 100 : 0}%`, 
                      height: '100%', 
                      background: getStatusColor(workflow.status),
                      borderRadius: '4px',
                    }} />
                  </div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getStatusColor(workflow.status),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getStatusColor(workflow.status)}15`,
                  }}>
                    {getStatusText(workflow.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Detail */}
      {selectedWorkflow && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>工作流详情</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>名称</div>
              <div style={{ fontWeight: 500 }}>{selectedWorkflow.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>状态</div>
              <span style={{ 
                color: getStatusColor(selectedWorkflow.status),
                fontWeight: 500,
              }}>
                {getStatusText(selectedWorkflow.status)}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>进度</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  flex: 1, 
                  height: '8px', 
                  background: 'rgba(0, 242, 254, 0.1)', 
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{ 
                    width: `${selectedWorkflow.steps > 0 ? (selectedWorkflow.current_step / selectedWorkflow.steps) * 100 : 0}%`, 
                    height: '100%', 
                    background: getStatusColor(selectedWorkflow.status),
                    borderRadius: '4px',
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                  {selectedWorkflow.current_step}/{selectedWorkflow.steps}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>创建时间</div>
              <div style={{ fontSize: '13px' }}>{new Date(selectedWorkflow.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>更新时间</div>
              <div style={{ fontSize: '13px' }}>{new Date(selectedWorkflow.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
