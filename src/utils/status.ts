/**
 * 状态归一化与状态文本工具.
 *
 * 从 fullsite OverviewPage.tsx / HomePage.tsx 提取的纯逻辑:
 *   - normalizeStatus — 任意状态字符串 → 'online' | 'offline' | 'degraded'
 *   - badgeClass — 状态 → CSS 类名 (与 normalizeStatus 同形)
 *   - statusText — 状态 → 中文标签
 *   - summaryStatusText — 汇总状态 (blocked/at_risk/healthy/watch) → 中文
 *   - focusStatusText — 焦点状态 (healthy/watch/at_risk/blocked) → 中文
 *   - maturityStatusText — 成熟度 (ready/watch/gap) → 中文
 *   - portfolioStatusText — 项目组合状态 → 中文
 *   - coverageTone — 分数 + 失败/警告计数 → 状态色调
 *   - actionLoadTone — 操作负载 → 状态色调
 *
 * 零依赖，所有 cockpit 视图的状态显示都可复用.
 */

/** 归一化状态值 — 将各种上游状态字符串统一为三种基础状态 */
export function normalizeStatus(value: string): 'online' | 'offline' | 'degraded' {
  if (['online', 'running', 'active', 'healthy', 'configured', 'ready'].includes(value)) return 'online';
  if (['offline', 'stopped', 'missing', 'unreachable'].includes(value)) return 'offline';
  return 'degraded';
}

/** 状态 → CSS 类名 (与 normalizeStatus 输出同形) */
export function badgeClass(value: string): string {
  return normalizeStatus(value);
}

/** 状态 → 中文标签 */
export function statusText(value: string): string {
  if (['online', 'running', 'active', 'healthy', 'configured', 'ready'].includes(value)) return '在线';
  if (['offline', 'stopped', 'missing', 'unreachable'].includes(value)) return '离线';
  if (value === 'degraded') return '降级';
  if (value === 'idle') return '空闲';
  return value || '未知';
}

/** 汇总状态 → 中文 */
export function summaryStatusText(value?: string): string {
  if (value === 'blocked') return '阻塞';
  if (value === 'at_risk') return '风险';
  if (value === 'healthy') return '健康';
  if (value === 'watch') return '观察';
  return '未知';
}

/** 焦点状态 → 中文 */
export function focusStatusText(status: string): string {
  if (status === 'healthy') return '健康';
  if (status === 'watch') return '观察';
  if (status === 'at_risk') return '风险';
  if (status === 'blocked') return '阻塞';
  return '未知';
}

/** 成熟度状态 → 中文 */
export function maturityStatusText(status: string): string {
  if (status === 'ready') return '就绪';
  if (status === 'watch') return '观察';
  if (status === 'gap') return '缺口';
  return '未知';
}

/** 项目组合状态 → 中文 */
export function portfolioStatusText(status?: string): string {
  if (status === 'blocked') return '阻塞';
  if (status === 'at_risk') return '风险';
  if (status === 'watch') return '观察';
  if (status === 'healthy') return '健康';
  return '未知';
}

/**
 * 覆盖率分数 → 状态色调.
 *
 * @param score 覆盖率分数 (0-100)
 * @param failureCount 失败项计数
 * @param warningCount 警告项计数
 */
export function coverageTone(score: number, failureCount = 0, warningCount = 0): 'online' | 'offline' | 'degraded' {
  if (failureCount > 0 || score < 70) return 'offline';
  if (warningCount > 0 || score < 85) return 'degraded';
  return 'online';
}

/** 操作负载计数器接口 (用于 actionLoadTone) */
export interface ActionLoadCounters {
  verificationGapProjects?: number;
  capabilityGapDrafts?: number;
  verificationReadyProjects?: number;
  pageMaturityDrafts?: number;
  domainAppDrafts?: number;
}

/**
 * 操作负载 → 状态色调.
 *
 * 有验证缺口或能力缺口 → offline;
 * 有验证就绪或成熟度/域草稿 → degraded;
 * 否则 → online.
 */
export function actionLoadTone(focus: ActionLoadCounters): 'online' | 'offline' | 'degraded' {
  if ((focus.verificationGapProjects ?? 0) > 0 || (focus.capabilityGapDrafts ?? 0) > 0) return 'offline';
  if (
    (focus.verificationReadyProjects ?? 0) > 0
    || (focus.pageMaturityDrafts ?? 0) > 0
    || (focus.domainAppDrafts ?? 0) > 0
  ) return 'degraded';
  return 'online';
}
