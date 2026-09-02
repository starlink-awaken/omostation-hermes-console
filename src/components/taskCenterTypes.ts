/**
 * TaskCenterPage 局部类型定义.
 *
 * 从 TaskCenterPage.tsx 提取:
 *   - Task — 任务中心任务实体
 *   - TaskListResponse — 任务列表响应
 *   - TaskStatus — 状态筛选值
 *   - TaskCenterPageProps — 页面 props
 */

import type { TaskStatusFilter } from '../types/cockpit';

export type TaskStatus = TaskStatusFilter;

export interface Task {
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

export interface TaskListResponse {
  items: Task[];
}

export interface TaskCenterPageProps {
  /** Seed search from Wave2 / other handoffs (ADR-0192). */
  initialSearchQuery?: string;
}
