import { type CockpitNavigationTarget } from '../cockpitNavigation';

export type ProtocolLayer = {
  id: string;
  title: string;
  status: string;
  role: string;
  facts: string[];
  next_action: string;
};

export type ProtocolWorkflow = {
  id: string;
  task: string;
  status: string;
  updated_at?: string | null;
};

export type ProtocolPayload = {
  status?: string;
  summary: {
    workflow_definitions: number;
    workflow_actions: number;
    workflow_backends: number;
    recent_runs: number;
    ready_layers: number;
    watch_layers: number;
    page_score: number;
  };
  layers: ProtocolLayer[];
  recent_workflows: ProtocolWorkflow[];
  offset?: number;
  limit?: number;
  has_more?: boolean;
  commands: Array<{
    id: string;
    label: string;
    value: string;
    detail: string;
  }>;
  related_pages: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  roadmap_item?: {
    id: string;
    title?: string;
    priority?: string;
    problem?: string;
  } | null;
  playbook?: {
    id: string;
    title?: string;
    goal?: string;
  } | null;
};

export type ProtocolSurfaceId = 'layers' | 'workflows' | 'evidence' | 'governance';

export type ProtocolSurfaceCard = {
  id: ProtocolSurfaceId;
  title: string;
  summary: string;
  detail: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

export type ProtocolClosureRow = ProtocolSurfaceCard & {
  signal: string;
  handoff: string;
  statusTone: 'online' | 'degraded';
};

export const EMPTY_PAYLOAD: ProtocolPayload = {
  summary: {
    workflow_definitions: 0,
    workflow_actions: 0,
    workflow_backends: 0,
    recent_runs: 0,
    ready_layers: 0,
    watch_layers: 0,
    page_score: 0,
  },
  layers: [],
  recent_workflows: [],
  commands: [],
  related_pages: [],
  roadmap_item: null,
  playbook: null,
};
