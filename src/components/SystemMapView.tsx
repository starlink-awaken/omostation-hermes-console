import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  Compass,
  Copy,
  Eye,
  ExternalLink,
  Layers,
  Map as MapIcon,
  Network,
  RefreshCw,
  Route,
  Search,
  Server,
  ShieldAlert,
  X,
} from 'lucide-react';
import './Dashboard.css';
import SummaryTileGrid from './common/SummaryTileGrid';
import { type CockpitNavigationTarget } from './cockpitNavigation';
import {
  findTaskDraftForTarget,
  persistTaskCenterDraft,
  taskDraftToIncomingDraft,
  type TaskDraftRecord,
} from './taskDraftHandoff';

type CockpitPage = {
  id: string;
  title: string;
  group: string;
  purpose: string;
  dimensions: string[];
};

type SourceRef = {
  source_key: string;
  label: string;
  path: string;
  line?: number | null;
  exists: boolean;
  target: string;
};

type SourcePreviewLine = {
  number: number;
  text: string;
  highlight: boolean;
};

type SourcePreview = {
  path: string;
  workspace_relative_path: string;
  line?: number | null;
  target: string;
  total_lines: number;
  context_start: number;
  context_end: number;
  lines: SourcePreviewLine[];
  guard: string;
};

type ProjectAction = {
  id: string;
  label: string;
  kind: 'navigate' | 'copy_text' | 'copy_command' | string;
  value: string;
  enabled: boolean;
  risk: string;
  executes: boolean;
  guard: string;
  category?: string;
  project_id?: string;
  reason?: string;
  task?: {
    task_id?: string;
    status?: string;
    execution_audit?: Record<string, unknown>;
  };
};

type ProjectCoverageCheck = {
  id: string;
  title: string;
  status: string;
  detail: string;
  next_action: string;
};

type PortfolioDimension = {
  id: string;
  title: string;
  status: string;
  next_action: string;
};

type ProjectWorkflowEvent = {
  type: string;
  status: string;
  ts?: string | null;
  summary: string;
  paths?: string[];
};

type ProjectWorkflowRun = {
  run_id: string;
  workflow_id: string;
  objective: string;
  status: string;
  verify_status: string;
  verify_checks: number;
  latest_ts?: string | null;
  paths: string[];
  events: ProjectWorkflowEvent[];
};

type ProjectItem = {
  id: string;
  layer: string;
  stack: string;
  role: string;
  cockpit_page: string;
  coverage: string;
  path: string;
  source_location?: string;
  exists: boolean;
  operational: {
    status: string;
    surface_type?: string;
    declared_location?: string;
    resolved_location?: string | null;
    docs: {
      present: number;
      expected: number;
      items: { name: string; path: string; exists: boolean }[];
    };
    commands: string[];
    manifests: { name: string; path: string; exists: boolean }[];
    risks: string[];
    next_action: string;
  };
  runtime: {
    status: string;
    profile: string;
    needs_runtime: boolean;
    probe_reason: string;
    checked_at?: string;
    ports: {
      port: number;
      service: string;
      type: string;
      listening: boolean | null;
      probe_status?: string;
      probe_reason?: string;
      source_ref?: SourceRef;
    }[];
    listening_count: number;
    latest_verification: {
      status: string;
      run_id?: string | null;
      ts?: string | null;
      checks: number;
      command?: string | null;
      source?: string | null;
    };
  };
  workflow: {
    latest_run_id?: string | null;
    latest_status: string;
    latest_ts?: string | null;
    runs: ProjectWorkflowRun[];
    summary: {
      runs: number;
      verified: number;
      failed: number;
      active: number;
    };
  };
  source_refs: SourceRef[];
  actions: ProjectAction[];
  triage_commands: ProjectAction[];
  coverage_checks: ProjectCoverageCheck[];
  portfolio: {
    score: number;
    status: string;
    ready: number;
    warning: number;
    failed: number;
    primary_gap: string;
    next_action: string;
    non_ready_dimensions: PortfolioDimension[];
  };
  diagnostics: {
    id: string;
    severity: string;
    title: string;
    detail: string;
    next_action: string;
  }[];
};

type LayerItem = {
  id: string;
  name: string;
  project_count: number;
  projects: ProjectItem[];
  cockpit_pages: string[];
  source_refs: SourceRef[];
};

type ProjectFocusQueue = {
  id: string;
  title: string;
  severity: string;
  reason: string;
  count: number;
  project_ids: string[];
  top_projects: { id: string; diagnostics: ProjectItem['diagnostics'] }[];
};

type ProjectTriageQueue = {
  id: string;
  title: string;
  severity: string;
  reason: string;
  count: number;
  queued?: number;
  active?: number;
  succeeded?: number;
  failed?: number;
  project_ids: string[];
  commands: ProjectAction[];
};

type CoverageAttentionProject = {
  id: string;
  status: string;
  next_action: string;
};

type ProjectCapabilityCoverage = {
  dimensions: { id: string; title: string; description: string }[];
  dimension_summary: {
    id: string;
    title: string;
    description: string;
    status: string;
    ready: number;
    warning: number;
    failed: number;
    score: number;
    attention_projects: CoverageAttentionProject[];
  }[];
  weakest_dimensions: {
    id: string;
    title: string;
    description: string;
    status: string;
    ready: number;
    warning: number;
    failed: number;
    score: number;
    attention_projects: CoverageAttentionProject[];
  }[];
  matrix: {
    project_id: string;
    layer: string;
    cockpit_page: string;
    ready: number;
    warning: number;
    failed: number;
    checks: ProjectCoverageCheck[];
  }[];
  summary: {
    projects: number;
    dimensions: number;
    total_cells: number;
    ready_cells: number;
    warning_cells: number;
    failed_cells: number;
    score: number;
  };
};

type DomainAppSummary = {
  status: 'ready' | 'watch' | 'attention' | 'blocked' | 'unavailable' | string;
  strategy: string;
  summary: {
    total: number;
    ready: number;
    needs_attention: number;
    running: number;
    stopped: number;
    high_risk: number;
    external_mounts: number;
    security_passed: number;
    security_warn: number;
    security_failed: number;
    security_blocking: number;
    security_attention_apps: number;
    score: number;
    security_posture: string;
  };
  items: {
    id: string;
    name: string;
    domain?: { id: string; name: string } | null;
    kind: string;
    integration_mode: string;
    risk_level: string;
    health: string;
    runtime_status: string;
    launch_url?: string | null;
    api_url?: string | null;
    security_posture: string;
    security_attention: number;
    security_failed: number;
    read_capabilities: string[];
    write_capabilities: string[];
    action_count: number;
    next_action: string;
  }[];
  attention_items: {
    id: string;
    name: string;
    health: string;
    runtime_status: string;
    risk_level: string;
    security_posture: string;
    next_action: string;
  }[];
  next_action: string;
};

type ProjectPortfolioBucket = {
  id: string;
  title: string;
  severity: string;
  reason: string;
  count: number;
  project_ids: string[];
};

type ProjectPortfolioPriority = {
  id: string;
  layer: string;
  cockpit_page: string;
  score: number;
  status: string;
  primary_gap: string;
  next_action: string;
  failed: number;
  warning: number;
  runtime_status: string;
  verification_status: string;
  non_ready_dimensions: PortfolioDimension[];
  triage_commands: number;
};

type ProjectPortfolio = {
  summary: {
    score: number;
    status: string;
    projects: number;
    blocked: number;
    at_risk: number;
    watch: number;
    healthy: number;
    priority_projects: number;
    weakest_dimensions: number;
  };
  buckets: ProjectPortfolioBucket[];
  priority_projects: ProjectPortfolioPriority[];
  weakest_dimensions: ProjectCapabilityCoverage['weakest_dimensions'];
};

type FeatureDomain = {
  id: string;
  title: string;
  english: string;
  capability_items: string[];
  providers: string[];
  cockpit_page: string;
  coverage: string;
  source_refs: SourceRef[];
};

type SourcePath = {
  path: string;
  exists: boolean;
};

type UsagePath = {
  id: string;
  title: string;
  intent: string;
  steps: string[];
  pages: CockpitPage[];
  source_refs: SourceRef[];
};

type PlaybookStep = {
  id: string;
  page_id: string;
  action: string;
  evidence: string;
  done_when: string;
  page: CockpitPage;
};

type OperatingPlaybook = {
  id: string;
  title: string;
  goal: string;
  frequency: string;
  owner: string;
  risk: string;
  steps: PlaybookStep[];
  source_refs: SourceRef[];
};

type PageMaturity = {
  page: CockpitPage;
  score: number;
  status: 'ready' | 'watch' | 'gap';
  projects: ProjectItem[];
  domains: FeatureDomain[];
  usagePaths: UsagePath[];
  playbookSteps: PlaybookStep[];
  roadmapItems: RoadmapItem[];
  actions: number;
  operatorActions: string[];
  nextAction: string;
};

type PageMaturityGapSignal = {
  id: string;
  title: string;
  detail: string;
};

type PageMaturityContract = {
  items: {
    page: CockpitPage;
    page_id: string;
    score: number;
    status: 'ready' | 'watch' | 'gap';
    projects: string[];
    domains: string[];
    usage_paths: string[];
    playbook_steps: string[];
    roadmap_items: string[];
    actions: number;
    operator_actions?: string[];
    next_action: string;
  }[];
  attention_items: {
    page: CockpitPage;
    page_id: string;
    score: number;
    status: 'watch' | 'gap';
    next_action: string;
  }[];
  summary: {
    total: number;
    ready: number;
    watch: number;
    gap: number;
    score: number;
  };
};

type CapabilityGap = {
  id: string;
  severity: string;
  title: string;
  evidence: string;
  next: string;
};

type CapabilityGapScope = 'project' | 'page' | 'domain' | 'flow' | 'mixed';

type RoadmapItem = {
  id: string;
  priority: string;
  stage: string;
  status: string;
  title: string;
  domain: string;
  cockpit_page: string;
  problem: string;
  actions: string[];
  acceptance: string[];
  source_refs: SourceRef[];
};

type RoadmapLane = {
  id: string;
  title: string;
  items: RoadmapItem[];
};

type DraftTaskSource = {
  type: string;
  id: string;
  title: string;
  source_refs?: SourceRef[];
};

type DraftTaskEvidenceField = {
  label?: string;
  value?: string;
  step_id?: string;
  page_id?: string;
  evidence?: string;
  done_when?: string;
};

type DraftTask = {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  tags?: string[];
  read_only?: boolean;
  source?: DraftTaskSource;
  draft?: {
    kind: string;
    copy_text: string;
    step_count: number;
    guard: string;
    evidence_fields?: DraftTaskEvidenceField[];
  };
};

type CapabilityGapClosureRow = {
  gap: CapabilityGap;
  scope: CapabilityGapScope;
  page: PageMaturity | null;
  projects: ProjectItem[];
  domains: FeatureDomain[];
  usagePaths: UsagePath[];
  playbooks: OperatingPlaybook[];
  roadmapItems: RoadmapItem[];
  draft: DraftTask | null;
  nextAction: string;
  taskQuery: string;
};

type SystemMapWorkbenchRow = {
  id: string;
  title: string;
  laneLabel: string;
  summary: string;
  nextAction: string;
  evidence: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  primaryTarget: {
    tab: string;
    projectId?: string | null;
    usagePathId?: string | null;
    gapId?: string | null;
    coverageDimensionId?: string | null;
    pageId?: string | null;
    featureDomainId?: string | null;
    taskQuery?: string;
  };
  primaryLabel: string;
  secondaryTarget?: {
    tab: string;
    projectId?: string | null;
    usagePathId?: string | null;
    gapId?: string | null;
    coverageDimensionId?: string | null;
    pageId?: string | null;
    featureDomainId?: string | null;
    taskQuery?: string;
  } | null;
  secondaryLabel?: string;
};

type SystemMapPayload = {
  schema_version: string;
  generated_at: string;
  architecture: {
    model: string;
    ecos_version: string;
    dependency_direction: string;
  };
  source_paths: Record<string, SourcePath>;
  cockpit_pages: CockpitPage[];
  layers: LayerItem[];
  projects: ProjectItem[];
  project_focus: {
    queues: ProjectFocusQueue[];
    summary: {
      needs_action: number;
      operational_gap: number;
      runtime_gap: number;
      verification_gap: number;
      verification_ready?: number;
      ready_and_running: number;
    };
  };
  project_triage: {
    queues: ProjectTriageQueue[];
    summary: {
      total_commands: number;
      runtime_commands: number;
      verification_commands: number;
      coverage_commands: number;
      queued_commands?: number;
      active_commands?: number;
      succeeded_commands?: number;
      failed_commands?: number;
    };
  };
  project_capability_coverage: ProjectCapabilityCoverage;
  project_portfolio: ProjectPortfolio;
  domain_apps: DomainAppSummary;
  feature_domains: FeatureDomain[];
  roadmap: {
    items: RoadmapItem[];
    lanes: RoadmapLane[];
    summary: {
      total: number;
      shipped: number;
      planned: number;
      p0: number;
    };
  };
  usage_paths: UsagePath[];
  playbooks: OperatingPlaybook[];
  page_maturity?: PageMaturityContract;
  gaps: CapabilityGap[];
  summary: {
    projects: number;
    layers: number;
    feature_domains: number;
    cockpit_pages: number;
    native_project_surfaces: number;
    orientation_project_surfaces: number;
    ready_projects: number;
    partial_projects: number;
    missing_projects: number;
    running_projects: number;
    stopped_projects: number;
    unobserved_projects: number;
    not_applicable_projects: number;
    gaps: number;
    roadmap_items: number;
    playbooks: number;
    project_actions: number;
    projects_needing_action: number;
    project_triage_commands: number;
    project_coverage_score: number;
    project_portfolio_score: number;
    blocked_projects: number;
    at_risk_projects: number;
    domain_apps: number;
    domain_app_score: number;
    domain_app_security_attention: number;
    page_maturity_score?: number;
    page_maturity_ready?: number;
    page_maturity_watch?: number;
    page_maturity_gap?: number;
    source_refs: number;
  };
};

interface SystemMapViewProps {
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusProjectId?: string | null;
  focusUsagePathId?: string | null;
  focusGapId?: string | null;
  focusCoverageDimensionId?: string | null;
  focusPageId?: string | null;
  focusFeatureDomainId?: string | null;
}

const sourceLabels: Record<string, string> = {
  project_registry: '项目注册表',
  architecture: '架构契约',
  functional_capability_map: '功能能力地图',
  layer_index: '层级索引',
  port_registry: '端口注册表',
  bos_services: 'BOS 服务',
  project_agents: '项目指南',
  system_map_api: '系统地图配置',
};

const SYSTEM_MAP_DRAFT_TASKS_URL = '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80';

const DRAFT_SOURCE_LABELS: Record<string, string> = {
  system_map_project_portfolio: '项目',
  system_map_verification_ready: '验证',
  system_map_playbook: '清单',
  system_map_domain_app: '领域',
  system_map_capability_gap: '缺口',
  system_map_page_maturity: '页面',
};

const DRAFT_SOURCE_WEIGHT: Record<string, number> = {
  system_map_project_portfolio: 0,
  system_map_verification_ready: 1,
  system_map_playbook: 2,
  system_map_page_maturity: 3,
  system_map_domain_app: 4,
  system_map_capability_gap: 5,
};

const DRAFT_PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function statusClass(value: string): string {
  if (value === 'native' || value === 'exists' || value === 'low' || value === 'shipped' || value === 'ready' || value === 'running' || value === 'verified' || value === 'healthy' || value === 'passed' || value === 'not_applicable') return 'online';
  if (value === 'high' || value === 'missing' || value === 'blocked' || value === 'stopped' || value === 'failed' || value === 'unavailable') return 'offline';
  if (value === 'warning' || value === 'watch' || value === 'at_risk' || value === 'attention') return 'degraded';
  return 'degraded';
}

function portfolioStatusText(value: string): string {
  if (value === 'healthy') return '健康';
  if (value === 'watch') return '观察';
  if (value === 'at_risk') return '风险';
  if (value === 'blocked') return '阻塞';
  return value;
}

function projectStatusText(value: string): string {
  if (value === 'ready') return '就绪';
  if (value === 'partial') return '待补齐';
  if (value === 'missing') return '缺失';
  return value;
}

function runtimeStatusText(value: string): string {
  if (value === 'running') return '运行中';
  if (value === 'stopped') return '未监听';
  if (value === 'unobserved') return '未登记端口';
  if (value === 'not_applicable') return '无需常驻';
  return value;
}

function runtimeProfileText(value: string): string {
  if (value === 'service') return '常驻服务';
  if (value === 'static') return '静态前端';
  if (value === 'cli') return 'CLI 工具';
  if (value === 'library') return '库/框架';
  if (value === 'unknown') return '形态待判定';
  return value;
}

function verifyText(value: string): string {
  if (value === 'verified') return '验证通过';
  if (value === 'failed') return '验证失败';
  if (value === 'documented') return '可验证未留证';
  if (value === 'unknown') return '暂无验证';
  return value;
}

function triageCategoryForDimension(dimensionId: string): string {
  if (dimensionId === 'runtime_probe') return 'runtime';
  if (dimensionId === 'verification') return 'verification';
  if (dimensionId === 'commands' || dimensionId === 'project_docs' || dimensionId === 'manifest') return 'coverage';
  return dimensionId;
}

function triageRiskWeight(risk: string): number {
  if (risk === 'high') return 3;
  if (risk === 'medium') return 2;
  if (risk === 'low') return 1;
  return 0;
}

function draftSourceLabel(type?: string): string {
  if (!type) return '草稿';
  return DRAFT_SOURCE_LABELS[type] || '草稿';
}

function draftPriorityWeight(priority?: string): number {
  return DRAFT_PRIORITY_WEIGHT[priority || ''] || 0;
}

function draftSourceWeight(type?: string): number {
  if (!type) return 99;
  return DRAFT_SOURCE_WEIGHT[type] ?? 99;
}

function pageMaturityStatusText(value: PageMaturity['status']): string {
  if (value === 'ready') return '可日用';
  if (value === 'watch') return '观察';
  return '待补齐';
}

function pageMaturityGapSignals(item: PageMaturity): PageMaturityGapSignal[] {
  const signals: PageMaturityGapSignal[] = [];
  if (item.projects.length === 0) {
    signals.push({ id: 'projects', title: '项目映射缺失', detail: '页面还没挂上明确项目或服务对象。' });
  }
  if (item.domains.length === 0) {
    signals.push({ id: 'domains', title: '能力域缺失', detail: '页面承载了什么能力还没在功能域里说明。' });
  }
  if (item.usagePaths.length === 0) {
    signals.push({ id: 'usage', title: '使用路径缺失', detail: '页面还没进入任何高频操作路径。' });
  }
  if (item.playbookSteps.length === 0) {
    signals.push({ id: 'playbook', title: '清单步骤缺失', detail: '页面还没进入一条可执行操作清单。' });
  }
  if (item.roadmapItems.length === 0) {
    signals.push({ id: 'roadmap', title: '路线图缺失', detail: '页面的演进计划还没挂到路线图。' });
  }
  if (item.operatorActions.length === 0) {
    signals.push({ id: 'actions', title: '受控动作缺失', detail: '页面还缺少可推进问题的受控动作或排查操作。' });
  }
  return signals;
}

