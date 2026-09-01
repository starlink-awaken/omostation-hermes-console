import { type CockpitNavigationTarget } from '../cockpitNavigation';

export type DomainApp = {
  id: string;
  name: string;
  domain: { id: string; name: string };
  kind: string;
  integration_mode: string;
  layer: string;
  risk_level: 'low' | 'medium' | 'high' | string;
  health: string;
  runtime: {
    status: string;
    launch: { status: string; url?: string | null; checked: boolean; port?: number };
    api: { status: string; url?: string | null; checked: boolean; port?: number };
  };
  warnings: string[];
  paths: {
    ssot_root?: { path: string; exists: boolean; updated_at?: string | null } | null;
    app_root?: { path: string; exists: boolean; updated_at?: string | null } | null;
  };
  links: { launch_url?: string | null; api_url?: string | null };
  actions: {
    id: string;
    label: string;
    kind: 'open_url' | 'internal_link' | 'copy_command' | string;
    value: string;
    enabled: boolean;
    risk: string;
    guard: string;
  }[];
  security_gates: {
    id: string;
    level: string;
    title: string;
    detail: string;
  }[];
  security_checks: {
    id: string;
    status: string;
    level: string;
    title: string;
    detail: string;
    evidence: string;
    next_action: string;
    blocking: boolean;
    source?: { path: string; exists: boolean; is_dir?: boolean; updated_at?: string | null } | null;
  }[];
  security_summary: {
    posture: string;
    total: number;
    passed: number;
    warn: number;
    failed: number;
    blocking: number;
    attention: number;
    high_risk_open: number;
  };
  commands: { start?: string | null; verify: string[] };
  capabilities: { read: string[]; write: string[] };
  auth: Record<string, string>;
  freshness: Record<string, string | null | undefined>;
  notes: string[];
};

export type DomainAppsPayload = {
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
  };
  items: DomainApp[];
};

export type DomainBuildProject = {
  id: string;
  layer?: string;
  cockpit_page?: string;
  status?: string;
  score?: number;
  primary_gap?: string;
  next_action?: string;
};

export type DomainBuildRoadmapItem = {
  id: string;
  priority?: string;
  status?: string;
  title?: string;
  cockpit_page?: string;
  problem?: string;
};

export type DomainBuildRow = {
  id: string;
  kind: 'project' | 'roadmap';
  title: string;
  meta: string;
  summary: string;
  nextAction: string;
  statusClass: string;
  entryTarget: CockpitNavigationTarget;
  coverageTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

export type OpcWorkspace = {
  exists: boolean;
  ssot_root: string;
  updated_at?: string | null;
  positioning?: { title: string; summary: string };
  weekly_priorities: { title: string; detail: string }[];
  content_calendar: {
    week: Record<string, string>[];
    ideas: Record<string, string>[];
  };
  metrics: { name: string; items: Record<string, string>[] }[];
  product_portfolio: {
    matrix: Record<string, string>[];
    pipeline: Record<string, string>[];
    revenue: Record<string, string>[];
  };
  source_paths?: Record<string, string>;
};

/** Minimal system-map payload shape needed for domain-build rows. */
export type SystemMapPayload = {
  cockpit_pages?: Array<{ id?: string; title?: string }>;
  project_portfolio?: {
    priority_projects?: DomainBuildProject[];
  };
  roadmap?: {
    items?: DomainBuildRoadmapItem[];
  };
};

export type DomainAttentionFilter = 'all' | 'runtime' | 'security' | 'high_risk';

export type DomainAttentionItem = {
  app: DomainApp;
  reasons: string[];
  nextAction: string;
  filterTags: DomainAttentionFilter[];
};

export type DomainRouteCard = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  entryValue: string;
  ssotValue: string;
  handoffValue: string;
  nextAction: string;
  primaryActionLabel: string;
  primaryAction: () => void;
  secondaryActionLabel: string;
  secondaryAction?: () => void;
  launchUrl?: string | null;
};

export const EMPTY_OPC_WORKSPACE: OpcWorkspace = {
  exists: false,
  ssot_root: '@OPC',
  positioning: { title: 'OPC', summary: 'OPC 工作区当前不可用，领域应用清单仍可独立查看。' },
  weekly_priorities: [],
  content_calendar: { week: [], ideas: [] },
  metrics: [],
  product_portfolio: { matrix: [], pipeline: [], revenue: [] },
};

export const DOMAIN_SURFACE_PAGE_IDS = new Set(['DomainApps', 'QuestBoard', 'L4Health', 'Settings']);
