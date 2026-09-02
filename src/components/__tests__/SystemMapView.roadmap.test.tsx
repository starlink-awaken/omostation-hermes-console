import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SystemMapView from '../SystemMapView'
import {
  systemMapPayload,
  draftTasksPayload,
  okJson,
  setupSystemMapTest,
  SYSTEM_MAP_DRAFT_TASKS_URL,
} from './__fixtures__/SystemMapView.fixtures'

describe('SystemMapView roadmap', () => {
  beforeEach(() => {
    setupSystemMapTest()
  })

  it('connects usage paths to playbooks, domains, roadmap items, and task drafts', async () => {
    const onNavigate = vi.fn()

    render(<SystemMapView onNavigate={onNavigate} />)

    await waitFor(() => {
      expect(screen.getAllByText('使用路径工作台').length).toBeGreaterThan(0)
      expect(screen.getAllByText('日常体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/覆盖页/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/相关清单/).length).toBeGreaterThan(0)
      expect(screen.getAllByText('每日体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText('运行态势').length).toBeGreaterThan(0)
      expect(screen.getAllByText('日常路径工作台').length).toBeGreaterThan(0)
      expect(screen.getAllByText('部分项目仍需补齐状态面').length).toBeGreaterThan(0)
      expect(screen.getAllByText('任务草稿').length).toBeGreaterThan(0)
      expect(screen.getAllByText('操作清单：每日体检').length).toBeGreaterThan(0)
      expect(screen.getAllByText('页面能力：补齐 首页').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole('button', { name: /任务草稿/ }))

    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
    expect(fetch).toHaveBeenCalledWith(SYSTEM_MAP_DRAFT_TASKS_URL)
  })

  it('promotes a visible usage-path draft without leaving the system map', async () => {
    render(<SystemMapView onNavigate={vi.fn()} />)

    const promoteButton = await screen.findByRole('button', { name: '承接为正式计划任务 操作清单：每日体检' })
    fireEvent.click(promoteButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks/drafts/playbook-daily-health-check/promote', { method: 'POST' })
    })
    expect(fetch).toHaveBeenCalledWith('/api/cockpit/system-map')
  })
})
