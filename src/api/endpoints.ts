/**
 * API endpoint constants for cockpit-ui.
 * 
 * All API endpoints should be defined here to ensure:
 * - Single source of truth for URLs
 * - Easy to update when endpoints change
 * - Type safety for endpoint parameters
 */

// ── System Map ──

export const SYSTEM_MAP_ENDPOINTS = {
  /** Full system map data (cockpit pages, maturity, projects, etc.) */
  getSystemMap: '/api/cockpit/system-map',
  /** System map with all related data */
  getSystemMapFull: '/api/cockpit/system-map?include_all=true',
} as const;

// ── Tasks ──

export const TASK_ENDPOINTS = {
  /** List tasks with various filters */
  listTasks: (params?: {
    include_playbook_drafts?: boolean;
    include_project_portfolio_drafts?: boolean;
    include_verification_ready_drafts?: boolean;
    include_domain_app_drafts?: boolean;
    include_capability_gap_drafts?: boolean;
    include_page_maturity_drafts?: boolean;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.include_playbook_drafts) searchParams.set('include_playbook_drafts', 'true');
    if (params?.include_project_portfolio_drafts) searchParams.set('include_project_portfolio_drafts', 'true');
    if (params?.include_verification_ready_drafts) searchParams.set('include_verification_ready_drafts', 'true');
    if (params?.include_domain_app_drafts) searchParams.set('include_domain_app_drafts', 'true');
    if (params?.include_capability_gap_drafts) searchParams.set('include_capability_gap_drafts', 'true');
    if (params?.include_page_maturity_drafts) searchParams.set('include_page_maturity_drafts', 'true');
    if (params?.limit) searchParams.set('limit', String(params.limit));
    return `/api/tasks${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  },
  /** Get task by ID */
  getTask: (taskId: string) => `/api/tasks/${taskId}`,
  /** Update task status */
  updateTaskStatus: (taskId: string) => `/api/tasks/${taskId}/status`,
  /** Create new task */
  createTask: '/api/tasks',
} as const;

// ── Domain Apps ──

export const DOMAIN_APP_ENDPOINTS = {
  /** List domain applications */
  listDomainApps: '/api/domain-apps',
  /** Get domain app by ID */
  getDomainApp: (appId: string) => `/api/domain-apps/${appId}`,
} as const;

// ── Alerts ──

export const ALERT_ENDPOINTS = {
  /** List alerts with optional limit */
  listAlerts: (limit?: number) => `/api/alerts${limit ? `?limit=${limit}` : ''}`,
  /** Get alert by ID */
  getAlert: (alertId: string) => `/api/alerts/${alertId}`,
  /** List alert rules */
  listAlertRules: '/api/alerts/rules',
  /** Create alert rule */
  createAlertRule: '/api/alerts/rules',
} as const;

// ── BOS / Mesh Services ──

export const BOS_ENDPOINTS = {
  /** List BOS services */
  listServices: '/api/bos/services',
  /** Get service by URI */
  getService: (uri: string) => `/api/bos/services/${encodeURIComponent(uri)}`,
} as const;

// ── Compute ──

export const COMPUTE_ENDPOINTS = {
  /** Get compute status */
  getStatus: '/api/governance/compute/status',
  /** Get compute metrics */
  getMetrics: '/api/governance/compute/metrics',
} as const;

// ── Logs ──

export const LOG_ENDPOINTS = {
  /** List logs with optional limit */
  listLogs: (limit?: number) => `/api/logs${limit ? `?limit=${limit}` : ''}`,
  /** Get log by ID */
  getLog: (logId: string) => `/api/logs/${logId}`,
} as const;

// ── Research ──

export const RESEARCH_ENDPOINTS = {
  /** List research items */
  listResearch: (params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    return `/api/cockpit/research-hub${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  },
  /** Get research item by ID */
  getResearch: (itemId: string) => `/api/cockpit/research-hub/${itemId}`,
} as const;

// ── MetaOS Workflows ──

export const WORKFLOW_ENDPOINTS = {
  /** List workflows */
  listWorkflows: (params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    return `/api/metaos/workflows${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  },
  /** Get workflow by ID */
  getWorkflow: (workflowId: string) => `/api/metaos/workflows/${workflowId}`,
} as const;

// ── Ecos ──

export const ECOS_ENDPOINTS = {
  /** List skills */
  listSkills: '/api/ecos/skills',
  /** List workflows */
  listWorkflows: '/api/ecos/workflows',
  /** Get workflow backends */
  getWorkflowBackends: '/api/ecos/workflow/backends',
} as const;

// ── Pipelines ──

export const PIPELINE_ENDPOINTS = {
  /** List pipelines */
  listPipelines: '/api/pipelines',
  /** Get pipeline by ID */
  getPipeline: (pipelineId: string) => `/api/pipelines/${pipelineId}`,
} as const;

// ── Debt ──

export const DEBT_ENDPOINTS = {
  /** Get debt status */
  getDebt: '/api/debt',
  /** Get debt details */
  getDebtDetails: '/api/debt/details',
} as const;

// ── L4 Health ──

export const L4_HEALTH_ENDPOINTS = {
  /** Get L4 health status */
  getHealth: '/api/l4/health',
  /** Get L4 health details */
  getHealthDetails: '/api/l4/health/details',
} as const;

// ── Proposals ──

export const PROPOSAL_ENDPOINTS = {
  /** List proposals */
  listProposals: '/api/v1/proposals',
  /** Get proposal by ID */
  getProposal: (proposalId: string) => `/api/v1/proposals/${proposalId}`,
} as const;

// ── GBrain ──

export const GBRAIN_ENDPOINTS = {
  /** List agents */
  listAgents: '/admin/api/agents',
  /** Get agent by ID */
  getAgent: (agentId: string) => `/admin/api/agents/${agentId}`,
} as const;

// ── Quests ──

export const QUEST_ENDPOINTS = {
  /** List quests */
  listQuests: '/api/omos/quests',
  /** Get quest by ID */
  getQuest: (questId: string) => `/api/omos/quests/${questId}`,
} as const;

// ── KOS ──

export const KOS_ENDPOINTS = {
  /** Search knowledge base */
  search: (query: string, limit?: number) => 
    `/api/kos/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`,
  /** Get knowledge context */
  getContext: (query: string, mode?: string) =>
    `/api/v1/context?q=${encodeURIComponent(query)}${mode ? `&mode=${mode}` : ''}`,
  /** Get knowledge stats */
  getStats: '/api/v1/stats',
  /** Get knowledge health */
  getHealth: '/api/v1/health',
} as const;

// ── Cockpit Pages ──

export const COCKPIT_PAGE_ENDPOINTS = {
  /** List cockpit pages */
  listPages: '/api/cockpit/pages',
  /** Get cockpit page by ID */
  getPage: (pageId: string) => `/api/cockpit/pages/${pageId}`,
  /** Get page maturity */
  getPageMaturity: (pageId: string) => `/api/cockpit/pages/${pageId}/maturity`,
} as const;

// ── System Health ──

export const SYSTEM_HEALTH_ENDPOINTS = {
  /** Get system health summary */
  getHealth: '/api/health',
  /** Get system status */
  getStatus: '/api/status',
} as const;

// ── Export all endpoints ──

export const API_ENDPOINTS = {
  systemMap: SYSTEM_MAP_ENDPOINTS,
  tasks: TASK_ENDPOINTS,
  domainApps: DOMAIN_APP_ENDPOINTS,
  alerts: ALERT_ENDPOINTS,
  bos: BOS_ENDPOINTS,
  compute: COMPUTE_ENDPOINTS,
  logs: LOG_ENDPOINTS,
  research: RESEARCH_ENDPOINTS,
  workflows: WORKFLOW_ENDPOINTS,
  ecos: ECOS_ENDPOINTS,
  pipelines: PIPELINE_ENDPOINTS,
  debt: DEBT_ENDPOINTS,
  l4Health: L4_HEALTH_ENDPOINTS,
  proposals: PROPOSAL_ENDPOINTS,
  gbrain: GBRAIN_ENDPOINTS,
  quests: QUEST_ENDPOINTS,
  kos: KOS_ENDPOINTS,
  cockpitPages: COCKPIT_PAGE_ENDPOINTS,
  systemHealth: SYSTEM_HEALTH_ENDPOINTS,
} as const;
