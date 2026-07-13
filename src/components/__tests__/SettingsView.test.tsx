import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import SettingsView from '../SettingsView'

vi.mock('../PlatformControlWorkbench', () => ({
  default: () => <div>Platform Workbench Mock</div>,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('SettingsView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders control-plane workbench and navigates to follow-up pages', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/metrics/history') {
        return Promise.resolve(okJson({
          timestamp: '2026-07-12 09:40:00',
          services: 8,
          healthy: 6,
          latency: { p50: '40ms', p95: '120ms', p99: '280ms' },
        }))
      }
      if (url === '/api/instance' && init?.method === 'POST') {
        return Promise.resolve(okJson({ ok: true, registered: 'gbrain-local' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('控制面动作区')).toBeInTheDocument()
      expect(screen.getByText('控制面承接工作台')).toBeInTheDocument()
      expect(screen.getByText('健康路由')).toBeInTheDocument()
      expect(screen.getByText('6/8')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开控制面承接到系统地图' }))
    expect(onNavigate).toHaveBeenCalledWith('SystemMap')
  })

  it('submits instance registration and shows returned status', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/metrics/history') {
        return Promise.resolve(okJson({
          timestamp: '2026-07-12 09:40:00',
          services: 4,
          healthy: 4,
          latency: { p50: '18ms' },
        }))
      }
      if (url === '/api/instance' && init?.method === 'POST') {
        return Promise.resolve(okJson({ ok: true, registered: 'gbrain-local' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView />)

    await waitFor(() => {
      expect(screen.getByText('注册分布式新实例 (Instance)')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('目标服务名称 (Service Name)'), { target: { value: 'gbrain-local' } })
    fireEvent.change(screen.getByLabelText('MCP 接入点地址 (Endpoint URL)'), { target: { value: 'http://127.0.0.1:7431' } })
    fireEvent.click(screen.getByRole('button', { name: '注册实例' }))

    await waitFor(() => {
      expect(screen.getByText(/"registered": "gbrain-local"/)).toBeInTheDocument()
      expect(screen.getByText('已返回')).toBeInTheDocument()
    })
  })

  it('surfaces focus handoff for a matched control-plane metric', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/metrics/history') {
        return Promise.resolve(okJson({
          timestamp: '2026-07-12 09:40:00',
          services: 8,
          healthy: 6,
          latency: { p50: '40ms', p95: '120ms', p99: '280ms' },
        }))
      }
      if (url === '/api/instance' && init?.method === 'POST') {
        return Promise.resolve(okJson({ ok: true, registered: 'gbrain-local' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="健康路由" />)

    const focusRegion = await screen.findByRole('region', { name: '当前控制面承接焦点' })
    expect(within(focusRegion).getByText('健康路由')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开控制面焦点对象 健康路由' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开控制面焦点任务 健康路由' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Settings', taskQuery: '健康路由' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '健康路由' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
