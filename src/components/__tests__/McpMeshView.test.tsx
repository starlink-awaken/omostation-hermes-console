import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import McpMeshView from '../McpMeshView'

vi.mock('../InfrastructureOpsWorkbench', () => ({
  default: () => <div data-testid="infrastructure-workbench" />,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('McpMeshView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/bos/services') {
        return Promise.resolve(okJson({
          services: [
            { uri: 'bos://memory/kos/search', domain: 'memory', action: 'search', transport: 'http' },
            { uri: 'bos://governance/audit/run', domain: 'governance', action: 'audit', transport: 'stdio' },
          ],
        }))
      }
      if (url === '/api/bos/health') {
        return Promise.resolve(okJson({
          status: 'ok',
          total_routes: 2,
          domains: { memory: 1, governance: 1 },
          metrics: {},
        }))
      }
      return Promise.resolve(okJson({}))
    })
  })

  it('builds a mesh workbench that filters domains and opens follow-up pages', async () => {
    const onNavigate = vi.fn()
    render(<McpMeshView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '网格闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('网格动作区')).toBeInTheDocument()
      expect(screen.getByText('网格承接工作台')).toBeInTheDocument()
      expect(screen.getByText('BOS URI 网格路由明细')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '筛选网格域 memory' }))
    expect(screen.getByRole('option', { name: 'MEMORY' }).selected).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '打开网格承接到任务中心' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('surfaces focus handoff for a matched mesh domain', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<McpMeshView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="memory" />)

    const focusRegion = await screen.findByRole('region', { name: '当前网格承接焦点' })
    expect(focusRegion).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'MEMORY' }).selected).toBe(true)
    expect(within(focusRegion).getByText('bos://memory/kos/search')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开网格焦点对象 bos://memory/kos/search' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开网格焦点任务 bos://memory/kos/search' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'McpMesh', taskQuery: 'memory' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'memory' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('opens the acceptance task after registering a mesh instance', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/bos/services') return Promise.resolve(okJson({ services: [] }))
      if (url === '/api/bos/health') return Promise.resolve(okJson({ status: 'ok', total_routes: 0, domains: {}, metrics: {} }))
      if (url === '/api/instance') return Promise.resolve(okJson({
        status: 'ok',
        msg: '实例 mesh-router 注册成功',
        task_id: 'cockpit-mcp-registration-mesh-router',
        task_created: true,
      }))
      return Promise.resolve(okJson({}))
    })

    render(<McpMeshView onOpenTarget={onOpenTarget} />)
    const serviceInput = await screen.findByPlaceholderText('例如: family-hub')
    const endpointInput = await screen.findByPlaceholderText('例如: http://localhost:8000/mcp')
    fireEvent.change(serviceInput, { target: { value: 'mesh-router' } })
    fireEvent.change(endpointInput, { target: { value: 'http://localhost:8000/mcp' } })
    fireEvent.click(screen.getByRole('button', { name: '提交实例注册' }))

    const taskButton = await screen.findByRole('button', { name: '打开 MCP 验收任务 cockpit-mcp-registration-mesh-router' })
    fireEvent.click(taskButton)
    expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-mcp-registration-mesh-router',
    })
  })

  it('surfaces mesh closure routing when focus hits missing domain handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <McpMeshView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="缺失域与应用补挂"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前网格承接焦点' })
    expect(within(focusRegion).getByText('缺失域与应用补挂')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开网格焦点对象 缺失域与应用补挂' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开网格焦点任务 缺失域与应用补挂' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'DomainApps', taskQuery: 'analysis' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'analysis' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
