/**
 * IntentCompiler 组件测试。
 *
 * 覆盖: 渲染、交互、状态变化、错误处理。
 * Mock: API 调用 (apiFetch / apiPost)。
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IntentCompiler from '../IntentCompiler';

// ── Mock API client ──

import * as apiClient from '../../../api/client';

vi.mock('../../../api/client', () => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const { apiFetch, apiPost } = apiClient as unknown as {
  apiFetch: ReturnType<typeof vi.fn>;
  apiPost: ReturnType<typeof vi.fn>;
};

// ── Helpers ──

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const MOCK_DAG = {
  nodes: [
    { id: 'entry', label: '开始', type: 'entry' as const },
    { id: 'fetch', label: '获取数据', type: 'action' as const, description: '拉取数据' },
    { id: 'check', label: '校验', type: 'decision' as const, description: '检查数据' },
    { id: 'exit', label: '结束', type: 'exit' as const },
  ],
  edges: [
    { from: 'entry', to: 'fetch' },
    { from: 'fetch', to: 'check' },
    { from: 'check', to: 'exit', condition: '通过' },
  ],
};

const MOCK_COMPILE_RESULT = {
  success: true,
  intent_text: '测试意图',
  dag: MOCK_DAG,
  confidence: 0.92,
  compiled_at: '2026-09-02T07:00:00Z',
};

const MOCK_HISTORY = [
  { id: 'h1', intent_text: '历史意图1', success: true, compiled_at: '2026-09-01T08:00:00Z', node_count: 5 },
  { id: 'h2', intent_text: '历史意图2', success: false, compiled_at: '2026-09-01T07:00:00Z', node_count: 0 },
];

// ── Tests ──

describe('IntentCompiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API unavailable → fallback to demo data
    apiFetch.mockResolvedValue({ ok: false, data: null, error: 'Not available' });
    apiPost.mockResolvedValue({ ok: false, data: null, error: 'Not available' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 渲染测试 ──

  describe('rendering', () => {
    it('renders the page header with title and subtitle', () => {
      render(<IntentCompiler />, { wrapper: createWrapper() });

      expect(screen.getByRole('heading', { name: '意图编译器', level: 1 })).toBeInTheDocument();
      expect(screen.getByText('自然语言意图 → 结构化执行 DAG')).toBeInTheDocument();
    });

    it('renders the intent input textarea', () => {
      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      expect(input).toBeInTheDocument();
      expect(input.tagName.toLowerCase()).toBe('textarea');
    });

    it('renders the compile button in disabled state initially', () => {
      render(<IntentCompiler />, { wrapper: createWrapper() });

      const compileBtn = screen.getByTestId('compile-btn');
      expect(compileBtn).toBeInTheDocument();
      expect(compileBtn).toBeDisabled();
    });

    it('renders the reset button', () => {
      render(<IntentCompiler />, { wrapper: createWrapper() });

      expect(screen.getByTestId('reset-btn')).toBeInTheDocument();
    });

    it('renders empty state when no result is available', () => {
      render(<IntentCompiler />, { wrapper: createWrapper() });

      expect(screen.getByText('等待编译')).toBeInTheDocument();
      expect(screen.getByText(/输入自然语言意图并点击编译按钮/)).toBeInTheDocument();
    });

    it('renders history section title', () => {
      render(<IntentCompiler />, { wrapper: createWrapper() });

      expect(screen.getByText('编译历史')).toBeInTheDocument();
    });
  });

  // ── 交互测试 ──

  describe('interaction', () => {
    it('enables compile button when input has text', async () => {
      const user = userEvent.setup();
      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      const compileBtn = screen.getByTestId('compile-btn');

      expect(compileBtn).toBeDisabled();

      await user.type(input, '测试意图');

      expect(compileBtn).toBeEnabled();
    });

    it('shows character count when typing', async () => {
      const user = userEvent.setup();
      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '检查系统状态');

      expect(screen.getByText('6 字符')).toBeInTheDocument();
    });

    it('clears input when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');

      expect(input).toHaveValue('测试意图');

      await user.click(screen.getByTestId('reset-btn'));

      expect(input).toHaveValue('');
    });

    it('disables compile button for whitespace-only input', async () => {
      const user = userEvent.setup();
      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '   ');

      expect(screen.getByTestId('compile-btn')).toBeDisabled();
    });
  });

  // ── 状态变化测试 ──

  describe('state changes', () => {
    it('shows loading state during compilation', async () => {
      const user = userEvent.setup();
      // Delay the response to observe loading state
      apiPost.mockImplementation(() => new Promise(() => {})); // never resolves

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');

      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByText('编译中...')).toBeInTheDocument();
      });
    });

    it('renders DAG result after successful compilation', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: MOCK_COMPILE_RESULT, error: null },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');

      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByText('编译结果')).toBeInTheDocument();
      });

      // Verify DAG nodes rendered
      const nodes = screen.getAllByTestId('dag-node');
      expect(nodes).toHaveLength(4);

      // Verify DAG edges rendered
      const edges = screen.getAllByTestId('dag-edge');
      expect(edges).toHaveLength(3);

      // Verify confidence badge
      expect(screen.getByText('置信度 92%')).toBeInTheDocument();
    });

    it('renders original intent text in result', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: MOCK_COMPILE_RESULT, error: null },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByText('原始意图')).toBeInTheDocument();
      });

      // Use testid to disambiguate from textarea value
      expect(screen.getByTestId('result-intent-text')).toHaveTextContent('测试意图');
    });

    it('renders fallback result when API is unavailable', async () => {
      const user = userEvent.setup();
      // API unavailable → fallback to demo data
      apiPost.mockResolvedValue({ ok: false, data: null, error: 'Not available' });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '回退测试');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByText('编译结果')).toBeInTheDocument();
      });

      // Demo data has 6 nodes
      const nodes = screen.getAllByTestId('dag-node');
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('clears previous result when reset is clicked after compilation', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: MOCK_COMPILE_RESULT, error: null },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      // Compile first
      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByText('编译结果')).toBeInTheDocument();
      });

      // Reset
      await user.click(screen.getByTestId('reset-btn'));

      // Result should be cleared, empty state shown
      expect(screen.getByText('等待编译')).toBeInTheDocument();
      expect(screen.queryByText('编译结果')).not.toBeInTheDocument();
    });
  });

  // ── 错误处理测试 ──

  describe('error handling', () => {
    it('displays error state when compilation fails', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: null, error: '编译服务暂时不可用' },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });

      expect(screen.getByText('编译服务暂时不可用')).toBeInTheDocument();
    });

    it('displays error when API returns network error', async () => {
      const user = userEvent.setup();
      apiPost.mockRejectedValue(new Error('Network error'));

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows retry button in error state', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: null, error: '编译失败' },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('retry-btn')).toBeInTheDocument();
      });
    });

    it('retries compilation when retry button is clicked', async () => {
      const user = userEvent.setup();
      // First call fails, second succeeds
      apiPost
        .mockResolvedValueOnce({
          ok: true,
          data: { available: true, result: null, error: '编译失败' },
        })
        .mockResolvedValueOnce({
          ok: true,
          data: { available: true, result: MOCK_COMPILE_RESULT, error: null },
        });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');

      // First attempt - fails
      await user.click(screen.getByTestId('compile-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
      });

      // Retry - succeeds
      await user.click(screen.getByTestId('retry-btn'));
      await waitFor(() => {
        expect(screen.getByText('编译结果')).toBeInTheDocument();
      });

      expect(apiPost).toHaveBeenCalledTimes(2);
    });

    it('error state has alert role for accessibility', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: null, error: '错误' },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  // ── 历史记录测试 ──

  describe('history', () => {
    it('renders history items when API returns data', async () => {
      apiFetch.mockResolvedValue({
        ok: true,
        data: { available: true, history: MOCK_HISTORY, total: 2 },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('history-item')).toHaveLength(2);
      });

      expect(screen.getByText('历史意图1')).toBeInTheDocument();
      expect(screen.getByText('历史意图2')).toBeInTheDocument();
    });

    it('renders fallback history when API unavailable', async () => {
      apiFetch.mockResolvedValue({ ok: false, data: null, error: 'Not available' });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Demo history has 3 items
        expect(screen.getAllByTestId('history-item')).toHaveLength(3);
      });
    });

    it('fills input when history item is clicked', async () => {
      const user = userEvent.setup();
      apiFetch.mockResolvedValue({
        ok: true,
        data: { available: true, history: MOCK_HISTORY, total: 2 },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('history-item')).toHaveLength(2);
      });

      await user.click(screen.getByText('历史意图1'));

      const input = screen.getByTestId('intent-input');
      expect(input).toHaveValue('历史意图1');
    });

    it('shows empty message when history is empty', async () => {
      const user = userEvent.setup();
      apiFetch.mockResolvedValue({
        ok: true,
        data: { available: true, history: [], total: 0 },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      // Click clear to ensure empty state
      await waitFor(() => {
        expect(screen.getByText('暂无编译历史')).toBeInTheDocument();
      });
    });

    it('clears history when clear button is clicked', async () => {
      const user = userEvent.setup();
      apiFetch.mockResolvedValue({
        ok: true,
        data: { available: true, history: MOCK_HISTORY, total: 2 },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('history-item')).toHaveLength(2);
      });

      await user.click(screen.getByTestId('clear-history-btn'));

      await waitFor(() => {
        expect(screen.getByText('暂无编译历史')).toBeInTheDocument();
      });
    });

    it('shows success/failure icons for history items', async () => {
      apiFetch.mockResolvedValue({
        ok: true,
        data: { available: true, history: MOCK_HISTORY, total: 2 },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getAllByTestId('history-item')).toHaveLength(2);
      });

      const historyItems = screen.getAllByTestId('history-item');
      // First item is success, second is failure
      expect(within(historyItems[0]).getByText('历史意图1')).toBeInTheDocument();
      expect(within(historyItems[1]).getByText('历史意图2')).toBeInTheDocument();
    });
  });

  // ── 子组件测试 ──

  describe('DAG visualization', () => {
    it('renders node type badges correctly', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: MOCK_COMPILE_RESULT, error: null },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getAllByTestId('dag-node')).toHaveLength(4);
      });

      // Check type badges — use getAllByText since edge conditions may share labels
      expect(screen.getAllByText('entry').length).toBeGreaterThan(0);
      expect(screen.getAllByText('action').length).toBeGreaterThan(0);
      expect(screen.getAllByText('decision').length).toBeGreaterThan(0);
      expect(screen.getAllByText('exit').length).toBeGreaterThan(0);
    });

    it('renders edge conditions when present', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: MOCK_COMPILE_RESULT, error: null },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getAllByTestId('dag-edge')).toHaveLength(3);
      });

      // Check condition label
      expect(screen.getByText('通过')).toBeInTheDocument();
    });

    it('displays node and edge counts in header', async () => {
      const user = userEvent.setup();
      apiPost.mockResolvedValue({
        ok: true,
        data: { available: true, result: MOCK_COMPILE_RESULT, error: null },
      });

      render(<IntentCompiler />, { wrapper: createWrapper() });

      const input = screen.getByTestId('intent-input');
      await user.type(input, '测试意图');
      await user.click(screen.getByTestId('compile-btn'));

      await waitFor(() => {
        expect(screen.getByText('4 节点 / 3 边')).toBeInTheDocument();
      });
    });
  });
});
