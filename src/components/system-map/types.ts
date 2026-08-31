import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { TaskDraftRecord } from '../taskDraftHandoff';

// == Local types ==

export type CockpitPage = {
  id: string;
  title: string;
  group: string;
  purpose: string;
  dimensions: string[];
  operator_actions?: string[];
  operator_action_details?: PageOperatorAction[];
};

export type SourceRef = {
  source_key: string;
  label: string;
  path: string;
  line?: number | null;
  exists: boolean;
  target: string;
};

export type SourcePreviewLine = {
  number: number;
  text: string;
  highlight: boolean;
};

export type SourcePreview = {
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

export type ProjectAction = {
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

export type ProjectCoverageCheck = {
  id: string;
  title: string;
  status: string;
  detail: string;
  next_action: string;
};

export type PortfolioDimension = {
  id: string;
  title: string;
  status: string;
  next_action: string;
};

export type ProjectWorkflowEvent = {
  type: string;
  status: string;
  ts?: string | null;
  summary: string;
  paths?: string[];
};

export type ProjectWorkflowRun = {
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

export type EvidenceFreshness = {
  status: 'fresh' | 'stale' | 'unknown' | string;
  age_seconds?: number | null;
  max_age_seconds?: number;
  recorded_at?: string;
  next_action?: string;
};

export type ProjectItem = {
  id: string;
  layer: string;
  stack: string;
  role: string;
  registry_contract?: {
    status?: string | null;
    version?: string | null;
    python?: string | null;
    build_backend?: string | null;
    src_dir?: string | null;
    physical_location?: string | null;
    observed_location?: string | null;
    observed_location_exists?: boolean;
    implementation_traceability?: string;
    port?: number | null;
    port_registry_ref?: string | null;
    coverage?: string[];
    missing_fields?: string[];
    status_text?: string;
  };
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
    probe_source?: string;
    port_conflicts?: {
      port: number;
      service: string;
      projects: string[];
    }[];
    probe_task?: {
      task_id?: string;
      status?: string;
      execution_audit?: Record<string, unknown>;
      human_approval_required?: boolean;
      approval_state?: string;
      next_action?: string;
      freshness?: EvidenceFreshness;
    };
    ports: {
      port: number;
      service: string;
      type: string;
      listening: boolean | null;
      probe_status?: string;
      probe_reason?: string;
      conflict_projects?: string[];
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
      closeout_status?: string;
      closeout_ref?: string | null;
      freshness?: EvidenceFreshness;
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

export type LayerItem = {
  id: string;
  name: string;
  project_count: number;
  projects: ProjectItem[];
  cockpit_pages: string[];
  source_refs: SourceRef[];
};

export type ProjectFocusQueue = {
  id: string;
  title: string;
  severity: string;
  reason: string;
  count: number;
  project_ids: string[];
  top_projects: { id: string; diagnostics: ProjectItem['diagnostics'] }[];
};

export type ProjectTriageQueue = {
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

export type CoverageAttentionProject = {
  id: string;
  status: string;
  next_action: string;
};

export type ProjectCapabilityCoverage = {
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
    documented_cells?: number;
    evidence_score?: number;
  };
};

export type DomainAppSummary = {
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

export type ProjectPortfolioBucket = {
  id: string;
  title: string;
  severity: string;
  reason: string;
  count: number;
  project_ids: string[];
};

export type ProjectPortfolioPriority = {
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

export type ProjectPortfolio = {
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

export type FeatureDomain = {
  id: string;
  title: string;
  english: string;
  capability_items: string[];
  providers: string[];
  cockpit_page: string;
  coverage: string;
  source_refs: SourceRef[];
};

export type SourcePath = {
  path: string;
  exists: boolean;
};

export type UsagePath = {
  id: string;
  title: string;
  intent: string;
  steps: string[];
  pages: CockpitPage[];
  source_refs: SourceRef[];
};

export type PlaybookStep = {
  id: string;
  page_id: string;
  action: string;
  evidence: string;
  done_when: string;
  page: CockpitPage;
};

export type OperatingPlaybook = {
  id: string;
  title: string;
  goal: string;
  frequency: string;
  owner: string;
  risk: string;
  steps: PlaybookStep[];
  source_refs: SourceRef[];
};

export type PageMaturity = {
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
  operatorActionDetails: PageOperatorAction[];
  nextAction: string;
  traceabilityStatus: 'tracked' | 'untracked';
  traceabilityNextAction: string;
  roadmapStatus: 'shipped' | 'planned';
};

export type PageOperatorAction = {
  id: string;
  label?: string;
  kind?: 'navigate' | 'queue' | string;
  risk?: 'low' | 'medium' | 'high' | string;
  description?: string;
};

export type PageMaturityGapSignal = {
  id: string;
  title: string;
  detail: string;
};

export type PageMaturityFilter = 'all' | 'ready' | 'watch' | 'gap' | 'tracked' | 'untracked';

export type PageMaturityContract = {
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
    operator_action_details?: PageOperatorAction[];
    next_action: string;
    traceability_status?: 'tracked' | 'untracked';
    traceability_next_action?: string;
    roadmap_status?: 'shipped' | 'planned';
  }[];
  attention_items: {
    page: CockpitPage;
    page_id: string;
    score: number;
    status: 'ready' | 'watch' | 'gap';
    next_action: string;
  }[];
  summary: {
    total: number;
    ready: number;
    watch: number;
    gap: number;
    score: number;
    traceability_tracked?: number;
    traceability_untracked?: number;
  };
};

export type CapabilityGap = {
  id: string;
  severity: string;
  title: string;
  evidence: string;
  next: string;
};

export type CapabilityGapScope = 'project' | 'page' | 'domain' | 'flow' | 'mixed';

export type RoadmapItem = {
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
  verification?: {
    mode?: string;
    status?: 'passed' | 'attention' | string;
    checks?: { id: string; label: string; status: string; evidence: string }[];
  };
};

export type RoadmapLane = {
  id: string;
  title: string;
  items: RoadmapItem[];
};

export type DraftTaskSource = {
  type: string;
  id: string;
  title: string;
  source_refs?: SourceRef[];
};

export type DraftTaskEvidenceField = {
  label?: string;
  value?: string;
  step_id?: string;
  page_id?: string;
  evidence?: string;
  done_when?: string;
};

export type DraftTask = {
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

export type CapabilityGapClosureRow = {
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

export type SystemMapWorkbenchRow = {
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

export type SystemMapPayload = {
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

export type SystemMapViewProps = {
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusProjectId?: string | null;
  focusUsagePathId?: string | null;
  focusGapId?: string | null;
  focusCoverageDimensionId?: string | null;
  focusPageId?: string | null;
  focusFeatureDomainId?: string | null;
  focusTaskQuery?: string;
};

// == Re-exports for internal module use ==

export type { CockpitNavigationTarget, TaskDraftRecord };
