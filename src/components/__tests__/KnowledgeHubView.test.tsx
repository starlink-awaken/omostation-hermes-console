import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import KnowledgeHubView from '../KnowledgeHubView'

vi.mock('../KnowledgeExecutionWorkbench', () => ({
  default: () => <div data-testid="knowledge-workbench" />,
}))

vi.mock('../GBrain/GBrainDashboard', () => ({
  DashboardPage: () => <div>GBrain Mock</div>,
}))

describe('KnowledgeHubView', () => {
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

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开知识焦点对象 知识上下文承接' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开知识焦点任务 知识上下文承接' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Knowledge', taskQuery: 'memory' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'memory' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
