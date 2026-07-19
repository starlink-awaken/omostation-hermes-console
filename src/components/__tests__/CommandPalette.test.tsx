import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CommandPalette } from '../common/CommandPalette'
import { useKeyboardShortcuts } from '../common/useCommandPalette'

describe('CommandPalette', () => {
  it('exposes dialog semantics and keyboard selection state', () => {
    const onClose = vi.fn()
    const firstAction = vi.fn()
    const secondAction = vi.fn()
    render(
      <>
        <button type="button">打开面板</button>
        <CommandPalette
          isOpen
          onClose={onClose}
          commands={[
            { id: 'home', label: '首页', action: firstAction },
            { id: 'tasks', label: '任务中心', action: secondAction },
          ]}
        />
      </>,
    )

    const dialog = screen.getByRole('dialog', { name: '命令面板' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const input = screen.getByRole('textbox', { name: '命令面板搜索' })
    expect(input).toHaveFocus()

    const options = within(screen.getByRole('listbox', { name: '可用命令' })).getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[1]).toHaveAttribute('aria-selected', 'false')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(secondAction).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps an empty filtered palette keyboard-safe', () => {
    render(
      <CommandPalette
        isOpen
        onClose={vi.fn()}
        commands={[{ id: 'home', label: '首页', action: vi.fn() }]}
      />,
    )

    const input = screen.getByRole('textbox', { name: '命令面板搜索' })
    fireEvent.change(input, { target: { value: '不存在' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByText('没有找到匹配的命令')).toBeInTheDocument()
  })
})
