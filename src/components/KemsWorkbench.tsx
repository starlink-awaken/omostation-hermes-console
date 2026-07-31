import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, FileSearch, GitBranch, Network, RefreshCw, Send, ShieldCheck } from 'lucide-react'
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

type GraphEntity = { id?: string; entity_id?: string; name?: string; label?: string; canonical_name?: string }

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
  const [graphQuery, setGraphQuery] = useState('')
  const [graphItems, setGraphItems] = useState<GraphEntity[]>([])
  const [neighborItems, setNeighborItems] = useState<GraphEntity[]>([])
  const [forecastValues, setForecastValues] = useState('10, 12, 11, 14, 15')
  const [forecastResult, setForecastResult] = useState<Record<string, unknown> | null>(null)
  const [dispatch, setDispatch] = useState({ taskId: '', workerId: '', paths: 'projects/kairon' })
  const [dispatchResult, setDispatchResult] = useState<Record<string, unknown> | null>(null)
  const [kemsAction, setKemsAction] = useState('')

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

  // Initial queue hydration updates local state from an external API.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
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

  const searchGraph = async (event: FormEvent) => {
    event.preventDefault()
    if (!graphQuery.trim()) return
    setKemsAction('graph')
    setError('')
    try {
      const data = await api(`/api/kems/graph/entities?q=${encodeURIComponent(graphQuery.trim())}&limit=20`)
      setGraphItems(data.items || [])
      setNeighborItems([])
    } catch (err) { setError(err instanceof Error ? err.message : '图谱查询失败') } finally { setKemsAction('') }
  }

  const loadNeighbors = async (entityId: string) => {
    setKemsAction('neighbors')
    try {
      const data = await api(`/api/kems/graph/entities/${encodeURIComponent(entityId)}/neighbors?limit=20`)
      setNeighborItems(data.items || [])
    } catch (err) { setError(err instanceof Error ? err.message : '邻居查询失败') } finally { setKemsAction('') }
  }

  const createShadowForecast = async (event: FormEvent) => {
    event.preventDefault()
    const values = forecastValues.split(',').map(item => Number(item.trim()))
    if (!values.length || values.some(value => !Number.isFinite(value))) { setError('预测序列必须是逗号分隔的数字'); return }
    setKemsAction('forecast')
    try {
      const data = await api('/api/kems/forecast/shadow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ forecast_id: `cockpit-shadow-${Date.now()}`, series_id: 'kems-ui-series', source_run_id: 'cockpit-ui', values, horizon: 3, window: 3 }) })
      setForecastResult(data.forecast || data)
    } catch (err) { setError(err instanceof Error ? err.message : 'shadow 预测失败') } finally { setKemsAction('') }
  }

  const dispatchTask = async (event: FormEvent) => {
    event.preventDefault()
    const paths = dispatch.paths.split(',').map(item => item.trim()).filter(Boolean)
    if (!dispatch.taskId.trim() || !dispatch.workerId.trim() || !paths.length) { setError('任务、worker 和允许写入范围均为必填'); return }
    setKemsAction('dispatch')
    try {
      const data = await api(`/api/kems/tasks/${encodeURIComponent(dispatch.taskId.trim())}/dispatch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ worker_id: dispatch.workerId.trim(), allowed_write_paths: paths, transport: 'cli_prompt', launch: false }) })
      setDispatchResult(data.dispatch || data)
    } catch (err) { setError(err instanceof Error ? err.message : 'OMO 派发失败') } finally { setKemsAction('') }
  }

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
      <div className="kems-grid kems-control-grid">
        <div className="kems-panel">
          <div className="kems-panel-heading"><div><h3>持久化知识图谱</h3><span>review-only · 可回滚</span></div><Network size={16} /></div>
          <form className="kems-inline-form" onSubmit={searchGraph}><input className="antd-input" aria-label="图谱实体查询" placeholder="实体或证据引用" value={graphQuery} onChange={event => setGraphQuery(event.target.value)} /><button className="antd-btn antd-btn-primary" disabled={kemsAction === 'graph'}><Network size={14} /> 查询</button></form>
          <div className="kems-result-list">{graphItems.map(item => { const id = item.entity_id || item.id || ''; return <div className="kems-result-row" key={id}><span>{item.name || item.label || item.canonical_name || id}</span><button className="antd-btn" type="button" onClick={() => void loadNeighbors(id)} disabled={kemsAction === 'neighbors'}><GitBranch size={13} /> 邻居</button></div> })}</div>
          {neighborItems.length > 0 && <p className="kems-result-note">关联实体：{neighborItems.map(item => item.name || item.label || item.entity_id || item.id).join('、')}</p>}
          {!graphItems.length && <p className="kems-result-note">只返回实体标识和审查结果，不回显私有原文。</p>}
        </div>
        <form className="kems-panel kems-correction-form" onSubmit={createShadowForecast}>
          <div className="kems-panel-heading"><div><h3>Shadow 预测</h3><span>仅评估，不驱动生产动作</span></div><CheckCircle2 size={16} /></div>
          <label>历史数值（逗号分隔）<input className="antd-input" value={forecastValues} onChange={event => setForecastValues(event.target.value)} /></label>
          <button className="antd-btn antd-btn-primary" disabled={kemsAction === 'forecast'}><CheckCircle2 size={14} /> 生成预测</button>
          {forecastResult && <pre className="kems-json-result">{JSON.stringify(forecastResult, null, 2)}</pre>}
        </form>
        <form className="kems-panel kems-correction-form" onSubmit={dispatchTask}>
          <div className="kems-panel-heading"><div><h3>OMO 受控派发</h3><span>只接受已审批 active task</span></div><Send size={16} /></div>
          <label>任务 ID<input className="antd-input" value={dispatch.taskId} onChange={event => setDispatch({ ...dispatch, taskId: event.target.value })} placeholder="OMO task id" /></label>
          <label>Worker ID<input className="antd-input" value={dispatch.workerId} onChange={event => setDispatch({ ...dispatch, workerId: event.target.value })} /></label>
          <label>允许写入范围<input className="antd-input" value={dispatch.paths} onChange={event => setDispatch({ ...dispatch, paths: event.target.value })} /></label>
          <button className="antd-btn antd-btn-primary" disabled={kemsAction === 'dispatch'}><Send size={14} /> 交给 OMO 派发</button>
          {dispatchResult && <p className="kems-result-note" role="status">已交给 OMO：{String(dispatchResult.dispatch_id || '已登记')}</p>}
        </form>
      </div>
    </section>
  )
}
