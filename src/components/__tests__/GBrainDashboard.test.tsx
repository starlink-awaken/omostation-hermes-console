import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../GBrain/api'
import { DashboardPage } from '../GBrain/GBrainDashboard'

vi.mock('../GBrain/api', () => ({
  api: {
    stats: vi.fn(),
    health: vi.fn(),
    agents: vi.fn(),
    requests: vi.fn(),
    apiKeys: vi.fn(),
    calibrationProfile: vi.fn(),
    calibrationChart: vi.fn(),
    login: vi.fn(),
  },
}))

describe('GBrain admin dashboard', () => {
  beforeEach(() => {
    vi.mocked(api.stats).mockReset()
    vi.mocked(api.health).mockReset()
  })

  it('does not present empty counters when the admin API is unavailable', async () => {
    vi.mocked(api.stats).mockRejectedValue(new Error('HTTP 404'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('GBrain 管理接口暂不可用')
    })
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
    expect(screen.queryByText('连接智能体')).not.toBeInTheDocument()
  })

  it('keeps authentication failures inside the protected login boundary', async () => {
    vi.mocked(api.stats).mockRejectedValue(new Error('Unauthorized'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/This is a protected dashboard/)).toBeInTheDocument()
    })
    expect(screen.getByText('GBrain')).toBeInTheDocument()
  })
})
