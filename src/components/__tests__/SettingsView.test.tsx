import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import SettingsView from '../SettingsView'

vi.mock('../PlatformControlWorkbench', () => ({
  default: () => <div>Platform Workbench Mock</div>,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

const domainAppsPayload = {
  summary: {
    total: 2,
    security_attention_apps: 1,
    high_risk: 1,
  },
  items: [
    {
      id: 'family-dashboard-app',
      name: '家庭驾驶舱',
      risk_level: 'high',
      auth: { type: 'single_password_cookie' },
      freshness: { status: 'built' },
      runtime: {
        launch: { url: 'http://localhost:3000' },
        api: { url: 'http://localhost:3000/api' },
      },
      security_summary: { posture: 'attention' },
      security_checks: [
        {
          id: 'csrf-secret-env',
          status: 'warn',
          title: 'CSRF token 不应静态硬编码',
          detail: 'CSRF token should come from env.',
          evidence: '检测到静态 FAMILY_CSRF_TOKEN。',
          next_action: '把 FAMILY_CSRF_TOKEN 切到环境变量。',
        },
      ],
    },
    {
      id: 'family-hub',
      name: 'family-hub 服务',
      risk_level: 'medium',
      auth: { type: 'service_token' },
      freshness: { status: 'built' },
      runtime: {
        launch: { url: 'http://localhost:3010' },
        api: { url: 'http://localhost:3010/api' },
      },
      security_summary: { posture: 'passed' },
      security_checks: [],
    },
  ],
}

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
      if (url === '/api/domain-apps') {
        return Promise.resolve(okJson(domainAppsPayload))
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
      expect(screen.getByRole('region', { name: '领域接通与安全门' })).toBeInTheDocument()
      expect(screen.getByText('健康路由')).toBeInTheDocument()
      expect(screen.getByText('6/8')).toBeInTheDocument()
      expect(screen.getByText('家庭驾驶舱 · CSRF token 不应静态硬编码')).toBeInTheDocument()
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
      if (url === '/api/domain-apps') {
        return Promise.resolve(okJson(domainAppsPayload))
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
      if (url === '/api/domain-apps') {
        return Promise.resolve(okJson(domainAppsPayload))
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

  it('routes domain security follow-ups to app center and task center', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/metrics/history') {
        return Promise.resolve(okJson({
          timestamp: '2026-07-12 09:40:00',
          services: 8,
          healthy: 6,
          latency: { p50: '40ms', p95: '120ms', p99: '280ms' },
        }))
      }
      if (url === '/api/domain-apps') {
        return Promise.resolve(okJson(domainAppsPayload))
      }
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView onOpenTarget={onOpenTarget} focusTaskQuery="CSRF token" />)

    const focusRegion = await screen.findByRole('region', { name: '当前控制面承接焦点' })
    expect(within(focusRegion).getByText('家庭驾驶舱 · CSRF token 不应静态硬编码')).toBeInTheDocument()

    const domainRegion = screen.getByRole('region', { name: '领域接通与安全门' })
    fireEvent.click(within(domainRegion).getByRole('button', { name: '打开领域安全对象 家庭驾驶舱 · CSRF token 不应静态硬编码' }))
    fireEvent.click(within(domainRegion).getByRole('button', { name: '打开领域安全任务 家庭驾驶舱 · CSRF token 不应静态硬编码' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'DomainApps', taskQuery: 'family-dashboard-app' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'csrf-secret-env' })
  })
})
