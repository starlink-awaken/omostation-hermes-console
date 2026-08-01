import { describe, it, expect } from 'vitest';
import {
  sourceTypeLabel,
  sourceTypeDescription,
  sourceTypeHint,
  sourceTypeSearchKeyword,
  sourceActionLabel,
  taskOriginLabel,
  canRunControlledVerification,
  formatTime,
  isDraftSourceType,
  DRAFT_SOURCE_ORDER,
} from '../taskUtils';
import type { TaskDetail } from '../../types/cockpit';

describe('sourceTypeLabel', () => {
  it('映射已知来源类型', () => {
    expect(sourceTypeLabel('system_map_project_portfolio')).toBe('项目组合');
    expect(sourceTypeLabel('system_map_domain_app')).toBe('领域应用');
    expect(sourceTypeLabel('cockpit.task-center')).toBe('手工登记');
  });

  it('未知类型返回默认值', () => {
    expect(sourceTypeLabel('unknown_type')).toBe('草稿来源');
    expect(sourceTypeLabel()).toBe('草稿来源');
  });
});

describe('sourceTypeDescription', () => {
  it('返回处理建议', () => {
    expect(sourceTypeDescription('system_map_verification_ready')).toContain('验证命令');
    expect(sourceTypeDescription('system_map_capability_gap')).toContain('缺口');
  });
});

describe('sourceTypeHint', () => {
  it('返回建议入口', () => {
    expect(sourceTypeHint('system_map_domain_app')).toContain('应用中心');
    expect(sourceTypeHint('system_map_capability_gap')).toContain('修复台');
  });
});

describe('sourceTypeSearchKeyword', () => {
  it('返回搜索关键词', () => {
    expect(sourceTypeSearchKeyword('system_map_verification_ready')).toBe('验证');
    expect(sourceTypeSearchKeyword('system_map_capability_gap')).toBe('缺口');
  });
});

describe('DRAFT_SOURCE_ORDER', () => {
  it('包含 6 种来源类型', () => {
    expect(DRAFT_SOURCE_ORDER.length).toBe(6);
  });
});

describe('isDraftSourceType', () => {
  it('合法来源返回 true', () => {
    expect(isDraftSourceType('system_map_project_portfolio')).toBe(true);
    expect(isDraftSourceType('system_map_domain_app')).toBe(true);
  });

  it('非法来源返回 false', () => {
    expect(isDraftSourceType('invalid')).toBe(false);
    expect(isDraftSourceType()).toBe(false);
  });
});

describe('sourceActionLabel', () => {
  it('page_operator_action 类型', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      task_type: 'page_operator_action',
    };
    expect(sourceActionLabel(task)).toBe('回页面动作');
  });

  it('page_roadmap 类型', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      task_type: 'page_roadmap',
    };
    expect(sourceActionLabel(task)).toBe('回页面路线图');
  });

  it('无来源类型', () => {
    const task: TaskDetail = { id: '1', title: 'test', status: 'pending' };
    expect(sourceActionLabel(task)).toBe('打开来源');
  });
});

describe('taskOriginLabel', () => {
  it('page_operator_action 格式', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      task_type: 'page_operator_action',
      metadata: { page_id: 'Home', operator_action_label: '检查链接' },
    };
    expect(taskOriginLabel(task)).toContain('页面动作');
    expect(taskOriginLabel(task)).toContain('Home');
    expect(taskOriginLabel(task)).toContain('检查链接');
  });

  it('有 source 类型', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      source: { type: 'system_map_project_portfolio', id: 'proj-1' },
    };
    expect(taskOriginLabel(task)).toContain('项目组合');
  });
});

describe('canRunControlledVerification', () => {
  it('有 controlled_execution 且无审计 → true', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      execution_contract: { controlled_execution: true },
    };
    expect(canRunControlledVerification(task)).toBe(true);
  });

  it('审计通过 (exit_code=0) → false', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      execution_contract: {
        controlled_execution: true,
        execution_audit: { exit_code: 0 },
      },
    };
    expect(canRunControlledVerification(task)).toBe(false);
  });

  it('审计失败 (exit_code≠0) → true', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      execution_contract: {
        controlled_execution: true,
        execution_audit: { exit_code: 1 },
      },
    };
    expect(canRunControlledVerification(task)).toBe(true);
  });

  it('无 controlled_execution → false', () => {
    const task: TaskDetail = {
      id: '1', title: 'test', status: 'pending',
      execution_contract: {},
    };
    expect(canRunControlledVerification(task)).toBe(false);
  });
});

describe('formatTime', () => {
  it('刚刚', () => {
    const now = new Date().toISOString();
    expect(formatTime(now)).toBe('刚刚');
  });

  it('分钟前', () => {
    const d = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatTime(d)).toBe('5 分钟前');
  });

  it('小时前', () => {
    const d = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatTime(d)).toBe('3 小时前');
  });

  it('天前', () => {
    const d = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatTime(d)).toBe('2 天前');
  });
});
