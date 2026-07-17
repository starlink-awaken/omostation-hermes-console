import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import PerformanceMonitorPage from '../PerformanceMonitorPage'

vi.mock('../RuntimeOpsWorkbench', () => ({
  default: () => <div>Runtime Workbench Mock</div>,
}))

vi.mock('../charts/AreaChart', () => ({ default: () => <div>Area Chart Mock</div> }))
vi.mock('../charts/LineChart', () => ({ default: () => <div>Line Chart Mock</div> }))

const okJson = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

describe('PerformanceMonitorPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('shows a truthful retry state when the metrics API fails', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input).startsWith('/api/metrics/system')) return Promise.resolve(okJson({}, false))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<PerformanceMonitorPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('性能监控数据暂不可用')
      expect(screen.getByRole('region', { name: '性能闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('性能承接工作台')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '重试性能指标' })).toBeInTheDocument()
    })
  })

  it('surfaces performance follow-up actions for degraded services', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/metrics/system')) {
        return Promise.resolve(okJson({
          cpu: [{ timestamp: '10:00', value: 81 }],
          memory: [{ timestamp: '10:00', value: 62 }],
          disk: [{ timestamp: '10:00', value: 74 }],
          network: [{ timestamp: '10:00', value: 33 }],
        }))
      }
      return Promise.resolve(okJson({
        items: [
          { name: 'cockpit-api', status: 'degraded', cpu: 91, memory: 82, uptime: '3h' },
        ],
      }))
    })

    render(<PerformanceMonitorPage onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('性能承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('cockpit-api').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '查看性能服务 cockpit-api' }))
    expect(onNavigate).toHaveBeenCalledWith('AlertCenter')

    fireEvent.click(screen.getByRole('button', { name: '打开性能承接到日志页' }))
    expect(onNavigate).toHaveBeenCalledWith('LogViewer')

    expect(screen.getByRole('region', { name: '性能补位任务' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '复制性能补位任务 补齐性能页对 cockpit-api 的承接' }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('补齐性能页对 cockpit-api 的承接'))
      expect(screen.getByText('已复制性能补位任务：补齐性能页对 cockpit-api 的承接')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开性能补位任务 补齐性能页对 cockpit-api 的承接' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('filters performance services before choosing hotspot follow-up actions', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/metrics/system')) {
        return Promise.resolve(okJson({ cpu: [], memory: [], disk: [], network: [] }))
      }
      return Promise.resolve(okJson({
        items: [
          { name: 'healthy-worker', status: 'online', cpu: 22, memory: 31 },
          { name: 'offline-worker', status: 'offline', cpu: null, memory: null },
        ],
      }))
    })

    render(<PerformanceMonitorPage />)
    await screen.findByRole('region', { name: '性能服务筛选' })

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索性能服务' }), { target: { value: 'offline' } })
    await waitFor(() => {
      expect(screen.getByText('显示服务 1/2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看性能服务 offline-worker' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '查看性能服务 healthy-worker' })).not.toBeInTheDocument()
      expect(screen.queryByText('healthy-worker')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '清除性能服务筛选' }))
    fireEvent.change(screen.getByRole('combobox', { name: '按状态筛选性能服务' }), { target: { value: 'online' } })
    await waitFor(() => {
      expect(screen.getByText('显示服务 1/2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看性能服务 healthy-worker' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '清除性能服务筛选' }))
    expect(screen.getByText('显示服务 2/2')).toBeInTheDocument()
  })

  it('registers the performance draft as a governed task', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/metrics/system')) {
        return Promise.resolve(okJson({ cpu: [], memory: [], disk: [], network: [] }))
      }
      if (String(input) === '/api/services/status') {
        return Promise.resolve(okJson({ items: [{ name: 'cockpit-api', status: 'degraded', cpu: 91, memory: 82 }] }))
      }
      expect(init?.method).toBe('POST')
      return Promise.resolve(okJson({ id: 'cockpit-performance-task', title: '性能任务' }))
    })

    render(<PerformanceMonitorPage onOpenTarget={onOpenTarget} />)

    await screen.findByRole('region', { name: '性能补位任务' })
    fireEvent.click(screen.getByRole('button', { name: '登记性能治理任务 补齐性能页对 cockpit-api 的承接' }))

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-performance-task' })
      expect(screen.getByText('已登记性能治理任务：性能任务')).toBeInTheDocument()
    })
  })

  it('surfaces focus handoff for a matched performance service', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/metrics/system')) {
        return Promise.resolve(okJson({
          cpu: [{ timestamp: '10:00', value: 81 }],
          memory: [{ timestamp: '10:00', value: 62 }],
          disk: [{ timestamp: '10:00', value: 74 }],
          network: [{ timestamp: '10:00', value: 33 }],
        }))
      }
      return Promise.resolve(okJson({
        items: [
          { name: 'cockpit-api', status: 'degraded', cpu: 91, memory: 82, uptime: '3h' },
        ],
      }))
    })

    render(<PerformanceMonitorPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="cockpit-api" />)

    const focusRegion = await screen.findByRole('region', { name: '当前性能承接焦点' })
    expect(within(focusRegion).getByText('cockpit-api')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开性能焦点对象 cockpit-api' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开性能焦点任务 cockpit-api' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Performance', taskQuery: 'cockpit-api' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'cockpit-api' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces performance closure routing when focus hits log handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/metrics/system')) {
        return Promise.resolve(okJson({
          cpu: [{ timestamp: '10:00', value: 81 }],
          memory: [{ timestamp: '10:00', value: 62 }],
          disk: [{ timestamp: '10:00', value: 74 }],
          network: [{ timestamp: '10:00', value: 33 }],
        }))
      }
      return Promise.resolve(okJson({
        items: [
          { name: 'cockpit-api', status: 'degraded', cpu: 91, memory: 82, uptime: '3h' },
        ],
      }))
    })

    render(
      <PerformanceMonitorPage
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="日志追证与系统地图回挂"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前性能承接焦点' })
    expect(within(focusRegion).getByText('日志追证与系统地图回挂')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开性能焦点对象 日志追证与系统地图回挂' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开性能焦点任务 日志追证与系统地图回挂' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'LogViewer', taskQuery: 'cockpit-api' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
