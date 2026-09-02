import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import SystemMapView from '../SystemMapView'
import {
  systemMapPayload,
  sourceRef,
  draftTasksPayload,
  readyCoverageChecks,
  okJson,
  setupSystemMapTest,
  SYSTEM_MAP_DRAFT_TASKS_URL,
  expectTaskCenterDraftCall,
} from './__fixtures__/SystemMapView.fixtures'

describe('SystemMapView interaction', () => {
  beforeEach(() => {
    setupSystemMapTest()
  })

  it('queues a triage command directly from project detail', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusProjectId="kairon" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '承接项目排查命令 复跑验证' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '承接项目排查命令 复跑验证' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/kairon/triage/verification-rerun/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-triage-kairon-verification-rerun',
      })
    })
  })

  it('refreshes project triage state after queueing so the map does not offer a duplicate action', async () => {
    const onOpenTarget = vi.fn()
    let systemMapCalls = 0
    const queuedPayload = JSON.parse(JSON.stringify(systemMapPayload))
    queuedPayload.project_triage.queues[1].commands[0].task = {
      task_id: 'cockpit-triage-kairon-verification-rerun',
      status: 'planned',
    }
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/projects/kairon/triage/verification-rerun/queue' && init?.method === 'POST') {
        return okJson({ id: 'cockpit-triage-kairon-verification-rerun', status: 'pending' })
      }
      if (url === '/api/cockpit/system-map') {
        systemMapCalls += 1
        return okJson(systemMapCalls > 1 ? queuedPayload : systemMapPayload)
      }
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusProjectId="kairon" />)
    const button = await screen.findByRole('button', { name: '承接项目排查命令 复跑验证' })
    fireEvent.click(button)

    await waitFor(() => expect(systemMapCalls).toBeGreaterThan(1))
    expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-triage-kairon-verification-rerun',
    })
  })

  it('prevents duplicate project triage queue requests', async () => {
    const onOpenTarget = vi.fn()
    let resolveQueue: ((response: Response) => void) | undefined
    let queueCalls = 0
    const queueResponse = new Promise<Response>((resolve) => {
      resolveQueue = resolve
    })
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/projects/kairon/triage/verification-rerun/queue' && init?.method === 'POST') {
        queueCalls += 1
        return queueResponse
      }
      if (url === '/api/cockpit/system-map') return okJson(systemMapPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusProjectId="kairon" />)
    const button = await screen.findByRole('button', { name: '承接项目排查命令 复跑验证' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('承接中')
    expect(queueCalls).toBe(1)
    resolveQueue?.(okJson({ id: 'cockpit-triage-kairon-verification-rerun' }))

    await waitFor(() => expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-triage-kairon-verification-rerun',
    }))
  })

  it('renders the project by dimension coverage matrix and opens cell details', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    const matrix = await screen.findByRole('region', { name: '项目能力维度交叉矩阵' })
    expect(within(matrix).getByRole('columnheader', { name: 'Cockpit 入口' })).toBeInTheDocument()
    expect(within(matrix).getByRole('columnheader', { name: '验证证据' })).toBeInTheDocument()
    expect(within(matrix).getByRole('button', { name: 'kairon 验证证据：缺口' })).toBeInTheDocument()

    fireEvent.click(within(matrix).getByRole('button', { name: 'kairon 验证证据：缺口' }))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })
  })

  it('scopes bulk verification triage to selected projects', async () => {
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={vi.fn()} />)

    const matrix = await screen.findByRole('region', { name: '项目能力维度交叉矩阵' })
    fireEvent.click(within(matrix).getByRole('checkbox', { name: '选择项目 kairon' }))
    fireEvent.click(screen.getByRole('button', { name: '批量承接验证缺口' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/triage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            category: 'verification',
            command_id: 'verification-rerun',
            project_ids: ['kairon'],
          }),
        }),
      )
      expect(screen.getByRole('status')).toHaveTextContent('选中 1 个项目的验证缺口')
    })
  })

  it('keeps the project context when opening its cockpit entry from the project matrix', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    const projectMatrix = await screen.findByRole('heading', { name: '项目矩阵' })
    const matrixSection = projectMatrix.closest('section')
    expect(matrixSection).not.toBeNull()

    fireEvent.click(within(matrixSection as HTMLElement).getAllByRole('button', { name: '系统地图' })[0])

    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'SystemMap', projectId: 'cockpit' })
  })

  it('queues an enabled project command without executing it', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusProjectId="cockpit" />)

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '承接项目动作 复制验证' }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: '承接项目动作 复制验证' })[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/cockpit/actions/copy-verify-command/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-action-cockpit-copy-verify-command',
      })
      expect(screen.getByRole('status')).toHaveTextContent('已登记为计划任务')
    })
  })

  it('queues a triage command without executing it', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '承接排查命令 kairon 复跑验证' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '承接排查命令 kairon 复跑验证' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/kairon/triage/verification-rerun/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-triage-kairon-verification-rerun',
      })
      expect(screen.getByRole('status')).toHaveTextContent('已登记为计划任务')
    })
  })

  it('requeues a failed triage task as a new attempt', async () => {
    const onOpenTarget = vi.fn()
    const failedPayload = JSON.parse(JSON.stringify(systemMapPayload))
    failedPayload.project_triage.queues[1].commands[0].task = {
      task_id: 'cockpit-triage-kairon-verification-rerun',
      status: 'failed',
      execution_audit: { exit_code: 124, timed_out: true },
    }
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(failedPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson({ items: [] })
      if (url === '/api/cockpit/projects/kairon/triage/verification-rerun/queue') {
        return okJson({ id: 'cockpit-triage-kairon-verification-rerun-r2', status: 'pending' })
      }
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重新承接排查命令 kairon 复跑验证' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '重新承接排查命令 kairon 复跑验证' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/kairon/triage/verification-rerun/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-triage-kairon-verification-rerun-r2',
      })
    })
  })

  it('opens an already queued triage task for approval or execution', async () => {
    const onOpenTarget = vi.fn()
    const queuedPayload = JSON.parse(JSON.stringify(systemMapPayload))
    queuedPayload.project_triage.queues[1].commands[0].task = {
      task_id: 'cockpit-triage-kairon-verification-rerun',
      status: 'planned',
      execution_audit: {},
    }
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(queuedPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson({ items: [] })
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '打开排查任务 kairon 复跑验证' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '打开排查任务 kairon 复跑验证' }))

    expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-triage-kairon-verification-rerun',
    })
  })

  it('falls back to TaskCenter tab navigation for an already queued triage task', async () => {
    const onNavigate = vi.fn()
    const queuedPayload = JSON.parse(JSON.stringify(systemMapPayload))
    queuedPayload.project_triage.queues[1].commands[0].task = {
      task_id: 'cockpit-triage-kairon-verification-rerun',
      status: 'pending',
    }
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input) === '/api/cockpit/system-map') return okJson(queuedPayload)
      return okJson({})
    })

    render(<SystemMapView onNavigate={onNavigate} />)
    const button = await screen.findByRole('button', { name: '打开排查任务 kairon 复跑验证' })
    fireEvent.click(button)

    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('batches verification triage into OMO tasks without executing commands', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量承接验证缺口' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批量承接验证缺口' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/triage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'verification', command_id: 'verification-rerun' }),
        }),
      )
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' })
      expect(screen.getByRole('status')).toHaveTextContent('已批量承接验证缺口：2 条')
    })
  })

  it('exposes evidence-only verification triage without executing commands', async () => {
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量承接验证证据补录' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批量承接验证证据补录' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/triage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'verification', command_id: 'verification-find-evidence' }),
        }),
      )
      expect(screen.getByRole('status')).toHaveTextContent('已批量承接验证证据补录：2 条')
    })
  })

  it('batches runtime probe triage without executing commands', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量承接运行探针' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批量承接运行探针' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/triage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'runtime' }),
        }),
      )
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' })
      expect(screen.getByRole('status')).toHaveTextContent('已批量承接运行探针：2 条')
    })
  })

  it('batches all coverage drafts into OMO tasks without executing them', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量承接全站缺口' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '批量承接全站缺口' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/coverage/queue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ category: 'all', limit: 40 }),
        }),
      )
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-' })
      expect(screen.getByRole('status')).toHaveTextContent('已批量承接全站缺口：4 条')
    })
  })

  it('connects usage paths to playbooks, domains, roadmap items, and task drafts', async () => {
    const onNavigate = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getAllByText('使用路径工作台').length).toBeGreaterThan(0)
      expect(screen.getAllByText('日常体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/覆盖页/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/相关清单/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('每日体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText('运行态势').length).toBeGreaterThan(0)
      expect(screen.getAllByText('日常路径工作台').length).toBeGreaterThan(0)
      expect(screen.getAllByText('部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getAllByText('任务草稿').length).toBeGreaterThan(0)
      expect(screen.getAllByText('操作清单：每日体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText('页面能力：补齐 首页').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /任务草稿/ }))

    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
    expect(fetch).toHaveBeenCalledWith(SYSTEM_MAP_DRAFT_TASKS_URL)
  })

  it('supports deep-link focus for coverage dimensions, pages, and feature domains', async () => {
    const { rerender } = render(<SystemMapView onNavigate={vi.fn()} focusCoverageDimensionId="verification" />)

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
    })

    rerender(<SystemMapView onNavigate={vi.fn()} focusPageId="AlertCenter" />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(within(focus).getByText('告警中心')).toBeInTheDocument()
    })

    rerender(<SystemMapView onNavigate={vi.fn()} focusFeatureDomainId="runtime-ops" />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力域' })
      expect(within(focus).getByText('运行态势')).toBeInTheDocument()
    })
  })

  it('surfaces a focused capability gap with closure handoff routes when launched with a gap id', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusGapId="project-native-surface" />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力缺口' })
      expect(focus).toBeInTheDocument()
      expect(screen.getAllByText('部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/继续补齐项目原生入口/).length).toBeGreaterThan(0)
      expect(within(focus).getByText('缺口承接面')).toBeInTheDocument()
      expect(within(focus).getByText('当前承接线索')).toBeInTheDocument()
      expect(within(focus).getByText('反向修复入口')).toBeInTheDocument()
      expect(within(focus).getByText('查看项目')).toBeInTheDocument()
      expect(within(focus).getByText('查看任务草稿')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '能力缺口承接总表' })).toBeInTheDocument()
      expect(screen.getByText('已挂页面')).toBeInTheDocument()
      expect(screen.getByText('待跟项目')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力缺口' })).getByText('查看项目'))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力缺口' })).getByText('查看任务草稿'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'kairon', '项目组合：修复 kairon')
  })

  it('summarizes page capability maturity across site pages', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const workbench = screen.getByRole('region', { name: '系统地图闭环工作台' })
      expect(workbench).toBeInTheDocument()
      expect(within(workbench).getByText('当前 3 个闭环位')).toBeInTheDocument()
      expect(within(workbench).getByLabelText('系统地图闭环 日常体检 · 路径闭环')).toBeInTheDocument()
      expect(within(workbench).getByLabelText('系统地图闭环 首页 · 页面闭环')).toBeInTheDocument()
      expect(within(workbench).getByLabelText('系统地图闭环 运行态势 · 能力域闭环')).toBeInTheDocument()
      expect(screen.getByText('页面能力成熟度')).toBeInTheDocument()
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(focus).toBeInTheDocument()
      expect(screen.getByText('可日用 0')).toBeInTheDocument()
      expect(screen.getByText('观察 2')).toBeInTheDocument()
      expect(screen.getByText('待补 2')).toBeInTheDocument()
      expect(screen.getAllByText(/观察 · 65%/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/补一条操作清单步骤，让页面进入日常流程。/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/补项目或服务映射，避免页面只有入口没有对象。/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('首页').length).toBeGreaterThan(0)
      expect(within(focus).getByText('项目映射缺失')).toBeInTheDocument()
      expect(within(focus).getByText('受控动作缺失')).toBeInTheDocument()
      expect(within(focus).getByText('查看路径')).toBeInTheDocument()
      expect(within(focus).getByText('查看清单')).toBeInTheDocument()
      expect(within(focus).getByText('查看页面草稿')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦页面' })).getByText('查看页面草稿'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'Home', '页面能力：补齐 首页')

    fireEvent.click(screen.getAllByRole('button', { name: '查看剖面' })[1])

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(within(focus).getByText('告警中心')).toBeInTheDocument()
      expect(within(focus).getByText('项目映射缺失')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦页面' })).getByText('查看清单'))

    expectTaskCenterDraftCall(onOpenTarget, 1, 'daily-health-check', '操作清单：每日体检')

    fireEvent.click(screen.getAllByRole('button', { name: /进入页面/ })[0])

    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'AlertCenter',
      pageId: 'AlertCenter',
    }))

    const pageFilter = screen.getByRole('group', { name: '页面成熟度筛选' })
    fireEvent.click(within(pageFilter).getByRole('button', { name: '筛选页面成熟度：未追踪' }))
    expect(within(pageFilter).getByRole('button', { name: '筛选页面成熟度：未追踪' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(pageFilter).getByText(/显示 \d+ \/ 4/)).toBeInTheDocument()
  })

  it('expands the complete page action catalog instead of hiding actions behind a counter', async () => {
    const payload = JSON.parse(JSON.stringify(systemMapPayload))
    payload.cockpit_pages = payload.cockpit_pages.map((page: typeof systemMapPayload.cockpit_pages[0]) => page.id === 'Home'
      ? { ...page, operator_actions: ['refresh-home', 'open-system-map', 'open-task-center', 'open-guide-group', 'open-source'] }
      : page)
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(payload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      throw new Error(`Unexpected fetch: ${url}`)
    })
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={vi.fn()} />)

    const actionRegion = await screen.findByLabelText('页面受控动作证据')
    const expandButton = within(actionRegion).getByRole('button', { name: '展开页面动作 首页' })
    expect(within(actionRegion).queryByLabelText('承接页面动作 open-source')).not.toBeInTheDocument()

    fireEvent.click(expandButton)

    expect(within(actionRegion).getByLabelText('承接页面动作 open-source')).toBeInTheDocument()
    expect(within(actionRegion).getByRole('button', { name: '收起页面动作 首页' })).toBeInTheDocument()
  })

  it('builds a focused feature-domain repair profile with reverse links', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力域' })
      expect(focus).toBeInTheDocument()
      expect(within(focus).getByText('运行态势')).toBeInTheDocument()
      expect(within(focus).getByText('能力接入面')).toBeInTheDocument()
      expect(within(focus).getByText('提供方与能力项')).toBeInTheDocument()
      expect(within(focus).getByText('查看路径')).toBeInTheDocument()
      expect(within(focus).getByText('查看清单')).toBeInTheDocument()
      expect(within(focus).getByText('查看页面草稿')).toBeInTheDocument()
      expect(within(focus).getByText('查看路线图')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力域' })).getByText('查看清单'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'daily-health-check', '操作清单：每日体检')

    fireEvent.click(screen.getAllByRole('button', { name: '查看剖面' })[0])

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦能力域' })
      expect(within(focus).getByText('运行态势')).toBeInTheDocument()
    })

    fireEvent.click(within(screen.getByRole('region', { name: '当前聚焦能力域' })).getByText('进入页面'))

    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
      tab: 'Home',
      pageId: 'Home',
      featureDomainId: 'runtime-ops',
    }))
  })

  it('filters the project matrix by project focus queue', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
      expect(screen.getAllByText('kairon').length).toBeGreaterThan(0)
      expect(screen.getByText('排查命令队列')).toBeInTheDocument()
      expect(screen.getByText('项目组合态势')).toBeInTheDocument()
      expect(screen.getByText('组合分')).toBeInTheDocument()
      expect(screen.getAllByText('优先项目').length).toBeGreaterThan(0)
      expect(screen.getAllByText('阻塞项目').length).toBeGreaterThan(0)
      expect(screen.getByText('验证排查')).toBeInTheDocument()
      expect(screen.getAllByText(/kairon · 复跑验证/).length).toBeGreaterThan(0)
      expect(screen.getByText('能力覆盖矩阵')).toBeInTheDocument()
      expect(screen.getAllByText('验证证据').length).toBeGreaterThan(0)
      expect(screen.getByText('覆盖分')).toBeInTheDocument()
      expect(screen.getAllByText('最近验证失败').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /验证待补证/ }))

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({
        tab: 'SystemMap',
        projectFilter: 'verification-gap',
      }))
    })
  })

  it('filters the project matrix by portfolio posture bucket', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /阻塞项目/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /阻塞项目/ }))

    await waitFor(() => {
      expect(screen.getByText(/组合态势：阻塞项目/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '查看 cockpit 项目详情' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
      expect(screen.getByText(/显示 1 \/ 2 · 命令 1/)).toBeInTheDocument()
    })
  })

  it('filters projects by architecture layer and cockpit entry page', async () => {
    const defaultFetch = vi.mocked(fetch).getMockImplementation()
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') {
        const domainProject = { ...systemMapPayload.projects[1], layer: 'L4', cockpit_page: 'DomainApps' }
        return okJson({
          ...systemMapPayload,
          cockpit_pages: [...systemMapPayload.cockpit_pages, { id: 'DomainApps', title: '应用中心', group: '领域应用', purpose: '领域应用入口', dimensions: ['domain'] }],
          projects: [systemMapPayload.projects[0], domainProject],
          project_capability_coverage: {
            ...systemMapPayload.project_capability_coverage,
            matrix: [
              systemMapPayload.project_capability_coverage.matrix[0],
              { ...systemMapPayload.project_capability_coverage.matrix[1], layer: 'L4', cockpit_page: 'DomainApps' },
            ],
          },
        })
      }
      return defaultFetch ? defaultFetch(input) : okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '按架构层级筛选项目' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '按 Cockpit 入口页筛选项目' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox', { name: '按架构层级筛选项目' }), { target: { value: 'L4' } })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '查看 cockpit 项目详情' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
      expect(screen.getByText(/显示 1 \/ 2/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox', { name: '按 Cockpit 入口页筛选项目' }), { target: { value: 'DomainApps' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
      expect(screen.getByText(/显示 1 \/ 2/)).toBeInTheDocument()
    })
  })

  it('builds a project entry mapping board with cockpit, coverage, and task handoff routes', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const board = screen.getByRole('region', { name: '项目入口映射总表' })
      expect(board).toBeInTheDocument()
      expect(within(board).getByText('入口映射')).toBeInTheDocument()
      expect(within(board).getAllByText('kairon').length).toBeGreaterThan(0)
      expect(within(board).getByText('打开项目入口')).toBeInTheDocument()
      expect(within(board).getByText('查看项目覆盖')).toBeInTheDocument()
      expect(within(board).getByText('打开项目任务')).toBeInTheDocument()
      expect(within(board).getByText('定位缺口维度')).toBeInTheDocument()
      expect(within(board).getByText('草稿 项目组合：修复 kairon')).toBeInTheDocument()
    })

    const board = screen.getByRole('region', { name: '项目入口映射总表' })
    fireEvent.click(within(board).getByText('打开项目入口'))
    expect(onOpenTarget).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tab: 'SystemMap',
      projectId: 'kairon',
    }))

    fireEvent.click(within(board).getByText('查看项目覆盖'))
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tab: 'SystemMap',
      projectId: 'kairon',
    }))

    fireEvent.click(within(board).getByText('打开项目任务'))
    expectTaskCenterDraftCall(onOpenTarget, 2, 'kairon', '项目组合：修复 kairon')

    fireEvent.click(within(board).getByText('定位缺口维度'))
    expect(onOpenTarget).toHaveBeenNthCalledWith(4, expect.objectContaining({
      tab: 'SystemMap',
      projectId: 'kairon',
      coverageDimensionId: 'verification',
    }))
  })

  it('surfaces a project dimension repair workbench', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '项目维度修复台' })).toBeInTheDocument()
    })

    const workbench = screen.getByRole('region', { name: '项目维度修复台' })
    const picker = within(workbench).getByRole('list', { name: '项目覆盖维度' })

    expect(within(workbench).getAllByText('验证证据').length).toBeGreaterThan(0)
    expect(within(workbench).getAllByText((_, element) => Boolean(element?.textContent?.includes('维度分'))).length).toBeGreaterThan(0)
    expect(within(workbench).getByText('缺口 1 · 提醒 0')).toBeInTheDocument()
    expect(within(workbench).getByRole('button', { name: /查看 kairon 维度修复详情/ })).toBeInTheDocument()
    expect(within(workbench).getByText('最近验证：failed，checks=1。')).toBeInTheDocument()
    expect(within(workbench).getAllByText('复跑验证').length).toBeGreaterThan(0)

    fireEvent.click(within(picker).getByRole('button', { name: /Cockpit 入口/ }))

    await waitFor(() => {
      expect(within(workbench).getByText('这个维度当前没有待处理项目')).toBeInTheDocument()
    })
  })

  it('builds a capability backlog workbench for missing pages, gaps, domains, and drafts', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const backlog = screen.getByRole('region', { name: '能力建设 Backlog' })
      expect(backlog).toBeInTheDocument()
      expect(within(backlog).getByText('页面待补位')).toBeInTheDocument()
      expect(within(backlog).getByText('领域与缺口待收口')).toBeInTheDocument()
      expect(within(backlog).getByText('路线图与草稿承接')).toBeInTheDocument()
      expect(within(backlog).getByText('family-hub 服务')).toBeInTheDocument()
      expect(within(backlog).getAllByText('页面能力：补齐 首页').length).toBeGreaterThan(0)
      expect(within(backlog).getByText('日常路径工作台')).toBeInTheDocument()
      expect(within(backlog).getAllByText('部分项目仍需补齐状态面').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /打开待挂能力域页面 TaskCenter/ }))

    await waitFor(() => {
      const focus = screen.getByRole('region', { name: '当前聚焦页面' })
      expect(within(focus).getByText('任务中心')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开能力缺口 project-native-surface/ }))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '当前聚焦能力缺口' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开待收口领域 family-hub/ }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'DomainApps', taskQuery: 'family-hub' })

    fireEvent.click(screen.getByRole('button', { name: /打开待完成路线图 daily-ops-console/ }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Home', taskQuery: 'daily-ops-console' })

    fireEvent.click(screen.getByRole('button', { name: /打开建设草稿 页面能力：补齐 首页/ }))
    expectTaskCenterDraftCall(onOpenTarget, 2, 'Home', '页面能力：补齐 首页')
  })

  it('builds a unified construction control tower across pages, domains, verification, and roadmap', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      const tower = screen.getByRole('region', { name: '统一建设控制台' })
      expect(tower).toBeInTheDocument()
      expect(within(tower).getByText('页面能力建设')).toBeInTheDocument()
      expect(within(tower).getByText('领域挂载合同')).toBeInTheDocument()
      expect(within(tower).getByText('验证与补证')).toBeInTheDocument()
      expect(within(tower).getByText('项目与路线图优先项')).toBeInTheDocument()
      expect(within(tower).getByText('family-hub 服务')).toBeInTheDocument()
      expect(within(tower).getByText('验证补证：cockpit')).toBeInTheDocument()
      expect(within(tower).getByText('日常路径工作台')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /打开领域合同项 family-hub/ }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'DomainApps', taskQuery: 'family-hub' })

    fireEvent.click(screen.getByRole('button', { name: /打开验证补证 cockpit/ }))
    expectTaskCenterDraftCall(onOpenTarget, 1, 'cockpit', '验证补证：cockpit')

    fireEvent.click(screen.getByRole('button', { name: /打开优先项目 kairon/ }))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })
  })

  it('links coverage dimensions to project and triage filters', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('能力覆盖矩阵')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '查看 cockpit 项目详情' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '筛选覆盖维度：验证证据' }))

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '查看 cockpit 项目详情' })).not.toBeInTheDocument()
      expect(screen.getAllByText('kairon').length).toBeGreaterThan(0)
      expect(screen.getByText(/显示 1 \/ 2 · 命令 1/)).toBeInTheDocument()
      expect(screen.getAllByText(/kairon · 复跑验证/).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /kairon 验证证据：/ }))

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
    })
  })

  it('opens a project detail panel with workflow evidence and commands', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '查看 kairon 项目详情' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '查看 kairon 项目详情' }))

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
      expect(screen.getByText('项目详情')).toBeInTheDocument()
      expect(screen.getByText('工作流时间线')).toBeInTheDocument()
      expect(screen.getByText('run：run-kairon')).toBeInTheDocument()
      expect(screen.getByText(/修复 kairon 验证/)).toBeInTheDocument()
      expect(screen.getByText('checks=1')).toBeInTheDocument()
      expect(screen.getAllByText('验证证据').length).toBeGreaterThan(0)
      expect(screen.getByText('run：暂无')).toBeInTheDocument()
      expect(screen.getAllByText('复跑验证').length).toBeGreaterThan(0)
      expect(screen.getByText('查看项目草稿')).toBeInTheDocument()
      expect(screen.getByText('查看覆盖维度')).toBeInTheDocument()
      expect(screen.getByText('查看页面能力')).toBeInTheDocument()
      expect(screen.getByText('查看使用路径')).toBeInTheDocument()
      expect(screen.getAllByText('来源证据').length).toBeGreaterThan(1)
      const workbench = screen.getByRole('region', { name: '系统地图闭环工作台' })
      expect(within(workbench).getByLabelText('系统地图闭环 kairon · 项目闭环')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('查看项目草稿'))

    expectTaskCenterDraftCall(onOpenTarget, 0, 'kairon', '项目组合：修复 kairon')

    fireEvent.click(within(screen.getByLabelText('kairon 项目详情')).getByRole('button', { name: '打开项目页面' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'Overview', projectId: 'kairon' })

    fireEvent.click(screen.getByRole('button', { name: '打开系统地图闭环对象 kairon · 项目闭环' }))

    expectTaskCenterDraftCall(onOpenTarget, 2, 'kairon', '项目组合：修复 kairon')

    fireEvent.click(screen.getByText('查看覆盖维度'))

    await waitFor(() => {
      expect(screen.getByText(/覆盖维度：验证证据/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('查看页面能力'))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '当前聚焦页面' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('查看使用路径'))

    await waitFor(() => {
      expect(screen.getAllByText('治理闭环').length).toBeGreaterThan(0)
    })
  })
})
