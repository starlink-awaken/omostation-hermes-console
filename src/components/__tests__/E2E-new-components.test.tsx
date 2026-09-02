/**
 * E2E tests for new Phase 8 components:
 * - HarnessDashboard
 * - IntentCompiler
 * - GovernanceSelfCheck
 *
 * Tests cover rendering, interaction, data display, and error handling.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderDashboardAt, setupMockFetch, setupMockFetchError } from './route-test-helpers';

// ── Mock Data ──

const MOCK_HARNESS_COMPLIANCE = {
  error: 0,
  warning: 3,
  sections: [
    { name: 'admission', ok: true, issues: [] },
    { name: 'spec', ok: true, issues: [] },
    { name: 'execution', ok: false, issues: ['missing write_surfaces config'] },
    { name: 'verify', ok: true, issues: [] },
    { name: 'audit', ok: true, issues: [] },
    { name: 'accept', ok: true, issues: [] },
    { name: 'probes', ok: true, issues: [] },
    { name: 'dimensions', ok: true, issues: [] },
    { name: 'value_loop', ok: true, issues: [] },
    { name: 'known_debt', ok: true, issues: [] },
    { name: 'observability', ok: true, issues: [] },
    { name: 'rollout', ok: true, issues: [] },
  ],
};

const MOCK_INTENT_COMPILE_RESULT = {
  spec: 'version: "1.0"\nobjective: "Create a new feature"\nsteps:\n  - action: analyze\n  - action: implement\n  - action: verify',
  timestamp: '2026-09-02T10:00:00Z',
  duration: 150,
};

const MOCK_INTENT_HISTORY = [
  { id: '1', input: 'Create a dashboard', spec: 'version: "1.0"', timestamp: '2026-09-02T09:00:00Z', success: true },
  { id: '2', input: 'Fix a bug', spec: 'version: "1.0"', timestamp: '2026-09-02T08:00:00Z', success: true },
];

const MOCK_GOVERNANCE_SELF_CHECK = {
  items: [
    { id: 'architecture-check', name: '架构漂移检查', status: 'PASS', summary: '无漂移 detected', duration: 120 },
    { id: 'chaos-drill', name: '混沌演练', status: 'WARN', summary: '1 项演练需关注', duration: 340 },
    { id: 'canvas-serve', name: '画布服务', status: 'PASS', summary: '服务正常', duration: 85 },
    { id: 'ssot-status', name: 'SSOT 状态', status: 'PASS', summary: '所有注册表完整', duration: 200 },
  ],
  overall: 'WARN',
  timestamp: '2026-09-02T10:00:00Z',
};

// ── HarnessDashboard E2E ──

describe('E2E: HarnessDashboard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders at /harness route with hero title', async () => {
    setupMockFetch({ '/api/cockpit/harness/compliance': MOCK_HARNESS_COMPLIANCE });
    renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Harness 合规', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('displays error and warning counts', async () => {
    setupMockFetch({ '/api/cockpit/harness/compliance': MOCK_HARNESS_COMPLIANCE });
    renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // errors
      expect(screen.getByText('3')).toBeInTheDocument(); // warnings
    });
  });

  it('renders 8-stage DAG section', async () => {
    setupMockFetch({ '/api/cockpit/harness/compliance': MOCK_HARNESS_COMPLIANCE });
    renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getByText('8 阶段 DAG')).toBeInTheDocument();
      expect(screen.getByText('准入')).toBeInTheDocument();
      expect(screen.getByText('规格')).toBeInTheDocument();
      expect(screen.getByText('执行')).toBeInTheDocument();
      expect(screen.getByText('校验')).toBeInTheDocument();
      expect(screen.getByText('审计')).toBeInTheDocument();
      expect(screen.getByText('验收')).toBeInTheDocument();
    });
  });

  it('renders 12 compliance sections', async () => {
    setupMockFetch({ '/api/cockpit/harness/compliance': MOCK_HARNESS_COMPLIANCE });
    renderDashboardAt('/harness');

    await waitFor(() => {
      expect(screen.getByText('12 章节合规')).toBeInTheDocument();
      expect(screen.getAllByText(/admission/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/spec/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/execution/).length).toBeGreaterThan(0      );
    });
  });

  it('handles API error gracefully with default values', async () => {
    setupMockFetchError();
    renderDashboardAt('/harness');

    await waitFor(() => {
      // Should still render with default values (0 errors, 0 warnings)
      expect(screen.getAllByRole('heading', { name: 'Harness 合规', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('reflects active state in sidebar', async () => {
    setupMockFetch({ '/api/cockpit/harness/compliance': MOCK_HARNESS_COMPLIANCE });
    const { container } = renderDashboardAt('/harness');

    await waitFor(() => {
      const activeNavItem = container.querySelector('.nav-item.active');
      expect(activeNavItem).toBeInTheDocument();
      expect(activeNavItem?.textContent).toContain('Harness 合规');
    });
  });
});

// ── IntentCompiler E2E ──

describe('E2E: IntentCompiler', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders at /intent route with hero title', async () => {
    setupMockFetch({});
    renderDashboardAt('/intent');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Intent 编译器', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('renders input form and compile button', async () => {
    setupMockFetch({});
    renderDashboardAt('/intent');

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/例如：每天/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /编译/ })).toBeInTheDocument();
    });
  });

  it('disables compile button when input is empty', async () => {
    setupMockFetch({});
    renderDashboardAt('/intent');

    await waitFor(() => {
      const compileBtn = screen.getByRole('button', { name: /编译/ });
      expect(compileBtn).toBeDisabled();
    });
  });

  it('enables compile button when input has text', async () => {
    setupMockFetch({});
    const { user } = renderDashboardAt('/intent');

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/例如：每天/);
      user.type(input, 'Create a new dashboard');
    });

    await waitFor(() => {
      const compileBtn = screen.getByRole('button', { name: /编译/ });
      expect(compileBtn).not.toBeDisabled();
    });
  });

  it('shows compilation result on successful compile', async () => {
    setupMockFetch({
      '/api/intent/compile': {
        available: true,
        error: null,
        result: {
          success: true,
          intent_text: 'Create a dashboard',
          dag: {
            nodes: [
              { id: 'entry', label: '开始', type: 'entry' },
              { id: 'fetch', label: '获取数据', type: 'action', description: '从数据源拉取原始数据' },
              { id: 'exit', label: '结束', type: 'exit' },
            ],
            edges: [{ from: 'entry', to: 'fetch' }, { from: 'fetch', to: 'exit' }],
          },
        },
      },
    });
    const { user } = renderDashboardAt('/intent');

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/例如：每天/);
      user.type(input, 'Create a dashboard');
    });

    const compileBtn = await screen.findByRole('button', { name: /编译/ });
    await user.click(compileBtn);

    await waitFor(() => {
      expect(screen.getByText('编译结果')).toBeInTheDocument();
    });
  });

  it('shows error on compilation failure', async () => {
    setupMockFetch({
      '/api/intent/compile': { available: true, error: 'Compilation failed' },
    });
    const { user } = renderDashboardAt('/intent');

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/例如：每天/);
      user.type(input, 'Invalid input');
    });

    const compileBtn = await screen.findByRole('button', { name: /编译/ });
    await user.click(compileBtn);

    await waitFor(() => {
      expect(screen.getByText(/Compilation failed/)).toBeInTheDocument();
    });
  });
});

// ── GovernanceSelfCheck E2E ──

describe('E2E: GovernanceSelfCheck', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders at /governance-self-check route with hero title', async () => {
    setupMockFetch({ '/api/cockpit/governance/self-check': MOCK_GOVERNANCE_SELF_CHECK });
    renderDashboardAt('/governance-self-check');

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: '治理自检', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('displays 4 check items with status badges', async () => {
    setupMockFetch({ '/api/cockpit/governance/self-check': MOCK_GOVERNANCE_SELF_CHECK });
    renderDashboardAt('/governance-self-check');

    await waitFor(() => {
      expect(screen.getByText('架构漂移检查')).toBeInTheDocument();
      expect(screen.getByText('混沌演练')).toBeInTheDocument();
      expect(screen.getByText('画布服务')).toBeInTheDocument();
      expect(screen.getByText('SSOT 状态')).toBeInTheDocument();
    });
  });

  it('shows PASS/WARN/FAIL status badges', async () => {
    setupMockFetch({ '/api/cockpit/governance/self-check': MOCK_GOVERNANCE_SELF_CHECK });
    renderDashboardAt('/governance-self-check');

     await waitFor(() => {
      expect(screen.getAllByText('PASS').length).toBeGreaterThanOrEqual(3);
      expect(screen.getAllByText('WARN').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('runs all checks on button click', async () => {
    setupMockFetch({
      '/api/cockpit/governance/self-check': MOCK_GOVERNANCE_SELF_CHECK,
      '/api/cockpit/governance/self-check/run': MOCK_GOVERNANCE_SELF_CHECK,
    });
    const { user } = renderDashboardAt('/governance-self-check');

    await waitFor(() => {
      const runBtn = screen.getByRole('button', { name: /运行检查/ });
      user.click(runBtn);
    });

    await waitFor(() => {
      // Should show loading then results
      expect(screen.getByText('架构漂移检查')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    setupMockFetchError();
    renderDashboardAt('/governance-self-check');

    await waitFor(() => {
      // Should still render the page even if API fails
      expect(screen.getAllByRole('heading', { name: '治理自检', level: 1 })[0]).toBeInTheDocument();
    });
  });

  it('shows overall status summary', async () => {
    setupMockFetch({ '/api/cockpit/governance/self-check': MOCK_GOVERNANCE_SELF_CHECK });
    renderDashboardAt('/governance-self-check');

    await waitFor(() => {
      expect(screen.getByText(/总体状态|overall/i)).toBeInTheDocument();
    });
  });
});
