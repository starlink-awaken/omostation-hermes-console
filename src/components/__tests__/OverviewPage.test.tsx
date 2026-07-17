import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import OverviewPage from '../OverviewPage'

const systemMapPayload = {
  cockpit_pages: [
    { id: 'Home', title: '首页', group: '入口', purpose: '总览' },
    { id: 'Overview', title: '概览中心', group: '运行大盘', purpose: '运行态势' },
    { id: 'AlertCenter', title: '告警中心', group: '运行大盘', purpose: '异常处理' },
    { id: 'TaskCenter', title: '任务中心', group: '智能与知识', purpose: '任务闭环' },
  ],
  feature_domains: [
    {
      id: 'runtime-ops',
      title: '运行态势',
      english: 'Runtime Operations',
      cockpit_page: 'Overview',
      providers: ['Overview', 'AlertCenter'],
      capability_items: ['health', 'alert', 'triage'],
    },
    {
      id: 'task-loop',
      title: '任务闭环',
      english: 'Task Loop',
      cockpit_page: 'TaskCenter',
      providers: ['TaskCenter'],
      capability_items: ['draft', 'verify'],
    },
  ],
  usage_paths: [
    {
      id: 'daily-ops',
      title: '日常体检',
      intent: '每天先看健康、告警和任务状态。',
      steps: ['Home', 'Overview', 'TaskCenter'],
      pages: [
        { id: 'Home', title: '首页', group: '入口' },
        { id: 'Overview', title: '概览中心', group: '运行大盘' },
        { id: 'TaskCenter', title: '任务中心', group: '智能与知识' },
      ],
    },
  ],
  playbooks: [
    {
      id: 'daily-health-check',
      title: '每日 5 分钟体检',
      goal: '确认 Cockpit 运行状态和待处理项。',
      frequency: 'daily',
      owner: 'operator',
      steps: [
        { page_id: 'Overview', action: '看运行总面' },
        { page_id: 'TaskCenter', action: '处理草稿' },
      ],
    },
  ],
  roadmap: {
    lanes: [
      { id: 'now', title: '现在修', count: 4 },
      { id: 'next', title: '下一步', count: 3 },
    ],
  },
  project_portfolio: {
    summary: {
      score: 78,
      status: 'blocked',
      projects: 19,
      blocked: 7,
      at_risk: 10,
      healthy: 2,
    },
    priority_projects: [
      {
        id: 'mesh-router',
        layer: 'L0',
        status: 'blocked',
        score: 50,
        primary_gap: '基础状态未就绪',
        next_action: '确认项目是否已归档、迁移或需要从注册表下线。',
      },
      {
        id: 'gbrain',
        layer: 'L2',
        status: 'at_risk',
        score: 88,
        primary_gap: '缺少运行探针',
        next_action: '补端口注册或标注为无需常驻服务。',
      },
    ],
    weakest_dimensions: [
      {
        id: 'runtime_probe',
        title: '运行探针',
        score: 21,
        failed: 10,
        warning: 5,
        attention_projects: [{ id: 'mesh-router', next_action: '启动服务或修正端口注册。' }],
      },
    ],
  },
  projects: [
    {
      id: 'mesh-router',
      cockpit_page: 'Compute',
      role: 'omlx 算力网格智能路由代理',
      triage_commands: [
        {
          id: 'runtime-check-ports',
          label: '检查端口',
          kind: 'copy_command',
          value: 'for port in 7437; do lsof -nP -iTCP:$port -sTCP:LISTEN || true; done',
          enabled: true,
          reason: '确认已登记端口是否真的在本机监听。',
        },
      ],
    },
    {
      id: 'gbrain',
      cockpit_page: 'Knowledge',
      role: 'Postgres 知识数据库',
      triage_commands: [
        {
          id: 'runtime-find-registry',
          label: '查端口登记',
          kind: 'copy_command',
          value: 'cd "/Users/xiamingxing/Workspace" && rg -n "gbrain" "protocols/port-registry.yaml"',
          enabled: true,
          reason: '项目缺少可观测端口，先核对端口注册表和 BOS 服务。',
        },
      ],
    },
  ],
}

const registryPayload = [
  {
    name: 'hermes-gateway',
    type: 'daemon',
    port: null,
    status: 'running',
    port_listening: true,
    health: 'healthy',
    layer: 'I0',
  },
  {
    name: 'ollama',
    type: 'daemon',
    port: 11434,
    status: 'idle',
    port_listening: false,
    health: 'unreachable',
    layer: 'L0',
  },
]

