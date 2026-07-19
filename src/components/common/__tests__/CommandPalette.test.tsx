import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommandPalette } from '../CommandPalette'
import { useKeyboardShortcuts } from '../useCommandPalette'

describe('CommandPalette', () => {
  it('does not render when closed', () => {
    render(
      <CommandPalette
        isOpen={false}
        onClose={vi.fn()}
        commands={[{ id: '1', label: 'Home', action: vi.fn() }]}
      />
    )
    expect(screen.queryByPlaceholderText('输入命令...')).not.toBeInTheDocument()
  })

  it('renders commands when open', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        commands={[
          { id: '1', label: 'Home', description: 'Go home', action: vi.fn() },
          { id: '2', label: 'Tasks', action: vi.fn() },
        ]}
      />
    )

    expect(screen.getByPlaceholderText('输入命令...')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Go home')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('filters commands by query', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={vi.fn()}
        commands={[
          { id: '1', label: 'Home', action: vi.fn() },
          { id: '2', label: 'Tasks', action: vi.fn() },
        ]}
      />
    )

    const input = screen.getByPlaceholderText('输入命令...')
    fireEvent.change(input, { target: { value: 'task' } })

    expect(screen.queryByText('Home')).not.toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('executes selected command on Enter', () => {
    const action = vi.fn()
    const onClose = vi.fn()
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        commands={[
          { id: '1', label: 'Home', action },
          { id: '2', label: 'Tasks', action: vi.fn() },
        ]}
      />
    )

    const input = screen.getByPlaceholderText('输入命令...')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(action).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        commands={[{ id: '1', label: 'Home', action: vi.fn() }]}
      />
    )

    const input = screen.getByPlaceholderText('输入命令...')
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('useKeyboardShortcuts', () => {
  it('registers keyboard shortcuts', () => {
    const action = vi.fn()
    function TestComponent() {
      useKeyboardShortcuts({
        shortcuts: [{ key: 'k', ctrl: true, description: 'Open', action }],
      })
      return <div>test</div>
    }

    render(<TestComponent />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    expect(action).toHaveBeenCalledTimes(1)
  })

  it('ignores shortcuts when target is input', () => {
    const action = vi.fn()
    function TestComponent() {
      useKeyboardShortcuts({
        shortcuts: [{ key: 'k', ctrl: true, description: 'Open', action }],
      })
      return <input data-testid="input" />
    }

    render(<TestComponent />)
    const input = screen.getByTestId('input')
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true })

    expect(action).not.toHaveBeenCalled()
  })
})
