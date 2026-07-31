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
    await waitFor(() => expect(screen.getByText('run-1')).toBeInTheDocument())
    expect(screen.queryByText(/正文/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('纠正结果 SHA-256'), { target: { value: 'a'.repeat(64) } })
    fireEvent.change(screen.getByLabelText('证据引用'), { target: { value: 'vault://redacted/correction' } })
    fireEvent.change(screen.getByLabelText('标注人'), { target: { value: 'reviewer-1' } })
    fireEvent.click(screen.getByRole('button', { name: /提交并进入复核/ }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/kems/ocr/runs/run-1/correction', expect.objectContaining({ method: 'POST' })))
  })
})
