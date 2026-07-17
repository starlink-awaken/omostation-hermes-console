import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import LogViewerPage from '../LogViewerPage'

vi.mock('../RuntimeOpsWorkbench', () => ({
  default: () => <div>Runtime Workbench Mock</div>,
}))

const okJson = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

describe('LogViewerPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('shows a truthful unavailable state instead of generating fake logs', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}, false))

    render(<LogViewerPage />)

    await waitFor(() => {
      expect(screen.getByText('真实日志数据不可用')).toBeInTheDocument()
      expect(screen.getByText('日志动作区')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '重试日志读取' })).toBeInTheDocument()
    })
    expect(screen.queryByText(/Log message/)).not.toBeInTheDocument()
  })

  it('builds a log workbench that filters sources and opens follow-up pages', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { timestamp: '2026-07-11T10:00:00Z', level: 'error', source: 'cockpit-api', message: 'database timeout' },
        { timestamp: '2026-07-11T10:01:00Z', level: 'info', source: 'worker', message: 'job completed' },
      ],
    }))

    render(<LogViewerPage onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '日志闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('日志承接工作台')).toBeInTheDocument()
      expect(screen.getByText('database timeout')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '查看日志来源 cockpit-api' }))
    expect(screen.getByDisplayValue('cockpit-api')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开日志承接到性能页' }))
    expect(onNavigate).toHaveBeenCalledWith('Performance')
  })

  it('finds logs by source, timestamp and metadata as well as message', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { timestamp: '2026-07-11T10:00:00Z', level: 'error', source: 'cockpit-api', message: 'database timeout', metadata: { request_id: 'req-42' } },
        { timestamp: '2026-07-11T10:01:00Z', level: 'info', source: 'worker', message: 'job completed', metadata: { request_id: 'req-43' } },
      ],
    }))

    const { container } = render(<LogViewerPage />)
    await waitFor(() => expect(screen.getByText('database timeout')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('搜索日志...'), { target: { value: 'req-42' } })
    await waitFor(() => expect(container.querySelectorAll('.log-table tbody tr')).toHaveLength(1))
    expect(screen.getByText('database timeout')).toBeInTheDocument()
    expect(screen.queryByText('job completed')).not.toBeInTheDocument()
  })

  it('surfaces focus handoff for a matched log source', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { timestamp: '2026-07-11T10:00:00Z', level: 'error', source: 'cockpit-api', message: 'database timeout' },
        { timestamp: '2026-07-11T10:01:00Z', level: 'info', source: 'worker', message: 'job completed' },
      ],
    }))

    render(<LogViewerPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="cockpit-api" />)

    const focusRegion = await screen.findByRole('region', { name: '当前日志承接焦点' })
    expect(within(focusRegion).getByText('cockpit-api')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开日志焦点对象 cockpit-api' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开日志焦点任务 cockpit-api' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'LogViewer', taskQuery: 'cockpit-api' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'cockpit-api' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces log closure routing when focus hits system map handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { timestamp: '2026-07-11T10:00:00Z', level: 'error', source: 'cockpit-api', message: 'database timeout' },
        { timestamp: '2026-07-11T10:01:00Z', level: 'info', source: 'worker', message: 'job completed' },
      ],
    }))

    render(
      <LogViewerPage
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="系统地图缺口回挂"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前日志承接焦点' })
    expect(within(focusRegion).getByText('系统地图缺口回挂')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开日志焦点对象 系统地图缺口回挂' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开日志焦点任务 系统地图缺口回挂' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'LogViewer' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'cockpit-api' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('registers a real governance task from a critical log source', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch)
      .mockResolvedValueOnce(okJson({
        items: [
          { timestamp: '2026-07-11T10:00:00Z', level: 'error', source: 'cockpit-api', message: 'database timeout' },
        ],
      }))
      .mockResolvedValueOnce(okJson({ id: 'cockpit-manual-log', title: '日志治理：cockpit-api' }))

    render(<LogViewerPage onOpenTarget={onOpenTarget} />)

    await screen.findByText('database timeout')
    fireEvent.click(screen.getByRole('button', { name: '登记日志治理任务' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/tasks', expect.objectContaining({ method: 'POST' }))
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-manual-log' })
    })
    expect(screen.getByRole('status')).toHaveTextContent('已登记日志治理任务')
  })
})
