import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalWindow } from 'happy-dom';
import '@testing-library/jest-dom';
import PulseView from '../PulseView';

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
      <PulseView />
    </QueryClientProvider>,
  );
}

describe('PulseView', () => {
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
    expect(getByRole('heading', { name: '治理脉搏', level: 1 })).toBeInTheDocument();
    expect(getByText('P74 工作流沉默治理')).toBeInTheDocument();
  });

  it('shows degraded state when backend is unavailable', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('backend unavailable'));
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('P74 服务不可用')).toBeInTheDocument();
    });
  });

  it('shows degraded state when api returns available=false', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ available: false, error: 'service down' }), { status: 200 }),
    );
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('P74 服务不可用')).toBeInTheDocument();
    });
  });

  it('renders warn_count when data is available', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          warn_count: 3,
          workflows: [
            { name: 'project-code-change', status: 'silent', days: 45, threshold: 30 },
          ],
        }),
        { status: 200 },
      ),
    );
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('3')).toBeInTheDocument();
    });
  });

  it('renders workflow list with correct details', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          warn_count: 2,
          workflows: [
            { name: 'project-code-change', status: 'silent', days: 45, threshold: 30 },
            { name: 'agent-heartbeat', status: 'silent', days: 10, threshold: 7 },
          ],
        }),
        { status: 200 },
      ),
    );
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('project-code-change')).toBeInTheDocument();
      expect(getByText('agent-heartbeat')).toBeInTheDocument();
    });
  });

  it('shows silent status badge for silent workflows', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          warn_count: 1,
          workflows: [
            { name: 'silent-wf', status: 'silent', days: 35, threshold: 30 },
          ],
        }),
        { status: 200 },
      ),
    );
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText('沉默')).toBeInTheDocument();
    });
  });

  it('shows warning message when warn_count > 0', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          available: true,
          warn_count: 5,
          workflows: [],
        }),
        { status: 200 },
      ),
    );
    const { getByText } = renderWithClient();
    await waitFor(() => {
      expect(getByText(/存在 5 个超过沉默阈值的工作流/)).toBeInTheDocument();
    });
  });
});
