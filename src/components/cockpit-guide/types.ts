import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitPageRegistryItem } from '../cockpitPageRegistry';

export type GuidePage = CockpitPageRegistryItem;

export interface GuideGroup {
  id: string;
  title: string;
  description: string;
  summary: string;
  target: CockpitNavigationTarget;
  pages: GuidePage[];
}

export interface GuideGroupBlueprint {
  id: string;
  title: string;
  description: string;
  summary: string;
  target: CockpitNavigationTarget;
  registryGroups: string[];
}

export interface GuidePath {
  id: string;
  title: string;
  tag: string;
  description: string;
  steps: string[];
  target: CockpitNavigationTarget;
  actionLabel: string;
}

export interface GuideMetrics {
  usagePaths: number;
  playbooks: number;
  featureDomains: number;
  attentionPages: number;
  projectCoverageScore: number | null;
  domainSummary: {
    total: number;
    running: number;
    highRisk: number;
    externalMounts: number;
    score: number | null;
  };
  domainAttention: Array<{
    id: string;
    name: string;
    domainName?: string;
    runtimeStatus: string;
    securityPosture: string;
    riskLevel: string;
    freshnessStatus?: string;
    nextAction: string;
    taskTitle?: string;
    taskQuery: string;
  }>;
  pageAttentionItems: Array<{
    page_id: string;
    score: number;
    status: 'watch' | 'gap' | string;
    next_action: string;
    page?: { title?: string };
  }>;
  capabilityGaps: Array<{
    id: string;
    severity: string;
    title: string;
    evidence: string;
    next: string;
  }>;
  weakestDimensions: Array<{
    id: string;
    title?: string;
    score?: number;
    failed?: number;
    warning?: number;
  }>;
  roadmapItems: Array<{
    id: string;
    priority: string;
    status: string;
    title: string;
    cockpit_page: string;
    problem?: string;
  }>;
  priorityProjects: Array<{
    id: string;
    layer?: string;
    cockpitPage?: string;
    status?: string;
    score?: number;
    primaryGap?: string;
    nextAction?: string;
  }>;
  draftSummary: {
    total: number;
    capabilityGap: number;
    pageMaturity: number;
    domainApp: number;
    projectPortfolio: number;
    playbook: number;
    verificationReady: number;
  };
  featuredDrafts: Array<{
    id: string;
    title: string;
    sourceType: string;
    sourceId: string;
    description?: string;
  }>;
  closureDrafts: Array<{
    id: string;
    title: string;
    sourceType: string;
    sourceId: string;
    description?: string;
  }>;
  usageCoverageRows: Array<{
    id: string;
    title: string;
    intent: string;
    status: string;
    score: number | null;
    stepCount: number;
    pageCount: number;
    pageIds: string[];
    linkedPages: string[];
    playbooks: string[];
    featureDomains: string[];
    roadmapTitles: string[];
    nextAction: string;
    taskQuery: string;
  }>;
  pageCoverageRows: Array<{
    id: string;
    title: string;
    groupId: string;
    groupTitle: string;
    purpose: string;
    whenToUse: string;
    status: string;
    score: number | null;
    usagePaths: string[];
    featureDomains: string[];
    playbooks: string[];
    roadmapTitles: string[];
    nextAction: string;
    taskQuery: string;
    missingUsagePath: boolean;
    missingFeatureDomain: boolean;
    missingSystemMapRegistration: boolean;
  }>;
  featureDomainRows: Array<{
    id: string;
    title: string;
    english?: string;
    cockpitPage?: string;
    status: string;
    providerCount: number;
    capabilityCount: number;
    linkedPages: string[];
    usagePaths: string[];
    capabilityItems: string[];
    nextAction: string;
    taskQuery: string;
    missingCockpitPage: boolean;
    missingCapabilityItems: boolean;
  }>;
  dimensionCoverageRows: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    score: number | null;
    ready: number;
    warning: number;
    failed: number;
    attentionProjects: Array<{
      id: string;
      status?: string;
      nextAction?: string;
    }>;
    nextAction: string;
    taskQuery: string;
  }>;
}

export interface ProblemEntryCard {
  id: string;
  title: string;
  signal: string;
  detail: string;
  primaryLabel: string;
  primaryTarget: CockpitNavigationTarget;
  secondaryLabel: string;
  secondaryTarget: CockpitNavigationTarget;
}
