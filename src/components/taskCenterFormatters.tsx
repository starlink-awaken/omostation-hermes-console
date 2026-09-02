/**
 * TaskCenterPage 显示格式化工具函数.
 *
 * 从 TaskCenterPage.tsx 提取:
 *   - getStatusIcon — 状态 → 图标
 *   - getStatusText — 状态 → 中文文本
 *   - getStatusColor — 状态 → 颜色
 *   - getPriorityColor — 优先级 → 颜色
 *   - getPriorityText — 优先级 → 中文文本
 *   - getWorkflowStateText — Workflow 状态 → 中文文本
 */

import React from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  X,
} from 'lucide-react';
import type { Task } from './taskCenterTypes';

export function getStatusIcon(status: Task['status']) {
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
}

export function getStatusText(status: Task['status']) {
  switch (status) {
    case 'pending': return '待处理';
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    case 'cancelled': return '已取消';
    default: return '未知';
  }
}

export function getStatusColor(status: Task['status']) {
  switch (status) {
    case 'pending': return '#95a5a6';
    case 'in_progress': return '#3498db';
    case 'completed': return '#2ecc71';
    case 'failed': return '#e74c3c';
    case 'cancelled': return '#95a5a6';
    default: return '#95a5a6';
  }
}

export function getPriorityColor(priority: Task['priority']) {
  switch (priority) {
    case 'critical': return '#e74c3c';
    case 'high': return '#f39c12';
    case 'medium': return '#3498db';
    case 'low': return '#95a5a6';
    default: return '#95a5a6';
  }
}

export function getPriorityText(priority: Task['priority']) {
  switch (priority) {
    case 'critical': return '紧急';
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '未知';
  }
}

export function getWorkflowStateText(state: string) {
  switch (state) {
    case 'planned': return '待准入';
    case 'admitted': return '已准入';
    case 'dispatched': return '已派发';
    case 'running': return '运行中';
    case 'succeeded': return '已完成';
    case 'verified': return '已验证';
    default: return state || '未知';
  }
}
