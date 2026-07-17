import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

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
    })

    fireEvent.click(screen.getByRole('button', { name: '查看服务 cockpit-api' }))
    expect(onNavigate).toHaveBeenCalledWith('Performance')
  })
})
