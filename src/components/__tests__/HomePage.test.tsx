import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import HomePage from '../HomePage'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

const systemMapPayload = {
  summary: {
    projects: 19,
    cockpit_pages: 22,
    feature_domains: 19,
    roadmap_items: 12,
    project_coverage_score: 78,
    page_maturity_score: 87,
    domain_app_score: 93,
    blocked_projects: 9,
    projects_needing_action: 17,
  },
  cockpit_pages: [
    { id: 'Home', title: '首页', group: '入口', purpose: '健康、告警、任务、指标趋势的日常总览。' },
    { id: 'SystemMap', title: '系统地图', group: '入口', purpose: '按层级、项目、能力域和使用路径解释整个 Cockpit。' },
    { id: 'Overview', title: '概览中心', group: '运行大盘', purpose: '查看服务节点、运行状态和集群概貌。' },
    { id: 'Research', title: '研究中枢', group: '智能与知识', purpose: '承接研究主旅程。' },
    { id: 'Knowledge', title: '知识中枢', group: '智能与知识', purpose: '查看知识与检索能力。' },
    { id: 'Protocol', title: '协议工作台', group: '智能与知识', purpose: '查看协议层与元模型桥接。' },
    { id: 'C2G', title: 'C2G 战略中心', group: '系统治理', purpose: '查看战略与治理状态。' },
    { id: 'TaskCenter', title: '任务中心', group: '开发工具', purpose: '查看任务和草稿。' },
    { id: 'DomainApps', title: '应用中心', group: '领域应用', purpose: '挂载家庭驾驶舱、OPC 作战台和领域服务。' },
    { id: 'Settings', title: '底层设置', group: '系统配置', purpose: '查看系统配置。' },
  ],
  feature_domains: [
    {
      id: 'capability-1',
      title: '知识摄取与持久化',
      english: 'Knowledge Ingestion',
      cockpit_page: 'Knowledge',
      capability_items: ['多层抓取', '内容抽取', '知识摄取'],
      providers: ['gbrain', 'iris', 'kos'],
    },
    {
      id: 'capability-3',
      title: '治理与合规',
      english: 'Governance',
      cockpit_page: 'C2G',
      capability_items: ['治理审计', '任务管理', '债务管理', '规则注册'],
      providers: ['GaC', 'c2g', 'omo'],
    },
    {
      id: 'capability-4',
      title: '编排与执行',
      english: 'Orchestration',
      cockpit_page: 'Workflows',
      capability_items: ['DAG 编排', '工作流引擎'],
      providers: ['ecos', 'metaos'],
    },
  ],
  roadmap: {
    lanes: [
      { id: 'now', title: '现在补', items: [{ id: 'a' }, { id: 'b' }] },
      { id: 'next', title: '下一步', items: [{ id: 'c' }] },
      { id: 'later', title: '后续增强', items: [{ id: 'd' }] },
    ],
  },
  usage_paths: [
    {
      id: 'daily-ops',
      title: '日常体检',
      intent: '先看系统是否能用，再处理最紧急的问题。',
      steps: ['Home', 'AlertCenter', 'TaskCenter', 'LogViewer'],
      pages: [
        { id: 'Home', title: '首页', group: '入口' },
        { id: 'AlertCenter', title: '告警中心', group: '系统治理' },
        { id: 'TaskCenter', title: '任务中心', group: '开发工具' },
        { id: 'LogViewer', title: '日志查看器', group: '开发工具' },
      ],
    },
    {
      id: 'architecture-orientation',
      title: '架构定位',
      intent: '不知道某个项目归哪一层、该从哪进时使用。',
      steps: ['SystemMap', 'Protocol', 'McpMesh', 'Settings'],
      pages: [
        { id: 'SystemMap', title: '系统地图', group: '入口' },
        { id: 'Protocol', title: '协议工作台', group: '智能与知识' },
        { id: 'McpMesh', title: '网格与 MCP', group: '运行大盘' },
        { id: 'Settings', title: '底层设置', group: '系统配置' },
      ],
    },
    {
      id: 'runtime-diagnostics',
      title: '运行诊断',
      intent: '从服务概览、拓扑、性能、日志到沙箱复现，定位运行问题。',
      steps: ['Overview', 'Compute', 'Topology', 'Performance', 'LogViewer', 'Sandbox'],
      pages: [
        { id: 'Overview', title: '概览中心', group: '运行大盘' },
        { id: 'Compute', title: '算力调配', group: '运行大盘' },
        { id: 'Topology', title: '全局拓扑', group: '运行大盘' },
        { id: 'Performance', title: '性能监控', group: '开发工具' },
        { id: 'LogViewer', title: '日志查看器', group: '开发工具' },
        { id: 'Sandbox', title: '隔离沙箱', group: '开发工具' },
      ],
    },
    {
      id: 'governance-loop',
      title: '治理闭环',
      intent: '把战略、任务、债务、证据和告警串成一条线。',
      steps: ['C2G', 'Workflows', 'Debt', 'Observability'],
      pages: [
        { id: 'C2G', title: 'C2G 战略中心', group: '系统治理' },
        { id: 'Workflows', title: 'MetaOS 工作流', group: '智能与知识' },
        { id: 'Debt', title: '技术债务', group: '系统治理' },
        { id: 'Observability', title: '运行可观测', group: '系统治理' },
      ],
    },
    {
      id: 'knowledge-work',
      title: '知识工作',
      intent: '从知识检索、引擎状态到技能资产逐步定位。',
      steps: ['Research', 'Knowledge', 'Engines', 'Assets', 'Workflows'],
      pages: [
        { id: 'Research', title: '研究中枢', group: '智能与知识' },
        { id: 'Knowledge', title: '知识中枢', group: '智能与知识' },
        { id: 'Engines', title: '引擎调度', group: '智能与知识' },
        { id: 'Assets', title: '技术资产库', group: '智能与知识' },
        { id: 'Workflows', title: 'MetaOS 工作流', group: '智能与知识' },
      ],
    },
    {
      id: 'domain-ops',
      title: '领域作战',
      intent: '进入家庭、OPC 等 L4 领域应用，同时守住 SSOT 边界。',
      steps: ['DomainApps', 'L4Health', 'QuestBoard', 'C2G'],
      pages: [
        { id: 'DomainApps', title: '应用中心', group: '领域应用' },
        { id: 'L4Health', title: 'L4 域健康', group: '系统治理' },
        { id: 'QuestBoard', title: '积分冒险', group: '领域应用' },
        { id: 'C2G', title: 'C2G 战略中心', group: '系统治理' },
      ],
    },
  ],
  playbooks: [
    {
      id: 'research-publication-loop',
      title: '研究到发布闭环',
      goal: '让研究、追问、发布和任务承接形成一条清晰链路。',
      frequency: 'on-demand',
      owner: 'research',
      steps: [
        { id: 'research-open-loop', page_id: 'Research', action: '查看最近研究对象。', page: { id: 'Research', title: '研究中枢' } },
        { id: 'research-knowledge-context', page_id: 'Knowledge', action: '补知识上下文。', page: { id: 'Knowledge', title: '知识中枢' } },
      ],
    },
    {
      id: 'protocol-integrity-check',
      title: '协议层完整性检查',
      goal: '巡检 ecos、model-driven、workflow 和治理桥。',
      frequency: 'weekly',
      owner: 'architecture',
      steps: [
        { id: 'protocol-map-context', page_id: 'SystemMap', action: '先看总图。', page: { id: 'SystemMap', title: '系统地图' } },
        { id: 'protocol-layer-check', page_id: 'Protocol', action: '检查协议层桥。', page: { id: 'Protocol', title: '协议工作台' } },
      ],
    },
    {
      id: 'domain-app-ops',
      title: '领域应用作战',
      goal: '处理家庭、OPC 和 family-hub。 ',
      frequency: 'weekly',
      owner: 'domain',
      steps: [
        { id: 'domain-contract-check', page_id: 'DomainApps', action: '检查领域 app contract。', page: { id: 'DomainApps', title: '应用中心' } },
      ],
    },
  ],
  project_portfolio: {
    summary: {
      status: 'blocked',
      score: 76,
      blocked: 9,
      at_risk: 8,
      watch: 0,
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
        triage_commands: 3,
      },
      {
        id: 'toolbox',
        layer: 'L1-L3',
        status: 'blocked',
        score: 50,
        primary_gap: '基础状态未就绪',
        next_action: '确认项目是否已归档、迁移或需要从注册表下线。',
        triage_commands: 3,
      },
    ],
    weakest_dimensions: [
      {
        id: 'runtime_probe',
        title: '运行探针',
        status: 'failed',
        score: 21,
        failed: 10,
        warning: 5,
        attention_projects: [
          { id: 'mesh-router', status: 'warning', next_action: '启动服务或修正端口注册。' },
          { id: 'gbrain', status: 'failed', next_action: '补端口注册或标注为无需常驻服务。' },
        ],
      },
      {
        id: 'verification',
        title: '验证证据',
        status: 'failed',
        score: 37,
        failed: 5,
        warning: 7,
        attention_projects: [
          { id: 'kairon', status: 'failed', next_action: '复现失败验证并补 closeout 证据。' },
        ],
      },
    ],
  },
  domain_apps: {
    attention_items: [
      {
        id: 'family-hub',
        name: 'Family Hub',
        runtime_status: 'stopped',
        risk_level: 'medium',
        security_posture: 'passed',
        next_action: '按登记启动命令拉起服务或确认它只需要按需启动。',
      },
    ],
  },
}

