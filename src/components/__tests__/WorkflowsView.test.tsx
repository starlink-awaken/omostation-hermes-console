import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import WorkflowsView from '../WorkflowsView'

vi.mock('../KnowledgeExecutionWorkbench', () => ({
  default: () => <div data-testid="knowledge-workbench" />,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('WorkflowsView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/metaos/workflows?')) {
        return Promise.resolve(okJson({
          status: 'ok',
          workflows: [{
            id: 'wf-approval-42',
            task: '发布治理变更',
            status: 'awaiting_approval',
            created: '2026-07-10T10:00:00Z',
            updated: '2026-07-10T10:00:00Z',
          }],
        }))
      }
      if (url === '/api/metaos/workflows/wf-approval-42') {
        return Promise.resolve(okJson({
          status: 'ok',
          workflow: {
            workflow_id: 'wf-approval-42',
            task_description: '发布治理变更',
            status: 'awaiting_approval',
            nodes: [{ id: 'gate-1', task_type: 'red_gate', status: 'awaiting_approval', output: '' }],
          },
        }))
      }
      if (url === '/api/metaos/workflows/wf-approval-42/approve') {
        return Promise.resolve(okJson({ status: 'ok' }))
      }
      if (url === '/api/cockpit/metaos/workflows/wf-approval-42/queue') {
        return Promise.resolve(okJson({ id: 'cockpit-metaos-workflow-wf-approval-42', created: true, executes: false }))
      }
      return Promise.resolve(okJson({}))
    })
  })

  it('shows an inline approval result after the HITL endpoint succeeds', async () => {
    render(<WorkflowsView />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '工作流闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('工作流承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('发布治理变更').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '处理授权 wf-approval-42' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '授权放行' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '授权放行' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('工作流 wf-approval-42 已授权放行')
    })
  })

  it('surfaces focus handoff for a matched workflow record', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <WorkflowsView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="wf-approval-42"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前工作流承接焦点' })
    expect(within(focusRegion).getByText('发布治理变更')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开工作流焦点对象 发布治理变更' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开工作流焦点任务 发布治理变更' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Workflows', taskQuery: 'wf-approval-42' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'wf-approval-42' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('filters the workflow summary, workbench, history, and focus from shared conditions', async () => {
    const records = [
      {
        id: 'wf-approval-42',
        task: '发布治理变更',
        status: 'awaiting_approval',
        created: '2026-07-10T10:00:00Z',
        updated: '2026-07-10T10:00:00Z',
      },
      {
        id: 'wf-running-7',
        task: '刷新服务拓扑',
        status: 'running',
        created: '2026-07-10T11:00:00Z',
        updated: '2026-07-10T11:00:00Z',
      },
      {
        id: 'wf-failed-9',
        task: '补协议证据',
        status: 'failed',
        created: '2026-07-10T12:00:00Z',
        updated: '2026-07-10T12:00:00Z',
      },
    ]
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input).startsWith('/api/metaos/workflows?')) return Promise.resolve(okJson({ status: 'ok', workflows: records, total: records.length, has_more: false }))
      return Promise.resolve(okJson({}))
    })

    render(<WorkflowsView />)
    const filterRegion = await screen.findByRole('region', { name: '工作流筛选' })
    expect(within(filterRegion).getByText('显示 3/3')).toBeInTheDocument()

    fireEvent.change(within(filterRegion).getByRole('searchbox', { name: '搜索工作流' }), { target: { value: '发布' } })
    await waitFor(() => {
      expect(within(filterRegion).getByText('显示 1/3')).toBeInTheDocument()
      expect(screen.getAllByText('发布治理变更').length).toBeGreaterThan(0)
      expect(screen.queryByText('刷新服务拓扑')).not.toBeInTheDocument()
    })

    fireEvent.change(within(filterRegion).getByRole('searchbox', { name: '搜索工作流' }), { target: { value: '' } })
    fireEvent.change(within(filterRegion).getByRole('combobox', { name: '按状态筛选工作流' }), { target: { value: 'stalled' } })
    await waitFor(() => {
      expect(within(filterRegion).getByText('显示 1/3')).toBeInTheDocument()
      expect(screen.getAllByText('补协议证据').length).toBeGreaterThan(0)
      expect(screen.queryByText('发布治理变更')).not.toBeInTheDocument()
    })
  })

  it('queues the selected workflow as a follow-up task', async () => {
    const onOpenTarget = vi.fn()
    render(<WorkflowsView onOpenTarget={onOpenTarget} />)

    fireEvent.click(await screen.findByRole('button', { name: '处理授权 wf-approval-42' }))
    const queueButton = await screen.findByRole('button', { name: '承接跟进任务' })
    fireEvent.click(queueButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/cockpit/metaos/workflows/wf-approval-42/queue', expect.objectContaining({
        method: 'POST',
      }))
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-metaos-workflow-wf-approval-42',
      })
    })
    expect(screen.getByRole('status')).toHaveTextContent('已承接为任务')
  })

  it('falls back to tab navigation after queueing when no target router is provided', async () => {
    const onNavigate = vi.fn()
    render(<WorkflowsView onNavigate={onNavigate} />)

    fireEvent.click(await screen.findByRole('button', { name: '处理授权 wf-approval-42' }))
    fireEvent.click(await screen.findByRole('button', { name: '承接跟进任务' }))

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('TaskCenter'))
  })

  it('surfaces workflow closure routing when focus hits system map handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <WorkflowsView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="系统地图与任务收口"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前工作流承接焦点' })
    expect(within(focusRegion).getByText('系统地图与任务收口')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开工作流焦点对象 系统地图与任务收口' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开工作流焦点任务 系统地图与任务收口' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'Workflows' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '系统地图与任务收口' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('shows a retryable degraded state when workflow data is unavailable', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'MetaOS 工作流服务不可用' }),
    } as Response)

    render(<WorkflowsView />)

    expect(await screen.findByRole('alert')).toHaveTextContent('MetaOS 工作流服务不可用')
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('shows a retryable state when a workflow detail is unavailable', async () => {
    let detailAttempts = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/metaos/workflows?')) {
        return Promise.resolve(okJson({
          status: 'ok',
          workflows: [{
            id: 'wf-detail-404',
            task: '查看失败详情',
            status: 'running',
            created: '2026-07-10T10:00:00Z',
            updated: '2026-07-10T10:00:00Z',
          }],
        }))
      }
      if (url === '/api/metaos/workflows/wf-detail-404') {
        detailAttempts += 1
        return Promise.resolve(detailAttempts === 1
          ? ({ ok: false, json: async () => ({ error: '工作流详情服务不可用' }) } as Response)
          : okJson({ status: 'ok', workflow: {
            workflow_id: 'wf-detail-404',
            task_description: '查看失败详情',
            status: 'running',
            nodes: [],
          } }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<WorkflowsView />)
    fireEvent.click(await screen.findByRole('button', { name: '查看运行工作流 wf-detail-404' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('工作流详情服务不可用')
    fireEvent.click(screen.getByRole('button', { name: '重试详情' }))

    await waitFor(() => {
      expect(detailAttempts).toBe(2)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByText('工作流详情 & 人机协作 (HITL)')).toBeInTheDocument()
    })
  })
})
