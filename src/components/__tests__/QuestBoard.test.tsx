import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuestBoard from '../QuestBoard';

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

describe('QuestBoard', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header with title', () => {
    renderWithProviders(<QuestBoard />);
    expect(screen.getByText('积分冒险看板')).toBeInTheDocument();
    expect(screen.getByText('添加任务')).toBeInTheDocument();
  });

  it('renders loading state while fetching', () => {
    renderWithProviders(<QuestBoard />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders quest items when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        quests: [
          { id: 1, title: 'Fix router', type: 'responsibility', reward: 50, completed: 0, assignee: 'Alice' },
          { id: 2, title: 'Write docs', type: 'wisdom', reward: 30, completed: 0, assignee: 'Bob' },
        ],
        profiles: [],
        logs: [],
      }),
    } as Response);
    renderWithProviders(<QuestBoard />);
    await waitFor(() => {
      expect(screen.getByText('Fix router')).toBeInTheDocument();
      expect(screen.getByText('Write docs')).toBeInTheDocument();
    });
  });

  it('renders profile cards when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        quests: [],
        profiles: [
          { role: 'engineer', name: 'Alice', level: 5, wisdomPoints: 120, responsibilityPoints: 80 },
        ],
        logs: [],
      }),
    } as Response);
    renderWithProviders(<QuestBoard />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText(/engineer/)).toBeInTheDocument();
    });
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Failed to load'));
    renderWithProviders(<QuestBoard />);
    await waitFor(
      () => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
