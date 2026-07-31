import type { ComponentType } from 'react';
import type { CockpitNavigationTarget, RecentNavigationEntry } from './cockpitNavigation';

export interface SearchTarget {
  id: string;
  label: string;
  group: string;
  keywords: string[];
  target: CockpitNavigationTarget;
}

export interface SidebarCoverage {
  total: number;
  covered: number;
  items: Array<{ id: string; label: string; status: string }>;
}

export interface SidebarProjectPortfolio {
  total: number;
  active: number;
  projects: Array<{ id: string; name: string; status: string }>;
  weakestDimension?: { id: string; label: string; score: number };
}

export interface SearchUsagePath {
  id: string;
  label: string;
  target: CockpitNavigationTarget;
  group?: string;
}

export interface SearchTaskDraft {
  id: string;
  title: string;
  detail: string;
  badge: string;
  target: CockpitNavigationTarget;
}

export interface SearchDomainAppsPayload {
  apps: Array<{ id: string; name: string; url: string }>;
}

export interface SearchCockpitPage {
  id: string;
  title: string;
  tab: string;
  group: string;
  maturity?: string;
}

export interface PageMaturityItem {
  id: string;
  label: string;
  status: string;
}

export interface SearchFeatureDomain {
  id: string;
  label: string;
  pages: string[];
}

export interface SearchPlaybook {
  id: string;
  label: string;
  target: CockpitNavigationTarget;
}

export interface SearchRoadmapItem {
  id: string;
  label: string;
  status: string;
}

export interface SearchRoadmapLane {
  id: string;
  label: string;
  items: SearchRoadmapItem[];
}

export interface SearchCapabilityGap {
  id: string;
  label: string;
  severity: string;
}

export type SiteClosureFilter = 'all' | 'open' | 'closed';

export interface ShellSourceAvailability {
  systemMap: boolean;
  tasks: boolean;
  domainApps: boolean;
}

export type NavIconMap = Record<string, ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>>;
