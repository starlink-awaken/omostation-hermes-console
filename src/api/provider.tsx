/**
 * React Query provider for cockpit-ui.
 * 
 * This provider wraps the application and provides:
 * - QueryClient instance
 * - Default options for all queries
 * - DevTools in development mode
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface ApiProviderProps {
  children: ReactNode;
}

/**
 * Create a QueryClient with sensible defaults.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry failed requests 3 times
        retry: 3,
        // Retry with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Don't refetch on window focus by default (can be overridden per query)
        refetchOnWindowFocus: false,
        // Keep data fresh for 30 seconds by default
        staleTime: 30000,
        // Keep unused data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });
}

/**
 * Singleton QueryClient instance.
 * 
 * We use a singleton to avoid creating a new client on every render.
 * The client is created lazily on first use.
 */
let queryClient: QueryClient | null = null;

function getQueryClient() {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

/**
 * API provider component.
 * 
 * Usage:
 * ```tsx
 * import { ApiProvider } from './api/provider';
 * 
 * function App() {
 *   return (
 *     <ApiProvider>
 *       <YourApp />
 *     </ApiProvider>
 *   );
 * }
 * ```
 */
export function ApiProvider({ children }: ApiProviderProps) {
  const client = getQueryClient();
  
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Hook to access the QueryClient instance.
 * 
 * Useful for manual cache invalidation or prefetching.
 */
export function useQueryClientInstance() {
  return getQueryClient();
}