const taskPayload = {
  items: [
    { id: 'task-1', title: '真实任务', status: 'pending', progress: 0, updated_at: new Date().toISOString() },
    { id: 'portfolio-mesh-router', title: '项目组合：处理 mesh-router', read_only: true, priority: 'high', source: { type: 'system_map_project_portfolio', id: 'mesh-router' } },
    { id: 'portfolio-toolbox', title: '项目组合：处理 toolbox', read_only: true, priority: 'medium', source: { type: 'system_map_project_portfolio', id: 'toolbox' } },
    { id: 'verification-ready-cockpit', title: '验证补证：cockpit', read_only: true, priority: 'medium', source: { type: 'system_map_verification_ready', id: 'cockpit' } },
    { id: 'playbook-daily', title: '清单：执行日常驾驶舱路径', read_only: true, source: { type: 'system_map_playbook', id: 'daily' } },
    { id: 'domain-app-family-hub', title: '领域应用：检查 family-hub', read_only: true, priority: 'high', source: { type: 'system_map_domain_app', id: 'family-hub' } },
    { id: 'capability-gap-project-native-surface', title: '能力缺口：补齐项目原生状态面', read_only: true, priority: 'critical', source: { type: 'system_map_capability_gap', id: 'project-native-surface' } },
    { id: 'page-maturity-Performance', title: '页面成熟度：补齐 Performance', read_only: true, priority: 'medium', source: { type: 'system_map_page_maturity', id: 'Performance' } },
  ],
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('shows operating focus from SystemMap and TaskCenter drafts', async () => {
    const onTabChange = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/health/summary') {
        return Promise.resolve(okJson({ health_score: 90, health_score_change: 1, active_services: 2, total_services: 3, active_tasks: 1, today_requests: 20, today_requests_change: 2 }))
      }
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') return Promise.resolve(okJson(taskPayload))
      if (url.startsWith('/api/tasks')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/alerts')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/metrics')) return Promise.resolve(okJson({ health_score: [], requests: [], error_rate: [] }))
      if (url.startsWith('/api/omos/thoughts')) return Promise.resolve(okJson({ status: 'ok', thoughts: [] }))
      return Promise.resolve(okJson({}))
    })

    render(<HomePage onTabChange={onTabChange} />)

    await waitFor(() => {
      expect(screen.getByText('今日操作焦点')).toBeInTheDocument()
      expect(screen.getByText('按工作模式进入')).toBeInTheDocument()
      expect(screen.getByText('按症状定位')).toBeInTheDocument()
      expect(screen.getByText('页面有了但不会用')).toBeInTheDocument()
      expect(screen.getByText('能看不能证')).toBeInTheDocument()
      expect(screen.getByText('领域挂载不稳')).toBeInTheDocument()
      expect(screen.getByText('能力缺口还没收口')).toBeInTheDocument()
      expect(screen.getByText('覆盖矩阵在掉分')).toBeInTheDocument()
      expect(screen.getByText('日常值守模式')).toBeInTheDocument()
      expect(screen.getByText('治理巡检模式')).toBeInTheDocument()
      expect(screen.getByText('建设补位模式')).toBeInTheDocument()
      expect(screen.getByText('领域挂载模式')).toBeInTheDocument()
      expect(screen.getByText('功能架构总览')).toBeInTheDocument()
      expect(screen.getByText('能力缺失与待建设')).toBeInTheDocument()
      expect(screen.getByText('场景作战面')).toBeInTheDocument()
      expect(screen.getByText('覆盖缺口雷达')).toBeInTheDocument()
      expect(screen.getByText('跨层作战热点')).toBeInTheDocument()
      expect(screen.getByText('未入使用路径')).toBeInTheDocument()
      expect(screen.getAllByText('未挂能力域页面').length).toBeGreaterThan(0)
      expect(screen.getByText('待收口领域与页面草稿')).toBeInTheDocument()
      expect(screen.getByText('当前所有页面都已进入使用路径')).toBeInTheDocument()
      expect(screen.getByText('页面维度')).toBeInTheDocument()
      expect(screen.getByText('能力域热点')).toBeInTheDocument()
      expect(screen.getByText('覆盖状态')).toBeInTheDocument()
      expect(screen.getByText('路线图')).toBeInTheDocument()
      expect(screen.getByText('项目运行面')).toBeInTheDocument()
      expect(screen.getByText('覆盖矩阵')).toBeInTheDocument()
      expect(screen.getAllByText('页面成熟度').length).toBeGreaterThan(0)
      expect(screen.getAllByText('领域挂载').length).toBeGreaterThan(0)
      expect(screen.getAllByText('验证与补证').length).toBeGreaterThan(0)
      expect(screen.getByText(/待动作 17 · 运行缺口 0/)).toBeInTheDocument()
      expect(screen.getByText(/warning 0 · failed 0/)).toBeInTheDocument()
      expect(screen.getByText(/ready 0 · watch 0/)).toBeInTheDocument()
      expect(screen.getByText(/运行 0 · 外挂 0 · 高风险 0/)).toBeInTheDocument()
      expect(screen.getByText(/验证缺口 0 · 验证草稿 1/)).toBeInTheDocument()
      expect(screen.getByText('优先补位')).toBeInTheDocument()
      expect(screen.getAllByText('Family Hub').length).toBeGreaterThan(0)
      expect(screen.getAllByText('22').length).toBeGreaterThan(0)
      expect(screen.getAllByText('19').length).toBeGreaterThan(0)
      expect(screen.getAllByText('知识摄取与持久化').length).toBeGreaterThan(0)
      expect(screen.getAllByText('治理与合规').length).toBeGreaterThan(0)
      expect(screen.getAllByText('入口').length).toBeGreaterThan(0)
      expect(screen.getAllByText('运行大盘').length).toBeGreaterThan(0)
      expect(screen.getAllByText('系统配置').length).toBeGreaterThan(0)
      expect(screen.getByText(/阻塞项目 9 个/)).toBeInTheDocument()
      expect(screen.getByText('按场景进入')).toBeInTheDocument()
      expect(screen.getByText('首页建设控制台')).toBeInTheDocument()
      expect(screen.getByText('建设闭环承接')).toBeInTheDocument()
      expect(screen.getByText('页面能力建设')).toBeInTheDocument()
      expect(screen.getAllByText('领域挂载合同').length).toBeGreaterThan(0)
      expect(screen.getAllByText('页面能力补位').length).toBeGreaterThan(0)
      expect(screen.getAllByText('验证闭环').length).toBeGreaterThan(0)
      expect(screen.getAllByText('验证与补证').length).toBeGreaterThan(0)
      expect(screen.getByText('项目与路线图')).toBeInTheDocument()
      expect(screen.getByText('6 条操作路径来自 SystemMap，覆盖日常、架构、运行、治理、知识和领域作战。')).toBeInTheDocument()
      expect(screen.getByText('日常体检')).toBeInTheDocument()
      expect(screen.getByText('研究到发布闭环')).toBeInTheDocument()
      expect(screen.getByText('协议层完整性检查')).toBeInTheDocument()
      expect(screen.getByText('运行诊断')).toBeInTheDocument()
      expect(screen.getByText('治理闭环')).toBeInTheDocument()
      expect(screen.getByText('领域作战')).toBeInTheDocument()
      expect(screen.getAllByText('告警中心').length).toBeGreaterThan(0)
      expect(screen.getAllByText('C2G 战略中心').length).toBeGreaterThan(0)
      expect(screen.getAllByText('隔离沙箱').length).toBeGreaterThan(0)
      expect(screen.getAllByText('应用中心').length).toBeGreaterThan(0)
      expect(screen.getAllByText('研究中枢').length).toBeGreaterThan(0)
      expect(screen.getAllByText('协议工作台').length).toBeGreaterThan(0)
      expect(screen.getByText('76%')).toBeInTheDocument()
      expect(screen.getByText(/阻塞 9 · 风险 8/)).toBeInTheDocument()
      expect(screen.getByText(/项目 2 · 验证 1 · 清单 1 · 领域 1 · 缺口 1 · 页面 1/)).toBeInTheDocument()
      expect(screen.getByText('行动收件箱')).toBeInTheDocument()
      expect(screen.getByText('修复车道')).toBeInTheDocument()
      expect(screen.getAllByText('运行探针').length).toBeGreaterThan(0)
      expect(screen.getAllByText('验证证据').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Family Hub').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/21% · 缺口 10 · 提醒 5/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/stopped · medium · passed/).length).toBeGreaterThan(0)
      expect(screen.getByText('能力缺口：补齐项目原生状态面')).toBeInTheDocument()
      expect(screen.getByText('领域应用：检查 family-hub')).toBeInTheDocument()
      expect(screen.getAllByText('页面成熟度：补齐 Performance').length).toBeGreaterThan(0)
      expect(screen.getAllByText('验证补证：cockpit').length).toBeGreaterThan(0)
      expect(screen.getAllByText('mesh-router').length).toBeGreaterThan(0)
      expect(screen.getAllByText('toolbox').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: '打开首页建设对象 Performance' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开首页建设任务 Family Hub' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开首页建设对象 验证补证：cockpit' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开首页建设任务 mesh-router' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开首页症状对象 页面有了但不会用' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开首页症状任务 能看不能证' })).toBeInTheDocument()
    }, { timeout: 8000 })

    fireEvent.click(screen.getByRole('button', { name: /打开系统地图/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开工作模式 日常值守模式/ }))
    expect(onTabChange).toHaveBeenCalledWith('Home')

    fireEvent.click(screen.getByRole('button', { name: /打开工作模式任务 建设补位模式/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开首页症状对象 页面有了但不会用/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开首页症状任务 能看不能证/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开首页页面建设 Home/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开首页领域合同 family-hub/ }))
    expect(onTabChange).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: /打开首页验证补证 cockpit/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开首页优先项目 mesh-router/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开首页路线图车道 现在补/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开首页建设对象 Performance/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开首页建设任务 Family Hub/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开首页建设对象 验证补证：cockpit/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开首页建设任务 mesh-router/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开页面分组 入口/ }))
    expect(onTabChange).toHaveBeenCalledWith('Home')

    fireEvent.click(screen.getByRole('button', { name: /进入能力域 知识摄取与持久化/ }))
    expect(onTabChange).toHaveBeenCalledWith('Knowledge')

    fireEvent.click(screen.getByRole('button', { name: /打开路线图分栏 现在补/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开日常体检/ }))
    expect(onTabChange).toHaveBeenCalledWith('AlertCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开覆盖视角 页面成熟度/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开运行诊断/ }))
    expect(onTabChange).toHaveBeenCalledWith('Overview')

    fireEvent.click(screen.getByRole('button', { name: /打开研究到发布闭环/ }))
    expect(onTabChange).toHaveBeenCalledWith('Research')

    fireEvent.click(screen.getByRole('button', { name: /打开协议层完整性检查/ }))
    expect(onTabChange).toHaveBeenCalledWith('Protocol')

    fireEvent.click(screen.getByRole('button', { name: /打开领域作战/ }))
    expect(onTabChange).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: /打开跨层维度 运行探针/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开跨层能力域 知识摄取与持久化/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开跨层页面 Performance/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开待挂能力域页面 Home/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开待收口领域 family-hub/ }))
    expect(onTabChange).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: /打开待建设草稿 页面成熟度：补齐 Performance/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /任务中心/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开使用路径完整地图/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /查看任务草稿/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /处理草稿/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /打开修复维度 运行探针/ }))
    expect(onTabChange).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /打开领域关注 family-hub/ }))
    expect(onTabChange).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: /查看验证补证/ }))
    expect(onTabChange).toHaveBeenCalledWith('TaskCenter')

    expect(fetch).toHaveBeenCalledWith('/api/cockpit/system-map')
    expect(fetch).toHaveBeenCalledWith('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80')
  }, 30000)

  it('opens homepage focus items with their source context', async () => {
    const onTabChange = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/health/summary') {
        return Promise.resolve(okJson({ health_score: 90, health_score_change: 1, active_services: 2, total_services: 3, active_tasks: 1, today_requests: 20, today_requests_change: 2 }))
      }
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') return Promise.resolve(okJson(taskPayload))
      if (url.startsWith('/api/tasks')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/alerts')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/metrics')) return Promise.resolve(okJson({ health_score: [], requests: [], error_rate: [] }))
      if (url.startsWith('/api/omos/thoughts')) return Promise.resolve(okJson({ status: 'ok', thoughts: [] }))
      return Promise.resolve(okJson({}))
    })

    render(<HomePage onTabChange={onTabChange} onOpenTarget={onOpenTarget} />)

    await waitFor(() => expect(screen.getByText('能力缺口：补齐项目原生状态面')).toBeInTheDocument(), { timeout: 8000 })

    fireEvent.click(screen.getByRole('button', { name: /打开覆盖视角 页面成熟度/ }))
    fireEvent.click(screen.getByRole('button', { name: /项目组合：处理 mesh-router/ }))
    fireEvent.click(screen.getByRole('button', { name: /领域应用：检查 family-hub/ }))
    fireEvent.click(screen.getByRole('button', { name: /能力缺口：补齐项目原生状态面/ }))
    fireEvent.click(screen.getByRole('button', { name: /查看验证补证/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开工作模式 领域挂载模式/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开工作模式任务 治理巡检模式/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开跨层维度 运行探针/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开跨层能力域 知识摄取与持久化/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开跨层页面 Performance/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开待挂能力域页面 Home/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开待收口领域 family-hub/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开待建设草稿 页面成熟度：补齐 Performance/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页页面建设 Home/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页领域合同 family-hub/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页验证补证 cockpit/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页验证维度 verification/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页优先项目 mesh-router/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页建设对象 Performance/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页建设任务 Family Hub/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页建设对象 验证补证：cockpit/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页建设任务 mesh-router/ }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'TaskCenter', taskQuery: '页面' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'SystemMap', projectId: 'mesh-router' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(3, { tab: 'DomainApps', taskQuery: 'family-hub' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(4, { tab: 'SystemMap', gapId: 'project-native-surface' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(5, { tab: 'TaskCenter', taskQuery: '验证' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(6, { tab: 'DomainApps' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(7, { tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(8, { tab: 'SystemMap', coverageDimensionId: 'runtime_probe' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(9, { tab: 'SystemMap', featureDomainId: 'capability-1' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(10, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(11, { tab: 'SystemMap', pageId: 'Home' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(12, { tab: 'DomainApps', taskQuery: 'family-hub' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(13, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(14, { tab: 'SystemMap', pageId: 'Home' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(15, { tab: 'DomainApps', taskQuery: 'family-hub' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(16, { tab: 'TaskCenter', taskQuery: 'cockpit' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(17, { tab: 'SystemMap', coverageDimensionId: 'verification' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(18, { tab: 'SystemMap', projectId: 'mesh-router' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(19, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(20, { tab: 'TaskCenter', taskQuery: 'family-hub' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(21, { tab: 'SystemMap', coverageDimensionId: 'verification' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(22, { tab: 'TaskCenter', taskQuery: 'mesh-router' })
    expect(onTabChange).not.toHaveBeenCalled()
  }, 30000)

  it('surfaces a focused homepage closure card when context comes back from SystemMap', async () => {
    const onTabChange = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/health/summary') {
        return Promise.resolve(okJson({ health_score: 90, health_score_change: 1, active_services: 2, total_services: 3, active_tasks: 1, today_requests: 20, today_requests_change: 2 }))
      }
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') return Promise.resolve(okJson(taskPayload))
      if (url.startsWith('/api/tasks')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/alerts')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/metrics')) return Promise.resolve(okJson({ health_score: [], requests: [], error_rate: [] }))
      if (url.startsWith('/api/omos/thoughts')) return Promise.resolve(okJson({ status: 'ok', thoughts: [] }))
      return Promise.resolve(okJson({}))
    })

    render(
      <HomePage
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
        focusPageId="Performance"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('当前首页承接焦点')).toBeInTheDocument()
      expect(screen.getByText('性能监控')).toBeInTheDocument()
      expect(screen.getByText('从系统地图回来的页面补位对象')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开首页焦点对象 Performance/ }))
    fireEvent.click(screen.getByRole('button', { name: /打开首页焦点任务 Performance/ }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'Performance' })
    expect(onTabChange).not.toHaveBeenCalled()
  })

  it('routes homepage symptom triage cards to exact cockpit targets', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/health/summary') {
        return Promise.resolve(okJson({ health_score: 90, health_score_change: 1, active_services: 2, total_services: 3, active_tasks: 1, today_requests: 20, today_requests_change: 2 }))
      }
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson(systemMapPayload))
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') return Promise.resolve(okJson(taskPayload))
      if (url.startsWith('/api/tasks')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/alerts')) return Promise.resolve(okJson({ items: [] }))
      if (url.startsWith('/api/metrics')) return Promise.resolve(okJson({ health_score: [], requests: [], error_rate: [] }))
      if (url.startsWith('/api/omos/thoughts')) return Promise.resolve(okJson({ status: 'ok', thoughts: [] }))
      return Promise.resolve(okJson({}))
    })

    render(<HomePage onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '打开首页症状对象 页面有了但不会用' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开首页症状对象 页面有了但不会用' }))
    fireEvent.click(screen.getByRole('button', { name: '打开首页症状任务 能看不能证' }))
    fireEvent.click(screen.getByRole('button', { name: '打开首页症状对象 领域挂载不稳' }))
    fireEvent.click(screen.getByRole('button', { name: '打开首页症状任务 能力缺口还没收口' }))
    fireEvent.click(screen.getByRole('button', { name: '打开首页症状对象 覆盖矩阵在掉分' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'cockpit' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(3, { tab: 'DomainApps', taskQuery: 'family-hub' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(4, { tab: 'TaskCenter', taskQuery: 'project-native-surface' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(5, { tab: 'SystemMap', coverageDimensionId: 'runtime_probe' })
  })

  it('does not present synthetic health data when the homepage APIs are unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('backend offline'))

    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('首页数据暂不可用')
    })

    expect(screen.queryByText('98')).not.toBeInTheDocument()
    expect(screen.queryByText('vault 域信号数异常 (160个)')).not.toBeInTheDocument()
    expect(screen.queryByText('Phase 42')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试首页数据' })).toBeInTheDocument()
  })
})
