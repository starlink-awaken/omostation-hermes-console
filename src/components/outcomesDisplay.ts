/**
 * Display rules for /outcomes and /journeys (BET-Y1Q2-T8-01).
 *
 * D1: a missing feed renders the literal "未接入", never a proxy 0 or "—".
 * A live feed with a real zero still renders 0.
 */

export const DISCONNECTED_LABEL = '未接入';

export const OUTCOMES_TAB_LABELS = {
  pending: '待裁决队列',
  history: '已裁决历史',
  calibration: '校准曲线',
} as const;

export type OutcomesTab = keyof typeof OUTCOMES_TAB_LABELS;

export type FeedState = 'loading' | 'disconnected' | 'live';

export interface FeedQueryFlags {
  isLoading?: boolean;
  isPending?: boolean;
  isError?: boolean;
  hasData?: boolean;
}

export interface KnowledgeFunnelLike {
  status?: string;
  citation_rate?: number | null;
  retrieved?: number;
  cited?: number;
}

export function feedState(flags: FeedQueryFlags): FeedState {
  if (flags.isLoading || flags.isPending) return 'loading';
  if (flags.isError || !flags.hasData) return 'disconnected';
  return 'live';
}

export function countDisplay(
  state: FeedState,
  value: number | null | undefined,
): string {
  if (state === 'loading') return '加载中...';
  if (state !== 'live') return DISCONNECTED_LABEL;
  if (value === null || value === undefined) return DISCONNECTED_LABEL;
  return String(value);
}

export function ratePercentDisplay(
  state: FeedState,
  rate: number | null | undefined,
  opts?: { sampleSize?: number; digits?: number },
): string {
  if (state === 'loading') return '加载中...';
  if (state !== 'live') return DISCONNECTED_LABEL;
  if (rate === null || rate === undefined) return DISCONNECTED_LABEL;
  if (opts?.sampleSize !== undefined && opts.sampleSize <= 0) {
    return DISCONNECTED_LABEL;
  }
  return `${(rate * 100).toFixed(opts?.digits ?? 0)}%`;
}

export function knowledgeFunnelRateDisplay(
  funnel?: KnowledgeFunnelLike | null,
): string {
  if (!funnel || funnel.status !== 'live') return DISCONNECTED_LABEL;
  if (funnel.citation_rate === null || funnel.citation_rate === undefined) {
    return DISCONNECTED_LABEL;
  }
  return `${(funnel.citation_rate * 100).toFixed(1)}%`;
}

export function listPlaceholder(state: FeedState, emptyMessage: string): string {
  if (state === 'loading') return '加载中...';
  if (state !== 'live') return DISCONNECTED_LABEL;
  return emptyMessage;
}

export function calibrationBlockDisconnected(
  state: FeedState,
  items: readonly unknown[] | undefined,
): boolean {
  return state !== 'live' || !items || items.length === 0;
}
