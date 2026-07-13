import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
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

const mockSystemMap = {
  usage_paths: [
    {
      id: 'runtime-diagnostics',
      title: '运行诊断',
      intent: '从概览、拓扑、性能、日志到沙箱收口。',
      pages: [
        { id: 'Overview', title: '概览中心', group: '运行大盘' },
        { id: 'AlertCenter', title: '告警中心', group: '系统治理' },
        { id: 'Performance', title: '性能监控', group: '开发工具' },
        { id: 'LogViewer', title: '日志查看器', group: '开发工具' },
        { id: 'Sandbox', title: '隔离沙箱', group: '开发工具' },
      ],
    },
  ],
}

const mockServices = [
  { name: 'agora', status: 'degraded', cpu: 82, memory: 67, uptime: '2d' },
  { name: 'runtime', status: 'online', cpu: 24, memory: 31, uptime: '7d' },
]

function mockAlertCenterFetch() {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/alerts') {
      return Promise.resolve({ ok: true, json: async () => ({ items: mockAlerts }) } as Response)
    }
    if (url === '/api/alerts?status=active&limit=20') {
      return Promise.resolve({ ok: true, json: async () => ({ items: mockAlerts.filter((item) => item.status === 'active') }) } as Response)
    }
    if (url === '/api/alerts/rules') {
      return Promise.resolve({ ok: true, json: async () => ({ items: mockRules }) } as Response)
    }
    if (url === '/api/cockpit/system-map') {
      return Promise.resolve({ ok: true, json: async () => mockSystemMap } as Response)
    }
    if (url === '/api/services/status') {
      return Promise.resolve({ ok: true, json: async () => ({ items: mockServices }) } as Response)
    }
    if (url.endsWith('/acknowledge') || url.endsWith('/silence') || url.endsWith('/resolve')) {
      return Promise.resolve({ ok: true, json: async () => ({ ok: true }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ items: [] }) } as Response)
  })
}

describe('AlertCenterPage', () => {
  it('shows loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<AlertCenterPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders alerts and level stats', async () => {
    mockAlertCenterFetch()

    render(<AlertCenterPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Mesh degradation').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText('High memory usage').length).toBeGreaterThan(0)
    expect(screen.getByText('告警承接工作台')).toBeInTheDocument()
    expect(screen.getByText('运行诊断工作台')).toBeInTheDocument()
    // Stats: critical=1, error=0, warning=1, info=0 (only active)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2)
  })

  it('switches to history tab', async () => {
    mockAlertCenterFetch()

    render(<AlertCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Mesh degradation').length).toBeGreaterThan(0)
    })

    const historyTab = screen.getByText('告警历史')
    fireEvent.click(historyTab)

    await waitFor(() => {
      expect(screen.getByText('Task completed')).toBeInTheDocument()
    })
  })

  it('opens the requested alert tab from navigation context', async () => {
    mockAlertCenterFetch()

    render(<AlertCenterPage initialTab="rules" />)

    await waitFor(() => {
      expect(screen.getByText('新增规则')).toBeInTheDocument()
    })
  })

  it('filters alerts by level', async () => {
    mockAlertCenterFetch()

    const { container } = render(<AlertCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Mesh degradation').length).toBeGreaterThan(0)
    })

    const levelSelect = screen.getByDisplayValue('全部级别')
    fireEvent.change(levelSelect, { target: { value: 'critical' } })

    await waitFor(() => {
      expect(container.querySelectorAll('.alerts-list .alert-card')).toHaveLength(1)
    })
    expect(screen.getAllByText('Mesh degradation').length).toBeGreaterThan(0)
  })

  it('acknowledges an alert', async () => {
    mockAlertCenterFetch()

    render(<AlertCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Mesh degradation').length).toBeGreaterThan(0)
    })

    const ackButtons = screen.getAllByText('确认')
    fireEvent.click(ackButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/alerts/alert-1/acknowledge', { method: 'POST' })
    })
  })

  it('navigates along the runtime diagnostic path', async () => {
    const onNavigate = vi.fn()
    mockAlertCenterFetch()

    render(<AlertCenterPage onNavigate={onNavigate} />)
    await waitFor(() => screen.getByText('运行诊断工作台'))

    fireEvent.click(screen.getByRole('button', { name: /进入运行步骤 性能监控/ }))
    expect(onNavigate).toHaveBeenCalledWith('Performance')

    fireEvent.click(screen.getAllByRole('button', { name: /看性能/ })[0])
    expect(onNavigate).toHaveBeenCalledWith('Performance')

    fireEvent.click(screen.getByRole('button', { name: /进入落点 最后进日志窗口/ }))
    expect(onNavigate).toHaveBeenCalledWith('LogViewer')

    fireEvent.click(screen.getByRole('button', { name: /打开告警承接到任务中心/ }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('surfaces focus handoff for a matched alert', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    mockAlertCenterFetch()

    render(<AlertCenterPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="Mesh degradation" />)

    const focusRegion = await screen.findByRole('region', { name: '当前告警承接焦点' })
    expect(within(focusRegion).getByText('Mesh degradation')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开告警焦点对象 Mesh degradation' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开告警焦点任务 Mesh degradation' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'AlertCenter', taskQuery: 'alert-1', alertTab: 'active' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'alert-1' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
