import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
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

const playbookDraft = {
  id: 'playbook-daily-health-check',
  title: '操作清单：每日 5 分钟体检',
  description: '先确认入口、告警、任务和日志是否正常',
  status: 'pending',
  progress: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignee: 'operator',
  priority: 'low',
  tags: ['playbook', 'draft'],
  read_only: true,
  source: { type: 'system_map_playbook', id: 'daily-health-check', title: '每日 5 分钟体检' },
  draft: {
    kind: 'playbook_task',
    copy_text: '任务草稿内容',
    step_count: 4,
    guard: '只读任务草稿；需要正式写入时走 C2G/OMO 受控入口。',
    evidence_fields: [
      { step_id: 'daily-home', page_id: 'Home', evidence: '健康分可见', done_when: '无 P0 告警' },
      { step_id: 'daily-alerts', page_id: 'AlertCenter', evidence: '告警可见', done_when: '高优告警已确认' },
    ],
  },
}

const projectPortfolioDraft = {
  id: 'portfolio-kairon',
  title: '项目组合：修复 kairon',
  description: '复制验证命令复现。',
  status: 'pending',
  progress: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignee: 'engineering',
  priority: 'critical',
  tags: ['project-portfolio', 'draft', 'blocked'],
  read_only: true,
  source: { type: 'system_map_project_portfolio', id: 'kairon', title: 'kairon 项目组合态势' },
  draft: {
    kind: 'project_portfolio_task',
    copy_text: '项目组合草稿内容',
    step_count: 1,
    guard: '只读项目组合草稿；复制后由人确认，正式写入需走 C2G/OMO 受控入口。',
    evidence_fields: [
      { label: '组合状态', value: 'blocked' },
      { label: '组合分', value: '50%' },
      { label: '主要缺口', value: '最近验证失败' },
    ],
  },
}

const verificationReadyDraft = {
  id: 'verification-ready-cockpit',
  title: '验证补证：cockpit',
  description: '项目已登记验证命令，但最近还没有 workflow 验证证据。',
  status: 'pending',
  progress: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignee: 'engineering',
  priority: 'medium',
  tags: ['verification-ready', 'draft', 'L3', 'running'],
  read_only: true,
  source: { type: 'system_map_verification_ready', id: 'cockpit', title: 'cockpit 验证补证' },
  draft: {
    kind: 'verification_ready_task',
    copy_text: '验证补证草稿内容',
    step_count: 3,
    guard: '只读验证补证草稿；正式写入需走 agent-workflow / C2G / OMO 受控入口。',
    evidence_fields: [
      { label: '运行状态', value: 'running' },
      { label: '验证状态', value: 'documented' },
      { label: '验证命令', value: 'cd "/Users/xiamingxing/Workspace/projects/cockpit" && uv run pytest -q' },
    ],
  },
}

const domainAppDraft = {
  id: 'domain-app-family-hub',
  title: '领域应用：处理 family-hub 服务',
  description: '按登记启动命令拉起服务或确认它只需要按需启动。',
  status: 'pending',
  progress: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignee: 'operator',
  priority: 'high',
  tags: ['domain-app', 'draft', 'family', 'stopped', 'passed'],
  read_only: true,
  source: { type: 'system_map_domain_app', id: 'family-hub', title: 'family-hub 服务 领域应用态势' },
  draft: {
    kind: 'domain_app_task',
    copy_text: '领域应用草稿内容',
    step_count: 1,
    guard: '只读领域应用草稿；正式写入需走领域 app 自身认证/审计或 C2G/OMO 受控入口。',
    evidence_fields: [
      { label: '健康状态', value: 'ready' },
      { label: '运行状态', value: 'stopped' },
      { label: '安全态', value: 'passed' },
      { label: '下一步', value: '按登记启动命令拉起服务或确认它只需要按需启动。' },
    ],
  },
}

const domainAppSnapshot = {
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
  commands: {
    start: 'bun run family-hub:start',
    verify: ['bun run family-hub:verify'],
  },
}

