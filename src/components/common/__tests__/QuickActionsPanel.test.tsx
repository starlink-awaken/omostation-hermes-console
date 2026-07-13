import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import QuickActionsPanel from '../QuickActionsPanel'

describe('QuickActionsPanel', () => {
  afterEach(() => {
    window.location.hash = ''
    vi.restoreAllMocks()
  })

  it('opens the task center from the task quick action', () => {
    render(<QuickActionsPanel isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /打开任务中心/ }))

    expect(window.location.hash).toBe('#tasks')
  })

  it('emits a global search focus request', () => {
    const handler = vi.fn()
    window.addEventListener('cockpit:focus-search', handler)
    render(<QuickActionsPanel isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /全局搜索/ }))

    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('cockpit:focus-search', handler)
  })

  it('emits a snapshot export request', () => {
    const handler = vi.fn()
    window.addEventListener('cockpit:export-snapshot', handler)
    render(<QuickActionsPanel isOpen onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /导出运行快照/ }))

    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener('cockpit:export-snapshot', handler)
  })
})
