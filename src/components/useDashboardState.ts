import { useState } from 'react';

// ── Types ──

interface SidebarCoverage {
  summary: { score: number; ready: number; watch: number; gap: number };
  attentionItems: Array<{
    page_id: string;
    page?: { id?: string; title?: string };
    status: string;
    score: number;
    next_action?: string;
  }>;
}

interface ProjectPortfolioSummary {
  score?: number;
  blocked?: number;
  at_risk?: number;
  watch?: number;
  healthy?: number;
}

interface SidebarProject {
  id: string;
  status?: string;
  score?: number;
  next_action?: string;
  primary_gap?: string;
}

interface SidebarWeakestDimension {
  id: string;
  title?: string;
  score?: number;
}

interface SidebarProjectPortfolio {
  summary: ProjectPortfolioSummary;
  priorityProjects: SidebarProject[];
  weakestDimensions: SidebarWeakestDimension[];
}

interface SearchUsagePath {
  id: string;
  title?: string;
  intent?: string;
  pages?: Array<{ id?: string; title?: string }>;
  steps?: string[];
  target?: { tab: string; [key: string]: unknown };
}

interface SearchTaskDraft {
  id: string;
  title: string;
  detail: string;
  badge: string;
  target: { tab: string; [key: string]: unknown };
  source?: { type?: string };
}

interface SearchDomainAppsPayload {
  apps: Array<{ id: string; name: string; url: string }>;
}

interface ShellSourceAvailability {
  systemMap: boolean;
  tasks: boolean;
  domainApps: boolean;
}

interface SearchCockpitPage {
  id: string;
  title: string;
  tab: string;
  group: string;
  maturity?: string;
}

interface PageMaturityItem {
  page_id: string;
  page?: { id?: string; title?: string };
  status: string;
  score: number;
  next_action?: string;
}

interface SearchFeatureDomain {
  id: string;
  label: string;
  pages: string[];
}

interface SearchPlaybook {
  id: string;
  label: string;
  target: { tab: string; [key: string]: unknown };
}

interface SearchRoadmapItem {
  id: string;
  label: string;
  status: string;
}

interface SearchCapabilityGap {
  id: string;
  label: string;
  severity: string;
}

type SiteClosureFilter = 'all' | '路径' | '能力域' | '操作清单' | '路线图' | '任务';

// ── Hook ──

export function useDashboardState() {
  // Shell state
  const [pageRefreshToken, setPageRefreshToken] = useState(0);
  const [shellDataWarnings, setShellDataWarnings] = useState<string[]>([]);

  // Sidebar data
  const [sidebarCoverage, setSidebarCoverage] = useState<SidebarCoverage | null>(null);
  const [sidebarProjectPortfolio, setSidebarProjectPortfolio] = useState<SidebarProjectPortfolio | null>(null);
  const [sidebarUsagePaths, setSidebarUsagePaths] = useState<SearchUsagePath[]>([]);
  const [shellTaskDrafts, setShellTaskDrafts] = useState<SearchTaskDraft[]>([]);

  // Shell data
  const [shellDomainApps, setShellDomainApps] = useState<SearchDomainAppsPayload | null>(null);
  const [shellSourceAvailability, setShellSourceAvailability] = useState<ShellSourceAvailability>({
    systemMap: false,
    tasks: false,
    domainApps: false,
  });

  // Page data
  const [cockpitPages, setCockpitPages] = useState<SearchCockpitPage[]>([]);
  const [pageMaturityItems, setPageMaturityItems] = useState<PageMaturityItem[]>([]);
  const [featureDomains, setFeatureDomains] = useState<SearchFeatureDomain[]>([]);
  const [playbooks, setPlaybooks] = useState<SearchPlaybook[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<SearchRoadmapItem[]>([]);
  const [capabilityGaps, setCapabilityGaps] = useState<SearchCapabilityGap[]>([]);

  // Site closure state
  const [siteClosureFilter, setSiteClosureFilter] = useState<SiteClosureFilter>('all');
  const [siteClosureExpanded, setSiteClosureExpanded] = useState(false);
  const [pageAuditExpanded, setPageAuditExpanded] = useState(false);
  const [closureDraftNotice, setClosureDraftNotice] = useState<string | null>(null);
  const [pageSprintDraftNotice, setPageSprintDraftNotice] = useState<string | null>(null);

  // Page draft state
  const [currentPageDraftPending, setCurrentPageDraftPending] = useState(false);
  const [currentPageDraftNotice, setCurrentPageDraftNotice] = useState<string | null>(null);
  const [currentPageDraftError, setCurrentPageDraftError] = useState<string | null>(null);

  // UI state
  const [snapshotExportState, setSnapshotExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [linkCopyState, setLinkCopyState] = useState<'idle' | 'success' | 'error'>('idle');

  return {
    // Shell state
    pageRefreshToken, setPageRefreshToken,
    shellDataWarnings, setShellDataWarnings,
    // Sidebar data
    sidebarCoverage, setSidebarCoverage,
    sidebarProjectPortfolio, setSidebarProjectPortfolio,
    sidebarUsagePaths, setSidebarUsagePaths,
    shellTaskDrafts, setShellTaskDrafts,
    // Shell data
    shellDomainApps, setShellDomainApps,
    shellSourceAvailability, setShellSourceAvailability,
    // Page data
    cockpitPages, setCockpitPages,
    pageMaturityItems, setPageMaturityItems,
    featureDomains, setFeatureDomains,
    playbooks, setPlaybooks,
    roadmapItems, setRoadmapItems,
    capabilityGaps, setCapabilityGaps,
    // Site closure state
    siteClosureFilter, setSiteClosureFilter,
    siteClosureExpanded, setSiteClosureExpanded,
    pageAuditExpanded, setPageAuditExpanded,
    closureDraftNotice, setClosureDraftNotice,
    pageSprintDraftNotice, setPageSprintDraftNotice,
    // Page draft state
    currentPageDraftPending, setCurrentPageDraftPending,
    currentPageDraftNotice, setCurrentPageDraftNotice,
    currentPageDraftError, setCurrentPageDraftError,
    // UI state
    snapshotExportState, setSnapshotExportState,
    linkCopyState, setLinkCopyState,
  };
}
