import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import TopologyView, { buildTopology } from '../TopologyView'

vi.mock('../InfrastructureOpsWorkbench', () => ({
  default: () => <div>Infrastructure Workbench Mock</div>,
}))

vi.mock('reactflow', () => ({
  default: () => <div data-testid="react-flow" />,
  Background: () => null,
  Controls: () => null,
  Handle: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Top: 'top', Bottom: 'bottom' },
  useNodesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
}))

const okJson = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

describe('TopologyView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('shows a truthful unavailable state when the service probe fails', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}, false))

    render(<TopologyView />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '拓扑闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('拓扑动作区')).toBeInTheDocument()
      expect(screen.getByText('服务拓扑数据不可用')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '重试拓扑探测' })).toBeInTheDocument()
    })
  })

  it('surfaces topology follow-up actions for abnormal services', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { name: 'gateway', status: 'degraded', dependencies: ['worker'] },
        { name: 'worker', status: 'offline', dependencies: [] },
      ],
    }))

    render(<TopologyView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByText('拓扑承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('worker').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '查看拓扑服务 worker' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Compute', taskQuery: 'worker' })

    fireEvent.click(screen.getByRole('button', { name: '打开拓扑承接到网格页' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'McpMesh', taskQuery: 'gateway' })

    vi.mocked(fetch).mockResolvedValueOnce(okJson({ id: 'topology-task-1', title: '拓扑任务' }))
    fireEvent.click(screen.getByRole('button', { name: '登记拓扑治理任务' }))
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('已登记拓扑治理任务：拓扑任务')
    })
  })

  it('only builds edges from explicit service dependencies', () => {
    const withoutRelationships = buildTopology([
      { name: 'gateway', status: 'running' },
      { name: 'worker', status: 'running' },
    ])
    expect(withoutRelationships.edges).toHaveLength(0)

    const withRelationship = buildTopology([
      { name: 'gateway', status: 'running', dependencies: ['worker'] },
      { name: 'worker', status: 'running' },
    ])
    expect(withRelationship.edges).toEqual([
      expect.objectContaining({ source: 'worker', target: 'gateway' }),
    ])
  })

  it('surfaces focus handoff for a matched topology service', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { name: 'gateway', status: 'degraded', dependencies: ['worker'] },
        { name: 'worker', status: 'offline', dependencies: [] },
      ],
    }))

    render(
      <TopologyView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="worker"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前拓扑承接焦点' })
    expect(within(focusRegion).getByText('worker')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开拓扑焦点对象 worker' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开拓扑焦点任务 worker' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Topology', taskQuery: 'worker' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'worker' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('filters topology nodes and keeps abnormal follow-up targets in the filtered set', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { name: 'gateway', status: 'degraded', dependencies: ['worker'] },
        { name: 'worker', status: 'offline', dependencies: [] },
        { name: 'scheduler', status: 'offline', dependencies: [] },
      ],
    }))

    render(<TopologyView />)
    await screen.findByRole('region', { name: '拓扑节点筛选' })

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索拓扑节点' }), { target: { value: 'scheduler' } })
    await waitFor(() => {
      expect(screen.getByText('显示节点 1/3')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看拓扑服务 scheduler' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '查看拓扑服务 worker' })).not.toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox', { name: '按状态筛选拓扑节点' }), { target: { value: 'online' } })
    await waitFor(() => {
      expect(screen.getByText('显示节点 0/3')).toBeInTheDocument()
      expect(screen.getByText('没有匹配的拓扑节点。')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '清除拓扑节点筛选' }))
    expect(screen.getByText('显示节点 3/3')).toBeInTheDocument()
  })

  it('surfaces topology closure routing when focus hits system map handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      items: [
        { name: 'gateway', status: 'degraded', dependencies: ['worker'] },
        { name: 'worker', status: 'offline', dependencies: [] },
      ],
    }))

    render(
      <TopologyView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="系统地图与任务回挂"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前拓扑承接焦点' })
    expect(within(focusRegion).getByText('系统地图与任务回挂')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开拓扑焦点对象 系统地图与任务回挂' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开拓扑焦点任务 系统地图与任务回挂' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'Topology' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'Topology' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
