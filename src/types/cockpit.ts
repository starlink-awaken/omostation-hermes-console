/**
 * Cockpit 域模型类型集中定义.
 *
 * 从 fullsite HomePage/TaskCenterPage/OverviewPage 提取并去重:
 *   - 健康/告警/任务/指标基础类型
 *   - 项目组合/焦点/维度覆盖类型
 *   - 系统地图/闭环/导航覆盖类型
 *   - 任务中心执行契约类型
 *
 * 所有 cockpit 视图共享的 SSOT 类型，避免各文件重复定义.
 */

import type { CockpitNavigationTarget } from '../components/cockpitNavigation';

// ─── 基础监控类型 ───

/** 系统健康摘要 */
export interface HealthSummary {
  health_score: number;
  health_score_change: number;
  active_services: number;
  total_services: number;
  active_tasks: number;
  active_tasks_source?: 'omo' | 'unavailable' | string;
  today_requests: number;
  today_requests_change: number;
  data_quality?: 'complete' | 'partial' | 'unavailable' | string;
  degraded_reasons?: string[];
}

/** 告警条目 */
export interface CockpitAlert {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
}

/** 任务 (简化版，用于首页/概览) */
export interface CockpitTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  updated_at: string;
}

/** 时序数据点 */
export interface DataPoint {
  timestamp: string;
  value: number;
}

/** 指标时间范围 */
export type MetricsTimeRange = '1h' | '6h' | '24h' | '7d';

// ─── 项目组合类型 ───

/** 优先项目 */
export interface PriorityProject {
  id: string;
  layer: string;
  status: string;
  score: number;
  cockpit_page?: string;
  primary_gap: string;
  next_action: string;
  triage_commands: number;
}

/** 薄弱维度 */
export interface FocusWeakDimension {
  id: string;
  title: string;
  status: string;
  score: number;
  failed: number;
  warning: number;
  nextAction: string;
  attentionProjects: { id: string; status: string; next_action: string }[];
}

/** 需关注领域应用 */
export interface FocusDomainAttention {
  id: string;
  name: string;
  runtimeStatus: string;
  riskLevel: string;
  securityPosture: string;
  nextAction: string;
}

/** 操作焦点汇总 */
export interface OperatingFocus {
  status: string;
  score: number;
  blocked: number;
  atRisk: number;
  watch: number;
  healthy: number;
  runtimeGapProjects: number;
  verificationGapProjects: number;
  verificationReadyProjects: number;
  readyAndRunningProjects: number;
  priorityProjects: PriorityProject[];
  totalDrafts: number;
  projectDrafts: number;
  verificationDrafts: number;
  playbookDrafts: number;
  domainAppDrafts: number;
  capabilityGapDrafts: number;
  pageMaturityDrafts: number;
  actionDrafts: FocusActionDraft[];
  weakestDimensions: FocusWeakDimension[];
  domainAttention: FocusDomainAttention[];
}

/** 草稿任务摘要 */
export interface DraftTaskSummary {
  id?: string;
  title?: string;
  description?: string;
  priority?: string;
  read_only?: boolean;
  tags?: string[];
  source?: {
    id?: string;
    title?: string;
    type?: string;
  };
}

/** 焦点动作草稿 (由 DraftTaskSummary 转换而来) */
export interface FocusActionDraft {
  id: string;
  title: string;
  sourceLabel: string;
  sourceType?: string;
  sourceId?: string;
  priority?: string;
  description?: string;
}

// ─── 系统地图/架构类型 ───

/**  cockpit 页面元数据 */
export interface CockpitPageMeta {
  id: string;
  title: string;
  group: string;
  purpose?: string;
  dimensions?: string[];
}

/** 能力域 */
export interface FeatureDomain {
  id: string;
  title: string;
  english?: string;
  cockpit_page?: string;
  coverage?: string;
  capability_items?: string[];
  providers?: string[];
}

/** 页面分组汇总 */
export interface PageGroupSummary {
  group: string;
  count: number;
  pages: CockpitPageMeta[];
}

/** 架构车道 */
export interface ArchitectureRoadmapLane {
  id: string;
  title: string;
  count: number;
}

