import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import Dashboard from '../Dashboard'
import { COCKPIT_PAGE_REGISTRY } from '../cockpitPageRegistry'

vi.mock('../HomePage', () => ({ default: () => <div>Home Mock</div> }))
vi.mock('../CockpitGuideView', () => ({ default: () => <div>Guide Mock</div> }))
vi.mock('../SystemMapView', () => ({
  default: ({
    focusProjectId,
    focusUsagePathId,
    focusGapId,
    focusCoverageDimensionId,
    focusPageId,
    focusFeatureDomainId,
  }: {
    focusProjectId?: string | null
    focusUsagePathId?: string | null
    focusGapId?: string | null
    focusCoverageDimensionId?: string | null
    focusPageId?: string | null
    focusFeatureDomainId?: string | null
  }) => <div>SystemMap Mock {focusProjectId} {focusUsagePathId} {focusGapId} {focusCoverageDimensionId} {focusPageId} {focusFeatureDomainId}</div>,
}))
vi.mock('../TaskCenterPage', () => ({
  default: ({
    initialSearchQuery,
    incomingDraft,
  }: {
    initialSearchQuery?: string
    incomingDraft?: { title?: string | null } | null
  }) => <div>TaskCenter Mock {initialSearchQuery} {incomingDraft?.title || 'no-draft'}</div>,
}))

