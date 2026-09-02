import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SystemMapView from '../SystemMapView'
import {
  systemMapPayload,
  sourceRef,
  sourcePreviewPayload,
  draftTasksPayload,
  okJson,
  setupSystemMapTest,
  SYSTEM_MAP_DRAFT_TASKS_URL,
} from './__fixtures__/SystemMapView.fixtures'

describe('SystemMapView rendering', () => {
  beforeEach(() => {
    setupSystemMapTest()
  })

  it('previews source references inside the system map', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('来源证据预览')).toBeInTheDocument()
      expect(screen.getByText(/数据快照/)).toBeInTheDocument()
      expect(screen.getByText(/schema v1/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getAllByRole('button', { name: /路线图定义/ })[0])

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/cockpit/source-ref?target=${encodeURIComponent(sourceRef.target)}&context=4`,
      )
      expect(screen.getByText('ROADMAP_ITEMS = (')).toBeInTheDocument()
      expect(screen.getByText(/接口不执行本机打开命令/)).toBeInTheDocument()
    })
  }, 15000)

  it('keeps a retry action available when the system map source is unavailable', async () => {
    let attempts = 0
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') {
        attempts += 1
        return attempts === 1
          ? ({ ok: false, status: 503, json: async () => ({}) } as Response)
          : okJson(systemMapPayload)
      }
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(<SystemMapView onNavigate={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('系统地图读取失败')
    fireEvent.click(screen.getByRole('button', { name: '重试系统地图' }))

    await waitFor(() => {
      expect(screen.getByText('来源证据预览')).toBeInTheDocument()
      expect(attempts).toBe(2)
    })
  })

  it('opens the focused project detail when launched with a project id', async () => {
    render(<SystemMapView onNavigate={vi.fn()} focusProjectId="kairon" />)

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
      expect(screen.getByText('注册合同')).toBeInTheDocument()
      expect(screen.getByText('版本：0.4.0')).toBeInTheDocument()
      expect(screen.getByText('构建后端：hatchling')).toBeInTheDocument()
      expect(screen.getByText('工作流时间线')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'kairon 验证历史' })).toBeInTheDocument()
      expect(screen.getByText('run-kairon · checks 1')).toBeInTheDocument()
      expect(screen.getByText('run：run-kairon')).toBeInTheDocument()
    })
  })

  it('resolves a loose task query to a project when no structured focus is present', async () => {
    render(<SystemMapView onNavigate={vi.fn()} focusTaskQuery="kairon" />)

    await waitFor(() => {
      expect(screen.getByLabelText('kairon 项目详情')).toBeInTheDocument()
      expect(screen.getByText('工作流时间线')).toBeInTheDocument()
    })
  })

  it('summarizes domain app coverage inside the system map', async () => {
    const onOpenTarget = vi.fn()

    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByText('领域应用覆盖')).toBeInTheDocument()
      expect(screen.getByText('家庭驾驶舱')).toBeInTheDocument()
      expect(screen.getAllByText('family-hub 服务').length).toBeGreaterThan(0)
      expect(screen.getByText(/启动或验证停止的领域服务/)).toBeInTheDocument()
      expect(screen.getAllByText(/运行 stopped/).length).toBeGreaterThan(0)
      expect(screen.getByText('3 · 93%')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByRole('button', { name: /应用中心/ })[0])

    expect(onOpenTarget).toHaveBeenCalledWith(expect.objectContaining({ tab: 'DomainApps' }))
  })

  it('explains that a runtime probe is waiting for human approval', async () => {
    const approvalPayload = JSON.parse(JSON.stringify(systemMapPayload))
    approvalPayload.projects = approvalPayload.projects.map((project: typeof approvalPayload.projects[0]) => project.id === 'kairon'
      ? {
        ...project,
        runtime: {
          ...project.runtime,
          probe_task: {
            task_id: 'cockpit-triage-kairon-runtime-check-ports',
            status: 'planned',
            human_approval_required: true,
            approval_state: 'missing',
            next_action: '先申请人工审批',
          },
        },
      }
      : project)
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(approvalPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson({ items: [] })
      return okJson({})
    })

    render(<SystemMapView onNavigate={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: '查看 kairon 项目详情' }))

    await waitFor(() => {
      expect(screen.getByText('证据：待人工审批')).toBeInTheDocument()
      expect(screen.getByText('下一步：先申请人工审批')).toBeInTheDocument()
    })
  })

  it('explains projects that do not need a long-running runtime probe', async () => {
    const staticPayload = {
      ...systemMapPayload,
      projects: [
        {
          ...systemMapPayload.projects[0],
          id: 'cockpit-ui',
          role: 'Web 控制台 UI',
          runtime: {
            status: 'not_applicable',
            profile: 'static',
            needs_runtime: false,
            probe_reason: '检测到 Vite/静态前端入口，按需启动开发服务器，不作为常驻运行探针。',
            ports: [],
            listening_count: 0,
            latest_verification: {
              status: 'documented',
              checks: 0,
              command: 'cd "/Users/xiamingxing/Workspace/projects/cockpit-ui" && bun run build',
              source: 'project_commands',
            },
          },
          diagnostics: [
            {
              id: 'verification-documented',
              severity: 'low',
              title: '可验证未留证',
              detail: '项目已经登记验证命令，但最近还没有 workflow 验证证据。',
              next_action: '择机运行已登记命令，并把结果补进 agent-workflow 证据。',
            },
          ],
        },
        systemMapPayload.projects[1],
      ],
      summary: {
        ...systemMapPayload.summary,
        running_projects: 0,
        not_applicable_projects: 1,
      },
    }

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(staticPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson(draftTasksPayload)
      if (url === `/api/cockpit/source-ref?target=${encodeURIComponent(sourceRef.target)}&context=4`) {
        return okJson(sourcePreviewPayload)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(<SystemMapView onNavigate={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('无需常驻 1')).toBeInTheDocument()
      expect(screen.getByText(/静态前端 · 检测到 Vite\/静态前端入口/)).toBeInTheDocument()
      expect(screen.getAllByText('可验证未留证').length).toBeGreaterThan(0)
    })
  })

  it('translates converged runtime profiles for the project detail', async () => {
    const convergedPayload = {
      ...systemMapPayload,
      projects: [
        {
          ...systemMapPayload.projects[0],
          id: 'omo',
          role: '治理引擎',
          runtime: {
            ...systemMapPayload.projects[0].runtime,
            status: 'not_applicable',
            profile: 'converged',
            needs_runtime: false,
            probe_reason: 'OMO 历史 dashboard 已收敛到 Cockpit /api/omos/status。',
            ports: [],
            listening_count: 0,
          },
        },
      ],
      summary: {
        ...systemMapPayload.summary,
        projects: 1,
        not_applicable_projects: 1,
      },
    }

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url === '/api/cockpit/system-map') return okJson(convergedPayload)
      if (url === SYSTEM_MAP_DRAFT_TASKS_URL) return okJson({ items: [] })
      throw new Error(`Unexpected fetch: ${url}`)
    })

    render(<SystemMapView onNavigate={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: '查看 omo 项目详情' }))
    await waitFor(() => {
      expect(screen.getByText(/形态：已收敛/)).toBeInTheDocument()
      expect(screen.getAllByText(/OMO 历史 dashboard/).length).toBeGreaterThan(0)
    })
  })
})
