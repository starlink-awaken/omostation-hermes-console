import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import KnowledgeHubView from '../KnowledgeHubView'

vi.mock('../KnowledgeExecutionWorkbench', () => ({
  default: () => <div data-testid="knowledge-workbench" />,
}))

vi.mock('../GBrain/GBrainDashboard', () => ({
  DashboardPage: ({ initialSubTab }: { initialSubTab?: string }) => <div>GBrain Mock {initialSubTab || 'monitor'}</div>,
}))

describe('KnowledgeHubView', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('surfaces focus handoff for knowledge context', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <KnowledgeHubView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="memory"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前知识承接焦点' })
    expect(within(focusRegion).getByText('知识上下文承接')).toBeInTheDocument()
    expect(screen.getByText('GBrain Mock memory')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开知识焦点对象 知识上下文承接' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开知识焦点任务 知识上下文承接' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Knowledge', taskQuery: 'memory' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'memory' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces knowledge sub-panels and routes follow-up actions from the active layer', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <KnowledgeHubView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusPageId="Knowledge"
      />,
    )

    expect(await screen.findByText('知识维度地图')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '当前知识子面板' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '知识补位任务' })).toBeInTheDocument()
    expect(screen.getByText('GBrain Mock monitor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '切换知识子面板 访问日志' }))
    expect(screen.getByText('GBrain Mock logs')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开知识相关对象 访问日志' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'LogViewer', taskQuery: 'knowledge' })

    fireEvent.click(screen.getByRole('button', { name: '复制知识补位任务 补齐知识承接：访问日志' }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('补齐知识承接：访问日志'))
      expect(screen.getByText('已复制知识补位任务：补齐知识承接：访问日志')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开知识补位任务 补齐知识承接：访问日志' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'knowledge-logs' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
