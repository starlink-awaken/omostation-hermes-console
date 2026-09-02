/**
 * HarnessDashboard 测试
 *
 * 覆盖：渲染（loading / 正常 / 空数据）、状态色调、8 阶段 DAG、12 章节、API 错误处理。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HarnessDashboard from '../HarnessDashboard';

// ── 工具函数 ──

/** 创建兼容 happy-dom 的 mock Response */
function mockFetchResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: () => mockFetchResponse(data, ok, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// ── HarnessDashboard 测试 ──

describe('HarnessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 渲染 ──

  it('loading 状态显示加载提示', () => {
    // 不 mock fetch，让 useQuery 保持 loading 状态
    render(<HarnessDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('加载 Harness 合规状态...')).toBeInTheDocument();
  });

  it('正常渲染统计卡', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 2 }),
    );

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // 统计卡：错误 0、警告 2、阶段 8
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('渲染 8 阶段 DAG 标题', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 0 }),
    );

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('8 阶段 DAG')).toBeInTheDocument();
    });
  });

  it('渲染所有 8 个阶段名称', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 0 }),
    );

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      const stageNames = ['准入', '规格', '5Q 检查', '派发', '执行', '校验', '审计', '验收'];
      for (const name of stageNames) {
        expect(screen.getByText(name)).toBeInTheDocument();
      }
    });
  });

  it('渲染 12 章节合规标题', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 0 }),
    );

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('12 章节合规')).toBeInTheDocument();
    });
  });

  it('渲染所有 12 个章节名称', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 0 }),
    );

    const { container } = render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      const sections = [
        'admission', 'spec', 'execution', 'verify', 'audit', 'accept',
        'probes', 'dimensions', 'value_loop', 'known_debt', 'observability', 'rollout',
      ];
      for (const section of sections) {
        // 章节名与 ✓ 在同一节点内，使用 container 文本匹配
        expect(container.textContent).toContain(section);
      }
    });
  });

  // ── 状态色调 ──

  it('错误数为 0 时显示 ok 色调', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 0 }),
    );

    const { container } = render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // ok 色调使用绿色
      expect(container.querySelector('.text-green-400')).toBeInTheDocument();
    });
  });

  it('错误数 > 0 时显示 error 色调', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 3, warning: 1 }),
    );

    const { container } = render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // error 色调使用红色
      expect(container.querySelector('.text-red-400')).toBeInTheDocument();
    });
  });

  it('警告数 > 0 时显示 warn 色调', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 5 }),
    );

    const { container } = render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // warn 色调使用黄色
      expect(container.querySelector('.text-yellow-400')).toBeInTheDocument();
    });
  });

  it('阶段卡固定显示 info 色调', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 0, warning: 0 }),
    );

    const { container } = render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // info 色调使用蓝色
      expect(container.querySelector('.text-blue-400')).toBeInTheDocument();
    });
  });

  // ── 错误处理 ──

  it('API 返回 500 错误时使用默认值渲染', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(null, false, 500),
    );

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // apiFetch 返回 { data: null, error: '...', ok: false }
      // 组件使用 compliance?.data || { error: 0, warning: 0 }
      // 所以 data 为 null 时 fallback 到默认值（错误和警告都为 0）
      expect(screen.getAllByText('0')).toHaveLength(2);
    });
  });

  it('网络异常时使用默认值渲染', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // 异常时 apiFetch 返回 { data: null, error: 'Network error', ok: false }
      // 组件 fallback 到默认值（错误和警告都为 0）
      expect(screen.getAllByText('0')).toHaveLength(2);
    });
  });

  it('API 返回 data 为 null 时使用默认值渲染', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(null),
    );

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // data 为 null 时 fallback 到默认值（错误和警告都为 0）
      expect(screen.getAllByText('0')).toHaveLength(2);
    });
  });

  // ── 数据完整性 ──

  it('正确显示错误和警告数值', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ error: 7, warning: 15 }),
    );

    render(<HarnessDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });
});
