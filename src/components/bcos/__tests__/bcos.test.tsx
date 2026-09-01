import React from 'react';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Window } from 'happy-dom';
import BcosDashboard from '../BcosDashboard';

// Setup happy-dom for bun test
const window = new Window();
global.document = window.document as unknown as Document;
global.window = window as unknown as Window & typeof globalThis;
global.navigator = window.navigator as unknown as Navigator;
global.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;

function renderWithClient() {
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
  return render(
    <QueryClientProvider client={client}>
      <BcosDashboard />
    </QueryClientProvider>,
  );
}

describe('BcosDashboard', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders page header with title and subtitle', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ available: false, error: 'unreachable' }), { status: 200 }),
    );
    renderWithClient();
    expect(screen.getByRole('heading', { name: 'BCOS 北极星', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('业务闭环系统：北极星价值度量 + 信号路由 + 进化引擎')).toBeInTheDocument();
  });

  it('shows degraded state when backend is unavailable', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('backend unavailable'));
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('BCOS 服务不可用')).toBeInTheDocument();
    });
  });

  it('shows degraded state when api returns available=false', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ available: false, error: 'service down' }), { status: 200 }),
    );
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('BCOS 服务不可用')).toBeInTheDocument();
    });
  });

  it('renders north star value when data is available', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          north_star: { value: 85, trend: 'up', details: { coverage: 92 } },
          signals: [{ type: 'code', count: 12 }],
          evolution: { stage: 'evaluate', proposals: [] },
        }),
        { status: 200 },
      ),
    );
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });
  });

  it('renders signal flow with correct counts', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          north_star: { value: 70, trend: 'stable' },
          signals: [
            { type: 'code', count: 12 },
            { type: 'meeting', count: 5 },
          ],
          evolution: { stage: 'observe' },
        }),
        { status: 200 },
      ),
    );
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('code')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('meeting')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('renders evolution pipeline with active stage', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          north_star: { value: 60, trend: 'down' },
          signals: [],
          evolution: { stage: 'propose', proposals: [{ id: 'p1', title: 'test proposal' }] },
        }),
        { status: 200 },
      ),
    );
    renderWithClient();
    await waitFor(() => {
      expect(screen.getByText('提议')).toBeInTheDocument();
      expect(screen.getByText('test proposal')).toBeInTheDocument();
    });
  });
});
