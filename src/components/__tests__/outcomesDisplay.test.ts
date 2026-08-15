import { describe, expect, it } from 'vitest';
import {
  DISCONNECTED_LABEL,
  OUTCOMES_TAB_LABELS,
  calibrationBlockDisconnected,
  countDisplay,
  feedState,
  knowledgeFunnelRateDisplay,
  listPlaceholder,
  ratePercentDisplay,
} from '../outcomesDisplay';

describe('outcomesDisplay D1 rules', () => {
  it('names the three shipped /outcomes tabs', () => {
    expect(Object.values(OUTCOMES_TAB_LABELS)).toEqual([
      '待裁决队列',
      '已裁决历史',
      '校准曲线',
    ]);
  });

  it('treats missing or failed queries as disconnected, not live zeros', () => {
    expect(feedState({ isLoading: true })).toBe('loading');
    expect(feedState({ isError: true, hasData: false })).toBe('disconnected');
    expect(feedState({ hasData: false })).toBe('disconnected');
    expect(feedState({ hasData: true })).toBe('live');
  });

  it('renders 未接入 for disconnected counts and 0 for a live zero', () => {
    expect(countDisplay('disconnected', 0)).toBe(DISCONNECTED_LABEL);
    expect(countDisplay('disconnected', undefined)).toBe(DISCONNECTED_LABEL);
    expect(countDisplay('live', 0)).toBe('0');
    expect(countDisplay('live', 4)).toBe('4');
    expect(countDisplay('live', null)).toBe(DISCONNECTED_LABEL);
    expect(countDisplay('loading', 3)).toBe('加载中...');
  });

  it('does not invent a 0% rate when the sample or feed is missing', () => {
    expect(ratePercentDisplay('disconnected', 0)).toBe(DISCONNECTED_LABEL);
    expect(ratePercentDisplay('live', 0, { sampleSize: 0 })).toBe(DISCONNECTED_LABEL);
    expect(ratePercentDisplay('live', 0, { sampleSize: 12 })).toBe('0%');
    expect(ratePercentDisplay('live', 0.5, { digits: 0 })).toBe('50%');
    expect(ratePercentDisplay('live', null)).toBe(DISCONNECTED_LABEL);
  });

  it('marks knowledge funnel live zeros as 0.0% and other statuses as 未接入', () => {
    expect(knowledgeFunnelRateDisplay(undefined)).toBe(DISCONNECTED_LABEL);
    expect(knowledgeFunnelRateDisplay({ status: 'off' })).toBe(DISCONNECTED_LABEL);
    expect(
      knowledgeFunnelRateDisplay({ status: 'live', citation_rate: null }),
    ).toBe(DISCONNECTED_LABEL);
    expect(
      knowledgeFunnelRateDisplay({ status: 'live', citation_rate: 0 }),
    ).toBe('0.0%');
    expect(
      knowledgeFunnelRateDisplay({ status: 'live', citation_rate: 0.256 }),
    ).toBe('25.6%');
  });

  it('keeps empty live queues as empty copy and failed feeds as 未接入', () => {
    expect(listPlaceholder('disconnected', '暂无待裁决项')).toBe(DISCONNECTED_LABEL);
    expect(listPlaceholder('live', '暂无待裁决项')).toBe('暂无待裁决项');
    expect(calibrationBlockDisconnected('disconnected', [])).toBe(true);
    expect(calibrationBlockDisconnected('live', [])).toBe(true);
    expect(calibrationBlockDisconnected('live', [{ scene_id: 's1' }])).toBe(false);
  });
});
