import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JourneysTimelineView from '../JourneysTimelineView';
import { DISCONNECTED_LABEL } from '../outcomesDisplay';

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

describe('JourneysTimelineView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('renders the journeys timeline heading and 未接入 when the feed is down', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('backend unavailable'));
    render(withQueryClient(<JourneysTimelineView />));
    expect(screen.getByText('旅程时间线')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText(DISCONNECTED_LABEL).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('暂无旅程记录')).not.toBeInTheDocument();
  });

  it('shows a live zero journey count without faking a success rate', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/journeys')) {
        return okJson({ ok: true, total: 0, success_rate: 0, items: [] });
      }
      return Promise.resolve(new Response('missing', { status: 404 }));
    });
    render(withQueryClient(<JourneysTimelineView />));
    await waitFor(() => {
      expect(screen.getByText('暂无旅程记录')).toBeInTheDocument();
    });
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(DISCONNECTED_LABEL)).toBeInTheDocument();
    expect(screen.getByText('总旅程').parentElement).toHaveTextContent('0');
  });

  it('renders live timeline items from the shipped /api/journeys payload', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/journeys')) {
        return okJson({
          ok: true,
          total: 1,
          success_rate: 1,
          items: [
            {
              source: 'scene-outcome',
              scene_id: 'scene-format-check',
              journey_id: 'j-1',
              status: 'accepted',
              started_at: '2026-08-15T01:00:00Z',
              completed_at: '2026-08-15T01:05:00Z',
              actor: 'tester',
              notes: 'shipped',
            },
          ],
        });
      }
      return Promise.resolve(new Response('missing', { status: 404 }));
    });
    render(withQueryClient(<JourneysTimelineView />));
    await waitFor(() => {
      expect(screen.getAllByText('scene-format-check').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('场景结果')).toBeInTheDocument();
    expect(screen.getByText('j-1')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('shipped')).toBeInTheDocument();
  });
});
