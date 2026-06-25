import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  Pause,
  Play,
  X,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  created_at: string;
  updated_at: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
}

type TaskStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export default function TaskCenterPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          setTasks(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

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
      case 'cancelled':
        return <X size={16} className="text-muted" />;
      default:
        return <Clock size={16} className="text-muted" />;
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'cancelled': return '已取消';
      default: return '未知';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return '#95a5a6';
      case 'in_progress': return '#3498db';
      case 'completed': return '#27ae60';
      case 'failed': return '#e74c3c';
      case 'cancelled': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return '#95a5a6';
      case 'medium': return '#3498db';
      case 'high': return '#f39c12';
      case 'critical': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return '低';
      case 'medium': return '中';
      case 'high': return '高';
      case 'critical': return '紧急';
      default: return '未知';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusStats = () => {
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  };

  const stats = getStatusStats();

  const handlePause = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/pause`, { method: 'POST' });
      setTasks(tasks.map(t =>
        t.id === taskId ? { ...t, status: 'pending' } : t
      ));
    } catch (error) {
      console.error('Failed to pause task:', error);
    }
  };

  const handleResume = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/resume`, { method: 'POST' });
      setTasks(tasks.map(t =>
        t.id === taskId ? { ...t, status: 'in_progress' } : t
      ));
    } catch (error) {
      console.error('Failed to resume task:', error);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
      setTasks(tasks.map(t =>
        t.id === taskId ? { ...t, status: 'cancelled' } : t
      ));
    } catch (error) {
      console.error('Failed to cancel task:', error);
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

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="task-center-page">
      {/* 任务统计 */}
      <section className="task-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <Clock size={24} className="text-muted" />
            <div className="stat-info">
              <h3>待处理</h3>
              <p className="stat-value">{stats.pending}</p>
            </div>
          </div>
          <div className="stat-card">
            <Loader size={24} className="text-primary" />
            <div className="stat-info">
              <h3>进行中</h3>
              <p className="stat-value">{stats.in_progress}</p>
            </div>
          </div>
          <div className="stat-card">
            <CheckCircle size={24} className="text-success" />
            <div className="stat-info">
              <h3>已完成</h3>
              <p className="stat-value">{stats.completed}</p>
            </div>
          </div>
          <div className="stat-card">
            <AlertCircle size={24} className="text-danger" />
            <div className="stat-info">
              <h3>失败</h3>
              <p className="stat-value">{stats.failed}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 过滤器 */}
      <div className="task-filters">
        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus)}
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div className="filter-group">
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-outline">
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      {/* 任务列表 */}
      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} className="text-success" />
            <h3>暂无任务</h3>
            <p>所有任务已完成</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`task-card ${selectedTask?.id === task.id ? 'selected' : ''}`}
              onClick={() => setSelectedTask(task)}
            >
              <div className="task-header">
                <div className="task-id">{task.id}</div>
                <div className="task-priority">
                  <span
                    className="priority-badge"
                    style={{ 
                      color: getPriorityColor(task.priority),
                      borderColor: getPriorityColor(task.priority),
                    }}
                  >
                    {getPriorityText(task.priority)}
                  </span>
                </div>
              </div>
              <div className="task-title">{task.title}</div>
              {task.description && (
                <div className="task-description">{task.description}</div>
              )}
              <div className="task-meta">
                <div className="task-status">
                  {getStatusIcon(task.status)}
                  <span style={{ color: getStatusColor(task.status) }}>
                    {getStatusText(task.status)}
                  </span>
                </div>
                {task.status === 'in_progress' && (
                  <div className="task-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span>{task.progress}%</span>
                  </div>
                )}
                <div className="task-time">{formatTime(task.updated_at)}</div>
              </div>
              {task.tags && task.tags.length > 0 && (
                <div className="task-tags">
                  {task.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="task-actions">
                {task.status === 'in_progress' && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => { e.stopPropagation(); handlePause(task.id); }}
                  >
                    <Pause size={14} />
                  </button>
                )}
                {task.status === 'pending' && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => { e.stopPropagation(); handleResume(task.id); }}
                  >
                    <Play size={14} />
                  </button>
                )}
                {(task.status === 'pending' || task.status === 'in_progress') && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => { e.stopPropagation(); handleCancel(task.id); }}
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 任务详情 */}
      {selectedTask && (
        <div className="task-detail-panel">
          <div className="detail-header">
            <h3>{selectedTask.title}</h3>
            <button className="btn btn-sm btn-outline" onClick={() => setSelectedTask(null)}>
              <X size={14} />
            </button>
          </div>
          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span>{selectedTask.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">状态:</span>
              <span style={{ color: getStatusColor(selectedTask.status) }}>
                {getStatusText(selectedTask.status)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">优先级:</span>
              <span style={{ color: getPriorityColor(selectedTask.priority) }}>
                {getPriorityText(selectedTask.priority)}
              </span>
            </div>
            {selectedTask.description && (
              <div className="detail-row">
                <span className="detail-label">描述:</span>
                <span>{selectedTask.description}</span>
              </div>
            )}
            {selectedTask.assignee && (
              <div className="detail-row">
                <span className="detail-label">负责人:</span>
                <span>{selectedTask.assignee}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">创建时间:</span>
              <span>{new Date(selectedTask.created_at).toLocaleString('zh-CN')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">更新时间:</span>
              <span>{new Date(selectedTask.updated_at).toLocaleString('zh-CN')}</span>
            </div>
            {selectedTask.status === 'in_progress' && (
              <div className="detail-row">
                <span className="detail-label">进度:</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${selectedTask.progress}%` }}
                  />
                </div>
                <span>{selectedTask.progress}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
