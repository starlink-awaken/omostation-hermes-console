/**
 * 状态归一化与状态文本工具.
 *
 * 从 fullsite OverviewPage.tsx / HomePage.tsx 提取的纯逻辑:
 *   - normalizeStatus — 任意状态字符串 → 'online' | 'offline' | 'degraded'
 *   - statusText — 状态 → 中文标签
 *   - focusStatusText / maturityStatusText — 域状态 → 中文
 *   - coverageTone — 分数 + 失败/警告计数 → 状态色调
 *   - actionLoadTone — 操作负载 → 状态色调
 *
 * 零依赖，所有 cockpit 视图的状态显示都可复用.
 */

// ─── 状态常量 ───

const ONLINE_STATES = new Set(['online', 'running', 'active', 'healthy', 'configured', 'ready']);
const OFFLINE_STATES = new Set(['offline', 'stopped', 'missing', 'unreachable']);

// ─── 基础归一化 ───

/** 归一化状态值 — 将各种上游状态字符串统一为三种基础状态 */
export function normalizeStatus(value: string): 'online' | 'offline' | 'degraded' {
  if (ONLINE_STATES.has(value)) return 'online';
  if (OFFLINE_STATES.has(value)) return 'offline';
  return 'degraded';
}

/** 状态 → CSS 类名 (与 normalizeStatus 同形) */
export const badgeClass = normalizeStatus;

// ─── 状态文本 ───

const STATUS_TEXT_MAP: Record<string, string> = {
  online: '在线',
  running: '在线',
  active: '在线',
  healthy: '在线',
  configured: '在线',
  ready: '在线',
  offline: '离线',
  stopped: '离线',
  missing: '离线',
  unreachable: '离线',
  degraded: '降级',
  idle: '空闲',
};

/** 状态 → 中文标签 */
export function statusText(value: string): string {
  return STATUS_TEXT_MAP[value] || value || '未知';
}

// ─── 域状态文本 (通用 lookup) ───

function lookupStatus(map: Record<string, string>, value?: string, fallback = '未知'): string {
  if (!value) return fallback;
  return map[value] || fallback;
}

const OPERATING_STATUS_MAP: Record<string, string> = {
  blocked: '阻塞',
  at_risk: '风险',
  watch: '观察',
  healthy: '健康',
};

/** 汇总状态 → 中文 */
export const summaryStatusText = (value?: string) => lookupStatus(OPERATING_STATUS_MAP, value);

/** 焦点状态 → 中文 (与汇总状态同形) */
export const focusStatusText = (value?: string) => lookupStatus(OPERATING_STATUS_MAP, value);

const MATURITY_STATUS_MAP: Record<string, string> = {
  ready: '就绪',
  watch: '观察',
  gap: '缺口',
};

/** 成熟度状态 → 中文 */
export const maturityStatusText = (value?: string) => lookupStatus(MATURITY_STATUS_MAP, value);

/** 项目组合状态 → 中文 (与汇总/焦点状态同形) */
export const portfolioStatusText = (value?: string) => lookupStatus(OPERATING_STATUS_MAP, value);

// ─── 覆盖率色调 ───

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

// ─── 操作负载 ───

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

