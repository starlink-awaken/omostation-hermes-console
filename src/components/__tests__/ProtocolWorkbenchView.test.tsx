import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import ProtocolWorkbenchView from '../ProtocolWorkbenchView'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('ProtocolWorkbenchView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders protocol layer summary and related navigation', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/cockpit/protocol-hub') {
        return Promise.resolve(okJson({
          summary: {
            workflow_definitions: 12,
            workflow_actions: 25,
            workflow_backends: 4,
            recent_runs: 2,
            ready_layers: 2,
            watch_layers: 1,
            page_score: 91,
          },
          layers: [
            {
              id: 'ecos-mof',
              title: 'L0 · ecos / MOF',
              status: 'ready',
              role: '定义元模型和约束。',
              facts: ['M0 snapshot: available', 'workflow defs: 12'],
              next_action: '核对 snapshot 和 workflow 定义。',
            },
          ],
          recent_workflows: [
            { id: 'wf-1', task: '协议层巡检', status: 'running', updated_at: '2026-07-07T06:00:00Z' },
          ],
          commands: [
            { id: 'ecos-list', label: '列出 ecos 工作流', value: 'cockpit workflow ecos list', detail: '查看定义。' },
          ],
          related_pages: [
            { id: 'Assets', title: '技术资产库', reason: '协议层依赖 workflow 资产。' },
          ],
          roadmap_item: { id: 'protocol-workbench-surface', title: '补齐协议与元模型操作面', priority: 'P0', problem: '协议层入口不足。' },
          playbook: { id: 'protocol-integrity-check', title: '协议层完整性检查', goal: '每周巡检协议层。' },
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<ProtocolWorkbenchView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('协议与元模型操作面')).toBeInTheDocument()
      expect(screen.getByText('协议补证与承接')).toBeInTheDocument()
      expect(screen.getByText('workflow 定义')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getAllByText('L0 · ecos / MOF').length).toBeGreaterThan(0)
      expect(screen.getAllByText('协议层巡检').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /查看承接页面 技术资产库/ }))
    expect(onNavigate).toHaveBeenCalledWith('Assets')
  })

  it('surfaces focus handoff for a matched protocol page', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: {
        workflow_definitions: 12,
        workflow_actions: 25,
        workflow_backends: 4,
        recent_runs: 2,
        ready_layers: 2,
        watch_layers: 1,
        page_score: 91,
      },
      layers: [
        {
          id: 'ecos-mof',
          title: 'L0 · ecos / MOF',
          status: 'watch',
          role: '定义元模型和约束。',
          facts: ['M0 snapshot: available'],
          next_action: '核对 snapshot 和 workflow 定义。',
        },
      ],
      recent_workflows: [],
      commands: [],
      related_pages: [
        { id: 'Assets', title: '技术资产库', reason: '协议层依赖 workflow 资产。' },
      ],
      roadmap_item: null,
      playbook: null,
    }))

    render(
      <ProtocolWorkbenchView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="Assets"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前协议承接焦点' })
    expect(within(focusRegion).getByText('技术资产库')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开协议焦点对象 技术资产库' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开协议焦点任务 技术资产库' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Assets', taskQuery: 'Assets' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'Assets' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('renders protocol surface map and draft actions', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: {
        workflow_definitions: 9,
        workflow_actions: 18,
        workflow_backends: 3,
        recent_runs: 1,
        ready_layers: 1,
        watch_layers: 2,
        page_score: 88,
      },
      layers: [
        {
          id: 'model-driven',
          title: 'Model Driven Layer',
          status: 'watch',
          role: '承接模型驱动定义。',
          facts: ['bridge stale'],
          next_action: '补齐 workflow 对接证据。',
        },
      ],
      recent_workflows: [
        { id: 'wf-2', task: '协议回归检查', status: 'running', updated_at: '2026-07-10T06:00:00Z' },
      ],
      commands: [
        { id: 'protocol-audit', label: '协议巡检命令', value: 'cockpit protocol audit', detail: '补齐协议运行证据。' },
      ],
      related_pages: [
        { id: 'Workflows', title: '工作流编排', reason: '查看最近 workflow 承接情况。' },
        { id: 'SystemMap', title: '系统地图', reason: '回到治理面确认收口。' },
      ],
      roadmap_item: { id: 'protocol-roadmap', title: '协议收口计划', priority: 'P1', problem: '治理收口还不完整。' },
      playbook: { id: 'protocol-playbook', title: '协议巡检手册', goal: '按固定节奏跑协议层检查。' },
    }))

    render(
      <ProtocolWorkbenchView
        onOpenTarget={onOpenTarget}
        focusTaskQuery="audit"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('协议维度地图')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '当前协议子面板' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '协议闭环总表' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '协议补位任务' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '切换协议子面板 治理收口' }))
    expect(screen.getByText('补齐协议承接：治理收口')).toBeInTheDocument()

    const closureRegion = screen.getByRole('region', { name: '协议闭环总表' })
    fireEvent.click(within(closureRegion).getByRole('button', { name: '打开协议闭环对象 治理收口' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', taskQuery: 'audit' })

    fireEvent.click(screen.getByRole('button', { name: '打开协议相关对象 治理收口' }))
    expect(onOpenTarget).toHaveBeenLastCalledWith({ tab: 'SystemMap', taskQuery: 'audit' })

    vi.mocked(fetch).mockResolvedValueOnce(okJson({ id: 'protocol-task-1', title: '协议任务' }))
    fireEvent.click(screen.getByRole('button', { name: '登记协议治理任务 补齐协议承接：治理收口' }))
    await waitFor(() => {
      expect(screen.getByText('已登记协议治理任务：协议任务')).toBeInTheDocument()
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'protocol-task-1' })
    })

    fireEvent.click(screen.getByRole('button', { name: '复制协议补位任务 补齐协议承接：治理收口' }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(screen.getByText('已复制协议补位任务：补齐协议承接：治理收口')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开协议补位任务 补齐协议承接：治理收口' }))
    expect(onOpenTarget).toHaveBeenLastCalledWith({ tab: 'TaskCenter', taskQuery: 'audit' })
  })

  it('filters protocol layers, runs, commands, and pages from one protocol query', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({
      summary: {
        workflow_definitions: 2,
        workflow_actions: 4,
        workflow_backends: 1,
        recent_runs: 1,
        ready_layers: 1,
        watch_layers: 1,
        page_score: 80,
      },
      layers: [
        { id: 'ecos-mof', title: 'L0 · ecos / MOF', status: 'ready', role: '定义元模型。', facts: ['snapshot ready'], next_action: '继续复核。' },
        { id: 'model-driven', title: 'Model Driven Layer', status: 'watch', role: '承接模型驱动。', facts: ['bridge stale'], next_action: '补齐协议审计证据。' },
      ],
      recent_workflows: [
        { id: 'wf-audit', task: '协议审计运行', status: 'running', updated_at: '2026-07-10T06:00:00Z' },
      ],
      commands: [
        { id: 'protocol-audit', label: '协议巡检命令', value: 'cockpit protocol audit', detail: '补齐协议运行证据。' },
      ],
      related_pages: [
        { id: 'Assets', title: '技术资产库', reason: '协议层依赖 workflow 资产。' },
      ],
      roadmap_item: null,
      playbook: null,
    }))

    render(<ProtocolWorkbenchView />)

    const filterRegion = await screen.findByRole('region', { name: '协议对象筛选' })
    fireEvent.change(within(filterRegion).getByRole('searchbox', { name: '搜索协议对象' }), { target: { value: 'audit' } })
    expect(screen.getAllByText('协议审计运行').length).toBeGreaterThan(0)
    expect(screen.getAllByText('协议巡检命令').length).toBeGreaterThan(0)
    expect(within(filterRegion).getByText(/层 0\/2.*编排 1\/1/)).toBeInTheDocument()

    fireEvent.click(within(filterRegion).getByRole('button', { name: '清除协议对象筛选' }))
    fireEvent.change(within(filterRegion).getByRole('combobox', { name: '按协议状态筛选' }), { target: { value: 'watch' } })
    expect(screen.getAllByText('Model Driven Layer').length).toBeGreaterThan(0)
    expect(screen.queryByText('L0 · ecos / MOF')).not.toBeInTheDocument()
  })
})
