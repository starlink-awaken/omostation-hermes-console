import { type ProtocolPayload, type ProtocolSurfaceId } from './types';

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

export function statusLabel(status: string) {
  if (status === 'ready') return '就绪';
  if (status === 'watch') return '观察';
  return '未知';
}

export function shortTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function matchesProtocolFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function inferProtocolSurface(query?: string): ProtocolSurfaceId {
  if (matchesProtocolFocusQuery(['workflow', 'run', '编排', '运行', '调度'], query)) return 'workflows';
  if (matchesProtocolFocusQuery(['command', 'copy', 'evidence', 'audit', '命令', '补证', '审计'], query)) return 'evidence';
  if (matchesProtocolFocusQuery(['governance', 'roadmap', 'systemmap', 'system map', 'task', '治理', '路线图', '任务'], query)) return 'governance';
  return 'layers';
}
