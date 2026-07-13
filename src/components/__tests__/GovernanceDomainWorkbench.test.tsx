import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import GovernanceDomainWorkbench from '../GovernanceDomainWorkbench'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('GovernanceDomainWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
  })

  it('renders governance-domain execution chain and navigates to the recommended page', async () => {
    const onNavigate = vi.fn()

    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/cockpit/system-map') {
        return Promise.resolve(okJson({
          project_portfolio: {
            summary: { score: 74, status: 'blocked', blocked: 3, at_risk: 5 },
            priority_projects: [
              {
                id: 'kairon',
                status: 'blocked',
                score: 50,
                primary_gap: '最近验证失败',
                next_action: '复跑验证并补 closeout。',
              },
            ],
          },
          domain_apps: {
            summary: { score: 88, ready: 3, running: 2, security_attention_apps: 1 },
            attention_items: [
              {
                id: 'family-dashboard-app',
                name: '家庭驾驶舱',
                runtime_status: 'running',
                security_posture: 'attention',
                next_action: '先补家庭 app 的认证与写路径保护。',
              },
            ],
            next_action: '先补家庭 app 的认证与写路径保护。',
          },
          roadmap: {
            items: [
              {
                id: 'domain-app-center',
                title: '领域应用中心',
                priority: 'P1',
                problem: '治理入口和领域挂载还不够顺手。',
              },
            ],
          },
          gaps: [
            {
              id: 'governance-gap',
              title: '治理入口割裂',
              severity: 'medium',
              next: '做一条从战略到执行的治理路径。',
            },
          ],
        }))
      }
      if (url === '/api/debt') {
        return Promise.resolve(okJson({
          total: 6,
          open: 4,
          closed: 2,
          items: [
            {
              id: 'debt-1',
              title: '补家庭 app 鉴权',
              severity: 'p0',
              lifecycle_state: 'open',
              owner: 'security',
              dimension: 'security',
            },
          ],
        }))
      }
      if (url === '/api/omos/status') {
        return Promise.resolve(okJson({
          system: { current_phase: 'Wave 2', health_score: 93, active_tasks: 8, blocked_tasks: 2 },
          governance: { health_score: 91, anomaly_count: 1, total_tasks: 12 },
        }))
      }
      if (url === '/api/l4/health') {
        return Promise.resolve(okJson({
          total_domains: 5,
          healthy_count: 4,
          unhealthy_count: 1,
          health_rate: '80%',
          domains: [
            { id: 'family', name: '家庭生活', fresh: false, issue_count: 2, signal_count: 8 },
          ],
        }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<GovernanceDomainWorkbench currentPage="Debt" onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('债务治理工作台')).toBeInTheDocument()
      expect(screen.getByText('74%')).toBeInTheDocument()
      const debtCard = screen.getByText('技术债账本').closest('.governance-workbench-card')
      expect(debtCard?.textContent).toContain('4')
      expect(screen.getByText('80%')).toBeInTheDocument()
      expect(screen.getByText('补家庭 app 鉴权')).toBeInTheDocument()
      expect(screen.getByText('家庭驾驶舱')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/项目组合里还有 3 个阻塞项/))
    expect(onNavigate).toHaveBeenCalledWith('C2G')

    fireEvent.click(screen.getByRole('button', { name: /去领域应用/ }))
    expect(onNavigate).toHaveBeenCalledWith('DomainApps')
  })

  it('shows empty-state guidance when governance data is sparse', async () => {
    vi.mocked(fetch).mockResolvedValue(okJson({}))

    render(<GovernanceDomainWorkbench currentPage="L4Health" />)

    await waitFor(() => {
      expect(screen.getByText('组合暂时平静')).toBeInTheDocument()
      expect(screen.getByText('暂时没有未关债务')).toBeInTheDocument()
      expect(screen.getByText('领域挂载侧暂无注意项')).toBeInTheDocument()
    })
  })
})
