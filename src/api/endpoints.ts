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
  /** Login */
  login: '/admin/login',
  /** Sign out everywhere */
  signOutEverywhere: '/admin/api/sign-out-everywhere',
  /** Get stats */
  getStats: '/admin/api/stats',
  /** Get health indicators */
  getHealth: '/admin/api/health-indicators',
  /** List agents */
  listAgents: '/admin/api/agents',
  /** Get agent by ID */
  getAgent: (agentId: string) => `/admin/api/agents/${agentId}`,
  /** List requests */
  listRequests: (page: number = 1, qs: string = '') =>
    `/admin/api/requests?page=${page}${qs}`,
  /** List API keys */
  listApiKeys: '/admin/api/api-keys',
  /** Create API key */
  createApiKey: '/admin/api/api-keys',
  /** Revoke API key */
  revokeApiKey: '/admin/api/api-keys/revoke',
  /** Update client TTL */
  updateClientTtl: '/admin/api/update-client-ttl',
  /** Revoke client */
  revokeClient: '/admin/api/revoke-client',
  /** Get calibration profile */
  getCalibrationProfile: (holder?: string) =>
    `/admin/api/calibration/profile${holder ? `?holder=${encodeURIComponent(holder)}` : ''}`,
  /** Get calibration chart (returns SVG text) */
  getCalibrationChart: (type: string, holder?: string) =>
    `/admin/api/calibration/charts/${encodeURIComponent(type)}${holder ? `?holder=${encodeURIComponent(holder)}` : ''}`,
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

// ── Services (Overview / Topology / Performance) ──

export const SERVICE_ENDPOINTS = {
  /** List all services */
  listServices: '/api/services',
  /** Get service health status */
  getServiceStatus: '/api/services/status',
} as const;

// ── BOS Extended ──

export const BOS_EXTENDED_ENDPOINTS = {
  /** Get BOS mesh health */
  getHealth: '/api/bos/health',
  /** Get BOS metrics */
  getMetrics: '/api/bos/metrics',
} as const;

// ── L4 Extended ──

export const L4_EXTENDED_ENDPOINTS = {
  /** Get L4 health trend */
  getTrend: '/api/l4/trend',
  /** Get L4 signals */
  getSignals: '/api/l4/signals',
} as const;

// ── Sandbox ──

export const SANDBOX_ENDPOINTS = {
  /** Execute sandbox command */
  execute: '/api/sandbox/execute',
  /** Get sandbox queue */
  getQueue: '/api/cockpit/sandbox/queue',
} as const;

// ── Wave2 ──

export const WAVE2_ENDPOINTS = {
  /** Get Wave2 proposals plan */
  getProposalsPlan: '/api/wave2/proposals/plan',
  /** Get Wave2 dashboard */
  getDashboard: '/api/wave2/dashboard',
} as const;

// ── Cards ──

export const CARDS_ENDPOINTS = {
  /** List cards */
  listCards: '/api/cards',
  /** Check cards */
  checkCards: '/api/cards/check',
} as const;

// ── OMOs (Governance) ──

export const OMOS_ENDPOINTS = {
  /** Get OMO status */
  getStatus: '/api/omos/status',
  /** Get OMO violations */
  getViolations: '/api/omos/violations',
  /** Get OMO doctor */
  getDoctor: '/api/omo/doctor',
} as const;

// ── Compute Extended ──

export const COMPUTE_EXTENDED_ENDPOINTS = {
  /** Generate compute */
  generate: '/api/cockpit/compute/generate',
  /** Get compute queue */
  getQueue: '/api/cockpit/compute/queue',
  /** Get compute control queue */
  getControlQueue: '/api/cockpit/compute/control/queue',
  /** Get compute generation queue */
  getGenerationQueue: '/api/cockpit/compute/generation/queue',
  /** Get governance compute generate */
  governanceGenerate: '/api/governance/compute/generate',
} as const;

// ── Triage ──

export const TRIAGE_ENDPOINTS = {
  /** Get triage queue */
  getQueue: '/api/cockpit/triage/queue',
  /** Execute triage */
  execute: '/api/cockpit/triage/execute',
} as const;

// ── Coverage ──

export const COVERAGE_ENDPOINTS = {
  /** Get coverage queue */
  getQueue: '/api/cockpit/coverage/queue',
} as const;

// ── Engine ──

export const ENGINE_ENDPOINTS = {
  /** Get engine queue */
  getQueue: '/api/cockpit/engine/queue',
} as const;

