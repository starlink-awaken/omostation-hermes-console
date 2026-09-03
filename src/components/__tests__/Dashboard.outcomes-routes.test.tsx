import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';

function renderAt(path: string) {
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
      <MemoryRouter initialEntries={[path]}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard wires /outcomes and /journeys redirects', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockRejectedValue(new Error('backend unavailable'));
  });

  it('redirects /outcomes to /governance-domain (Phase 3 IA redirect)', async () => {
    renderAt('/outcomes');
    await waitFor(() => {
      // ROUTE_REDIRECTS maps /outcomes → /governance-domain
      expect(
        screen.getAllByRole('heading', { name: '治理域', level: 1 })[0],
      ).toBeInTheDocument();
    });
  });

  it('redirects /journeys to /governance-domain (Phase 3 IA redirect)', async () => {
    renderAt('/journeys');
    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: '治理域', level: 1 })[0],
      ).toBeInTheDocument();
    });
  });
});
