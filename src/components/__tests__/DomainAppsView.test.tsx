import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import DomainAppsView from '../DomainAppsView'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

const domainAppsPayload = {
  strategy: 'Cockpit is the L3 entry; L4 domains keep SSOT.',
  summary: {
    total: 1,
    ready: 1,
    needs_attention: 0,
    running: 1,
    stopped: 0,
    high_risk: 1,
    external_mounts: 1,
    security_passed: 2,
    security_warn: 1,
    security_failed: 0,
    security_blocking: 0,
    security_attention_apps: 1,
  },
  items: [
    {
      id: 'family-dashboard-app',
      name: '家庭驾驶舱',
      domain: { id: 'family', name: '@家庭生活' },
      kind: 'external_next_app',
      integration_mode: 'external_mount',
      layer: 'L4 app mounted through L3 Cockpit',
      risk_level: 'high',
      health: 'ready',
      runtime: {
        status: 'running',
        launch: { status: 'listening', url: 'http://localhost:3000', checked: true, port: 3000 },
        api: { status: 'listening', url: 'http://localhost:3000/api', checked: true, port: 3000 },
      },
      warnings: [],
      paths: {
        ssot_root: { path: '/Users/xiamingxing/Documents/@家庭生活', exists: true },
        app_root: { path: '/Users/xiamingxing/Documents/@家庭生活/family-dashboard-app', exists: true },
      },
      links: { launch_url: 'http://localhost:3000', api_url: 'http://localhost:3000/api' },
      actions: [
        {
          id: 'copy-start',
          label: '复制启动命令',
          kind: 'copy_command',
          value: 'cd /tmp/family-hub && bun run api',
          enabled: true,
          risk: 'medium',
          guard: '人工确认后执行。',
        },
      ],
      security_gates: [],
      security_checks: [
        {
          id: 'api-auth-cookie',
          status: 'passed',
          level: 'high',
          title: 'API 也校验登录态',
          detail: 'API must require auth.',
          evidence: 'proxy.ts 包含 /api 分支、cookie 校验和 401 JSON 响应。',
          next_action: '保持 proxy.ts 覆盖 /api。',
          blocking: false,
        },
        {
          id: 'csrf-secret-env',
          status: 'warn',
          level: 'medium',
          title: 'CSRF token 不应静态硬编码',
          detail: 'CSRF token should come from env.',
          evidence: '检测到静态 FAMILY_CSRF_TOKEN。',
          next_action: '把 FAMILY_CSRF_TOKEN 切到环境变量。',
          blocking: false,
        },
      ],
      security_summary: {
        posture: 'attention',
        total: 2,
        passed: 1,
        warn: 1,
        failed: 0,
        blocking: 0,
        attention: 1,
        high_risk_open: 0,
      },
      commands: { start: null, verify: [] },
      capabilities: { read: ['knowledge.read'], write: ['knowledge.update'] },
      auth: { type: 'single_password_cookie' },
      freshness: { status: 'built', updated_at: new Date().toISOString() },
      notes: [],
    },
  ],
}

const opcPayload = {
  exists: true,
  ssot_root: '/Users/xiamingxing/Documents/@OPC',
  positioning: { title: 'OPC', summary: 'OPC SSOT 聚合视图' },
  weekly_priorities: [],
  content_calendar: { week: [], ideas: [] },
  metrics: [],
  product_portfolio: { matrix: [], pipeline: [], revenue: [] },
}

const systemMapPayload = {
  cockpit_pages: [
    { id: 'DomainApps', title: '应用中心' },
    { id: 'QuestBoard', title: '积分冒险' },
  ],
  project_portfolio: {
    priority_projects: [
      {
        id: 'family-dashboard-app-project',
        layer: 'L4',
        cockpit_page: 'DomainApps',
        status: 'at_risk',
        score: 68,
        primary_gap: '家庭入口已挂载，但项目承接和验证面还没完全接通。',
        next_action: '先回应用中心确认入口，再到系统地图和任务中心继续收口。',
      },
    ],
  },
  roadmap: {
    items: [
      {
        id: 'family-quest-loop',
        priority: 'P1',
        status: 'planned',
        title: '家庭激励闭环',
        cockpit_page: 'QuestBoard',
        problem: '积分冒险还没完全接进家庭任务与周报闭环。',
      },
    ],
  },
}

