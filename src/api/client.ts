/**
 * Centralized API client for cockpit-ui.
 * 
 * All fetch calls should go through this client to ensure:
 * - Consistent error handling
 * - Request cancellation support
 * - Loading/error state management
 * - Type safety
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  ok: boolean;
}

export interface ApiRequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Core fetch wrapper with error handling and timeout support.
 */
export async function apiFetch<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, signal, headers = {} } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine external signal with timeout controller
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        ok: false,
      };
    }

    const data = await response.json();
    return { data, error: null, ok: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { data: null, error: 'Request cancelled', ok: false };
      }
      return { data: null, error: error.message, ok: false };
    }
    return { data: null, error: 'Unknown error', ok: false };
  }
}

/**
 * POST request wrapper.
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, signal, headers = {} } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        ok: false,
      };
    }

    const data = await response.json();
    return { data, error: null, ok: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { data: null, error: 'Request cancelled', ok: false };
      }
      return { data: null, error: error.message, ok: false };
    }
    return { data: null, error: 'Unknown error', ok: false };
  }
}

/**
 * PUT request wrapper.
 */
export async function apiPut<T>(
  url: string,
  body: unknown,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, signal, headers = {} } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        ok: false,
      };
    }

    const data = await response.json();
    return { data, error: null, ok: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { data: null, error: 'Request cancelled', ok: false };
      }
      return { data: null, error: error.message, ok: false };
    }
    return { data: null, error: 'Unknown error', ok: false };
  }
}

/**
 * DELETE request wrapper.
 */
export async function apiDelete<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, signal, headers = {} } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        ok: false,
      };
    }

    const data = await response.json();
    return { data, error: null, ok: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { data: null, error: 'Request cancelled', ok: false };
      }
      return { data: null, error: error.message, ok: false };
    }
    return { data: null, error: 'Unknown error', ok: false };
  }
}
