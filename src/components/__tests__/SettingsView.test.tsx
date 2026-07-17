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
      if (url === '/api/omo/doctor') {
        return Promise.resolve(okJson({
          status: 'warn',
          available: true,
          written_at: '2026-07-17T09:00:00Z',
          highlights: { total: 5, ok: 3, warn: 1, fail: 1, error: 0, path_acl_warn_streak: 2, path_acl_alert: false },
          history_tail: [{ ts: '2026-07-17T09:00:00Z', path_acl_status: 'warn', warn: 1, fail: 1 }],
        }))
      }
      if (url === '/api/version') {
        return Promise.resolve(okJson({ current_version: 'v2', supported_versions: ['v1', 'v2'], deprecated_versions: ['v1'], endpoints: 12, updated_at: '2026-07-17T09:00:00Z' }))
      }
      if (url === '/api/version/history') {
        return Promise.resolve(okJson([{ version: 'v1', deprecated: true, endpoints: 8, endpoint_list: [{ path: '/api/projects', version: 'v1' }] }, { version: 'v2', deprecated: false, endpoints: 12, endpoint_list: [{ path: '/api/projects', version: 'v2' }] }]))
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
      expect(screen.getByRole('region', { name: 'OMO doctor治理诊断' })).toBeInTheDocument()
      expect(screen.getByText('ACL 警告 streak')).toBeInTheDocument()
      expect(screen.getByText(/最近写入：2026-07-17T09:00:00Z/)).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '运行版本与变更历史' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '当前 API 端点目录' })).toBeInTheDocument()
      expect(screen.getByText('/api/projects')).toBeInTheDocument()
      expect(screen.getByText('当前版本')).toBeInTheDocument()
      expect(screen.getByText('v2 · 支持中')).toBeInTheDocument()
      expect(screen.getByText(/版本目录更新时间：2026-07-17T09:00:00Z/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开控制面承接到系统地图' }))
    expect(onNavigate).toHaveBeenCalledWith('SystemMap')
  })

  it('filters the current API endpoint catalog by path', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/version') return Promise.resolve(okJson({ current_version: 'v2', endpoints: 2 }))
      if (url === '/api/version/history') return Promise.resolve(okJson([{
        version: 'v2',
        endpoint_list: [
          { path: '/api/tasks', version: 'v2' },
          { path: '/api/version', version: 'v2' },
        ],
      }]))
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView />)

    const catalog = await screen.findByRole('region', { name: '当前 API 端点目录' })
    expect(within(catalog).getByText('/api/tasks')).toBeInTheDocument()
    expect(within(catalog).getByText('/api/version')).toBeInTheDocument()

    fireEvent.change(within(catalog).getByRole('searchbox', { name: '筛选当前 API 端点' }), { target: { value: 'tasks' } })

    expect(within(catalog).getByText('匹配 1/2')).toBeInTheDocument()
    expect(within(catalog).getByText('/api/tasks')).toBeInTheDocument()
    expect(within(catalog).queryByText('/api/version')).not.toBeInTheDocument()
  })

  it('submits instance registration and shows returned status', async () => {
    const onOpenTarget = vi.fn()
    let domainAppsCalls = 0
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
        domainAppsCalls += 1
        return Promise.resolve(okJson(domainAppsPayload))
      }
      if (url === '/api/instance' && init?.method === 'POST') {
        return Promise.resolve(okJson({ ok: true, registered: 'gbrain-local', task_id: 'cockpit-mcp-registration-gbrain-local' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView onOpenTarget={onOpenTarget} />)

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
    await waitFor(() => expect(domainAppsCalls).toBeGreaterThanOrEqual(2))
    fireEvent.click(screen.getByRole('button', { name: '打开实例验收任务' }))
    expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-mcp-registration-gbrain-local',
    })
  })

  it('filters the full domain security route set by evidence and status', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/metrics/history') {
        return Promise.resolve(okJson({
          timestamp: '2026-07-12 09:40:00',
          services: 8,
          healthy: 6,
          latency: { p50: '40ms' },
        }))
      }
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView />)

    const securityRegion = await screen.findByRole('region', { name: '领域接通与安全门' })
    const search = within(securityRegion).getByRole('textbox', { name: '搜索领域安全门' })
    fireEvent.change(search, { target: { value: 'CSRF' } })
    expect(within(securityRegion).getByText('匹配 1/1')).toBeInTheDocument()
    expect(within(securityRegion).getByText('家庭驾驶舱 · CSRF token 不应静态硬编码')).toBeInTheDocument()

    fireEvent.change(within(securityRegion).getByRole('combobox', { name: '按安全门状态筛选' }), { target: { value: 'offline' } })
    expect(within(securityRegion).getByText('匹配 0/1')).toBeInTheDocument()
    expect(within(securityRegion).getByText('当前筛选下没有匹配的领域安全门。')).toBeInTheDocument()

    fireEvent.click(within(securityRegion).getByRole('button', { name: '清除领域安全门筛选' }))
    fireEvent.change(within(securityRegion).getByRole('combobox', { name: '按安全门状态筛选' }), { target: { value: 'degraded' } })
    expect(within(securityRegion).getByText('匹配 1/1')).toBeInTheDocument()
  })

  it('rejects invalid instance registration before making a request', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<SettingsView />)

    await waitFor(() => {
      expect(screen.getByText('注册分布式新实例 (Instance)')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('目标服务名称 (Service Name)'), { target: { value: 'bad service' } })
    fireEvent.change(screen.getByLabelText('MCP 接入点地址 (Endpoint URL)'), { target: { value: 'not-a-uri' } })
    fireEvent.click(screen.getByRole('button', { name: '注册实例' }))

    expect(await screen.findByText(/服务名需为 1-64 位/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalledWith('/api/instance', expect.anything())
  })

  it('locks instance registration while the request is pending', async () => {
    let resolveRegistration!: (response: Response) => void
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/metrics/history') return Promise.resolve(okJson(metricsPayload))
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      if (url === '/api/instance' && init?.method === 'POST') {
        return new Promise<Response>((resolve) => { resolveRegistration = resolve })
      }
      return Promise.resolve(okJson({}))
    })

    render(<SettingsView />)
    fireEvent.change(screen.getByLabelText('目标服务名称 (Service Name)'), { target: { value: 'gbrain-local' } })
    fireEvent.change(screen.getByLabelText('MCP 接入点地址 (Endpoint URL)'), { target: { value: 'http://127.0.0.1:7431' } })
    fireEvent.click(screen.getByRole('button', { name: '注册实例' }))

    expect(screen.getByRole('button', { name: '注册中...' })).toBeDisabled()
    resolveRegistration(okJson({ ok: true, registered: 'gbrain-local' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '注册实例' })).not.toBeDisabled())
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

  it('shows a retryable error when control-plane data cannot load', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response)

    render(<SettingsView />)

    expect(await screen.findByRole('alert')).toHaveTextContent('设置页数据加载失败')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/metrics/history')
      expect(fetch).toHaveBeenCalledWith('/api/domain-apps')
    })
  })
})
