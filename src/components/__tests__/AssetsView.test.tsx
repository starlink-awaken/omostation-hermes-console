import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import AssetsView from '../AssetsView'

vi.mock('../KnowledgeExecutionWorkbench', () => ({
  default: () => <div data-testid="knowledge-workbench" />,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('AssetsView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/ecos/skills') {
        return Promise.resolve(okJson({
          skills: [
            {
              id: 'skill-local-1',
              name: '自定义治理技能',
              description: '用于治理闭环收口',
              source: 'local',
              path: '/Users/xiamingxing/.codex/skills/governance-local',
            },
            {
              id: 'skill-plugin-1',
              name: 'plugin-skill',
              description: '插件技能',
              source: 'plugin:demo',
              path: '/Users/xiamingxing/.codex/plugins/demo',
            },
          ],
        }))
      }
      if (url === '/api/pipelines') {
        return Promise.resolve(okJson({
          pipelines: ['risk-audit', 'governance-review'],
        }))
      }
      if (url === '/api/ecos/workflows') {
        return Promise.resolve(okJson({
          workflows: [
            {
              name: 'nightly-governance',
              description: '夜间治理巡检',
              steps: 5,
            },
          ],
        }))
      }
      return Promise.resolve(okJson({}))
    })
  })

  it('queues an asset pipeline into TaskCenter instead of launching it directly', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/pipelines') return Promise.resolve(okJson({ pipelines: ['risk-audit'] }))
      if (url === '/api/ecos/skills') return Promise.resolve(okJson({ skills: [] }))
      if (url === '/api/ecos/workflows') return Promise.resolve(okJson({ workflows: [] }))
      if (url === '/api/cockpit/engine/queue') {
        expect(init?.method).toBe('POST')
        return Promise.resolve(okJson({ id: 'cockpit-engine-risk-audit', executes: false }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<AssetsView onNavigate={onNavigate} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /工具管线 \(Pipelines: 1\)/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /工具管线 \(Pipelines: 1\)/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: '承接工具管线任务' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '承接工具管线任务' }))

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
      expect(screen.getAllByText(/已登记为任务/).length).toBeGreaterThan(0)
    })
  })

  it('surfaces an asset workbench and navigates toward governance and workflow follow-up', async () => {
    const onNavigate = vi.fn()
    render(<AssetsView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('技术资产总览')).toBeInTheDocument()
      expect(screen.getByText('资产承接工作台')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '资产闭环总表' })).toBeInTheDocument()
      expect(screen.getAllByText('自定义治理技能').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '治理技能 自定义治理技能' }))
    expect(onNavigate).toHaveBeenCalledWith('Protocol')

    fireEvent.click(screen.getByRole('button', { name: '处理工作流 nightly-governance' }))
    expect(onNavigate).toHaveBeenCalledWith('Workflows')

    fireEvent.click(screen.getByRole('button', { name: '打开资产闭环对象 工作流验收到运行面' }))
    expect(onNavigate).toHaveBeenCalledWith('Workflows')
  })

  it('registers local skill governance as a formal task', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/ecos/skills') return Promise.resolve(okJson({
        skills: [{ id: 'skill-local-1', name: '自定义治理技能', description: '用于治理闭环收口', source: 'local', path: '/workspace/skill-local-1' }],
      }))
      if (url === '/api/pipelines') return Promise.resolve(okJson({ pipelines: [] }))
      if (url === '/api/ecos/workflows') return Promise.resolve(okJson({ workflows: [] }))
      if (url === '/api/tasks') {
        expect(init?.method).toBe('POST')
        return Promise.resolve(okJson({ id: 'skill-governance-task', title: '技能治理任务' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<AssetsView onOpenTarget={onOpenTarget} />)

    const button = await screen.findByRole('button', { name: '登记技能治理任务 自定义治理技能' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'skill-governance-task' })
      expect(screen.getByText('已登记技能治理任务：技能治理任务')).toBeInTheDocument()
    })
  })

  it('filters skills, pipelines, and workflows from one shared asset query', async () => {
    render(<AssetsView />)

    const filterRegion = await screen.findByRole('region', { name: '技术资产筛选' })
    const query = within(filterRegion).getByRole('searchbox', { name: '搜索技术资产' })

    fireEvent.change(query, { target: { value: '治理闭环' } })
    await waitFor(() => {
      expect(within(filterRegion).getByText('技能 1/2 · 管线 0/2 · 工作流 0/1')).toBeInTheDocument()
      expect(screen.getAllByText('自定义治理技能').length).toBeGreaterThan(0)
      expect(screen.queryByText('plugin-skill')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /工具管线 \(Pipelines: 2\)/ }))
    fireEvent.change(query, { target: { value: 'risk-audit' } })
    await waitFor(() => {
      expect(within(filterRegion).getByText('技能 0/2 · 管线 1/2 · 工作流 0/1')).toBeInTheDocument()
      expect(screen.getAllByText('risk-audit').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /自动化工作流 \(1\)/ }))
    fireEvent.change(query, { target: { value: '夜间' } })
    await waitFor(() => {
      expect(within(filterRegion).getByText('技能 0/2 · 管线 0/2 · 工作流 1/1')).toBeInTheDocument()
      expect(screen.getAllByText('nightly-governance').length).toBeGreaterThan(0)
    })
  })

  it('surfaces focus handoff for a matched asset pipeline', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <AssetsView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="risk-audit"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前资产承接焦点' })
    expect(within(focusRegion).getByText('risk-audit')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开资产焦点对象 risk-audit' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开资产焦点任务 risk-audit' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Assets', taskQuery: 'risk-audit' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'risk-audit' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces asset closure routing when focus hits knowledge handoff', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <AssetsView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="知识供给入资产"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前资产承接焦点' })
    expect(within(focusRegion).getByText('知识供给入资产')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开资产焦点对象 知识供给入资产' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开资产焦点任务 知识供给入资产' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Knowledge', taskQuery: '知识供给入资产' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '知识供给入资产' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('shows which asset sources are unavailable instead of rendering zeroes silently', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: '资产服务不可用' }),
    } as Response)

    render(<AssetsView />)

    expect(await screen.findByRole('alert')).toHaveTextContent('资产数据部分不可用')
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('turns a successful workflow test into a TaskCenter acceptance task', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/ecos/skills') return Promise.resolve(okJson({ skills: [] }))
      if (url === '/api/pipelines') return Promise.resolve(okJson({ pipelines: [] }))
      if (url === '/api/ecos/workflows') return Promise.resolve(okJson({ workflows: [{ name: 'nightly-governance', description: '夜间治理巡检', steps: 5 }] }))
      if (url === '/api/ecos/workflow/test?name=nightly-governance') return Promise.resolve(okJson({ workflow: 'nightly-governance', tests_passed: 5 }))
      if (url === '/api/cockpit/ecos/workflows/nightly-governance/queue?mode=dry_run') return Promise.resolve(okJson({ id: 'cockpit-ecos-workflow-nightly-governance-dry_run', executes: false }))
      return Promise.resolve(okJson({}))
    })

    render(<AssetsView onOpenTarget={onOpenTarget} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /自动化工作流/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /自动化工作流/ }))
    fireEvent.click(await screen.findByRole('button', { name: '测试运行' }))
    fireEvent.click(await screen.findByRole('button', { name: '登记工作流验收任务 nightly-governance' }))

    await waitFor(() => expect(onOpenTarget).toHaveBeenCalledWith({
      tab: 'TaskCenter',
      taskQuery: 'cockpit-ecos-workflow-nightly-governance-dry_run',
    }))
  })

  it('does not treat an unavailable workflow test as a successful result', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/ecos/skills') return Promise.resolve(okJson({ skills: [] }))
      if (url === '/api/pipelines') return Promise.resolve(okJson({ pipelines: [] }))
      if (url === '/api/ecos/workflows') return Promise.resolve(okJson({ workflows: [{ name: 'nightly-governance', description: '夜间治理巡检', steps: 5 }] }))
      if (url === '/api/ecos/workflow/test?name=nightly-governance') {
        return Promise.resolve({ ok: false, status: 503, json: async () => ({}) } as Response)
      }
      return Promise.resolve(okJson({}))
    })

    render(<AssetsView />)
    await waitFor(() => expect(screen.getByRole('button', { name: /自动化工作流/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /自动化工作流/ }))
    fireEvent.click(await screen.findByRole('button', { name: '测试运行' }))

    await waitFor(() => {
      expect(screen.getByText(/最近测试失败/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '登记工作流验收任务 nightly-governance' })).not.toBeInTheDocument()
      expect(screen.getByText(/HTTP 503/)).toBeInTheDocument()
    })
  })
})