function normalizeSearchText(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[()\-_/.,:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferGapScope(gap: CapabilityGap): CapabilityGapScope {
  const text = normalizeSearchText([gap.id, gap.title, gap.evidence, gap.next].join(' '));
  if (text.includes('项目') || text.includes('project')) return 'project';
  if (text.includes('页面') || text.includes('page')) return 'page';
  if (text.includes('能力域') || text.includes('领域') || text.includes('domain') || text.includes('provider')) return 'domain';
  if (text.includes('路径') || text.includes('清单') || text.includes('playbook') || text.includes('route')) return 'flow';
  return 'mixed';
}

function includesGapTerm(haystack: string, value?: string): boolean {
  const normalizedValue = normalizeSearchText(value);
  if (!normalizedValue || normalizedValue.length < 2) return false;
  return haystack.includes(normalizedValue);
}

function uniqueById<T extends { id: string }>(items: Array<T | null | undefined>): T[] {
  const seen = new Set<string>();
  const rows: T[] = [];
  items.forEach((item) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    rows.push(item);
  });
  return rows;
}

function uniquePageMaturityItems(items: Array<PageMaturity | null | undefined>): PageMaturity[] {
  const seen = new Set<string>();
  const rows: PageMaturity[] = [];
  items.forEach((item) => {
    const pageId = item?.page.id;
    if (!item || !pageId || seen.has(pageId)) return;
    seen.add(pageId);
    rows.push(item);
  });
  return rows;
}

function compactPath(path: string): string {
  const marker = '/Workspace/';
  const markerIndex = path.indexOf(marker);
  return markerIndex >= 0 ? path.slice(markerIndex + marker.length) : path;
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function openSystemMapTarget(
  target: CockpitNavigationTarget,
  onNavigate: (tab: string) => void,
  onOpenTarget?: (target: CockpitNavigationTarget) => void,
) {
  if (onOpenTarget) {
    onOpenTarget(target);
    return;
  }
  onNavigate(target.tab);
}

function withTaskDraftHandoff(
  target: CockpitNavigationTarget,
  draftTasks: TaskDraftRecord[],
): CockpitNavigationTarget {
  const matchedDraft = findTaskDraftForTarget(target, draftTasks);
  const incomingDraft = matchedDraft ? taskDraftToIncomingDraft(matchedDraft) : null;
  const draftKey = target.draftKey || (incomingDraft ? persistTaskCenterDraft(incomingDraft) : null);
  return draftKey ? { ...target, draftKey } : target;
}

function sourceTarget(ref: SourceRef): string {
  return ref.target || `${ref.path}${ref.line ? `:${ref.line}` : ''}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

async function copySourceRef(ref: SourceRef) {
  await copyText(sourceTarget(ref));
}

function PageButton({ page, onNavigate }: { page: CockpitPage; onNavigate: (tab: string) => void }) {
  return (
    <button className="antd-btn" onClick={() => onNavigate(page.id)}>
      <ArrowRight size={14} />
      <span>{page.title}</span>
    </button>
  );
}

function SourceRefList({
  refs,
  compact = false,
  onInspect,
  activeTarget,
}: {
  refs?: SourceRef[];
  compact?: boolean;
  onInspect?: (ref: SourceRef) => void;
  activeTarget?: string;
}) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className={`system-map-source-ref-list ${compact ? 'compact' : ''}`}>
      {refs.slice(0, compact ? 2 : 3).map((ref) => {
        const target = sourceTarget(ref);
        return (
          <button
            key={`${ref.source_key}-${ref.target}`}
            className={`system-map-source-ref ${ref.exists ? 'online' : 'offline'} ${activeTarget === target ? 'active' : ''}`}
            onClick={() => {
              if (onInspect && ref.exists) {
                onInspect(ref);
                return;
              }
              void copySourceRef(ref);
            }}
            title={ref.exists ? `预览 ${target}` : `复制 ${target}`}
          >
            {ref.exists ? <ExternalLink size={12} /> : <Copy size={12} />}
            <span>{ref.label}</span>
            <small>
              {compact ? (sourceLabels[ref.source_key] || ref.source_key) : compactPath(ref.path)}
              {ref.line ? `:${ref.line}` : ''}
            </small>
          </button>
        );
      })}
    </div>
  );
}

function SourceInspector({
  activeRef,
  preview,
  loading,
  error,
}: {
  activeRef: SourceRef | null;
  preview: SourcePreview | null;
  loading: boolean;
  error: string;
}) {
  return (
    <section className="services-section system-map-section system-map-source-inspector">
      <div className="section-header">
        <div>
          <h2>来源证据</h2>
          <p className="text-muted">
            {activeRef ? `${activeRef.label} · ${compactPath(activeRef.path)}${activeRef.line ? `:${activeRef.line}` : ''}` : '暂无来源选择'}
          </p>
        </div>
        <button className="antd-btn" disabled={!activeRef} onClick={() => activeRef && void copySourceRef(activeRef)}>
          <Copy size={14} />
          <span>复制位置</span>
        </button>
      </div>

      {loading && (
        <div className="system-map-source-preview-empty">
          <RefreshCw size={14} />
          <span>读取来源...</span>
        </div>
      )}

      {!loading && error && (
        <div className="system-map-source-preview-empty offline">
          <ShieldAlert size={14} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && !preview && (
        <div className="system-map-source-preview-empty">
          <ExternalLink size={14} />
          <span>选择一个来源定位</span>
        </div>
      )}

      {!loading && !error && preview && (
        <div className="system-map-source-preview">
          <div className="system-map-source-preview-meta">
            <code>{preview.workspace_relative_path}</code>
            <span>
              {preview.context_start}-{preview.context_end} / {preview.total_lines}
            </span>
            <small>{preview.guard}</small>
          </div>
          <div className="system-map-source-code" role="region" aria-label="来源代码预览">
            {preview.lines.map((line) => (
              <div className={`system-map-source-code-line ${line.highlight ? 'highlight' : ''}`} key={line.number}>
                <span>{line.number}</span>
                <code>{line.text || ' '}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProjectActionList({
  actions,
  onNavigate,
  onQueueAction,
}: {
  actions?: ProjectAction[];
  onNavigate: (tab: string) => void;
  onQueueAction?: (action: ProjectAction) => void;
}) {
  if (!actions || actions.length === 0) return <span className="text-muted">待登记</span>;
  return (
    <div className="system-map-action-list">
      {actions.slice(0, 4).map((action) => (
        <div key={action.id} className="system-map-project-action-group">
          <button
            className={`system-map-project-action ${statusClass(action.risk)}`}
            disabled={!action.enabled}
            onClick={() => {
              if (action.kind === 'navigate') {
                onNavigate(action.value);
                return;
              }
              void copyText(action.value);
            }}
            title={action.guard}
          >
            {action.kind === 'navigate' ? <ArrowRight size={12} /> : <Copy size={12} />}
            <span>{action.label}</span>
          </button>
          {action.kind === 'copy_command' && onQueueAction && (
            <button
              className={`system-map-project-action queue ${statusClass(action.risk)}`}
              disabled={!action.enabled}
              aria-label={`承接项目动作 ${action.label}`}
              title="登记为 OMO 计划任务，不会直接执行命令"
              onClick={() => onQueueAction(action)}
            >
              <ClipboardCheck size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectTriageQueues({
  queues,
  onQueueCommand,
  onOpenTarget,
}: {
  queues: ProjectTriageQueue[];
  onQueueCommand?: (command: ProjectAction) => void;
  onOpenTarget?: (target: { tab: string; taskQuery?: string }) => void;
}) {
  const taskStatusLabel = (status?: string) => {
    switch (status) {
      case 'planned': return '已排队';
      case 'active': return '执行中';
      case 'succeeded': return '已通过';
      case 'failed': return '已失败';
      case 'completed': return '已完成';
      default: return '';
    }
  };
  return (
    <div className="system-map-triage-grid">
      {queues.map((queue) => (
        <article className={`system-map-triage-card ${statusClass(queue.severity)}`} key={queue.id}>
          <div className="system-map-triage-head">
            <div>
              <h3>{queue.title}</h3>
              <p>{queue.reason}</p>
            </div>
            <div className="system-map-triage-count">
              <strong>{queue.count}</strong>
              <small>{queue.queued || 0} 已承接 · {queue.failed || 0} 失败</small>
            </div>
          </div>
          <div className="system-map-triage-projects">
            {queue.project_ids.slice(0, 5).map((projectId) => (
              <span key={projectId}>{projectId}</span>
            ))}
          </div>
          <div className="system-map-triage-command-list">
            {queue.commands.length > 0 ? (
              queue.commands.slice(0, 4).map((command) => (
                <div className="system-map-triage-command-row" key={`${queue.id}-${command.project_id}-${command.id}`}>
                  <button
                    className={`system-map-triage-command ${statusClass(command.risk)}`}
                    disabled={!command.enabled}
                    onClick={() => void copyText(command.value)}
                    title={command.guard}
                  >
                    <Copy size={12} />
                    <span>
                      <strong>{command.project_id} · {command.label}</strong>
                      <small>{command.reason}</small>
                      {command.task?.status && command.task.status !== 'not_queued' && (
                        <small className="system-map-triage-task-status">任务：{taskStatusLabel(command.task.status)}</small>
                      )}
                      <code>{command.value}</code>
                    </span>
                  </button>
              {onQueueCommand && (
                (() => {
                  const existingTaskId = command.task?.task_id;
                  const hasTask = Boolean(command.task?.status && command.task.status !== 'not_queued');
                  const canOpenTask = hasTask && Boolean(existingTaskId) && Boolean(onOpenTarget);
                  return (
                  <button
                    className={`system-map-triage-queue ${statusClass(command.risk)}`}
                    disabled={!command.enabled || (hasTask && !canOpenTask)}
                    aria-label={hasTask ? `打开排查任务 ${command.project_id} ${command.label}` : `承接排查命令 ${command.project_id} ${command.label}`}
                    title={hasTask ? '打开已承接任务，继续审批、执行或查看证据' : '登记为 OMO 计划任务，不会直接执行命令'}
                    onClick={() => canOpenTask && onOpenTarget
                      ? onOpenTarget({ tab: 'TaskCenter', taskQuery: existingTaskId })
                      : onQueueCommand(command)}
                  >
                    {hasTask ? <Eye size={12} /> : <ClipboardCheck size={12} />}
                  </button>
                  );
                })()
              )}
                </div>
              ))
            ) : (
              <span className="text-muted">暂无需要排查的命令</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function ProjectDetailPanel({
  project,
  page,
  onClose,
  onNavigate,
  onOpenTarget,
  onFocusCoverage,
  onFocusUsagePath,
  onFocusPageMaturity,
  relatedUsagePaths,
  relatedPlaybooks,
  relatedDrafts,
  onInspect,
  onQueueAction,
  activeTarget,
}: {
  project: ProjectItem;
  page?: CockpitPage;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onFocusCoverage: (dimensionId: string) => void;
  onFocusUsagePath: (usagePathId: string) => void;
  onFocusPageMaturity: (pageId: string) => void;
  relatedUsagePaths: UsagePath[];
  relatedPlaybooks: OperatingPlaybook[];
  relatedDrafts: DraftTask[];
  onInspect: (ref: SourceRef) => void;
  onQueueAction: (action: ProjectAction) => void;
  activeTarget: string;
}) {
  const verification = project.runtime.latest_verification;
  const attentionChecks = project.coverage_checks.filter((check) => check.status !== 'ready');
  const latestWorkflowRun = project.workflow.runs[0];
  const primaryRepairCheck = attentionChecks[0] || project.coverage_checks[0];
  return (
    <section className="services-section system-map-section system-map-project-detail" aria-label={`${project.id} 项目详情`}>
      <div className="system-map-project-detail-head">
        <div>
          <span className="text-muted">项目详情</span>
          <h2>{project.id}</h2>
          <p>{project.role || project.stack}</p>
        </div>
        <div className="system-map-project-detail-actions">
          {page && <PageButton page={page} onNavigate={onNavigate} />}
          <button className="antd-btn" onClick={onClose}>
            <X size={14} />
            <span>关闭</span>
          </button>
        </div>
      </div>

      <div className="system-map-project-detail-meta">
        <span className={`status-badge ${statusClass(project.operational.status)}`}>{projectStatusText(project.operational.status)}</span>
        <span className={`status-badge ${statusClass(project.runtime.status)}`}>{runtimeStatusText(project.runtime.status)}</span>
        <span className={`status-badge ${statusClass(verification.status)}`}>{verifyText(verification.status)}</span>
        <span className={`status-badge ${statusClass(project.workflow.latest_status)}`}>workflow {project.workflow.latest_status}</span>
        <span className={`status-badge ${statusClass(project.coverage)}`}>{project.coverage === 'native' ? '原生入口' : '定位入口'}</span>
        <span className={`status-badge ${statusClass(project.portfolio.status)}`}>组合 {portfolioStatusText(project.portfolio.status)} · {project.portfolio.score}%</span>
      </div>

      <article className="system-map-project-detail-source">
        <h3>实现位置</h3>
        <div className="system-map-project-detail-facts">
          <span>形态：{project.operational.surface_type || 'native'}</span>
          <code>{project.operational.resolved_location || project.source_location || project.path}</code>
          {project.operational.declared_location && project.operational.declared_location !== project.operational.resolved_location && (
            <span className="system-map-risk-line">注册声明：{project.operational.declared_location}</span>
          )}
        </div>
      </article>

      <div className="system-map-project-detail-grid">
        <article className="system-map-project-detail-wide">
          <h3>工作流时间线</h3>
          {latestWorkflowRun ? (
            <>
              <div className="system-map-project-detail-facts">
                <span>run：{latestWorkflowRun.run_id}</span>
                <span>workflow：{latestWorkflowRun.workflow_id}</span>
                <span>目标：{latestWorkflowRun.objective || '未登记'}</span>
                <span>最近：{latestWorkflowRun.latest_ts ? shortDate(latestWorkflowRun.latest_ts) : '暂无'}</span>
              </div>
              <div className="system-map-workflow-timeline">
                {latestWorkflowRun.events.map((event, index) => (
                  <div className={`system-map-workflow-event ${statusClass(event.status)}`} key={`${event.type}-${event.ts || index}`}>
                    <strong>{event.type}</strong>
                    <span>{event.summary}</span>
                    <small>{event.ts ? shortDate(event.ts) : '暂无时间'}</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <span className="text-muted">暂无项目工作流事件</span>
          )}
        </article>

        <article>
          <h3>验证证据</h3>
          <div className="system-map-project-detail-facts">
            <span>状态：{verifyText(verification.status)}</span>
            <span>checks：{verification.checks}</span>
            <span>run：{verification.run_id || '暂无'}</span>
            <span>时间：{verification.ts ? shortDate(verification.ts) : '暂无'}</span>
          </div>
          {verification.source && (
            <div className="system-map-risk-line">
              证据来源：{verification.source}
              {verification.command ? ` · ${verification.command}` : ''}
            </div>
          )}
        </article>

        <article>
          <h3>运行探针</h3>
          <div className="system-map-project-detail-facts">
            <span>状态：{runtimeStatusText(project.runtime.status)}</span>
            <span>形态：{runtimeProfileText(project.runtime.profile)}</span>
            <span>监听：{project.runtime.listening_count} / {project.runtime.ports.length}</span>
            <span>探测：{project.runtime.checked_at ? shortDate(project.runtime.checked_at) : '暂无'}</span>
          </div>
          <div className="system-map-risk-line">{project.runtime.probe_reason}</div>
          {project.runtime.ports.length > 0 && (
            <div className="system-map-port-list">
              {project.runtime.ports.slice(0, 6).map((port) => (
                <span
                  key={port.port}
                  className={port.listening ? 'online' : ['not_probeable', 'deprecated'].includes(port.probe_status || '') ? 'degraded' : 'offline'}
                  title={port.probe_reason || port.service}
                >
                  :{port.port} {port.service} · {port.probe_status === 'deprecated' ? '已弃用' : port.probe_status === 'not_probeable' ? '不可探测' : port.listening ? '监听' : '未监听'}
                </span>
              ))}
            </div>
          )}
        </article>

        <article>
          <h3>覆盖缺口</h3>
          <div className="system-map-project-detail-checks">
            {(attentionChecks.length > 0 ? attentionChecks : project.coverage_checks.slice(0, 4)).map((check) => (
              <div className={`system-map-diagnostic ${statusClass(check.status)}`} key={check.id}>
                <strong>{check.title}</strong>
                <small>{check.detail}</small>
                <small>下一步：{check.next_action}</small>
              </div>
            ))}
          </div>
        </article>

        <article>
          <h3>排查命令</h3>
          <div className="system-map-triage-command-list">
            {project.triage_commands.length > 0 ? (
              project.triage_commands.slice(0, 6).map((command) => (
                <button
                  className={`system-map-triage-command ${statusClass(command.risk)}`}
                  disabled={!command.enabled}
                  key={`${project.id}-${command.id}`}
                  onClick={() => void copyText(command.value)}
                  title={command.guard}
                >
                  <Copy size={12} />
                  <span>
                    <strong>{command.label}</strong>
                    <small>{command.reason}</small>
                    <code>{command.value}</code>
                  </span>
                </button>
              ))
            ) : (
              <span className="text-muted">暂无需要排查的命令</span>
            )}
          </div>
        </article>

        <article>
          <h3>受控动作</h3>
          <ProjectActionList
            actions={project.actions}
            onNavigate={onNavigate}
            onQueueAction={onQueueAction}
          />
        </article>

        <article>
          <h3>修复入口</h3>
          <div className="system-map-page-focus-actions-grid">
            <button
              className="system-map-page-focus-action"
              onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: project.id }, relatedDrafts), onNavigate, onOpenTarget)}
            >
              <span>查看项目草稿</span>
              <small>{project.id}</small>
            </button>
            {primaryRepairCheck && (
              <button
                className="system-map-page-focus-action"
                onClick={() => onFocusCoverage(primaryRepairCheck.id)}
              >
                <span>查看覆盖维度</span>
                <small>{primaryRepairCheck.title}</small>
              </button>
            )}
            {page && (
              <button
                className="system-map-page-focus-action"
                onClick={() => onFocusPageMaturity(page.id)}
              >
                <span>查看页面能力</span>
                <small>{page.title}</small>
              </button>
            )}
            {relatedUsagePaths.slice(0, 1).map((path) => (
              <button
                className="system-map-page-focus-action"
                key={`project-path-${path.id}`}
                onClick={() => onFocusUsagePath(path.id)}
              >
                <span>查看使用路径</span>
                <small>{path.title}</small>
              </button>
            ))}
            {relatedPlaybooks.slice(0, 1).map((playbook) => (
              <button
                className="system-map-page-focus-action"
                key={`project-playbook-${playbook.id}`}
                onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: playbook.id }, relatedDrafts), onNavigate, onOpenTarget)}
              >
                <span>查看操作清单</span>
                <small>{playbook.title}</small>
              </button>
            ))}
            {relatedDrafts.slice(0, 1).map((draft) => (
              <button
                className="system-map-page-focus-action"
                key={`project-draft-${draft.id}`}
                onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: project.id }, relatedDrafts), onNavigate, onOpenTarget)}
              >
                <span>查看补证草稿</span>
                <small>{draft.title}</small>
              </button>
            ))}
          </div>
        </article>

        <article>
          <h3>来源证据</h3>
          <SourceRefList refs={project.source_refs} onInspect={onInspect} activeTarget={activeTarget} />
        </article>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" aria-hidden="true"></div>
      <p>正在生成 Cockpit 系统地图...</p>
    </div>
  );
}

export default function SystemMapView({
  onNavigate,
  onOpenTarget,
  focusProjectId,
  focusUsagePathId,
  focusGapId,
  focusCoverageDimensionId,
  focusPageId,
  focusFeatureDomainId,
}: SystemMapViewProps) {
  const [systemMap, setSystemMap] = useState<SystemMapPayload | null>(null);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSourceRef, setActiveSourceRef] = useState<SourceRef | null>(null);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [portfolioFilter, setPortfolioFilter] = useState('all');
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUsagePathId, setSelectedUsagePathId] = useState<string | null>(null);
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null);
  const [selectedPageMaturityId, setSelectedPageMaturityId] = useState<string | null>(null);
  const [selectedFeatureDomainId, setSelectedFeatureDomainId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [bulkTriagePending, setBulkTriagePending] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [systemMapResult, draftTaskResult] = await Promise.allSettled([
        fetch('/api/cockpit/system-map'),
        fetch(SYSTEM_MAP_DRAFT_TASKS_URL),
      ]);

      if (systemMapResult.status !== 'fulfilled' || !systemMapResult.value.ok) {
        throw new Error('系统地图读取失败');
      }

      setSystemMap(await systemMapResult.value.json());

      if (draftTaskResult.status === 'fulfilled' && draftTaskResult.value.ok) {
        const payload = await draftTaskResult.value.json();
        setDraftTasks(payload.items || []);
      } else {
        setDraftTasks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '系统地图读取失败');
      setDraftTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const inspectSourceRef = async (ref: SourceRef) => {
    const target = sourceTarget(ref);
    setActiveSourceRef(ref);
    setSourceLoading(true);
    setSourceError('');
    setSourcePreview(null);
    try {
      const res = await fetch(`/api/cockpit/source-ref?target=${encodeURIComponent(target)}&context=4`);
      if (!res.ok) throw new Error('来源预览读取失败');
      setSourcePreview(await res.json());
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : '来源预览读取失败');
    } finally {
      setSourceLoading(false);
    }
  };

  const queueProjectAction = async (projectId: string, action: ProjectAction) => {
    setActionNotice('');
    setActionError('');
    try {
      const response = await fetch(
        `/api/cockpit/projects/${encodeURIComponent(projectId)}/actions/${encodeURIComponent(action.id)}/queue`,
        { method: 'POST' },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '项目动作承接失败');
      setActionNotice(`已登记为计划任务：${payload.title || action.label}`);
      if (onOpenTarget) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: payload.id });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '项目动作承接失败');
    }
  };

  const queueProjectTriageCommand = async (command: ProjectAction) => {
    const projectId = command.project_id;
    if (!projectId) return;
    setActionNotice('');
    setActionError('');
    try {
      const response = await fetch(
        `/api/cockpit/projects/${encodeURIComponent(projectId)}/triage/${encodeURIComponent(command.id)}/queue`,
        { method: 'POST' },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '排查命令承接失败');
      setActionNotice(`已登记为计划任务：${payload.title || command.label}`);
      if (onOpenTarget) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: payload.id });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '排查命令承接失败');
    }
  };

  const queueVerificationTriage = async () => {
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/triage/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'verification', command_id: 'verification-rerun' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '验证缺口承接失败');
      const summary = payload.summary || {};
      setActionNotice(`已批量承接验证缺口：${summary.queued || 0} 条，跳过 ${summary.skipped || 0} 条，失败 ${summary.errors || 0} 条。`);
      if (onOpenTarget && (summary.queued || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '验证缺口承接失败');
    } finally {
      setBulkTriagePending(false);
    }
  };

  const queueRuntimeTriage = async () => {
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/triage/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'runtime' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '运行探针承接失败');
      const summary = payload.summary || {};
      setActionNotice(`已批量承接运行探针：${summary.queued || 0} 条，跳过 ${summary.skipped || 0} 条，失败 ${summary.errors || 0} 条。`);
      if (onOpenTarget && (summary.queued || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '运行探针承接失败');
    } finally {
      setBulkTriagePending(false);
    }
  };

  const queueCoverageDrafts = async () => {
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/coverage/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'all', limit: 40 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '全站缺口承接失败');
      const summary = payload.summary || {};
      setActionNotice(`已批量承接全站缺口：${summary.queued || 0} 条，跳过 ${summary.skipped || 0} 条，失败 ${summary.errors || 0} 条。`);
      if (onOpenTarget && (summary.queued || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '全站缺口承接失败');
    } finally {
      setBulkTriagePending(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (focusProjectId) {
      setSelectedProjectId(focusProjectId);
    }
  }, [focusProjectId]);

  useEffect(() => {
    if (focusUsagePathId) {
      setSelectedUsagePathId(focusUsagePathId);
    }
  }, [focusUsagePathId]);

  useEffect(() => {
    if (focusGapId) {
      setSelectedGapId(focusGapId);
    }
  }, [focusGapId]);

  useEffect(() => {
    if (focusCoverageDimensionId) {
      setCoverageFilter(focusCoverageDimensionId);
    }
  }, [focusCoverageDimensionId]);

  useEffect(() => {
    if (focusPageId) {
      setSelectedPageMaturityId(focusPageId);
    }
  }, [focusPageId]);

  useEffect(() => {
    if (focusFeatureDomainId) {
      setSelectedFeatureDomainId(focusFeatureDomainId);
    }
  }, [focusFeatureDomainId]);

  const pagesById = useMemo(() => {
    const index = new Map<string, CockpitPage>();
    systemMap?.cockpit_pages?.forEach((page) => index.set(page.id, page));
    return index;
  }, [systemMap]);

  const projectsById = useMemo(() => {
    const index = new Map<string, ProjectItem>();
    systemMap?.projects?.forEach((project) => index.set(project.id, project));
    return index;
  }, [systemMap]);

  const pageGroups = useMemo(() => {
    const groups = new Map<string, CockpitPage[]>();
    systemMap?.cockpit_pages?.forEach((page) => {
      const existing = groups.get(page.group) || [];
      existing.push(page);
      groups.set(page.group, existing);
    });
    return Array.from(groups.entries());
  }, [systemMap]);

  const activeSourceTarget = activeSourceRef ? sourceTarget(activeSourceRef) : '';

  const projectFocusOptions = useMemo(() => {
    const queues = systemMap?.project_focus?.queues || [];
    return [
      {
        id: 'all',
        title: '全部项目',
        severity: 'low',
        reason: '查看所有已登记项目。',
        count: systemMap?.projects.length || 0,
        project_ids: systemMap?.projects.map((project) => project.id) || [],
        top_projects: [],
      },
      ...queues,
    ];
  }, [systemMap]);

  const coverageFilterOptions = useMemo(() => {
    const dimensions = systemMap?.project_capability_coverage?.dimension_summary || [];
    return [
      {
        id: 'all',
        title: '全部维度',
        description: '不按覆盖维度过滤项目。',
        status: 'ready',
        score: systemMap?.project_capability_coverage?.summary.score || 0,
        ready: systemMap?.project_capability_coverage?.summary.ready_cells || 0,
        warning: systemMap?.project_capability_coverage?.summary.warning_cells || 0,
        failed: systemMap?.project_capability_coverage?.summary.failed_cells || 0,
        attention_projects: [],
      },
      ...dimensions,
    ];
  }, [systemMap]);

  const activeCoverage = coverageFilterOptions.find((item) => item.id === coverageFilter);
  const activePortfolioBucket = useMemo(
    () => systemMap?.project_portfolio.buckets.find((bucket) => bucket.id === portfolioFilter) || null,
    [portfolioFilter, systemMap],
  );

  const projectEntryRows = useMemo(() => {
    if (!systemMap) return [];
    return systemMap.project_portfolio.priority_projects
      .map((priority) => {
        const project = projectsById.get(priority.id);
        if (!project) return null;
        const pageId = project.cockpit_page || priority.cockpit_page;
        const page = pageId ? pagesById.get(pageId) || null : null;
        const primaryDimension = project.portfolio.non_ready_dimensions[0] || priority.non_ready_dimensions[0] || null;
        const draftTarget = { tab: 'TaskCenter', taskQuery: project.id } as CockpitNavigationTarget;
        const draft = findTaskDraftForTarget(draftTarget, draftTasks);
        return {
          priority,
          project,
          page,
          primaryDimension,
          draft,
          draftTarget: withTaskDraftHandoff(draftTarget, draftTasks),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [draftTasks, pagesById, projectsById, systemMap]);

  const projectEntrySummary = useMemo(() => ({
    mapped: projectEntryRows.filter((row) => row.page).length,
    drafts: projectEntryRows.filter((row) => row.draft).length,
    blocked: projectEntryRows.filter((row) => row.priority.status === 'blocked').length,
  }), [projectEntryRows]);

  const activeRepairDimension = useMemo(() => {
    const dimensions = systemMap?.project_capability_coverage?.dimension_summary || [];
    if (coverageFilter !== 'all') {
      return dimensions.find((dimension) => dimension.id === coverageFilter) || null;
    }
    return (
      systemMap?.project_capability_coverage?.weakest_dimensions?.[0]
      || dimensions.find((dimension) => dimension.status !== 'ready')
      || null
    );
  }, [coverageFilter, systemMap]);

  const dimensionRepairRows = useMemo(() => {
    if (!systemMap || !activeRepairDimension) return [];
    const category = triageCategoryForDimension(activeRepairDimension.id);
    return activeRepairDimension.attention_projects
      .map((attention) => {
        const project = systemMap.projects.find((item) => item.id === attention.id);
        if (!project) return null;
        const check = project.coverage_checks.find((item) => item.id === activeRepairDimension.id);
        const exactCommands = project.triage_commands.filter((command) =>
          command.category === category
          || command.id.includes(activeRepairDimension.id)
          || command.reason?.includes(activeRepairDimension.title),
        );
        return {
          attention,
          project,
          check,
          commands: exactCommands.length > 0 ? exactCommands : project.triage_commands.slice(0, 2),
        };
      })
      .filter((item): item is {
        attention: CoverageAttentionProject;
        project: ProjectItem;
        check?: ProjectCoverageCheck;
        commands: ProjectAction[];
      } => Boolean(item));
  }, [activeRepairDimension, systemMap]);

  const filteredProjects = useMemo(() => {
    const projects = systemMap?.projects || [];
    const queue = projectFocusOptions.find((item) => item.id === projectFilter);
    const allowed = projectFilter === 'all' || !queue ? null : new Set(queue.project_ids);
    const portfolioAllowed = activePortfolioBucket ? new Set(activePortfolioBucket.project_ids) : null;
    const query = projectQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (allowed && !allowed.has(project.id)) return false;
      if (portfolioAllowed && !portfolioAllowed.has(project.id)) return false;
      if (coverageFilter !== 'all') {
        const check = project.coverage_checks.find((item) => item.id === coverageFilter);
        if (!check || check.status === 'ready') return false;
      }
      if (!query) return true;
      return [
        project.id,
        project.layer,
        project.stack,
        project.role,
        project.operational.next_action,
        ...project.operational.risks,
        ...project.coverage_checks.map((check) => `${check.title} ${check.status} ${check.next_action}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [activePortfolioBucket, coverageFilter, projectFilter, projectFocusOptions, projectQuery, systemMap]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map((project) => project.id)), [filteredProjects]);

  const filteredTriageQueues = useMemo(() => {
    const queues = systemMap?.project_triage?.queues || [];
    return queues.map((queue) => {
      const commands = queue.commands.filter((command) => command.project_id && filteredProjectIds.has(command.project_id));
      return {
        ...queue,
        count: commands.length,
        project_ids: Array.from(new Set(commands.map((command) => command.project_id || '').filter(Boolean))),
        commands,
      };
    });
  }, [filteredProjectIds, systemMap]);

  const filteredTriageCommandCount = filteredTriageQueues.reduce((total, queue) => total + queue.count, 0);

  const selectedProject = useMemo(
    () => systemMap?.projects.find((project) => project.id === selectedProjectId) || null,
    [selectedProjectId, systemMap],
  );

  const activeUsagePath = useMemo(() => {
    const paths = systemMap?.usage_paths || [];
    return paths.find((path) => path.id === selectedUsagePathId) || paths[0] || null;
  }, [selectedUsagePathId, systemMap]);

  const activeUsagePageIds = useMemo(
    () => new Set(activeUsagePath?.pages.map((page) => page.id) || []),
    [activeUsagePath],
  );

  const activeUsagePlaybooks = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => activeUsagePageIds.has(step.page_id)),
    );
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsageDomains = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.feature_domains.filter((domain) => activeUsagePageIds.has(domain.cockpit_page));
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsageRoadmap = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.roadmap.items.filter((item) => activeUsagePageIds.has(item.cockpit_page));
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsageProjects = useMemo(() => {
    if (!systemMap || !activeUsagePath) return [];
    return systemMap.projects
      .filter((project) => activeUsagePageIds.has(project.cockpit_page))
      .sort((left, right) => {
        const statusDelta = left.portfolio.score - right.portfolio.score;
        if (statusDelta !== 0) return statusDelta;
        return right.triage_commands.length - left.triage_commands.length;
      });
  }, [activeUsagePageIds, activeUsagePath, systemMap]);

  const activeUsagePlaybookIds = useMemo(
    () => new Set(activeUsagePlaybooks.map((playbook) => playbook.id)),
    [activeUsagePlaybooks],
  );

  const activeUsageTouchesDomainApps = activeUsagePageIds.has('DomainApps') || activeUsagePageIds.has('QuestBoard');

  const activeUsageTriageCommands = useMemo(() => {
    const unique = new Map<string, ProjectAction>();
    activeUsageProjects.forEach((project) => {
      project.triage_commands.forEach((command) => {
        unique.set(`${project.id}:${command.id}:${command.value}`, command);
      });
    });
    return Array.from(unique.values()).sort((left, right) => {
      const riskDelta = triageRiskWeight(right.risk) - triageRiskWeight(left.risk);
      if (riskDelta !== 0) return riskDelta;
      return (left.project_id || '').localeCompare(right.project_id || '');
    });
  }, [activeUsageProjects]);

  const activeUsageDrafts = useMemo(() => {
    if (!activeUsagePath) return [];
    return draftTasks
      .filter((task) => {
        if (!task.read_only || !task.source?.type) return false;
        if (task.source.type === 'system_map_playbook') {
          return activeUsagePlaybookIds.has(task.source.id);
        }
        if (task.source.type === 'system_map_page_maturity') {
          return activeUsagePageIds.has(task.source.id);
        }
        if (task.source.type === 'system_map_project_portfolio') {
          const project = projectsById.get(task.source.id);
          return Boolean(project && activeUsagePageIds.has(project.cockpit_page));
        }
        if (task.source.type === 'system_map_verification_ready') {
          const project = projectsById.get(task.source.id);
          return Boolean(project && activeUsagePageIds.has(project.cockpit_page));
        }
        if (task.source.type === 'system_map_domain_app') {
          return activeUsageTouchesDomainApps;
        }
        return false;
      })
      .sort((left, right) => {
        const sourceDelta = draftSourceWeight(left.source?.type) - draftSourceWeight(right.source?.type);
        if (sourceDelta !== 0) return sourceDelta;
        const priorityDelta = draftPriorityWeight(right.priority) - draftPriorityWeight(left.priority);
        if (priorityDelta !== 0) return priorityDelta;
        return (left.title || '').localeCompare(right.title || '');
      });
  }, [activeUsagePageIds, activeUsagePath, activeUsagePlaybookIds, activeUsageTouchesDomainApps, draftTasks, projectsById]);

  const selectedGap = useMemo(
    () => systemMap?.gaps.find((gap) => gap.id === selectedGapId) || null,
    [selectedGapId, systemMap],
  );

  const pageMaturity = useMemo<PageMaturity[]>(() => {
    if (!systemMap) return [];
    if (systemMap.page_maturity?.items?.length) {
      const projectsById = new Map(systemMap.projects.map((project) => [project.id, project]));
      const domainsById = new Map(systemMap.feature_domains.map((domain) => [domain.id, domain]));
      const usagePathsById = new Map(systemMap.usage_paths.map((path) => [path.id, path]));
      const roadmapById = new Map(systemMap.roadmap.items.map((item) => [item.id, item]));
      const playbookStepsById = new Map(
        systemMap.playbooks.flatMap((playbook) => playbook.steps.map((step) => [step.id, step] as const)),
      );
      return systemMap.page_maturity.items.map((item) => ({
        page: item.page,
        score: item.score,
        status: item.status,
        projects: item.projects.map((id) => projectsById.get(id)).filter((project): project is ProjectItem => Boolean(project)),
        domains: item.domains.map((id) => domainsById.get(id)).filter((domain): domain is FeatureDomain => Boolean(domain)),
        usagePaths: item.usage_paths.map((id) => usagePathsById.get(id)).filter((path): path is UsagePath => Boolean(path)),
        playbookSteps: item.playbook_steps.map((id) => playbookStepsById.get(id)).filter((step): step is PlaybookStep => Boolean(step)),
        roadmapItems: item.roadmap_items.map((id) => roadmapById.get(id)).filter((roadmapItem): roadmapItem is RoadmapItem => Boolean(roadmapItem)),
        actions: item.actions,
        operatorActions: item.operator_actions || [],
        nextAction: item.next_action,
      }));
    }
    return systemMap.cockpit_pages.map((page) => {
      const projects = systemMap.projects.filter((project) => project.cockpit_page === page.id);
      const domains = systemMap.feature_domains.filter((domain) => domain.cockpit_page === page.id);
      const usagePaths = systemMap.usage_paths.filter((path) =>
        path.pages.some((usagePage) => usagePage.id === page.id),
      );
      const playbookSteps = systemMap.playbooks.flatMap((playbook) =>
        playbook.steps.filter((step) => step.page_id === page.id || step.page.id === page.id),
      );
      const roadmapItems = systemMap.roadmap.items.filter((item) => item.cockpit_page === page.id);
      const actions = projects.reduce(
        (total, project) => total + project.actions.length + project.triage_commands.length,
        0,
      );
      const score =
        (projects.length > 0 ? 25 : 0) +
        (domains.length > 0 ? 20 : 0) +
        (usagePaths.length > 0 ? 20 : 0) +
        (playbookSteps.length > 0 ? 15 : 0) +
        (roadmapItems.length > 0 ? 10 : 0) +
        (actions > 0 ? 10 : 0);
      const status: PageMaturity['status'] = score >= 70 ? 'ready' : score >= 40 ? 'watch' : 'gap';
      let nextAction = '保持页面、项目、清单和路线图证据新鲜。';
      if (usagePaths.length === 0) nextAction = '把页面接入至少一条使用路径。';
      else if (playbookSteps.length === 0) nextAction = '补一条操作清单步骤，让页面进入日常流程。';
      else if (domains.length === 0) nextAction = '补功能域映射，说明页面承载的能力。';
      else if (projects.length === 0) nextAction = '补项目或服务映射，避免页面只有入口没有对象。';
      else if (actions === 0) nextAction = '补受控动作或排查命令，让页面能推进问题。';

      return {
        page,
        score,
        status,
        projects,
        domains,
        usagePaths,
        playbookSteps,
        roadmapItems,
        actions,
        operatorActions: [],
        nextAction,
      };
    });
  }, [systemMap]);

  const pageMaturitySummary = useMemo(() => ({
    ready: pageMaturity.filter((item) => item.status === 'ready').length,
    watch: pageMaturity.filter((item) => item.status === 'watch').length,
    gap: pageMaturity.filter((item) => item.status === 'gap').length,
  }), [pageMaturity]);

  useEffect(() => {
    const domains = systemMap?.feature_domains || [];
    if (!domains.length) return;
    if (selectedFeatureDomainId && domains.some((domain) => domain.id === selectedFeatureDomainId)) return;
    const usagePreferred = activeUsageDomains[0];
    const fallback = usagePreferred || domains[0];
    setSelectedFeatureDomainId(fallback?.id || null);
  }, [activeUsageDomains, selectedFeatureDomainId, systemMap]);

  useEffect(() => {
    if (!pageMaturity.length) return;
    if (selectedPageMaturityId && pageMaturity.some((item) => item.page.id === selectedPageMaturityId)) return;
    const preferred = pageMaturity.find((item) => item.status !== 'ready') || pageMaturity[0];
    setSelectedPageMaturityId(preferred?.page.id || null);
  }, [pageMaturity, selectedPageMaturityId]);

  const selectedPageMaturity = useMemo(
    () => pageMaturity.find((item) => item.page.id === selectedPageMaturityId) || null,
    [pageMaturity, selectedPageMaturityId],
  );

  const selectedPageGapSignals = useMemo(
    () => (selectedPageMaturity ? pageMaturityGapSignals(selectedPageMaturity) : []),
    [selectedPageMaturity],
  );

  const selectedPagePlaybooks = useMemo(() => {
    if (!systemMap || !selectedPageMaturity) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => step.page_id === selectedPageMaturity.page.id),
    );
  }, [selectedPageMaturity, systemMap]);

  const selectedPageDrafts = useMemo(() => {
    if (!selectedPageMaturity) return [];
    return draftTasks.filter((task) =>
      task.read_only
      && task.source?.type === 'system_map_page_maturity'
      && task.source.id === selectedPageMaturity.page.id,
    );
  }, [draftTasks, selectedPageMaturity]);

  const selectedFeatureDomain = useMemo(
    () => systemMap?.feature_domains.find((domain) => domain.id === selectedFeatureDomainId) || null,
    [selectedFeatureDomainId, systemMap],
  );

  const selectedFeaturePage = useMemo(
    () => (selectedFeatureDomain ? pagesById.get(selectedFeatureDomain.cockpit_page) || null : null),
    [pagesById, selectedFeatureDomain],
  );

  const selectedFeatureProjects = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.projects.filter((project) => project.cockpit_page === selectedFeatureDomain.cockpit_page);
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeatureUsagePaths = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.usage_paths.filter((path) =>
      path.pages.some((page) => page.id === selectedFeatureDomain.cockpit_page),
    );
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeaturePlaybooks = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => step.page_id === selectedFeatureDomain.cockpit_page),
    );
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeatureRoadmapItems = useMemo(() => {
    if (!systemMap || !selectedFeatureDomain) return [];
    return systemMap.roadmap.items.filter((item) => item.cockpit_page === selectedFeatureDomain.cockpit_page);
  }, [selectedFeatureDomain, systemMap]);

  const selectedFeaturePageMaturity = useMemo(
    () => pageMaturity.find((item) => item.page.id === selectedFeatureDomain?.cockpit_page) || null,
    [pageMaturity, selectedFeatureDomain],
  );

  const selectedFeatureDrafts = useMemo(() => {
    if (!selectedFeatureDomain) return [];
    return draftTasks.filter((task) =>
      task.read_only
      && task.source?.type === 'system_map_page_maturity'
      && task.source.id === selectedFeatureDomain.cockpit_page,
    );
  }, [draftTasks, selectedFeatureDomain]);

  const selectedFeatureSignals = useMemo(() => {
    if (!selectedFeatureDomain) return [];
    const signals = selectedFeaturePageMaturity
      ? pageMaturityGapSignals(selectedFeaturePageMaturity).filter((signal) => signal.id !== 'domains')
      : [];
    if (selectedFeatureDomain.providers.length === 0) {
      signals.unshift({
        id: 'providers',
        title: '提供方未登记',
        detail: '能力域已经存在，但还没标明由哪些页面或模块提供。',
      });
    }
    if (signals.length === 0) {
      signals.push({
        id: 'steady',
        title: '当前没有显性缺口',
        detail: selectedFeaturePageMaturity?.nextAction || '保持能力域、页面和使用路径之间的映射新鲜。',
      });
    }
    return signals.slice(0, 4);
  }, [selectedFeatureDomain, selectedFeaturePageMaturity]);

  const gapClosureRows = useMemo<CapabilityGapClosureRow[]>(() => {
    if (!systemMap) return [];

    const attentionProjects = uniqueById(
      systemMap.project_portfolio.priority_projects
        .map((item) => projectsById.get(item.id) || null)
        .filter((project): project is ProjectItem => Boolean(project)),
    );
    const nonReadyPages = pageMaturity.filter((item) => item.status !== 'ready');
    const domainAttentionPages = new Set(nonReadyPages.map((item) => item.page.id));

    return systemMap.gaps.map((gap) => {
      const gapText = normalizeSearchText([gap.id, gap.title, gap.evidence, gap.next].join(' '));
      const scope = inferGapScope(gap);

      const matchedProjects = systemMap.projects.filter((project) =>
        [
          project.id,
          project.role,
          project.stack,
          project.portfolio.primary_gap,
          project.portfolio.next_action,
          ...project.diagnostics.map((item) => item.title),
          ...project.diagnostics.map((item) => item.detail),
        ].some((value) => includesGapTerm(gapText, value)),
      );

      const matchedPages = pageMaturity.filter((item) =>
        [
          item.page.id,
          item.page.title,
          item.page.group,
          item.page.purpose,
          ...item.page.dimensions,
        ].some((value) => includesGapTerm(gapText, value)),
      );

      const matchedDomains = systemMap.feature_domains.filter((domain) =>
        [
          domain.id,
          domain.title,
          domain.english,
          ...domain.providers,
          ...domain.capability_items,
        ].some((value) => includesGapTerm(gapText, value)),
      );

      let projects = uniqueById(matchedProjects);
      let pages = uniquePageMaturityItems(matchedPages);
      let domains = uniqueById(matchedDomains);

      if (scope === 'project' && projects.length === 0) {
        projects = attentionProjects.length > 0
          ? attentionProjects
          : systemMap.projects.filter((project) => project.portfolio.status !== 'healthy');
      }
      if (scope === 'page' && pages.length === 0) {
        pages = nonReadyPages;
      }
      if (scope === 'domain' && domains.length === 0) {
        domains = systemMap.feature_domains.filter((domain) => domainAttentionPages.has(domain.cockpit_page));
      }
      if (scope === 'flow' && pages.length === 0) {
        pages = pageMaturity.filter((item) => item.usagePaths.length === 0 || item.playbookSteps.length === 0);
      }

      if (pages.length === 0 && projects.length > 0) {
        pages = uniquePageMaturityItems(
          projects
            .map((project) => pageMaturity.find((item) => item.page.id === project.cockpit_page) || null),
        );
      }
      if (pages.length === 0 && domains.length > 0) {
        pages = uniquePageMaturityItems(
          domains
            .map((domain) => pageMaturity.find((item) => item.page.id === domain.cockpit_page) || null),
        );
      }
      if (domains.length === 0 && pages.length > 0) {
        const pageIds = new Set(pages.map((item) => item.page.id));
        domains = systemMap.feature_domains.filter((domain) => pageIds.has(domain.cockpit_page));
      }
      if (projects.length === 0 && pages.length > 0) {
        const pageIds = new Set(pages.map((item) => item.page.id));
        projects = systemMap.projects.filter((project) => pageIds.has(project.cockpit_page));
      }

      const pageIds = new Set(pages.map((item) => item.page.id));
      const usagePaths = systemMap.usage_paths.filter((path) =>
        path.pages.some((page) => pageIds.has(page.id)),
      );
      const playbooks = systemMap.playbooks.filter((playbook) =>
        playbook.steps.some((step) => pageIds.has(step.page_id)),
      );
      const roadmapItems = systemMap.roadmap.items.filter((item) =>
        pageIds.has(item.cockpit_page) && item.status !== 'shipped',
      );

      const gapDraft = draftTasks.find((task) =>
        task.read_only && task.source?.type === 'system_map_capability_gap' && task.source.id === gap.id,
      ) || null;
      const projectDraft = draftTasks.find((task) =>
        task.read_only
        && (
          (task.source?.type === 'system_map_project_portfolio' && projects.some((project) => project.id === task.source?.id))
          || (task.source?.type === 'system_map_verification_ready' && projects.some((project) => project.id === task.source?.id))
        ),
      ) || null;
      const pageDraft = draftTasks.find((task) =>
        task.read_only
        && task.source?.type === 'system_map_page_maturity'
        && pageIds.has(task.source?.id || ''),
      ) || null;
      const playbookDraft = draftTasks.find((task) =>
        task.read_only
        && task.source?.type === 'system_map_playbook'
        && playbooks.some((playbook) => playbook.id === task.source?.id),
      ) || null;
      const domainDraft = draftTasks.find((task) =>
        task.read_only
        && task.source?.type === 'system_map_domain_app'
        && domains.some((domain) => domain.id === task.source?.id),
      ) || null;
      const draft = gapDraft || projectDraft || pageDraft || playbookDraft || domainDraft || null;

      const page = pages[0]
        || (projects[0] ? pageMaturity.find((item) => item.page.id === projects[0].cockpit_page) || null : null)
        || (domains[0] ? pageMaturity.find((item) => item.page.id === domains[0].cockpit_page) || null : null)
        || null;

      const nextAction = draft?.description
        || projects[0]?.portfolio.next_action
        || page?.nextAction
        || roadmapItems[0]?.problem
        || playbooks[0]?.goal
        || gap.next;

      const taskQuery = draft?.source?.id
        || draft?.id
        || projects[0]?.id
        || playbooks[0]?.id
        || page?.page.id
        || domains[0]?.id
        || gap.id;

      return {
        gap,
        scope,
        page,
        projects: projects.slice(0, 3),
        domains: domains.slice(0, 3),
        usagePaths: usagePaths.slice(0, 2),
        playbooks: playbooks.slice(0, 2),
        roadmapItems: roadmapItems.slice(0, 2),
        draft,
        nextAction,
        taskQuery,
      };
    });
  }, [draftTasks, pageMaturity, projectsById, systemMap]);

  const selectedGapClosureRow = useMemo(
    () => gapClosureRows.find((row) => row.gap.id === selectedGapId) || null,
    [gapClosureRows, selectedGapId],
  );

  const selectedProjectUsagePaths = useMemo(() => {
    if (!systemMap || !selectedProject) return [];
    return systemMap.usage_paths.filter((path) =>
      path.pages.some((page) => page.id === selectedProject.cockpit_page),
    );
  }, [selectedProject, systemMap]);

  const selectedProjectPlaybooks = useMemo(() => {
    if (!systemMap || !selectedProject) return [];
    return systemMap.playbooks.filter((playbook) =>
      playbook.steps.some((step) => step.page_id === selectedProject.cockpit_page),
    );
  }, [selectedProject, systemMap]);

  const selectedProjectDrafts = useMemo(() => {
    if (!selectedProject) return [];
    return draftTasks.filter((task) =>
      task.read_only
      && (
        (task.source?.type === 'system_map_project_portfolio' && task.source.id === selectedProject.id)
        || (task.source?.type === 'system_map_verification_ready' && task.source.id === selectedProject.id)
      ),
    );
  }, [draftTasks, selectedProject]);

  const systemMapWorkbenchRows = useMemo<SystemMapWorkbenchRow[]>(() => {
    const rows: SystemMapWorkbenchRow[] = [];

    if (activeUsagePath) {
      const usageMissingSignals = [
        activeUsageProjects.length === 0,
        activeUsageDomains.length === 0,
        activeUsagePlaybooks.length === 0,
        activeUsageRoadmap.length === 0,
        activeUsageDrafts.length === 0,
      ].filter(Boolean).length;
      rows.push({
        id: `workbench-usage-${activeUsagePath.id}`,
        title: `${activeUsagePath.title} · 路径闭环`,
        laneLabel: '使用路径工作台',
        summary: activeUsagePath.intent,
        nextAction: activeUsagePath.steps[0]
          ? `先从“${activeUsagePath.steps[0]}”开始，顺着路径把页面、清单、能力域和草稿重新串起来。`
          : '先把这条路径重新挂回页面、清单和任务承接。',
        evidence: `覆盖页 ${activeUsagePath.pages.length} · 清单 ${activeUsagePlaybooks.length} · 草稿 ${activeUsageDrafts.length}`,
        statusTone: usageMissingSignals === 0 ? 'online' : usageMissingSignals <= 2 ? 'degraded' : 'offline',
        statusLabel: usageMissingSignals === 0 ? '路径成型' : usageMissingSignals <= 2 ? '可走待补' : '断链较多',
        primaryTarget: { tab: 'SystemMap', usagePathId: activeUsagePath.id },
        primaryLabel: '打开路径',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: activeUsagePath.title || activeUsagePath.id },
        secondaryLabel: '打开任务',
      });
    }

    if (selectedPageMaturity) {
      rows.push({
        id: `workbench-page-${selectedPageMaturity.page.id}`,
        title: `${selectedPageMaturity.page.title} · 页面闭环`,
        laneLabel: `页面成熟度 · ${pageMaturityStatusText(selectedPageMaturity.status)}`,
        summary: selectedPageMaturity.page.purpose,
        nextAction: selectedPageMaturity.nextAction,
        evidence: `项目 ${selectedPageMaturity.projects.length} · 能力域 ${selectedPageMaturity.domains.length} · 路线图 ${selectedPageMaturity.roadmapItems.length}`,
        statusTone: selectedPageMaturity.status === 'ready' ? 'online' : selectedPageMaturity.status === 'watch' ? 'degraded' : 'offline',
        statusLabel: selectedPageMaturity.status === 'ready' ? '可日用' : selectedPageMaturity.status === 'watch' ? '待补观察' : '优先补位',
        primaryTarget: { tab: selectedPageMaturity.page.id, pageId: selectedPageMaturity.page.id },
        primaryLabel: '进入页面',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: selectedPageMaturity.page.id },
        secondaryLabel: '页面草稿',
      });
    }

    if (selectedFeatureDomain) {
      rows.push({
        id: `workbench-domain-${selectedFeatureDomain.id}`,
        title: `${selectedFeatureDomain.title} · 能力域闭环`,
        laneLabel: `能力域 · ${selectedFeatureDomain.coverage === 'native' ? '原生' : selectedFeatureDomain.coverage}`,
        summary: selectedFeatureDomain.english || 'Capability Domain',
        nextAction: selectedFeaturePageMaturity?.nextAction || '继续补页面、路径、清单和路线图之间的能力映射。',
        evidence: `提供方 ${selectedFeatureDomain.providers.length} · 能力项 ${selectedFeatureDomain.capability_items.length} · 项目 ${selectedFeatureProjects.length}`,
        statusTone: selectedFeatureDomain.coverage === 'native' ? 'online' : selectedFeatureDomain.providers.length > 0 ? 'degraded' : 'offline',
        statusLabel: selectedFeatureDomain.coverage === 'native' ? '映射成型' : selectedFeatureDomain.providers.length > 0 ? '映射待补' : '待建能力链',
        primaryTarget: { tab: 'SystemMap', featureDomainId: selectedFeatureDomain.id },
        primaryLabel: '打开能力域',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: selectedFeatureDomain.cockpit_page },
        secondaryLabel: '页面草稿',
      });
    }

    if (selectedProject) {
      const verification = selectedProject.runtime.latest_verification;
      rows.push({
        id: `workbench-project-${selectedProject.id}`,
        title: `${selectedProject.id} · 项目闭环`,
        laneLabel: `项目组合 · ${portfolioStatusText(selectedProject.portfolio.status)}`,
        summary: selectedProject.portfolio.primary_gap || selectedProject.role || selectedProject.stack,
        nextAction: selectedProject.portfolio.next_action || selectedProject.operational.next_action,
        evidence: `验证 ${verifyText(verification.status)} · triage ${selectedProject.triage_commands.length} · workflow ${selectedProject.workflow.latest_status}`,
        statusTone: selectedProject.portfolio.status === 'healthy'
          ? 'online'
          : selectedProject.portfolio.status === 'at_risk' || selectedProject.portfolio.status === 'watch'
            ? 'degraded'
            : 'offline',
        statusLabel: selectedProject.portfolio.status === 'healthy'
          ? '项目稳定'
          : selectedProject.portfolio.status === 'at_risk' || selectedProject.portfolio.status === 'watch'
            ? '项目待跟'
            : '项目阻塞',
        primaryTarget: { tab: 'TaskCenter', taskQuery: selectedProject.id },
        primaryLabel: '项目草稿',
        secondaryTarget: { tab: 'SystemMap', pageId: selectedProject.cockpit_page },
        secondaryLabel: '关联页面',
      });
    }

    if (selectedGap) {
      const gapDraft = draftTasks.find((task) =>
        task.read_only && task.source?.type === 'system_map_capability_gap' && task.source.id === selectedGap.id,
      ) || null;
      rows.push({
        id: `workbench-gap-${selectedGap.id}`,
        title: `${selectedGap.title} · 缺口闭环`,
        laneLabel: `能力缺口 · ${selectedGap.severity}`,
        summary: selectedGap.evidence,
        nextAction: selectedGap.next,
        evidence: gapDraft?.title || '先把缺口转回任务、页面或项目入口。',
        statusTone: selectedGap.severity === 'high' ? 'offline' : selectedGap.severity === 'medium' ? 'degraded' : 'online',
        statusLabel: selectedGap.severity === 'high' ? '优先修复' : selectedGap.severity === 'medium' ? '继续收口' : '保持观察',
        primaryTarget: { tab: 'TaskCenter', taskQuery: selectedGap.id },
        primaryLabel: '缺口草稿',
        secondaryTarget: { tab: 'SystemMap', gapId: selectedGap.id },
        secondaryLabel: '定位缺口',
      });
    }

    return rows.slice(0, 4);
  }, [
    activeUsageDomains.length,
    activeUsageDrafts,
    activeUsagePath,
    activeUsagePlaybooks.length,
    activeUsageProjects.length,
    activeUsageRoadmap.length,
    draftTasks,
    selectedFeatureDomain,
    selectedFeaturePageMaturity,
    selectedFeatureProjects.length,
    selectedGap,
    selectedPageMaturity,
    selectedProject,
  ]);

  const capabilityBuildBacklog = useMemo(() => {
    if (!systemMap) {
      return {
        pagesWithoutUsage: [] as PageMaturity[],
        pagesWithoutDomain: [] as PageMaturity[],
        plannedRoadmapItems: [] as RoadmapItem[],
        gapItems: [] as CapabilityGap[],
        domainAttention: [] as DomainAppSummary['attention_items'],
        actionableDrafts: [] as DraftTask[],
      };
    }

    const pagesWithoutUsage = pageMaturity
      .filter((item) => item.usagePaths.length === 0)
      .sort((left, right) => left.score - right.score)
      .slice(0, 4);

    const pagesWithoutDomain = pageMaturity
      .filter((item) => item.domains.length === 0)
      .sort((left, right) => left.score - right.score)
      .slice(0, 4);

    const plannedRoadmapItems = systemMap.roadmap.items
      .filter((item) => item.status !== 'shipped')
      .slice(0, 4);

    const actionableDrafts = draftTasks
      .filter((task) =>
        task.read_only
        && (
          task.source?.type === 'system_map_page_maturity'
          || task.source?.type === 'system_map_domain_app'
          || task.source?.type === 'system_map_capability_gap'
        ),
      )
      .slice(0, 5);

    return {
      pagesWithoutUsage,
      pagesWithoutDomain,
      plannedRoadmapItems,
      gapItems: systemMap.gaps.slice(0, 3),
      domainAttention: systemMap.domain_apps.attention_items.slice(0, 3),
      actionableDrafts,
    };
  }, [draftTasks, pageMaturity, systemMap]);

  const buildControlTower = useMemo(() => {
    if (!systemMap) {
      return {
        pageItems: [] as PageMaturity[],
        domainContractItems: [] as DomainAppSummary['items'],
        verificationItems: [] as Array<
          | { kind: 'draft'; task: DraftTask; project: ProjectItem | null }
          | { kind: 'project'; project: ProjectPortfolioPriority }
        >,
        priorityItems: [] as Array<
          | { kind: 'project'; project: ProjectPortfolioPriority }
          | { kind: 'roadmap'; roadmap: RoadmapItem }
        >,
      };
    }

    const pageItems = pageMaturity
      .filter((item) => item.status !== 'ready')
      .sort((left, right) => left.score - right.score)
      .slice(0, 5);

    const domainContractItems = systemMap.domain_apps.items
      .filter((app) =>
        app.runtime_status !== 'running'
        || app.security_posture !== 'passed'
        || (app.integration_mode !== 'native_cockpit_view' && !app.launch_url && !app.api_url),
      )
      .slice(0, 5);

    const verificationDraftItems = draftTasks
      .filter((task) => task.read_only && task.source?.type === 'system_map_verification_ready')
      .map((task) => ({
        kind: 'draft' as const,
        task,
        project: projectsById.get(task.source?.id || '') || null,
      }));

    const verificationProjectItems = systemMap.project_portfolio.priority_projects
      .filter((project) => project.verification_status !== 'verified')
      .map((project) => ({
        kind: 'project' as const,
        project,
      }));

    const verificationSeen = new Set<string>();
    const verificationItems = [...verificationDraftItems, ...verificationProjectItems]
      .filter((item) => {
        const id = item.kind === 'draft' ? item.task.source?.id || item.task.id : item.project.id;
        if (verificationSeen.has(id)) return false;
        verificationSeen.add(id);
        return true;
      })
      .slice(0, 5);

    const priorityItems = [
      ...systemMap.project_portfolio.priority_projects.map((project) => ({ kind: 'project' as const, project })),
      ...systemMap.roadmap.items
        .filter((roadmap) => roadmap.status !== 'shipped')
        .map((roadmap) => ({ kind: 'roadmap' as const, roadmap })),
    ].slice(0, 6);

    return {
      pageItems,
      domainContractItems,
      verificationItems,
      priorityItems,
    };
  }, [draftTasks, pageMaturity, projectsById, systemMap]);

  if (loading) return <LoadingState />;

  if (error || !systemMap) {
    return (
      <div className="system-map-error">
        <ShieldAlert size={18} />
        <span>{error || '系统地图不可用'}</span>
      </div>
    );
  }

  const systemSummaryTiles = [
    {
      id: 'cockpit-pages',
      title: 'Cockpit 页面',
      value: systemMap.summary.cockpit_pages,
      icon: <MapIcon size={20} />,
      iconClassName: 'pulse-accent',
    },
    {
      id: 'layers',
      title: '架构层级',
      value: systemMap.summary.layers,
      icon: <Layers size={20} />,
      iconClassName: 'pulse-success',
    },
    {
      id: 'running-projects',
      title: '运行项目',
      value: `${systemMap.summary.running_projects} / ${systemMap.summary.projects}`,
      description: `无需常驻 ${systemMap.summary.not_applicable_projects}`,
      icon: <Network size={20} />,
      iconClassName: 'pulse-info',
    },
    {
      id: 'gaps',
      title: '待补能力',
      value: systemMap.summary.gaps,
      icon: <AlertTriangle size={20} />,
      iconClassName: 'pulse-warning',
    },
    {
      id: 'source-refs',
      title: '来源定位',
      value: systemMap.summary.source_refs,
      icon: <ExternalLink size={20} />,
      iconClassName: 'pulse-info',
    },
    {
      id: 'actions',
      title: '受控动作',
      value: systemMap.summary.project_actions,
      icon: <Copy size={20} />,
      iconClassName: 'pulse-success',
    },
    {
      id: 'projects-needing-action',
      title: '项目待处理',
      value: systemMap.summary.projects_needing_action,
      icon: <AlertTriangle size={20} />,
      iconClassName: 'pulse-warning',
    },
    {
      id: 'coverage-score',
      title: '覆盖分',
      value: `${systemMap.summary.project_coverage_score}%`,
      icon: <ShieldAlert size={20} />,
      iconClassName: 'pulse-success',
    },
    {
      id: 'triage-commands',
      title: '排查命令',
      value: systemMap.summary.project_triage_commands,
      icon: <ClipboardCheck size={20} />,
      iconClassName: 'pulse-info',
    },
    {
      id: 'domain-apps',
      title: '领域应用',
      value: `${systemMap.summary.domain_apps} · ${systemMap.summary.domain_app_score}%`,
      icon: <ExternalLink size={20} />,
      iconClassName: 'pulse-accent',
    },
  ];

  return (
    <div className="system-map-page animate-fade-in">
      <div className="system-map-toolbar">
        <div>
          <h2>工作区总图</h2>
          <p>{systemMap.architecture.model} · {systemMap.architecture.ecos_version} · {systemMap.architecture.dependency_direction}</p>
        </div>
        <button className="antd-btn" onClick={load}>
          <RefreshCw size={14} />
          <span>刷新</span>
        </button>
      </div>

      <SummaryTileGrid className="system-map-summary-grid" items={systemSummaryTiles} minColumnWidth={180} />

      {(actionNotice || actionError) && (
        <div className={`system-map-action-feedback ${actionError ? 'error' : 'success'}`} role={actionError ? 'alert' : 'status'}>
          {actionError || actionNotice}
        </div>
      )}

      <SourceInspector
        activeRef={activeSourceRef}
        preview={sourcePreview}
        loading={sourceLoading}
        error={sourceError}
      />

      {selectedGap && (
        <section className="services-section system-map-section system-map-gap-focus" aria-label="当前聚焦能力缺口">
          <div className="section-header">
            <div>
              <h2>当前聚焦能力缺口</h2>
              <p className="text-muted">从任务草稿或全局搜索带回来的缺口，会在这里先给你一个落点。</p>
            </div>
            <button className="antd-btn" onClick={() => onNavigate('TaskCenter')}>
              <ClipboardCheck size={14} />
              <span>回任务中心</span>
            </button>
          </div>
          <article className={`system-map-gap system-map-gap-active ${statusClass(selectedGap.severity)}`}>
            <span className={`status-badge ${statusClass(selectedGap.severity)}`}>{selectedGap.severity}</span>
            <div>
              <h3>{selectedGap.title}</h3>
              <p>{selectedGap.evidence}</p>
              <strong>{selectedGap.next}</strong>
            </div>
          </article>
          {selectedGapClosureRow && (
            <div className="system-map-page-focus-grid">
              <div className="system-map-page-focus-panel">
                <strong>缺口承接面</strong>
                <div className="system-map-page-focus-links">
                  <span>页面 {selectedGapClosureRow.page ? 1 : 0}</span>
                  <span>项目 {selectedGapClosureRow.projects.length}</span>
                  <span>能力域 {selectedGapClosureRow.domains.length}</span>
                  <span>路径 {selectedGapClosureRow.usagePaths.length}</span>
                  <span>清单 {selectedGapClosureRow.playbooks.length}</span>
                  <span>路线图 {selectedGapClosureRow.roadmapItems.length}</span>
                </div>
                <small className="system-map-page-focus-next">{selectedGapClosureRow.nextAction}</small>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>当前承接线索</strong>
                <div className="system-map-page-focus-signals">
                  <div className="system-map-page-focus-signal">
                    <span>主页面</span>
                    <small>{selectedGapClosureRow.page?.page.title || '还没挂到具体页面'}</small>
                  </div>
                  <div className="system-map-page-focus-signal">
                    <span>重点项目</span>
                    <small>{selectedGapClosureRow.projects[0]?.id || '还没落到具体项目'}</small>
                  </div>
                  <div className="system-map-page-focus-signal">
                    <span>任务承接</span>
                    <small>{selectedGapClosureRow.draft?.title || '当前还没有专属草稿，先回 TaskCenter 承接。'}</small>
                  </div>
                </div>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>反向修复入口</strong>
                <div className="system-map-page-focus-actions-grid">
                  {selectedGapClosureRow.page && (
                    <button
                      className="system-map-page-focus-action"
                      onClick={() => onNavigate(selectedGapClosureRow.page?.page.id || 'SystemMap')}
                    >
                      <span>查看页面</span>
                      <small>{selectedGapClosureRow.page.page.title}</small>
                    </button>
                  )}
                  {selectedGapClosureRow.projects[0] && (
                    <button
                      className="system-map-page-focus-action"
                      onClick={() => setSelectedProjectId(selectedGapClosureRow.projects[0].id)}
                    >
                      <span>查看项目</span>
                      <small>{selectedGapClosureRow.projects[0].id}</small>
                    </button>
                  )}
                  {selectedGapClosureRow.playbooks[0] && (
                    <button
                      className="system-map-page-focus-action"
                      onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedGapClosureRow.playbooks[0].id }, draftTasks), onNavigate, onOpenTarget)}
                    >
                      <span>查看清单</span>
                      <small>{selectedGapClosureRow.playbooks[0].title}</small>
                    </button>
                  )}
                  <button
                    className="system-map-page-focus-action"
                    onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedGapClosureRow.taskQuery }, draftTasks), onNavigate, onOpenTarget)}
                  >
                    <span>查看任务草稿</span>
                    <small>{selectedGapClosureRow.draft?.title || selectedGapClosureRow.taskQuery}</small>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {gapClosureRows.length > 0 && (
        <section className="services-section system-map-section system-map-build-backlog" aria-label="能力缺口承接总表">
          <div className="section-header">
            <div>
              <h2>能力缺口承接总表</h2>
              <p className="text-muted">每个缺口都要能落到页面、项目或任务，不再只停在一句“缺功能”。</p>
            </div>
            <span className="status-badge degraded">
              <ShieldAlert size={13} />
              {gapClosureRows.length} 个显性缺口
            </span>
          </div>
          <div className="system-map-build-summary">
            <span><strong>{gapClosureRows.length}</strong> 缺口总数</span>
            <span><strong>{gapClosureRows.filter((row) => row.page).length}</strong> 已挂页面</span>
            <span><strong>{gapClosureRows.reduce((count, row) => count + row.projects.length, 0)}</strong> 待跟项目</span>
            <span><strong>{gapClosureRows.filter((row) => row.draft).length}</strong> 已有草稿</span>
          </div>
          <div className="system-map-gap-closure-grid">
            {gapClosureRows.map((row) => (
              <article className="system-map-gap-closure-card" key={row.gap.id}>
                <div className="dashboard-page-workbench-head">
                  <div>
                    <span>能力缺口 · {row.scope}</span>
                    <strong>{row.gap.title}</strong>
                  </div>
                  <em className={`status-badge ${statusClass(row.gap.severity)}`}>{row.gap.severity}</em>
                </div>
                <p>{row.gap.evidence}</p>
                <div className="system-map-page-focus-links system-map-gap-closure-links">
                  <span>页面 {row.page?.page.title || '待挂'}</span>
                  <span>项目 {row.projects[0]?.id || '待定'}</span>
                  <span>任务 {row.draft ? '已承接' : '待承接'}</span>
                </div>
                <div className="dashboard-page-workbench-detail">
                  <span>下一步</span>
                  <strong>{row.nextAction}</strong>
                </div>
                <div className="dashboard-page-workbench-detail">
                  <span>配套入口</span>
                  <strong>
                    路径 {row.usagePaths.length} · 清单 {row.playbooks.length} · 路线图 {row.roadmapItems.length}
                  </strong>
                </div>
                <div className="dashboard-page-workbench-actions">
                  <button type="button" className="antd-btn" onClick={() => setSelectedGapId(row.gap.id)}>
                    <span>定位缺口</span>
                  </button>
                  {row.page && (
                    <button type="button" className="antd-btn" onClick={() => onNavigate(row.page?.page.id || 'SystemMap')}>
                      <ArrowRight size={14} />
                      <span>查看页面</span>
                    </button>
                  )}
                  {row.projects[0] && (
                    <button type="button" className="antd-btn" onClick={() => setSelectedProjectId(row.projects[0].id)}>
                      <span>查看项目</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="antd-btn"
                    onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: row.taskQuery }, draftTasks), onNavigate, onOpenTarget)}
                  >
                    <ClipboardCheck size={14} />
                    <span>打开任务</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          page={pagesById.get(selectedProject.cockpit_page)}
          onClose={() => setSelectedProjectId(null)}
          onNavigate={onNavigate}
          onOpenTarget={onOpenTarget}
          onFocusCoverage={(dimensionId) => setCoverageFilter(dimensionId)}
          onFocusUsagePath={(usagePathId) => setSelectedUsagePathId(usagePathId)}
          onFocusPageMaturity={(pageId) => setSelectedPageMaturityId(pageId)}
          relatedUsagePaths={selectedProjectUsagePaths}
          relatedPlaybooks={selectedProjectPlaybooks}
          relatedDrafts={selectedProjectDrafts}
          onInspect={inspectSourceRef}
          onQueueAction={(action) => void queueProjectAction(selectedProject.id, action)}
          activeTarget={activeSourceTarget}
        />
      )}

      {systemMapWorkbenchRows.length > 0 && (
        <section className="services-section system-map-section dashboard-page-workbench" role="region" aria-label="系统地图闭环工作台">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, margin: 0 }}>系统地图闭环工作台</h2>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                把当前路径、页面、能力域、项目和缺口压成一层闭环动作面，方便从系统地图直接跳去真正的承接页。
              </p>
            </div>
            <span className="status-badge degraded">
              当前 {systemMapWorkbenchRows.length} 个闭环位
            </span>
          </div>

          <div className="dashboard-page-workbench-grid">
            {systemMapWorkbenchRows.map((row) => (
              <article key={row.id} className="dashboard-page-workbench-card" aria-label={`系统地图闭环 ${row.title}`}>
                <div className="dashboard-page-workbench-head">
                  <div>
                    <span>{row.laneLabel}</span>
                    <strong>{row.title}</strong>
                  </div>
                  <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                </div>
                <p>{row.summary}</p>
                <div className="dashboard-page-workbench-detail">
                  <span>下一步</span>
                  <strong>{row.nextAction}</strong>
                </div>
                <div className="dashboard-page-workbench-detail">
                  <span>验收线索</span>
                  <strong>{row.evidence}</strong>
                </div>
                <div className="dashboard-page-workbench-actions">
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`打开系统地图闭环对象 ${row.title}`}
                    onClick={() => openSystemMapTarget(withTaskDraftHandoff(row.primaryTarget, draftTasks), onNavigate, onOpenTarget)}
                  >
                    <ArrowRight size={14} />
                    <span>{row.primaryLabel}</span>
                  </button>
                  {row.secondaryTarget && row.secondaryLabel && (
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`打开系统地图闭环动作 ${row.title}`}
                    onClick={() => openSystemMapTarget(withTaskDraftHandoff(row.secondaryTarget || { tab: 'SystemMap' }, draftTasks), onNavigate, onOpenTarget)}
                  >
                    <ClipboardCheck size={14} />
                    <span>{row.secondaryLabel}</span>
                  </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeUsagePath && (
        <section className="services-section system-map-section system-map-usage-console">
          <div className="section-header">
            <div>
              <h2>使用路径工作台</h2>
              <p className="text-muted">先选目标，再看它覆盖哪些页面、清单、能力域和待补路线图。</p>
            </div>
            <button className="antd-btn" onClick={() => onNavigate('TaskCenter')}>
              <ClipboardCheck size={14} />
              <span>任务草稿</span>
            </button>
          </div>
          <div className="system-map-usage-console-grid">
            <div className="system-map-usage-picker" role="list" aria-label="使用路径选择">
              {systemMap.usage_paths.map((path) => (
                <button
                  key={path.id}
                  className={`system-map-usage-choice ${activeUsagePath.id === path.id ? 'active' : ''}`}
                  onClick={() => setSelectedUsagePathId(path.id)}
                  title={path.intent}
                >
                  <span>{path.title}</span>
                  <small>{path.pages.map((page) => page.title).join(' -> ')}</small>
                </button>
              ))}
            </div>
            <article className="system-map-usage-active">
              <div className="system-map-usage-active-head">
                <div>
                  <h3>{activeUsagePath.title}</h3>
                  <p>{activeUsagePath.intent}</p>
                </div>
                <div className="system-map-usage-kpis">
                  <span><strong>{activeUsagePath.pages.length}</strong> 覆盖页</span>
                  <span><strong>{activeUsagePlaybooks.length}</strong> 相关清单</span>
                  <span><strong>{activeUsageDomains.length}</strong> 能力域</span>
                  <span><strong>{activeUsageRoadmap.length}</strong> 路线图</span>
                </div>
              </div>
              <div className="system-map-usage-page-chain">
                {activeUsagePath.pages.map((page, index) => (
                  <React.Fragment key={page.id}>
                    {index > 0 && <ArrowRight size={13} className="text-muted" />}
                    <PageButton page={page} onNavigate={onNavigate} />
                  </React.Fragment>
                ))}
              </div>
              <div className="system-map-usage-detail-grid">
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head">
                    <h4>相关清单</h4>
                    <span>{activeUsagePlaybooks.length}</span>
                  </div>
                  {activeUsagePlaybooks.slice(0, 3).map((playbook) => (
                    <div className="system-map-usage-playbook" key={playbook.id}>
                      <strong>{playbook.title}</strong>
                      <small>{playbook.goal}</small>
                      <div className="system-map-usage-mini-steps">
                        {playbook.steps.slice(0, 4).map((step, index) => (
                          <button key={step.id} onClick={() => onNavigate(step.page.id)} title={step.done_when}>
                            {index + 1}. {step.page.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head">
                    <h4>能力域</h4>
                    <span>{activeUsageDomains.length}</span>
                  </div>
                  {activeUsageDomains.length > 0 ? (
                    activeUsageDomains.slice(0, 4).map((domain) => (
                      <button
                        className="system-map-usage-domain"
                        key={domain.id}
                        onClick={() => onNavigate(domain.cockpit_page)}
                      >
                        <strong>{domain.title}</strong>
                        <small>{domain.providers.slice(0, 3).join(' · ') || domain.english}</small>
                      </button>
                    ))
                  ) : (
                    <span className="system-map-usage-empty">暂无直接映射能力域</span>
                  )}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head">
                    <h4>路线图与缺口</h4>
                    <span>{activeUsageRoadmap.length + Math.min(systemMap.gaps.length, 2)}</span>
                  </div>
                  {activeUsageRoadmap.slice(0, 3).map((item) => (
                    <button
                      className="system-map-usage-roadmap"
                      key={item.id}
                      onClick={() => onNavigate(item.cockpit_page)}
                      title={item.problem}
                    >
                      <span className={`status-badge ${statusClass(item.status)}`}>{item.priority}</span>
                      <strong>{item.title}</strong>
                    </button>
                  ))}
                  {systemMap.gaps.slice(0, 2).map((gap) => (
                    <div className="system-map-usage-gap" key={gap.id}>
                      <span className={`status-badge ${statusClass(gap.severity)}`}>{gap.severity}</span>
                      <small>{gap.title}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="system-map-usage-execute-grid">
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head">
                    <h4>相关项目</h4>
                    <span>{activeUsageProjects.length}</span>
                  </div>
                  {activeUsageProjects.length > 0 ? (
                    activeUsageProjects.slice(0, 4).map((project) => (
                      <button
                        className={`system-map-usage-project ${statusClass(project.portfolio.status)}`}
                        key={`usage-project-${project.id}`}
                        onClick={() => setSelectedProjectId(project.id)}
                        title={project.portfolio.next_action}
                      >
                        <div className="system-map-usage-meta">
                          <strong>{project.id}</strong>
                          <span>{project.layer} · {project.role || project.stack}</span>
                        </div>
                        <small>{portfolioStatusText(project.portfolio.status)} · {project.portfolio.primary_gap}</small>
                      </button>
                    ))
                  ) : (
                    <span className="system-map-usage-empty">这条路径暂时还没绑定项目对象</span>
                  )}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head">
                    <h4>排查命令</h4>
                    <span>{activeUsageTriageCommands.length}</span>
                  </div>
                  {activeUsageTriageCommands.length > 0 ? (
                    activeUsageTriageCommands.slice(0, 4).map((command) => (
                      <button
                        className={`system-map-usage-command ${statusClass(command.risk)}`}
                        disabled={!command.enabled}
                        key={`usage-command-${command.project_id || 'global'}-${command.id}`}
                        onClick={() => void copyText(command.value)}
                        title={command.guard}
                      >
                        <div className="system-map-usage-meta">
                          <strong>{command.project_id || '项目'} · {command.label}</strong>
                          <span>{command.reason || command.category || '排查命令'}</span>
                        </div>
                        <code>{command.value}</code>
                      </button>
                    ))
                  ) : (
                    <span className="system-map-usage-empty">这条路径下暂无可复制排查命令</span>
                  )}
                </div>
                <div className="system-map-usage-detail">
                  <div className="system-map-usage-detail-head">
                    <h4>任务草稿</h4>
                    <button className="antd-btn small" onClick={() => onNavigate('TaskCenter')}>
                      <ClipboardCheck size={13} />
                      <span>全部草稿</span>
                    </button>
                  </div>
                  {activeUsageDrafts.length > 0 ? (
                    activeUsageDrafts.slice(0, 4).map((task) => (
                      <div className="system-map-usage-draft" key={task.id}>
                        <button
                          className={`system-map-usage-draft-main ${statusClass(task.priority || 'medium')}`}
                          onClick={() => {
                            if (task.draft?.copy_text) {
                              void copyText(task.draft.copy_text);
                              return;
                            }
                            onNavigate('TaskCenter');
                          }}
                          title={task.draft?.guard || '复制草稿'}
                        >
                          <div className="system-map-usage-meta">
                            <strong>{task.title}</strong>
                            <span>{draftSourceLabel(task.source?.type)} · {task.source?.title || task.source?.id || '草稿来源'}</span>
                          </div>
                          {task.description && <small>{task.description}</small>}
                        </button>
                        <div className="system-map-usage-draft-foot">
                          <span className={`status-badge ${statusClass(task.priority || 'medium')}`}>{task.priority || 'medium'}</span>
                          <small>{task.draft?.step_count ? `${task.draft.step_count} 步` : '只读草稿'}</small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="system-map-usage-empty">这条路径下暂无匹配草稿</span>
                  )}
                </div>
              </div>
              <SourceRefList
                refs={activeUsagePath.source_refs}
                compact
                onInspect={inspectSourceRef}
                activeTarget={activeSourceTarget}
              />
            </article>
          </div>
        </section>
      )}

      <section className="services-section system-map-section system-map-portfolio">
        <div className="section-header">
          <div>
            <h2>项目组合态势</h2>
            <p className="text-muted">把项目覆盖、运行、验证和工作流证据折成优先级，先处理最影响日用的面。</p>
          </div>
          <span className={`status-badge ${statusClass(systemMap.project_portfolio.summary.status)}`}>
            <ShieldAlert size={13} />
            {portfolioStatusText(systemMap.project_portfolio.summary.status)}
          </span>
        </div>
        <div className="system-map-portfolio-grid">
          <article className={`system-map-portfolio-score ${statusClass(systemMap.project_portfolio.summary.status)}`}>
            <span>组合分</span>
            <strong>{systemMap.project_portfolio.summary.score}%</strong>
            <small>
              阻塞 {systemMap.project_portfolio.summary.blocked} · 风险 {systemMap.project_portfolio.summary.at_risk} · 观察 {systemMap.project_portfolio.summary.watch}
            </small>
          </article>
          <div className="system-map-portfolio-buckets">
            {systemMap.project_portfolio.buckets.map((bucket) => (
              <button
                className={`system-map-portfolio-bucket ${portfolioFilter === bucket.id ? 'active' : ''} ${statusClass(bucket.severity)}`}
                key={bucket.id}
                onClick={() => {
                  setPortfolioFilter(bucket.id);
                  setProjectFilter('all');
                  setCoverageFilter('all');
                  setProjectQuery('');
                }}
                title={bucket.reason}
              >
                <span>{bucket.title}</span>
                <strong>{bucket.count}</strong>
                <small>{bucket.project_ids.slice(0, 4).join(' · ') || '暂无项目'}</small>
              </button>
            ))}
          </div>
          <div className="system-map-portfolio-priority">
            <div className="system-map-portfolio-subhead">
              <h3>优先项目</h3>
              <span>{systemMap.project_portfolio.summary.priority_projects}</span>
            </div>
            {systemMap.project_portfolio.priority_projects.slice(0, 5).map((project) => (
              <button
                className={`system-map-portfolio-priority-card ${statusClass(project.status)}`}
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                title={project.next_action}
              >
                <div>
                  <strong>{project.id}</strong>
                  <span>{project.layer} · {portfolioStatusText(project.status)} · {project.score}%</span>
                </div>
                <p>{project.primary_gap}</p>
                <small>{project.next_action}</small>
                {project.non_ready_dimensions.length > 0 && (
                  <div className="system-map-portfolio-tags">
                    {project.non_ready_dimensions.slice(0, 4).map((dimension) => (
                      <em className={statusClass(dimension.status)} key={`${project.id}-${dimension.id}`}>
                        {dimension.title}
                      </em>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="system-map-portfolio-weak">
            <div className="system-map-portfolio-subhead">
              <h3>薄弱维度</h3>
              <span>{systemMap.project_portfolio.summary.weakest_dimensions}</span>
            </div>
            {systemMap.project_portfolio.weakest_dimensions.slice(0, 4).map((dimension) => (
              <button
                className={`system-map-portfolio-dimension ${statusClass(dimension.status)}`}
                key={dimension.id}
                aria-label={`筛选薄弱维度：${dimension.title}`}
                onClick={() => setCoverageFilter(dimension.id)}
                title={dimension.description}
              >
                <span>{dimension.title}</span>
                <strong>{dimension.score}%</strong>
                <small>缺口 {dimension.failed} · 提醒 {dimension.warning}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="services-section system-map-section system-map-portfolio" role="region" aria-label="项目入口映射总表">
        <div className="section-header">
          <div>
            <h2>项目入口映射总表</h2>
            <p className="text-muted">把优先项目直接映射到 Cockpit 入口、覆盖维度和任务承接位，避免项目只挂在总览里不落到可操作入口。</p>
          </div>
          <span className={`status-badge ${statusClass(systemMap.project_portfolio.summary.status)}`}>
            <Route size={13} />
            已挂 {projectEntrySummary.mapped} / {projectEntryRows.length}
          </span>
        </div>
        <SummaryTileGrid
          className="system-map-summary-grid"
          minColumnWidth={180}
          items={[
            {
              label: '优先项目',
              value: `${projectEntryRows.length}`,
              tone: 'default',
              helper: '当前项目组合里最影响日用的对象。',
            },
            {
              label: '已挂入口',
              value: `${projectEntrySummary.mapped}`,
              tone: projectEntrySummary.mapped === projectEntryRows.length ? 'positive' : 'warning',
              helper: '已登记 Cockpit 页面入口的优先项目数。',
            },
            {
              label: '待补草稿',
              value: `${projectEntrySummary.drafts}`,
              tone: projectEntrySummary.drafts > 0 ? 'warning' : 'positive',
              helper: '已经存在任务草稿承接的优先项目数。',
            },
            {
              label: '阻塞项目',
              value: `${projectEntrySummary.blocked}`,
              tone: projectEntrySummary.blocked > 0 ? 'danger' : 'positive',
              helper: '当前仍处于 blocked 的优先项目数。',
            },
          ]}
        />
        <div className="system-map-portfolio-priority">
          <div className="system-map-portfolio-subhead">
            <h3>入口映射</h3>
            <span>{projectEntryRows.length}</span>
          </div>
          {projectEntryRows.length > 0 ? (
            projectEntryRows.map(({ priority, project, page, primaryDimension, draft, draftTarget }) => (
              <article className={`system-map-portfolio-priority-card ${statusClass(priority.status)}`} key={`entry-${project.id}`}>
                <div>
                  <strong>{project.id}</strong>
                  <span>
                    {project.layer} · {page ? `${page.title} / ${page.group}` : '未登记入口'} · {portfolioStatusText(priority.status)}
                  </span>
                </div>
                <p>{priority.primary_gap}</p>
                <small>{project.portfolio.next_action}</small>
                <div className="system-map-portfolio-tags">
                  <em className={statusClass(priority.status)}>
                    入口 {page ? page.id : project.cockpit_page || '未登记'}
                  </em>
                  <em className={statusClass(project.runtime.status)}>
                    运行 {runtimeStatusText(project.runtime.status)}
                  </em>
                  <em className={statusClass(project.runtime.latest_verification.status)}>
                    验证 {verifyText(project.runtime.latest_verification.status)}
                  </em>
                  {primaryDimension && (
                    <em className={statusClass(primaryDimension.status)}>
                      缺口 {primaryDimension.title}
                    </em>
                  )}
                  {draft && (
                    <em className="ready">
                      草稿 {draft.title}
                    </em>
                  )}
                </div>
                <div className="system-map-page-focus-actions-grid">
                  {page && (
                    <button
                      className="system-map-page-focus-action"
                      onClick={() => openSystemMapTarget({ tab: page.id, projectId: project.id }, onNavigate, onOpenTarget)}
                    >
                      <span>打开项目入口</span>
                      <small>{page.title}</small>
                    </button>
                  )}
                  <button
                    className="system-map-page-focus-action"
                    onClick={() => openSystemMapTarget({ tab: 'SystemMap', projectId: project.id }, onNavigate, onOpenTarget)}
                  >
                    <span>查看项目覆盖</span>
                    <small>{project.portfolio.ready} 就绪 · {project.portfolio.failed} 缺口</small>
                  </button>
                  <button
                    className="system-map-page-focus-action"
                    onClick={() => openSystemMapTarget(draftTarget, onNavigate, onOpenTarget)}
                  >
                    <span>打开项目任务</span>
                    <small>{draft?.title || project.portfolio.next_action}</small>
                  </button>
                  {primaryDimension && (
                    <button
                      className="system-map-page-focus-action"
                      onClick={() => openSystemMapTarget({ tab: 'SystemMap', coverageDimensionId: primaryDimension.id, projectId: project.id }, onNavigate, onOpenTarget)}
                    >
                      <span>定位缺口维度</span>
                      <small>{primaryDimension.title}</small>
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <span className="text-muted">当前还没有需要映射的优先项目。</span>
          )}
        </div>
      </section>

      {activeRepairDimension && (
        <section className="services-section system-map-section system-map-dimension-workbench" aria-label="项目维度修复台">
          <div className="section-header">
            <div>
              <h2>项目维度修复台</h2>
              <p className="text-muted">按最薄弱维度组织项目、下一步和排查命令，选中维度会同步过滤下方项目矩阵。</p>
            </div>
            <button className="antd-btn" onClick={() => onNavigate('TaskCenter')}>
              <ClipboardCheck size={14} />
              <span>任务中心</span>
            </button>
          </div>
          <div className="system-map-dimension-workbench-grid">
            <div className="system-map-dimension-picker" role="list" aria-label="项目覆盖维度">
              {systemMap.project_capability_coverage.dimension_summary.map((dimension) => (
                <button
                  className={`system-map-dimension-choice ${activeRepairDimension.id === dimension.id ? 'active' : ''} ${statusClass(dimension.status)}`}
                  key={dimension.id}
                  onClick={() => setCoverageFilter(dimension.id)}
                  title={dimension.description}
                >
                  <span>{dimension.title}</span>
                  <strong>{dimension.score}%</strong>
                  <small>缺口 {dimension.failed} · 提醒 {dimension.warning}</small>
                </button>
              ))}
            </div>
            <article className={`system-map-dimension-active ${statusClass(activeRepairDimension.status)}`}>
              <div className="system-map-dimension-active-head">
                <div>
                  <span className={`status-badge ${statusClass(activeRepairDimension.status)}`}>
                    {activeRepairDimension.status}
                  </span>
                  <h3>{activeRepairDimension.title}</h3>
                  <p>{activeRepairDimension.description}</p>
                </div>
                <div className="system-map-dimension-kpis">
                  <span><strong>{activeRepairDimension.score}%</strong> 维度分</span>
                  <span><strong>{activeRepairDimension.ready}</strong> 就绪</span>
                  <span><strong>{activeRepairDimension.warning}</strong> 提醒</span>
                  <span><strong>{activeRepairDimension.failed}</strong> 缺口</span>
                </div>
              </div>
              <div className="system-map-dimension-projects">
                {dimensionRepairRows.length > 0 ? (
                  dimensionRepairRows.slice(0, 6).map(({ attention, project, check, commands }) => (
                    <div className={`system-map-dimension-project ${statusClass(attention.status)}`} key={`${activeRepairDimension.id}-${project.id}`}>
                      <button
                        className="system-map-dimension-project-name"
                        onClick={() => setSelectedProjectId(project.id)}
                        aria-label={`查看 ${project.id} 维度修复详情`}
                      >
                        <strong>{project.id}</strong>
                        <span>{project.layer} · {project.role || project.stack}</span>
                      </button>
                      <div className="system-map-dimension-project-body">
                        <span className={`status-badge ${statusClass(attention.status)}`}>{attention.status}</span>
                        <small>{check?.detail || attention.next_action}</small>
                        <strong>{check?.next_action || attention.next_action}</strong>
                      </div>
                      <div className="system-map-dimension-command-list">
                        {commands.length > 0 ? (
                          commands.slice(0, 2).map((command) => (
                            <button
                              className={`system-map-dimension-command ${statusClass(command.risk)}`}
                              disabled={!command.enabled}
                              key={`${project.id}-${activeRepairDimension.id}-${command.id}`}
                              onClick={() => void copyText(command.value)}
                              title={command.guard}
                            >
                              <Copy size={12} />
                              <span>
                                <strong>{command.label}</strong>
                                <code>{command.value}</code>
                              </span>
                            </button>
                          ))
                        ) : (
                          <span className="text-muted">暂无排查命令</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="system-map-dimension-empty">
                    <CheckCircle size={14} />
                    <span>这个维度当前没有待处理项目</span>
                  </div>
                )}
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="services-section system-map-section system-map-build-backlog" aria-label="统一建设控制台">
        <div className="section-header">
          <div>
            <h2>统一建设控制台</h2>
            <p className="text-muted">把页面能力、领域挂载合同、验证补证和路线图优先项拉到一张桌子上，先做真正影响日用的建设动作。</p>
          </div>
          <button className="antd-btn" onClick={() => onNavigate('TaskCenter')}>
            <ClipboardCheck size={14} />
            <span>统一承接到任务中心</span>
          </button>
        </div>
        <div className="system-map-build-summary">
          <span><strong>{buildControlTower.pageItems.length}</strong> 页面补位</span>
          <span><strong>{buildControlTower.domainContractItems.length}</strong> 领域合同</span>
          <span><strong>{buildControlTower.verificationItems.length}</strong> 验证补证</span>
          <span><strong>{buildControlTower.priorityItems.length}</strong> 项目与路线图</span>
        </div>
        <div className="system-map-build-grid">
          <article className="system-map-build-column">
            <div className="system-map-build-head">
              <strong>页面能力建设</strong>
              <span>{buildControlTower.pageItems.length}</span>
            </div>
            <div className="system-map-build-list">
              {buildControlTower.pageItems.map((item) => (
                <button
                  key={`control-page-${item.page.id}`}
                  className="system-map-build-item"
                  aria-label={`打开页面建设项 ${item.page.id}`}
                  onClick={() => setSelectedPageMaturityId(item.page.id)}
                >
                  <strong>{item.page.title}</strong>
                  <span>{pageMaturityStatusText(item.status)} · {item.score}% · 路径 {item.usagePaths.length} · 能力域 {item.domains.length}</span>
                  <small>{item.nextAction}</small>
                </button>
              ))}
              {buildControlTower.pageItems.length === 0 && (
                <div className="system-map-build-empty">当前没有待建设页面</div>
              )}
            </div>
          </article>

          <article className="system-map-build-column">
            <div className="system-map-build-head">
              <strong>领域挂载合同</strong>
              <span>{buildControlTower.domainContractItems.length}</span>
            </div>
            <div className="system-map-build-list">
              {buildControlTower.domainContractItems.map((app) => (
                <button
                  key={`control-domain-${app.id}`}
                  className="system-map-build-item"
                  aria-label={`打开领域合同项 ${app.id}`}
                  onClick={() => openSystemMapTarget({ tab: 'DomainApps', taskQuery: app.id }, onNavigate, onOpenTarget)}
                >
                  <strong>{app.name}</strong>
                  <span>{app.integration_mode} · 运行 {app.runtime_status} · 安全 {app.security_posture}</span>
                  <small>{app.next_action}</small>
                </button>
              ))}
              {buildControlTower.domainContractItems.length === 0 && (
                <div className="system-map-build-empty">当前没有待收口的领域挂载合同</div>
              )}
            </div>
          </article>

          <article className="system-map-build-column">
            <div className="system-map-build-head">
              <strong>验证与补证</strong>
              <span>{buildControlTower.verificationItems.length}</span>
            </div>
            <div className="system-map-build-list">
              {buildControlTower.verificationItems.map((item) => (
                item.kind === 'draft' ? (
                  <button
                    key={`control-verify-draft-${item.task.id}`}
                    className="system-map-build-item"
                    aria-label={`打开验证补证 ${item.task.source?.id || item.task.id}`}
                    onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: item.task.source?.id || item.task.id }, draftTasks), onNavigate, onOpenTarget)}
                  >
                    <strong>{item.task.title}</strong>
                    <span>{item.project?.id || item.task.source?.id} · {draftSourceLabel(item.task.source?.type)}</span>
                    <small>{item.task.description || item.project?.portfolio.next_action || '进入任务中心承接验证补证。'}</small>
                  </button>
                ) : (
                  <button
                    key={`control-verify-project-${item.project.id}`}
                    className="system-map-build-item"
                    aria-label={`打开验证项目 ${item.project.id}`}
                    onClick={() => setSelectedProjectId(item.project.id)}
                  >
                    <strong>{item.project.id}</strong>
                    <span>验证 {item.project.verification_status} · {item.project.primary_gap}</span>
                    <small>{item.project.next_action}</small>
                  </button>
                )
              ))}
              {buildControlTower.verificationItems.length === 0 && (
                <div className="system-map-build-empty">当前没有待补证项目</div>
              )}
            </div>
          </article>

          <article className="system-map-build-column">
            <div className="system-map-build-head">
              <strong>项目与路线图优先项</strong>
              <span>{buildControlTower.priorityItems.length}</span>
            </div>
            <div className="system-map-build-list">
              {buildControlTower.priorityItems.map((item) => (
                item.kind === 'project' ? (
                  <button
                    key={`control-priority-project-${item.project.id}`}
                    className="system-map-build-item"
                    aria-label={`打开优先项目 ${item.project.id}`}
                    onClick={() => setSelectedProjectId(item.project.id)}
                  >
                    <strong>{item.project.id}</strong>
                    <span>项目组合 · {item.project.status} · 分数 {item.project.score}%</span>
                    <small>{item.project.next_action}</small>
                  </button>
                ) : (
                  <button
                    key={`control-priority-roadmap-${item.roadmap.id}`}
                    className="system-map-build-item"
                    aria-label={`打开路线图优先项 ${item.roadmap.id}`}
                    onClick={() => onNavigate(item.roadmap.cockpit_page)}
                  >
                    <strong>{item.roadmap.title}</strong>
                    <span>路线图 · {item.roadmap.priority} · {item.roadmap.status}</span>
                    <small>{item.roadmap.problem}</small>
                  </button>
                )
              ))}
              {buildControlTower.priorityItems.length === 0 && (
                <div className="system-map-build-empty">当前没有更高优先级的项目与路线图项</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="services-section system-map-section system-map-build-backlog" aria-label="能力建设 Backlog">
        <div className="section-header">
          <div>
            <h2>能力建设 Backlog</h2>
            <p className="text-muted">把待补页面、待收口领域、显性能力缺口和未完成路线图收成一个建设面，不用在多个区块之间自己拼。</p>
          </div>
          <button className="antd-btn" onClick={() => onNavigate('TaskCenter')}>
            <ClipboardCheck size={14} />
            <span>任务中心</span>
          </button>
        </div>
        <div className="system-map-build-summary">
          <span><strong>{capabilityBuildBacklog.pagesWithoutUsage.length}</strong> 未入路径</span>
          <span><strong>{capabilityBuildBacklog.pagesWithoutDomain.length}</strong> 未挂能力域</span>
          <span><strong>{capabilityBuildBacklog.domainAttention.length}</strong> 领域待收口</span>
          <span><strong>{capabilityBuildBacklog.plannedRoadmapItems.length}</strong> 待完成路线图</span>
        </div>
        <div className="system-map-build-grid">
          <article className="system-map-build-column">
            <div className="system-map-build-head">
              <strong>页面待补位</strong>
              <span>{capabilityBuildBacklog.pagesWithoutUsage.length + capabilityBuildBacklog.pagesWithoutDomain.length}</span>
            </div>
            <div className="system-map-build-list">
              {capabilityBuildBacklog.pagesWithoutUsage.map((item) => (
                <button
                  key={`build-usage-${item.page.id}`}
                  className="system-map-build-item"
                  aria-label={`打开待建设页面 ${item.page.id}`}
                  onClick={() => setSelectedPageMaturityId(item.page.id)}
                >
                  <strong>{item.page.title}</strong>
                  <span>路径缺失 · {pageMaturityStatusText(item.status)} · {item.score}%</span>
                  <small>{item.nextAction}</small>
                </button>
              ))}
              {capabilityBuildBacklog.pagesWithoutDomain.map((item) => (
                <button
                  key={`build-domain-${item.page.id}`}
                  className="system-map-build-item"
                  aria-label={`打开待挂能力域页面 ${item.page.id}`}
                  onClick={() => setSelectedPageMaturityId(item.page.id)}
                >
                  <strong>{item.page.title}</strong>
                  <span>能力域缺失 · {pageMaturityStatusText(item.status)} · {item.score}%</span>
                  <small>{item.nextAction}</small>
                </button>
              ))}
              {capabilityBuildBacklog.pagesWithoutUsage.length === 0 && capabilityBuildBacklog.pagesWithoutDomain.length === 0 && (
                <div className="system-map-build-empty">当前没有待补位页面</div>
              )}
            </div>
          </article>

          <article className="system-map-build-column">
            <div className="system-map-build-head">
              <strong>领域与缺口待收口</strong>
              <span>{capabilityBuildBacklog.domainAttention.length + capabilityBuildBacklog.gapItems.length}</span>
            </div>
            <div className="system-map-build-list">
              {capabilityBuildBacklog.domainAttention.map((app) => (
                <button
                  key={`build-domain-app-${app.id}`}
                  className="system-map-build-item"
                  aria-label={`打开待收口领域 ${app.id}`}
                  onClick={() => onNavigate('DomainApps')}
                >
                  <strong>{app.name}</strong>
                  <span>领域收口 · {app.runtime_status} · {app.risk_level}</span>
                  <small>{app.next_action}</small>
                </button>
              ))}
              {capabilityBuildBacklog.gapItems.map((gap) => (
                <button
                  key={`build-gap-${gap.id}`}
                  className="system-map-build-item"
                  aria-label={`打开能力缺口 ${gap.id}`}
                  onClick={() => setSelectedGapId(gap.id)}
                >
                  <strong>{gap.title}</strong>
                  <span>能力缺口 · {gap.severity}</span>
                  <small>{gap.next}</small>
                </button>
              ))}
              {capabilityBuildBacklog.domainAttention.length === 0 && capabilityBuildBacklog.gapItems.length === 0 && (
                <div className="system-map-build-empty">当前没有待收口领域和显性缺口</div>
              )}
            </div>
          </article>

          <article className="system-map-build-column">
            <div className="system-map-build-head">
              <strong>路线图与草稿承接</strong>
              <span>{capabilityBuildBacklog.plannedRoadmapItems.length + capabilityBuildBacklog.actionableDrafts.length}</span>
            </div>
            <div className="system-map-build-list">
              {capabilityBuildBacklog.plannedRoadmapItems.map((item) => (
                <button
                  key={`build-roadmap-${item.id}`}
                  className="system-map-build-item"
                  aria-label={`打开待完成路线图 ${item.id}`}
                  onClick={() => onNavigate(item.cockpit_page)}
                >
                  <strong>{item.title}</strong>
                  <span>路线图 · {item.priority} · {item.status}</span>
                  <small>{item.problem}</small>
                </button>
              ))}
              {capabilityBuildBacklog.actionableDrafts.map((task) => (
                <button
                  key={`build-draft-${task.id}`}
                  className="system-map-build-item"
                  aria-label={`打开建设草稿 ${task.title}`}
                  onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: task.source?.id || task.id }, draftTasks), onNavigate, onOpenTarget)}
                >
                  <strong>{task.title}</strong>
                  <span>{draftSourceLabel(task.source?.type)} · {task.priority || 'medium'}</span>
                  <small>{task.description || task.source?.title || '进入任务中心承接建设草稿。'}</small>
                </button>
              ))}
              {capabilityBuildBacklog.plannedRoadmapItems.length === 0 && capabilityBuildBacklog.actionableDrafts.length === 0 && (
                <div className="system-map-build-empty">当前没有待承接路线图和草稿</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>能力路线图</h2>
            <p className="text-muted">把“感觉缺功能”拆成优先级、页面入口、动作和验收标准。</p>
          </div>
          <span className="status-badge degraded">
            <AlertTriangle size={13} />
            P0 {systemMap.roadmap.summary.p0}
          </span>
        </div>
        <div className="system-map-roadmap-grid">
          {systemMap.roadmap.lanes.map((lane) => (
            <article className="system-map-roadmap-lane" key={lane.id}>
              <div className="system-map-roadmap-lane-title">
                <h3>{lane.title}</h3>
                <span>{lane.items.length}</span>
              </div>
              <div className="system-map-roadmap-list">
                {lane.items.map((item) => {
                  const page = pagesById.get(item.cockpit_page);
                  return (
                    <div className="system-map-roadmap-item" key={item.id}>
                      <div className="system-map-roadmap-meta">
                        <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span>
                        <span>{item.priority}</span>
                        <span>{item.domain}</span>
                      </div>
                      <h4>{item.title}</h4>
                      <p>{item.problem}</p>
                      <div className="system-map-roadmap-body">
                        <div>
                          <strong>动作</strong>
                          <ul>
                            {item.actions.slice(0, 2).map((action) => <li key={action}>{action}</li>)}
                          </ul>
                        </div>
                        <div>
                          <strong>验收</strong>
                          <ul>
                            {item.acceptance.slice(0, 2).map((acceptance) => <li key={acceptance}>{acceptance}</li>)}
                          </ul>
                        </div>
                      </div>
                      {page && <PageButton page={page} onNavigate={onNavigate} />}
                      <SourceRefList
                        refs={item.source_refs}
                        compact
                        onInspect={inspectSourceRef}
                        activeTarget={activeSourceTarget}
                      />
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>站点结构</h2>
            <p className="text-muted">按人的使用场景组织，而不是按代码目录硬塞。</p>
          </div>
          <span className="status-badge online"><CheckCircle size={13} /> 原生导航</span>
        </div>
        <div className="system-map-page-groups">
          {pageGroups.map(([group, pages]) => (
            <article className="system-map-group" key={group}>
              <h3>{group}</h3>
              <div className="system-map-page-list">
                {pages.map((page) => (
                  <button key={page.id} className="system-map-page-row" onClick={() => onNavigate(page.id)}>
                    <span>
                      <strong>{page.title}</strong>
                      <small>{page.purpose}</small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>页面能力成熟度</h2>
            <p className="text-muted">按页面核对项目、能力域、使用路径、操作清单、路线图和受控动作，找出薄弱页面。</p>
          </div>
          <div className="system-map-page-maturity-summary">
            <span className="online">可日用 {pageMaturitySummary.ready}</span>
            <span className="degraded">观察 {pageMaturitySummary.watch}</span>
            <span className="offline">待补 {pageMaturitySummary.gap}</span>
          </div>
        </div>
        {selectedPageMaturity && (
          <section className="system-map-page-focus" aria-label="当前聚焦页面">
            <div className="system-map-page-focus-head">
              <div>
                <span className={`status-badge ${statusClass(selectedPageMaturity.status)}`}>
                  {pageMaturityStatusText(selectedPageMaturity.status)} · {selectedPageMaturity.score}%
                </span>
                <h3>{selectedPageMaturity.page.title}</h3>
                <p>{selectedPageMaturity.page.group} · {selectedPageMaturity.page.id} · {selectedPageMaturity.page.purpose}</p>
              </div>
              <button className="antd-btn" onClick={() => onNavigate(selectedPageMaturity.page.id)}>
                <ArrowRight size={14} />
                <span>进入页面</span>
              </button>
            </div>
            <div className="system-map-page-focus-grid">
              <div className="system-map-page-focus-panel">
                <strong>当前缺口</strong>
                <div className="system-map-page-focus-signals">
                  {selectedPageGapSignals.length > 0 ? selectedPageGapSignals.map((signal) => (
                    <article className="system-map-page-focus-signal" key={signal.id}>
                      <span>{signal.title}</span>
                      <small>{signal.detail}</small>
                    </article>
                  )) : (
                    <div className="system-map-page-focus-empty">当前页面的主要能力维度已接齐。</div>
                  )}
                </div>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>已接资产</strong>
                <div className="system-map-page-focus-links">
                  <span>项目 {selectedPageMaturity.projects.length}</span>
                  <span>能力域 {selectedPageMaturity.domains.length}</span>
                  <span>路径 {selectedPageMaturity.usagePaths.length}</span>
                  <span>清单 {selectedPageMaturity.playbookSteps.length}</span>
                  <span>路线图 {selectedPageMaturity.roadmapItems.length}</span>
                  <span>动作 {selectedPageMaturity.operatorActions.length}</span>
                </div>
                <small className="system-map-page-focus-next">{selectedPageMaturity.nextAction}</small>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>反向修复入口</strong>
                <div className="system-map-page-focus-actions-grid">
                  {selectedPageMaturity.usagePaths.slice(0, 2).map((path) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`page-path-${path.id}`}
                      onClick={() => setSelectedUsagePathId(path.id)}
                    >
                      <span>查看路径</span>
                      <small>{path.title}</small>
                    </button>
                  ))}
                  {selectedPagePlaybooks.slice(0, 2).map((playbook) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`page-playbook-${playbook.id}`}
                      onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: playbook.id }, draftTasks), onNavigate, onOpenTarget)}
                    >
                      <span>查看清单</span>
                      <small>{playbook.title}</small>
                    </button>
                  ))}
                  {selectedPageDrafts.slice(0, 1).map((draft) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`page-draft-${draft.id}`}
                      onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedPageMaturity.page.id }, draftTasks), onNavigate, onOpenTarget)}
                    >
                      <span>查看页面草稿</span>
                      <small>{draft.title}</small>
                    </button>
                  ))}
                  {selectedPageMaturity.roadmapItems.slice(0, 1).map((item) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`page-roadmap-${item.id}`}
                      onClick={() => onNavigate(item.cockpit_page)}
                    >
                      <span>查看路线图</span>
                      <small>{item.title}</small>
                    </button>
                  ))}
                  {selectedPageMaturity.usagePaths.length === 0
                    && selectedPagePlaybooks.length === 0
                    && selectedPageDrafts.length === 0
                    && selectedPageMaturity.roadmapItems.length === 0 && (
                      <div className="system-map-page-focus-empty">这页还缺直接修复入口，先去任务中心处理页面草稿。</div>
                    )}
                </div>
              </div>
            </div>
          </section>
        )}
        <div className="system-map-page-maturity-grid">
          {pageMaturity.map((item) => (
            <article
              className={`system-map-page-maturity-card ${statusClass(item.status)} ${selectedPageMaturityId === item.page.id ? 'active' : ''}`}
              key={item.page.id}
            >
              <div className="system-map-page-maturity-head">
                <div>
                  <h3>{item.page.title}</h3>
                  <small>{item.page.group} · {item.page.id}</small>
                </div>
                <span className={`status-badge ${statusClass(item.status)}`}>
                  {pageMaturityStatusText(item.status)} · {item.score}%
                </span>
              </div>
              <p>{item.page.purpose}</p>
              <div className="system-map-page-maturity-metrics">
                <span>项目 <strong>{item.projects.length}</strong></span>
                <span>能力域 <strong>{item.domains.length}</strong></span>
                <span>路径 <strong>{item.usagePaths.length}</strong></span>
                <span>清单 <strong>{item.playbookSteps.length}</strong></span>
                <span>路线图 <strong>{item.roadmapItems.length}</strong></span>
                <span>动作 <strong>{item.actions}</strong></span>
              </div>
              <div className="system-map-page-maturity-tags">
                {item.projects.slice(0, 4).map((project) => <em key={project.id}>{project.id}</em>)}
                {item.domains.slice(0, 3).map((domain) => <em key={domain.id}>{domain.title}</em>)}
                {item.usagePaths.slice(0, 2).map((path) => <em key={path.id}>{path.title}</em>)}
              </div>
              {item.operatorActions.length > 0 && (
                <div className="system-map-page-maturity-actions" aria-label="页面受控动作证据">
                  <span>受控动作</span>
                  {item.operatorActions.slice(0, 4).map((action) => <code key={action}>{action}</code>)}
                  {item.operatorActions.length > 4 && <small>+{item.operatorActions.length - 4}</small>}
                </div>
              )}
              <strong className="system-map-page-maturity-next">{item.nextAction}</strong>
              <div className="system-map-page-maturity-card-actions">
                <button className="antd-btn" onClick={() => setSelectedPageMaturityId(item.page.id)}>
                  <span>查看剖面</span>
                </button>
                <button className="antd-btn" onClick={() => onNavigate(item.page.id)}>
                  <ArrowRight size={14} />
                  <span>进入页面</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>使用路径</h2>
            <p className="text-muted">常用目标直接串页面，减少在侧边栏里猜。</p>
          </div>
          <Route size={18} className="text-muted" />
        </div>
        <div className="system-map-path-grid">
          {systemMap.usage_paths.map((path) => (
            <article className="system-map-path" key={path.id}>
              <div>
                <h3>{path.title}</h3>
                <p>{path.intent}</p>
              </div>
              <div className="system-map-step-row">
                {path.pages.map((page, index) => (
                  <React.Fragment key={page.id}>
                    {index > 0 && <ArrowRight size={13} className="text-muted" />}
                    <PageButton page={page} onNavigate={onNavigate} />
                  </React.Fragment>
                ))}
              </div>
              <SourceRefList
                refs={path.source_refs}
                compact
                onInspect={inspectSourceRef}
                activeTarget={activeSourceTarget}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>操作清单</h2>
            <p className="text-muted">把常用路径拆成可执行步骤：入口、动作、证据和完成标准都摆出来。</p>
          </div>
          <span className="status-badge online">
            <ClipboardCheck size={13} />
            {systemMap.summary.playbooks}
          </span>
        </div>
        <div className="system-map-playbook-grid">
          {systemMap.playbooks.map((playbook) => (
            <article className="system-map-playbook" key={playbook.id}>
              <div className="system-map-playbook-head">
                <div>
                  <h3>{playbook.title}</h3>
                  <p>{playbook.goal}</p>
                </div>
                <span className={`status-badge ${statusClass(playbook.risk)}`}>{playbook.frequency}</span>
              </div>
              <div className="system-map-playbook-meta">
                <span>{playbook.owner}</span>
                <span>{playbook.risk}</span>
              </div>
              <SourceRefList
                refs={playbook.source_refs}
                compact
                onInspect={inspectSourceRef}
                activeTarget={activeSourceTarget}
              />
              <div className="system-map-playbook-steps">
                {playbook.steps.map((step, index) => (
                  <div className="system-map-playbook-step" key={step.id}>
                    <span className="system-map-step-index">{index + 1}</span>
                    <div className="system-map-playbook-copy">
                      <strong>{step.action}</strong>
                      <small>证据：{step.evidence}</small>
                      <small>完成：{step.done_when}</small>
                    </div>
                    <button className="antd-btn system-map-step-btn" onClick={() => onNavigate(step.page.id)}>
                      <span>{step.page.title}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>架构层级覆盖</h2>
            <p className="text-muted">层级来自项目注册表，页面只做入口映射。</p>
          </div>
          <Layers size={18} className="text-muted" />
        </div>
        <div className="system-map-layer-grid">
          {systemMap.layers.map((layer) => (
            <article className="system-map-layer" key={layer.id}>
              <div className="system-map-layer-header">
                <span>{layer.id}</span>
                <strong>{layer.name}</strong>
              </div>
              <div className="system-map-chip-row">
                {layer.projects.map((project) => (
                  <button
                    key={project.id}
                    className={`system-map-chip ${statusClass(project.coverage)}`}
                    onClick={() => onNavigate(project.cockpit_page)}
                    title={`${project.role} · ${project.stack}`}
                  >
                    {project.id}
                  </button>
                ))}
              </div>
              <SourceRefList
                refs={layer.source_refs}
                compact
                onInspect={inspectSourceRef}
                activeTarget={activeSourceTarget}
              />
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>功能域覆盖</h2>
            <p className="text-muted">能力域来自功能能力地图，Cockpit 负责把它们指到可操作页面。</p>
          </div>
          <Compass size={18} className="text-muted" />
        </div>
        {selectedFeatureDomain && (
          <section className="system-map-page-focus" aria-label="当前聚焦能力域">
            <div className="system-map-page-focus-head">
              <div>
                <span className={`status-badge ${statusClass(selectedFeatureDomain.coverage)}`}>
                  {selectedFeatureDomain.coverage === 'native' ? '原生能力域' : selectedFeatureDomain.coverage}
                </span>
                <h3>{selectedFeatureDomain.title}</h3>
                <p>{selectedFeatureDomain.english || 'Capability Domain'} · {selectedFeatureDomain.id} · 页面 {selectedFeatureDomain.cockpit_page}</p>
              </div>
              {selectedFeaturePage && (
                <button className="antd-btn" onClick={() => onNavigate(selectedFeaturePage.id)}>
                  <ArrowRight size={14} />
                  <span>进入页面</span>
                </button>
              )}
            </div>
            <div className="system-map-page-focus-grid">
              <div className="system-map-page-focus-panel">
                <strong>当前缺口</strong>
                <div className="system-map-page-focus-signals">
                  {selectedFeatureSignals.map((signal) => (
                    <article className="system-map-page-focus-signal" key={signal.id}>
                      <span>{signal.title}</span>
                      <small>{signal.detail}</small>
                    </article>
                  ))}
                </div>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>能力接入面</strong>
                <div className="system-map-page-focus-links">
                  <span>提供方 {selectedFeatureDomain.providers.length}</span>
                  <span>能力项 {selectedFeatureDomain.capability_items.length}</span>
                  <span>项目 {selectedFeatureProjects.length}</span>
                  <span>路径 {selectedFeatureUsagePaths.length}</span>
                  <span>清单 {selectedFeaturePlaybooks.length}</span>
                  <span>路线图 {selectedFeatureRoadmapItems.length}</span>
                </div>
                <small className="system-map-page-focus-next">
                  {selectedFeaturePageMaturity?.nextAction || '把能力域接进页面、路径、清单和路线图。'}
                </small>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>提供方与能力项</strong>
                <div className="system-map-page-focus-signals">
                  <div className="system-map-page-focus-signal">
                    <span>提供方</span>
                    <small>{selectedFeatureDomain.providers.length > 0 ? selectedFeatureDomain.providers.join(' · ') : '未登记'}</small>
                  </div>
                  <div className="system-map-page-focus-signal">
                    <span>能力项</span>
                    <small>{selectedFeatureDomain.capability_items.length > 0 ? selectedFeatureDomain.capability_items.join(' · ') : '未登记'}</small>
                  </div>
                </div>
              </div>
              <div className="system-map-page-focus-panel">
                <strong>反向修复入口</strong>
                <div className="system-map-page-focus-actions-grid">
                  {selectedFeatureUsagePaths.slice(0, 2).map((path) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`feature-path-${path.id}`}
                      onClick={() => setSelectedUsagePathId(path.id)}
                    >
                      <span>查看路径</span>
                      <small>{path.title}</small>
                    </button>
                  ))}
                  {selectedFeaturePlaybooks.slice(0, 2).map((playbook) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`feature-playbook-${playbook.id}`}
                      onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: playbook.id }, draftTasks), onNavigate, onOpenTarget)}
                    >
                      <span>查看清单</span>
                      <small>{playbook.title}</small>
                    </button>
                  ))}
                  {selectedFeatureDrafts.slice(0, 1).map((draft) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`feature-draft-${draft.id}`}
                      onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: selectedFeatureDomain.cockpit_page }, draftTasks), onNavigate, onOpenTarget)}
                    >
                      <span>查看页面草稿</span>
                      <small>{draft.title}</small>
                    </button>
                  ))}
                  {selectedFeatureRoadmapItems.slice(0, 1).map((item) => (
                    <button
                      className="system-map-page-focus-action"
                      key={`feature-roadmap-${item.id}`}
                      onClick={() => onNavigate(item.cockpit_page)}
                    >
                      <span>查看路线图</span>
                      <small>{item.title}</small>
                    </button>
                  ))}
                  {selectedFeatureUsagePaths.length === 0
                    && selectedFeaturePlaybooks.length === 0
                    && selectedFeatureDrafts.length === 0
                    && selectedFeatureRoadmapItems.length === 0 && (
                      <div className="system-map-page-focus-empty">这个能力域还缺直接修复入口，先补页面与路径映射。</div>
                    )}
                </div>
              </div>
            </div>
          </section>
        )}
        <div className="system-map-domain-grid">
          {systemMap.feature_domains.map((domain) => {
            const page = pagesById.get(domain.cockpit_page);
            return (
              <article className={`system-map-domain ${selectedFeatureDomainId === domain.id ? 'active' : ''}`} key={domain.id}>
                <div>
                  <h3>{domain.title}</h3>
                  <p>{domain.english || 'Capability Domain'}</p>
                </div>
                <div className="system-map-provider-line">
                  {domain.providers.slice(0, 5).map((provider) => (
                    <span key={provider}>{provider}</span>
                  ))}
                </div>
                <SourceRefList
                  refs={domain.source_refs}
                  compact
                  onInspect={inspectSourceRef}
                  activeTarget={activeSourceTarget}
                />
                <div className="system-map-page-maturity-card-actions">
                  <button className="antd-btn" onClick={() => setSelectedFeatureDomainId(domain.id)}>
                    <span>查看剖面</span>
                  </button>
                  {page && <PageButton page={page} onNavigate={onNavigate} />}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>领域应用覆盖</h2>
            <p className="text-muted">把家庭驾驶舱、OPC 和 family-hub 从应用中心拉进总图，先看健康、运行和安全门。</p>
          </div>
          <span className={`status-badge ${statusClass(systemMap.domain_apps.status)}`}>
            <ShieldAlert size={13} />
            {systemMap.domain_apps.summary.score}%
          </span>
        </div>
        <div className="system-map-domain-app-summary">
          <span><strong>{systemMap.domain_apps.summary.ready}</strong> ready</span>
          <span><strong>{systemMap.domain_apps.summary.running}</strong> running</span>
          <span><strong>{systemMap.domain_apps.summary.external_mounts}</strong> external</span>
          <span><strong>{systemMap.domain_apps.summary.security_attention_apps}</strong> security attention</span>
        </div>
        <div className="system-map-domain-app-grid">
          {systemMap.domain_apps.items.map((app) => (
            <article className={`system-map-domain-app-card ${statusClass(app.security_posture)}`} key={app.id}>
              <div className="system-map-domain-app-head">
                <div>
                  <h3>{app.name}</h3>
                  <p>{app.domain?.name || app.kind} · {app.integration_mode}</p>
                </div>
                <span className={`status-badge ${statusClass(app.security_posture)}`}>
                  {app.security_posture}
                </span>
              </div>
              <div className="system-map-domain-app-metrics">
                <span className={statusClass(app.health)}>健康 {app.health}</span>
                <span className={statusClass(app.runtime_status)}>运行 {app.runtime_status}</span>
                <span className={statusClass(app.risk_level)}>风险 {app.risk_level}</span>
                <span>动作 {app.action_count}</span>
              </div>
              <div className="system-map-domain-app-capabilities">
                {app.read_capabilities.slice(0, 3).map((item) => (
                  <span key={`${app.id}-read-${item}`}>读 {item}</span>
                ))}
                {app.write_capabilities.slice(0, 3).map((item) => (
                  <span className="degraded" key={`${app.id}-write-${item}`}>写 {item}</span>
                ))}
              </div>
              <strong className="system-map-domain-app-next">{app.next_action}</strong>
              <div className="system-map-domain-app-actions">
                {app.launch_url && (
                  <a className="antd-btn" href={app.launch_url} rel="noreferrer" target="_blank">
                    <ExternalLink size={13} />
                    <span>打开</span>
                  </a>
                )}
                <button className="antd-btn" onClick={() => onNavigate('DomainApps')}>
                  <ArrowRight size={13} />
                  <span>应用中心</span>
                </button>
              </div>
            </article>
          ))}
        </div>
        {systemMap.domain_apps.attention_items.length > 0 && (
          <div className="system-map-domain-app-attention">
            <strong>优先处理：</strong>
            {systemMap.domain_apps.attention_items.map((app) => (
              <span className={statusClass(app.security_posture)} key={app.id} title={app.next_action}>
                {app.id} · {app.runtime_status}
              </span>
            ))}
          </div>
        )}
        <p className="system-map-domain-app-nextline">{systemMap.domain_apps.next_action}</p>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>项目聚焦</h2>
            <p className="text-muted">把项目矩阵切成可处理队列：运行、验证、目录和日用状态都能直接定位。</p>
          </div>
          <span className="status-badge degraded">
            <AlertTriangle size={13} />
            {systemMap.project_focus.summary.needs_action}
          </span>
        </div>
        <div className="system-map-project-focus-grid">
          {projectFocusOptions.map((queue) => (
            <button
              key={queue.id}
              className={`system-map-project-focus ${projectFilter === queue.id ? 'active' : ''} ${statusClass(queue.severity)}`}
              onClick={() => setProjectFilter(queue.id)}
              title={queue.reason}
            >
              <span>{queue.title}</span>
              <strong>{queue.count}</strong>
              <small>{queue.reason}</small>
              {queue.top_projects.length > 0 && (
                <div className="system-map-project-focus-hits">
                  {queue.top_projects.slice(0, 4).map((project) => (
                    <em key={project.id}>{project.id}</em>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>排查命令队列</h2>
            <p className="text-muted">把运行探针、验证证据和项目清单缺口转换成可复制命令，仍由人确认后执行。</p>
          </div>
          <div className="system-map-section-actions">
            <button
              className="antd-btn antd-btn-primary"
              aria-label="批量承接全站缺口"
              disabled={bulkTriagePending}
              onClick={() => void queueCoverageDrafts()}
              title="把项目组合、领域应用、能力缺口和页面成熟度草稿统一登记为 OMO 计划任务"
            >
              <Layers size={13} />
              <span>{bulkTriagePending ? '正在承接' : '承接全站缺口'}</span>
            </button>
            <button
              className="antd-btn antd-btn-primary"
              aria-label="批量承接验证缺口"
              disabled={bulkTriagePending || systemMap.project_triage.summary.verification_commands === 0}
              onClick={() => void queueVerificationTriage()}
              title="只登记已有验证命令为 OMO 计划任务，不会直接执行"
            >
              <ClipboardCheck size={13} />
              <span>{bulkTriagePending ? '正在承接' : '承接验证缺口'}</span>
            </button>
            <button
              className="antd-btn"
              aria-label="批量承接运行探针"
              disabled={bulkTriagePending || systemMap.project_triage.summary.runtime_commands === 0}
              onClick={() => void queueRuntimeTriage()}
              title="优先登记端口检查；无端口时登记端口注册排查，不会直接执行"
            >
              <Server size={13} />
              <span>{bulkTriagePending ? '正在承接' : '承接运行探针'}</span>
            </button>
            <span className="status-badge degraded">
              <ClipboardCheck size={13} />
              {filteredTriageCommandCount} / {systemMap.project_triage.summary.total_commands} · 已承接 {systemMap.project_triage.summary.queued_commands || 0}
            </span>
          </div>
        </div>
        <ProjectTriageQueues
          queues={filteredTriageQueues}
          onQueueCommand={(command) => void queueProjectTriageCommand(command)}
          onOpenTarget={onOpenTarget}
        />
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>能力覆盖矩阵</h2>
            <p className="text-muted">按入口、文档、命令、清单、运行、验证、来源和动作检查每个项目的可用度。</p>
          </div>
          <span className={`status-badge ${statusClass(systemMap.project_capability_coverage.summary.score >= 80 ? 'ready' : 'warning')}`}>
            <ShieldAlert size={13} />
            {systemMap.project_capability_coverage.summary.score}%
          </span>
        </div>
        <div className="system-map-coverage-filterbar">
          {coverageFilterOptions.map((dimension) => (
            <button
              className={`system-map-coverage-filter ${coverageFilter === dimension.id ? 'active' : ''} ${statusClass(dimension.status)}`}
              key={dimension.id}
              aria-label={`筛选覆盖维度：${dimension.title}`}
              onClick={() => setCoverageFilter(dimension.id)}
              title={dimension.description}
            >
              <span>{dimension.title}</span>
              <strong>{dimension.score}%</strong>
            </button>
          ))}
        </div>
        <div className="system-map-coverage-grid">
          {systemMap.project_capability_coverage.dimension_summary.map((dimension) => (
            <button
              className={`system-map-coverage-card ${coverageFilter === dimension.id ? 'active' : ''} ${statusClass(dimension.status)}`}
              key={dimension.id}
              aria-label={`查看覆盖维度：${dimension.title}`}
              onClick={() => setCoverageFilter(dimension.id)}
              title={`${dimension.description} 点击后只看该维度未就绪项目。`}
            >
              <div className="system-map-coverage-head">
                <div>
                  <h3>{dimension.title}</h3>
                  <p>{dimension.description}</p>
                </div>
                <strong>{dimension.score}%</strong>
              </div>
              <div className="system-map-coverage-counts">
                <span className="online">就绪 {dimension.ready}</span>
                <span className="degraded">提醒 {dimension.warning}</span>
                <span className="offline">缺口 {dimension.failed}</span>
              </div>
              {dimension.attention_projects.length > 0 && (
                <div className="system-map-coverage-attention">
                  {dimension.attention_projects.map((project) => (
                    <span className={statusClass(project.status)} key={`${dimension.id}-${project.id}`} title={project.next_action}>
                      {project.id}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
        {systemMap.project_capability_coverage.weakest_dimensions.length > 0 && (
          <div className="system-map-coverage-weak">
            <strong>优先补：</strong>
            {systemMap.project_capability_coverage.weakest_dimensions.map((dimension) => (
              <span key={dimension.id}>{dimension.title} {dimension.score}%</span>
            ))}
          </div>
        )}
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div>
            <h2>项目矩阵</h2>
            <p className="text-muted">所有项目先能被定位，再按聚焦队列处理运行、验证和状态缺口。</p>
          </div>
          <BookOpen size={18} className="text-muted" />
        </div>
        <div className="system-map-project-tools">
          <label className="system-map-project-search">
            <Search size={14} />
            <input
              value={projectQuery}
              onChange={(event) => setProjectQuery(event.target.value)}
              placeholder="搜索项目、层级、职责或下一步"
            />
          </label>
          <div className="system-map-project-filter-state">
            {activeCoverage && coverageFilter !== 'all' && (
              <span>
                覆盖维度：{activeCoverage.title}
                <button onClick={() => setCoverageFilter('all')}>清除</button>
              </span>
            )}
            {activePortfolioBucket && (
              <span>
                组合态势：{activePortfolioBucket.title}
                <button onClick={() => setPortfolioFilter('all')}>清除</button>
              </span>
            )}
            <span className="text-muted">
              显示 {filteredProjects.length} / {systemMap.projects.length} · 命令 {filteredTriageCommandCount}
            </span>
          </div>
        </div>
        <div className="system-map-table-wrap">
          <table className="services-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>层级</th>
                <th>职责</th>
                <th>入口</th>
                <th>状态</th>
                <th>运行</th>
                <th>诊断</th>
                <th>文档</th>
                <th>命令</th>
                <th>覆盖</th>
                <th>动作</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const page = pagesById.get(project.cockpit_page);
                return (
                  <tr key={project.id}>
                    <td>
                      <button
                        className="system-map-project-name-btn"
                        onClick={() => setSelectedProjectId(project.id)}
                        aria-label={`查看 ${project.id} 项目详情`}
                      >
                        {project.id}
                      </button>
                    </td>
                    <td>{project.layer}</td>
                    <td>{project.role || project.stack}</td>
                    <td>
                      {page ? (
                        <button className="antd-btn system-map-table-btn" onClick={() => onNavigate(page.id)}>
                          {page.title}
                        </button>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(project.operational.status)}`}>
                        {projectStatusText(project.operational.status)}
                      </span>
                      {project.operational.risks.length > 0 && (
                        <div className="system-map-risk-line">
                          {project.operational.risks.slice(0, 2).join(' / ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(project.runtime.status)}`}>
                        {runtimeStatusText(project.runtime.status)}
                      </span>
                      <div className="system-map-risk-line">
                        {runtimeProfileText(project.runtime.profile)} · {project.runtime.probe_reason}
                      </div>
                      {project.runtime.ports.length > 0 && (
                        <div className="system-map-port-list">
                          {project.runtime.ports.slice(0, 3).map((port) => (
                            <span key={port.port} className={port.listening ? 'online' : 'offline'}>
                              :{port.port}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className={`system-map-risk-line ${statusClass(project.runtime.latest_verification.status)}`}>
                        {verifyText(project.runtime.latest_verification.status)}
                        {project.runtime.latest_verification.ts ? ` · ${shortDate(project.runtime.latest_verification.ts)}` : ''}
                      </div>
                    </td>
                    <td>
                      <div className="system-map-diagnostic-list">
                        {project.diagnostics.slice(0, 2).map((diagnostic) => (
                          <div className={`system-map-diagnostic ${statusClass(diagnostic.severity)}`} key={diagnostic.id}>
                            <strong>{diagnostic.title}</strong>
                            <small>{diagnostic.detail}</small>
                            <small>下一步：{diagnostic.next_action}</small>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {project.operational.docs.present} / {project.operational.docs.expected}
                      {project.operational.manifests.length > 0 && (
                        <div className="system-map-risk-line">
                          {project.operational.manifests.map((item) => item.name).join(' / ')}
                        </div>
                      )}
                    </td>
                    <td>
                      {project.operational.commands.length > 0 ? (
                        <div className="system-map-command-list">
                          {project.operational.commands.slice(0, 2).map((command) => <code key={command}>{command}</code>)}
                        </div>
                      ) : (
                        <span className="text-muted">待登记</span>
                      )}
                      <div className="system-map-risk-line">{project.operational.next_action}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(project.coverage)}`}>
                        {project.coverage === 'native' ? '原生/可操作' : '定位/待补'}
                      </span>
                      <div className="system-map-coverage-cell">
                        {project.coverage_checks.slice(0, 8).map((check) => (
                          <span className={statusClass(check.status)} key={check.id} title={`${check.detail} 下一步：${check.next_action}`}>
                            {check.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="system-map-project-action online" onClick={() => setSelectedProjectId(project.id)}>
                        <BookOpen size={12} />
                        <span>详情</span>
                      </button>
                      <ProjectActionList
                        actions={project.actions}
                        onNavigate={onNavigate}
                        onQueueAction={(action) => void queueProjectAction(project.id, action)}
                      />
                      {project.triage_commands.length > 0 && (
                        <div className="system-map-triage-inline">
                          <small>排查</small>
                          <ProjectActionList actions={project.triage_commands} onNavigate={onNavigate} />
                        </div>
                      )}
                    </td>
                    <td>
                      <SourceRefList
                        refs={project.source_refs}
                        compact
                        onInspect={inspectSourceRef}
                        activeTarget={activeSourceTarget}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (
            <div className="system-map-project-empty">
              <Search size={15} />
              <span>当前筛选没有匹配项目</span>
            </div>
          )}
        </div>
      </section>

      <section className="system-map-bottom-grid">
        <div className="services-section system-map-section">
          <div className="section-header">
            <div>
              <h2>能力缺口</h2>
              <p className="text-muted">把“感觉缺功能”翻译成可推进的下一步。</p>
            </div>
            <ShieldAlert size={18} className="text-muted" />
          </div>
          <div className="system-map-gap-list">
            {systemMap.gaps.map((gap) => (
              <button
                className={`system-map-gap ${selectedGapId === gap.id ? 'active' : ''}`}
                key={gap.id}
                onClick={() => setSelectedGapId(gap.id)}
                title={gap.next}
              >
                <span className={`status-badge ${statusClass(gap.severity)}`}>{gap.severity}</span>
                <div>
                  <h3>{gap.title}</h3>
                  <p>{gap.evidence}</p>
                  <strong>{gap.next}</strong>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="services-section system-map-section">
          <div className="section-header">
            <div>
              <h2>权威读源</h2>
              <p className="text-muted">页面只读这些 SSOT，不自己维护易漂移事实。</p>
            </div>
            <ExternalLink size={18} className="text-muted" />
          </div>
          <div className="system-map-source-list">
            {Object.entries(systemMap.source_paths).map(([key, source]) => (
              <div className="system-map-source-row" key={key} title={source.path}>
                <span className={`status-badge ${source.exists ? 'online' : 'offline'}`}>
                  {source.exists ? '可读' : '缺失'}
                </span>
                <div>
                  <strong>{sourceLabels[key] || key}</strong>
                  <small>{compactPath(source.path)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
