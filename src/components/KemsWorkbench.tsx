import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, FileSearch, RefreshCw, ShieldCheck } from 'lucide-react'
import './KemsWorkbench.css'

type QueueItem = {
  run_id: string
  source_ref?: string
  review_status?: string
  admitted?: boolean
  created_at?: string
}

type RunDetail = QueueItem & {
  metrics?: Record<string, number>
  evidence_ref?: string
  extractor_version?: string
}

const api = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`请求失败 (${response.status})`)
  return response.json()
}

export default function KemsWorkbench() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selected, setSelected] = useState<RunDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [correction, setCorrection] = useState({ corrected_sha256: '', evidence_ref: '', annotator: '' })
  const [saving, setSaving] = useState(false)

  const loadQueue = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api('/api/kems/ocr/review-queue?limit=100')
      const items = data.items || data.queue || []
      setQueue(items)
      if (!selected && items[0]) setSelected(await api(`/api/kems/ocr/runs/${items[0].run_id}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法加载 OCR 复核队列')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadQueue() }, [])

  const selectRun = async (item: QueueItem) => {
    try {
      setSelected(await api(`/api/kems/ocr/runs/${item.run_id}`))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法加载运行详情')
    }
  }

  const submitCorrection = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !correction.corrected_sha256 || !correction.evidence_ref || !correction.annotator) return
    setSaving(true)
    try {
      await api(`/api/kems/ocr/runs/${selected.run_id}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction),
      })
      setCorrection({ corrected_sha256: '', evidence_ref: '', annotator: '' })
      await loadQueue()
      setSelected(await api(`/api/kems/ocr/runs/${selected.run_id}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交纠正失败')
    } finally {
      setSaving(false)
    }
  }

  const statusLabel = (status?: string) => ({ review: '待复核', reject: '已拒绝', corrected: '已纠正', pass: '已通过' }[status || ''] || status || '未知')

  return (
    <section className="kems-workbench" aria-label="KEMS OCR 质量工作台">
      <div className="kems-toolbar">
        <div>
          <div className="kems-eyebrow"><ShieldCheck size={14} /> 证据约束 · 无原文回显</div>
          <h2>OCR 质量治理</h2>
          <p>只展示质量指标、哈希和证据引用，人工纠正后才能进入知识摄取。</p>
        </div>
        <button className="antd-btn" onClick={() => void loadQueue()} disabled={loading} title="刷新复核队列">
          <RefreshCw size={15} /> 刷新队列
        </button>
      </div>
      {error && <div className="kems-error" role="alert">{error}</div>}
      <div className="kems-grid">
        <div className="kems-panel kems-queue-panel">
          <div className="kems-panel-heading"><h3>复核队列</h3><span>{queue.length} 条</span></div>
          {loading ? <div className="kems-empty">加载中...</div> : queue.length === 0 ? <div className="kems-empty"><FileSearch size={18} /> 当前没有待复核样本</div> : (
            <div className="kems-queue" role="list">
              {queue.map(item => <button key={item.run_id} className={`kems-queue-item ${selected?.run_id === item.run_id ? 'selected' : ''}`} onClick={() => void selectRun(item)} role="listitem">
                <strong>{item.run_id}</strong><span>{item.source_ref || '未提供来源引用'}</span><em>{statusLabel(item.review_status)}</em>
              </button>)}
            </div>
          )}
        </div>
        <div className="kems-panel kems-detail-panel">
          {selected ? <>
            <div className="kems-panel-heading"><div><h3>运行证据</h3><span className="kems-run-id">{selected.run_id}</span></div><span className="kems-status"><CheckCircle2 size={14} /> {statusLabel(selected.review_status)}</span></div>
            <dl className="kems-metadata"><div><dt>来源引用</dt><dd>{selected.source_ref || '未提供'}</dd></div><div><dt>证据引用</dt><dd>{selected.evidence_ref || '未提供'}</dd></div><div><dt>提取器版本</dt><dd>{selected.extractor_version || '未提供'}</dd></div><div><dt>准入状态</dt><dd>{selected.admitted ? '允许进入知识摄取' : '需要人工复核'}</dd></div></dl>
            <div className="kems-metrics"><h4>质量指标</h4>{Object.entries(selected.metrics || {}).map(([key, value]) => <div key={key}><span>{key}</span><strong>{typeof value === 'number' ? value.toFixed(3) : value}</strong></div>)}</div>
            <form className="kems-correction-form" onSubmit={submitCorrection}><h4>提交人工纠正</h4><p>仅提交纠正结果的哈希和证据引用，正文始终留在受控存储中。</p><label>纠正结果 SHA-256<input className="antd-input" value={correction.corrected_sha256} onChange={e => setCorrection({ ...correction, corrected_sha256: e.target.value })} required /></label><label>证据引用<input className="antd-input" value={correction.evidence_ref} onChange={e => setCorrection({ ...correction, evidence_ref: e.target.value })} required /></label><label>标注人<input className="antd-input" value={correction.annotator} onChange={e => setCorrection({ ...correction, annotator: e.target.value })} required /></label><button className="antd-btn antd-btn-primary" disabled={saving || selected.review_status === 'pass'}><CheckCircle2 size={15} /> {saving ? '提交中...' : '提交并进入复核'}</button></form>
          </> : <div className="kems-empty"><FileSearch size={20} /> 选择一条复核记录查看详情</div>}
        </div>
      </div>
    </section>
  )
}
