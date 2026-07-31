/**
 * GBrain API adapter — wraps shared client with cookie-based auth.
 *
 * GBrain uses HttpOnly cookie auth (not Bearer token), so we need
 * credentials: 'same-origin' on all requests. This adapter provides
 * the same interface as the shared client but with GBrain-specific
 * auth semantics.
 *
 * Replaces: src/components/GBrain/api.ts (deleted after migration)
 */

import { GBRAIN_ENDPOINTS } from './endpoints';

export interface GBrainApiResponse<T> {
  data: T | null;
  error: string | null;
  ok: boolean;
}

async function gbrainFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<GBrainApiResponse<T>> {
  try {
    const res = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (res.status === 401) {
      return { data: null, error: 'Unauthorized', ok: false };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        data: null,
        error: (body as { error?: string }).error || `HTTP ${res.status}`,
        ok: false,
      };
    }

    const data = await res.json();
    return { data, error: null, ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { data: null, error: message, ok: false };
  }
}

async function gbrainFetchText(path: string): Promise<GBrainApiResponse<string>> {
  try {
    const res = await fetch(path, { credentials: 'same-origin' });
    if (res.status === 401) return { data: null, error: 'Unauthorized', ok: false };
    if (!res.ok) return { data: null, error: `HTTP ${res.status}`, ok: false };
    const text = await res.text();
    return { data: text, error: null, ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { data: null, error: message, ok: false };
  }
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
    gbrainFetch<Array<{ id: string; name: string; status: string }>>(
      GBRAIN_ENDPOINTS.listAgents,
    ),

  requests: (page: number = 1, qs: string = '') =>
    gbrainFetch<{ requests: unknown[]; total: number }>(
      GBRAIN_ENDPOINTS.listRequests(page, qs),
    ),

  apiKeys: () =>
    gbrainFetch<Array<{ name: string; created_at: string }>>(
      GBRAIN_ENDPOINTS.listApiKeys,
    ),

  createApiKey: (name: string) =>
    gbrainFetch<{ key: string }>(GBRAIN_ENDPOINTS.createApiKey, {
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