const runtimePayload = {
  items: [
    { name: 'Agora Mesh', status: 'online', cpu: 7.9, memory: 11.6, uptime: '99.9%' },
    { name: 'LLM Gateway', status: 'degraded', cpu: 19.5, memory: 43.5, uptime: '98.2%' },
    { name: 'SharedBrain Bridge', status: 'offline', cpu: 0, memory: 0, uptime: '0%' },
  ],
}

const alertPayload = {
  items: [
    { id: 'alert-1', level: 'critical', source: 'agora', message: 'Mesh degradation', status: 'active' },
    { id: 'alert-2', level: 'warning', source: 'runtime', message: 'High memory usage', status: 'active' },
  ],
}

const draftPayload = {
  items: [
    { id: 'verification-ready-cockpit', title: '验证补证：cockpit', description: '项目已登记验证命令，但还未补 workflow 证据。', priority: 'medium', read_only: true, source: { type: 'system_map_verification_ready', id: 'cockpit' } },
    { id: 'domain-app-family-hub', title: '领域应用：检查 family-hub', description: '确认启动命令和挂载状态。', priority: 'high', read_only: true, source: { type: 'system_map_domain_app', id: 'family-hub' } },
    { id: 'capability-gap-runtime', title: '能力缺口：补运行探针', description: '先补运行态证据。', priority: 'critical', read_only: true, source: { type: 'system_map_capability_gap', id: 'runtime-probe' } },
    { id: 'page-maturity-Performance', title: '页面成熟度：补齐 Performance', description: '把性能页从 watch 拉到 ready。', priority: 'medium', read_only: true, source: { type: 'system_map_page_maturity', id: 'Performance' } },
  ],
}

