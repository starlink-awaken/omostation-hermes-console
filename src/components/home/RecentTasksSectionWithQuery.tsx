/**
 * RecentTasksSection with React Query integration.
 * 
 * This component fetches its own data using React Query,
 * replacing the prop-based pattern.
 */

import React from 'react';
import { Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';

// ── Types ──

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  updated_at: string;
}

interface TaskListResponse {
  items: Task[];
}

// ── Hook ──

function useRecentTasks(limit: number = 3) {
  return useQuery({
    queryKey: ['recent-tasks', limit],
    queryFn: async () => {
      const response = await apiFetch<TaskListResponse>(`/api/tasks?limit=${limit}&sort=updated`);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch tasks');
      }
      return response.data?.items || [];
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000,
    retry: 3,
  });
}

// ── Component ──

interface RecentTasksSectionProps {
  limit?: number;
  onViewAll?: () => void;
}

export default function RecentTasksSectionWithQuery({
  limit = 3,
  onViewAll,
}: RecentTasksSectionProps) {
  const { data: tasks, isLoading, error } = useRecentTasks(limit);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-muted" />;
      case 'in_progress':
        return <Loader size={16} className="text-primary spinning" />;
      case 'completed':
        return <CheckCircle size={16} className="text-success" />;
      case 'failed':
        return <AlertCircle size={16} className="text-danger" />;
      default:
        return <Clock size={16} className="text-muted" />;
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return '#95a5a6';
      case 'in_progress':
        return '#3498db';
      case 'completed':
        return '#2ecc71';
      case 'failed':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="recent-tasks-section">
        <div className="section-header">
          <h2 className="section-title">最近任务</h2>
        </div>
        <div className="task-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="task-item">
              <div className="task-icon">
                <Clock size={16} className="text-muted" />
              </div>
              <div className="task-content">
                <div className="task-title">加载中...</div>
                <div className="task-status">...</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="recent-tasks-section">
        <div className="section-header">
          <h2 className="section-title">最近任务</h2>
        </div>
        <div role="alert" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--cockpit-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--cockpit-error)',
          fontSize: 14,
        }}>
          <AlertCircle size={16} />
          <span>任务数据加载失败: {error.message}</span>
        </div>
      </section>
    );
  }

  const displayTasks = tasks || [];

  return (
    <section className="recent-tasks-section">
      <div className="section-header">
        <h2 className="section-title">最近任务</h2>
        {onViewAll && (
          <button
            className="cockpit-btn small"
            onClick={onViewAll}
            aria-label="查看全部任务"
          >
            查看全部
          </button>
        )}
      </div>

      {displayTasks.length === 0 ? (
        <div className="empty-state" role="status">
          <CheckCircle size={24} className="text-success" />
          <span>暂无最近任务</span>
        </div>
      ) : (
        <div className="task-list">
          {displayTasks.map((task) => (
            <div
              key={task.id}
              className="task-item"
              style={{ borderLeftColor: getStatusColor(task.status) }}
            >
              <div className="task-icon">
                {getStatusIcon(task.status)}
              </div>
              <div className="task-content">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span
                    className="task-status"
                    style={{ color: getStatusColor(task.status) }}
                  >
                    {getStatusText(task.status)}
                  </span>
                  {task.progress > 0 && task.status === 'in_progress' && (
                    <span className="task-progress">{task.progress}%</span>
                  )}
                  <span className="task-updated">{task.updated_at}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
