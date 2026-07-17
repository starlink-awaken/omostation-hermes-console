import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import KnowledgeExecutionWorkbench from '../KnowledgeExecutionWorkbench'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('KnowledgeExecutionWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders the cross-page execution chain and navigates to the next surface', async () => {
    const onNavigate = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80') {
        return Promise.resolve(okJson({
          items: [
            {
              id: 'task-1',
              title: '补运行面',
              status: 'pending',
              priority: 'high',
              read_only: true,
              source: { type: 'system_map_page_maturity', title: '性能监控 页面成熟度' },
            },
          ],
        }))
      }
      if (url === '/api/metaos/workflows') {
        return Promise.resolve(okJson({
          status: 'ok',
          workflows: [
            {
              id: 'wf-1',
              task: '审批生产前检查',
              status: 'awaiting_approval',
              updated: '2026-07-07 10:00',
            },
          ],
        }))
      }
      if (url === '/api/ecos/skills') {
        return Promise.resolve(okJson({
          skills: [
            { id: 'skill-1', name: 'governance-phase-orchestrator' },
            { id: 'skill-2', name: 'workflow-silence-detection' },
          ],
        }))
      }
      if (url === '/api/pipelines') {
        return Promise.resolve(okJson({ pipelines: ['code-review', 'risk-audit'] }))
      }
      if (url === '/api/ecos/workflows') {
        return Promise.resolve(okJson({
          workflows: [
            { name: 'nightly-governance', description: '跑一轮夜间治理巡检', steps: 5 },
          ],
        }))
      }
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          usage_paths: [
            {
              id: 'daily-ops',
              title: '日常体检',
              intent: '先看缺口，再决定走任务还是工作流。',
              steps: ['知识', '资产', '执行', '任务'],
            },
          ],
          playbooks: [
            {
              id: 'health-check',
              title: '每日 5 分钟体检',
              goal: '确认首页、告警和任务链路正常。',
              frequency: 'daily',
            },
          ],
          gaps: [
            {
              id: 'knowledge-gap',
              title: '知识页还缺执行导流',
              severity: 'high',
              next: '补上知识页到任务中心的桥。',
            },
          ],
          roadmap: {
            items: [
              {
                id: 'roadmap-1',
                title: '任务链打通',
                priority: 'P1',
                problem: '知识、资产和执行页目前还偏散。',
              },
            ],
          },
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<KnowledgeExecutionWorkbench currentPage="Knowledge" onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('知识到执行工作台')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '执行闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('1 条待审批')).toBeInTheDocument()
      expect(screen.getByText('5 项能力')).toBeInTheDocument()
      expect(screen.getAllByText('日常体检').length).toBeGreaterThan(0)
      expect(screen.getByText('知识页还缺执行导流')).toBeInTheDocument()
    })

    const board = screen.getByRole('region', { name: '执行闭环总表' })
    expect(within(board).getByText('知识锚点')).toBeInTheDocument()
    expect(within(board).getByText('能力与自动化')).toBeInTheDocument()
    expect(within(board).getByText('执行编排')).toBeInTheDocument()
    expect(within(board).getByText('任务落地')).toBeInTheDocument()
    expect(within(board).getByText('1 路径 · 1 清单 · 1 缺口')).toBeInTheDocument()

    fireEvent.click(screen.getByText(/有 1 条工作流在等人工放行/))
    expect(onNavigate).toHaveBeenCalledWith('Workflows')

    fireEvent.click(within(board).getByRole('button', { name: '打开闭环对象 执行编排' }))
    expect(onNavigate).toHaveBeenCalledWith('Workflows')

    fireEvent.click(within(board).getByRole('button', { name: '打开闭环任务 能力与自动化' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /去任务中心/ }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('shows empty-state guidance when upstream data is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({ items: [] }))

    render(<KnowledgeExecutionWorkbench currentPage="Assets" />)

    await waitFor(() => {
      expect(screen.getByText('能力面还偏薄')).toBeInTheDocument()
      expect(screen.getByText('还没有高频路径')).toBeInTheDocument()
    })
  })

  it('keeps the execution path visible when the skills source fails', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/ecos/skills') {
        return Promise.reject(new Error('skills source offline'))
      }
      return Promise.resolve(okJson({}))
    })

    render(<KnowledgeExecutionWorkbench currentPage="Assets" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('技能目录：skills source offline')
      expect(screen.getByText('能力面还偏薄')).toBeInTheDocument()
    })
  })
})
