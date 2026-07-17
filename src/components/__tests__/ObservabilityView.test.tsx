import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ObservabilityView from '../ObservabilityView'

vi.mock('../PlatformControlWorkbench', () => ({
  default: () => <div>Platform Workbench Mock</div>,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('ObservabilityView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders observability action links and routes to deeper pages', async () => {
    const onNavigate = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/arch-health') {
        return Promise.resolve(okJson({
          system: { health_score: 88 },
          git: { status: 'dirty', uncommitted: 3 },
          governance: { health: 'watch' },
        }))
      }
      if (url === '/api/bos/metrics') {
        return Promise.resolve(okJson({
          summary: { total_calls: 32, avg_latency: 780, success_count: 30 },
          domains: [
            { domain: 'governance', total: 12, success: 11, error: 1, avg_latency: 650 },
            { domain: 'healthy-worker', total: 8, success: 8, error: 0, avg_latency: 120 },
          ],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<ObservabilityView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('观测动作区')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '观测闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('观测承接工作台')).toBeInTheDocument()
      expect(screen.getByText('追性能瓶颈')).toBeInTheDocument()
      expect(screen.getByText('查日志证据')).toBeInTheDocument()
      expect(screen.getByText('排 BOS 网格')).toBeInTheDocument()
      expect(screen.getByText('BOS I0 网格链路流量')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /看性能页/ }))
    expect(onNavigate).toHaveBeenCalledWith('Performance')

    fireEvent.click(screen.getByRole('button', { name: /看告警页/ }))
    expect(onNavigate).toHaveBeenCalledWith('AlertCenter')

    fireEvent.click(screen.getByRole('button', { name: '查看异常域 governance' }))
    expect(onNavigate).toHaveBeenCalledWith('LogViewer')

    fireEvent.click(screen.getByRole('button', { name: '打开观测闭环对象 网格路由复核' }))
    expect(onNavigate).toHaveBeenCalledWith('McpMesh')

    const domainTable = screen.getByRole('table', { name: 'BOS 路由域名流量分布表' })
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索观测域' }), { target: { value: 'healthy' } })
    expect(within(domainTable).getByText('healthy-worker')).toBeInTheDocument()
    expect(within(domainTable).queryByText('governance')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '清除筛选' }))
    fireEvent.change(screen.getByRole('combobox', { name: '观测域状态' }), { target: { value: 'degraded' } })
    expect(within(domainTable).getByText('governance')).toBeInTheDocument()
    expect(within(domainTable).queryByText('healthy-worker')).not.toBeInTheDocument()
  })

  it('surfaces focus handoff for a matched observability domain', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/arch-health') {
        return Promise.resolve(okJson({
          system: { health_score: 88 },
          git: { status: 'dirty', uncommitted: 3 },
          governance: { health: 'watch' },
        }))
      }
      if (url === '/api/bos/metrics') {
        return Promise.resolve(okJson({
          summary: { total_calls: 32, avg_latency: 780, success_count: 30 },
          domains: [
            { domain: 'governance', total: 12, success: 11, error: 1, avg_latency: 650 },
          ],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(
      <ObservabilityView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="governance"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前观测承接焦点' })
    expect(within(focusRegion).getByText('governance')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开观测焦点对象 governance' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开观测焦点任务 governance' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Observability', taskQuery: 'governance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'governance' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces observability closure routing when focus hits governance tasking', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/arch-health') {
        return Promise.resolve(okJson({
          system: { health_score: 88 },
          git: { status: 'dirty', uncommitted: 3 },
          governance: { health: 'watch' },
        }))
      }
      if (url === '/api/bos/metrics') {
        return Promise.resolve(okJson({
          summary: { total_calls: 32, avg_latency: 780, success_count: 30 },
          domains: [
            { domain: 'governance', total: 12, success: 11, error: 1, avg_latency: 650 },
          ],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(
      <ObservabilityView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="系统地图与任务中心回挂"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前观测承接焦点' })
    expect(within(focusRegion).getByText('系统地图与任务中心回挂')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开观测焦点对象 系统地图与任务中心回挂' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开观测焦点任务 系统地图与任务中心回挂' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'Observability' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '系统地图与任务中心回挂' })
  })

  it('shows a retryable degraded state when observation sources are unavailable', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'BOS 指标服务不可用' }),
    } as Response)

    render(<ObservabilityView />)

    expect(await screen.findByRole('alert')).toHaveTextContent('BOS 指标服务不可用')
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })
})