// ── Governance Queue ──

export const GOVERNANCE_QUEUE_ENDPOINTS = {
  /** Get governance queue */
  getQueue: '/api/cockpit/governance/queue',
} as const;

// ── MetaOS Extended ──

export const METAOS_EXTENDED_ENDPOINTS = {
  /** Get MetaOS plan */
  getPlan: '/api/metaos/plan',
} as const;

// ── OPC ──

export const OPC_ENDPOINTS = {
  /** Get OPC workspace */
  getWorkspace: '/api/opc/workspace',
} as const;

// ── Metrics ──

export const METRICS_ENDPOINTS = {
  /** Get metrics history */
  getHistory: '/api/metrics/history',
} as const;

// ── Version ──

export const VERSION_ENDPOINTS = {
  /** Get version */
  getVersion: '/api/version',
  /** Get version history */
  getVersionHistory: '/api/version/history',
} as const;

// ── Instance ──

export const INSTANCE_ENDPOINTS = {
  /** Get instance info */
  getInstance: '/api/instance',
} as const;

// ── Knowledge Extended ──

export const KNOWLEDGE_EXTENDED_ENDPOINTS = {
  /** Put knowledge */
  put: '/api/knowledge/put',
  /** Search knowledge */
  search: '/api/knowledge/search',
} as const;

// ── Arch Health ──

export const ARCH_HEALTH_ENDPOINTS = {
  /** Get architecture health */
  getHealth: '/api/v1/arch-health',
} as const;

// ── Delivery Journey ──

export const DELIVERY_JOURNEY_ENDPOINTS = {
  /** Get delivery journey projection */
  getJourney: (fixture?: string) =>
    `/api/delivery-journey${fixture ? `?fixture=${encodeURIComponent(fixture)}` : ''}`,
} as const;

// ── Workflow Mesh Operations ──

export const WORKFLOW_MESH_OPERATIONS_ENDPOINTS = {
  /** Live event-derived operations projection. */
  getOperations: (sceneId?: string) =>
    `/api/workflow-mesh/operations${sceneId ? `?scene_id=${encodeURIComponent(sceneId)}` : ''}`,
  /** Explicit result-consumption feedback; does not mutate WorkflowRun state. */
  recordOutcomeFeedback: '/api/workflow-mesh/outcome-feedback',
} as const;

// ── Workflow Mesh Scene Cards ──

export const SCENE_CARD_ENDPOINTS = {
  /** Candidate-only projection; never activates a scene. */
  listCandidates: '/api/scene-cards',
  /** Proposal-only review receipt; never writes OMO state. */
  reviewCandidate: '/api/scene-cards/review',
} as const;

// ── External Connection Fabric ──

export const EXTERNAL_RESOURCE_ENDPOINTS = {
  /** Dynamic descriptor and health projection; never activates a resource. */
  list: '/api/external-resources',
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
  services: SERVICE_ENDPOINTS,
  bosExtended: BOS_EXTENDED_ENDPOINTS,
  l4Extended: L4_EXTENDED_ENDPOINTS,
  sandbox: SANDBOX_ENDPOINTS,
  wave2: WAVE2_ENDPOINTS,
  cards: CARDS_ENDPOINTS,
  omos: OMOS_ENDPOINTS,
  computeExtended: COMPUTE_EXTENDED_ENDPOINTS,
  triage: TRIAGE_ENDPOINTS,
  coverage: COVERAGE_ENDPOINTS,
  engine: ENGINE_ENDPOINTS,
  governanceQueue: GOVERNANCE_QUEUE_ENDPOINTS,
  metaosExtended: METAOS_EXTENDED_ENDPOINTS,
  opc: OPC_ENDPOINTS,
  metrics: METRICS_ENDPOINTS,
  version: VERSION_ENDPOINTS,
  instance: INSTANCE_ENDPOINTS,
  knowledgeExtended: KNOWLEDGE_EXTENDED_ENDPOINTS,
  archHealth: ARCH_HEALTH_ENDPOINTS,
  deliveryJourney: DELIVERY_JOURNEY_ENDPOINTS,
  workflowMeshOperations: WORKFLOW_MESH_OPERATIONS_ENDPOINTS,
  sceneCards: SCENE_CARD_ENDPOINTS,
  externalResources: EXTERNAL_RESOURCE_ENDPOINTS,
} as const;
