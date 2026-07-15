import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import EcosWorkflowWorkbench from '../EcosWorkflowWorkbench'

const response = (body: unknown) => ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as Response

describe('EcosWorkflowWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('loads a workflow catalog and runs a safe test against the selected workflow', async () => {
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
      return Promise.resolve(response({}))
    })

    render(<EcosWorkflowWorkbench />)

    expect(await screen.findByRole('option', { name: '健康检查' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/健康检查/)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '模拟测试' }))

    await waitFor(() => expect(screen.getByText(/最近验证结果/)).toBeInTheDocument())
    expect(screen.getByText(/"passed": 1/)).toBeInTheDocument()
  })
})
