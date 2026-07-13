import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import DebtView from '../DebtView'

vi.mock('../GovernanceDomainWorkbench', () => ({
  default: () => <div>Governance Workbench Mock</div>,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('DebtView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders debt actions and supports navigate/copy follow-ups', async () => {
    const onNavigate = vi.fn()

    vi.mocked(fetch).mockResolvedValue(okJson({
      total: 3,
      open: 2,
      closed: 1,
      items: [
        {
          id: 'debt-1',
          title: '补家庭 app 鉴权',
          severity: 'p0',
          lifecycle_state: 'open',
          opened_at: '2026-07-07T09:00:00Z',
          owner: 'security',
          dimension: 'security',
        },
      ],
    }))

    render(<DebtView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('债务处理区')).toBeInTheDocument()
      expect(screen.getByText('债务承接工作台')).toBeInTheDocument()
      expect(screen.getByText('回治理决策')).toBeInTheDocument()
      expect(screen.getByText('查领域挂载')).toBeInTheDocument()
      expect(screen.getAllByText('补家庭 app 鉴权').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /去 C2G/ }))
    expect(onNavigate).toHaveBeenCalledWith('C2G')

    fireEvent.click(screen.getByRole('button', { name: '打开债务承接到任务中心' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /复制筛选词/ }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('severity:p0 lifecycle_state:open')
    })
  })

  it('surfaces focus handoff for a matched debt item', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockResolvedValue(okJson({
      total: 3,
      open: 2,
      closed: 1,
      items: [
        {
          id: 'debt-1',
          title: '补家庭 app 鉴权',
          severity: 'p0',
          lifecycle_state: 'open',
          opened_at: '2026-07-07T09:00:00Z',
          owner: 'security',
          dimension: 'security',
        },
      ],
    }))

    render(<DebtView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="debt-1" />)

    const focusRegion = await screen.findByRole('region', { name: '当前债务承接焦点' })
    expect(within(focusRegion).getByText('补家庭 app 鉴权')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开债务焦点对象 补家庭 app 鉴权' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开债务焦点任务 补家庭 app 鉴权' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Debt', taskQuery: 'debt-1' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'debt-1' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
