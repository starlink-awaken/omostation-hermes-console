import type { CockpitNavigationTarget } from './cockpitNavigation';

export interface TaskItem {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  read_only?: boolean;
  source?: {
    type?: string;
    title?: string;
  };
}

export interface WorkflowRecord {
  id: string;
  task?: string;
  status?: string;
  updated?: string;
}

export interface WorkflowPayload {
  status?: string;
  workflows?: WorkflowRecord[];
  total?: number;
}

export interface SkillItem {
  id: string;
  name?: string;
}

export interface WorkflowDefinition {
  name?: string;
  description?: string;
  steps?: number;
}

export interface PipelinePayload {
  pipelines?: string[];
}

export interface SystemMapLite {
  usage_paths?: Array<{
    id: string;
    title?: string;
    intent?: string;
    steps?: string[];
  }>;
  playbooks?: Array<{
    id: string;
    title?: string;
    goal?: string;
    frequency?: string;
  }>;
  gaps?: Array<{
    id: string;
    title?: string;
    severity?: string;
    next?: string;
  }>;
  roadmap?: {
    items?: Array<{
      id: string;
      title?: string;
      priority?: string;
      problem?: string;
    }>;
  };
}

export interface KnowledgeExecutionWorkbenchProps {
  currentPage: string;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export type ExecutionRouteCard = {
  id: string;
  title: string;
  objectTab: string;
  taskTab: string;
  tone: 'online' | 'degraded' | 'offline';
  signal: string;
  summary: string;
  nextAction: string;
  current: boolean;
};
