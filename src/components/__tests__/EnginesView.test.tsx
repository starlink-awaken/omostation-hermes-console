import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import EnginesView from '../EnginesView'

vi.mock('../PlatformControlWorkbench', () => ({
  default: () => <div>Platform Workbench Mock</div>,
}))

vi.mock('../WorkflowGraph', () => ({
  default: () => <div data-testid="workflow-graph" />,
}))

class EventSourceMock {
  onmessage: ((event: MessageEvent) => void) | null = null
  close = vi.fn()
}

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('EnginesView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    vi.stubGlobal('EventSource', EventSourceMock as unknown as typeof EventSource)
  })

  it('builds an engine workbench that selects pipelines and opens follow-up pages', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/pipelines') {
        return Promise.resolve(okJson({ pipelines: ['governance-sync', 'family-weekly-report'] }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<EnginesView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('引擎协作区')).toBeInTheDocument()
      expect(screen.getByText('引擎承接工作台')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '选择引擎管线 governance-sync' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '选择引擎管线 family-weekly-report' }))
    expect(screen.getByDisplayValue('family-weekly-report')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开引擎承接到工作流页' }))
    expect(onNavigate).toHaveBeenCalledWith('Workflows')
  })

  it('surfaces focus handoff for a matched engine pipeline', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/pipelines') {
        return Promise.resolve(okJson({ pipelines: ['governance-sync', 'family-weekly-report'] }))
      }
      return Promise.resolve(okJson({}))
    })

    render(
      <EnginesView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="family-weekly-report"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前引擎承接焦点' })
    expect(within(focusRegion).getByText('family-weekly-report')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByDisplayValue('family-weekly-report')).toBeInTheDocument()
    })

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开引擎焦点对象 family-weekly-report' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开引擎焦点任务 family-weekly-report' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Engines', taskQuery: 'family-weekly-report' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'family-weekly-report' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('queues pipeline execution into TaskCenter instead of launching it directly', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/pipelines') {
        return Promise.resolve(okJson({ pipelines: ['health-check'] }))
      }
      if (url === '/api/cockpit/engine/queue') {
        expect(init?.method).toBe('POST')
        expect(init?.body).toBe(JSON.stringify({ engine: 'pipeline', pipeline: 'health-check', task: '核对运行状态' }))
        return Promise.resolve(okJson({ id: 'cockpit-engine-health-check', executes: false }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<EnginesView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('health-check')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText('执行指令 / 目标'), { target: { value: '核对运行状态' } })
    fireEvent.click(screen.getByRole('button', { name: '承接管线任务' }))

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-engine-health-check' })
      expect(screen.getByText(/executes/)).toBeInTheDocument()
    })
  })
})
