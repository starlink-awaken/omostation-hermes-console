import React from 'react';
import { Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  updated_at: string;
}

interface RecentTasksSectionProps {
  tasks: Task[];
  limit?: number;
  onViewAll?: () => void;
}

export default function RecentTasksSection({
  tasks,
  limit = 3,
  onViewAll,
}: RecentTasksSectionProps) {
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
        return 'text-muted';
      case 'in_progress':
        return 'text-primary';
      case 'completed':
        return 'text-success';
      case 'failed':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  const displayTasks = tasks.slice(0, limit);

  return (
    <section className="recent-tasks-section">
      <div className="section-header">
        <h2 className="section-title">最近任务</h2>
        {onViewAll && (
          <button className="btn-link" onClick={onViewAll}>
            查看全部任务
          </button>
        )}
      </div>

      <div className="tasks-list">
        {displayTasks.length === 0 ? (
          <div className="tasks-empty">
            <CheckCircle size={24} className="text-success" />
            <span>暂无活跃任务</span>
          </div>
        ) : (
          displayTasks.map((task) => (
            <div key={task.id} className="task-item">
              <div className="task-icon">
                {getStatusIcon(task.status)}
              </div>
              <div className="task-content">
                <div className="task-header">
                  <span className="task-id">{task.id}</span>
                  <span className="task-title">{task.title}</span>
                </div>
                <div className="task-meta">
                  <span className={`task-status ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                  {task.status === 'in_progress' && (
                    <span className="task-progress">{task.progress}%</span>
                  )}
                  <span className="task-time">{formatTime(task.updated_at)}</span>
                </div>
              </div>
              {task.status === 'in_progress' && (
                <div className="task-progress-bar">
                  <div
                    className="task-progress-fill"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
