import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ComputeView from '../ComputeView'

vi.mock('../InfrastructureOpsWorkbench', () => ({
  default: () => <div data-testid="infrastructure-workbench" />,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('ComputeView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('does not show synthetic metrics when compute status is unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('compute backend offline'))

    render(<ComputeView />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('算力状态暂不可用')
    })

    expect(screen.queryByText('15 ms')).not.toBeInTheDocument()
    expect(screen.queryByText('42 T/s')).not.toBeInTheDocument()
    expect(screen.queryByText('84%')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重试算力状态' }))
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('renders measured node load values from the compute API', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: { avg_latency_ms: 128, avg_tokens_per_second: 36 },
      cost_board: { interception_rate: 0.5, saved_vs_cloud_usd: 1.2 },
      nodes: [{ id: 'local-mac', name: '本地主机', status: 'online', cpu_usage: 17, gpu_usage: 0 }],
      quota: { quota: [] },
      available_models: [],
      traffic_by_node: [],
      circuit_broken: false,
      daily_budget: 100,
    }))

    render(<ComputeView />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/governance/compute/status')
      expect(screen.getByRole('region', { name: '算力闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('128 ms')).toBeInTheDocument()
      expect(screen.getByText('36 T/s')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('17%')).toBeInTheDocument()
    })
  })

  it('surfaces compute follow-up actions for saturated nodes and provider risks', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: { avg_latency_ms: 220, avg_tokens_per_second: 21 },
      cost_board: { interception_rate: 0.4, saved_vs_cloud_usd: 2.6 },
      nodes: [{ id: 'local-mac', name: '本地主机', status: 'online', cpu_usage: 81, gpu_usage: 12 }],
      quota: { quota: [{ provider: 'openai', available: false, used_percent: 92 }] },
      available_models: [],
      traffic_by_node: [{ node_id: 'local-mac', node_label: '本地主机', route_type: 'local', calls: 12, tokens: 3200, estimated_cost_usd: 0, equivalent_cloud_cost_usd: 0, saved_vs_cloud_usd: 0, latency_ms_avg: 220, tokens_per_second_avg: 21 }],
      scheduled_tasks: [],
      circuit_broken: false,
      daily_budget: 100,
    }))

    render(<ComputeView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('算力承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('本地主机').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '处理算力节点 本地主机' }))
    expect(onNavigate).toHaveBeenCalledWith('McpMesh')

    fireEvent.click(screen.getByRole('button', { name: '处理供应商风险 openai' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('keeps compute control changes focused on their created task', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/governance/compute/status') {
        return Promise.resolve(okJson({
          summary: {},
          cost_board: {},
          nodes: [],
          quota: { quota: [] },
          traffic_by_node: [],
          circuit_broken: false,
          daily_budget: 100,
        }))
      }
      if (String(input) === '/api/cockpit/compute/control/queue') {
        expect(init?.method).toBe('POST')
        return Promise.resolve(okJson({ id: 'cockpit-compute-control-circuit_break-42', executes: false }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<ComputeView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /紧急拉闸/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /紧急拉闸/ }))

    await waitFor(() => expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-compute-control-circuit_break-42',
    }))
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces focus handoff for a matched compute provider risk', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: { avg_latency_ms: 220, avg_tokens_per_second: 21 },
      cost_board: { interception_rate: 0.4, saved_vs_cloud_usd: 2.6 },
      nodes: [{ id: 'local-mac', name: '本地主机', status: 'online', cpu_usage: 81, gpu_usage: 12 }],
      quota: { quota: [{ provider: 'openai', available: false, used_percent: 92 }] },
      available_models: [],
      traffic_by_node: [],
      scheduled_tasks: [],
      circuit_broken: false,
      daily_budget: 100,
    }))

    render(
      <ComputeView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="openai"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前算力承接焦点' })
    expect(within(focusRegion).getByText('openai')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开算力焦点对象 openai' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开算力焦点任务 openai' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Compute', taskQuery: 'openai' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'openai' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces compute closure routing when focus hits local generation handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: { avg_latency_ms: 128, avg_tokens_per_second: 36 },
      cost_board: { interception_rate: 0.5, saved_vs_cloud_usd: 1.2 },
      nodes: [{ id: 'local-mac', name: '本地主机', status: 'online', cpu_usage: 17, gpu_usage: 0 }],
      quota: { quota: [] },
      available_models: [],
      traffic_by_node: [],
      circuit_broken: false,
      daily_budget: 100,
    }))

    render(
      <ComputeView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="本地生成与实验验收"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前算力承接焦点' })
    expect(within(focusRegion).getByText('本地生成与实验验收')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开算力焦点对象 本地生成与实验验收' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开算力焦点任务 本地生成与实验验收' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Sandbox', taskQuery: '本地算力生成' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '本地算力生成' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('registers local generation output as a task-center follow-up', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch)
      .mockResolvedValueOnce(okJson({
        summary: { avg_latency_ms: 128, avg_tokens_per_second: 36 },
        cost_board: { interception_rate: 0.5, saved_vs_cloud_usd: 1.2 },
        nodes: [{ id: 'local-mac', name: '本地主机', status: 'online', cpu_usage: 17, gpu_usage: 0 }],
        quota: { quota: [] },
        traffic_by_node: [],
        scheduled_tasks: [],
        circuit_broken: false,
        daily_budget: 100,
      }))
      .mockResolvedValueOnce(okJson({ status: 'success', content: '分层架构建议' }))
      .mockResolvedValueOnce(okJson({ created: true, id: 'generation-task-1' }))

    render(<ComputeView onNavigate={onNavigate} />)

    await waitFor(() => expect(screen.getByText('本地算力生成')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('输入提示词，回车或点生成…'), { target: { value: '总结架构' } })
    fireEvent.click(screen.getByRole('button', { name: '生成' }))
    await waitFor(() => expect(screen.getByText('分层架构建议')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '登记本地生成结果' }))
    await waitFor(() => expect(screen.getByText('生成结果已登记到任务中心。')).toBeInTheDocument())
    expect(fetch).toHaveBeenLastCalledWith('/api/cockpit/compute/generation/queue', expect.objectContaining({ method: 'POST' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('keeps node, traffic and scheduled-task views aligned under compute filters', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: {},
      cost_board: {},
      nodes: [
        { id: 'local-mac', name: '本地主机', model: 'coder', type: 'local', status: 'online', cpu_usage: 17, gpu_usage: 0 },
        { id: 'cloud-a', name: '云端节点 A', model: 'general', type: 'cloud', status: 'offline', cpu_usage: 0, gpu_usage: 0 },
      ],
      quota: { quota: [] },
      traffic_by_node: [
        { node_id: 'local-mac', node_label: '本地主机', route_type: 'local', calls: 4, tokens: 400, latency_ms_avg: 10, tokens_per_second_avg: 40 },
        { node_id: 'cloud-a', node_label: '云端节点 A', route_type: 'cloud', calls: 8, tokens: 800, latency_ms_avg: 20, tokens_per_second_avg: 30 },
      ],
      scheduled_tasks: [
        { task_id: 'task-local', task_name: '本地分析', node_id: 'local-mac', engine: 'coder', status: 'running', progress: 40 },
        { task_id: 'task-cloud', task_name: '云端分析', node_id: 'cloud-a', engine: 'general', status: 'running', progress: 20 },
      ],
      circuit_broken: false,
      daily_budget: 100,
    }))

    render(<ComputeView />)
    await waitFor(() => expect(screen.getAllByText('云端节点 A').length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('搜索算力节点'), { target: { value: 'local' } })
    expect(screen.getByText('显示 1/2 个节点 · 流量 1/2 · 调度 1/2')).toBeInTheDocument()
    const nodeSection = screen.getByRole('region', { name: '算力对象筛选' }).parentElement
    expect(nodeSection).not.toBeNull()
    expect(within(nodeSection as HTMLElement).getByText('本地主机')).toBeInTheDocument()
    expect(within(nodeSection as HTMLElement).queryByText('云端节点 A')).not.toBeInTheDocument()
    expect(screen.getByText('task-local')).toBeInTheDocument()
    expect(screen.queryByText('task-cloud')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '清除算力对象筛选' }))
    expect(screen.getByText('显示 2/2 个节点 · 流量 2/2 · 调度 2/2')).toBeInTheDocument()
  })
})
