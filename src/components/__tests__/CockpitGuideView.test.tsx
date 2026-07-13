import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import CockpitGuideView from '../CockpitGuideView'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('CockpitGuideView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders site guide summaries, paths, and architecture groups', async () => {
    const payload = {
      usage_paths: [{ id: 'daily-ops' }, { id: 'governance-loop' }, { id: 'research-publish' }],
      playbooks: [{ id: 'daily' }, { id: 'weekly' }],
      feature_domains: [{ id: 'runtime' }, { id: 'governance' }, { id: 'family' }, { id: 'knowledge' }],
      page_maturity: {
        items: [
          { page_id: 'Performance', status: 'gap', score: 20, next_action: '补路径', page: { title: '性能监控' } },
          { page_id: 'Sandbox', status: 'watch', score: 45, next_action: '补映射', page: { title: '隔离沙箱' } },
        ],
      },
      gaps: [
        { id: 'project-native-surface', severity: 'medium', title: '部分项目仍需补齐状态面', evidence: '仍有项目缺口', next: '继续补齐状态面。' },
      ],
      project_portfolio: {
        summary: { score: 78 },
        weakest_dimensions: [
          { id: 'runtime_probe', title: '运行探针', score: 21, failed: 10, warning: 5 },
        ],
      },
      domain_apps: {
        summary: { total: 2, running: 1, high_risk: 1, external_mounts: 1, score: 72 },
        attention_items: [
          {
            id: 'family-hub',
            name: 'family-hub 服务',
            runtime_status: 'stopped',
            risk_level: 'high',
            security_posture: 'passed',
            freshness_status: 'ready',
            next_action: '确认 family-hub 服务是否需要常驻。',
            domain: { name: '@家庭生活' },
          },
        ],
      },
      roadmap: {
        items: [
          { id: 'family-mount', priority: 'P1', status: 'planned', title: '家庭驾驶舱挂载', cockpit_page: 'DomainApps', problem: '家庭应用还没完全接入应用中心。' },
        ],
      },
      items: [
        {
          id: 'page-maturity-Performance',
          title: '页面能力：补齐 性能监控',
          description: '把页面接入至少一条使用路径。',
          read_only: true,
          source: { type: 'system_map_page_maturity', id: 'Performance' },
        },
        {
          id: 'capability-gap-project-native-surface',
          title: '能力缺口：处理 部分项目仍需补齐状态面',
          description: '优先补齐高频项目的状态面。',
          read_only: true,
          source: { type: 'system_map_capability_gap', id: 'project-native-surface' },
        },
        {
          id: 'domain-app-family-hub',
          title: '领域应用：处理 family-hub 服务',
          description: '按登记命令拉起服务。',
          read_only: true,
          source: { type: 'system_map_domain_app', id: 'family-hub' },
        },
        {
          id: 'verification-ready-overview',
          title: '验证补证：补齐 概览中心',
          description: '把现有验证命令补成正式证据。',
          read_only: true,
          source: { type: 'system_map_verification_ready', id: 'Overview' },
        },
        {
          id: 'playbook-daily-ops',
          title: '操作清单：每日 5 分钟体检',
          description: '把日常值守动作按步骤执行。',
          read_only: true,
          source: { type: 'system_map_playbook', id: 'daily-ops' },
        },
      ],
    }
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(okJson(payload)))

    render(<CockpitGuideView />)

    await waitFor(() => {
      expect(screen.getByText('全站导览')).toBeInTheDocument()
      expect(screen.getByText('26 页')).toBeInTheDocument()
      expect(screen.getAllByText('3 条').length).toBeGreaterThan(0)
      expect(screen.getByText('4 个')).toBeInTheDocument()
      expect(screen.getByText('2 页待补')).toBeInTheDocument()
      expect(screen.getByText('推荐使用路径')).toBeInTheDocument()
      expect(screen.getByText('按角色进入')).toBeInTheDocument()
      expect(screen.getByText('日常值守模式')).toBeInTheDocument()
      expect(screen.getByText('治理巡检模式')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开角色模式 日常值守模式' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开角色任务 建设补位模式' })).toBeInTheDocument()
      expect(screen.getByText('当前缺口与补位')).toBeInTheDocument()
      expect(screen.getByText('补位任务承接')).toBeInTheDocument()
      expect(screen.getByText('草稿车道')).toBeInTheDocument()
      expect(screen.getByText('推荐先做')).toBeInTheDocument()
      expect(screen.getByText('来源页回填与补证')).toBeInTheDocument()
      expect(screen.getByText('回来源页补能力')).toBeInTheDocument()
      expect(screen.getByText('补证入口')).toBeInTheDocument()
      expect(screen.getByText('全站覆盖总表')).toBeInTheDocument()
      expect(screen.getByText((_, node) => node?.textContent === '26 页总览')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '回来源页 性能监控' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开补证车道 验证补证' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开补证任务 验证补证：补齐 概览中心' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开全站覆盖页面 性能监控' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看全站覆盖 性能监控' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开全站覆盖任务 性能监控' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开任务车道 页面能力' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开补位任务 页面能力：补齐 性能监控' })).toBeInTheDocument()
      expect(screen.getByText('页面补位')).toBeInTheDocument()
      expect(screen.getAllByText('能力缺口').length).toBeGreaterThan(0)
      expect(screen.getByText('项目覆盖短板')).toBeInTheDocument()
      expect(screen.getAllByText('领域挂载').length).toBeGreaterThan(0)
      expect(screen.getAllByText('family-hub 服务').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: '打开领域对象 family-hub 服务' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '打开领域任务 family-hub 服务' })).toBeInTheDocument()
      expect(screen.getByText('路线图优先项')).toBeInTheDocument()
      expect(screen.getByText('部分项目仍需补齐状态面')).toBeInTheDocument()
      expect(screen.getAllByText('家庭驾驶舱挂载').length).toBeGreaterThan(0)
      expect(screen.getByText('功能架构')).toBeInTheDocument()
      expect(screen.getAllByText('运行大盘').length).toBeGreaterThan(0)
      expect(screen.getAllByText('系统治理').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: '打开页面 系统地图' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看页面覆盖 系统地图' })).toBeInTheDocument()
    }, { timeout: 8000 })
  }, 20000)

  it('opens recommended paths and page actions through navigation callbacks', async () => {
    const payload = {
      usage_paths: [{ id: 'daily-ops' }],
      playbooks: [],
      feature_domains: [],
      page_maturity: {
        items: [
          { page_id: 'Performance', status: 'gap', score: 20, next_action: '补路径', page: { title: '性能监控' } },
        ],
      },
      gaps: [
        { id: 'domain-missing', severity: 'high', title: '缺少领域应用承接', evidence: '应用中心入口不足', next: '优先补领域挂载。' },
      ],
      project_portfolio: {
        summary: { score: 61 },
        weakest_dimensions: [
          { id: 'runtime_probe', title: '运行探针', score: 21, failed: 4, warning: 2 },
        ],
      },
      domain_apps: {
        summary: { total: 1, running: 0, high_risk: 1, external_mounts: 1, score: 68 },
        attention_items: [
          {
            id: 'family-hub',
            name: 'family-hub 服务',
            runtime_status: 'stopped',
            risk_level: 'high',
            security_posture: 'passed',
            freshness_status: 'ready',
            next_action: '先确认服务是否要常驻。',
            domain: { name: '@家庭生活' },
          },
        ],
      },
      roadmap: {
        items: [
          { id: 'family-mount', priority: 'P1', status: 'planned', title: '家庭驾驶舱挂载', cockpit_page: 'DomainApps', problem: '应用中心还没接全。' },
        ],
      },
      items: [
        {
          id: 'page-maturity-Performance',
          title: '页面能力：补齐 性能监控',
          description: '把页面接入至少一条使用路径。',
          read_only: true,
          source: { type: 'system_map_page_maturity', id: 'Performance' },
        },
        {
          id: 'domain-app-family-hub',
          title: '领域应用：处理 family-hub 服务',
          description: '按登记命令拉起服务。',
          read_only: true,
          source: { type: 'system_map_domain_app', id: 'family-hub' },
        },
        {
          id: 'verification-ready-overview',
          title: '验证补证：补齐 概览中心',
          description: '把现有验证命令补成正式证据。',
          read_only: true,
          source: { type: 'system_map_verification_ready', id: 'Overview' },
        },
      ],
    }
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(okJson(payload)))
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<CockpitGuideView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '打开推荐路径 每日值守' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开推荐路径 每日值守' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'SystemMap',
      usagePathId: 'daily-ops',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开角色模式 日常值守模式' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'Home',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开角色任务 建设补位模式' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'system_map_page_maturity',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开页面 站内导览' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'Guide',
    }))

    fireEvent.click(screen.getByRole('button', { name: '查看页面覆盖 站内导览' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'SystemMap',
      pageId: 'Guide',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开页面补位 性能监控' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'SystemMap',
      pageId: 'Performance',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开能力缺口 缺少领域应用承接' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'SystemMap',
      gapId: 'domain-missing',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开领域挂载 family-hub 服务' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'DomainApps',
      taskQuery: 'family-hub',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开覆盖短板 运行探针' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'SystemMap',
      coverageDimensionId: 'runtime_probe',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开路线图优先项 家庭驾驶舱挂载' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'SystemMap',
      pageId: 'DomainApps',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开任务车道 页面能力' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'system_map_page_maturity',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开补位任务 页面能力：补齐 性能监控' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'Performance',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开领域对象 family-hub 服务' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'DomainApps',
      taskQuery: 'family-hub',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开领域任务 family-hub 服务' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'family-hub',
    }))

    fireEvent.click(screen.getByRole('button', { name: '回来源页 性能监控' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'Performance',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开页面补位任务 性能监控' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'Performance',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开补证车道 验证补证' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'system_map_verification_ready',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开补证任务 验证补证：补齐 概览中心' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'Overview',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开全站覆盖页面 性能监控' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'Performance',
    }))

    fireEvent.click(screen.getByRole('button', { name: '查看全站覆盖 性能监控' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'SystemMap',
      pageId: 'Performance',
    }))

    fireEvent.click(screen.getByRole('button', { name: '打开全站覆盖任务 性能监控' }))
    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'TaskCenter',
      taskQuery: 'Performance',
    }))
  })

  it('shows a carried focus card and exact handoff targets when guide receives page context', async () => {
    const payload = {
      usage_paths: [{ id: 'daily-ops' }],
      playbooks: [],
      feature_domains: [],
      page_maturity: {
        items: [
          { page_id: 'Performance', status: 'gap', score: 20, next_action: '把页面接入至少一条使用路径。', page: { title: '性能监控' } },
        ],
      },
      gaps: [],
      project_portfolio: { summary: { score: 61 }, weakest_dimensions: [] },
      domain_apps: { summary: { total: 0, running: 0, high_risk: 0, external_mounts: 0, score: 0 }, attention_items: [] },
      roadmap: { items: [] },
      items: [
        {
          id: 'page-maturity-Performance',
          title: '页面能力：补齐 性能监控',
          description: '把页面接入至少一条使用路径。',
          read_only: true,
          source: { type: 'system_map_page_maturity', id: 'Performance' },
        },
      ],
    }
    vi.mocked(fetch).mockImplementation(() => Promise.resolve(okJson(payload)))
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<CockpitGuideView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusPageId="Performance" />)

    const focusRegion = await screen.findByRole('region', { name: '当前导览承接焦点' })
    expect(focusRegion).toBeInTheDocument()
    expect(within(focusRegion).getByText('性能监控')).toBeInTheDocument()
    expect(within(focusRegion).getByText('把页面接入至少一条使用路径。')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开导览焦点对象 性能监控' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开导览焦点任务 性能监控' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'SystemMap', pageId: 'Performance' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'Performance' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
