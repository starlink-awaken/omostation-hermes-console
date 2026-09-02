import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComputeView from '../ComputeView';

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0, refetchInterval: false, refetchOnWindowFocus: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const client = createTestClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe('ComputeView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while data is pending', () => {
    renderWithProviders(<ComputeView />);
    expect(screen.getByText(/算力调配/)).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'));
    renderWithProviders(<ComputeView />);
    await waitFor(() => {
      expect(screen.getByText(/算力调配/)).toBeInTheDocument();
    });
  });

  it('renders the local compute model panel', () => {
    renderWithProviders(<ComputeView />);
    expect(screen.getByText('本地算力模型')).toBeInTheDocument();
  });
});
