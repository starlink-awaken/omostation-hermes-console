import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import L4HealthView from '../L4HealthView'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('L4HealthView', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('explains unavailable L4 data instead of presenting empty health as normal', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/health')) {
        return Promise.resolve(okJson({
          total_domains: 0,
          healthy_count: 0,
          unhealthy_count: 0,
          health_rate: 'N/A',
          domains: [],
          data_quality: 'unavailable',
          degraded_reasons: ['L4 health_monitor.py unavailable'],
          configuration: { next_action: '补齐路径配置后重试。' },
        }))
      }
      if (url.endsWith('/trend')) return Promise.resolve(okJson({ total_records: 0, trends: {}, anomalies: [], degraded_reasons: ['历史趋势不可用'] }))
      return Promise.resolve(okJson({ total_signals: 0, by_domain: {}, by_type: {}, patterns: [], risks: [], degraded_reasons: [] }))
    })

    render(<L4HealthView />)

    await waitFor(() => {
      expect(screen.getByText('域健康承接工作台')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('L4 健康数据未完成读取')
      expect(screen.getByRole('alert')).toHaveTextContent('补齐路径配置后重试')
      expect(screen.getByRole('button', { name: '重试 L4 健康数据' })).toBeInTheDocument()
      expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(4)
      expect(screen.queryByText('异常域 0/0')).not.toBeInTheDocument()
    })
  })

  it('surfaces unhealthy domains and opens follow-up pages', async () => {
    const onNavigate = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/health')) {
        return Promise.resolve(okJson({
          total_domains: 2,
          healthy_count: 1,
          unhealthy_count: 1,
          health_rate: '50%',
          domains: [
            { id: 'family', name: '家庭生活', exists: true, fresh: false, issue_count: 3, issues: [], has_state: true, has_status: true, signal_count: 4, capabilities: ['dashboard'] },
            { id: 'opc', name: 'OPC', exists: true, fresh: true, issue_count: 0, issues: [], has_state: true, has_status: true, signal_count: 1, capabilities: ['strategy'] },
          ],
          data_quality: 'live',
          degraded_reasons: [],
          configuration: { next_action: '持续监控。' },
        }))
      }
      if (url.endsWith('/trend')) return Promise.resolve(okJson({ total_records: 2, trends: {}, anomalies: [], degraded_reasons: [] }))
      return Promise.resolve(okJson({
        total_signals: 4,
        by_domain: { family: 4 },
        by_type: { alert: 2 },
        patterns: [],
        risks: [{ risk: 'freshness', severity: 'warning', message: 'family 域 freshness 失效' }],
        degraded_reasons: [],
      }))
    })

    render(<L4HealthView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('域健康承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('家庭生活').length).toBeGreaterThan(0)
      expect(screen.getAllByText('family 域 freshness 失效').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '查看域健康 family' }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')

    fireEvent.click(screen.getByRole('button', { name: '打开域健康承接到观测页' }))
    expect(onNavigate).toHaveBeenCalledWith('Observability')

    vi.mocked(fetch).mockResolvedValueOnce(okJson({ id: 'l4-task-1', title: '域健康任务' }))
    fireEvent.click(screen.getByRole('button', { name: '登记域健康治理任务' }))
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('已登记域健康治理任务：域健康任务')
    })
  })

  it('filters the domain table and signal evidence from one health query', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/health')) {
        return Promise.resolve(okJson({
          total_domains: 2,
          healthy_count: 1,
          unhealthy_count: 1,
          health_rate: '50%',
          domains: [
            { id: 'family', name: '家庭生活', exists: true, fresh: false, issue_count: 3, issues: [], has_state: true, has_status: true, signal_count: 4, capabilities: ['dashboard'] },
            { id: 'opc', name: 'OPC', exists: true, fresh: true, issue_count: 0, issues: [], has_state: true, has_status: true, signal_count: 1, capabilities: ['strategy'] },
          ],
          data_quality: 'live',
          degraded_reasons: [],
        }))
      }
      if (url.endsWith('/trend')) return Promise.resolve(okJson({
        total_records: 2,
        trends: {},
        anomalies: [{ domain: 'family', type: 'freshness', severity: 'warning', message: 'family freshness 失效' }],
        degraded_reasons: [],
      }))
      return Promise.resolve(okJson({
        total_signals: 5,
        by_domain: { family: 4, opc: 1 },
        by_type: { alert: 2 },
        patterns: [{ pattern: 'family-pattern', level: 'warning', message: 'family 域模式异常' }],
        risks: [{ risk: 'family-risk', severity: 'warning', message: 'family 域风险' }],
        degraded_reasons: [],
      }))
    })

    render(<L4HealthView />)

    expect((await screen.findAllByText('家庭生活')).length).toBeGreaterThan(0)
    expect(screen.getByText('异常域 1/1')).toBeInTheDocument()
    expect(screen.getByText('风险 1/1')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '搜索域健康对象' }), { target: { value: 'family' } })
    const table = screen.getByRole('table')
    expect(within(table).getByText('family')).toBeInTheDocument()
    expect(within(table).queryByText('opc')).not.toBeInTheDocument()
    expect(screen.getByText(/family freshness 失效/)).toBeInTheDocument()
    expect(screen.getAllByText('family 域风险').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '清除域健康筛选' }))
    fireEvent.change(screen.getByRole('combobox', { name: '按域健康状态筛选' }), { target: { value: 'healthy' } })
    expect(within(table).getByText('opc')).toBeInTheDocument()
    expect(within(table).queryByText('family')).not.toBeInTheDocument()
  })

  it('surfaces focus handoff for a matched domain', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/health')) {
        return Promise.resolve(okJson({
          total_domains: 2,
          healthy_count: 1,
          unhealthy_count: 1,
          health_rate: '50%',
          domains: [
            { id: 'family', name: '家庭生活', exists: true, fresh: false, issue_count: 3, issues: [], has_state: true, has_status: true, signal_count: 4, capabilities: ['dashboard'] },
            { id: 'opc', name: 'OPC', exists: true, fresh: true, issue_count: 0, issues: [], has_state: true, has_status: true, signal_count: 1, capabilities: ['strategy'] },
          ],
          data_quality: 'live',
          degraded_reasons: [],
          configuration: { next_action: '持续监控。' },
        }))
      }
      if (url.endsWith('/trend')) return Promise.resolve(okJson({ total_records: 2, trends: {}, anomalies: [], degraded_reasons: [] }))
      return Promise.resolve(okJson({
        total_signals: 4,
        by_domain: { family: 4 },
        by_type: { alert: 2 },
        patterns: [],
        risks: [{ risk: 'freshness', severity: 'warning', message: 'family 域 freshness 失效' }],
        degraded_reasons: [],
      }))
    })

    render(<L4HealthView onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="family" />)

    const focusRegion = await screen.findByRole('region', { name: '当前域健康承接焦点' })
    expect(within(focusRegion).getByText('家庭生活')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开域健康焦点对象 家庭生活' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开域健康焦点任务 家庭生活' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'L4Health', taskQuery: 'family' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'family' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
