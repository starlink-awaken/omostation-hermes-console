export const EXECUTION_STEPS = [
  {
    id: 'Knowledge',
    title: '先定问题',
    summary: '从知识中枢确认缺口、路径和目标范围。',
  },
  {
    id: 'Assets',
    title: '选能力',
    summary: '挑合适的技能、管线和自动化工作流。',
  },
  {
    id: 'Workflows',
    title: '跑自动化',
    summary: '看编排状态，处理等待审批或失败节点。',
  },
  {
    id: 'TaskCenter',
    title: '落任务',
    summary: '把结论沉到任务、草稿和后续动作。',
  },
];

export function formatPriority(priority?: string) {
  switch (priority) {
    case 'critical':
      return '紧急';
    case 'high':
      return '高优';
    case 'medium':
      return '中优';
    case 'low':
      return '低优';
    default:
      return '未标记';
  }
}

export function formatTaskStatus(status?: string) {
  switch (status) {
    case 'in_progress':
      return '进行中';
    case 'pending':
      return '待处理';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'cancelled':
      return '已取消';
    default:
      return '未知';
  }
}
