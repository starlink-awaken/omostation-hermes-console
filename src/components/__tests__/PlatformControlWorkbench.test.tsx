import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PlatformControlWorkbench from '../PlatformControlWorkbench'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('PlatformControlWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders the platform control chain and navigates to the suggested next page', async () => {
    const onNavigate = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/v1/arch-health') {
        return Promise.resolve(okJson({
          system: { health_score: 87 },
          git: { status: 'dirty', uncommitted: 3 },
          governance: { health: 'watch' },
        }))
      }
      if (url === '/api/bos/metrics') {
        return Promise.resolve(okJson({
          summary: { total_calls: 100, avg_latency: 1450, success_count: 92 },
          domains: [
            { domain: 'governance', total: 42, success: 38, error: 4, avg_latency: 1300 },
          ],
        }))
      }
      if (url === '/api/pipelines') {
        return Promise.resolve(okJson({ pipelines: ['governance-nightly', 'family-sync'] }))
      }
      if (url === '/api/metrics/history') {
        return Promise.resolve(okJson({
          timestamp: '2026-07-07T09:00:00Z',
          services: 6,
          healthy: 4,
          latency: { p50: 120, p95: 560 },
        }))
      }
      if (url === '/api/omos/quests') {
        return Promise.resolve(okJson({
          status: 'ok',
          quests: [
            { id: 1, title: '整理客厅', reward: 15, completed: 0, assignee: 'mama' },
          ],
          profiles: [
            { role: 'mama', name: '妈妈', level: 5, wisdomPoints: 80, responsibilityPoints: 120 },
          ],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<PlatformControlWorkbench currentPage="Observability" onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('观测控制工作台')).toBeInTheDocument()
      expect(screen.getByText('87')).toBeInTheDocument()
      expect(screen.getByText('92%')).toBeInTheDocument()
      expect(screen.getByText('2 条管线')).toBeInTheDocument()
      expect(screen.getByText('整理客厅')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/观测面还有波动/))
    expect(onNavigate).toHaveBeenCalledWith('Observability')

    fireEvent.click(screen.getByRole('button', { name: /去冒险板/ }))
    expect(onNavigate).toHaveBeenCalledWith('QuestBoard')
  })

  it('shows empty-state guidance when platform data is sparse', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<PlatformControlWorkbench currentPage="Sandbox" />)

    await waitFor(() => {
      expect(screen.getByText('观测面当前比较安静')).toBeInTheDocument()
      expect(screen.getByText('还没有可调度管线')).toBeInTheDocument()
      expect(screen.getByText('当前没有待完成冒险')).toBeInTheDocument()
    })
  })

  it('exposes unavailable control evidence and retries the sources', async () => {
    let bosCalls = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/bos/metrics') {
        bosCalls += 1
        return Promise.resolve({
          ok: false,
          json: async () => ({
            status: 'unavailable',
            data_quality: 'unavailable',
            error: 'BOS 指标证据尚未产生',
            next_action: '先执行一条 BOS 路由。',
          }),
        } as Response)
      }
      return Promise.resolve(okJson({}))
    })

    render(<PlatformControlWorkbench currentPage="Observability" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('控制面数据需要补证')
      expect(screen.getByText('观测证据不可用')).toBeInTheDocument()
      expect(screen.getByText('BOS 证据不可用')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    await waitFor(() => expect(bosCalls).toBe(2))
  })
})
