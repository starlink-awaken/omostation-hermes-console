import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalWindow } from 'happy-dom';
import '@testing-library/jest-dom';
import BcosDashboard from '../BcosDashboard';

// Setup happy-dom global window for bun test
const window = new GlobalWindow();
global.document = window.document as unknown as Document;
global.window = window as unknown as Window & typeof globalThis;
global.navigator = window.navigator as unknown as Navigator;
global.HTMLElement = window.HTMLElement as unknown as typeof HTMLElement;
global.Element = window.Element as unknown as typeof Element;
global.Node = window.Node as unknown as typeof Node;
global.Event = window.Event as unknown as typeof Event;
global.requestAnimationFrame = window.requestAnimationFrame.bind(window) as typeof requestAnimationFrame;
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window) as typeof cancelAnimationFrame;

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

  afterEach(() => {
    cleanup();
  });

  it('renders page header with title and subtitle', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ available: false, error: 'unreachable' }), { status: 200 }),
    );
    const { getByRole, getByText } = renderWithClient();
    expect(getByRole('heading', { name: 'BCOS 北极星', level: 1 })).toBeInTheDocument();
    expect(getByText('业务闭环系统：北极星价值度量 + 信号路由 + 进化引擎')).toBeInTheDocument();
  });

  it('shows degraded state when backend is unavailable', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('backend unavailable'));
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('BCOS 服务不可用')).toBeInTheDocument();
    });
  });

  it('shows degraded state when api returns available=false', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ available: false, error: 'service down' }), { status: 200 }),
    );
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('BCOS 服务不可用')).toBeInTheDocument();
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
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('85')).toBeInTheDocument();
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
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('code')).toBeInTheDocument();
      expect(getByText('12')).toBeInTheDocument();
      expect(getByText('meeting')).toBeInTheDocument();
      expect(getByText('5')).toBeInTheDocument();
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
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('提议')).toBeInTheDocument();
      expect(getByText('test proposal')).toBeInTheDocument();
    });
  });
});
