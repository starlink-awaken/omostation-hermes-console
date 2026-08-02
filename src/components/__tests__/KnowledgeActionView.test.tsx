import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KnowledgeActionView from '../KnowledgeActionView';

const operations = {
  schema_version: 'knowledge-action-operations/v1',
  status: 'live',
  summary: { action_count: 0, query_count: 0, task_count: 0, by_kind: {}, unique_source_count: 0 },
  funnel: { retrieved: 0, cited: 0, task_created: 0, workflow_requested: 0, result_feedback_recorded: 0 },
  top_sources: [],
  next_action: 'run_a_real_knowledge_search',
  recent_actions: [],
};

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchInterval: false, refetchOnWindowFocus: false } } });
  return render(<QueryClientProvider client={client}><KnowledgeActionView /></QueryClientProvider>);
}

describe('KnowledgeActionView', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('carries only knowledge references into a governed task and receipt', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.startsWith('/api/kos/search')) {
        return { ok: true, json: async () => ({ results: [{ id: 'delivery-1', title: '交付复盘', content: '原文不应进入任务', score: 0.9 }] }) };
      }
      if (url === '/api/tasks') {
        return { ok: true, json: async () => ({ id: 'cockpit-manual-demo', title: '依据复盘补齐证据', knowledge_refs: ['kos:delivery-1'] }) };
      }
      if (url === '/api/knowledge/action-receipt') {
        return { ok: true, json: async () => ({ ok: true, status: 'recorded', action: { action_id: 'knowledge-action:demo' } }) };
      }
      return { ok: true, json: async () => ({ ok: true, operations }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView();
    fireEvent.change(screen.getByLabelText('检索知识'), { target: { value: '交付返工' } });
    fireEvent.click(screen.getByRole('button', { name: '检索' }));
    await waitFor(() => expect(screen.getByText('交付复盘')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('任务标题'), { target: { value: '依据复盘补齐证据' } });
    fireEvent.change(screen.getByLabelText('任务说明'), { target: { value: '把结论变成可验证任务。' } });
    fireEvent.click(screen.getByRole('button', { name: '创建任务并记录回执' }));

    await waitFor(() => expect(screen.getByText(/已创建，并已记录知识到行动回执/)).toBeInTheDocument());
    const taskCall = fetchMock.mock.calls.find((call) => call[0] === '/api/tasks');
    const receiptCall = fetchMock.mock.calls.find((call) => call[0] === '/api/knowledge/action-receipt');
    const taskBody = JSON.parse(String(taskCall?.[1]?.body));
    const receiptBody = JSON.parse(String(receiptCall?.[1]?.body));
    expect(taskBody.knowledge_refs).toEqual(['kos:delivery-1']);
    expect(taskBody.description).toBe('把结论变成可验证任务。');
    expect(taskBody).not.toHaveProperty('content');
    expect(receiptBody.action_kind).toBe('task_created');
    expect(receiptBody.task_ref).toBe('cockpit-manual-demo');
    expect(receiptBody.scene_binding.scene_id).toBe('engineering-delivery');
    expect(receiptBody.knowledge_refs[0]).toEqual({ ref: 'kos:delivery-1', title: '交付复盘', source_type: 'kos', rank: 1 });
    expect(receiptBody).not.toHaveProperty('raw_content');
  });

  it('does not pretend the receipt succeeded when persistence fails', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.startsWith('/api/kos/search')) return { ok: true, json: async () => ({ results: [{ id: 'delivery-1', title: '交付复盘', content: '原文' }] }) };
      if (url === '/api/tasks') return { ok: true, json: async () => ({ id: 'cockpit-manual-demo' }) };
      if (init?.method === 'POST') return { ok: true, json: async () => ({ ok: false, status: 'unavailable', error: 'knowledge_action_unavailable' }) };
      return { ok: true, json: async () => ({ ok: true, operations }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    renderView();
    fireEvent.change(screen.getByLabelText('检索知识'), { target: { value: '交付' } });
    fireEvent.click(screen.getByRole('button', { name: '检索' }));
    await waitFor(() => expect(screen.getByText('交付复盘')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText('任务标题'), { target: { value: '任务已落盘' } });
    fireEvent.change(screen.getByLabelText('任务说明'), { target: { value: '等待回执重试。' } });
    fireEvent.click(screen.getByRole('button', { name: '创建任务并记录回执' }));

    await waitFor(() => expect(screen.getByText(/行动回执未记录/)).toBeInTheDocument());
    expect(screen.getByText(/任务 cockpit-manual-demo 已创建/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试行动回执' })).toBeInTheDocument();
  });
});
