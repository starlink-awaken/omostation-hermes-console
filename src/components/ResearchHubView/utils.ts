export async function fetchJson<T>(url: string, fallback: T, label: string): Promise<{ data: T; error: string | null }> {
  try {
    const response = await fetch(url);
    if (!response) return { data: fallback, error: `${label}：请求无响应` };
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { data: fallback, error: `${label} HTTP ${response.status}` };
    return { data: payload as T, error: null };
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return { data: fallback, error: `${label}：${error instanceof Error ? error.message : '请求失败'}` };
  }
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function statusText(status?: string) {
  if (status === 'active') return '活跃';
  if (status === 'archived') return '归档';
  if (status === 'quarantined') return '隔离';
  return '未知';
}

export function shortTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function matchesResearchFocusQuery(values: Array<string | number | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}
