import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import C2GStrategyView from '../C2GStrategyView'

vi.mock('../GovernanceDomainWorkbench', () => ({
  default: () => <div data-testid="governance-workbench" />,
}))

vi.mock('../ActionSurfacePanel', () => ({
  default: () => <div data-testid="action-surface" />,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('C2GStrategyView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/omos/status') {
        return Promise.resolve(okJson({
          system: { current_phase: 'Wave 2', health_score: 93 },
          governance: { health_score: 91 },
        }))
      }
      if (url === '/api/cards') {
        return Promise.resolve(okJson([{
          id: 'card-42',
          type: 'governance',
          status: 'in_progress',
          title: '补齐项目状态面',
          priority: 'P1',
          domain: 'workspace',
          created: '2026-07-10',
        }]))
      }
      if (url === '/api/cards/check') {
        return Promise.resolve(okJson({ compliant: true, violations: [], constraints_checked: 3, guidance: 'ok' }))
      }
      if (url === '/api/v1/proposals') {
        return Promise.resolve(okJson({ status: 'ok', proposals: [] }))
      }
      if (url === '/api/omos/violations') {
        return Promise.resolve(okJson({ status: 'ok', violations: [] }))
      }
      return Promise.resolve(okJson({}))
    })
  })

  it('opens the matching task center for a governance card instead of claiming approval', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<C2GStrategyView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByText('治理承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('补齐项目状态面').length).toBeGreaterThan(0)
    })

    expect(screen.getByRole('button', { name: '查看相关任务' })).toBeInTheDocument()
    expect(screen.queryByText('新建卡片')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '查看相关任务' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'card-42' })

    fireEvent.click(screen.getByRole('button', { name: '打开治理承接到债务页' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Debt', taskQuery: 'card-42' })
  })

  it('filters cards, proposals, and direct-io violations from one governance query', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/omos/status') return Promise.resolve(okJson({ system: {}, governance: {} }))
      if (url === '/api/cards') return Promise.resolve(okJson([
        { id: 'card-42', type: 'governance', status: 'in_progress', title: '补齐项目状态面', priority: 'P1', domain: 'workspace', created: '2026-07-10' },
        { id: 'card-99', type: 'governance', status: 'pending', title: '梳理认证债务', priority: 'P0', domain: 'auth', created: '2026-07-11' },
      ]))
      if (url === '/api/cards/check') return Promise.resolve(okJson({ compliant: true, violations: [] }))
      if (url === '/api/v1/proposals') return Promise.resolve(okJson({ status: 'ok', proposals: [
        { id: 'proposal-42', type: 'model_swap', debt_id: 'debt-auth', status: 'pending' },
        { id: 'proposal-99', type: 'capacity', debt_id: 'debt-cache', status: 'approved' },
      ] }))
      if (url === '/api/omos/violations') return Promise.resolve(okJson({ status: 'ok', violations: [
        { file: 'auth/service.py', line: 42, detail: 'direct write to auth state' },
        { file: 'cache/store.py', line: 99, detail: 'direct write to cache state' },
      ] }))
      return Promise.resolve(okJson({}))
    })

    render(<C2GStrategyView />)

    expect((await screen.findAllByText('梳理认证债务')).length).toBeGreaterThan(0)
    expect(screen.getByText('卡片 2/2')).toBeInTheDocument()
    expect(screen.getByText('提案 2/2')).toBeInTheDocument()
    expect(screen.getByText('违规 2/2')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '搜索治理对象' }), { target: { value: 'auth' } })
    expect(screen.getByText('卡片 1/2')).toBeInTheDocument()
    expect(screen.getByText('提案 1/2')).toBeInTheDocument()
    expect(screen.getByText('违规 1/2')).toBeInTheDocument()
    expect(screen.getAllByText('auth/service.py').length).toBeGreaterThan(0)
    expect(screen.queryByText('cache/store.py')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: '按状态筛选治理对象' }), { target: { value: 'approved' } })
    expect(screen.getByText('卡片 0/2')).toBeInTheDocument()
    expect(screen.getByText('提案 0/2')).toBeInTheDocument()
    expect(screen.getByText('当前筛选下没有匹配的治理卡片。')).toBeInTheDocument()
    expect(screen.getByText('当前筛选下没有匹配的治理提案。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '清除治理对象筛选' }))
    expect(screen.getByText('卡片 2/2')).toBeInTheDocument()
    expect(screen.getAllByText('cache/store.py').length).toBeGreaterThan(0)
  })

  it('surfaces focus handoff for a matched governance card', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<C2GStrategyView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="补齐项目状态面" />)

    const focusRegion = await screen.findByRole('region', { name: '当前治理承接焦点' })
    expect(within(focusRegion).getByText('补齐项目状态面')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开治理焦点对象 补齐项目状态面' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开治理焦点任务 补齐项目状态面' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'C2G', taskQuery: 'card-42' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'card-42' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('queues SSOT drift repair into TaskCenter instead of auto-fixing inline', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/cards/check') {
        return Promise.resolve(okJson({ compliant: false, violations: ['drift'], guidance: '需要人工复核' }))
      }
      if (url === '/api/cards') return Promise.resolve(okJson([]))
      if (url === '/api/v1/proposals') return Promise.resolve(okJson({ status: 'ok', proposals: [] }))
      if (url === '/api/omos/status') return Promise.resolve(okJson({ system: {}, governance: {} }))
      if (url === '/api/omos/violations') return Promise.resolve(okJson({ status: 'ok', violations: [] }))
      if (url === '/api/cockpit/governance/queue') {
        expect(init?.method).toBe('POST')
        expect(init?.body).toBe(JSON.stringify({ action: 'fix-drift' }))
        return Promise.resolve(okJson({ id: 'cockpit-governance-fix-drift', executes: false }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<C2GStrategyView onOpenTarget={onOpenTarget} />)
    const button = await screen.findByRole('button', { name: '承接治理修复' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-governance-fix-drift' })
      expect(screen.getByText(/已承接治理修复任务/)).toBeInTheDocument()
    })
  })

  it('queues a board proposal into TaskCenter before approval', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/omos/status') return Promise.resolve(okJson({ system: {}, governance: {} }))
      if (url === '/api/cards') return Promise.resolve(okJson([]))
      if (url === '/api/cards/check') return Promise.resolve(okJson({ compliant: true, violations: [] }))
      if (url === '/api/omos/violations') return Promise.resolve(okJson({ status: 'ok', violations: [] }))
      if (url === '/api/v1/proposals') return Promise.resolve(okJson({
        status: 'ok',
        proposals: [{
          id: 'proposal-42',
          type: 'model_swap',
          debt_id: 'debt-auth',
          target_model: 'safe-model',
          status: 'pending',
        }],
      }))
      if (url === '/api/cockpit/proposals/proposal-42/queue') {
        expect(init?.method).toBe('POST')
        return Promise.resolve(okJson({ id: 'cockpit-proposal-proposal-42', created: true, executes: false }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<C2GStrategyView onOpenTarget={onOpenTarget} />)

    const button = await screen.findByRole('button', { name: '承接提案任务 proposal-42' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-proposal-proposal-42',
      })
      expect(screen.getByText('提案已承接为任务：cockpit-proposal-proposal-42')).toBeInTheDocument()
    })
  })
})
