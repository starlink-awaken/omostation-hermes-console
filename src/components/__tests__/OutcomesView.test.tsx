import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OutcomesView from '../OutcomesView';
import { DISCONNECTED_LABEL, OUTCOMES_TAB_LABELS } from '../outcomesDisplay';

function withQueryClient(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
      },
    },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const okJson = (body: unknown) =>
  Promise.resolve({
    ok: true,
    json: async () => body,
  } as Response);

function mockOutcomesFeeds(handlers: (url: string) => Promise<Response> | Response) {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    return Promise.resolve(handlers(String(input)));
  });
}

describe('OutcomesView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('renders the three named views as tabs', async () => {
    mockOutcomesFeeds(() =>
      new Response('backend unavailable', { status: 503 }),
    );
    render(withQueryClient(<OutcomesView />));
    expect(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.pending })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.history })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.calibration })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(DISCONNECTED_LABEL).length).toBeGreaterThan(0);
    });
  });

  it('shows 未接入 for disconnected summary metrics, never a proxy 0', async () => {
    mockOutcomesFeeds(() =>
      Promise.reject(new Error('backend unavailable')),
    );
    render(withQueryClient(<OutcomesView />));
    await waitFor(() => {
      expect(screen.getAllByText(DISCONNECTED_LABEL).length).toBeGreaterThan(0);
    });
    const summaryLabels = ['待裁决', '已裁决', '校准场景', '知识引用率'];
    for (const label of summaryLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('keeps a live zero as 0 and a live citation_rate of 0 as 0.0%', async () => {
    mockOutcomesFeeds((url) => {
      if (url === '/api/outcomes') {
        return okJson({
          ok: true,
          pending_count: 0,
          history_count: 0,
          calibration_scenes: 0,
          knowledge_funnel: {
            retrieved: 0,
            cited: 0,
            citation_rate: 0,
            task_created: 0,
            status: 'live',
          },
        });
      }
      if (url === '/api/outcomes/pending') {
        return okJson({ ok: true, items: [] });
      }
      if (url.startsWith('/api/outcomes/history')) {
        return okJson({ ok: true, items: [] });
      }
      if (url === '/api/outcomes/calibration') {
        return okJson({ ok: true, scenes: [], capabilities: [] });
      }
      return new Response('missing', { status: 404 });
    });

    render(withQueryClient(<OutcomesView />));
    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
    });
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByText('暂无待裁决项')).toBeInTheDocument();
  });

  it('shows a live pending item and 未接入 on the calibration tab when that feed is empty', async () => {
    mockOutcomesFeeds((url) => {
      if (url === '/api/outcomes') {
        return okJson({
          ok: true,
          pending_count: 1,
          history_count: 1,
          calibration_scenes: 0,
          knowledge_funnel: { status: 'off', citation_rate: null, retrieved: 0, cited: 0 },
        });
      }
      if (url === '/api/outcomes/pending') {
        return okJson({
          ok: true,
          items: [
            {
              scene_id: 'scene-format-check',
              run_id: 'run-1',
              submitted_at: '2026-08-15T00:00:00Z',
              actor: 'tester',
              notes: 'needs review',
            },
          ],
        });
      }
      if (url.startsWith('/api/outcomes/history')) {
        return okJson({
          ok: true,
          items: [
            {
              scene_id: 'scene-format-check',
              run_id: 'run-0',
              adjudication: 'accepted',
              actor: 'human',
              adjudicated_at: '2026-08-14T00:00:00Z',
              notes: 'ok',
            },
          ],
        });
      }
      if (url === '/api/outcomes/calibration') {
        return okJson({ ok: true, scenes: [], capabilities: [] });
      }
      return new Response('missing', { status: 404 });
    });

    render(withQueryClient(<OutcomesView />));
    await waitFor(() => {
      expect(screen.getByText('scene-format-check')).toBeInTheDocument();
    });
    expect(screen.getByText('needs review')).toBeInTheDocument();
    expect(screen.getByText(DISCONNECTED_LABEL)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.history }));
    await waitFor(() => {
      expect(screen.getByText('accepted')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: OUTCOMES_TAB_LABELS.calibration }));
    await waitFor(() => {
      expect(screen.getAllByText(DISCONNECTED_LABEL).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('场景校准')).toBeInTheDocument();
    expect(screen.getByText('能力校准')).toBeInTheDocument();
  });
});
