import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import QuickActionsPanel from '../common/QuickActionsPanel'

describe('QuickActionsPanel', () => {
  it('supports keyboard filtering and execution with accessible selection state', () => {
    const onClose = vi.fn()
    const firstAction = vi.fn()
    const secondAction = vi.fn()
    render(
      <QuickActionsPanel
        isOpen
        onClose={onClose}
        actions={[
          { id: 'first', label: '打开首页', icon: null, action: firstAction, category: '入口' },
          { id: 'second', label: '查看日志', icon: null, action: secondAction, category: '开发' },
        ]}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: '快捷操作' })
    const input = within(dialog).getByRole('textbox', { name: '快捷操作搜索' })
    const options = within(dialog).getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(secondAction).toHaveBeenCalledOnce()
    expect(firstAction).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('resets the selection when filtering actions', () => {
    render(
      <QuickActionsPanel
        isOpen
        onClose={vi.fn()}
        actions={[
          { id: 'first', label: '打开首页', icon: null, action: vi.fn(), category: '入口' },
          { id: 'second', label: '查看日志', icon: null, action: vi.fn(), category: '开发' },
        ]}
      />,
    )

    const input = screen.getByRole('textbox', { name: '快捷操作搜索' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.change(input, { target: { value: '日志' } })

    expect(screen.getByRole('option', { name: '查看日志' })).toHaveAttribute('aria-selected', 'true')
  })

  it('clears the previous search when reopened', () => {
    const { rerender } = render(
      <QuickActionsPanel
        isOpen
        onClose={vi.fn()}
        actions={[{ id: 'first', label: '打开首页', icon: null, action: vi.fn(), category: '入口' }]}
      />,
    )

    const input = screen.getByRole('textbox', { name: '快捷操作搜索' })
    fireEvent.change(input, { target: { value: '首页' } })
    rerender(
      <QuickActionsPanel
        isOpen={false}
        onClose={vi.fn()}
        actions={[{ id: 'first', label: '打开首页', icon: null, action: vi.fn(), category: '入口' }]}
      />,
    )
    rerender(
      <QuickActionsPanel
        isOpen
        onClose={vi.fn()}
        actions={[{ id: 'first', label: '打开首页', icon: null, action: vi.fn(), category: '入口' }]}
      />,
    )

    expect(screen.getByRole('textbox', { name: '快捷操作搜索' })).toHaveValue('')
  })
})
