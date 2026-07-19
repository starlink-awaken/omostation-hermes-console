import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SystemAssuranceWorkbench from '../SystemAssuranceWorkbench'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('SystemAssuranceWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('surfaces layer, protocol, verification and convergence evidence', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/status') return Promise.resolve(okJson({ summary: { total_layers: 4, healthy: 3, degraded: 1, down: 0 }, layers: [] }))
      if (url === '/api/v1/m0') return Promise.resolve(okJson({ version: 'm0-test', daemon: { healthy: true }, m1_node_count: 2 }))
      if (url === '/api/protocols') return Promise.resolve(okJson({ protocols: [{ id: 'protocol-1' }] }))
      if (url === '/api/e2e') return Promise.resolve(okJson({ result: '4/4 passed' }))
      if (url === '/api/omo-report') return Promise.resolve(okJson({ summary: '3 items, 1 open, 2 closed', total: 3, open: 1, closed: 2 }))
      if (url === '/api/convergence/status') return Promise.resolve(okJson({ convergence_pct: 80, converged_to_cockpit: 4, total_entry_points: 5, remaining: ['mof'] }))
      if (url === '/api/cron/summary') return Promise.resolve(okJson({ total_tasks: 12, today_count: 3, ok_count: 10, error_count: 1 }))
      if (url === '/api/governance/summary') return Promise.resolve(okJson({ health_score: 84, unresolved: 2, resolution_rate: 75, latest_audit: '2026-07-15' }))
      if (url === '/api/bos/trends') return Promise.resolve(okJson({ total_all_time: 20, last_24h: { calls: 5, success_rate: 80, avg_latency: 240 } }))
      if (url === '/api/context') return Promise.resolve(okJson({ phase: 42, theme: '治理同步', active_goals: [{ id: 'goal-1', status: 'pending' }], cards_summary: { p0_open: 3 }, next_guidance: '查看 P0 卡片。' }))
      if (url === '/api/ecos/status') return Promise.resolve(okJson({ service: 'ecos-dashboard', status: 'converged', converged_to: 'cockpit /api/ecos/status', m0_snapshot: 'available' }))
      if (url === '/api/ecos/health') return Promise.resolve(okJson({ service: 'ecos-dashboard-converged', status: 'ok' }))
      if (url === '/api/omos/health') return Promise.resolve(okJson({ service: 'omo-dashboard-converged', status: 'ok' }))
      return Promise.resolve(okJson({}))
    })

    render(<SystemAssuranceWorkbench onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '系统保证工作台' })).toBeInTheDocument()
      expect(screen.getByText('3/4')).toBeInTheDocument()
      expect(screen.getByText('m0-test')).toBeInTheDocument()
      expect(screen.getAllByText('4/4 passed')).toHaveLength(2)
      expect(screen.getByText('80%')).toBeInTheDocument()
      expect(screen.getByText('返回 1 条协议记录')).toBeInTheDocument()
      expect(screen.getByText('总计 12 · 今日 3')).toBeInTheDocument()
      expect(screen.getByText('2 · 解决率 75%')).toBeInTheDocument()
      expect(screen.getByText('调用 5 · 成功率 80%')).toBeInTheDocument()
      expect(screen.getByText('治理同步')).toBeInTheDocument()
      expect(screen.getByText('cockpit /api/ecos/status')).toBeInTheDocument()
      expect(screen.getByText('ecos-dashboard-converged')).toBeInTheDocument()
      expect(screen.getByText('omo-dashboard-converged')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '看协议工作台' }))
    expect(onNavigate).toHaveBeenCalledWith('Protocol')
  })

  it('registers a cross-cutting assurance gap as a formal task', async () => {
    const onNavigate = vi.fn()
    let taskRequest: RequestInit | undefined
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/tasks' && init?.method === 'POST') {
        taskRequest = init
        return Promise.resolve(okJson({ id: 77, title: '推进入口收敛：未收敛入口' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<SystemAssuranceWorkbench onNavigate={onNavigate} />)

    const button = await screen.findByRole('button', { name: '登记系统保证任务 推进入口收敛：未收敛入口' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('已登记系统保证任务：推进入口收敛：未收敛入口')
      expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
    })
    expect(taskRequest?.body).toContain('系统保证快照')
    expect(taskRequest?.body).toContain('cockpit.system-assurance-workbench')
  })

  it('shows incomplete evidence and retries every source', async () => {
    let statusCalls = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/v1/status') {
        statusCalls += 1
        return Promise.resolve({ ok: false, json: async () => ({ error: 'layer probe unavailable' }) } as Response)
      }
      return Promise.resolve(okJson({}))
    })

    render(<SystemAssuranceWorkbench />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('层健康')
      expect(screen.getByText('系统保证证据不完整')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '重新检查' }))
    await waitFor(() => expect(statusCalls).toBe(2))
  })

  it('does not turn unavailable summaries into zero-valued evidence', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (['/api/omo-report', '/api/cron/summary', '/api/governance/summary', '/api/bos/trends', '/api/ecos/health', '/api/omos/health'].includes(url)) {
        return Promise.resolve(okJson({ status: 'unavailable' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<SystemAssuranceWorkbench />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('OMO 报告')
      expect(within(screen.getByText('OMO 报告').closest('article') as HTMLElement).getByText('不可用')).toBeInTheDocument()
      expect(within(screen.getByText('自动化流水线').closest('article') as HTMLElement).getByText('不可用')).toBeInTheDocument()
      expect(within(screen.getByText('治理审计').closest('article') as HTMLElement).getByText('不可用')).toBeInTheDocument()
      expect(within(screen.getByText('BOS 趋势').closest('article') as HTMLElement).getByText('不可用')).toBeInTheDocument()
      expect(screen.queryByText('0 开放')).not.toBeInTheDocument()
      expect(screen.queryByText('0 今日')).not.toBeInTheDocument()
    })
  })
})