vi.mock('../SandboxTerminal', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../MemoryInjector', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../EnginesView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../SettingsView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../WorkflowsView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../TopologyView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../ComputeView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../GBrain/GBrainDashboard', () => ({ DashboardPage: () => <div>Mock Page</div> }))
vi.mock('../KnowledgeHubView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../DebtView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../ObservabilityView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../QuestBoard', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../L4HealthView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../AlertCenterPage', () => ({
  default: ({ initialTab }: { initialTab?: string }) => <div>Alert Mock {initialTab || 'none'}</div>,
}))
vi.mock('../LogViewerPage', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../PerformanceMonitorPage', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../C2GStrategyView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../McpMeshView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../AssetsView', () => ({ default: () => <div>Mock Page</div> }))
vi.mock('../DomainAppsView', () => ({
  default: ({ taskQuery }: { taskQuery?: string }) => <div>DomainApps Mock {taskQuery || 'none'}</div>,
}))
vi.mock('../ResearchHubView', () => ({ default: () => <div>Research Mock</div> }))
vi.mock('../ProtocolWorkbenchView', () => ({ default: () => <div>Protocol Mock</div> }))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('Dashboard global search', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    window.location.hash = ''
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('aligns the sidebar navigation groups with the shared cockpit page registry', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          cockpit_pages: [],
          page_maturity: { summary: { total: 0, ready: 0, watch: 0, gap: 0, score: 0 }, items: [] },
          project_portfolio: { summary: { score: 0, status: 'healthy', projects: 0, blocked: 0, at_risk: 0, watch: 0, healthy: 0 }, weakest_dimensions: [], priority_projects: [] },
          projects: [],
          usage_paths: [],
          playbooks: [],
          feature_domains: [],
          roadmap: { lanes: [], items: [] },
          gaps: [],
          domain_apps: { summary: { total: 0, ready: 0, security_attention_apps: 0 }, attention_items: [] },
        }))
      }
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') {
        return Promise.resolve(okJson({ items: [] }))
      }
      if (url === '/api/domain-apps') return Promise.resolve(okJson({ summary: { total: 0, ready: 0, security_attention_apps: 0 }, items: [] }))
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('menu', { name: '控制台主导航' })).toBeInTheDocument()
    })

    const nav = screen.getByRole('menu', { name: '控制台主导航' })
    expect(within(nav).getByText('入口')).toBeInTheDocument()
    expect(within(nav).getByText('领域应用')).toBeInTheDocument()
    expect(within(nav).queryByText('亲子冒险')).not.toBeInTheDocument()
    expect(within(nav).getByRole('menuitem', { name: '积分冒险' })).toBeInTheDocument()
    expect(within(nav).getByRole('menuitem', { name: '应用中心' })).toBeInTheDocument()
    for (const page of COCKPIT_PAGE_REGISTRY) {
      expect(within(nav).getByRole('menuitem', { name: page.title })).toBeInTheDocument()
    }

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: '路由' } })
    await waitFor(() => {
      expect(screen.getAllByText('网格与 MCP').length).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: '记忆' } })
    await waitFor(() => {
      expect(screen.getAllByText('知识中枢').length).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: '治理巡检模式' } })
    await waitFor(() => {
      expect(screen.getByText('工作模式：治理巡检模式')).toBeInTheDocument()
      expect(screen.getByText('工作模式任务：治理巡检模式')).toBeInTheDocument()
    })
  })

  it('exposes every registered page through the command palette', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<Dashboard />)
    fireEvent.click(await screen.findByTitle('命令面板 (Ctrl+K)'))

    const paletteInput = await screen.findByPlaceholderText('输入命令...')
    const palette = paletteInput.closest('.command-palette')
    expect(palette).not.toBeNull()
    for (const page of COCKPIT_PAGE_REGISTRY) {
      expect(within(palette as HTMLElement).getByRole('option', { name: new RegExp(`^${page.title}`) })).toBeInTheDocument()
    }
    expect(within(palette as HTMLElement).getByRole('option', { name: /工作模式：日常值守模式/ })).toBeInTheDocument()
    expect(within(palette as HTMLElement).getByRole('option', { name: /工作模式任务：建设补位模式/ })).toBeInTheDocument()
    expect(within(palette as HTMLElement).getByRole('option', { name: /刷新当前页面数据/ })).toBeInTheDocument()
    expect(within(palette as HTMLElement).getByRole('option', { name: /导出全站运行快照/ })).toBeInTheDocument()
    expect(within(palette as HTMLElement).getByRole('option', { name: /承接当前页面任务/ })).toBeInTheDocument()
  })

  it('executes shell actions from the command palette', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<Dashboard />)
    fireEvent.click(await screen.findByTitle('命令面板 (Ctrl+K)'))
    const palette = await screen.findByRole('dialog', { name: '命令面板' })
    const input = within(palette).getByRole('textbox', { name: '命令面板搜索' })
    fireEvent.change(input, { target: { value: '刷新当前页面数据' } })
    fireEvent.click(within(palette).getByRole('option', { name: /刷新当前页面数据/ }))

    await waitFor(() => expect(screen.getByTestId('dashboard-page-view')).toHaveAttribute('data-refresh-token', '1'))
    expect(screen.queryByRole('dialog', { name: '命令面板' })).not.toBeInTheDocument()
  })

  it('supports keyboard selection across global search results', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ items: [] }))

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')
    fireEvent.change(search, { target: { value: '任务' } })

    const results = await screen.findByRole('listbox', { name: '全局搜索结果' })
    const options = within(results).getAllByRole('option')
    expect(options.length).toBeGreaterThan(1)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(search, { key: 'ArrowUp' })
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps Enter activation valid when refreshed search results shrink', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ items: [] }))

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')
    fireEvent.change(search, { target: { value: '任务' } })
    const results = await screen.findByRole('listbox', { name: '全局搜索结果' })
    const initialOptions = within(results).getAllByRole('option')
    expect(initialOptions.length).toBeGreaterThan(1)
    fireEvent.keyDown(search, { key: 'ArrowDown' })

    fireEvent.change(search, { target: { value: '没有这个入口' } })
    fireEvent.change(search, { target: { value: '任务' } })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(screen.getByTestId('dashboard-page-view')).toBeInTheDocument()
  })

  it('copies the current contextual URL for handoff', async () => {
    window.location.hash = '#system-map?project=mesh-router&task=repair'
    vi.mocked(fetch).mockResolvedValue(okJson({ items: [] }))

    render(<Dashboard />)
    fireEvent.click(await screen.findByRole('button', { name: '复制当前页面链接' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('#system-map?project=mesh-router&task=repair'))
      expect(screen.getByRole('status')).toHaveTextContent('链接已复制')
    })
  })

  it('toggles the command palette with Ctrl+K instead of registering duplicate handlers', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<Dashboard />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog', { name: '命令面板' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.queryByRole('dialog', { name: '命令面板' })).not.toBeInTheDocument()
  })

  it('moves focus into the mobile navigation and closes it with Escape', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<Dashboard />)
    const toggle = await screen.findByRole('button', { name: '打开主导航' })
    fireEvent.click(toggle)

    const sidebar = await screen.findByRole('complementary', { name: '控制台侧边栏' })
    const close = sidebar.querySelector('.mobile-nav-close') as HTMLButtonElement
    expect(close).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.getByRole('button', { name: '打开主导航' })).toHaveFocus())
  })

  it('refreshes only the active page workbench from the global header', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<Dashboard />)

    const pageView = await screen.findByTestId('dashboard-page-view')
    expect(pageView).toHaveAttribute('data-refresh-token', '0')
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const initialFetchCount = vi.mocked(fetch).mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: '刷新当前页面数据' }))

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page-view')).toHaveAttribute('data-refresh-token', '1')
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(initialFetchCount)
    })
  })

  it('keeps quick action keyboard shortcuts aligned with their visible actions', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<Dashboard />)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    await waitFor(() => expect(screen.getByText(/TaskCenter Mock/)).toBeInTheDocument())

    fireEvent.keyDown(window, { key: 'r', ctrlKey: true })
    await waitFor(() => expect(screen.getByTestId('dashboard-page-view')).toHaveAttribute('data-refresh-token', '1'))

    fireEvent.keyDown(window, { key: 'j', ctrlKey: true })
    const quickActions = await screen.findByRole('dialog', { name: '快捷操作' })
    fireEvent.click(within(quickActions).getByRole('option', { name: /刷新数据/ }))
    await waitFor(() => expect(screen.getByTestId('dashboard-page-view')).toHaveAttribute('data-refresh-token', '2'))

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('全局搜索输入框')).toHaveFocus()
  })

  it('exports a full-site snapshot across every shell data dimension', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ items: [] }))
    const createObjectURL = vi.fn().mockReturnValue('blob:cockpit-snapshot')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<Dashboard />)
    fireEvent.click(await screen.findByRole('button', { name: '导出全站运行快照' }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('快照已导出'))

    const payload = JSON.parse(await (createObjectURL.mock.calls[0][0] as Blob).text()) as {
      schema_version: number
      endpoint_count: number
      active_tab: string
      endpoints: Record<string, { ok: boolean }>
    }
    expect(payload.schema_version).toBe(2)
    expect(payload.endpoint_count).toBe(63)
    expect(payload.active_tab).toBe('Home')
    expect(Object.keys(payload.endpoints)).toEqual(expect.arrayContaining([
      'system_map',
      'tasks',
      'domain_apps',
      'alerts',
      'alert_rules',
      'mesh_services',
      'compute_status',
      'logs',
      'research',
      'metaos_workflows',
      'skills',
      'pipelines',
      'ecos_workflows',
      'ecos_workflow_backends',
      'ecos_workflow_actions',
      'ecos_workflow_logs',
      'health_summary',
      'metrics_system',
      'services_status',
      'bos_health',
      'l4_health',
      'debt',
      'omos_health',
      'omos_quests',
      'omo_doctor',
      'cron_summary',
      'bos_trends',
      'runtime_context',
      'e2e_status',
      'wave2_dashboard',
      'wave2_proposals_plan',
      'protocol_hub',
      'architecture_health',
      'governance_summary',
      'm0_status',
      'api_version',
      'api_version_history',
      'gbrain_stats',
      'gbrain_health',
      'gbrain_agents',
      'gbrain_requests',
      'gbrain_calibration_profile',
    ]))
    expect(payload.endpoints).not.toHaveProperty('instance')
    expect(payload.endpoints).not.toHaveProperty('metaos_plan')
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cockpit-snapshot')
    anchorClick.mockRestore()
  })

  it('keeps static page dimensions visible when the system map is unavailable', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/cockpit/system-map') return Promise.reject(new Error('system map offline'))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    const context = await screen.findByRole('region', { name: '当前页面承接' })
    expect(within(context).getByText('健康')).toBeInTheDocument()
    expect(within(context).getByText('告警')).toBeInTheDocument()
    expect(within(context).getByText('任务')).toBeInTheDocument()

    await waitFor(() => {
      const dimension = screen.getByLabelText('覆盖维度 页面覆盖')
      expect(within(dimension).getByText('N/A')).toBeInTheDocument()
      expect(within(dimension).getByText('数据不可用')).toBeInTheDocument()
      const overview = screen.getByRole('region', { name: '整站能力总览' })
      const pagesTile = within(overview).getByText('页面覆盖').closest('.dashboard-overview-tile') as HTMLElement
      expect(within(pagesTile).getByText('N/A')).toBeInTheDocument()
    })
  })

  it('searches dynamic projects and task drafts from SystemMap and TaskCenter', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          cockpit_pages: [
            { id: 'Home', title: '首页', group: '入口', purpose: '健康总览', dimensions: ['health'] },
            { id: 'Overview', title: '概览中心', group: '运行大盘', purpose: '运行态势', dimensions: ['runtime'] },
            { id: 'TaskCenter', title: '任务中心', group: '开发工具', purpose: '任务草稿', dimensions: ['tasks'] },
          ],
          project_portfolio: {
            summary: { score: 76, status: 'blocked', projects: 19, blocked: 10, at_risk: 7, watch: 0, healthy: 2 },
            weakest_dimensions: [
              { id: 'runtime_probe', title: '运行探针', score: 21, failed: 10, warning: 5 },
              { id: 'verification', title: '验证证据', score: 21, failed: 8, warning: 7 },
            ],
            priority_projects: [
              {
                id: 'mesh-router',
                layer: 'L0',
                status: 'blocked',
                score: 50,
                primary_gap: '基础状态未就绪',
                next_action: '确认项目是否已归档、迁移或需要从注册表下线。',
              },
            ],
          },
          page_maturity: {
            summary: { total: 22, ready: 11, watch: 3, gap: 8, score: 55 },
            items: [
              {
                page_id: 'Performance',
                score: 20,
                status: 'gap',
                next_action: '把页面接入至少一条使用路径。',
                page: { id: 'Performance', title: '性能监控', group: '开发工具' },
              },
              {
                page_id: 'Sandbox',
                score: 30,
                status: 'gap',
                next_action: '补功能域映射。',
                page: { id: 'Sandbox', title: '隔离沙箱', group: '开发工具' },
              },
              {
                page_id: 'Overview',
                score: 50,
                status: 'watch',
                next_action: '补路线图。',
                page: { id: 'Overview', title: '概览中心', group: '运行大盘' },
              },
            ],
          },
          projects: [
            {
              id: 'family-hub',
              layer: 'L4',
              stack: 'Python',
              role: '家庭任务服务',
              cockpit_page: 'DomainApps',
              operational: { next_action: '保持 contract 同步。', risks: [] },
              portfolio: { status: 'at_risk', primary_gap: '运行探针缺口', next_action: '补健康检查。' },
            },
          ],
          usage_paths: [
            {
              id: 'daily-ops',
              title: '日常体检',
              intent: '每天确认健康、告警和任务状态。',
              steps: ['看首页', '查告警', '看任务'],
              pages: [
                { id: 'Home', title: '首页', purpose: '健康总览' },
                { id: 'AlertCenter', title: '告警中心', purpose: '告警处理' },
                { id: 'TaskCenter', title: '任务中心', purpose: '任务草稿' },
              ],
            },
            {
              id: 'dev-triage',
              title: '开发排障',
              intent: '定位日志、性能和沙箱侧的问题。',
              steps: ['看日志', '看性能', '进沙箱'],
              pages: [
                { id: 'LogViewer', title: '日志查看器', purpose: '定位问题' },
                { id: 'Performance', title: '性能监控', purpose: '看资源瓶颈' },
                { id: 'Sandbox', title: '隔离沙箱', purpose: '执行验证' },
              ],
            },
          ],
          playbooks: [
            {
              id: 'daily-health-check',
              title: '每日 5 分钟体检',
              goal: '确认 Cockpit 日常状态。',
              frequency: 'daily',
              owner: 'operator',
              risk: 'low',
              steps: [
                { page_id: 'Home', action: '看首页健康分', evidence: '健康分可见', done_when: '无 P0 告警' },
                { page_id: 'TaskCenter', action: '复制任务草稿', evidence: '草稿可见', done_when: '高优任务已确认' },
              ],
            },
          ],
          feature_domains: [
            {
              id: 'runtime-ops',
              title: '运行态势',
              english: 'Runtime Operations',
              cockpit_page: 'Home',
              coverage: 'native',
              providers: ['Home', 'AlertCenter'],
              capability_items: ['health', 'alert'],
            },
            {
              id: 'task-loop',
              title: '任务闭环',
              english: 'Task Loop',
              cockpit_page: 'TaskCenter',
              coverage: 'native',
              providers: ['TaskCenter'],
              capability_items: ['draft', 'verify'],
            },
          ],
          roadmap: {
            lanes: [
              { id: 'now', title: '现在修', count: 3 },
              { id: 'next', title: '下一步', count: 2 },
            ],
            items: [
              {
                id: 'daily-console',
                title: '日常路径工作台',
                priority: 'P1',
                stage: 'now',
                status: 'planned',
                domain: 'runtime',
                cockpit_page: 'Home',
                problem: '用户需要按目标路径进入日常操作。',
                actions: ['聚合使用路径。'],
                acceptance: ['搜索可定位日常体检。'],
              },
            ],
          },
          gaps: [
            {
              id: 'project-native-surface',
              title: '部分项目仍需补齐状态面',
              severity: 'medium',
              evidence: '仍有项目缺口。',
              next: '继续补齐。',
            },
          ],
        }))
      }
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') {
        return Promise.resolve(okJson({
          items: [
            {
              id: 'portfolio-mesh-router',
              title: '项目组合：修复 mesh-router',
              description: '确认项目是否已归档。',
              tags: ['project-portfolio', 'draft'],
              source: { type: 'system_map_project_portfolio', id: 'mesh-router', title: 'mesh-router 项目组合态势' },
              draft: { kind: 'project_portfolio_task' },
            },
            {
              id: 'verification-ready-cockpit',
              title: '验证补证：cockpit',
              description: '把已有验证命令补成正式证据。',
              tags: ['verification-ready', 'draft', 'cockpit'],
              source: { type: 'system_map_verification_ready', id: 'cockpit', title: 'cockpit 验证补证' },
              draft: {
                kind: 'verification_ready_task',
                evidence_fields: [
                  { label: '验证命令', value: 'uv run pytest -q' },
                ],
              },
            },
            {
              id: 'domain-app-family-hub',
              title: '领域应用：处理 family-hub 服务',
              description: '按登记启动命令拉起服务。',
              tags: ['domain-app', 'draft', 'family-hub'],
              source: { type: 'system_map_domain_app', id: 'family-hub', title: 'family-hub 服务 领域应用态势' },
              draft: { kind: 'domain_app_task' },
            },
            {
              id: 'capability-gap-project-native-surface',
              title: '能力缺口：处理 部分项目仍需补齐状态面',
              description: '优先补齐高频项目的文档、命令、构建清单和运行探针。',
              tags: ['capability-gap', 'draft', 'project-native-surface'],
              source: {
                type: 'system_map_capability_gap',
                id: 'project-native-surface',
                title: '部分项目仍需补齐状态面 能力缺口',
              },
              draft: { kind: 'capability_gap_task' },
            },
            {
              id: 'page-maturity-Performance',
              title: '页面能力：补齐 性能监控',
              description: '把页面接入至少一条使用路径。',
              tags: ['page-maturity', 'draft', 'Performance', '页面能力'],
              source: {
                type: 'system_map_page_maturity',
                id: 'Performance',
                title: '性能监控 页面成熟度',
              },
              draft: { kind: 'page_maturity_task' },
            },
          ],
        }))
      }
      if (url === '/api/domain-apps') {
        return Promise.resolve(okJson({
          summary: { total: 3, ready: 2, security_attention_apps: 1 },
          items: [
            {
              id: 'family-dashboard-app',
              name: '家庭驾驶舱',
              domain: { id: 'family', name: '家庭生活' },
              description: '家庭生活领域的 Next.js Web app。',
              category: 'external',
              risk_level: 'high',
              runtime: {
                status: 'stopped',
                launch: { status: 'ready', url: 'http://localhost:3000' },
                api: { status: 'ready', url: 'http://localhost:3000/api' },
              },
              links: { launch_url: 'http://localhost:3000', api_url: 'http://localhost:3000/api' },
              auth: { type: 'single_password_cookie' },
              freshness: { status: 'built' },
              security_summary: { posture: 'warn' },
              commands: { start: 'bun dev', verify: 'bun run build' },
            },
            {
              id: 'opc-workbench',
              name: 'OPC 作战台',
              domain: { id: 'opc', name: 'OPC' },
              description: '内容发布、周回顾、指标看板统一入口。',
              category: 'workspace',
              risk_level: 'medium',
              runtime: {
                status: 'ready',
                launch: { status: 'ready', url: null },
                api: { status: 'offline', url: null },
              },
              links: {},
              auth: { type: 'workspace_ssot' },
              freshness: { status: 'ssot' },
              security_summary: { posture: 'passed' },
              commands: { verify: 'uv run opc verify' },
            },
          ],
        }))
      }
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

	    await waitFor(() => {
	      expect(screen.getByLabelText('页面覆盖状态')).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '当前页面承接' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '当前页执行与证据' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '关键页面专属工作台' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '整站能力总览' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '覆盖维度盘点' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '功能工作带矩阵' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '页面闭环覆盖审计' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '页面能力总表' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '重点补位页面' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '整站使用模式' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '优先补位路线' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '执行对象与验收' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '应用接入与运行' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '全站闭环缺口' })).toBeInTheDocument()
	      expect(screen.getByRole('region', { name: '缺口总览' })).toBeInTheDocument()
	      expect(screen.getByText('页面成熟度')).toBeInTheDocument()
      expect(screen.getAllByText('55%').length).toBeGreaterThan(0)
      expect(screen.getByText((_, element) => element?.textContent?.trim() === '8 缺口')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /打开成熟度缺口页面 性能监控/ })).toBeInTheDocument()
      expect(screen.getByLabelText('项目覆盖状态')).toBeInTheDocument()
      expect(screen.getByText('项目覆盖')).toBeInTheDocument()
      expect(screen.getAllByText('76%').length).toBeGreaterThan(0)
      expect(screen.getByText((_, element) => element?.textContent?.trim() === '10 阻塞')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /打开项目 mesh-router/ })).toBeInTheDocument()
      expect(screen.getByText('运行探针 21%')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '全站下一步' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '侧边推进队列' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '使用路径入口' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '当前分区入口' })).toBeInTheDocument()
      expect(screen.getAllByText('日常体检').length).toBeGreaterThan(0)
      expect(screen.getByText('当前分区路径')).toBeInTheDocument()
      expect(screen.getAllByText('页面补位：性能监控').length).toBeGreaterThan(0)
      expect(screen.getAllByText('项目修复：mesh-router').length).toBeGreaterThan(0)
	      expect(screen.getAllByText('领域挂载：家庭驾驶舱').length).toBeGreaterThan(0)
	      expect(screen.getAllByText('任务承接：项目组合：修复 mesh-router').length).toBeGreaterThan(0)
	    })

	    const pageContextRegion = screen.getByRole('region', { name: '当前页面承接' })
	    expect(within(pageContextRegion).getByText('页面定位')).toBeInTheDocument()
	    expect(within(pageContextRegion).getByText('首页')).toBeInTheDocument()
	    expect(within(pageContextRegion).getByText('推荐路径')).toBeInTheDocument()
	    expect(within(pageContextRegion).getByRole('button', { name: /查看当前页面覆盖 首页/ })).toBeInTheDocument()
	    expect(within(pageContextRegion).getByRole('button', { name: /打开当前页面路径 日常体检/ })).toBeInTheDocument()
	    expect(within(pageContextRegion).getByRole('button', { name: /打开当前页面任务 首页/ })).toBeInTheDocument()
	    expect(within(pageContextRegion).getByRole('button', { name: /打开当前工作带 入口/ })).toBeInTheDocument()
	    const pageChecklistRegion = within(pageContextRegion).getByRole('region', { name: '当前页面缺口清单' })
	    expect(within(pageChecklistRegion).getByText('任务承接')).toBeInTheDocument()
	    expect(within(pageChecklistRegion).getAllByText('已接通').length).toBeGreaterThan(0)
	    expect(within(pageChecklistRegion).getAllByText('待补位').length).toBeGreaterThan(0)
	    const pageExecutionRegion = screen.getByRole('region', { name: '当前页执行与证据' })
	    expect(within(pageExecutionRegion).getByText('共 3 条执行线索')).toBeInTheDocument()
	    const pagePlaybookCard = within(pageExecutionRegion).getByLabelText('当前页执行 每日 5 分钟体检')
	    expect(within(pagePlaybookCard).getByText('看首页健康分')).toBeInTheDocument()
	    expect(within(pagePlaybookCard).getByText('健康分可见')).toBeInTheDocument()
	    expect(within(pagePlaybookCard).getByRole('button', { name: /打开当前页对象 每日 5 分钟体检/ })).toBeInTheDocument()
	    const pageWorkbenchRegion = screen.getByRole('region', { name: '关键页面专属工作台' })
	    expect(within(pageWorkbenchRegion).getByText('共 3 个动作位')).toBeInTheDocument()
	    const pathWorkbenchCard = within(pageWorkbenchRegion).getByLabelText('页面工作台 首页 · 路径工作台')
	    expect(within(pathWorkbenchCard).getByText('首选使用路径')).toBeInTheDocument()
	    expect(within(pathWorkbenchCard).getByRole('button', { name: /打开页面工作台对象 首页 · 路径工作台/ })).toBeInTheDocument()
	    const groupWorkbenchCard = within(pageWorkbenchRegion).getByLabelText('页面工作台 首页 · 入口分发')
	    expect(within(groupWorkbenchCard).getByText('入口工作带')).toBeInTheDocument()
	    expect(within(groupWorkbenchCard).getByRole('button', { name: /打开页面工作台动作 首页 · 入口分发/ })).toBeInTheDocument()

    const usageRegion = screen.getByRole('region', { name: '使用路径入口' })
    expect(within(usageRegion).getAllByRole('button', { name: /打开使用路径/ })[0]).toHaveAccessibleName('打开使用路径 日常体检')
    const groupRegion = screen.getByRole('region', { name: '当前分区入口' })
    expect(within(groupRegion).getByText('入口')).toBeInTheDocument()
    expect(within(groupRegion).getByRole('button', { name: /打开分区页面 系统地图/ })).toBeInTheDocument()
    expect(within(groupRegion).getByRole('button', { name: /打开分区路径 日常体检/ })).toBeInTheDocument()

	    const overviewRegion = screen.getByRole('region', { name: '整站能力总览' })
	    expect(within(overviewRegion).getByRole('button', { name: /打开总览 领域挂载/ })).toBeInTheDocument()
	    expect(within(overviewRegion).getByText('当前分区 入口')).toBeInTheDocument()

	    const dimensionRegion = screen.getByRole('region', { name: '覆盖维度盘点' })
	    expect(within(dimensionRegion).getByText('共 8 个维度')).toBeInTheDocument()
	    const capabilityDomainCard = within(dimensionRegion).getByLabelText('覆盖维度 能力域')
	    expect(within(capabilityDomainCard).getByText('能力域')).toBeInTheDocument()
	    expect(within(capabilityDomainCard).getByText('2')).toBeInTheDocument()
	    expect(within(capabilityDomainCard).getByRole('button', { name: /打开覆盖维度 能力域/ })).toBeInTheDocument()

	    const architectureRegion = screen.getByRole('region', { name: '功能工作带矩阵' })
	    expect(within(architectureRegion).getByText('工作带 7 组')).toBeInTheDocument()
	    const devToolsArchitectureCard = within(architectureRegion).getByLabelText('工作带架构 开发工具')
	    expect(within(devToolsArchitectureCard).getByText('页面 4')).toBeInTheDocument()
	    expect(within(devToolsArchitectureCard).getByText('路径 2')).toBeInTheDocument()
	    expect(within(devToolsArchitectureCard).getByRole('button', { name: /打开工作带 开发工具/ })).toBeInTheDocument()

	    const pageAuditRegion = screen.getByRole('region', { name: '页面闭环覆盖审计' })
	    expect(within(pageAuditRegion).getByText((_, element) => element?.textContent?.trim() === '工作台缺口 0')).toBeInTheDocument()
    expect(within(pageAuditRegion).getByText((_, element) => element?.textContent?.trim() === '焦点承接缺口 0')).toBeInTheDocument()
	    fireEvent.click(within(pageAuditRegion).getByRole('button', { name: '展开全部页面闭环覆盖审计列表' }))
	    const meshAuditCard = within(pageAuditRegion).getByLabelText('页面闭环 网格与 MCP')
	    expect(within(meshAuditCard).getByText('工作台')).toBeInTheDocument()
	    expect(within(meshAuditCard).getByText('焦点承接')).toBeInTheDocument()
	    expect(within(meshAuditCard).getByRole('button', { name: /打开页面闭环 网格与 MCP/ })).toBeInTheDocument()
	    expect(within(meshAuditCard).getByRole('button', { name: /打开页面闭环动作 网格与 MCP/ })).toBeInTheDocument()

	    const pageCapabilityRegion = screen.getByRole('region', { name: '页面能力总表' })
	    expect(within(pageCapabilityRegion).getByText('页面能力总表')).toBeInTheDocument()
	    const overviewCapabilityCard = within(pageCapabilityRegion).getByLabelText('页面能力 概览中心')
	    expect(within(overviewCapabilityCard).getByText('运行态势')).toBeInTheDocument()
	    expect(within(overviewCapabilityCard).getByText(/怎么用：还没挂进明确使用路径 · 能力域：runtime/)).toBeInTheDocument()
	    expect(within(overviewCapabilityCard).getByRole('button', { name: /打开页面能力 概览中心/ })).toBeInTheDocument()
	    expect(within(overviewCapabilityCard).getByRole('button', { name: /查看页面能力任务 概览中心/ })).toBeInTheDocument()

	    const sprintRegion = screen.getByRole('region', { name: '重点补位页面' })
	    expect(within(sprintRegion).getByText('重点补位页面')).toBeInTheDocument()
	    expect(within(sprintRegion).getByLabelText('重点补位 性能监控')).toBeInTheDocument()
	    fireEvent.click(within(sprintRegion).getByRole('button', { name: '聚焦补位页面 性能监控' }))
	    const sprintDetailRegion = within(sprintRegion).getByRole('region', { name: '当前补位页面' })
	    expect(within(sprintDetailRegion).getByText('性能监控')).toBeInTheDocument()
	    expect(within(sprintDetailRegion).getByText('补能力域映射。')).toBeInTheDocument()
	    fireEvent.click(within(sprintDetailRegion).getByRole('button', { name: '打开补位任务 性能监控' }))
	    await waitFor(() => {
	      expect(screen.getByText(/TaskCenter Mock 性能监控 补齐性能监控的页面承接/)).toBeInTheDocument()
	    })

	    const usageModeRegion = screen.getByRole('region', { name: '整站使用模式' })
	    expect(within(usageModeRegion).getByText('共 2 条模式')).toBeInTheDocument()
	    const dailyOpsCard = within(usageModeRegion).getByLabelText('使用模式 日常体检')
	    expect(within(dailyOpsCard).getByText('首页')).toBeInTheDocument()
	    expect(within(dailyOpsCard).getByText('清单 1')).toBeInTheDocument()
	    expect(within(dailyOpsCard).getByRole('button', { name: /打开使用模式 日常体检/ })).toBeInTheDocument()

	    const priorityRouteRegion = screen.getByRole('region', { name: '优先补位路线' })
	    expect(within(priorityRouteRegion).getByText('共 5 条路线')).toBeInTheDocument()
	    expect(within(priorityRouteRegion).getByText('覆盖维度：运行探针')).toBeInTheDocument()
	    expect(within(priorityRouteRegion).getByText('能力缺口：部分项目仍需补齐状态面')).toBeInTheDocument()
	    expect(within(priorityRouteRegion).getByRole('button', { name: /打开补位路线 覆盖维度：运行探针/ })).toBeInTheDocument()

	    const executionRegion = screen.getByRole('region', { name: '执行对象与验收' })
	    expect(within(executionRegion).getByText('共 6 个执行对象')).toBeInTheDocument()
	    const dailyExecutionCard = within(executionRegion).getByLabelText('执行对象 日常体检')
	    expect(within(dailyExecutionCard).getByText('看首页健康分')).toBeInTheDocument()
	    expect(within(dailyExecutionCard).getByText('健康分可见')).toBeInTheDocument()
	    const familyExecutionCard = within(executionRegion).getByLabelText('执行对象 家庭驾驶舱')
	    expect(within(familyExecutionCard).getAllByText('bun dev').length).toBeGreaterThan(0)
	    expect(within(familyExecutionCard).getByRole('button', { name: /打开执行对象 家庭驾驶舱/ })).toBeInTheDocument()

	    const domainOpsRegion = screen.getByRole('region', { name: '应用接入与运行' })
	    expect(within(domainOpsRegion).getByText('共 2 个应用')).toBeInTheDocument()
	    const familyOpsCard = within(domainOpsRegion).getByLabelText('应用运行 家庭驾驶舱')
	    expect(within(familyOpsCard).getByText('http://localhost:3000')).toBeInTheDocument()
	    expect(within(familyOpsCard).getAllByText((_, element) => element?.textContent?.includes('single_password_cookie') ?? false).length).toBeGreaterThan(0)
	    expect(within(familyOpsCard).getAllByText('bun run build').length).toBeGreaterThan(0)
	    expect(within(familyOpsCard).getByRole('button', { name: /打开应用运行 家庭驾驶舱/ })).toBeInTheDocument()

	    const closureRegion = screen.getByRole('region', { name: '全站闭环缺口' })
	    expect(within(closureRegion).getByText('缺路径 1')).toBeInTheDocument()
	    expect(within(closureRegion).getByText('页面闭环：概览中心')).toBeInTheDocument()
	    expect(within(closureRegion).getByText('页面闭环：性能监控')).toBeInTheDocument()
	    expect(within(closureRegion).getByRole('button', { name: /打开闭环缺口 页面闭环：概览中心/ })).toBeInTheDocument()
	    expect(within(closureRegion).getByRole('button', { name: /筛选缺能力域 4/ })).toBeInTheDocument()
	    expect(within(closureRegion).getByText('展开全部 7 项')).toBeInTheDocument()
	    expect(within(closureRegion).getByRole('button', { name: /展开全部闭环缺口列表/ })).toBeInTheDocument()
	    const closureTemplateRegion = within(closureRegion).getByRole('region', { name: '闭环缺口补位模板' })
	    expect(within(closureTemplateRegion).getByText('运行大盘打法 · 缺路线图补位模板')).toBeInTheDocument()
	    expect(within(closureTemplateRegion).getByRole('button', { name: /执行补位模板 回概览中心核运行视角/ })).toBeInTheDocument()
	    const closureDraftRegion = within(closureRegion).getByRole('region', { name: '闭环任务草稿工坊' })
	    expect(within(closureDraftRegion).getByText('补齐概览中心的路线图承接')).toBeInTheDocument()
	    fireEvent.click(within(closureDraftRegion).getByRole('button', { name: /复制任务草稿 补齐概览中心的路线图承接/ }))
	    await waitFor(() => {
	      expect(navigator.clipboard.writeText).toHaveBeenCalled()
	      expect(within(closureDraftRegion).getByText('已复制任务草稿：补齐概览中心的路线图承接')).toBeInTheDocument()
	    })
	    fireEvent.click(within(closureDraftRegion).getByRole('button', { name: /打开任务草稿 补齐概览中心的路线图承接/ }))
	    await waitFor(() => {
	      expect(screen.getByText(/TaskCenter Mock 概览中心 补齐概览中心的路线图承接/)).toBeInTheDocument()
	    })

	    fireEvent.click(within(closureRegion).getByRole('button', { name: /展开全部闭环缺口列表/ }))

	    await waitFor(() => {
	      expect(within(closureRegion).getByRole('button', { name: /收起闭环缺口列表/ })).toBeInTheDocument()
	    })

	    fireEvent.click(within(closureRegion).getByRole('button', { name: /筛选缺能力域 4/ }))

	    await waitFor(() => {
	      expect(within(closureRegion).getByRole('button', { name: /筛选缺能力域 4/ })).toHaveAttribute('aria-pressed', 'true')
	      expect(within(closureRegion).getByText('页面闭环：日志查看器')).toBeInTheDocument()
	      expect(within(closureTemplateRegion).getByText('运行大盘打法 · 缺能力域补位模板')).toBeInTheDocument()
	    })

	    fireEvent.click(within(closureRegion).getByRole('button', { name: /筛选全部 7/ }))

	    const gapRegion = screen.getByRole('region', { name: '缺口总览' })
	    expect(within(gapRegion).getByRole('button', { name: /打开缺口 项目修复：mesh-router/ })).toBeInTheDocument()

	    fireEvent.click(within(closureRegion).getByRole('button', { name: /打开闭环缺口 页面闭环：概览中心/ }))

	    await waitFor(() => {
	      expect(screen.getByText(/SystemMap Mock.*Overview/)).toBeInTheDocument()
	    })

	    fireEvent.click(screen.getByRole('button', { name: /打开使用路径 日常体检/ }))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock\s+daily-ops/)).toBeInTheDocument()
    })

    fireEvent.click(within(overviewRegion).getByRole('button', { name: /打开总览 领域挂载/ }))

    await waitFor(() => {
      expect(screen.getByText(/DomainApps Mock family-dashboard-app/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('menuitem', { name: '性能监控' }))

	    await waitFor(() => {
	      expect(screen.getByText('Mock Page')).toBeInTheDocument()
	      expect(screen.getByText('开发工具 · 2/2')).toBeInTheDocument()
	    })

	    const pageContextAfterSwitch = screen.getByRole('region', { name: '当前页面承接' })
	    expect(within(pageContextAfterSwitch).getByText('性能监控')).toBeInTheDocument()
	    expect(within(pageContextAfterSwitch).getByText('缺口 · 20分')).toBeInTheDocument()
	    expect(within(pageContextAfterSwitch).getByRole('button', { name: /打开当前页面路径 开发排障/ })).toBeInTheDocument()
	    const pageChecklistAfterSwitch = within(pageContextAfterSwitch).getByRole('region', { name: '当前页面缺口清单' })
	    expect(within(pageChecklistAfterSwitch).getByText('能力域')).toBeInTheDocument()
	    expect(within(pageChecklistAfterSwitch).getAllByText('待补位').length).toBeGreaterThan(0)
	    const pageExecutionAfterSwitch = screen.getByRole('region', { name: '当前页执行与证据' })
	    expect(within(pageExecutionAfterSwitch).getByText('共 2 条执行线索')).toBeInTheDocument()
	    expect(within(pageExecutionAfterSwitch).getByText('页面能力：补齐 性能监控')).toBeInTheDocument()
	    expect(within(pageExecutionAfterSwitch).getAllByText('把页面接入至少一条使用路径。').length).toBeGreaterThan(0)
	    const pageWorkbenchAfterSwitch = screen.getByRole('region', { name: '关键页面专属工作台' })
	    expect(within(pageWorkbenchAfterSwitch).getByText('共 3 个动作位')).toBeInTheDocument()
	    const performanceWorkbenchCard = within(pageWorkbenchAfterSwitch).getByLabelText('页面工作台 性能监控 · 页面补位')
	    expect(within(performanceWorkbenchCard).getByText('当前草稿 · page_maturity_task')).toBeInTheDocument()
	    const devWorkbenchCard = within(pageWorkbenchAfterSwitch).getByLabelText('页面工作台 性能监控 · 开发排障链')
	    expect(within(devWorkbenchCard).getByText('开发工具联动')).toBeInTheDocument()
	    expect(within(devWorkbenchCard).getByRole('button', { name: /打开页面工作台对象 性能监控 · 开发排障链/ })).toBeInTheDocument()

	    const usageRegionAfterSwitch = screen.getByRole('region', { name: '使用路径入口' })
	    expect(within(usageRegionAfterSwitch).getAllByRole('button', { name: /打开使用路径/ })[0]).toHaveAccessibleName('打开使用路径 开发排障')
	    const groupRegionAfterSwitch = screen.getByRole('region', { name: '当前分区入口' })
	    expect(within(groupRegionAfterSwitch).getByText('开发工具')).toBeInTheDocument()
	    expect(within(groupRegionAfterSwitch).getByRole('button', { name: /打开分区页面 任务中心/ })).toBeInTheDocument()
	    expect(within(groupRegionAfterSwitch).getByRole('button', { name: /打开分区路径 开发排障/ })).toBeInTheDocument()

	    fireEvent.click(within(pageChecklistAfterSwitch).getByRole('button', { name: /打开当前页面链路 能力域/ }))

	    await waitFor(() => {
	      expect(screen.getByText(/SystemMap Mock.*Performance/)).toBeInTheDocument()
	    })

	    fireEvent.click(screen.getByRole('menuitem', { name: '性能监控' }))

	    await waitFor(() => {
	      expect(screen.getByText('Mock Page')).toBeInTheDocument()
	    })

	    const pageContextAfterReturn = screen.getByRole('region', { name: '当前页面承接' })
	    fireEvent.click(within(pageContextAfterReturn).getByRole('button', { name: /打开当前页面任务 性能监控/ }))

	    await waitFor(() => {
	      expect(screen.getByText(/TaskCenter Mock Performance/)).toBeInTheDocument()
	    })

	    fireEvent.click(within(groupRegionAfterSwitch).getByRole('button', { name: /打开分区页面 任务中心/ }))

    await waitFor(() => {
      expect(screen.getByText(/TaskCenter Mock/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开全站动作 领域挂载：家庭驾驶舱/ }))

    await waitFor(() => {
      expect(screen.getByText(/DomainApps Mock family-dashboard-app/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开全站动作 页面补位：性能监控/ }))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*Performance/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /侧边推进 任务承接：项目组合：修复 mesh-router/ }))

    await waitFor(() => {
      expect(screen.getByText(/TaskCenter Mock mesh-router 项目组合：修复 mesh-router/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开成熟度缺口页面 性能监控/ }))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*Performance/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开项目 mesh-router/ }))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock mesh-router/)).toBeInTheDocument()
    })

    const search = screen.getByLabelText('全局搜索输入框')
    fireEvent.change(search, { target: { value: 'mesh-router' } })

    await waitFor(() => {
      expect(screen.getByText('优先项目：mesh-router')).toBeInTheDocument()
      expect(screen.getByText('任务草稿：项目组合：修复 mesh-router')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('任务草稿：项目组合：修复 mesh-router'))

    await waitFor(() => {
      expect(screen.getByText(/TaskCenter Mock mesh-router 项目组合：修复 mesh-router/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '补证' } })
    await waitFor(() => {
      expect(screen.getByText('任务草稿：验证补证：cockpit')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('任务草稿：验证补证：cockpit'))

    await waitFor(() => {
      expect(screen.getByText(/TaskCenter Mock cockpit 验证补证：cockpit/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: 'family-hub' } })
    await waitFor(() => {
      expect(screen.getByText('项目：family-hub')).toBeInTheDocument()
      expect(screen.getByText('任务草稿：领域应用：处理 family-hub 服务')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('项目：family-hub'))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock family-hub/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '能力不足' } })
    await waitFor(() => {
      expect(screen.getAllByText('能力缺口：部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getByText('任务草稿：能力缺口：处理 部分项目仍需补齐状态面')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByText('能力缺口：部分项目仍需补齐状态面')[0])

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*project-native-surface/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '能力不足' } })
    await waitFor(() => {
      expect(screen.getByText('任务草稿：能力缺口：处理 部分项目仍需补齐状态面')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('任务草稿：能力缺口：处理 部分项目仍需补齐状态面'))

    await waitFor(() => {
      expect(screen.getByText(/TaskCenter Mock project-native-surface 能力缺口：处理 部分项目仍需补齐状态面/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: 'Performance' } })
    await waitFor(() => {
      expect(screen.getByText('页面能力：性能监控')).toBeInTheDocument()
      expect(screen.getByText('任务草稿：页面能力：补齐 性能监控')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('任务草稿：页面能力：补齐 性能监控'))

    await waitFor(() => {
      expect(screen.getByText(/TaskCenter Mock Performance 页面能力：补齐 性能监控/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '家庭驾驶舱' } })
    await waitFor(() => {
      expect(screen.getByText('领域应用：家庭驾驶舱')).toBeInTheDocument()
      expect(screen.getByText('应用中心：领域挂载总览')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('领域应用：家庭驾驶舱'))

    await waitFor(() => {
      expect(screen.getByText(/DomainApps Mock family-dashboard-app/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: 'OPC' } })
    await waitFor(() => {
      expect(screen.getByText('领域应用：OPC 作战台')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('领域应用：OPC 作战台'))

    await waitFor(() => {
      expect(screen.getByText(/DomainApps Mock opc-workbench/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: 'Performance' } })
    await waitFor(() => {
      expect(screen.getByText('页面能力：性能监控')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('页面能力：性能监控'))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*Performance/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '体检' } })
    await waitFor(() => {
      expect(screen.getByText('使用路径：日常体检')).toBeInTheDocument()
      expect(screen.getByText('操作清单：每日 5 分钟体检')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('使用路径：日常体检'))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock\s+daily-ops/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '运行态势' } })
    await waitFor(() => {
      expect(screen.getByText('能力域：运行态势')).toBeInTheDocument()
      expect(screen.getAllByText('覆盖维度：运行探针').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByText('能力域：运行态势'))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*runtime-ops/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '运行探针' } })
    await waitFor(() => {
      expect(screen.getAllByText('覆盖维度：运行探针').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByText('覆盖维度：运行探针')[0])

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*runtime_probe/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /运行探针 21%/ }))

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*runtime_probe/)).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '入口' } })
    await waitFor(() => {
      expect(screen.getByText('页面分组：入口')).toBeInTheDocument()
      expect(screen.getByText('页面：首页')).toBeInTheDocument()
    })

    fireEvent.change(search, { target: { value: '概览中心 页面' } })
    await waitFor(() => {
      expect(screen.getByText('页面：概览中心')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('页面：概览中心'))

    await waitFor(() => {
      expect(screen.getByText('概览中心 (Overview)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('命令面板 (Ctrl+K)'))
    const palette = await screen.findByRole('dialog', { name: '命令面板' })
    const paletteInput = within(palette).getByRole('textbox', { name: '命令面板搜索' })
    fireEvent.change(paletteInput, { target: { value: 'mesh-router' } })
    const projectCommands = within(palette).getAllByRole('option', { name: /mesh-router/ })
    expect(projectCommands.length).toBeGreaterThan(0)
    fireEvent.click(projectCommands[0])

    await waitFor(() => expect(window.location.hash).toContain('project=mesh-router'))
  }, 45000)

  it('shows a complete coverage state when page maturity has no attention items', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          page_maturity: {
            summary: { total: 22, ready: 22, watch: 0, gap: 0, score: 87 },
            items: [],
            attention_items: [],
          },
          usage_paths: [],
          playbooks: [],
          projects: [],
          project_portfolio: {
            summary: { score: 100, status: 'healthy', projects: 0, blocked: 0, at_risk: 0, watch: 0, healthy: 0 },
            priority_projects: [],
            weakest_dimensions: [],
          },
          feature_domains: [],
          roadmap: { items: [] },
          gaps: [],
        }))
      }
      if (url.startsWith('/api/tasks')) return Promise.resolve(okJson({ items: [] }))
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByLabelText('页面覆盖状态')).toBeInTheDocument()
      expect(screen.getAllByText('87%').length).toBeGreaterThan(0)
      expect(screen.getByText('页面层已覆盖')).toBeInTheDocument()
    })
  }, 20000)

  it('promotes the current page draft from the global page context', async () => {
    window.location.hash = '#performance'
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          cockpit_pages: [{ id: 'Performance', title: '性能监控', group: '开发工具', purpose: '查看性能' }],
          page_maturity: { summary: { total: 1, ready: 0, watch: 0, gap: 1, score: 0 }, items: [] },
          usage_paths: [],
          playbooks: [],
          projects: [],
          project_portfolio: { summary: {}, priority_projects: [], weakest_dimensions: [] },
          feature_domains: [],
          roadmap: { items: [] },
          gaps: [],
        }))
      }
      if (url.startsWith('/api/tasks?')) {
        return Promise.resolve(okJson({
          items: [{
            id: 'page-draft-performance',
            title: '页面能力：补齐性能监控',
            description: '补能力域映射。',
            read_only: true,
            source: { type: 'system_map_page_maturity', id: 'Performance', title: '性能监控' },
            draft: { kind: 'page_maturity', guard: '先补能力域映射' },
          }],
        }))
      }
      if (url === '/api/tasks/drafts/page-draft-performance/promote') {
        expect(init?.method).toBe('POST')
        return Promise.resolve(okJson({ id: 'promoted-performance', title: '补齐性能监控' }))
      }
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '当前页面承接' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '承接当前页面草稿 页面能力：补齐性能监控' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '承接当前页面草稿 页面能力：补齐性能监控' }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/tasks/drafts/page-draft-performance/promote',
        { method: 'POST' },
      )
      expect(screen.getByText('已承接为正式计划任务：补齐性能监控')).toBeInTheDocument()
    })
  }, 20000)

  it('resolves hash links into cockpit navigation context', async () => {
    window.location.hash = '#alerts/rules'
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({}))
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Alert Mock rules')).toBeInTheDocument()
    })
    expect(window.location.hash).toBe('#alerts/rules')
  }, 20000)

  it('hydrates project and gap focus from a deep-link hash', async () => {
    window.location.hash = '#system-map?project=mesh-router&gap=project-native-surface'
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({}))
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock mesh-router.*project-native-surface/)).toBeInTheDocument()
    })
  }, 20000)

  it('hydrates coverage, page, and feature focus from a deep-link hash', async () => {
    window.location.hash = '#system-map?coverage=runtime_probe&page=Performance&feature=runtime-ops'
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({}))
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/SystemMap Mock.*runtime_probe.*Performance.*runtime-ops/)).toBeInTheDocument()
    })
  }, 30000)

  it('resolves the guide hash into the guide page', async () => {
    window.location.hash = '#guide'
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({}))
      if (url === '/api/services') return Promise.resolve(okJson([]))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Guide Mock')).toBeInTheDocument()
    })
    expect(window.location.hash).toBe('#guide')
    })
  })

  it('searches runtime knowledge and technical assets from the global entry', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({}))
      if (url.startsWith('/api/tasks?')) return Promise.resolve(okJson({ items: [] }))
      if (url === '/api/domain-apps') return Promise.resolve(okJson({ items: [] }))
      if (url === '/api/alerts?limit=80') return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/cockpit/research-hub?')) {
        return Promise.resolve(okJson({ recent: [{ id: 42, topic: '家庭研究', summary: '研究摘要', status: 'active', tags: ['家庭'] }] }))
      }
      if (url.startsWith('/api/metaos/workflows?')) {
        return Promise.resolve(okJson({ workflows: [{ workflow_id: 'wf-42', task: '家庭执行链', status: 'running' }] }))
      }
      if (url === '/api/ecos/skills') {
        return Promise.resolve(okJson({ skills: [{ id: 'skill-family', name: '家庭技能', description: '家庭工作技能' }] }))
      }
      if (url === '/api/pipelines') return Promise.resolve(okJson({ pipelines: ['family-pipeline'] }))
      if (url === '/api/ecos/workflows') return Promise.resolve(okJson({ workflows: [{ name: 'family-workflow', description: '家庭资产工作流' }] }))
      return Promise.resolve(okJson({}))
    })

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')

    fireEvent.change(search, { target: { value: '家庭研究' } })
    await waitFor(() => expect(screen.getByText('研究：家庭研究')).toBeInTheDocument())
    fireEvent.click(screen.getByText('研究：家庭研究'))
    await waitFor(() => expect(screen.getByText('Research Mock')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: 'skill-family' } })
    await waitFor(() => expect(screen.getByText('技能资产：家庭技能')).toBeInTheDocument())
    fireEvent.click(screen.getByText('技能资产：家庭技能'))
    await waitFor(() => expect(screen.getByText('Mock Page')).toBeInTheDocument())
  })

  it('indexes GBrain agents without exposing credentials', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/admin/api/agents') {
        return Promise.resolve(okJson({ agents: [{ id: 'agent-family', name: 'family-agent', auth_type: 'oauth', scope: 'read write', status: 'active' }] }))
      }
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')
    fireEvent.change(search, { target: { value: 'family-agent' } })

    const target = await screen.findByText('GBrain 智能体：family-agent')
    expect(screen.queryByText(/secret|token/i)).not.toBeInTheDocument()
    fireEvent.click(target)
    await waitFor(() => expect(screen.getByText('Mock Page')).toBeInTheDocument())
  })

  it('indexes alert rules and family quests in the global entry', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/alerts/rules') {
        return Promise.resolve(okJson({ items: [{ id: 'rule-latency', name: '延迟过高', condition: 'latency > 500', level: 'warning', enabled: true }] }))
      }
      if (url === '/api/omos/quests') {
        return Promise.resolve(okJson({ quests: [{ id: 42, title: '完成家庭复盘', type: 'growth', reward: 20, completed: 0, assignee: '老王' }] }))
      }
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')

    fireEvent.change(search, { target: { value: '延迟过高' } })
    const ruleTarget = await screen.findByText('告警规则：延迟过高')
    fireEvent.click(ruleTarget)
    await waitFor(() => expect(screen.getByText('Alert Mock rules')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: '完成家庭复盘' } })
    const questTarget = await screen.findByText('家庭 Quest：完成家庭复盘')
    fireEvent.click(questTarget)
    await waitFor(() => expect(screen.getByText('Mock Page')).toBeInTheDocument())
  })

  it('searches live mesh, compute and log objects from the global entry', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({}))
      if (url.startsWith('/api/tasks?')) return Promise.resolve(okJson({ items: [] }))
      if (url === '/api/domain-apps' || url === '/api/alerts?limit=80') return Promise.resolve(okJson({ items: [] }))
      if (url === '/api/bos/services') return Promise.resolve(okJson({ services: [{ uri: 'bos://memory/kos/search', domain: 'memory', action: 'search', transport: 'http' }] }))
      if (url === '/api/governance/compute/status') return Promise.resolve(okJson({ nodes: [{ id: 'local-mac', name: '本地主机', model: 'coder', status: 'online' }], quota: { quota: [{ provider: 'openai', available: false }] } }))
      if (url === '/api/logs?limit=100') return Promise.resolve(okJson({ items: [{ source: 'gateway', level: 'error', message: 'upstream timeout' }] }))
      return Promise.resolve(okJson({}))
    })

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')

    fireEvent.change(search, { target: { value: 'bos://memory/kos/search' } })
    await waitFor(() => expect(screen.getByText('网格路由：bos://memory/kos/search')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: 'local-mac' } })
    await waitFor(() => expect(screen.getByText('算力节点：本地主机')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: 'gateway' } })
    await waitFor(() => expect(screen.getByText('日志来源：gateway')).toBeInTheDocument())
  })

  it('keeps healthy search dimensions when one optional source fails', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          cockpit_pages: [],
          projects: [{ id: 'resilient-project', layer: 'L2', stack: 'Python', role: 'search fixture' }],
          usage_paths: [],
          playbooks: [],
          feature_domains: [],
          roadmap: { lanes: [], items: [] },
          gaps: [],
        }))
      }
      if (url === '/api/bos/services') return Promise.reject(new Error('mesh unavailable'))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')

    fireEvent.change(search, { target: { value: 'resilient-project' } })
    await waitFor(() => expect(screen.getByText('项目：resilient-project')).toBeInTheDocument())
    expect(screen.getByRole('alert', { name: '全站数据源状态' })).toHaveTextContent('网格服务')
    fireEvent.click(screen.getByRole('button', { name: '重试全站数据源' }))
    await waitFor(() => expect(screen.getByTestId('dashboard-page-view')).toHaveAttribute('data-refresh-token', '1'))
  })

  it('indexes governance objects in the global entry', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({}))
      if (url === '/api/debt') {
        return Promise.resolve(okJson({ items: [{ id: 'debt-runtime', title: '运行探针债务', severity: 'high', lifecycle_state: 'open', dimension: 'runtime' }] }))
      }
      if (url === '/api/l4/health') {
        return Promise.resolve(okJson({ domains: [{ id: 'family', name: '家庭域', issue_count: 2, signal_count: 1, capabilities: ['任务'] }] }))
      }
      if (url === '/api/v1/proposals') {
        return Promise.resolve(okJson({ status: 'ok', proposals: [{ id: 'proposal-runtime', type: 'governance', status: 'pending', description: '补运行探针' }] }))
      }
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')

    fireEvent.change(search, { target: { value: '运行探针债务' } })
    await waitFor(() => expect(screen.getByText('技术债务：运行探针债务')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: '家庭域' } })
    await waitFor(() => expect(screen.getByText('L4 域：家庭域')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('全局搜索输入框'), { target: { value: 'proposal-runtime' } })
    await waitFor(() => expect(screen.getByText('C2G 提案：proposal-runtime')).toBeInTheDocument())
  })

  it('indexes live KOS evidence in the global entry', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/kos/search?q=%E6%9E%B6%E6%9E%84%E5%86%B3%E7%AD%96&limit=8') {
        return Promise.resolve(okJson({ results: [{ id: 'decision-1', title: '架构决策', chunk_text: '保留来源证据。' }] }))
      }
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<Dashboard />)
    const search = await screen.findByLabelText('全局搜索输入框')
    fireEvent.change(search, { target: { value: '架构决策' } })

    const target = await screen.findByText('知识证据：架构决策')
    fireEvent.click(target)
    await waitFor(() => expect(screen.getByText('Mock Page')).toBeInTheDocument())
  })
