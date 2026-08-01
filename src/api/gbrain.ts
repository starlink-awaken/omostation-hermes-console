/**
 * GBrain API adapter — wraps shared client with cookie-based auth.
 *
 * GBrain uses HttpOnly cookie auth (not Bearer token), so we need
 * credentials: 'same-origin' on all requests. This adapter provides
 * the same interface as the shared client but with GBrain-specific
 * auth semantics.
 *
 * Returns raw response data directly; throws on error (consistent
 * with component try/catch patterns).
 *
 * Replaces: src/components/GBrain/api.ts (deleted after migration)
 */

import { GBRAIN_ENDPOINTS } from './endpoints';

async function gbrainFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json();
}

async function gbrainFetchText(path: string): Promise<string> {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export const gbrain = {
  login: (token: string) =>
    gbrainFetch<{ ok: boolean }>(GBRAIN_ENDPOINTS.login, {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  signOutEverywhere: () =>
    gbrainFetch<{ ok: boolean }>(GBRAIN_ENDPOINTS.signOutEverywhere, {
      method: 'POST',
    }),

  stats: () =>
    gbrainFetch<{ connected_agents: number; requests_today: number; active_tokens: number }>(
      GBRAIN_ENDPOINTS.getStats,
    ),

  health: () =>
    gbrainFetch<{ expiring_soon: number; error_rate: string }>(
      GBRAIN_ENDPOINTS.getHealth,
    ),

  agents: () =>
    gbrainFetch<Array<{
      id: string;
      name: string;
      auth_type: 'oauth' | 'api_key';
      client_id?: string;
      client_name?: string;
      grant_types: string[];
      scope: string;
      created_at: string;
      last_used_at: string | null;
      total_requests: number;
      requests_today: number;
      token_ttl: number | null;
      status: 'active' | 'revoked';
    }>>(
      GBRAIN_ENDPOINTS.listAgents,
    ),

  requests: (page: number = 1, qs: string = '') =>
    gbrainFetch<{
      rows: Array<{
        id: number;
        token_name: string;
        agent_name: string;
        operation: string;
        latency_ms: number;
        status: string;
        params: Record<string, unknown> | null;
        error_message: string | null;
        created_at: string;
      }>;
      total: number;
      page: number;
      pages: number;
    }>(
      GBRAIN_ENDPOINTS.listRequests(page, qs),
    ),

  apiKeys: () =>
    gbrainFetch<Array<{ name: string; created_at: string }>>(
      GBRAIN_ENDPOINTS.listApiKeys,
    ),

  createApiKey: (name: string) =>
    gbrainFetch<{ name: string; token: string }>(GBRAIN_ENDPOINTS.createApiKey, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  revokeApiKey: (name: string) =>
    gbrainFetch<{ ok: boolean }>(GBRAIN_ENDPOINTS.revokeApiKey, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  updateClientTtl: (clientId: string, tokenTtl: number | null) =>
    gbrainFetch<{ ok: boolean }>(GBRAIN_ENDPOINTS.updateClientTtl, {
      method: 'POST',
      body: JSON.stringify({ clientId, tokenTtl }),
    }),

  revokeClient: (clientId: string) =>
    gbrainFetch<{ ok: boolean }>(GBRAIN_ENDPOINTS.revokeClient, {
      method: 'POST',
      body: JSON.stringify({ clientId }),
    }),

  calibrationProfile: (holder?: string) =>
    gbrainFetch<unknown>(GBRAIN_ENDPOINTS.getCalibrationProfile(holder)),

  calibrationChart: (type: string, holder?: string) =>
    gbrainFetchText(GBRAIN_ENDPOINTS.getCalibrationChart(type, holder)),
};
