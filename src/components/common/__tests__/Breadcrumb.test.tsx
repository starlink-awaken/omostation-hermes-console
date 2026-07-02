import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Breadcrumb from '../Breadcrumb'

describe('Breadcrumb', () => {
  it('renders home link and items', () => {
    const items = [
      { label: 'Governance', onClick: vi.fn() },
      { label: 'Tasks', onClick: vi.fn() },
    ]
    render(<Breadcrumb items={items} />)

    expect(screen.getByLabelText('首页')).toBeInTheDocument()
    expect(screen.getByText('Governance')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('marks last item as current', () => {
    const items = [{ label: 'Parent' }, { label: 'Current' }]
    render(<Breadcrumb items={items} />)

    const current = screen.getByText('Current')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('calls onClick when a link item is clicked', () => {
    const handleClick = vi.fn()
    const items = [
      { label: 'Clickable', onClick: handleClick },
      { label: 'Last' },
    ]
    render(<Breadcrumb items={items} />)

    fireEvent.click(screen.getByText('Clickable'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
