import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ResearchHubView from '../ResearchHubView';

describe('ResearchHubView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders loading state while data loads', () => {
    render(<ResearchHubView />);
    expect(screen.getByText('正在读取研究主旅程、最近研究对象和发布节奏...')).toBeInTheDocument();
  });

  it('renders error state when source is unavailable', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);
    render(<ResearchHubView />);
    await waitFor(() => {
      expect(screen.getByText('研究数据需要补证')).toBeInTheDocument();
    });
  });

  it('renders research sections when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        summary: { total: 5, active: 2, archived: 1, quarantined: 0, published: 1, follow_ups: 1, agents: 2 },
        recent: [],
        commands: [],
        pipeline: [],
        related_pages: [],
      }),
    } as Response);
    render(<ResearchHubView />);
    await waitFor(() => {
      expect(screen.getByText('研究主旅程')).toBeInTheDocument();
    });
  });
});
