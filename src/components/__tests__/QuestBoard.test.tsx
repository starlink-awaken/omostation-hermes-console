import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import QuestBoard from '../QuestBoard'

vi.mock('../PlatformControlWorkbench', () => ({
  default: () => <div>Platform Workbench Mock</div>,
}))

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('QuestBoard', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders family execution links and routes to follow-up surfaces', async () => {
    const onNavigate = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/omos/quests') {
        return Promise.resolve(okJson({
          status: 'ok',
          quests: [
            { id: 1, title: '整理客厅', type: 'responsibility', reward: 15, completed: 0, assignee: 'child' },
          ],
          profiles: [
            { role: 'child', name: '孩子', level: 3, wisdomPoints: 12, responsibilityPoints: 24 },
          ],
          logs: [],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })

    render(<QuestBoard onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('家庭执行联动')).toBeInTheDocument()
      expect(screen.getByText('家庭承接工作台')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '家庭闭环总表' })).toBeInTheDocument()
      expect(screen.getByText('回家庭应用')).toBeInTheDocument()
      expect(screen.getByText('沉到任务中心')).toBeInTheDocument()
      expect(screen.getAllByText('整理客厅').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /去应用中心/ }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: '打开家庭承接到知识页' }))
    expect(onNavigate).toHaveBeenCalledWith('Knowledge')

    fireEvent.click(screen.getByRole('button', { name: '打开家庭承接到设置页' }))
    expect(onNavigate).toHaveBeenCalledWith('Settings')

    fireEvent.click(screen.getByRole('button', { name: '打开家庭闭环对象 奖励规则与配置' }))
    expect(onNavigate).toHaveBeenCalledWith('Settings')

    fireEvent.click(screen.getByRole('button', { name: /复制模板/ }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('整理房间 / 类型: responsibility / 奖励: 15 / 指派: child')
    })
  })

  it('surfaces focus handoff for a matched family quest', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/omos/quests') {
        return Promise.resolve(okJson({
          status: 'ok',
          quests: [
            { id: 1, title: '整理客厅', type: 'responsibility', reward: 15, completed: 0, assignee: 'child' },
          ],
          profiles: [
            { role: 'child', name: '孩子', level: 3, wisdomPoints: 12, responsibilityPoints: 24 },
          ],
          logs: [],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<QuestBoard onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="整理客厅" />)

    const focusRegion = await screen.findByRole('region', { name: '当前家庭承接焦点' })
    expect(within(focusRegion).getByText('整理客厅')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开家庭焦点对象 整理客厅' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开家庭焦点任务 整理客厅' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'QuestBoard', taskQuery: '1' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '整理客厅' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('surfaces family closure routing when focus hits settings handoff', async () => {
    const onOpenTarget = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/omos/quests') {
        return Promise.resolve(okJson({
          status: 'ok',
          quests: [
            { id: 1, title: '整理客厅', type: 'responsibility', reward: 15, completed: 0, assignee: 'child' },
          ],
          profiles: [
            { role: 'child', name: '孩子', level: 3, wisdomPoints: 12, responsibilityPoints: 24 },
          ],
          logs: [],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<QuestBoard onOpenTarget={onOpenTarget} focusTaskQuery="奖励规则" />)

    const focusRegion = await screen.findByRole('region', { name: '当前家庭承接焦点' })
    expect(within(focusRegion).getByText('奖励规则与配置')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开家庭焦点对象 奖励规则与配置' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开家庭焦点任务 奖励规则与配置' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Settings', taskQuery: '孩子' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: '孩子' })
  })

  it('keeps quest action failures inside the page instead of using browser alerts', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/omos/quests' && !init?.method) {
        return Promise.resolve(okJson({
          status: 'ok',
          quests: [{ id: 1, title: '整理客厅', type: 'responsibility', reward: 15, completed: 0, assignee: 'child' }],
          profiles: [{ role: 'child', name: '孩子', level: 3, wisdomPoints: 12, responsibilityPoints: 24 }],
          logs: [],
        }))
      }
      if (url === '/api/omos/quests/1/complete') {
        return Promise.resolve({ ok: false, json: async () => ({ error: '积分服务暂不可用' }) } as Response)
      }
      return Promise.resolve(okJson({}))
    })

    render(<QuestBoard />)
    const completeButton = await screen.findByRole('button', { name: '完成任务: 整理客厅' })
    fireEvent.click(completeButton)

    expect(await screen.findByRole('status')).toHaveTextContent('操作错误：完成任务接口异常')
  })
})
