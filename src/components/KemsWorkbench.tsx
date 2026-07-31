import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, ClipboardCheck, ClipboardList, FileSearch, GitBranch, Network, RefreshCw, Send, ShieldCheck, UserCheck } from 'lucide-react'
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

type AdjudicationItem = {
  sample_id: string
  source_ref: string
  scenario_id: string
  split: string
  annotation_status: string
  labels?: Record<string, unknown>
  annotation_version?: string
  annotator?: string
  annotation_count?: number
  annotation_conflict?: boolean
  adjudicator?: string
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
  const [correction, setCorrection] = useState({ corrected_sha256: '', correction_ref: '', annotator: '' })
  const [saving, setSaving] = useState(false)
  const [graphQuery, setGraphQuery] = useState('')
  const [graphItems, setGraphItems] = useState<GraphEntity[]>([])
  const [neighborItems, setNeighborItems] = useState<GraphEntity[]>([])
  const [forecastValues, setForecastValues] = useState('10, 12, 11, 14, 15')
  const [forecastResult, setForecastResult] = useState<Record<string, unknown> | null>(null)
  const [dispatch, setDispatch] = useState({ taskId: '', workerId: '', paths: 'projects/kairon' })
  const [dispatchResult, setDispatchResult] = useState<Record<string, unknown> | null>(null)
  const [evaluationDataset, setEvaluationDataset] = useState({ id: '', version: '', manifestSha256: '', samples: '' })
  const [evaluationRun, setEvaluationRun] = useState({ id: '', model: '', expected: '{}', actual: '' })
  const [evaluationResult, setEvaluationResult] = useState<Record<string, unknown> | null>(null)
  const [modelAcceptance, setModelAcceptance] = useState({ runId: '', candidate: '', baseline: 'naive-last-v1', minCases: '1', threshold: '0', cases: '' })
  const [modelAcceptanceResult, setModelAcceptanceResult] = useState<Record<string, unknown> | null>(null)
  const [adjudicationQueue, setAdjudicationQueue] = useState<AdjudicationItem[]>([])
  const [selectedAdjudication, setSelectedAdjudication] = useState<AdjudicationItem | null>(null)
  const [adjudicationImport, setAdjudicationImport] = useState('')
  const [annotation, setAnnotation] = useState({ annotator: '', adjudicator: '', version: '', labels: '{}' })
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

  const loadAdjudicationQueue = async () => {
    try {
      const data = await api('/api/kems/adjudication/queue?limit=100')
      setAdjudicationQueue(data.items || [])
      if (!selectedAdjudication && data.items?.[0]) setSelectedAdjudication(data.items[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法加载人工标注队列')
    }
  }

  // Keep the controlled human-label queue separate from OCR correction state.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void loadAdjudicationQueue() }, [])

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
    if (!selected || !correction.corrected_sha256 || !correction.correction_ref || !correction.annotator) return
    setSaving(true)
    try {
      await api(`/api/kems/ocr/runs/${selected.run_id}/correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction),
      })
      setCorrection({ corrected_sha256: '', correction_ref: '', annotator: '' })
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

  const registerEvaluation = async (event: FormEvent) => {
    event.preventDefault()
    let samples: unknown
    try { samples = JSON.parse(evaluationDataset.samples) } catch { setError('评测样本必须是合法 JSON 数组'); return }
    if (!evaluationDataset.id.trim() || !evaluationDataset.version.trim() || !Array.isArray(samples) || !samples.length) { setError('评测集 ID、版本和脱敏样本均为必填'); return }
    setKemsAction('evaluation-manifest')
    try {
      const data = await api('/api/kems/evaluations/manifests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_id: evaluationDataset.id.trim(), dataset_version: evaluationDataset.version.trim(), redaction_status: 'verified', samples }) })
      setEvaluationResult(data)
    } catch (err) { setError(err instanceof Error ? err.message : '评测集登记失败') } finally { setKemsAction('') }
  }

  const recordEvaluation = async (event: FormEvent) => {
    event.preventDefault()
    let expected: unknown
    let actual: unknown
    try {
      expected = JSON.parse(evaluationRun.expected)
      actual = JSON.parse(evaluationRun.actual)
    } catch { setError('expected 和 actual 必须是合法 JSON 对象'); return }
    if (!evaluationRun.id.trim() || !evaluationRun.model.trim() || !evaluationDataset.id.trim() || !evaluationDataset.version.trim() || !expected || typeof expected !== 'object' || Array.isArray(expected) || !actual || typeof actual !== 'object' || Array.isArray(actual)) { setError('评测运行需要 run ID、模型、数据集和结构化结果'); return }
    setKemsAction('evaluation-run')
    try {
      const data = await api(`/api/kems/evaluations/runs/${encodeURIComponent(evaluationRun.id.trim())}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_id: evaluationDataset.id.trim(), dataset_version: evaluationDataset.version.trim(), model_id: evaluationRun.model.trim(), expected, actual }) })
      setEvaluationResult(data)
    } catch (err) { setError(err instanceof Error ? err.message : '评测运行登记失败') } finally { setKemsAction('') }
  }

  const evaluateCandidateModel = async (event: FormEvent) => {
    event.preventDefault()
    let cases: unknown
    let manifestSamples: unknown
    try { cases = JSON.parse(modelAcceptance.cases) } catch { setError('候选模型样本必须是合法 JSON 数组'); return }
    try { manifestSamples = JSON.parse(evaluationDataset.samples) } catch { setError('请先登记合法的 adjudicated manifest'); return }
    if (!modelAcceptance.runId.trim() || !modelAcceptance.candidate.trim() || !evaluationDataset.id.trim() || !evaluationDataset.version.trim() || !evaluationDataset.manifestSha256.trim() || !Array.isArray(manifestSamples) || !manifestSamples.length || !Array.isArray(cases) || !cases.length) { setError('候选模型运行需要模型、数据集身份、manifest SHA、样本数和脱敏数值样本'); return }
    setKemsAction('model-acceptance')
    try {
      const data = await api(`/api/kems/models/candidates/${encodeURIComponent(modelAcceptance.candidate.trim())}/evaluation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ run_id: modelAcceptance.runId.trim(), baseline_model_id: modelAcceptance.baseline.trim() || 'naive-last-v1', min_cases: Number(modelAcceptance.minCases), min_relative_improvement: Number(modelAcceptance.threshold), dataset_id: evaluationDataset.id.trim(), dataset_version: evaluationDataset.version.trim(), evaluation_manifest_sha256: evaluationDataset.manifestSha256.trim(), dataset_sample_count: manifestSamples.length, cases }) })
      setModelAcceptanceResult(data.evaluation || data)
    } catch (err) { setError(err instanceof Error ? err.message : '候选模型评测失败') } finally { setKemsAction('') }
  }

  const importAdjudicationQueue = async (event: FormEvent) => {
    event.preventDefault()
    let items: unknown
    try { items = JSON.parse(adjudicationImport) } catch { setError('标注队列必须是合法 JSON 数组'); return }
    if (!Array.isArray(items) || !items.length) { setError('标注队列必须是非空数组'); return }
    setKemsAction('adjudication-import')
    try {
      await api('/api/kems/adjudication/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
      setAdjudicationImport('')
      await loadAdjudicationQueue()
    } catch (err) { setError(err instanceof Error ? err.message : '导入标注队列失败') } finally { setKemsAction('') }
  }

  const claimAdjudication = async () => {
    if (!selectedAdjudication || !annotation.annotator.trim()) { setError('领取样本需要标注人'); return }
    setKemsAction('adjudication-claim')
    try {
      const data = await api(`/api/kems/adjudication/${encodeURIComponent(selectedAdjudication.sample_id)}/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annotator: annotation.annotator.trim() }) })
      setSelectedAdjudication(data.item)
      await loadAdjudicationQueue()
    } catch (err) { setError(err instanceof Error ? err.message : '领取样本失败') } finally { setKemsAction('') }
  }

  const submitAdjudication = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedAdjudication) return
    let labels: unknown
    try { labels = JSON.parse(annotation.labels) } catch { setError('labels 必须是合法 JSON 对象'); return }
    if (!labels || typeof labels !== 'object' || Array.isArray(labels) || !Object.keys(labels).length || !annotation.adjudicator.trim() || !annotation.version.trim()) { setError('labels、裁决人和裁决版本均为必填'); return }
    setKemsAction('adjudication-submit')
    try {
      const data = await api(`/api/kems/adjudication/${encodeURIComponent(selectedAdjudication.sample_id)}/adjudicate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ labels, adjudicator: annotation.adjudicator.trim(), annotation_version: annotation.version.trim() }) })
      setSelectedAdjudication(data.item)
      await loadAdjudicationQueue()
    } catch (err) { setError(err instanceof Error ? err.message : '提交人工裁决失败') } finally { setKemsAction('') }
  }

  const submitIndependentAnnotation = async () => {
    if (!selectedAdjudication) return
    let labels: unknown
    try { labels = JSON.parse(annotation.labels) } catch { setError('labels 必须是合法 JSON 对象'); return }
    if (!labels || typeof labels !== 'object' || Array.isArray(labels) || !Object.keys(labels).length || !annotation.annotator.trim() || !annotation.version.trim()) { setError('labels、标注人和标注版本均为必填'); return }
    setKemsAction('annotation-submit')
    try {
      const data = await api(`/api/kems/adjudication/${encodeURIComponent(selectedAdjudication.sample_id)}/annotate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ labels, annotator: annotation.annotator.trim(), annotation_version: annotation.version.trim() }) })
      setSelectedAdjudication(data.item)
      await loadAdjudicationQueue()
    } catch (err) { setError(err instanceof Error ? err.message : '提交独立标注失败') } finally { setKemsAction('') }
  }

  const buildAdjudicatedManifest = async () => {
    if (!evaluationDataset.id.trim() || !evaluationDataset.version.trim()) { setError('数据集 ID 和版本均为必填'); return }
    setKemsAction('adjudication-manifest')
    try {
      const data = await api('/api/kems/adjudication/manifest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataset_id: evaluationDataset.id.trim(), dataset_version: evaluationDataset.version.trim() }) })
      setEvaluationResult(data)
    } catch (err) { setError(err instanceof Error ? err.message : '生成裁决评测集失败') } finally { setKemsAction('') }
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
            <form className="kems-correction-form" onSubmit={submitCorrection}><h4>提交人工纠正</h4><p>仅提交纠正结果的哈希和证据引用，正文始终留在受控存储中。</p><label>纠正结果 SHA-256<input className="antd-input" value={correction.corrected_sha256} onChange={e => setCorrection({ ...correction, corrected_sha256: e.target.value })} required /></label><label>纠正证据引用<input className="antd-input" value={correction.correction_ref} onChange={e => setCorrection({ ...correction, correction_ref: e.target.value })} required /></label><label>标注人<input className="antd-input" value={correction.annotator} onChange={e => setCorrection({ ...correction, annotator: e.target.value })} required /></label><button className="antd-btn antd-btn-primary" disabled={saving || selected.review_status === 'pass'}><CheckCircle2 size={15} /> {saving ? '提交中...' : '提交并进入复核'}</button></form>
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
      <div className="kems-grid kems-adjudication-grid">
        <div className="kems-panel kems-queue-panel">
          <div className="kems-panel-heading"><div><h3>人工标注队列</h3><span>只显示脱敏元数据</span></div><ClipboardList size={16} /></div>
          <form className="kems-correction-form" onSubmit={importAdjudicationQueue}>
            <label>导入脱敏队列 JSONL 转 JSON<input className="antd-input kems-json-input" aria-label="导入脱敏标注队列" value={adjudicationImport} onChange={event => setAdjudicationImport(event.target.value)} placeholder='[{"sample_id":"...","source_ref":"vault://redacted/..."}]' /></label>
            <button className="antd-btn" disabled={kemsAction === 'adjudication-import'}><ClipboardList size={14} /> 导入队列</button>
          </form>
          <div className="kems-queue" role="list">
            {!adjudicationQueue.length ? <div className="kems-empty">当前没有待标注样本</div> : adjudicationQueue.map(item => <button key={item.sample_id} className={`kems-queue-item ${selectedAdjudication?.sample_id === item.sample_id ? 'selected' : ''}`} onClick={() => setSelectedAdjudication(item)} role="listitem"><strong>{item.sample_id}</strong><span>{item.source_ref}</span><em>{item.annotation_status}</em></button>)}
          </div>
        </div>
        <form className="kems-panel kems-correction-form" onSubmit={submitAdjudication}>
          <div className="kems-panel-heading"><div><h3>裁决样本</h3><span>{selectedAdjudication?.sample_id || '先选择一条样本'}</span></div><UserCheck size={16} /></div>
          {selectedAdjudication ? <>
            <dl className="kems-metadata"><div><dt>来源引用</dt><dd>{selectedAdjudication.source_ref}</dd></div><div><dt>场景 / 切分</dt><dd>{selectedAdjudication.scenario_id} / {selectedAdjudication.split}</dd></div><div><dt>状态</dt><dd>{selectedAdjudication.annotation_status}</dd></div><div><dt>独立标注数</dt><dd>{String(selectedAdjudication.annotation_count ?? 0)}</dd></div><div><dt>标注冲突</dt><dd>{selectedAdjudication.annotation_conflict ? '需要裁决' : '未发现冲突'}</dd></div><div><dt>最终标签</dt><dd>{JSON.stringify(selectedAdjudication.labels || {})}</dd></div></dl>
            <label>标注人<input className="antd-input" aria-label="人工标注人" value={annotation.annotator} onChange={event => setAnnotation({ ...annotation, annotator: event.target.value })} required /></label>
            <label>标注版本<input className="antd-input" aria-label="标注版本" value={annotation.version} onChange={event => setAnnotation({ ...annotation, version: event.target.value })} placeholder="ann-2026-08-01" required /></label>
            <button className="antd-btn" type="button" onClick={() => void claimAdjudication()} disabled={kemsAction === 'adjudication-claim' || selectedAdjudication.annotation_status === 'adjudicated'}><UserCheck size={14} /> 领取样本</button>
            <label>结构化 labels JSON<textarea className="antd-input kems-json-input" aria-label="结构化 labels JSON" value={annotation.labels} onChange={event => setAnnotation({ ...annotation, labels: event.target.value })} required /></label>
            <button className="antd-btn antd-btn-primary" type="button" onClick={() => void submitIndependentAnnotation()} disabled={kemsAction === 'annotation-submit' || selectedAdjudication.annotation_status === 'adjudicated'}><CheckCircle2 size={14} /> 提交独立标注</button>
            <label>独立裁决人<input className="antd-input" aria-label="独立裁决人" value={annotation.adjudicator} onChange={event => setAnnotation({ ...annotation, adjudicator: event.target.value })} placeholder="不能与标注人相同" required /></label>
            <button className="antd-btn antd-btn-primary" disabled={kemsAction === 'adjudication-submit' || selectedAdjudication.annotation_count !== 2}><CheckCircle2 size={14} /> 提交最终 adjudication</button>
          </> : <div className="kems-empty">选择一条样本开始人工裁决</div>}
        </form>
      </div>
      <div className="kems-grid kems-evaluation-grid">
        <form className="kems-panel kems-correction-form" onSubmit={registerEvaluation}>
          <div className="kems-panel-heading"><div><h3>脱敏评测集登记</h3><span>仅接受 adjudicated manifest</span></div><ClipboardCheck size={16} /></div>
          <label>数据集 ID<input className="antd-input" aria-label="评测集 ID" value={evaluationDataset.id} onChange={event => setEvaluationDataset({ ...evaluationDataset, id: event.target.value })} placeholder="例如 kems-real" /></label>
          <label>数据集版本<input className="antd-input" aria-label="评测集版本" value={evaluationDataset.version} onChange={event => setEvaluationDataset({ ...evaluationDataset, version: event.target.value })} placeholder="例如 2026-07-31" /></label>
          <label>Manifest SHA-256<input className="antd-input" aria-label="评测集 Manifest SHA-256" value={evaluationDataset.manifestSha256} onChange={event => setEvaluationDataset({ ...evaluationDataset, manifestSha256: event.target.value })} placeholder="64 位十六进制摘要" /></label>
          <label>脱敏 adjudicated 样本 JSON<input className="antd-input kems-json-input" aria-label="脱敏评测样本 JSON" value={evaluationDataset.samples} onChange={event => setEvaluationDataset({ ...evaluationDataset, samples: event.target.value })} placeholder='[{"sample_id":"...","source_ref":"vault://redacted/...","labels":{}}]' /></label>
          <button className="antd-btn antd-btn-primary" disabled={kemsAction === 'evaluation-manifest'}><ClipboardCheck size={14} /> 登记评测集</button>
          <button className="antd-btn" type="button" disabled={kemsAction === 'adjudication-manifest'} onClick={() => void buildAdjudicatedManifest()}><ClipboardCheck size={14} /> 从已裁决队列生成</button>
        </form>
        <form className="kems-panel kems-correction-form" onSubmit={recordEvaluation}>
          <div className="kems-panel-heading"><div><h3>模型评测运行</h3><span>结果进入 EvaluationStore</span></div><CheckCircle2 size={16} /></div>
          <label>运行 ID<input className="antd-input" aria-label="评测运行 ID" value={evaluationRun.id} onChange={event => setEvaluationRun({ ...evaluationRun, id: event.target.value })} placeholder="eval-run-1" /></label>
          <label>模型 ID<input className="antd-input" aria-label="评测模型 ID" value={evaluationRun.model} onChange={event => setEvaluationRun({ ...evaluationRun, model: event.target.value })} placeholder="baseline-exact" /></label>
          <label>Expected JSON<input className="antd-input kems-json-input" aria-label="Expected JSON" value={evaluationRun.expected} onChange={event => setEvaluationRun({ ...evaluationRun, expected: event.target.value })} /></label>
          <label>Actual JSON<input className="antd-input kems-json-input" aria-label="Actual JSON" value={evaluationRun.actual} onChange={event => setEvaluationRun({ ...evaluationRun, actual: event.target.value })} placeholder='{"field":"prediction"}' /></label>
          <button className="antd-btn antd-btn-primary" disabled={kemsAction === 'evaluation-run'}><CheckCircle2 size={14} /> 记录评测结果</button>
          {evaluationResult && <pre className="kems-json-result" role="status">{JSON.stringify(evaluationResult.evaluation || evaluationResult, null, 2)}</pre>}
        </form>
        <form className="kems-panel kems-correction-form" onSubmit={evaluateCandidateModel}>
          <div className="kems-panel-heading"><div><h3>候选预测模型 Shadow 准入</h3><span>只接受脱敏数值，不自动上线</span></div><ShieldCheck size={16} /></div>
          <label>运行 ID<input className="antd-input" aria-label="候选模型运行 ID" value={modelAcceptance.runId} onChange={event => setModelAcceptance({ ...modelAcceptance, runId: event.target.value })} placeholder="model-run-1" /></label>
          <label>候选模型 ID<input className="antd-input" aria-label="候选模型 ID" value={modelAcceptance.candidate} onChange={event => setModelAcceptance({ ...modelAcceptance, candidate: event.target.value })} placeholder="candidate-v1" /></label>
          <label>基线模型 ID<input className="antd-input" aria-label="基线模型 ID" value={modelAcceptance.baseline} onChange={event => setModelAcceptance({ ...modelAcceptance, baseline: event.target.value })} /></label>
          <div className="kems-control-grid"><label>最少样本数<input className="antd-input" type="number" min="1" value={modelAcceptance.minCases} onChange={event => setModelAcceptance({ ...modelAcceptance, minCases: event.target.value })} /></label><label>最低相对提升<input className="antd-input" type="number" min="0" max="0.99" step="0.01" value={modelAcceptance.threshold} onChange={event => setModelAcceptance({ ...modelAcceptance, threshold: event.target.value })} /></label></div>
          <label>脱敏数值样本 JSON<input className="antd-input kems-json-input" aria-label="候选模型脱敏数值样本 JSON" value={modelAcceptance.cases} onChange={event => setModelAcceptance({ ...modelAcceptance, cases: event.target.value })} placeholder='[{"case_id":"case-1","predictions":[10],"actual":[11],"baseline_value":8}]' /></label>
          <button className="antd-btn antd-btn-primary" disabled={kemsAction === 'model-acceptance'}><ShieldCheck size={14} /> 运行 Shadow 评测</button>
          {modelAcceptanceResult && <pre className="kems-json-result" role="status">{JSON.stringify(modelAcceptanceResult, null, 2)}</pre>}
        </form>
      </div>
    </section>
  )
}
