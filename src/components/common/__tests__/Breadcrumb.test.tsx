import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from '../Breadcrumb'
import React from 'react'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Breadcrumb', () => {
  it('renders home link and items', () => {
    const items = [
      { label: 'Governance', onClick: vi.fn() },
      { label: 'Tasks', onClick: vi.fn() },
    ]
    renderWithRouter(<Breadcrumb items={items} />)

    expect(screen.getByLabelText('首页')).toBeInTheDocument()
    expect(screen.getByText('Governance')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
  })

  it('marks last item as current', () => {
    const items = [{ label: 'Parent' }, { label: 'Current' }]
    renderWithRouter(<Breadcrumb items={items} />)

    const current = screen.getByText('Current')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('calls onClick when a link item is clicked', () => {
    const handleClick = vi.fn()
    const items = [
      { label: 'Clickable', onClick: handleClick },
      { label: 'Last' },
    ]
    renderWithRouter(<Breadcrumb items={items} />)

    fireEvent.click(screen.getByText('Clickable'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
