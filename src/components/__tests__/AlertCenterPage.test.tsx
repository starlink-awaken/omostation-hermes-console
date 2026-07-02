import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AlertCenterPage from '../AlertCenterPage'

const mockAlerts = [
  {
    id: 'alert-1',
    level: 'critical',
    source: 'agora',
    message: 'Mesh degradation',
    description: 'Latency spike detected',
    status: 'active',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    level: 'warning',
    source: 'runtime',
    message: 'High memory usage',
    status: 'active',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'alert-3',
    level: 'info',
    source: 'omo',
    message: 'Task completed',
    status: 'resolved',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    resolved_by: 'agent-1',
    resolved_at: new Date().toISOString(),
  },
]

const mockRules = [
  {
    id: 'rule-1',
    name: 'Latency threshold',
    condition: 'p99 > 500ms',
    level: 'critical',
    channels: ['webhook'],
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

describe('AlertCenterPage', () => {
  it('shows loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<AlertCenterPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders alerts and level stats', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockAlerts }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockRules }) } as Response)

    render(<AlertCenterPage />)

    await waitFor(() => {
      expect(screen.getByText('Mesh degradation')).toBeInTheDocument()
    })

    expect(screen.getByText('High memory usage')).toBeInTheDocument()
    // Stats: critical=1, error=0, warning=1, info=0 (only active)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2)
  })

  it('switches to history tab', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockAlerts }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockRules }) } as Response)

    render(<AlertCenterPage />)
    await waitFor(() => screen.getByText('Mesh degradation'))

    const historyTab = screen.getByText('告警历史')
    fireEvent.click(historyTab)

    await waitFor(() => {
      expect(screen.getByText('Task completed')).toBeInTheDocument()
    })
  })

  it('filters alerts by level', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockAlerts }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockRules }) } as Response)

    render(<AlertCenterPage />)
    await waitFor(() => screen.getByText('Mesh degradation'))

    const levelSelect = screen.getByDisplayValue('全部级别')
    fireEvent.change(levelSelect, { target: { value: 'critical' } })

    await waitFor(() => {
      expect(screen.getByText('Mesh degradation')).toBeInTheDocument()
      expect(screen.queryByText('High memory usage')).not.toBeInTheDocument()
    })
  })

  it('acknowledges an alert', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockAlerts }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockRules }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    render(<AlertCenterPage />)
    await waitFor(() => screen.getByText('Mesh degradation'))

    const ackButtons = screen.getAllByText('确认')
    fireEvent.click(ackButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/alerts/alert-1/acknowledge', { method: 'POST' })
    })
  })
})