const domainAppsPayload = {
  items: [
    {
      id: 'family-hub',
      name: 'family-hub 服务',
      domain: { id: 'family', name: '@家庭生活' },
      runtime: {
        status: 'stopped',
        launch: { status: 'stopped', url: 'http://localhost:3010' },
        api: { status: 'stopped', url: 'http://localhost:3010/api' },
      },
      security_summary: { posture: 'passed' },
      auth: { type: 'service_token' },
      freshness: { status: 'ready' },
    },
  ],
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders runtime overview, project attention, and actions', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/services') return Promise.resolve({ ok: true, json: async () => registryPayload } as Response)
      if (url === '/api/services/status') return Promise.resolve({ ok: true, json: async () => runtimePayload } as Response)
      if (url === '/api/alerts?status=active&limit=10') return Promise.resolve({ ok: true, json: async () => alertPayload } as Response)
      if (url === '/api/cockpit/system-map') return Promise.resolve({ ok: true, json: async () => systemMapPayload } as Response)
      if (url === '/api/tasks?include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40') return Promise.resolve({ ok: true, json: async () => draftPayload } as Response)
      if (url === '/api/domain-apps') return Promise.resolve({ ok: true, json: async () => domainAppsPayload } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ items: [] }) } as Response)
    })

    render(<OverviewPage onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('总面动作区')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '概览闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('概览冲刺工坊')).toBeInTheDocument()
      expect(screen.getByText('按工作模式进入')).toBeInTheDocument()
      expect(screen.getByText('领域执行闭环')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '当前冲刺页' })).toBeInTheDocument()
      expect(screen.getByText('日常值守模式')).toBeInTheDocument()
      expect(screen.getByText('治理巡检模式')).toBeInTheDocument()
      expect(screen.getByText('建设补位模式')).toBeInTheDocument()
      expect(screen.getByText('领域挂载模式')).toBeInTheDocument()
      expect(screen.getByText('功能架构蓝图')).toBeInTheDocument()
      expect(screen.getByText('全站覆盖与修复')).toBeInTheDocument()
      expect(screen.getByText('深链作战入口')).toBeInTheDocument()
      expect(screen.getByText('运行总面')).toBeInTheDocument()
      expect(screen.getByText('服务登记')).toBeInTheDocument()
      expect(screen.getByText('项目关注')).toBeInTheDocument()
      expect(screen.getByText('修复动作')).toBeInTheDocument()
      expect(screen.getByText('登记服务表')).toBeInTheDocument()
      expect(screen.getByText('运行缺口')).toBeInTheDocument()
      expect(screen.getByText('验证补证')).toBeInTheDocument()
      expect(screen.getByText('页面成熟度')).toBeInTheDocument()
      expect(screen.getByText('领域挂载')).toBeInTheDocument()
      expect(screen.getByText('能力矩阵')).toBeInTheDocument()
      expect(screen.getByText('页面分组')).toBeInTheDocument()
      expect(screen.getAllByText('使用路径').length).toBeGreaterThan(0)
      expect(screen.getAllByText('操作清单').length).toBeGreaterThan(0)
      expect(screen.getByText('路线图车道')).toBeInTheDocument()
      expect(screen.getByText('页面与入口分层')).toBeInTheDocument()
      expect(screen.getByText('能力域与使用路径')).toBeInTheDocument()
      expect(screen.getByText('操作清单与路线图')).toBeInTheDocument()
      expect(screen.getAllByText('日常体检').length).toBeGreaterThan(0)
      expect(screen.getByText('运行态势')).toBeInTheDocument()
      expect(screen.getAllByText('每日 5 分钟体检').length).toBeGreaterThan(0)
      expect(screen.getByText('现在修')).toBeInTheDocument()
      expect(screen.getByText('修复收件箱')).toBeInTheDocument()
      expect(screen.getByText('高优先薄弱面')).toBeInTheDocument()
      expect(screen.getByText('验证补证：cockpit')).toBeInTheDocument()
      expect(screen.getByText('能力缺口：补运行探针')).toBeInTheDocument()
      expect(screen.getAllByText('领域应用：检查 family-hub').length).toBeGreaterThan(0)
      expect(screen.getByText('family-hub 服务')).toBeInTheDocument()
      expect(screen.getAllByText('页面成熟度：补齐 Performance').length).toBeGreaterThan(0)
      expect(screen.getByText('对象状态')).toBeInTheDocument()
      expect(screen.getByText('任务承接')).toBeInTheDocument()
      expect(screen.getAllByText('LLM Gateway').length).toBeGreaterThan(0)
      expect(screen.getAllByText('mesh-router').length).toBeGreaterThan(0)
      expect(screen.getByText('检查端口')).toBeInTheDocument()
      expect(screen.getAllByText('运行探针').length).toBeGreaterThan(0)
      expect(screen.getByText('ollama')).toBeInTheDocument()
    }, { timeout: 8000 })

    fireEvent.click(screen.getByRole('button', { name: '打开工作模式 日常值守模式' }))
    expect(onNavigate).toHaveBeenCalledWith('Home')

    fireEvent.click(screen.getByRole('button', { name: '聚焦冲刺页 Performance' }))
    expect(screen.getByRole('region', { name: '当前冲刺页' })).toHaveTextContent('Performance')

    fireEvent.click(screen.getByRole('button', { name: '复制冲刺任务 页面成熟度：补齐 Performance' }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('页面成熟度：补齐 Performance'))
      expect(screen.getByText('已复制冲刺任务：页面成熟度：补齐 Performance')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开冲刺任务 页面成熟度：补齐 Performance' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: '打开模式任务 建设补位模式' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: '打开模式路径 日常值守模式' }))
    expect(onNavigate).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: '打开领域闭环对象 family-hub 服务' }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: '打开领域闭环任务 family-hub 服务' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: '进入任务中心' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开运行总面到性能页/ }))
    expect(onNavigate).toHaveBeenCalledWith('Performance')

    fireEvent.click(screen.getByRole('button', { name: /打开全站覆盖卡片 验证补证/ }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开修复草稿 能力缺口：补运行探针/ }))
    expect(onNavigate).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开修复草稿 领域应用：检查 family-hub/ }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: /查看项目关注 mesh-router/ }))
    expect(onNavigate).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /复制动作 mesh-router 检查端口/ }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('for port in 7437; do lsof -nP -iTCP:$port -sTCP:LISTEN || true; done')

    fireEvent.click(screen.getByRole('button', { name: /查看弱项维度 运行探针/ }))
    expect(onNavigate).toHaveBeenCalledWith('SystemMap')

    fireEvent.change(screen.getByLabelText('搜索登记服务'), { target: { value: 'ollama' } })
    expect(screen.getByText('显示 1/2 · 待关注 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看登记服务 ollama' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看登记服务 hermes-gateway' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '查看登记服务 ollama' }))
    expect(onNavigate).toHaveBeenCalledWith('Performance')

    fireEvent.click(screen.getByRole('button', { name: '清除登记服务筛选' }))
    expect(screen.getByText('显示 2/2 · 待关注 1')).toBeInTheDocument()
  }, 30000)

  it('emits exact deep-link targets when overview actions have open target support', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/services') return Promise.resolve({ ok: true, json: async () => registryPayload } as Response)
      if (url === '/api/services/status') return Promise.resolve({ ok: true, json: async () => runtimePayload } as Response)
      if (url === '/api/alerts?status=active&limit=10') return Promise.resolve({ ok: true, json: async () => alertPayload } as Response)
      if (url === '/api/cockpit/system-map') return Promise.resolve({ ok: true, json: async () => systemMapPayload } as Response)
      if (url === '/api/tasks?include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40') return Promise.resolve({ ok: true, json: async () => draftPayload } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ items: [] }) } as Response)
    })

    render(<OverviewPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByText('深链作战入口')).toBeInTheDocument()
      expect(screen.getByText('功能架构蓝图')).toBeInTheDocument()
    }, { timeout: 8000 })

    onOpenTarget.mockClear()
    onNavigate.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /打开使用路径 日常体检/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开深链维度 运行探针/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开深链项目 mesh-router/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开深链页面 Performance/ }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', usagePathId: 'daily-ops' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'SystemMap', coverageDimensionId: 'runtime_probe' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(3, { tab: 'SystemMap', projectId: 'mesh-router' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(4, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onNavigate).not.toHaveBeenCalled()
  }, 30000)

  it('surfaces the carried focus object and task handoff when overview receives page context', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/services') return Promise.resolve({ ok: true, json: async () => registryPayload } as Response)
      if (url === '/api/services/status') return Promise.resolve({ ok: true, json: async () => runtimePayload } as Response)
      if (url === '/api/alerts?status=active&limit=10') return Promise.resolve({ ok: true, json: async () => alertPayload } as Response)
      if (url === '/api/cockpit/system-map') return Promise.resolve({ ok: true, json: async () => systemMapPayload } as Response)
      if (url === '/api/tasks?include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40') return Promise.resolve({ ok: true, json: async () => draftPayload } as Response)
      if (url === '/api/domain-apps') return Promise.resolve({ ok: true, json: async () => domainAppsPayload } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ items: [] }) } as Response)
    })

    render(<OverviewPage onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId="Performance" />)

    const focusRegion = await screen.findByRole('region', { name: '当前概览承接焦点' })
    expect(focusRegion).toBeInTheDocument()
    expect(within(focusRegion).getByText('Performance')).toBeInTheDocument()
    expect(within(focusRegion).getByText('把性能页从 watch 拉到 ready。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开概览焦点对象 Performance' }))
    fireEvent.click(screen.getByRole('button', { name: '打开概览焦点任务 Performance' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'Performance' })
    expect(onNavigate).not.toHaveBeenCalled()
  }, 30000)

  it('surfaces overview closure routing when focus hits architecture handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/services') return Promise.resolve({ ok: true, json: async () => registryPayload } as Response)
      if (url === '/api/services/status') return Promise.resolve({ ok: true, json: async () => runtimePayload } as Response)
      if (url === '/api/alerts?status=active&limit=10') return Promise.resolve({ ok: true, json: async () => alertPayload } as Response)
      if (url === '/api/cockpit/system-map') return Promise.resolve({ ok: true, json: async () => systemMapPayload } as Response)
      if (url === '/api/tasks?include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40') return Promise.resolve({ ok: true, json: async () => draftPayload } as Response)
      if (url === '/api/domain-apps') return Promise.resolve({ ok: true, json: async () => domainAppsPayload } as Response)
      return Promise.resolve({ ok: true, json: async () => ({ items: [] }) } as Response)
    })

    render(
      <OverviewPage
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="功能架构与使用路径收口"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前概览承接焦点' })
    expect(within(focusRegion).getByText('功能架构与使用路径收口')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '打开概览焦点对象 功能架构与使用路径收口' }))
    fireEvent.click(screen.getByRole('button', { name: '打开概览焦点任务 功能架构与使用路径收口' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', usagePathId: 'daily-ops' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '每日 5 分钟体检' })
    expect(onNavigate).not.toHaveBeenCalled()
  }, 30000)
})
