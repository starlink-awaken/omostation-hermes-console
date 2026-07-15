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
      if (url === '/api/metaos/workflows') {
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
})
