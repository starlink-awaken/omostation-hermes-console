import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import SandboxTerminal from '../SandboxTerminal'

vi.mock('../PlatformControlWorkbench', () => ({
  default: () => <div>Platform Workbench Mock</div>,
}))

describe('SandboxTerminal', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('builds a sandbox workbench and routes follow-up pages', async () => {
    const onNavigate = vi.fn()

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, stdout: 'hello sandbox', output: { ok: true }, duration_ms: 12.3 }),
    } as Response)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ created: true, id: 'sandbox-result-1' }),
    } as Response)

    render(<SandboxTerminal onNavigate={onNavigate} />)

    expect(screen.getByText('沙箱承接工作台')).toBeInTheDocument()
    expect(screen.getByText('实验去向')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '沙箱补位任务' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '在沙箱中执行代码' }))

    await waitFor(() => {
      expect(screen.getByRole('log')).toHaveTextContent('hello sandbox')
    })

    fireEvent.click(screen.getByRole('button', { name: '登记当前沙箱结果' }))
    await waitFor(() => {
      expect(screen.getByText('沙箱结果已登记到任务中心。')).toBeInTheDocument()
    })
    expect(fetch).toHaveBeenLastCalledWith('/api/cockpit/sandbox/queue', expect.objectContaining({ method: 'POST' }))

    fireEvent.click(screen.getByRole('button', { name: '打开沙箱承接到日志页' }))
    expect(onNavigate).toHaveBeenCalledWith('LogViewer')

    fireEvent.click(screen.getByRole('button', { name: '复制沙箱补位任务 补齐沙箱实验 print("Hello from eCOS Sandbox!") 的收口' }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('补齐沙箱实验 print("Hello from eCOS Sandbox!") 的收口'))
      expect(screen.getByText('已复制沙箱补位任务：补齐沙箱实验 print("Hello from eCOS Sandbox!") 的收口')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '打开沙箱补位任务 补齐沙箱实验 print("Hello from eCOS Sandbox!") 的收口' }))
    expect(onNavigate).toHaveBeenCalledWith('TaskCenter')
  })

  it('surfaces focus handoff for matched sandbox context', async () => {
    const onNavigate = vi.fn()
    const onOpenTarget = vi.fn()

    render(<SandboxTerminal onNavigate={onNavigate} onOpenTarget={onOpenTarget} focusTaskQuery="Hello from eCOS Sandbox" />)

    const focusRegion = await screen.findByRole('region', { name: '当前沙箱承接焦点' })
    expect(within(focusRegion).getByText('Hello from eCOS Sandbox')).toBeInTheDocument()

    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开沙箱焦点对象 Hello from eCOS Sandbox' }))
    fireEvent.click(within(focusRegion).getByRole('button', { name: '打开沙箱焦点任务 Hello from eCOS Sandbox' }))

    expect(onOpenTarget).toHaveBeenNthCalledWith(1, { tab: 'Sandbox', taskQuery: 'Hello from eCOS Sandbox' })
    expect(onOpenTarget).toHaveBeenNthCalledWith(2, { tab: 'TaskCenter', taskQuery: 'Hello from eCOS Sandbox' })
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('registers the sandbox follow-up draft before an experiment has output', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/tasks')
      expect(init?.method).toBe('POST')
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: 'sandbox-follow-up-1', title: '沙箱补位任务' }),
      } as Response)
    })

    render(<SandboxTerminal onOpenTarget={onOpenTarget} />)

    fireEvent.click(screen.getByRole('button', { name: '登记沙箱补位任务 补齐沙箱实验 print("Hello from eCOS Sandbox!") 的收口' }))

    await waitFor(() => {
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'sandbox-follow-up-1' })
      expect(screen.getByText('已登记沙箱补位任务：沙箱补位任务')).toBeInTheDocument()
    })
  })
})
