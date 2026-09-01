/**
 * React Query hooks for cockpit-ui — kems (KOS) domain.
 *
 * Part of the hooks split from src/api/hooks.ts.
 * Covers: KOS search.
 */

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { API_ENDPOINTS } from './endpoints';

// ── KOS Search ──

export interface KosSearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface KosSearchResponse {
  results: KosSearchResult[];
  total?: number;
}

export function useKosSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ['kos-search', query, limit],
    queryFn: () => apiFetch<KosSearchResponse>(API_ENDPOINTS.kos.search(query, limit)),
    enabled: query.length >= 2, // Only search when query is at least 2 characters
    staleTime: 30000,
  });
}
