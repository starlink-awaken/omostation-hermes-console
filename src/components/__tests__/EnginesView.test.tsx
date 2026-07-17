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
  static instances: EventSourceMock[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  close = vi.fn()

  constructor() {
    EventSourceMock.instances.push(this)
  }
}

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('EnginesView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    EventSourceMock.instances = []
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
    const onNavigate = vi.fn()
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

    render(<EnginesView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('health-check')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText('执行指令 / 目标'), { target: { value: '核对运行状态' } })
    fireEvent.click(screen.getByRole('button', { name: '承接管线任务' }))

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
      expect(screen.getByText(/executes/)).toBeInTheDocument()
    })
  })

  it('carries the generated MetaOS plan into the planned task', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/pipelines') return Promise.resolve(okJson({ pipelines: ['health-check'] }))
      if (url === '/api/metaos/plan') {
        expect(init?.method).toBe('POST')
        return Promise.resolve(okJson({ status: 'ok', plan: { steps: [{ id: 'inspect' }] } }))
      }
      if (url === '/api/cockpit/engine/queue') {
        expect(JSON.parse(String(init?.body))).toEqual({
          engine: 'metaos',
          task: '核对运行状态',
          plan: { status: 'ok', plan: { steps: [{ id: 'inspect' }] } },
        })
        return Promise.resolve(okJson({ id: 'cockpit-engine-metaos-42', executes: false }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<EnginesView onOpenTarget={onOpenTarget} />)
    await waitFor(() => expect(screen.getByDisplayValue('health-check')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('执行指令 / 目标'), { target: { value: '核对运行状态' } })
    fireEvent.click(screen.getByRole('button', { name: '新任务' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '承接计划' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '承接计划' }))

    await waitFor(() => expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-engine-metaos-42' }))
  })

  it('shows a retryable error when the pipeline catalog is unavailable', async () => {
    let attempts = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/pipelines') {
        attempts += 1
        return Promise.resolve(attempts === 1
          ? ({ ok: false, status: 503, json: async () => ({ error: '管线服务暂时不可用' }) } as Response)
          : okJson({ pipelines: ['recovered-pipeline'] }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<EnginesView />)

    expect(await screen.findByRole('alert')).toHaveTextContent('管线服务暂时不可用')
    fireEvent.click(screen.getByRole('button', { name: '重试管线' }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('recovered-pipeline')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(attempts).toBe(2)
  })

  it('filters pipeline choices and event evidence without changing the execution catalog', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/pipelines') {
        return Promise.resolve(okJson({ pipelines: ['governance-sync', 'family-weekly-report', 'health-check'] }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<EnginesView />)
    await waitFor(() => expect(screen.getByDisplayValue('governance-sync')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('搜索引擎管线'), { target: { value: 'family' } })
    expect(screen.getByRole('button', { name: '选择引擎管线 family-weekly-report' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '选择引擎管线 governance-sync' })).not.toBeInTheDocument()
    expect(screen.getByText('显示 1/3 条管线')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('执行指令 / 目标'), { target: { value: '核对运行状态' } })
    expect(screen.getByRole('option', { name: 'health-check' })).toBeInTheDocument()

    const eventSource = EventSourceMock.instances[0]
    eventSource.onmessage?.({ data: JSON.stringify({ id: 'event-1', type: 'pipeline:step:error', time: '2026-07-17T05:00:00Z', source: 'health-check', payload: { step_index: 2 } }) } as MessageEvent)
    eventSource.onmessage?.({ data: JSON.stringify({ id: 'event-2', type: 'pipeline:step:ok', time: '2026-07-17T05:01:00Z', source: 'governance-sync', payload: { step_index: 1 } }) } as MessageEvent)

    await waitFor(() => expect(screen.getAllByText('pipeline:step:error').length).toBeGreaterThan(1))
    fireEvent.change(screen.getByLabelText('按事件类型筛选引擎事件'), { target: { value: 'pipeline:step:error' } })
    const eventLog = screen.getByRole('log', { name: '消息总线追踪日志流' })
    expect(within(eventLog).getByText('pipeline:step:error')).toBeInTheDocument()
    expect(within(eventLog).queryByText('pipeline:step:ok')).not.toBeInTheDocument()
    expect(screen.getByText('显示 1/2 条事件')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '清除引擎管线筛选' }))
    expect(screen.getByRole('button', { name: '选择引擎管线 governance-sync' })).toBeInTheDocument()
  })
})
