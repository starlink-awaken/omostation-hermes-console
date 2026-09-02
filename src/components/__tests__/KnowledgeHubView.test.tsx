import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KnowledgeHubView from '../KnowledgeHubView';

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

describe('KnowledgeHubView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes('tasks') || url.includes('insights')) {
        return { ok: true, json: async () => ({ items: [] }) } as Response;
      }
      return { ok: true, json: async () => ({ id: 'test', title: 'test' }) } as Response;
    });
  });

  it('renders knowledge surface sections', async () => {
    const { container } = renderWithProviders(<KnowledgeHubView />);
    await waitFor(() => {
      expect(container.textContent).toContain('知识维度地图');
    });
  });

  it('renders knowledge closure table', async () => {
    const { container } = renderWithProviders(<KnowledgeHubView />);
    await waitFor(() => {
      expect(container.textContent).toContain('知识闭环总表');
    });
  });

  it('renders knowledge surface panel', async () => {
    const { container } = renderWithProviders(<KnowledgeHubView />);
    await waitFor(() => {
      expect(container.textContent).toContain('知识子面板');
    });
  });
});