/** 架构车道汇总 (计算产物) */
export interface ArchitectureLaneSummary {
  id: string;
  title: string;
  pageCount: number;
  usageCount: number;
  domainCount: number;
  attentionCount: number;
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

// ─── 闭环/覆盖类型 ───

/** 页面闭环行 (缺失/已链接项) */
export interface SiteClosureRow {
  id: string;
  pageId: string;
  title: string;
  group: string;
  missingItems: string[];
  linkedItems: string[];
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

/** 导航覆盖行 */
export interface NavigationCoverageRow {
  id: string;
  pageId: string;
  title: string;
  group: string;
  purpose: string;
  registeredInSystemMap: boolean;
  hasUsagePath: boolean;
  hasPlaybook: boolean;
  hasTaskDraft: boolean;
  missingItems: string[];
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

/** 维度覆盖带行 */
export interface DimensionCoverageBandRow {
  id: string;
  group: string;
  coverageScore: number;
  pageCount: number;
  registeredCount: number;
  usageCount: number;
  playbookCount: number;
  domainCount: number;
  taskCount: number;
  attentionCount: number;
  missingDimensionCounts: { label: string; count: number }[];
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

/** 站点架构汇总 */
export interface SiteArchitecture {
  projects: number;
  pages: number;
  domains: number;
  usagePaths: number;
  playbooks: number;
  roadmapItems: number;
  projectCoverageScore: number;
  pageMaturityScore: number;
  domainAppScore: number;
  pageReady: number;
  pageWatch: number;
  capabilityWarnings: number;
  capabilityFailures: number;
  domainRunning: number;
  externalMounts: number;
  highRiskDomainApps: number;
  blockedProjects: number;
  projectsNeedingAction: number;
  pageGroups: PageGroupSummary[];
  featureDomains: FeatureDomain[];
  roadmapLanes: ArchitectureRoadmapLane[];
  laneSummaries: ArchitectureLaneSummary[];
}

// ─── 任务中心类型 ───

/** 任务执行审计 */
export interface TaskExecutionAudit {
  exit_code?: number;
  log_ref?: string;
  closeout_ref?: string;
  command?: string;
  timed_out?: boolean;
}

/** 任务执行契约 */
export interface TaskExecutionContract {
  controlled_execution?: boolean;
  execution_audit?: TaskExecutionAudit;
}

/** 任务 (完整版，含执行契约) */
export interface TaskDetail {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  priority?: string;
  progress?: number;
  updated_at?: string;
  created_at?: string;
  execution_contract?: TaskExecutionContract;
  draft?: {
    source_type?: string;
    source_id?: string;
  };
  source?: {
    type?: string;
    id?: string;
    title?: string;
  };
  task_type?: string;
  read_only?: boolean;
  metadata?: Record<string, unknown>;
}

/** 任务历史条目 */
export interface TaskHistoryEntry {
  id: string;
  action: string;
  timestamp: string;
  actor?: string;
  detail?: string;
}

/** 任务执行态势 */
export interface TaskExecutionSnapshot {
  status?: string;
  dispatch_id?: string | null;
  worker_id?: string | null;
  run_ref?: string | null;
  evidence_paths?: string[];
  evidence_required?: string[];
  evidence_ready?: boolean;
  existing_artifacts?: string[];
  next_action?: string;
  artifacts?: Record<string, { ref?: string | null; exists?: boolean; valid?: boolean }>;
}

/** 任务状态筛选 */
export type TaskStatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

/** 草稿来源类型 (6 种 system_map 来源) */
export type DraftSourceType =
  | 'system_map_project_portfolio'
  | 'system_map_domain_app'
  | 'system_map_capability_gap'
  | 'system_map_page_maturity'
  | 'system_map_usage_path'
  | 'system_map_roadmap_item';

/** 草稿车道筛选 */
export type DraftLaneFilter = 'all' | DraftSourceType | 'page_operator_action' | 'page_roadmap';

/** 跨页送达的任务草稿 */
export interface IncomingTaskDraft {
  id: string;
  title: string;
  source_type: DraftSourceType;
  source_id?: string;
  target: CockpitNavigationTarget;
}
