import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import EcosWorkflowWorkbench from '../EcosWorkflowWorkbench'

const response = (body: unknown) => ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as Response

describe('EcosWorkflowWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('loads a workflow catalog and runs a safe test against the selected workflow', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/ecos/workflow/list') return Promise.resolve(response({ workflows: [{ name: 'health-check', display: '健康检查', layer: 'L0', subtype: 'PipelineWorkflow' }] }))
      if (url === '/api/ecos/workflow/backends') return Promise.resolve(response({ backends: [{ name: 'local' }] }))
      if (url === '/api/ecos/workflow/actions') return Promise.resolve(response({ actions: [{ name: 'health_check' }] }))
      if (url.includes('/describe/')) return Promise.resolve(response({ name: 'health-check', steps: [] }))
      if (url.includes('/validate/')) return Promise.resolve(response({ name: 'health-check', valid: true, errors: [], warnings: [] }))
      if (url.includes('/workflow/test?name=health-check')) {
        expect(init?.method).toBe('POST')
        return Promise.resolve(response({ status: 'ok', passed: 1, failed: 0 }))
      }
      if (url.includes('/api/cockpit/ecos/workflows/health-check/queue?mode=test')) {
        expect(init?.method).toBe('POST')
        return Promise.resolve(response({ id: 'cockpit-ecos-workflow-health-check-test', created: true, executes: false }))
      }
      return Promise.resolve(response({}))
    })

    render(<EcosWorkflowWorkbench onOpenTarget={onOpenTarget} />)

    expect(await screen.findByRole('option', { name: '健康检查' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/健康检查/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '模拟测试' }))

    await waitFor(() => expect(screen.getByText(/最近验证结果/)).toBeInTheDocument())
    expect(screen.getByText(/"passed": 1/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '承接到任务中心' }))
    await waitFor(() => expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-ecos-workflow-health-check-test',
    }))
  })

  it('retries the failed verification action instead of reloading only the catalog', async () => {
    let testAttempts = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/ecos/workflow/list') return Promise.resolve(response({ workflows: [{ name: 'health-check', display: '健康检查' }] }))
      if (url === '/api/ecos/workflow/backends') return Promise.resolve(response({ backends: [] }))
      if (url === '/api/ecos/workflow/actions') return Promise.resolve(response({ actions: [] }))
      if (url === '/api/ecos/workflow/logs?recent=8') return Promise.resolve(response({ runs: [] }))
      if (url.includes('/describe/')) return Promise.resolve(response({ name: 'health-check', steps: [] }))
      if (url.includes('/validate/')) return Promise.resolve(response({ name: 'health-check', valid: true }))
      if (url.includes('/workflow/test?name=health-check')) {
        testAttempts += 1
        return Promise.resolve(testAttempts === 1
          ? ({ ok: false, status: 503, statusText: 'Unavailable', json: async () => ({ error: '测试执行器暂不可用' }) } as Response)
          : response({ status: 'ok', passed: 1, failed: 0 }))
      }
      return Promise.resolve(response({}))
    })

    render(<EcosWorkflowWorkbench />)
    await screen.findByRole('option', { name: '健康检查' })
    fireEvent.click(await screen.findByRole('button', { name: '模拟测试' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('测试执行器暂不可用')
    fireEvent.click(screen.getByRole('button', { name: '重试模拟测试' }))

    await waitFor(() => {
      expect(screen.getByText(/最近验证结果/)).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(testAttempts).toBe(2)
    expect(fetch).toHaveBeenCalledWith('/api/ecos/workflow/test?name=health-check', expect.objectContaining({ method: 'POST' }))
  })
})
