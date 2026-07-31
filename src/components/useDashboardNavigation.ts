import { useState, useRef, useEffect, useCallback } from 'react';
import type { CockpitNavigationTarget, RecentNavigationEntry } from './cockpitNavigation';
import {
  clearRecentNavigation,
  navigationTargetLabel,
  normalizeNavigationTarget,
  parseNavigationHash,
  readRecentNavigation,
  recordRecentNavigation,
  writeNavigationHash,
} from './cockpitNavigation';
import { findTaskDraftForTarget, persistTaskCenterDraft, taskDraftToIncomingDraft } from './taskDraftHandoff';

// ── Types ──

interface SearchTaskDraft {
  id: string;
  title: string;
  detail: string;
  badge: string;
  target: CockpitNavigationTarget;
  source?: { type?: string };
}

// ── Hook ──

interface UseDashboardNavigationOptions {
  shellTaskDrafts: SearchTaskDraft[];
  openContextTargetRef: React.MutableRefObject<((target: CockpitNavigationTarget) => void) | null>;
}

export function useDashboardNavigation({
  shellTaskDrafts,
  openContextTargetRef,
}: UseDashboardNavigationOptions) {
  const initialNavigationTarget = typeof window === 'undefined' ? null : parseNavigationHash(window.location.hash);

  // Navigation state
  const [activeTab, setActiveTabState] = useState(initialNavigationTarget?.tab || 'Home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [recentNavigation, setRecentNavigation] = useState<RecentNavigationEntry[]>(() => readRecentNavigation());

  // Focus state
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [focusedUsagePathId, setFocusedUsagePathId] = useState<string | null>(null);
  const [focusedGapId, setFocusedGapId] = useState<string | null>(null);
  const [focusedCoverageDimensionId, setFocusedCoverageDimensionId] = useState<string | null>(null);
  const [focusedPageId, setFocusedPageId] = useState<string | null>(null);
  const [focusedFeatureDomainId, setFocusedFeatureDomainId] = useState<string | null>(null);
  const [taskSearchSeed, setTaskSearchSeed] = useState('');
  const [taskDraftKey, setTaskDraftKey] = useState<string | null>(initialNavigationTarget?.draftKey || null);
  const [pageSprintFocusId, setPageSprintFocusId] = useState('');
  const [alertTab, setAlertTab] = useState<'active' | 'history' | 'rules' | null>(initialNavigationTarget?.alertTab || null);

  // Refs
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);

  // Navigation handlers
  const setActiveTab = useCallback((tab: string) => {
    const normalizedTarget = normalizeNavigationTarget({ tab });
    const nextTab = normalizedTarget.tab;
    setFocusedProjectId(null);
    setFocusedUsagePathId(null);
    setFocusedGapId(null);
    setFocusedCoverageDimensionId(null);
    setFocusedPageId(normalizedTarget.pageId || null);
    setFocusedFeatureDomainId(null);
    setTaskSearchSeed('');
    setTaskDraftKey(null);
    setAlertTab(null);
    setMobileNavOpen(false);
    setActiveTabState(nextTab);
    recordRecentNavigation(normalizedTarget, navigationTargetLabel(normalizedTarget));
    setRecentNavigation(readRecentNavigation());
    writeNavigationHash(normalizedTarget);
  }, []);

  const openContextTarget = useCallback((target: CockpitNavigationTarget) => {
    const normalizedTarget = normalizeNavigationTarget(target);
    const matchedDraft = findTaskDraftForTarget(normalizedTarget, shellTaskDrafts);
    const incomingDraft = matchedDraft ? taskDraftToIncomingDraft(matchedDraft) : null;
    const resolvedDraftKey = normalizedTarget.draftKey || (incomingDraft ? persistTaskCenterDraft(incomingDraft) : null);
    setFocusedProjectId(normalizedTarget.projectId || null);
    setFocusedUsagePathId(normalizedTarget.usagePathId || null);
    setFocusedGapId(normalizedTarget.gapId || null);
    setFocusedCoverageDimensionId(normalizedTarget.coverageDimensionId || null);
    setFocusedPageId(normalizedTarget.pageId || null);
    setFocusedFeatureDomainId(normalizedTarget.featureDomainId || null);
    setTaskSearchSeed(normalizedTarget.taskQuery || '');
    setTaskDraftKey(resolvedDraftKey);
    setAlertTab(normalizedTarget.alertTab || null);
    setMobileNavOpen(false);
    setActiveTabState(normalizedTarget.tab);
    recordRecentNavigation(normalizedTarget, navigationTargetLabel(normalizedTarget));
    setRecentNavigation(readRecentNavigation());
    writeNavigationHash({
      ...normalizedTarget,
      draftKey: resolvedDraftKey || undefined,
    });
  }, [shellTaskDrafts]);

  // Set the ref for the search hook
  openContextTargetRef.current = openContextTarget;

  const clearRecent = useCallback(() => {
    clearRecentNavigation();
    setRecentNavigation([]);
  }, []);

  // Hash change effect
  useEffect(() => {
    const handleHashChange = () => {
      const target = parseNavigationHash(window.location.hash);
      if (!target) return;
      setFocusedProjectId(target.projectId || null);
      setFocusedUsagePathId(target.usagePathId || null);
      setFocusedGapId(target.gapId || null);
      setFocusedCoverageDimensionId(target.coverageDimensionId || null);
      setFocusedPageId(target.pageId || null);
      setFocusedFeatureDomainId(target.featureDomainId || null);
      setTaskSearchSeed(target.taskQuery || '');
      setTaskDraftKey(target.draftKey || null);
      setAlertTab(target.alertTab || null);
      setActiveTabState(target.tab);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Mobile nav keyboard effect
  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    mobileNavCloseRef.current?.focus();
    const sidebar = mobileSidebarRef.current;
    if (!sidebar) return undefined;

    const handleMobileNavKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileNavOpen(false);
        mobileNavToggleRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleMobileNavKeyDown);
    return () => document.removeEventListener('keydown', handleMobileNavKeyDown);
  }, [mobileNavOpen]);

  return {
    // State
    activeTab,
    setActiveTab,
    setActiveTabState,
    mobileNavOpen,
    setMobileNavOpen,
    recentNavigation,
    setRecentNavigation,
    // Focus state
    focusedProjectId,
    setFocusedProjectId,
    focusedUsagePathId,
    setFocusedUsagePathId,
    focusedGapId,
    setFocusedGapId,
    focusedCoverageDimensionId,
    setFocusedCoverageDimensionId,
    focusedPageId,
    setFocusedPageId,
    focusedFeatureDomainId,
    setFocusedFeatureDomainId,
    taskSearchSeed,
    setTaskSearchSeed,
    taskDraftKey,
    setTaskDraftKey,
    pageSprintFocusId,
    setPageSprintFocusId,
    alertTab,
    setAlertTab,
    // Refs
    mobileNavToggleRef,
    mobileNavCloseRef,
    mobileSidebarRef,
    // Handlers
    openContextTarget,
    clearRecent,
  };
}
