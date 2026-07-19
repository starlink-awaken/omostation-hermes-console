import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import RuntimeOpsWorkbench from '../RuntimeOpsWorkbench'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('RuntimeOpsWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('keeps service hotspots visible when active alert data fails', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({ usage_paths: [{ id: 'runtime-diagnostics', title: '运行诊断', pages: [] }] }))
      }
      if (url === '/api/alerts?status=active&limit=20') return Promise.reject(new Error('alert source offline'))
      return Promise.resolve(okJson({ items: [{ name: 'cockpit-api', status: 'degraded', cpu: 91, memory: 82 }] }))
    })

    render(<RuntimeOpsWorkbench currentPage="Overview" onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('活跃告警数据：alert source offline')
      expect(screen.getByRole('button', { name: '查看服务 cockpit-api' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '进入运行步骤 告警中心' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '查看服务 cockpit-api' }))
    expect(onNavigate).toHaveBeenCalledWith('Performance')
  })

  it('registers the highest-priority runtime hotspot as a formal task', async () => {
    const onNavigate = vi.fn()
    let taskRequest: RequestInit | undefined
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({ usage_paths: [] }))
      if (url === '/api/alerts?status=active&limit=20') {
        return Promise.resolve(okJson({ items: [{ id: 'alert-1', level: 'critical', source: 'cockpit-api', message: 'API 5xx 激增', status: 'active' }] }))
      }
      if (url === '/api/services/status') return Promise.resolve(okJson({ items: [] }))
      if (url === '/api/tasks' && init?.method === 'POST') {
        taskRequest = init
        return Promise.resolve(okJson({ id: 42, title: '处理运行告警：cockpit-api' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<RuntimeOpsWorkbench currentPage="AlertCenter" onNavigate={onNavigate} />)

    const button = await screen.findByRole('button', { name: '登记运行诊断任务 处理运行告警：cockpit-api' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('已登记运行诊断任务：处理运行告警：cockpit-api')
      expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
    })
    expect(taskRequest?.body).toContain('运行状态快照')
    expect(taskRequest?.body).toContain('cockpit.runtime-workbench')
  })

  it('does not present an all-source outage as a stable runtime', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('runtime backend offline'))

    render(<RuntimeOpsWorkbench currentPage="Overview" />)

    await waitFor(() => {
      const region = screen.getByRole('region', { name: '运行诊断工作台' })
      expect(within(region).getByText('数据不可用')).toBeInTheDocument()
      expect(within(region).getAllByText('N/A')).toHaveLength(2)
      expect(within(region).queryByText('运行平稳')).not.toBeInTheDocument()
    })
  })

  it('keeps partial runtime failures out of healthy zero counts', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') return Promise.resolve(okJson({ usage_paths: [] }))
      if (url === '/api/alerts?status=active&limit=20') return Promise.reject(new Error('alert source offline'))
      return Promise.resolve(okJson({ items: [] }))
    })

    render(<RuntimeOpsWorkbench currentPage="Overview" />)

    await waitFor(() => {
      const region = screen.getByRole('region', { name: '运行诊断工作台' })
      expect(within(region).getByText('证据不完整')).toBeInTheDocument()
      expect(within(region).getAllByText('N/A')).toHaveLength(1)
      const alertSummary = within(region).getByText('活跃告警').closest('.runtime-workbench-card') as HTMLElement
      expect(within(alertSummary).getByText('告警数据不可用')).toBeInTheDocument()
      expect(within(region).queryByText('运行平稳')).not.toBeInTheDocument()
    })
  })
})
