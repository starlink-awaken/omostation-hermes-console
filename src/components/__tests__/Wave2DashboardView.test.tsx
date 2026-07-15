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
    },
  ],
  source: 'test',
}

describe('Wave2DashboardView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/wave2/dashboard') {
        return Promise.resolve(okJson(sample))
      }
      return Promise.resolve(okJson({}))
    })
  })

  it('renders cards heatmap and proposals from API', async () => {
    const onNavigate = vi.fn()
    render(<Wave2DashboardView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByTestId('wave2-dashboard')).toBeInTheDocument()
      expect(screen.getByText('Wave2 预测治理面板')).toBeInTheDocument()
    })

    expect(screen.getByTestId('wave2-heatmap')).toBeInTheDocument()
    expect(screen.getByTestId('wave2-proposals')).toBeInTheDocument()
    expect(screen.getByText('1 critical pitch(es)')).toBeInTheDocument()
    expect(screen.getByText('declining')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开 C2G 战略中心' }))
    expect(onNavigate).toHaveBeenCalledWith('C2G')
  })

  it('shows error when API fails', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) } as Response),
    )
    render(<Wave2DashboardView />)
    await waitFor(() => {
      expect(screen.getByText(/加载失败/)).toBeInTheDocument()
    })
  })
})
