import { useState, useMemo, useRef, useEffect, useCallback, type RefObject } from 'react';
import type { CockpitNavigationTarget } from './cockpitNavigation';
import { persistTaskCenterDraft, taskDraftToIncomingDraft } from './taskDraftHandoff';
import { expandSearchAliases, scoreSearchTarget } from './dashboardHelpers';

// ── Types ──

export interface SearchTarget {
  id: string;
  tab: string;
  label: string;
  group: string;
  keywords: string[];
  context?: {
    draftId?: string;
    projectId?: string;
    usagePathId?: string;
    gapId?: string;
    coverageDimensionId?: string;
    pageId?: string;
    featureDomainId?: string;
    taskQuery?: string;
    alertTab?: string;
  };
}

export interface SearchTaskDraft {
  id: string;
  title: string;
  detail: string;
  badge: string;
  target: CockpitNavigationTarget;
  source?: { type?: string };
}

// ── Hook ──

interface UseDashboardSearchOptions {
  staticSearchTargets: SearchTarget[];
  workModeSearchTargets: SearchTarget[];
  shellTaskDrafts: SearchTaskDraft[];
  openContextTargetRef: RefObject<((target: CockpitNavigationTarget) => void) | null>;
  fetchSearchData: (url: string) => Promise<{ ok: boolean; data?: unknown }>;
}

export function useDashboardSearch({
  staticSearchTargets,
  workModeSearchTargets,
  shellTaskDrafts,
  openContextTargetRef,
  fetchSearchData,
}: UseDashboardSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResultIndex, setSearchResultIndex] = useState(0);
  const [dynamicSearchTargets, setDynamicSearchTargets] = useState<SearchTarget[]>([]);
  const [knowledgeSearchTargets, setKnowledgeSearchTargets] = useState<SearchTarget[]>([]);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return [];
    const queryTerms = expandSearchAliases([query]);
    return [...knowledgeSearchTargets, ...dynamicSearchTargets, ...staticSearchTargets, ...workModeSearchTargets]
      .map((target) => ({
        target,
        score: scoreSearchTarget(target, query, queryTerms),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.target.label.localeCompare(right.target.label, 'zh-CN');
      })
      .map((item) => item.target)
      .slice(0, 8);
  }, [dynamicSearchTargets, knowledgeSearchTargets, searchQuery, staticSearchTargets, workModeSearchTargets]);

  const activeSearchResultIndex = searchResults.length > 0
    ? Math.min(searchResultIndex, searchResults.length - 1)
    : 0;

  const openSearchTarget = useCallback((target: SearchTarget) => {
    const matchedDraft = target.context?.draftId
      ? shellTaskDrafts.find((task) => task.id === target.context?.draftId) || null
      : null;
    const incomingDraft = matchedDraft ? taskDraftToIncomingDraft(matchedDraft) : null;
    const draftKey = incomingDraft ? persistTaskCenterDraft(incomingDraft) : null;
    const openTarget = openContextTargetRef.current;
    if (openTarget) {
      openTarget({
        tab: target.tab,
        projectId: target.context?.projectId || null,
        usagePathId: target.context?.usagePathId || null,
        gapId: target.context?.gapId || null,
        coverageDimensionId: target.context?.coverageDimensionId || null,
        pageId: target.context?.pageId || null,
        featureDomainId: target.context?.featureDomainId || null,
        taskQuery: target.context?.taskQuery || '',
        alertTab: target.context?.alertTab || null,
        draftKey,
      });
    }
    setSearchQuery('');
  }, [shellTaskDrafts, openContextTargetRef]);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && searchResults.length > 0) {
      event.preventDefault();
      setSearchResultIndex((index) => Math.min(index + 1, searchResults.length - 1));
    }
    if (event.key === 'ArrowUp' && searchResults.length > 0) {
      event.preventDefault();
      setSearchResultIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && searchResults[activeSearchResultIndex]) {
      openSearchTarget(searchResults[activeSearchResultIndex]);
    }
    if (event.key === 'Escape') {
      setSearchQuery('');
      setSearchResultIndex(0);
    }
  }, [searchResults, activeSearchResultIndex, openSearchTarget]);

  // Knowledge search effect
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setKnowledgeSearchTargets([]);
      return undefined;
    }

    setKnowledgeSearchTargets([]);
    let active = true;
    const timer = window.setTimeout(async () => {
      const response = await fetchSearchData(`/api/kos/search?q=${encodeURIComponent(query)}&limit=8`);
      if (!active || !response.ok) return;
      const payload = (response.data || {}) as { results?: unknown[]; items?: unknown[] };
      const records = Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload.items)
          ? payload.items
          : [];
      const targets = records.flatMap((record, index) => {
        if (!record || typeof record !== 'object') return [];
        const item = record as Record<string, unknown>;
        const id = String(item.id || item.slug || item.title || `result-${index}`);
        const title = String(item.title || item.name || item.slug || id);
        const excerpt = String(item.chunk_text || item.content || item.text || '');
        return [{
          id: `kos-search-${id}-${index}`,
          tab: 'Knowledge',
          label: `知识证据：${title}`,
          group: '知识证据 · KOS',
          context: { taskQuery: id },
          keywords: [id, title, excerpt, 'KOS', '知识', '证据', '记忆', '上下文'],
        }];
      });
      setKnowledgeSearchTargets(targets);
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, fetchSearchData]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchResultIndex,
    setSearchResultIndex,
    dynamicSearchTargets,
    setDynamicSearchTargets,
    knowledgeSearchTargets,
    globalSearchInputRef,
    // Computed
    searchResults,
    activeSearchResultIndex,
    // Handlers
    openSearchTarget,
    handleSearchKeyDown,
  };
}
