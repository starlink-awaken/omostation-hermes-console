import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import ProtocolWorkbenchView from '../ProtocolWorkbenchView'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('ProtocolWorkbenchView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
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
})
