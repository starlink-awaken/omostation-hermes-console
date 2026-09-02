import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SystemMapView from '../SystemMapView'
import {
  setupSystemMapTest,
} from './__fixtures__/SystemMapView.fixtures'

describe('SystemMapView paths', () => {
  beforeEach(() => {
    setupSystemMapTest()
  })

  it('opens the focused usage path when launched with a usage path id', async () => {
    render(<SystemMapView onNavigate={vi.fn()} focusUsagePathId="governance-loop" />)

    await waitFor(() => {
      expect(screen.getAllByText('每周处理治理风险和债务。').length).toBeGreaterThan(0)
      expect(screen.getAllByText('治理闭环').length).toBeGreaterThan(0)
    })
  })

  it('surfaces executable projects, triage commands, and drafts for a focused governance path', async () => {
    const onOpenTarget = vi.fn()
    render(<SystemMapView onNavigate={vi.fn()} onOpenTarget={onOpenTarget} focusUsagePathId="governance-loop" />)

    await waitFor(() => {
      expect(screen.getAllByText('治理闭环').length).toBeGreaterThan(0)
      expect(screen.getAllByText('相关项目').length).toBeGreaterThan(0)
      expect(screen.getAllByText('排查命令').length).toBeGreaterThan(0)
      expect(screen.getAllByText('项目组合：修复 kairon').length).toBeGreaterThan(0)
      expect(screen.getAllByText('复跑验证').length).toBeGreaterThan(0)
      expect(screen.getAllByText('kairon').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: '承接项目动作 复跑验证' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/cockpit/projects/kairon/triage/verification-rerun/queue',
        { method: 'POST' },
      )
      expect(onOpenTarget).toHaveBeenCalledWith({
        tab: 'TaskCenter',
        taskQuery: 'cockpit-triage-kairon-verification-rerun',
      })
    })
  })
})
