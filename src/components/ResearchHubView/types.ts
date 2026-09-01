import { type CockpitNavigationTarget } from '../cockpitNavigation';

export type ResearchSummary = {
  total: number;
  active: number;
  archived: number;
  quarantined: number;
  published: number;
  follow_ups: number;
  agents: number;
};

export type ResearchEvent = {
  type?: string | null;
  label?: string | null;
  created_at?: string | null;
  description?: string | null;
};

export type ResearchItem = {
  id: number;
  topic: string;
  summary?: string;
  created_at?: string | null;
  source_count: number;
  tags: string[];
  agent?: string;
  status: string;
  follow_up_count: number;
  last_event?: ResearchEvent | null;
  next_action: string;
};

export type ResearchHubPayload = {
  status?: string;
  summary: ResearchSummary;
  recent: ResearchItem[];
  offset?: number;
  limit?: number;
  has_more?: boolean;
  commands: Array<{
    id: string;
    label: string;
    value: string;
    detail: string;
  }>;
  pipeline: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
  related_pages: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
};

export type ResearchDetailPayload = {
  status?: string;
  item?: {
    id: number;
    topic: string;
    summary?: string;
    full_text?: string;
    created_at?: string | null;
    source_count: number;
    tags: string[];
    follow_ups: Array<{ question?: string; answer?: string; [key: string]: unknown }>;
    agent?: string | null;
    status: string;
  };
  timeline: Array<ResearchEvent & { event_type?: string | null }>;
  dossier: {
    parents: Array<Record<string, unknown>>;
    children: Array<Record<string, unknown>>;
    publications: Array<{ style?: string; path?: string; published_at?: string | null; [key: string]: unknown }>;
  };
  half_life?: { days?: number; status?: string; [key: string]: unknown };
};

export type ResearchClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

export const EMPTY_PAYLOAD: ResearchHubPayload = {
  summary: {
    total: 0,
    active: 0,
    archived: 0,
    quarantined: 0,
    published: 0,
    follow_ups: 0,
    agents: 0,
  },
  recent: [],
  commands: [],
  pipeline: [],
  related_pages: [],
};
