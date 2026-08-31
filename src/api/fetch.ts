/**
 * @deprecated 使用 `src/api/client.ts` 中的 apiFetch/apiPost/apiPut/apiDelete 替代。
 * 此文件保留仅为兼容，将在后续 Phase 迁移中移除。
 *
 * 通用 fetch 包装器.
 */

/** 默认超时毫秒 (5 秒) */
export const DEFAULT_FETCH_TIMEOUT_MS = 5000;

/** fetch 结果包装 */
export interface FetchResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
}

/**
 * 带超时的 fetch.
 *
 * 超时或网络错误时返回 { ok: false, error } 而非抛出.
 *
 * @param url 请求地址
 * @param options 原生 fetch 选项 (可选)
 * @param timeoutMs 超时毫秒 (默认 5000)
 */
export async function fetchWithTimeout<T = unknown>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<FetchResult<T>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) return { ok: false, data: null, error: `HTTP ${response.status}` };
    return { ok: true, data: await response.json() as T };
  } catch (error) {
    const errorMessage = error instanceof Error && error.name === 'AbortError'
      ? `请求超过 ${timeoutMs / 1000} 秒`
      : error instanceof Error ? error.message : '网络异常';
    return { ok: false, data: null, error: errorMessage };
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * 解包 PromiseSettledResult<Response> 为强类型结果.
 *
 * 用于 Promise.allSettled 后的统一处理:
 *   const results = await Promise.allSettled([fetch(...), fetch(...)]);
 *   const [a, b] = results.map(r => readFetchResult<T>(r, 'fallback'));
 *
 * @param result PromiseSettledResult<Response>
 * @param fallbackMessage 失败时的默认错误消息
 */
export async function readFetchResult<T>(
  result: PromiseSettledResult<Response>,
  fallbackMessage: string,
): Promise<FetchResult<T>> {
  if (result.status === 'rejected') {
    return {
      ok: false,
      data: null,
      error: result.reason instanceof Error ? result.reason.message : fallbackMessage,
    };
  }
  try {
    const payload = await result.value.json();
    if (!result.value.ok) {
      const detail = (payload as { detail?: string }).detail;
      return { ok: false, data: null, error: detail || result.value.statusText || fallbackMessage };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, data: null, error: fallbackMessage };
  }
}
