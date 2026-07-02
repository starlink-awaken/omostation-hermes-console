import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import TaskCenterPage from '../TaskCenterPage'

const mockTasks = [
  {
    id: 'task-1',
    title: 'Deploy gateway',
    description: 'Update LLM gateway config',
    status: 'in_progress',
    progress: 45,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    assignee: 'agent-1',
    priority: 'high',
    tags: ['deploy'],
  },
  {
    id: 'task-2',
    title: 'Review debt',
    description: 'Audit technical debt',
    status: 'pending',
    progress: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updated_at: new Date().toISOString(),
    priority: 'medium',
    tags: ['debt'],
  },
  {
    id: 'task-3',
    title: 'Run tests',
    description: 'Execute E2E suite',
    status: 'completed',
    progress: 100,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updated_at: new Date().toISOString(),
    priority: 'low',
    tags: ['qa'],
  },
]

describe('TaskCenterPage', () => {
  it('shows loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<TaskCenterPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders fetched tasks and stats', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockTasks }),
    } as Response)

    render(<TaskCenterPage />)

    await waitFor(() => {
      expect(screen.getByText('Deploy gateway')).toBeInTheDocument()
    })

    expect(screen.getByText('Review debt')).toBeInTheDocument()
    expect(screen.getByText('Run tests')).toBeInTheDocument()
    // Stats: pending=1, in_progress=1, completed=1, failed=0
    const pendingStat = screen.getByRole('heading', { name: '待处理' }).closest('.stat-card')
    expect(pendingStat?.textContent).toContain('1')
  })

  it('filters tasks by status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockTasks }),
    } as Response)

    render(<TaskCenterPage />)
    await waitFor(() => screen.getByText('Deploy gateway'))

    const filterSelect = screen.getByDisplayValue('全部状态')
    fireEvent.change(filterSelect, { target: { value: 'completed' } })

    await waitFor(() => {
      expect(screen.queryByText('Deploy gateway')).not.toBeInTheDocument()
      expect(screen.getByText('Run tests')).toBeInTheDocument()
    })
  })

  it('filters tasks by search query', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockTasks }),
    } as Response)

    render(<TaskCenterPage />)
    await waitFor(() => screen.getByText('Deploy gateway'))

    const searchInput = screen.getByPlaceholderText('搜索任务...')
    fireEvent.change(searchInput, { target: { value: 'debt' } })

    await waitFor(() => {
      expect(screen.queryByText('Deploy gateway')).not.toBeInTheDocument()
      expect(screen.getByText('Review debt')).toBeInTheDocument()
    })
  })

  it('calls pause API when pause button clicked', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: mockTasks }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)

    render(<TaskCenterPage />)
    await waitFor(() => screen.getByText('Deploy gateway'))

    const pauseButtons = screen.getAllByRole('button', { name: '暂停任务' })
    fireEvent.click(pauseButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-1/pause', { method: 'POST' })
    })
  })
})
