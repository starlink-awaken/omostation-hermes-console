/**
 * API module for cockpit-ui.
 * 
 * This module provides:
 * - Centralized API client with error handling
 * - API endpoint constants
 * - React Query hooks for data fetching
 * - QueryClient provider
 */

// ── Client ──
export { apiFetch, apiPost, apiPut, apiDelete } from './client';
export type { ApiResponse, ApiRequestOptions } from './client';

// ── Endpoints ──
export { API_ENDPOINTS } from './endpoints';
export {
  SYSTEM_MAP_ENDPOINTS,
  TASK_ENDPOINTS,
  DOMAIN_APP_ENDPOINTS,
  ALERT_ENDPOINTS,
  BOS_ENDPOINTS,
  COMPUTE_ENDPOINTS,
  LOG_ENDPOINTS,
  RESEARCH_ENDPOINTS,
  WORKFLOW_ENDPOINTS,
  ECOS_ENDPOINTS,
  PIPELINE_ENDPOINTS,
  DEBT_ENDPOINTS,
  L4_HEALTH_ENDPOINTS,
  PROPOSAL_ENDPOINTS,
  GBRAIN_ENDPOINTS,
  QUEST_ENDPOINTS,
  KOS_ENDPOINTS,
  KNOWLEDGE_ACTION_ENDPOINTS,
  COCKPIT_PAGE_ENDPOINTS,
  SYSTEM_HEALTH_ENDPOINTS,
  DELIVERY_JOURNEY_ENDPOINTS,
  WORKFLOW_MESH_OPERATIONS_ENDPOINTS,
} from './endpoints';

// ── Hooks ──
export {
  useSystemMap,
  useTasks,
  useDomainApps,
  useAlerts,
  useAlertRules,
  useBosServices,
  useComputeStatus,
  useLogs,
  useResearch,
  useWorkflows,
  useEcosSkills,
  usePipelines,
  useDebt,
  useL4Health,
  useProposals,
  useGBrainAgents,
  useQuests,
  useKosSearch,
  useKnowledgeActionOperations,
  useRecordKnowledgeAction,
  useRequestTaskWorkflow,
  useSystemHealth,
  useUpdateTaskStatus,
  useCreateTask,
  useDeleteTask,
  useCreateAlertRule,
  useWorkflowMeshOperations,
  useRecordOutcomeFeedback,
} from './hooks';

export type {
  SystemMapData,
  TaskData,
  TaskListResponse,
  DomainAppData,
  DomainAppListResponse,
  AlertData,
  AlertListResponse,
  AlertRuleData,
  BosServiceData,
  ComputeStatusData,
  LogEntry,
  LogListResponse,
  ResearchItem,
  ResearchListResponse,
  WorkflowData,
  WorkflowListResponse,
  EcosSkillData,
  PipelineData,
  DebtData,
  L4HealthData,
  ProposalData,
  GBrainAgentData,
  QuestData,
  KosSearchResult,
  KosSearchResponse,
  KnowledgeActionRef,
  KnowledgeActionInput,
  KnowledgeActionRecord,
  KnowledgeActionOperations,
  KnowledgeActionOperationsResponse,
  KnowledgeActionResponse,
  WorkflowRequestInput,
  WorkflowRequestResponse,
  SystemHealthData,
  OutcomeConsumptionState,
  OutcomeSceneBinding,
  OutcomeFeedbackInput,
  OutcomeFeedbackRecord,
  WorkflowMeshOperationsData,
  WorkflowMeshOperationsResponse,
  OutcomeFeedbackResponse,
} from './hooks';

// ── Provider ──
export { ApiProvider, useQueryClientInstance } from './provider';

// ── Fetch 包装器 (带超时/错误处理) ──
export {
  fetchWithTimeout,
  readFetchResult,
  DEFAULT_FETCH_TIMEOUT_MS,
} from './fetch';
export type { FetchResult } from './fetch';