describe('DomainAppsView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('surfaces the requested domain app when opened from a source task', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView taskQuery="family-dashboard-app" />)

    expect(await screen.findByRole('region', { name: '当前聚焦领域应用' }, { timeout: 5000 })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: '当前聚焦应用闭环' }, { timeout: 5000 })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('当前聚焦：家庭驾驶舱')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '当前聚焦应用剖面' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '领域承接路径' })).toBeInTheDocument()
      expect(screen.getByText('领域承接路径')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '领域建设入口' })).toBeInTheDocument()
      expect(screen.getByText('领域建设入口')).toBeInTheDocument()
      expect(screen.getByText('领域项目与路线图')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开领域建设入口 family-dashboard-app-project' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开领域建设覆盖 family-dashboard-app-project' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开领域建设任务 家庭激励闭环' })).toBeInTheDocument()
      expect(screen.getAllByText('OPC 作战台').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Cockpit 入口').length).toBeGreaterThan(0)
      expect(screen.getAllByText('领域 SSOT').length).toBeGreaterThan(0)
      expect(screen.getAllByText('任务承接').length).toBeGreaterThan(0)
      expect(screen.getByRole('region', { name: '领域挂载合同矩阵' })).toBeInTheDocument()
      expect(screen.getByText('挂载合同矩阵')).toBeInTheDocument()
      expect(screen.getByText('SSOT 已登记')).toBeInTheDocument()
      expect(screen.getByText('验证已登记')).toBeInTheDocument()
      expect(screen.getByText('写能力已声明')).toBeInTheDocument()
    }, { timeout: 5000 })
  }, 20000)

  it('opens task center from the focused domain app profile', async () => {
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView onOpenTarget={onOpenTarget} taskQuery="family-dashboard-app" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /按应用筛任务/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开聚焦应用系统地图' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /打开领域承接任务 家庭驾驶舱/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开领域建设入口 family-dashboard-app-project' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开领域建设覆盖 family-dashboard-app-project' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开领域建设任务 家庭激励闭环' })).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByRole('button', { name: /打开领域承接任务 家庭驾驶舱/ }))

    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'family-dashboard-app' })

    fireEvent.click(screen.getByRole('button', { name: /按应用筛任务/ }))

    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'family-dashboard-app' })

    fireEvent.click(screen.getByRole('button', { name: '打开聚焦应用系统地图' }))

    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap' })

    fireEvent.click(screen.getByRole('button', { name: '打开领域建设入口 family-dashboard-app-project' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'DomainApps' })

    fireEvent.click(screen.getByRole('button', { name: '打开领域建设覆盖 family-dashboard-app-project' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'family-dashboard-app-project' })

    fireEvent.click(screen.getByRole('button', { name: '打开领域建设任务 家庭激励闭环' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'family-quest-loop' })
  }, 20000)

  it('filters all application surfaces by domain, runtime, and keyword', async () => {
    const secondApp = {
      ...domainAppsPayload.items[0],
      id: 'opc-console',
      name: 'OPC 作战台',
      domain: { id: 'opc', name: '@OPC' },
      runtime: {
        ...domainAppsPayload.items[0].runtime,
        status: 'stopped',
      },
    }
    const payload = {
      ...domainAppsPayload,
      summary: { ...domainAppsPayload.summary, total: 2 },
      items: [domainAppsPayload.items[0], secondApp],
    }
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/domain-apps') return Promise.resolve(okJson(payload))
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView />)

    await waitFor(() => {
      const filterRegion = screen.getByRole('region', { name: '领域应用筛选' })
      expect(filterRegion).toBeInTheDocument()
      expect(within(filterRegion).getByText('显示 2 / 2')).toBeInTheDocument()
      expect(screen.getAllByText('OPC 作战台').length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    fireEvent.change(screen.getByRole('combobox', { name: '按领域筛选应用' }), { target: { value: 'opc' } })
    await waitFor(() => {
      expect(within(screen.getByRole('region', { name: '领域应用筛选' })).getByText('显示 1 / 2')).toBeInTheDocument()
      expect(screen.getAllByText('OPC 作战台').length).toBeGreaterThan(0)
      expect(screen.queryByText('家庭驾驶舱')).not.toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox', { name: '按运行态筛选应用' }), { target: { value: 'running' } })
    await waitFor(() => {
      expect(screen.getByText('当前筛选下暂无需要处理的领域应用')).toBeInTheDocument()
      expect(within(screen.getByRole('region', { name: '领域应用筛选' })).getByText('显示 0 / 2')).toBeInTheDocument()
    })
  }, 20000)

  it('queues a domain app command without executing it', async () => {
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'POST') return Promise.resolve(okJson({ id: 'cockpit-domain-app-family-dashboard-app-copy-start' }))
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView onOpenTarget={onOpenTarget} taskQuery="family-dashboard-app" />)

    const queueButtons = await screen.findAllByRole('button', { name: '登记领域应用动作 复制启动命令' }, { timeout: 5000 })
    fireEvent.click(queueButtons[0])

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-domain-app-family-dashboard-app-copy-start',
      })
      expect(screen.getByRole('status')).toHaveTextContent('已登记“复制启动命令”')
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/cockpit/domain-apps/family-dashboard-app/actions/copy-start/queue',
      { method: 'POST' },
    )
  }, 20000)

  it('executes the explicit low-risk verification action through the controlled path', async () => {
    const onOpenTarget = vi.fn()
    const verificationPayload = {
      ...domainAppsPayload,
      items: [{
        ...domainAppsPayload.items[0],
        actions: [
          ...domainAppsPayload.items[0].actions,
          {
            id: 'copy-verify',
            label: '复制验证命令',
            kind: 'copy_command',
            value: 'uv run pytest',
            enabled: true,
            risk: 'low',
            guard: '受控低风险验证。',
          },
        ],
      }],
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/verify') && init?.method === 'POST') {
        return Promise.resolve(okJson({ id: 'cockpit-domain-app-family-dashboard-app-copy-verify', exit_code: 0 }))
      }
      if (url === '/api/domain-apps') return Promise.resolve(okJson(verificationPayload))
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView onOpenTarget={onOpenTarget} taskQuery="family-dashboard-app" />)

    const verifyButtons = await screen.findAllByRole('button', { name: '执行领域应用验证 复制验证命令' }, { timeout: 5000 })
    fireEvent.click(verifyButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/domain-apps/family-dashboard-app/verify',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-domain-app-family-dashboard-app-copy-verify',
      })
      expect(screen.getByRole('status')).toHaveTextContent('验证完成')
    })
  }, 20000)

  it('falls back to legacy navigation when a task target callback is unavailable', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'POST') return Promise.resolve(okJson({ id: 'domain-app-task-1' }))
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView onNavigate={onNavigate} taskQuery="family-dashboard-app" />)
    const queueButtons = await screen.findAllByRole('button', { name: '登记领域应用动作 复制启动命令' })
    fireEvent.click(queueButtons[0])

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('TaskCenter'))
  }, 20000)

  it('shows the source error and retries the domain app catalog', async () => {
    let attempts = 0
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/domain-apps') {
        attempts += 1
        return Promise.resolve(attempts === 1
          ? ({ ok: false, status: 503, json: async () => ({ error: '领域应用服务暂时不可用' }) } as Response)
          : okJson(domainAppsPayload))
      }
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView />)

    expect(await screen.findByRole('alert')).toHaveTextContent('领域应用服务暂时不可用')
    fireEvent.click(screen.getByRole('button', { name: '重试领域应用' }))

    await waitFor(() => {
      expect(screen.getByText('领域挂载执行区')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(attempts).toBe(2)
  }, 20000)

  it('keeps the domain app surface available when OPC is unavailable', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      if (url === '/api/opc/workspace') {
        return Promise.resolve({ ok: false, status: 503, json: async () => ({ error: 'OPC 工作区暂时不可用' }) } as Response)
      }
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView />)

    await waitFor(() => {
      expect(screen.getByText('领域挂载执行区')).toBeInTheDocument()
      expect(screen.getAllByText('家庭驾驶舱').length).toBeGreaterThan(0)
      expect(screen.getByRole('alert')).toHaveTextContent('OPC 工作区暂时不可用')
    })
  }, 20000)

  it('renders security posture summary and checks', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/domain-apps') return Promise.resolve(okJson(domainAppsPayload))
      if (url === '/api/opc/workspace') return Promise.resolve(okJson(opcPayload))
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          project_portfolio: {
            summary: { score: 82, status: 'watch', blocked: 0, at_risk: 2 },
            priority_projects: [],
          },
          domain_apps: {
            summary: { score: 91, ready: 1, running: 1, security_attention_apps: 1 },
            attention_items: [
              {
                id: 'family-dashboard-app',
                name: '家庭驾驶舱',
                runtime_status: 'running',
                security_posture: 'attention',
                next_action: '把 FAMILY_CSRF_TOKEN 切到环境变量。',
              },
            ],
            next_action: '把 FAMILY_CSRF_TOKEN 切到环境变量。',
          },
          roadmap: { items: [] },
          gaps: [],
        }))
      }
      if (url === '/api/debt') {
        return Promise.resolve(okJson({
          total: 3,
          open: 1,
          closed: 2,
          items: [
            {
              id: 'debt-1',
              title: '补家庭 app CSRF',
              severity: 'p1',
              lifecycle_state: 'open',
              owner: 'security',
              dimension: 'security',
            },
          ],
        }))
      }
      if (url === '/api/omos/status') {
        return Promise.resolve(okJson({
          system: { current_phase: 'Wave 2', health_score: 95, active_tasks: 2, blocked_tasks: 0 },
          governance: { health_score: 96, anomaly_count: 0, total_tasks: 4 },
        }))
      }
      if (url === '/api/l4/health') {
        return Promise.resolve(okJson({
          total_domains: 2,
          healthy_count: 2,
          unhealthy_count: 0,
          health_rate: '100%',
          domains: [],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<DomainAppsView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getAllByText('家庭驾驶舱').length).toBeGreaterThan(1)
      expect(screen.getByText('领域挂载工作台')).toBeInTheDocument()
      expect(screen.getByText('领域挂载执行区')).toBeInTheDocument()
      expect(screen.getByText('挂载合同矩阵')).toBeInTheDocument()
      expect(screen.getByText('合同完备 0 / 1')).toBeInTheDocument()
      expect(screen.getByText('按需或未登记')).toBeInTheDocument()
      expect(screen.getAllByText('未登记').length).toBeGreaterThan(0)
      expect(screen.getAllByText('single_password_cookie').length).toBeGreaterThan(0)
      expect(screen.getByText('读 1 · 写 1')).toBeInTheDocument()
      expect(screen.getByText('回知识中枢')).toBeInTheDocument()
      expect(screen.getByText('领域关注工作台')).toBeInTheDocument()
      expect(screen.getByText('全部关注')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /高风险/ })).toBeInTheDocument()
      expect(screen.getByText(/风险 高风险 · 安全 需处理/)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '安全通过' })).toBeInTheDocument()
      expect(screen.getByText('API 也校验登录态')).toBeInTheDocument()
      expect(screen.getByText('CSRF token 不应静态硬编码')).toBeInTheDocument()
      expect(screen.getByText(/通过 1 · 警告 1 · 失败 0/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /待启动/ }))

    await waitFor(() => {
      expect(screen.getByText('当前筛选下暂无需要处理的领域应用')).toBeInTheDocument()
    })
  })
})
