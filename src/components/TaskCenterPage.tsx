/**
 * TaskCenterPage with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  Pause,
  Play,
  X,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import { openCockpitNavigationTarget } from './cockpitNavigation';

// ── Types ──

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
  scene_binding?: {
    scene_id: string;
    journey_id: string;
    outcome_metric: string;
  } | null;
  workflow_request?: {
    workflow_run_id: string;
    workflow_name: string;
    workflow_version: string;
    state: string;
    request_state: 'ready_for_admission' | 'approval_required';
    approval_required: boolean;
    admission_state: 'pending' | 'admitted';
    scene_binding: Task['scene_binding'];
    evidence_plan: string[];
    last_event_type: string;
    next_action: string;
  } | null;
}

interface TaskListResponse {
  items: Task[];
}

// ── Hooks ──

function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await apiFetch<TaskListResponse>('/api/tasks');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch tasks');
      }
      return response.data?.items || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await apiPost(`/api/tasks/${taskId}/status`, { status });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to update task status');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

function useCancelTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiPost(`/api/tasks/${taskId}/cancel`, {});
      if (!response.ok) {
        throw new Error(response.error || 'Failed to cancel task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

function useRequestTaskWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, workflowName, evidencePlan, sceneBinding }: {
      taskId: string;
      workflowName: string;
      evidencePlan: string[];
      sceneBinding: NonNullable<Task['scene_binding']>;
    }) => {
      const response = await apiPost<{
        workflow_run_id?: string;
        request_state?: string;
        external_side_effects?: string;
        worker_launch?: boolean;
      }>(`/api/tasks/${encodeURIComponent(taskId)}/request-workflow`, {
        workflow_name: workflowName,
        workflow_version: 'v1',
        scene_binding: sceneBinding,
        evidence_plan: evidencePlan,
        actor_ref: 'cockpit-ui://task-center',
      });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to request Workflow Mesh');
      }
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ── Component ──

type TaskStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

interface TaskCenterPageProps {
  /** Seed search from Wave2 / other handoffs (ADR-0192). */
  initialSearchQuery?: string;
}

