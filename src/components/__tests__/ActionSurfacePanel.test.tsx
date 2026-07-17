import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ActionSurfacePanel from '../ActionSurfacePanel'

describe('ActionSurfacePanel', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('handles navigate and copy actions', async () => {
    const onNavigate = vi.fn()

    render(
      <ActionSurfacePanel
        title="动作区"
        subtitle="测试动作"
        items={[
          {
            id: 'nav',
            title: '去系统地图',
            detail: '导航测试',
            actionLabel: '跳转',
            actionType: 'navigate',
            actionValue: 'SystemMap',
          },
          {
            id: 'copy',
            title: '复制命令',
            detail: '复制测试',
            actionLabel: '复制',
            actionType: 'copy',
            actionValue: 'echo test',
          },
        ]}
        onNavigate={onNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /跳转/ }))
    expect(onNavigate).toHaveBeenCalledWith('SystemMap')

    fireEvent.click(screen.getByRole('button', { name: /复制/ }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('echo test')
    })
  })

  it('preserves an object context when an action provides a navigation target', () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(
      <ActionSurfacePanel
        title="动作区"
        subtitle="上下文导航测试"
        items={[{
          id: 'contextual-nav',
          title: '打开告警对象',
          detail: '保留告警上下文',
          actionLabel: '查看对象',
          actionType: 'navigate',
          actionValue: 'AlertCenter',
          actionTarget: { tab: 'AlertCenter', taskQuery: 'alert-42', alertTab: 'active' },
        }]}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '查看对象' }))
    expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'AlertCenter', taskQuery: 'alert-42', alertTab: 'active' })
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
