import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import DeliveryJourneyView from '../DeliveryJourneyView';

const mockLiveJourney = {
  ok: true,
  status: 'live',
  journey: {
    id: 'test-run-100',
    title: 'Test Live Journey',
    status: 'live',
    source: ['omo', 'agent-workflow'],
    freshness: 0,
    last_updated: '2026-08-01T12:00:00Z',
    stages: {
      intent: {
        name: 'intent',
        status: 'verified',
        title: '意图已确认',
        details: { objective: '实现交付旅程' },
        last_updated: '2026-08-01T12:00:00Z',
      },
      task: {
        name: 'task',
        status: 'verified',
        title: '任务已认领',
        details: {},
        last_updated: '2026-08-01T12:00:00Z',
      },
      run: {
        name: 'run',
        status: 'running',
        title: '正在运行中',
        details: {},
        last_updated: '2026-08-01T12:00:00Z',
      },
      worktree: {
        name: 'worktree',
        status: 'verified',
        title: '工作区干净',
        details: {},
        last_updated: '2026-08-01T12:00:00Z',
      },
      verification: {
        name: 'verification',
        status: 'pending',
        title: '检查等待中',
        details: {},
        last_updated: '2026-08-01T12:00:00Z',
      },
      pr: {
        name: 'pr',
        status: 'pending',
        title: '尚未提交 PR',
        details: {},
        last_updated: '2026-08-01T12:00:00Z',
      },
      evidence: {
        name: 'evidence',
        status: 'pending',
        title: '证据收集',
        details: {},
        last_updated: '2026-08-01T12:00:00Z',
      },
    },
  },
};

describe('DeliveryJourneyView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders live projection stages correctly without fake green', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLiveJourney,
    }));

    render(<DeliveryJourneyView />);

    await waitFor(() => {
      expect(screen.getByText('工程交付黄金旅程 (Delivery Journey)')).toBeInTheDocument();
      expect(screen.getByText('意图已确认')).toBeInTheDocument();
      expect(screen.getByText('1. 意图 (Intent)')).toBeInTheDocument();
      expect(screen.getByText('6. 审核合并 (PR)')).toBeInTheDocument();
    });
  });

  it('degrades to unavailable error state when API fails instead of showing fake green', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));

    render(<DeliveryJourneyView />);

    await waitFor(() => {
      expect(screen.getByText('Network offline')).toBeInTheDocument();
      expect(screen.getByText(/控制台绝不在没有可验证或真实数据时伪造/i)).toBeInTheDocument();
    });
  });

  it('switches fixture states when clicking fixture buttons', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('fixture=VERIFIED')) {
        return {
          ok: true,
          json: async () => ({
            ...mockLiveJourney,
            journey: {
              ...mockLiveJourney.journey,
              stages: {
                ...mockLiveJourney.journey.stages,
                intent: {
                  ...mockLiveJourney.journey.stages.intent,
                  title: 'Fixture 已验证状态标题',
                },
              },
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => mockLiveJourney,
      };
    }));

    render(<DeliveryJourneyView />);

    await waitFor(() => {
      expect(screen.getByText('意图已确认')).toBeInTheDocument();
    });

    const verifiedBtn = screen.getByRole('button', { name: 'VERIFIED' });
    fireEvent.click(verifiedBtn);

    await waitFor(() => {
      expect(screen.getByText('Fixture 已验证状态标题')).toBeInTheDocument();
    });
  });
});
