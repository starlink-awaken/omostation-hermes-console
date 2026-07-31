import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import KemsWorkbench from '../KemsWorkbench'

describe('KemsWorkbench', () => {
  it('renders evidence-only queue and submits a correction', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [{ run_id: 'run-1', source_ref: 'vault://redacted/source', review_status: 'review' }] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ run_id: 'run-1', source_ref: 'vault://redacted/source', evidence_ref: 'vault://redacted/evidence', review_status: 'review', metrics: { field_accuracy: 0.91 } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'corrected' }) } as Response)

    render(<KemsWorkbench />)
    await waitFor(() => expect(screen.getAllByText('run-1').length).toBeGreaterThanOrEqual(1))
    expect(screen.queryByText(/正文/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('纠正结果 SHA-256'), { target: { value: 'a'.repeat(64) } })
    fireEvent.change(screen.getByLabelText('证据引用'), { target: { value: 'vault://redacted/correction' } })
    fireEvent.change(screen.getByLabelText('标注人'), { target: { value: 'reviewer-1' } })
    fireEvent.click(screen.getByRole('button', { name: /提交并进入复核/ }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/kems/ocr/runs/run-1/correction', expect.objectContaining({ method: 'POST' })))
  })

  it('registers an adjudicated manifest and records a model evaluation run', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/kems/ocr/review-queue?limit=100') return { ok: true, json: async () => ({ items: [] }) } as Response
      if (url === '/api/kems/evaluations/manifests') return { ok: true, json: async () => ({ dataset_id: 'kems-real', sample_count: 1 }) } as Response
      if (url === '/api/kems/evaluations/runs/eval-1') return { ok: true, json: async () => ({ evaluation: { accuracy: 1 } }) } as Response
      void init
      return { ok: true, json: async () => ({}) } as Response
    })

    render(<KemsWorkbench />)
    await waitFor(() => expect(screen.getByText('当前没有待复核样本')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('评测集 ID'), { target: { value: 'kems-real' } })
    fireEvent.change(screen.getByLabelText('评测集版本'), { target: { value: 'v1' } })
    fireEvent.change(screen.getByLabelText('脱敏评测样本 JSON'), { target: { value: '[{"sample_id":"s1"}]' } })
    fireEvent.click(screen.getByRole('button', { name: '登记评测集' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/kems/evaluations/manifests', expect.objectContaining({ method: 'POST' })))

    fireEvent.change(screen.getByLabelText('评测运行 ID'), { target: { value: 'eval-1' } })
    fireEvent.change(screen.getByLabelText('评测模型 ID'), { target: { value: 'baseline-exact' } })
    fireEvent.change(screen.getByLabelText('Actual JSON'), { target: { value: '{"category":"notice"}' } })
    fireEvent.click(screen.getByRole('button', { name: '记录评测结果' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/kems/evaluations/runs/eval-1', expect.objectContaining({ method: 'POST' })))
    expect(await screen.findByRole('status')).toHaveTextContent('accuracy')
  })
})