const capabilityGapDraft = {
  id: 'capability-gap-project-native-surface',
  title: '能力缺口：处理 部分项目仍需补齐状态面',
  description: '优先补齐高频项目的文档、命令、构建清单和运行探针。',
  status: 'pending',
  progress: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignee: 'operator',
  priority: 'high',
  tags: ['capability-gap', 'draft', 'medium', 'project-native-surface'],
  read_only: true,
  source: {
    type: 'system_map_capability_gap',
    id: 'project-native-surface',
    title: '部分项目仍需补齐状态面 能力缺口',
  },
  draft: {
    kind: 'capability_gap_task',
    copy_text: '能力缺口草稿内容',
    step_count: 3,
    guard: '只读能力缺口草稿；正式写入需走 C2G/OMO 受控入口。',
    evidence_fields: [
      { label: '严重度', value: 'medium' },
      { label: '证据', value: 'mesh-router, toolbox' },
      { label: '下一步', value: '优先补齐高频项目的文档、命令、构建清单和运行探针。' },
    ],
  },
}

const pageMaturityDraft = {
  id: 'page-maturity-Performance',
  title: '页面能力：补齐 性能监控',
  description: '把页面接入至少一条使用路径。',
  status: 'pending',
  progress: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  assignee: 'operator',
  priority: 'high',
  tags: ['page-maturity', 'draft', 'gap', 'Performance', '运行大盘'],
  read_only: true,
  source: {
    type: 'system_map_page_maturity',
    id: 'Performance',
    title: '性能监控 页面成熟度',
  },
  draft: {
    kind: 'page_maturity_task',
    copy_text: '页面能力草稿内容',
    step_count: 1,
    guard: '只读页面能力草稿；正式写入需走 C2G/OMO 受控入口。',
    evidence_fields: [
      { label: '状态', value: 'gap' },
      { label: '成熟度', value: '0%' },
      { label: '下一步', value: '把页面接入至少一条使用路径。' },
    ],
  },
}

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

function mockTaskCenterFetch(items: unknown[], domainApps: unknown[] = [domainAppSnapshot]) {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true') {
      return Promise.resolve(okJson({ items }))
    }
    if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') {
      return Promise.resolve(okJson({ items }))
    }
    if (url === '/api/metaos/workflows') {
      return Promise.resolve(okJson({ status: 'ok', workflows: [] }))
    }
    if (url === '/api/ecos/skills') {
      return Promise.resolve(okJson({ skills: [] }))
    }
    if (url === '/api/pipelines') {
      return Promise.resolve(okJson({ pipelines: [] }))
    }
    if (url === '/api/ecos/workflows') {
      return Promise.resolve(okJson({ workflows: [] }))
    }
    if (url === '/api/cockpit/system-map') {
      return Promise.resolve(okJson({ usage_paths: [], playbooks: [], gaps: [], roadmap: { items: [] } }))
    }
    if (url === '/api/domain-apps') {
      return Promise.resolve(okJson({ items: domainApps }))
    }
    if (url.startsWith('/api/tasks/drafts/') && url.endsWith('/promote')) {
      return Promise.resolve(okJson({ id: 'cockpit-playbook-daily-health-check', status: 'pending', title: '操作清单：每日 5 分钟体检' }))
    }
    if (url === '/api/tasks/task-1/history') {
      return Promise.resolve(okJson({
        task_id: 'task-1',
        source: 'omo-ingress',
        items: [{ kind: 'trail', action: 'promote_task_to_active', actor: 'cockpit-task-center', status: 'ok', ts: '2026-07-15T02:00:00Z', source_ref: 'cockpit:task:resume:task-1' }],
      }))
    }
    if (url.endsWith('/pause') || url.endsWith('/resume') || url.endsWith('/cancel')) {
      return Promise.resolve(okJson({}))
    }
    return Promise.resolve(okJson({ items: [] }))
  })
}

