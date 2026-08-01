import { describe, it, expect } from 'vitest';
import {
  normalizeStatus,
  badgeClass,
  statusText,
  summaryStatusText,
  focusStatusText,
  maturityStatusText,
  portfolioStatusText,
  coverageTone,
  actionLoadTone,
} from '../status';

describe('normalizeStatus', () => {
  it('识别 online 同义词', () => {
    expect(normalizeStatus('running')).toBe('online');
    expect(normalizeStatus('active')).toBe('online');
    expect(normalizeStatus('healthy')).toBe('online');
    expect(normalizeStatus('ready')).toBe('online');
  });

  it('识别 offline 同义词', () => {
    expect(normalizeStatus('stopped')).toBe('offline');
    expect(normalizeStatus('missing')).toBe('offline');
    expect(normalizeStatus('unreachable')).toBe('offline');
  });

  it('未知状态归为 degraded', () => {
    expect(normalizeStatus('unknown')).toBe('degraded');
    expect(normalizeStatus('weird_state')).toBe('degraded');
  });
});

describe('badgeClass', () => {
  it('与 normalizeStatus 输出一致', () => {
    expect(badgeClass('running')).toBe('online');
    expect(badgeClass('stopped')).toBe('offline');
    expect(badgeClass('unknown')).toBe('degraded');
  });
});

describe('statusText', () => {
  it('返回中文标签', () => {
    expect(statusText('online')).toBe('在线');
    expect(statusText('running')).toBe('在线');
    expect(statusText('stopped')).toBe('离线');
    expect(statusText('degraded')).toBe('降级');
    expect(statusText('idle')).toBe('空闲');
  });

  it('未知状态返回原值', () => {
    expect(statusText('custom_state')).toBe('custom_state');
  });
});

describe('summaryStatusText', () => {
  it('映射汇总状态', () => {
    expect(summaryStatusText('blocked')).toBe('阻塞');
    expect(summaryStatusText('at_risk')).toBe('风险');
    expect(summaryStatusText('healthy')).toBe('健康');
    expect(summaryStatusText('watch')).toBe('观察');
    expect(summaryStatusText()).toBe('未知');
  });
});

describe('focusStatusText', () => {
  it('映射焦点状态', () => {
    expect(focusStatusText('healthy')).toBe('健康');
    expect(focusStatusText('watch')).toBe('观察');
    expect(focusStatusText('at_risk')).toBe('风险');
    expect(focusStatusText('blocked')).toBe('阻塞');
    expect(focusStatusText('unknown')).toBe('未知');
  });
});

describe('maturityStatusText', () => {
  it('映射成熟度', () => {
    expect(maturityStatusText('ready')).toBe('就绪');
    expect(maturityStatusText('watch')).toBe('观察');
    expect(maturityStatusText('gap')).toBe('缺口');
    expect(maturityStatusText('unknown')).toBe('未知');
  });
});

describe('portfolioStatusText', () => {
  it('映射项目状态', () => {
    expect(portfolioStatusText('blocked')).toBe('阻塞');
    expect(portfolioStatusText('at_risk')).toBe('风险');
    expect(portfolioStatusText('watch')).toBe('观察');
    expect(portfolioStatusText('healthy')).toBe('健康');
    expect(portfolioStatusText()).toBe('未知');
  });
});

describe('coverageTone', () => {
  it('失败计数优先 → offline', () => {
    expect(coverageTone(100, 1, 0)).toBe('offline');
  });

  it('分数 < 70 → offline', () => {
    expect(coverageTone(69, 0, 0)).toBe('offline');
  });

  it('警告计数 → degraded', () => {
    expect(coverageTone(100, 0, 1)).toBe('degraded');
  });

  it('分数 < 85 → degraded', () => {
    expect(coverageTone(84, 0, 0)).toBe('degraded');
  });

  it('分数 >= 85 且无警告 → online', () => {
    expect(coverageTone(85, 0, 0)).toBe('online');
    expect(coverageTone(100, 0, 0)).toBe('online');
  });
});

describe('actionLoadTone', () => {
  it('验证缺口或能力缺口 → offline', () => {
    expect(actionLoadTone({ verificationGapProjects: 1 })).toBe('offline');
    expect(actionLoadTone({ capabilityGapDrafts: 1 })).toBe('offline');
  });

  it('验证就绪或草稿 → degraded', () => {
    expect(actionLoadTone({ verificationReadyProjects: 1 })).toBe('degraded');
    expect(actionLoadTone({ pageMaturityDrafts: 1 })).toBe('degraded');
    expect(actionLoadTone({ domainAppDrafts: 1 })).toBe('degraded');
  });

  it('无负载 → online', () => {
    expect(actionLoadTone({})).toBe('online');
  });

  it('undefined 字段视为 0', () => {
    expect(actionLoadTone({ verificationGapProjects: undefined })).toBe('online');
  });
});
