import { act, render, screen, waitFor } from '@testing-library/react'
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

class EventSourceMock {
  static instances: EventSourceMock[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn()

  constructor(public url: string) {
    EventSourceMock.instances.push(this)
  }
}

describe('GBrain admin dashboard', () => {
  beforeEach(() => {
    vi.mocked(api.stats).mockReset()
    vi.mocked(api.health).mockReset()
    EventSourceMock.instances = []
    vi.stubGlobal('EventSource', EventSourceMock as unknown as typeof EventSource)
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

  it('reconnects the live event feed after a transient disconnect', async () => {
    vi.mocked(api.stats).mockResolvedValue({ connected_agents: 1, requests_today: 2, active_tokens: 1 })
    vi.mocked(api.health).mockResolvedValue({ expiring_soon: 0, error_rate: '0%' })

    render(<DashboardPage />)
    await waitFor(() => expect(EventSourceMock.instances).toHaveLength(1))

    vi.useFakeTimers()
    try {
      EventSourceMock.instances[0].onerror?.()
      await act(async () => { await Promise.resolve() })
      expect(screen.getByText('● 已断开')).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(5000)
        await Promise.resolve()
      })
      expect(EventSourceMock.instances).toHaveLength(2)
      expect(screen.getByText('● 正在重连...')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
