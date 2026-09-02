/**
 * Domain Hooks — 领域聚合 Hooks
 *
 * 使用标准化工厂创建各领域 Hooks，保持一致性。
 */
import { createResourceHooks, createQueryHook, createMutationHook } from './factory';
import { apiFetch, apiPost, API_ENDPOINTS } from '../index';

// Re-export for convenience
const ENDPOINTS = API_ENDPOINTS;

// ── 任务域 ──
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  createdAt: string;
  updatedAt: string;
}

export const TaskHooks = createResourceHooks<Task>(API_ENDPOINTS.TASKS, 'tasks');

// ── 治理域 ──
export interface DebtItem {
  id: string;
  title: string;
  tier: 'P0' | 'P1' | 'P2';
  status: 'open' | 'in_progress' | 'resolved';
  owner: string;
  createdAt: string;
}

export const DebtHooks = createResourceHooks<DebtItem>(API_ENDPOINTS.DEBT, 'debt');

// ── 系统健康 ──
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: { name: string; status: string; latency: number }[];
  lastChecked: string;
}

export const useSystemHealth = createQueryHook<SystemHealth>(
  'system-health',
  () => apiFetch(API_ENDPOINTS.HEALTH),
  { refetchInterval: 30_000 }
);

// ── Harness 合规 ──
export interface ComplianceStatus {
  error: number;
  warning: number;
  sections: { name: string; ok: boolean; issues: string[] }[];
}

export const useHarnessCompliance = createQueryHook<ComplianceStatus>(
  'harness-compliance',
  () => apiFetch('/api/cockpit/harness/compliance'),
  { refetchInterval: 60_000 }
);

// ── Intent 编译 ──
export interface CompileRequest {
  input: string;
  context?: string;
}

export interface CompileResult {
  spec: string;
  timestamp: string;
  duration: number;
}

export const useCompileIntent = createMutationHook<CompileRequest, CompileResult>(
  'intent-compile',
  (req) => apiPost(API_ENDPOINTS.INTENT_COMPILER_ENDPOINTS.COMPILE, req)
);

// ── 治理自检 ──
export interface SelfCheckItem {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'PENDING';
  summary: string;
  details?: string;
  duration?: number;
}

export interface SelfCheckResult {
  items: SelfCheckItem[];
  overall: 'PASS' | 'WARN' | 'FAIL';
  timestamp: string;
}

export const useGovernanceSelfCheck = createQueryHook<SelfCheckResult>(
  'governance-self-check',
  () => apiFetch(API_ENDPOINTS.GOVERNANCE_SELF_CHECK_ENDPOINTS.CHECK),
  { refetchInterval: 120_000 }
);

export const useRunGovernanceCheck = createMutationHook<void, SelfCheckResult>(
  'governance-self-check-run',
  () => apiPost(API_ENDPOINTS.GOVERNANCE_SELF_CHECK_ENDPOINTS.RUN, {})
);

// ── 场景卡 ──
export interface SceneCard {
  id: string;
  title: string;
  domain: string;
  lifecycle: 'draft' | 'shadow' | 'assisted' | 'supervised' | 'routine';
  status: string;
  lastUpdated: string;
}

export const SceneCardHooks = createResourceHooks<SceneCard>(API_ENDPOINTS.SCENE_CARDS, 'scene-cards');

// ── 决策收件箱 ──
export interface DecisionItem {
  id: string;
  title: string;
  type: 'approval' | 'review' | 'notification';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const DecisionHooks = createResourceHooks<DecisionItem>(API_ENDPOINTS.DECISION_INBOX, 'decisions');
