import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import KOSWorkbench from '../KOSWorkbench'

const okJson = (body: unknown) => ({ ok: true, json: async () => body }) as Response

describe('KOSWorkbench', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/kos/health') return Promise.resolve(okJson({ status: 'ok', checks: {} }))
      if (url === '/api/kos/stats') return Promise.resolve(okJson({ document_count: 12 }))
      if (url === '/api/kos/suggest?prefix=SSOT&limit=6') return Promise.resolve(okJson({ items: [] }))
      if (url === '/api/kos/search?q=SSOT&limit=8') return Promise.resolve(okJson({ results: [{ id: 'doc-1', title: 'SSOT 约束', chunk_text: '必须保留来源证据。' }] }))
      return Promise.resolve(okJson({}))
    })
  })

  it('turns a KOS search result into a traceable TaskCenter task', async () => {
    const onOpenTarget = vi.fn()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/kos/health') return Promise.resolve(okJson({ status: 'ok', checks: {} }))
      if (url === '/api/kos/stats') return Promise.resolve(okJson({ document_count: 12 }))
      if (url === '/api/kos/search?q=SSOT&limit=8') return Promise.resolve(okJson({ results: [{ id: 'doc-1', title: 'SSOT 约束', chunk_text: '必须保留来源证据。' }] }))
      if (url === '/api/tasks' && init?.method === 'POST') return Promise.resolve(okJson({ id: 'kos-evidence-task-1' }))
      return Promise.resolve(okJson({}))
    })

    render(<KOSWorkbench onOpenTarget={onOpenTarget} />)
    await waitFor(() => expect(screen.getByRole('button', { name: '刷新KOS状态' })).not.toBeDisabled())
    fireEvent.change(screen.getByRole('combobox', { name: 'KOS搜索' }), { target: { value: 'SSOT' } })
    fireEvent.click(screen.getByRole('button', { name: /检索/ }))
    expect(await screen.findByText('SSOT 约束')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '登记KOS证据任务' }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({ method: 'POST' }))
      expect(onOpenTarget).toHaveBeenCalledWith({ tab: 'TaskCenter', taskQuery: 'kos-evidence-task-1' })
      expect(screen.getByRole('status')).toHaveTextContent('kos-evidence-task-1')
    })
  })

  it('executes a navigation-provided query when opening a knowledge object', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/kos/health') return Promise.resolve(okJson({ status: 'ok', checks: {} }))
      if (url === '/api/kos/stats') return Promise.resolve(okJson({ document_count: 12 }))
      if (url === '/api/kos/search?q=decision-1&limit=8') {
        return Promise.resolve(okJson({ results: [{ id: 'decision-1', title: '架构决策', chunk_text: '保留来源证据。' }] }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<KOSWorkbench initialQuery="decision-1" />)

    expect(await screen.findByDisplayValue('decision-1')).toBeInTheDocument()
    expect(await screen.findByText('架构决策')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/kos/search?q=decision-1&limit=8', undefined)
  })

  it('writes a knowledge card and shows the persisted reference', async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/knowledge/put') {
        expect(init?.method).toBe('POST')
        expect(JSON.parse(String(init?.body))).toEqual({
          slug: 'runtime-note',
          title: '运行记录',
          content: '保留运行证据。',
          tags: ['runtime', 'evidence'],
        })
        return Promise.resolve(okJson({ knowledge_ref: 'memory:runtime-note' }))
      }
      return Promise.resolve(okJson({}))
    })

    render(<KOSWorkbench />)
    const form = screen.getByRole('form', { name: '知识注入' })
    fireEvent.change(within(form).getByRole('textbox', { name: '知识卡片标题' }), { target: { value: '运行记录' } })
    fireEvent.change(within(form).getByRole('textbox', { name: '知识卡片标识' }), { target: { value: 'runtime-note' } })
    fireEvent.change(within(form).getByRole('textbox', { name: '知识卡片标签' }), { target: { value: 'runtime, evidence' } })
    fireEvent.change(within(form).getByRole('textbox', { name: '知识卡片正文' }), { target: { value: '保留运行证据。' } })
    fireEvent.click(within(form).getByRole('button', { name: /写入知识卡片/ }))

    await waitFor(() => expect(within(form).getByRole('status')).toHaveTextContent('memory:runtime-note'))
  })
})
