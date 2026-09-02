import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LogViewerPage from '../LogViewerPage';

describe('LogViewerPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => undefined));
  });

  it('renders header with title', () => {
    render(<LogViewerPage />);
    expect(screen.getByText('日志查看器')).toBeInTheDocument();
  });

  it('renders loading state while logs load', () => {
    render(<LogViewerPage />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('日志数据不可用'));
    render(<LogViewerPage />);
    await waitFor(
      () => {
        expect(screen.getByText('日志加载失败')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it('renders log lines when data loads', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { timestamp: '2026-08-01T10:00:00Z', level: 'info', source: 'app', message: 'Service started' },
          { timestamp: '2026-08-01T10:01:00Z', level: 'error', source: 'db', message: 'Connection failed' },
        ],
        total: 2,
      }),
    } as Response);
    render(<LogViewerPage />);
    await waitFor(() => {
      expect(screen.getByText('Service started')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
});
