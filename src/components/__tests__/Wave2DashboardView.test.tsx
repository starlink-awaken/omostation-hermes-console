import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Wave2DashboardView from '../Wave2DashboardView'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

const sample = {
  schema: 'c2g.wave2.dashboard.v1',
  auto_mutate_rules: false,
  cards: {
    pitch_count: 2,
    mean_success: 0.45,
    trend: 'declining',
    critical: 1,
    elevated: 1,
    proposal_count: 1,
    p0_proposals: 1,
  },
  heatmap: {
    statuses: ['active', 'completed'],
    buckets: ['low', 'mid', 'high'],
    matrix: {
      active: { low: 1, mid: 0, high: 0 },
      completed: { low: 0, mid: 0, high: 1 },
    },
    totals: { pitches: 2, critical: 1, elevated: 1, ok: 0 },
  },
  forecast: {
    n: 2,
    mean: 0.45,
    trend: 'declining',
    forecast: [
      { horizon: 1, predicted: 0.4 },
      { horizon: 2, predicted: 0.38 },
    ],
  },
  proposals: [
    {
      id: 'prop-critical-pitches',
      priority: 'P0',
      kind: 'risk_attention',
      title: '1 critical pitch(es)',
      rationale: 'low score',
      suggested_omo_action: 'create_planned_task',
      task_query: '[C2G feedback] Review critical',
      handoff: { tab: 'TaskCenter', taskQuery: '[C2G feedback] Review critical' },
    },
  ],
  source: 'test',
}

describe('Wave2DashboardView', () => {
  beforeEach(() => {
    (fetch as any).mockReset();
    (fetch as any).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/wave2/dashboard') {
        return Promise.resolve(okJson(sample))
      }
      if (url === '/api/omo/doctor') {
        return Promise.resolve(
          okJson({
            available: true,
            status: 'warn',
            written_at: '2026-07-15T09:20:00+00:00',
            highlights: {
              path_acl_status: 'warn',
              path_acl_detail: '1 ACL red flag(s)',
              path_acl_warn_streak: 2,
              path_acl_alert: false,
              warn: 1,
              fail: 0,
            },
            hint: 'omo acl plan --json',
          }),
        )
      }
      return Promise.resolve(okJson({}))
    })
  })

  it('renders cards heatmap and proposals from API', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    render(<Wave2DashboardView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByTestId('wave2-dashboard')).toBeInTheDocument()
      expect(screen.getByText('Wave2 预测治理面板')).toBeInTheDocument()
    })

    expect(screen.getByTestId('wave2-heatmap')).toBeInTheDocument()
    expect(screen.getByTestId('wave2-proposals')).toBeInTheDocument()
    expect(screen.getByText('1 critical pitch(es)')).toBeInTheDocument()
    expect(screen.getByText('declining')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('wave2-doctor-banner')).toBeInTheDocument()
      expect(screen.getByTestId('wave2-doctor-banner')).toHaveTextContent('Doctor / path-acl')
      expect(screen.getByTestId('wave2-doctor-banner')).toHaveTextContent('streak=2')
    })

    fireEvent.click(screen.getByRole('button', { name: '打开 C2G 战略中心' }))
    expect(onNavigate).toHaveBeenCalledWith('C2G')

    fireEvent.click(screen.getByTestId('wave2-open-tasks-prop-critical-pitches'))
    expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: '[C2G feedback] Review critical',
    })
  })

  it('loads dry-run plan actions', async () => {
    (fetch as any).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/wave2/dashboard') return Promise.resolve(okJson(sample))
      if (url === '/api/wave2/proposals/plan') {
        return Promise.resolve(
          okJson({
            task_actions: [
              { proposal_id: 'prop-critical-pitches', title: 'Review X', would_create: true },
            ],
          }),
        )
      }
      return Promise.resolve(okJson({}))
    })
    render(<Wave2DashboardView />)
    await waitFor(() => expect(screen.getByTestId('wave2-load-plan')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('wave2-load-plan'))
    await waitFor(() => {
      expect(screen.getByTestId('wave2-plan-actions')).toBeInTheDocument()
      expect(screen.getByText(/Review X/)).toBeInTheDocument()
    })
  })

  it('shows error when API fails', async () => {
    (fetch as any).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response),
    )
    render(<Wave2DashboardView />)
    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument()
    })
  })

  it('loads demo seed then refreshes dashboard', async () => {
    let dashboardCalls = 0
    (fetch as any).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/wave2/dashboard') {
        dashboardCalls += 1
        return Promise.resolve(okJson(sample))
      }
      if (url === '/api/wave2/demo-seed' && init?.method === 'POST') {
        return Promise.resolve(
          okJson({
            status: 'ok',
            seeded: ['demo-a', 'demo-b'],
            pitch_count: 6,
          }),
        )
      }
      return Promise.resolve(okJson({}))
    })
    render(<Wave2DashboardView />)
    await waitFor(() => expect(screen.getByTestId('wave2-demo-seed')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('wave2-demo-seed'))
    await waitFor(() => {
      expect(screen.getByTestId('wave2-seed-msg')).toHaveTextContent(/已加载演示数据/)
    })
    expect(dashboardCalls).toBeGreaterThanOrEqual(2)
  })
})
