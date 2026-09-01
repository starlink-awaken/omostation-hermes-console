/**
 * AuditDashboard / DimensionBars / LowScoreTable / ScorecardDetail 测试
 *
 * 覆盖：渲染、数据展示、交互回调、loading/error/empty 状态。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuditDashboard from '../AuditDashboard';
import DimensionBars from '../DimensionBars';
import LowScoreTable from '../LowScoreTable';
import ScorecardDetail from '../ScorecardDetail';

// ── 测试数据 ──

const mockDimensions = {
  functionality: '功能完整度',
  performance: '性能',
  reliability: '可靠性',
  security: '安全性',
  usability: '易用性',
};

const mockSummary = {
  available: true,
  dimensions: mockDimensions,
  dimension_averages: {
    functionality: 4.32,
    performance: 3.0,
    reliability: 3.8,
    security: 2.1,
    usability: 4.5,
  },
  total_cards: 325,
  scored_cards: 28,
  low_score_count: 12,
  low_scores: [
    { cmd_path: 'cmd/a', name: 'cmd/a', score: 1.8, weakest_dimension: '安全性' },
    { cmd_path: 'cmd/b', name: 'cmd/b', score: 2.5, weakest_dimension: '性能' },
  ],
};

const dimensionBarData = [
  { key: 'functionality', label: '功能完整度', score: 4.32 },
  { key: 'performance', label: '性能', score: 3.0 },
  { key: 'reliability', label: '可靠性', score: 3.8 },
  { key: 'security', label: '安全性', score: 2.1 },
  { key: 'usability', label: '易用性', score: 4.5 },
];

const lowScoreData = [
  { cmd_path: 'cmd/a', name: 'cmd/a', score: 1.8, weakest_dimension: '安全性' },
  { cmd_path: 'cmd/b', name: 'cmd/b', score: 2.5, weakest_dimension: '性能' },
];

const scorecardData = {
  cmd_path: 'cmd/a',
  name: 'cmd/a',
  dimensions: [
    { key: 'functionality', label: '功能完整度', score: 2, evidence: '缺少错误处理' },
    { key: 'performance', label: '性能', score: 1.5, evidence: '响应超时' },
  ],
  suggestion: '建议补充错误处理与输入校验逻辑',
};

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

// ── AuditDashboard 测试 ──

describe('AuditDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loading 状态显示骨架屏', () => {
    // 不 mock fetch，让 useQuery 保持 loading 状态
    render(<AuditDashboard />, { wrapper: createWrapper() });
    expect(screen.getByTestId('audit-loading')).toBeInTheDocument();
  });

  it('正常渲染统计卡与图表', async () => {
    // apiFetch 将 response.json() 包装为 { data, error, ok }
    // 所以 json() 应直接返回原始 API 数据
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(mockSummary),
    );

    render(<AuditDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('audit-dashboard')).toBeInTheDocument();
    });

    // 统计卡
    expect(screen.getByText('325')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('API 不可用时显示空状态', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ available: false }),
    );

    render(<AuditDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('audit-empty')).toBeInTheDocument();
    });
  });

  it('API 失败时显示错误状态', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse(null, false, 500),
    );

    render(<AuditDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('audit-error')).toBeInTheDocument();
    });
  });
});

// ── DimensionBars 测试 ──

describe('DimensionBars', () => {
  it('渲染维度条形图容器', () => {
    render(<DimensionBars data={dimensionBarData} />);
    expect(screen.getByTestId('dimension-bars')).toBeInTheDocument();
  });

  it('渲染图表标题', () => {
    render(<DimensionBars data={dimensionBarData} />);
    expect(screen.getByText('维度均分')).toBeInTheDocument();
  });

  it('渲染 recharts 容器', () => {
    const { container } = render(<DimensionBars data={dimensionBarData} />);
    // recharts 会渲染 recharts-responsive-container
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});

// ── LowScoreTable 测试 ──

describe('LowScoreTable', () => {
  it('渲染低分表', () => {
    render(<LowScoreTable data={lowScoreData} />);
    expect(screen.getByTestId('low-score-table')).toBeInTheDocument();
  });

  it('显示命令名与评分', () => {
    render(<LowScoreTable data={lowScoreData} />);
    expect(screen.getByText('cmd/a')).toBeInTheDocument();
    expect(screen.getByText('1.8')).toBeInTheDocument();
  });

  it('空数据时显示空提示', () => {
    render(<LowScoreTable data={[]} />);
    expect(screen.getByText('暂无低分命令')).toBeInTheDocument();
  });

  it('点击行触发 onSelect', () => {
    const onSelect = vi.fn();
    render(<LowScoreTable data={lowScoreData} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('low-score-row-cmd/a'));
    expect(onSelect).toHaveBeenCalledWith('cmd/a');
  });
});

// ── ScorecardDetail 测试 ──

describe('ScorecardDetail', () => {
  it('渲染评分卡详情', () => {
    render(<ScorecardDetail data={scorecardData} />);
    expect(screen.getByTestId('scorecard-detail')).toBeInTheDocument();
  });

  it('显示命令名', () => {
    render(<ScorecardDetail data={scorecardData} />);
    expect(screen.getByText('cmd/a')).toBeInTheDocument();
  });

  it('显示 evidence', () => {
    render(<ScorecardDetail data={scorecardData} />);
    expect(screen.getByText('缺少错误处理')).toBeInTheDocument();
    expect(screen.getByText('响应超时')).toBeInTheDocument();
  });

  it('显示改进建议', () => {
    render(<ScorecardDetail data={scorecardData} />);
    expect(screen.getByText('建议补充错误处理与输入校验逻辑')).toBeInTheDocument();
  });

  it('点击关闭触发 onClose', () => {
    const onClose = vi.fn();
    render(<ScorecardDetail data={scorecardData} onClose={onClose} />);
    fireEvent.click(screen.getByText('关闭'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