export default function TaskCenterPage({
  initialSearchQuery = '',
}: TaskCenterPageProps) {
  const [filterStatus, setFilterStatus] = useState<TaskStatus>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workflowName, setWorkflowName] = useState('scene-to-workflow');
  const [evidencePlan, setEvidencePlan] = useState('WorkflowRun 运行证据\n外部连接回执\n结果消费反馈');
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);

  const { data: tasks, isLoading, error } = useTasks();
  const updateStatusMutation = useUpdateTaskStatus();
  const cancelMutation = useCancelTask();
  const workflowMutation = useRequestTaskWorkflow();

  // Accept new seeds when navigating from Wave2 panel
  useEffect(() => {
    if (initialSearchQuery !== undefined && initialSearchQuery !== '') {
      // Navigation handoffs may reuse this mounted page with a new task query.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

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
      case 'completed': return '#2ecc71';
      case 'failed': return '#e74c3c';
      case 'cancelled': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#3498db';
      case 'low': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical': return '紧急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
    }
  };

  const getWorkflowStateText = (state: string) => {
    switch (state) {
      case 'planned': return '待准入';
      case 'admitted': return '已准入';
      case 'dispatched': return '已派发';
      case 'running': return '运行中';
      case 'succeeded': return '已完成';
      case 'verified': return '已验证';
      default: return state || '未知';
    }
  };

  const displayTasks = tasks || [];

  // Filter tasks
  const filteredTasks = displayTasks.filter((task) => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateStatusMutation.mutate({ taskId, status: newStatus });
  };

  const handleCancel = (taskId: string) => {
    cancelMutation.mutate(taskId);
  };

  const handleRequestWorkflow = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTask?.scene_binding) return;
    const plan = evidencePlan.split('\n').map((item) => item.trim()).filter(Boolean);
    if (!workflowName.trim() || plan.length === 0) {
      setWorkflowNotice('工作流名称和证据计划不能为空。');
      return;
    }
    setWorkflowNotice(null);
    workflowMutation.mutate({
      taskId: selectedTask.id,
      workflowName: workflowName.trim(),
      evidencePlan: plan,
      sceneBinding: selectedTask.scene_binding,
    }, {
      onSuccess: (result) => {
        setWorkflowNotice(`Workflow ${result?.workflow_run_id || '已请求'} 已记录，状态 ${result?.request_state || 'requested'}；未启动 worker。`);
      },
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>任务中心</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="antd-btn"
            onClick={() => {
              // Invalidate and refetch tasks
            }}
            aria-label="刷新任务"
          >
            <RefreshCw size={14} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus)}
          className="antd-input"
          aria-label="按状态过滤"
        >
          <option value="all">所有状态</option>
          <option value="pending">待处理</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
          <option value="cancelled">已取消</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索任务..."
          className="antd-input"
          style={{ flex: 1 }}
          aria-label="搜索任务"
        />
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
            <strong>任务数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Task List */}
      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
              <CheckCircle size={24} className="text-success" style={{ marginBottom: '8px' }} />
              <div>暂无任务</div>
            </div>
          ) : (
            filteredTasks.map((task, index) => (
              <div
                key={`${task.id}-${index}`}
                className="antd-card"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                role="button"
                tabIndex={0}
                aria-label={`查看任务 ${task.title}`}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedTask(selectedTask?.id === task.id ? null : task)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {getStatusIcon(task.status)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{task.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      {task.assignee && <span>负责人: {task.assignee} · </span>}
                      更新时间: {new Date(task.updated_at).toLocaleString()}
                    </div>
                    {task.tags && task.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        {task.tags.map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(0, 242, 254, 0.1)',
                              color: 'var(--antd-primary)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getPriorityColor(task.priority),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getPriorityColor(task.priority)}15`,
                  }}>
                    {getPriorityText(task.priority)}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getStatusColor(task.status),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getStatusColor(task.status)}15`,
                  }}>
                    {getStatusText(task.status)}
                  </span>
                  {task.progress > 0 && task.status === 'in_progress' && (
                    <span style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      {task.progress}%
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {task.status === 'pending' && (
                      <button
                        className="antd-btn small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, 'in_progress');
                        }}
                        disabled={updateStatusMutation.isPending}
                        aria-label={`开始任务 ${task.id}`}
                      >
                        <Play size={12} />
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <>
                        <button
                          className="antd-btn small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task.id, 'completed');
                          }}
                          disabled={updateStatusMutation.isPending}
                          aria-label={`完成任务 ${task.id}`}
                        >
                          <CheckCircle size={12} />
                        </button>
                        <button
                          className="antd-btn small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task.id, 'paused');
                          }}
                          disabled={updateStatusMutation.isPending}
                          aria-label={`暂停任务 ${task.id}`}
                        >
                          <Pause size={12} />
                        </button>
                      </>
                    )}
                    {(task.status === 'pending' || task.status === 'in_progress') && (
                      <button
                        className="antd-btn small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(task.id);
                        }}
                        disabled={cancelMutation.isPending}
                        aria-label={`取消任务 ${task.id}`}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedTask(null)}
          role="dialog"
          aria-label="任务详情"
        >
          <div
            className="antd-card"
            style={{ 
              maxWidth: '600px', 
              width: '90%', 
              maxHeight: '80vh', 
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>任务详情</h2>
              <button
                className="antd-btn"
                onClick={() => setSelectedTask(null)}
                aria-label="关闭"
              >
                <X size={14} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>标题</div>
                <div style={{ fontWeight: 500 }}>{selectedTask.title}</div>
              </div>
              
              {selectedTask.description && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>描述</div>
                  <div>{selectedTask.description}</div>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>状态</div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getStatusColor(selectedTask.status),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getStatusColor(selectedTask.status)}15`,
                  }}>
                    {getStatusText(selectedTask.status)}
                  </span>
                </div>
                
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>优先级</div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getPriorityColor(selectedTask.priority),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getPriorityColor(selectedTask.priority)}15`,
                  }}>
                    {getPriorityText(selectedTask.priority)}
                  </span>
                </div>
                
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>创建时间</div>
                  <div style={{ fontSize: '13px' }}>{new Date(selectedTask.created_at).toLocaleString()}</div>
                </div>
                
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>更新时间</div>
                  <div style={{ fontSize: '13px' }}>{new Date(selectedTask.updated_at).toLocaleString()}</div>
                </div>
              </div>
              
              {selectedTask.assignee && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>负责人</div>
                  <div>{selectedTask.assignee}</div>
                </div>
              )}
              
              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '4px' }}>标签</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {selectedTask.tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(0, 242, 254, 0.1)',
                          color: 'var(--antd-primary)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.scene_binding && (
                <section style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px', display: 'grid', gap: '10px' }} aria-label="场景绑定与 Workflow Mesh 请求">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitBranch size={15} className="text-primary" />
                    <strong>场景绑定</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                    <span>场景：{selectedTask.scene_binding.scene_id}</span>
                    <span>旅程：{selectedTask.scene_binding.journey_id}</span>
                    <span>指标：{selectedTask.scene_binding.outcome_metric}</span>
                  </div>
                  {selectedTask.status === 'pending' && (
                    <form onSubmit={handleRequestWorkflow} style={{ display: 'grid', gap: '8px' }} aria-label="请求 Workflow Mesh">
                      <strong>请求进入 Workflow Mesh</strong>
                      <span style={{ color: 'var(--antd-text-secondary)', fontSize: '12px' }}>只记录 WorkflowRequested；后续仍需审批、能力健康和预算准入，不会启动 worker。</span>
                      <input className="antd-input" aria-label="任务工作流名称" value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} />
                      <textarea className="antd-input" aria-label="任务证据计划" value={evidencePlan} onChange={(event) => setEvidencePlan(event.target.value)} rows={3} />
                      <button className="antd-btn antd-btn-primary" type="submit" disabled={workflowMutation.isPending} aria-label="请求任务 Workflow">
                        <GitBranch size={14} /> {workflowMutation.isPending ? '请求中...' : '请求 Workflow'}
                      </button>
                      {workflowMutation.error && <span role="alert" style={{ color: 'var(--antd-error)' }}>{workflowMutation.error instanceof Error ? workflowMutation.error.message : 'Workflow 请求失败'}</span>}
                      {workflowNotice && <span role="status" style={{ color: '#237804', fontSize: '12px' }}>{workflowNotice}</span>}
                    </form>
                  )}
                </section>
              )}

              {selectedTask.workflow_request && (
                <section style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px', display: 'grid', gap: '10px' }} aria-label="Workflow Mesh 请求状态">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitBranch size={15} className="text-primary" />
                    <strong>Workflow Mesh 请求状态</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                    <span>工作流：{selectedTask.workflow_request.workflow_name} · {selectedTask.workflow_request.workflow_version}</span>
                    <span>运行：{selectedTask.workflow_request.workflow_run_id}</span>
                    <span>状态：{getWorkflowStateText(selectedTask.workflow_request.state)}</span>
                    <span>准入：{selectedTask.workflow_request.admission_state === 'admitted' ? '已准入' : '待预览'}</span>
                    <span>审批：{selectedTask.workflow_request.approval_required ? selectedTask.workflow_request.request_state : '无需审批'}</span>
                    <span>下一步：{selectedTask.workflow_request.next_action}</span>
                  </div>
                  {selectedTask.workflow_request.evidence_plan.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      证据计划：{selectedTask.workflow_request.evidence_plan.join('；')}
                    </div>
                  )}
                  <button
                    className="antd-btn"
                    type="button"
                    onClick={() => openCockpitNavigationTarget({ tab: 'WorkflowMeshOperations' })}
                    aria-label="打开 Workflow Mesh 准入工作台"
                  >
                    <GitBranch size={14} /> 打开准入工作台
                  </button>
                </section>
              )}
              
              {selectedTask.progress > 0 && (
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
                        width: `${selectedTask.progress}%`, 
                        height: '100%', 
                        background: 'var(--antd-primary)',
                        borderRadius: '4px',
                      }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{selectedTask.progress}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
