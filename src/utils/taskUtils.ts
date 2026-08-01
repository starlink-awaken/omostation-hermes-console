/**
 * 任务中心工具函数集.
 *
 * 从 fullsite TaskCenterPage.tsx 提取的纯逻辑:
 *   - sourceTypeLabel — 来源类型 → 中文标签 (20+ 种映射)
 *   - sourceTypeDescription — 来源类型 → 处理建议描述
 *   - sourceTypeHint — 来源类型 → 建议入口提示
 *   - sourceTypeSearchKeyword — 来源类型 → 搜索关键词
 *   - sourceActionLabel — 任务 → 来源动作按钮标签
 *   - sourceCompletionHint — 任务 → 完成指导提示文案
 *   - taskOriginLabel — 任务 → 来源标签文本
 *   - canRunControlledVerification — 判断任务是否可执行受控验证
 *   - formatTime — ISO 时间戳 → 相对时间
 *
 * 零 React 依赖，任务中心视图和任何任务展示场景都可复用.
 */

import type { DraftSourceType } from '../types/cockpit';
import type { TaskDetail } from '../types/cockpit';

/** 来源类型 → 中文标签映射表 */
const SOURCE_TYPE_LABELS: Record<string, string> = {
  system_map_project_portfolio: '项目组合',
  system_map_verification_ready: '验证补证',
  system_map_playbook: '操作清单',
  system_map_domain_app: '领域应用',
  system_map_capability_gap: '能力缺口',
  system_map_page_maturity: '页面能力',
  'cockpit.runtime-workbench': '运行诊断',
  'cockpit.system-assurance-workbench': '系统保证',
  'cockpit.mcp-mesh-resolver': 'MCP 解析',
  'cockpit.task-center': '手工登记',
  'cockpit.assets-skill': '技术资产',
  'cockpit.governance-domain-workbench': '系统治理',
  'cockpit.infrastructure-workbench': '基础设施',
  'cockpit.knowledge-hub': '知识中枢',
  'cockpit.l4-health': 'L4 健康',
  'cockpit.log-viewer': '日志治理',
  'cockpit.performance-monitor': '性能监控',
  'cockpit.platform-control-workbench': '平台控制',
  'cockpit.protocol-workbench': '协议工作台',
  'cockpit.quest-board': '积分冒险',
  'cockpit.sandbox-terminal': '隔离沙箱',
  'cockpit.topology-view': '全局拓扑',
};

/** 来源类型 → 中文标签 */
export function sourceTypeLabel(type?: string): string {
  if (!type) return '草稿来源';
  return SOURCE_TYPE_LABELS[type] || '草稿来源';
}

/** 草稿来源排序优先级 */
export const DRAFT_SOURCE_ORDER: DraftSourceType[] = [
  'system_map_verification_ready',
  'system_map_capability_gap',
  'system_map_page_maturity',
  'system_map_domain_app',
  'system_map_project_portfolio',
  'system_map_playbook',
];

/** 类型守卫: 字符串是否为合法 DraftSourceType */
export function isDraftSourceType(value?: string): value is DraftSourceType {
  return DRAFT_SOURCE_ORDER.includes(value as DraftSourceType);
}

/** 来源类型 → 处理建议描述 */
export function sourceTypeDescription(type: DraftSourceType): string {
  if (type === 'system_map_verification_ready') return '优先把已有验证命令补成正式证据。';
  if (type === 'system_map_capability_gap') return '先补状态面、命令、探针和入口缺口。';
  if (type === 'system_map_page_maturity') return '把页面从 watch/gap 推到可日用。';
  if (type === 'system_map_domain_app') return '处理领域挂载、运行态和安全门。';
  if (type === 'system_map_project_portfolio') return '聚焦组合里最该先修的项目。';
  return '把跨页操作清单顺成一条可执行路径。';
}

/** 来源类型 → 建议入口提示 */
export function sourceTypeHint(type: DraftSourceType): string {
  if (type === 'system_map_verification_ready') return '建议入口：SystemMap / TaskCenter';
  if (type === 'system_map_capability_gap') return '建议入口：SystemMap 修复台';
  if (type === 'system_map_page_maturity') return '建议入口：来源页面';
  if (type === 'system_map_domain_app') return '建议入口：应用中心';
  if (type === 'system_map_project_portfolio') return '建议入口：项目态势';
  return '建议入口：执行页面';
}

/** 来源类型 → 搜索关键词 */
export function sourceTypeSearchKeyword(type: DraftSourceType): string {
  if (type === 'system_map_verification_ready') return '验证';
  if (type === 'system_map_capability_gap') return '缺口';
  if (type === 'system_map_page_maturity') return '页面';
  if (type === 'system_map_domain_app') return '领域';
  if (type === 'system_map_project_portfolio') return '项目';
  return '清单';
}

/** 任务 → 来源动作按钮标签 */
export function sourceActionLabel(task: TaskDetail): string {
  if (task.task_type === 'page_operator_action') return '回页面动作';
  if (task.task_type === 'page_roadmap') return '回页面路线图';
  if (!task.source?.type) return '打开来源';
  return sourceTypeLabel(task.source.type).replace('系统地图', '查看').replace('cockpit.', '回 ') || '打开来源';
}

