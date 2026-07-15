import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import ResearchHubView from '../ResearchHubView'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('ResearchHubView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders research summary, pipeline and follow-up actions', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn((target: { tab: string; taskQuery?: string }) => {
      if (target.tab !== 'TaskCenter' || target.taskQuery !== 'cockpit-research-7') onNavigate(target.tab)
    })
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/cockpit/research-hub') {
        return Promise.resolve(okJson({
          summary: {
            total: 5,
            active: 3,
            archived: 1,
            quarantined: 1,
            published: 2,
            follow_ups: 6,
            agents: 2,
          },
          recent: [
            {
              id: 7,
              topic: '家庭系统研究',
              summary: '梳理家庭驾驶舱和 family-hub 的边界',
              created_at: '2026-07-07T06:00:00Z',
              source_count: 4,
              tags: ['family', 'opc'],
              agent: 'Alice',
              status: 'active',
              follow_up_count: 2,
              last_event: { label: '已发布', created_at: '2026-07-07T07:00:00Z' },
              next_action: '继续发布为简报。',
            },
          ],
          commands: [
            { id: 'start', label: '发起研究', value: 'cockpit research "主题"', detail: '创建研究对象。' },
          ],
          pipeline: [
            { id: 'Research', title: '研究中枢', summary: '看活跃研究。' },
            { id: 'Knowledge', title: '知识中枢', summary: '补知识上下文。' },
          ],
          related_pages: [
            { id: 'TaskCenter', title: '任务中心', reason: '研究结论要落任务。' },
          ],
        }))
      }
      if (String(input) === '/api/cockpit/research/7/queue') {
        return Promise.resolve(okJson({ id: 'cockpit-research-7', created: true, executes: false }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<ResearchHubView onNavigate={onNavigate} onOpenTarget={onOpenTarget} />)

    await waitFor(() => {
      expect(screen.getByText('研究主旅程')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '研究闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('研究承接工作台')).toBeInTheDocument()
      expect(screen.getByText('活跃研究')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getAllByText('家庭系统研究').length).toBeGreaterThan(0)
      expect(screen.getByText('cockpit research "主题"')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /2\. 知识中枢/ }))
    expect(onNavigate).toHaveBeenCalledWith('Knowledge')

    fireEvent.click(screen.getByRole('button', { name: /任务中心/ }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')

    fireEvent.click(screen.getByRole('button', { name: /落任务 家庭系统研究/ }))
    await waitFor(() => expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'cockpit-research-7' }))

    fireEvent.click(screen.getByRole('button', { name: '打开研究闭环对象 发布回流与复盘' }))
    expect(onNavigate).toHaveBeenCalledWith('Overview')
  })

  it('opens a research object detail with timeline and publications', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/cockpit/research-hub') {
        return Promise.resolve(okJson({
          summary: { total: 1, active: 1, archived: 0, quarantined: 0, published: 1, follow_ups: 1, agents: 1 },
          recent: [{
            id: 12,
            topic: '研究对象详情测试',
            summary: '用于验证详情闭环',
            created_at: '2026-07-08T06:00:00Z',
            source_count: 3,
            tags: ['cockpit'],
            agent: 'Researcher',
            status: 'active',
            follow_up_count: 1,
            last_event: { label: '已发布', created_at: '2026-07-08T07:00:00Z' },
            next_action: '继续跟进。',
          }],
          commands: [],
          pipeline: [],
          related_pages: [],
        }))
      }
      if (String(input) === '/api/cockpit/research-hub/12') {
        return Promise.resolve(okJson({
          status: 'ok',
          item: {
            id: 12,
            topic: '研究对象详情测试',
            summary: '用于验证详情闭环',
            full_text: '这是研究对象的完整正文。',
            created_at: '2026-07-08T06:00:00Z',
            source_count: 3,
            tags: ['cockpit'],
            follow_ups: [{ question: '下一步验证什么？' }],
            agent: 'Researcher',
            status: 'active',
          },
          timeline: [{ event_type: 'published', description: '已发布为简报', created_at: '2026-07-08T07:00:00Z' }],
          dossier: { parents: [], children: [], publications: [{ style: 'brief', path: 'reports/research-12.md', published_at: '2026-07-08T07:00:00Z' }] },
          half_life: { days: 30, status: 'fresh' },
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<ResearchHubView />)

    await waitFor(() => expect(screen.getByRole('button', { name: /查看研究详情 研究对象详情测试/ })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /查看研究详情 研究对象详情测试/ }))

    await waitFor(() => {
      expect(screen.getByRole('region', { name: '研究对象详情' })).toBeInTheDocument()
      expect(screen.getByText('这是研究对象的完整正文。')).toBeInTheDocument()
      expect(screen.getByText('已发布为简报')).toBeInTheDocument()
      expect(screen.getByText('reports/research-12.md')).toBeInTheDocument()
      expect(screen.getByText('新鲜度 30 天')).toBeInTheDocument()
    })
  })

  it('surfaces focus handoff for a matched research object', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/cockpit/research-hub') {
        return Promise.resolve(okJson({
          summary: {
            total: 5,
            active: 3,
            archived: 1,
            quarantined: 1,
            published: 2,
            follow_ups: 6,
            agents: 2,
          },
          recent: [
            {
              id: 7,
              topic: '家庭系统研究',
              summary: '梳理家庭驾驶舱和 family-hub 的边界',
              created_at: '2026-07-07T06:00:00Z',
              source_count: 4,
              tags: ['family', 'opc'],
              agent: 'Alice',
              status: 'active',
              follow_up_count: 2,
              last_event: { label: '已发布', created_at: '2026-07-07T07:00:00Z' },
              next_action: '继续发布为简报。',
            },
          ],
          commands: [],
          pipeline: [],
          related_pages: [],
        }))
      }
      if (String(input) === '/api/cockpit/research-hub/7') {
        return Promise.resolve(okJson({
          status: 'ok',
          item: {
            id: 7,
            topic: '家庭系统研究',
            summary: '梳理家庭驾驶舱和 family-hub 的边界',
            full_text: '研究正文',
            created_at: '2026-07-07T06:00:00Z',
            source_count: 4,
            tags: ['family', 'opc'],
            follow_ups: [],
            agent: 'Alice',
            status: 'active',
          },
          timeline: [],
          dossier: { parents: [], children: [], publications: [] },
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(
      <ResearchHubView
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        focusTaskQuery="家庭系统研究"
      />,
    )

    const focusRegion = await screen.findByRole('region', { name: '当前研究承接焦点' })
    expect(within(focusRegion).getByText('家庭系统研究')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开研究焦点对象 家庭系统研究' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开研究焦点任务 家庭系统研究' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Research', taskQuery: '7' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '7' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces research closure routing when focus hits publish loop', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input) === '/api/cockpit/research-hub') {
        return Promise.resolve(okJson({
          summary: {
            total: 5,
            active: 3,
            archived: 1,
            quarantined: 1,
            published: 2,
            follow_ups: 6,
            agents: 2,
          },
          recent: [
            {
              id: 7,
              topic: '家庭系统研究',
              summary: '梳理家庭驾驶舱和 family-hub 的边界',
              created_at: '2026-07-07T06:00:00Z',
              source_count: 4,
              tags: ['family', 'opc'],
              agent: 'Alice',
              status: 'active',
              follow_up_count: 2,
              last_event: { label: '已发布', created_at: '2026-07-07T07:00:00Z' },
              next_action: '继续发布为简报。',
            },
          ],
          commands: [],
          pipeline: [
            { id: 'Research', title: '研究中枢', summary: '看活跃研究。' },
            { id: 'Knowledge', title: '知识中枢', summary: '补知识上下文。' },
          ],
          related_pages: [
            { id: 'Overview', title: '概览页', reason: '研究发布后需要回概览做复盘。' },
          ],
        }))
      }
      if (String(input) === '/api/cockpit/research-hub/7') {
        return Promise.resolve(okJson({
          status: 'ok',
          item: {
            id: 7,
            topic: '家庭系统研究',
            summary: '梳理家庭驾驶舱和 family-hub 的边界',
            full_text: '研究正文',
            created_at: '2026-07-07T06:00:00Z',
            source_count: 4,
            tags: ['family', 'opc'],
            follow_ups: [],
            agent: 'Alice',
            status: 'active',
          },
          timeline: [],
          dossier: { parents: [], children: [], publications: [] },
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<ResearchHubView onOpenTarget={onOpenTarget} focusTaskQuery="发布回流与复盘" />)

    const focusRegion = await screen.findByRole('region', { name: '当前研究承接焦点' })
    expect(within(focusRegion).getByText('发布回流与复盘')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开研究焦点对象 发布回流与复盘' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开研究焦点任务 发布回流与复盘' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Overview', taskQuery: '7' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '7' })
  })
})
