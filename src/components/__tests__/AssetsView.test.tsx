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

  it('surfaces an asset workbench and navigates toward governance and workflow follow-up', async () => {
    const onNavigate = vi.fn()
    render(<AssetsView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('技术资产总览')).toBeInTheDocument()
      expect(screen.getByText('资产承接工作台')).toBeInTheDocument()
      expect(screen.getAllByText('自定义治理技能').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '治理技能 自定义治理技能' }))
    expect(onNavigate).toHaveBeenCalledWith('Protocol')

    fireEvent.click(screen.getByRole('button', { name: '处理工作流 nightly-governance' }))
    expect(onNavigate).toHaveBeenCalledWith('Workflows')
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
})