/** 任务 → 完成指导提示文案 */
export function sourceCompletionHint(task: TaskDetail): string {
  if (task.task_type === 'page_operator_action') {
    const page = (task.metadata?.page_id as string) || '目标页面';
    const action = (task.metadata?.operator_action_label as string) || (task.metadata?.operator_action as string) || '页面动作';
    const risk = task.metadata?.operator_action_risk ? `当前风险：${task.metadata.operator_action_risk}。` : '';
    return `${risk}回到 ${page} 核对 ${action}，记录执行结果或阻塞原因后完成 closeout。`;
  }
  if (task.task_type === 'page_roadmap') {
    const page = (task.metadata?.page_id as string) || '目标页面';
    const roadmap = (task.metadata?.roadmap_title as string) || (task.metadata?.roadmap_id as string) || '页面路线图';
    return `回到 ${page} 对照"${roadmap}"的动作和验收项，完成证据留存后进入 closeout。`;
  }
  if (!task.source?.type) return '确认任务完成定义，再继续承接。';

  const hints: Record<string, string> = {
    system_map_project_portfolio: '目标是把项目从组合阻塞里移出，并补齐最近状态证据。',
    system_map_verification_ready: '目标是把已有验证命令跑成正式 workflow / closeout 证据。',
    system_map_domain_app: '目标是把领域挂载的运行态、安全门和入口状态收口。',
    system_map_capability_gap: '目标是让缺口回到页面、命令、探针和入口都可见。',
    system_map_page_maturity: '目标是把页面从 gap/watch 推到可日用。',
    system_map_playbook: '目标是让执行路径、证据和 done_when 形成完整闭环。',
    'cockpit.runtime-workbench': '目标是完成运行告警、性能、日志或拓扑证据收口。',
    'cockpit.system-assurance-workbench': '目标是补齐横向系统保证证据并完成 closeout。',
    'cockpit.mcp-mesh-resolver': '目标是核对 BOS 解析、路由和实例验收证据。',
    'cockpit.task-center': '目标是把手工发现登记为可追踪的正式任务。',
    'cockpit.assets-skill': '目标是补齐技能资产的描述、边界和可复用入口。',
    'cockpit.governance-domain-workbench': '目标是完成治理对象的跨域证据收口。',
    'cockpit.infrastructure-workbench': '目标是完成基础设施状态、证据和处理结果收口。',
    'cockpit.knowledge-hub': '目标是把知识上下文带入验证、执行和 closeout。',
    'cockpit.l4-health': '目标是完成 L4 域健康、信号和关联应用收口。',
    'cockpit.log-viewer': '目标是从日志异常追到根因、告警恢复和 closeout。',
    'cockpit.performance-monitor': '目标是把性能热点追到告警、日志和持续治理。',
    'cockpit.platform-control-workbench': '目标是完成控制面状态、验证和处理结果收口。',
    'cockpit.protocol-workbench': '目标是核对协议、工作流、桥接和治理证据。',
    'cockpit.quest-board': '目标是把家庭积分任务的完成记录纳入长期跟踪。',
    'cockpit.sandbox-terminal': '目标是保留沙箱实验输出、结论和后续动作。',
    'cockpit.topology-view': '目标是核对拓扑依赖、节点健康和下游影响。',
  };
  return hints[task.source.type] || '回来源面继续完成闭环。';
}

/** 任务 → 来源标签文本 */
export function taskOriginLabel(task: TaskDetail): string {
  if (task.task_type === 'page_operator_action') {
    return `页面动作 · ${(task.metadata?.page_id as string) || '未知页面'} · ${(task.metadata?.operator_action_label as string) || (task.metadata?.operator_action as string) || '未命名动作'}`;
  }
  if (task.task_type === 'page_roadmap') {
    return `页面路线图 · ${(task.metadata?.page_id as string) || '未知页面'} · ${(task.metadata?.roadmap_title as string) || (task.metadata?.roadmap_id as string) || '未命名路线项'}`;
  }
  if (task.source?.type) return `${sourceTypeLabel(task.source.type)} · ${task.source.id}`;
  return '运行任务';
}

/**
 * 判断任务是否可执行受控验证.
 *
 * 条件: 有 controlled_execution 标记，且未审计通过 (exit_code !== 0 或 timed_out).
 */
export function canRunControlledVerification(task: TaskDetail): boolean {
  const contract = task.execution_contract;
  const audit = contract?.execution_audit;
  if (!contract?.controlled_execution) return false;
  return !audit || audit.exit_code !== 0 || audit.timed_out === true;
}

/**
 * ISO 时间戳 → 相对时间.
 *
 * @example
 *   formatTime('2026-08-01T12:00:00Z') → '5 分钟前'
 *   formatTime('2026-07-31T12:00:00Z') → '1 天前'
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return date.toLocaleDateString('zh-CN');
}
