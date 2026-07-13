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
