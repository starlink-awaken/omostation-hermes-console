import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.hoisted(() => {
  (globalThis as any).Loader = ({ className }: { className?: string }) => (
    <svg data-testid="mock-loader" className={className} />
  );
});

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Loader: ({ className }: { className?: string }) => (
      <svg data-testid="mock-loader" className={className} />
    ),
  };
});

import { KnowledgeFlow } from '../KnowledgeFlow';

const defaultFetchMock = () =>
  vi.mocked(fetch).mockImplementation(() =>
    Promise.resolve({ ok: true, json: async () => ({}) } as Response)
  );

describe('KnowledgeFlow', () => {
  beforeEach(() => {
    defaultFetchMock();
  });

  it('renders header with title', async () => {
    render(<KnowledgeFlow />);
    expect(screen.getByRole('heading', { name: /知识流动/ })).toBeInTheDocument();
    expect(screen.getByText('探索 KOS 知识库，发现与你工作相关的内容')).toBeInTheDocument();
  });

  it('renders search input and button', async () => {
    render(<KnowledgeFlow />);
    expect(screen.getByPlaceholderText('搜索知识库...')).toBeInTheDocument();
  });

  it('fetches knowledge stats on mount', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total_conversations: 128 }),
    } as Response);
    render(<KnowledgeFlow />);
    await waitFor(() => {
      expect(screen.getByText('128+ 条知识索引')).toBeInTheDocument();
    });
  });

  it('performs search and displays results', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_conversations: 50 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          result: {
            items: [
              { title: 'Test Document', score: 0.85, snippet: 'This is a test snippet' },
              { title: 'Another Doc', score: 0.62 },
            ],
          },
        }),
      } as Response);

    render(<KnowledgeFlow />);

    const input = screen.getByPlaceholderText('搜索知识库...');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(screen.getByText('Another Doc')).toBeInTheDocument();
      expect(screen.getByText('找到 2 个相关知识')).toBeInTheDocument();
    });
  });

  it('handles search API failure gracefully', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_conversations: 10 }),
      } as Response)
      .mockRejectedValueOnce(new Error('API error'));

    render(<KnowledgeFlow />);

    const input = screen.getByPlaceholderText('搜索知识库...');
    fireEvent.change(input, { target: { value: 'some query' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByText('找到')).not.toBeInTheDocument();
    });
  });
});