describe('TaskCenterPage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('shows loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    render(<TaskCenterPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('keeps a retry action available after a controlled verification fails', async () => {
    const failedControlledTask = {
      ...mockTasks[0],
      id: 'failed-verification',
      title: '重试 Cockpit 验证',
      execution_contract: {
        controlled_execution: true,
        command: 'uv run pytest',
        execution_audit: {
          exit_code: 124,
          timed_out: true,
          log_ref: 'runtime/omo/failed-verification.log',
        },
      },
    }
    mockTaskCenterFetch([failedControlledTask])

    render(<TaskCenterPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重试受控验证' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '重试受控验证' }))
    expect(fetch).toHaveBeenCalledWith('/api/tasks/failed-verification/execute', { method: 'POST' })
  })

  it('renders fetched tasks and stats', async () => {
    mockTaskCenterFetch(mockTasks)

    render(<TaskCenterPage />)

    await waitFor(() => {
      expect(screen.getByText('任务动作区')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '当前任务来源工作台' })).toBeInTheDocument()
      expect(screen.getByText('任务承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })

    expect(fetch).toHaveBeenCalledWith('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true')
    expect(screen.getAllByText('Review debt').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Run tests').length).toBeGreaterThan(0)
    // Stats: pending=1, in_progress=1, completed=1, failed=0
    const pendingStat = screen.getByRole('heading', { name: '待处理' }).closest('.stat-card')
    expect(pendingStat?.textContent).toContain('1')
  })

  it('builds a task workbench that selects focus tasks and opens follow-up pages', async () => {
    const onNavigate = vi.fn()
    mockTaskCenterFetch([...mockTasks, domainAppDraft])

    render(<TaskCenterPage onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '当前任务来源工作台' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '执行路由架构总表' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '任务来源带总表' })).toBeInTheDocument()
      expect(screen.getByText('任务承接工作台')).toBeInTheDocument()
      expect(screen.getByText('领域任务承接台')).toBeInTheDocument()
      expect(screen.getByText('任务闭环控制台')).toBeInTheDocument()
      expect(screen.getAllByText('系统地图修复').length).toBeGreaterThan(0)
      expect(screen.getAllByText('领域挂载').length).toBeGreaterThan(0)
      expect(screen.getAllByText('领域应用：处理 family-hub 服务').length).toBeGreaterThan(0)
      expect(screen.getByText('承接对象')).toBeInTheDocument()
      expect(screen.getAllByText('family-hub').length).toBeGreaterThan(0)
      expect(screen.getByText('闭环入口')).toBeInTheDocument()
      expect(screen.getByText('相关对象快照')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开来源带 领域挂载' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开来源带任务 领域挂载' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开来源带 领域挂载' }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: '打开闭环入口 领域挂载' }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: '打开领域承接 family-hub' }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: '打开来源带任务 领域挂载' }))
    expect(screen.getByPlaceholderText('搜索任务...')).toHaveValue('family-hub')

    fireEvent.click(screen.getByRole('button', { name: '查看任务 领域应用：处理 family-hub 服务' }))

    await waitFor(() => {
      expect(screen.getAllByText('领域应用：处理 family-hub 服务').length).toBeGreaterThan(1)
      expect(screen.getAllByText('安全态').length).toBeGreaterThan(0)
      expect(screen.getByText('当前闭环焦点')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开当前任务相关应用' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开当前任务相关应用' }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: '打开任务承接到协议面' }))
    expect(onNavigate).toHaveBeenCalledWith('Protocol')
  })

  it('builds an execution routing board that opens object routes and filters lane tasks', async () => {
    const onOpenTarget = vi.fn()
    mockTaskCenterFetch([
      playbookDraft,
      projectPortfolioDraft,
      verificationReadyDraft,
      domainAppDraft,
      capabilityGapDraft,
      pageMaturityDraft,
    ])

    render(<TaskCenterPage onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const board = screen.getByRole('region', { name: '执行路由架构总表' })
      expect(board).toBeInTheDocument()
      expect(within(board).getByText('路由车道 6 / 6')).toBeInTheDocument()
      expect(within(board).getByText('活跃车道')).toBeInTheDocument()
      expect(within(board).getAllByText('对象入口').length).toBeGreaterThan(0)
      expect(within(board).getByText('来源证据')).toBeInTheDocument()
      expect(within(board).getByText('验证补证')).toBeInTheDocument()
      expect(within(board).getByText('领域应用')).toBeInTheDocument()
      expect(within(board).getAllByText('证据 3 条 · 验证补证：cockpit').length).toBeGreaterThan(0)
    })

    const board = screen.getByRole('region', { name: '执行路由架构总表' })

    fireEvent.click(within(board).getByRole('button', { name: '打开执行路由 验证补证' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'cockpit' })

    fireEvent.click(within(board).getByRole('button', { name: '过滤执行路由 页面能力' }))
    expect(screen.getByPlaceholderText('搜索任务...')).toHaveValue('页面')

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(tasksList).not.toBeNull()
      expect(within(tasksList as HTMLElement).getByText('页面能力：补齐 性能监控')).toBeInTheDocument()
      expect(within(tasksList as HTMLElement).queryByText('验证补证：cockpit')).not.toBeInTheDocument()
    })

    fireEvent.click(within(board).getByRole('button', { name: '查看执行路由代表任务 领域应用' }))

    await waitFor(() => {
      expect(screen.getAllByText('领域应用：处理 family-hub 服务').length).toBeGreaterThan(0)
      expect(screen.getByText('当前任务来源工作台')).toBeInTheDocument()
      expect(screen.getAllByText('family-hub 服务 · @家庭生活').length).toBeGreaterThan(0)
    })
  })

  it('refreshes the task list when the refresh action is clicked', async () => {
    mockTaskCenterFetch(mockTasks)

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '刷新任务' }))

    await waitFor(() => {
      const taskFetches = vi.mocked(fetch).mock.calls.filter(([input]) => String(input) === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true')
      expect(taskFetches).toHaveLength(2)
    })
  })

  it('filters tasks by status', async () => {
    mockTaskCenterFetch(mockTasks)

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })

    const filterSelect = screen.getByDisplayValue('全部状态')
    fireEvent.change(filterSelect, { target: { value: 'completed' } })

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(tasksList).not.toBeNull()
      expect(within(tasksList as HTMLElement).queryByText('Deploy gateway')).not.toBeInTheDocument()
      expect(within(tasksList as HTMLElement).getByText('Run tests')).toBeInTheDocument()
    })
  })

  it('filters tasks by search query', async () => {
    mockTaskCenterFetch(mockTasks)

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText('搜索任务...')
    fireEvent.change(searchInput, { target: { value: 'debt' } })

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(tasksList).not.toBeNull()
      expect(within(tasksList as HTMLElement).queryByText('Deploy gateway')).not.toBeInTheDocument()
      expect(within(tasksList as HTMLElement).getByText('Review debt')).toBeInTheDocument()
    })
  })

  it('uses the initial search query to open on a filtered task draft', async () => {
    mockTaskCenterFetch([...mockTasks, projectPortfolioDraft])

    render(<TaskCenterPage initialSearchQuery="system_map_project_portfolio" />)

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(screen.getByPlaceholderText('搜索任务...')).toHaveValue('system_map_project_portfolio')
      expect(screen.getAllByText('项目组合：修复 kairon').length).toBeGreaterThan(0)
      expect(tasksList).not.toBeNull()
      expect(within(tasksList as HTMLElement).queryByText('Deploy gateway')).not.toBeInTheDocument()
    })
  })

  it('renders an incoming draft workbench and opens the source back into cockpit context', async () => {
    const onOpenTarget = vi.fn()
    mockTaskCenterFetch(mockTasks)

    render(
      <TaskCenterPage
        onOpenTarget={onOpenTarget}
        incomingDraft={{
          title: '补齐概览中心的路线图承接',
          description: '把概览中心补成可直接承接 roadmap、usage path 和 task draft 的工作台。',
          tags: ['cockpit', 'overview', 'roadmap', 'usage-path'],
          checklist: [
            '补路线图入口',
            '补使用路径回跳',
            '补任务草稿承接',
          ],
          copyText: '补齐概览中心的路线图承接\n- 补路线图入口\n- 补使用路径回跳\n- 补任务草稿承接',
          sourceTarget: { tab: 'SystemMap', pageId: 'Overview' },
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '外部送达任务草稿' })).toBeInTheDocument()
      expect(screen.getByText('补齐概览中心的路线图承接')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '复制外部送达任务草稿 补齐概览中心的路线图承接' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '补齐概览中心的路线图承接\n- 补路线图入口\n- 补使用路径回跳\n- 补任务草稿承接',
      )
      expect(screen.getByText('已复制外部草稿：补齐概览中心的路线图承接')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '按草稿过滤任务 补齐概览中心的路线图承接' }))
    expect(screen.getByPlaceholderText('搜索任务...')).toHaveValue('补齐概览中心的路线图承接')

    fireEvent.click(screen.getByRole('button', { name: '打开外部草稿来源 补齐概览中心的路线图承接' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', pageId: 'Overview' })
  })

  it('calls pause API when pause button clicked', async () => {
    mockTaskCenterFetch(mockTasks)

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })

    const pauseButtons = screen.getAllByRole('button', { name: '暂停任务' })
    fireEvent.click(pauseButtons[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/task-1/pause', { method: 'POST' })
    })
  })

  it('requires request and grant approval before resuming a gated task', async () => {
    const approvalTask = {
      ...mockTasks[1],
      id: 'approval-task',
      title: '登记外部服务启动',
      priority: 'high',
      execution_contract: {
        risk_level: 'L2',
        allowed_operation_level: 'L2',
        human_approval_required: true,
        approval_state: 'missing',
        next_action: '先申请人工审批',
        executes: false,
      },
    }
    mockTaskCenterFetch([...mockTasks, approvalTask])

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '申请任务审批' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '申请任务审批' }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/approval-task/request-approval', { method: 'POST' })
      expect(screen.getByRole('button', { name: '批准任务' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批准任务' }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/approval-task/approve', { method: 'POST' })
      expect(screen.getByRole('button', { name: '恢复任务' })).toBeInTheDocument()
    })

    const resumeButtons = screen.getAllByRole('button', { name: '恢复任务' })
    fireEvent.click(resumeButtons[resumeButtons.length - 1])
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/approval-task/resume', { method: 'POST' })
      expect(screen.getByRole('button', { name: '发起受控执行' })).toBeInTheDocument()
    })

    const approvalTitle = screen.getAllByText('登记外部服务启动').find((element) => element.classList.contains('task-title'))
    const approvalCard = approvalTitle?.closest('.task-card')
    expect(approvalCard).not.toBeNull()
    fireEvent.click(within(approvalCard as HTMLElement).getByRole('button', { name: '发起受控执行' }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/approval-task/dispatch', { method: 'POST' })
    })
  })

  it('shows an inline error and preserves state when a task action fails', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true') {
        return Promise.resolve(okJson({ items: mockTasks }))
      }
      if (url.endsWith('/pause')) return Promise.resolve({ ok: false, statusText: 'Bad Gateway', json: async () => ({ error: 'task backend unavailable' }) } as Response)
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '暂停任务' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('任务操作失败')
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })
  })

  it('shows OMO ingress history for a persisted task', async () => {
    mockTaskCenterFetch(mockTasks)

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Deploy gateway').length).toBeGreaterThan(0)
    })

    const taskCard = document.querySelector('.task-card')
    expect(taskCard).not.toBeNull()
    fireEvent.click(taskCard as HTMLElement)

    await waitFor(() => {
      expect(screen.getByText('OMO 历史:')).toBeInTheDocument()
      expect(screen.getByText('promote_task_to_active')).toBeInTheDocument()
      expect(screen.getByText('cockpit-task-center · 2026/7/15 10:00:00')).toBeInTheDocument()
    })
  })

  it('renders playbook drafts as read-only copyable tasks', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    mockTaskCenterFetch([...mockTasks, playbookDraft])

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('操作清单：每日 5 分钟体检').length).toBeGreaterThan(0)
    })

    expect(screen.getAllByText(/只读草稿/).length).toBeGreaterThan(0)
    const copyButton = screen.getByRole('button', { name: '复制任务草稿' })
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('任务草稿内容')
    })
  })

  it('promotes a read-only draft into an OMO planned task', async () => {
    mockTaskCenterFetch([playbookDraft])

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('操作清单：每日 5 分钟体检').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: '承接为正式计划任务' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '承接为正式计划任务' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/drafts/playbook-daily-health-check/promote', { method: 'POST' })
      expect(screen.getByText('已承接为正式计划任务：操作清单：每日 5 分钟体检')).toBeInTheDocument()
    })
  })

  it('opens draft sources back into cockpit context', async () => {
    const onOpenTarget = vi.fn()
    mockTaskCenterFetch([
      playbookDraft,
      projectPortfolioDraft,
      verificationReadyDraft,
      domainAppDraft,
      capabilityGapDraft,
      pageMaturityDraft,
    ])

    render(<TaskCenterPage onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByText('处理车道')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '任务来源带总表' })).toBeInTheDocument()
      expect(screen.getAllByText('操作清单：每日 5 分钟体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText('项目组合：修复 kairon').length).toBeGreaterThan(0)
      expect(screen.getAllByText('验证补证：cockpit').length).toBeGreaterThan(0)
      expect(screen.getAllByText('领域应用：处理 family-hub 服务').length).toBeGreaterThan(0)
      expect(screen.getAllByText('能力缺口：处理 部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getAllByText('页面能力：补齐 性能监控').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '切换车道 验证补证' }))

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(tasksList).not.toBeNull()
      expect(screen.getAllByText('优先把已有验证命令补成正式证据。').length).toBeGreaterThan(0)
      expect(within(tasksList as HTMLElement).queryByText('项目组合：修复 kairon')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开当前车道 验证补证 的搜索' }))
    expect(screen.getByPlaceholderText('搜索任务...')).toHaveValue('验证')

    fireEvent.click(screen.getByRole('button', { name: '打开当前车道入口 验证补证' }))
    fireEvent.change(screen.getByPlaceholderText('搜索任务...'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '清除当前车道筛选' }))

    await waitFor(() => {
      expect(screen.getAllByText('项目组合：修复 kairon').length).toBeGreaterThan(0)
      expect(screen.getAllByText('操作清单：每日 5 分钟体检').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: '查看项目态势' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '打开补证项目' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '打开应用中心' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '查看能力缺口' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '打开来源页面' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '打开执行页面' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: '查看闭环任务 验证补证：cockpit' })[0])
    fireEvent.click(screen.getByRole('button', { name: '打开当前闭环来源' }))
    fireEvent.click(screen.getByRole('button', { name: '打开来源带 系统地图修复' }))
    fireEvent.click(screen.getByRole('button', { name: '打开来源带任务 系统地图修复' }))

    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'cockpit' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'kairon' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'cockpit' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'DomainApps', taskQuery: 'family-hub' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', gapId: 'project-native-surface' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Performance' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'AlertCenter' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'cockpit' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'kairon' })
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'kairon' })
  })

  it('renders project portfolio drafts with evidence fields', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    mockTaskCenterFetch([...mockTasks, playbookDraft, projectPortfolioDraft, verificationReadyDraft])

    render(<TaskCenterPage />)
    await waitFor(() => {
      expect(screen.getAllByText('项目组合：修复 kairon').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('清单 1 · 项目 1 · 验证 1 · 领域 0 · 缺口 0 · 页面 0')).toBeInTheDocument()
    expect(screen.getByText(/只读草稿 · 1 项 · kairon 项目组合态势/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '查看任务 项目组合：修复 kairon' }))

    await waitFor(() => {
      expect(screen.getByText('组合状态')).toBeInTheDocument()
      expect(screen.getAllByText('blocked').length).toBeGreaterThan(0)
      expect(screen.getByText('组合分')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    const copyButtons = screen.getAllByRole('button', { name: '复制任务草稿' })
    fireEvent.click(copyButtons[copyButtons.length - 1])

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('项目组合草稿内容')
    })
  })

  it('renders domain app drafts with evidence fields', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    mockTaskCenterFetch([...mockTasks, playbookDraft, projectPortfolioDraft, verificationReadyDraft, domainAppDraft])

    render(<TaskCenterPage initialSearchQuery="system_map_domain_app" />)

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(screen.getAllByText('领域应用：处理 family-hub 服务').length).toBeGreaterThan(0)
      expect(screen.getByText('清单 1 · 项目 1 · 验证 1 · 领域 1 · 缺口 0 · 页面 0')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '复制领域草稿 family-hub' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '复制当前任务相关应用启动命令' })).toBeInTheDocument()
      expect(tasksList).not.toBeNull()
      expect(within(tasksList as HTMLElement).queryByText('Deploy gateway')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '复制领域草稿 family-hub' }))
    fireEvent.click(screen.getByRole('button', { name: '复制当前任务相关应用启动命令' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('领域应用草稿内容')
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('bun run family-hub:start')
    })

    fireEvent.click(screen.getByRole('button', { name: '查看任务 领域应用：处理 family-hub 服务' }))

    await waitFor(() => {
      expect(screen.getByText('运行状态')).toBeInTheDocument()
      expect(screen.getAllByText('stopped').length).toBeGreaterThan(0)
      expect(screen.getAllByText('安全态').length).toBeGreaterThan(0)
      expect(screen.getAllByText('passed').length).toBeGreaterThan(0)
      expect(screen.getByText('领域对象快照:')).toBeInTheDocument()
      expect(screen.getAllByText('family-hub 服务 · @家庭生活').length).toBeGreaterThan(0)
      expect(screen.getByText('对象状态:')).toBeInTheDocument()
      expect(screen.getByText('service_token')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '打开对象入口' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '复制启动命令' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '复制验证命令' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '复制启动命令' }))
    fireEvent.click(screen.getByRole('button', { name: '复制验证命令' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('bun run family-hub:start')
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('bun run family-hub:verify')
    })

    const copyButtons = screen.getAllByRole('button', { name: '复制任务草稿' })
    fireEvent.click(copyButtons[copyButtons.length - 1])

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('领域应用草稿内容')
    })
  })

  it('renders capability gap drafts with evidence fields', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    mockTaskCenterFetch([...mockTasks, playbookDraft, projectPortfolioDraft, verificationReadyDraft, domainAppDraft, capabilityGapDraft])

    render(<TaskCenterPage initialSearchQuery="system_map_capability_gap" />)

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(screen.getAllByText('能力缺口：处理 部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getByText('清单 1 · 项目 1 · 验证 1 · 领域 1 · 缺口 1 · 页面 0')).toBeInTheDocument()
      expect(tasksList).not.toBeNull()
      expect(within(tasksList as HTMLElement).queryByText('Deploy gateway')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '查看任务 能力缺口：处理 部分项目仍需补齐状态面' }))

    await waitFor(() => {
      expect(screen.getByText('严重度')).toBeInTheDocument()
      expect(screen.getAllByText('medium').length).toBeGreaterThan(0)
      expect(screen.getByText('证据')).toBeInTheDocument()
      expect(screen.getByText('mesh-router, toolbox')).toBeInTheDocument()
    })

    const copyButtons = screen.getAllByRole('button', { name: '复制任务草稿' })
    fireEvent.click(copyButtons[copyButtons.length - 1])

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('能力缺口草稿内容')
    })
  })

  it('renders page maturity drafts with evidence fields', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    mockTaskCenterFetch([
      ...mockTasks,
      playbookDraft,
      projectPortfolioDraft,
      verificationReadyDraft,
      domainAppDraft,
      capabilityGapDraft,
      pageMaturityDraft,
    ])

    render(<TaskCenterPage initialSearchQuery="system_map_page_maturity" />)

    await waitFor(() => {
      const tasksList = document.querySelector('.tasks-list')
      expect(screen.getAllByText('页面能力：补齐 性能监控').length).toBeGreaterThan(0)
      expect(screen.getByText('清单 1 · 项目 1 · 验证 1 · 领域 1 · 缺口 1 · 页面 1')).toBeInTheDocument()
      expect(tasksList).not.toBeNull()
      expect(within(tasksList as HTMLElement).queryByText('Deploy gateway')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '查看任务 页面能力：补齐 性能监控' }))

    await waitFor(() => {
      expect(screen.getByText('成熟度')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getAllByText('把页面接入至少一条使用路径。').length).toBeGreaterThan(0)
    })

    const copyButtons = screen.getAllByRole('button', { name: '复制任务草稿' })
    fireEvent.click(copyButtons[copyButtons.length - 1])

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('页面能力草稿内容')
    })
  })
})
