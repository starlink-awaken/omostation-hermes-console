import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash2,
  ClipboardCheck,
  Database,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import {
  useEvaluateExternalResources,
  useExternalResourceSelectionEvaluation,
  useExternalResources,
  type ExternalResourceAvailability,
  type ExternalResourceEvaluation,
  type ExternalResourceReviewQueueProjection,
  type ExternalResourceSceneBinding,
  type ExternalResourceItem,
  useExternalResourceReviewQueue,
} from '../api/hooks';
import ExternalResourcePackPreflightPanel from './ExternalResourcePackPreflightPanel';
import ExternalSceneTrialReviewPanel from './ExternalSceneTrialReviewPanel';

const KIND_LABELS: Record<string, string> = {
  knowledge_source: '知识源',
  data_source: '数据源',
  resource_provider: '资源提供方',
  method_pack: '方法包',
  tool_capability: '工具能力',
  channel: '渠道',
  model_provider: '模型提供方',
};

const AVAILABILITY_LABELS: Record<ExternalResourceAvailability, string> = {
  available: '可用',
  degraded: '降级',
  proposal_only: '仅提案',
  unavailable: '不可用',
};

function availabilityColor(value: ExternalResourceAvailability): string {
  if (value === 'available') return '#389e0d';
  if (value === 'degraded' || value === 'proposal_only') return '#ad6800';
  return '#cf1322';
}

function formatTime(value?: string | null): string {
  if (!value) return '无探针时间';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ResourceRow({ item, active, onSelect }: { item: ExternalResourceItem; active: boolean; onSelect: () => void }) {
  const color = availabilityColor(item.availability);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`选择外部资源 ${item.id}`}
      style={{
        textAlign: 'left',
        border: active ? '1px solid var(--antd-primary, #1677ff)' : '1px solid #e8e8e8',
        background: active ? '#f0f7ff' : '#fff',
        padding: 12,
        borderRadius: 6,
        cursor: 'pointer',
        display: 'grid',
        gap: 7,
      }}
    >
      <strong style={{ overflowWrap: 'anywhere' }}>{item.id}</strong>
      <span style={{ color: '#666', fontSize: 12 }}>{KIND_LABELS[item.kind] || item.kind} · {item.provider}</span>
      <span style={{ color, fontSize: 12, fontWeight: 600 }}>{AVAILABILITY_LABELS[item.availability]}</span>
    </button>
  );
}

function ReviewQueuePanel({
  projection,
  isLoading,
  error,
  onRetry,
}: {
  projection?: ExternalResourceReviewQueueProjection;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const status = projection?.status;
  const statusLabel = status === 'attention'
    ? '需要人工复核'
    : status === 'clear'
      ? '当前无待复核变化'
      : status === 'empty'
        ? '尚无观测'
        : '复核队列不可用';
  const statusColor = status === 'attention' ? '#ad6800' : status === 'clear' ? '#389e0d' : '#cf1322';

  return (
    <section className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }} aria-label="外部资源人工复核队列">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={18} style={{ color: 'var(--antd-primary, #1677ff)' }} />
          <strong>人工复核队列</strong>
          <span style={{ color: '#ad6800', fontSize: 12, fontWeight: 600 }}><LockKeyhole size={13} /> 只读观察</span>
        </div>
        {projection && <span style={{ color: statusColor, fontSize: 12, fontWeight: 600 }}>{statusLabel}</span>}
      </div>

      {isLoading && !projection && <span style={{ color: '#666', fontSize: 13 }}>正在读取最新受治理观测...</span>}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', color: '#cf1322', fontSize: 13 }}>
          <span>{error.message || '外部资源复核队列不可用'}</span>
          <button type="button" className="antd-btn" onClick={onRetry} aria-label="重试读取外部资源复核队列">
            <RefreshCw size={14} /> 重试
          </button>
        </div>
      )}

      {projection && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#666', fontSize: 12 }}>
            <span>待复核 {projection.summary.review_required_count}</span>
            <span>运营观察 {projection.summary.operational_observation_count}</span>
            <span>语义 {projection.queue_semantics}</span>
            {projection.observed_at && <span>观测 {formatTime(projection.observed_at)}</span>}
          </div>
          {projection.status === 'attention' && projection.items.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {projection.items.map((item) => (
                <article key={`${item.resource_id}:${item.change}`} style={{ border: '1px solid #ffd591', borderRadius: 6, padding: 10, background: '#fffbe6', display: 'grid', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ overflowWrap: 'anywhere' }}>{item.resource_id}</strong>
                    <span style={{ color: '#ad6800', fontSize: 12 }}>{item.change} · {item.risk_class}</span>
                  </div>
                  <span style={{ color: '#666', fontSize: 12 }}>风险码：{item.risk_codes.join(' · ') || '未提供'} · 变化字段：{item.changed_fields.join('、') || '未提供'}</span>
                </article>
              ))}
            </div>
          )}
          <span style={{ color: '#666', fontSize: 12 }}>{projection.next_action} activation: {projection.activation}</span>
        </>
      )}
    </section>
  );
}

export default function ExternalResourceCatalogView() {
  const { data, isLoading, error, refetch } = useExternalResources();
  const reviewQueue = useExternalResourceReviewQueue();
  const evaluate = useEvaluateExternalResources();
  const [kind, setKind] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [capability, setCapability] = useState('search');
  const [sceneBinding, setSceneBinding] = useState<ExternalResourceSceneBinding>({
    scene_id: '',
    journey_id: '',
    outcome_metric: '',
    data_scope: '',
    operator: '',
    permission_ref: '',
  });
  const [evaluationResult, setEvaluationResult] = useState<ExternalResourceEvaluation>();
  const [observationStatus, setObservationStatus] = useState<string>('not_requested');
  const [persistObservation, setPersistObservation] = useState(false);
  const [workflowRunId, setWorkflowRunId] = useState('');
  const selectionEvaluation = useExternalResourceSelectionEvaluation(sceneBinding.scene_id || undefined);
  const projection = data?.projection;
  const filtered = useMemo(() => {
    const resources = projection?.resources ?? [];
    const normalized = query.trim().toLowerCase();
    return resources.filter((item) => (
      (kind === 'all' || item.kind === kind)
      && (availability === 'all' || item.availability === availability)
      && (!normalized || `${item.id} ${item.provider} ${item.capabilities.join(' ')}`.toLowerCase().includes(normalized))
    ));
  }, [availability, kind, projection, query]);
  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];
  const updateSceneBinding = (field: keyof ExternalResourceSceneBinding, value: string) => {
    setSceneBinding((current) => ({ ...current, [field]: value }));
  };
  const handleEvaluation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    evaluate.mutate(
      {
        capability: capability.trim(),
        scene_binding: sceneBinding,
        persist_observation: persistObservation,
        workflow_run_id: workflowRunId.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          setEvaluationResult(result.evaluation);
          setObservationStatus(result.observation_status || 'not_requested');
        },
      },
    );
  };

  if (isLoading && !data) {
    return <div className="antd-card" style={{ padding: 24 }}>正在读取外部资源目录...</div>;
  }

  if (error || !projection) {
    return (
      <section className="antd-card" style={{ padding: 24, display: 'grid', gap: 12 }} aria-label="外部资源目录不可用">
        <AlertTriangle size={28} style={{ color: '#cf1322' }} />
        <strong>{error instanceof Error ? error.message : '外部资源目录不可用'}</strong>
        <button type="button" className="antd-btn" onClick={() => void refetch()} aria-label="重试读取外部资源目录">
          <RefreshCw size={14} /> 重试
        </button>
      </section>
    );
  }

  const summary = projection.summary;
  return (
    <section style={{ display: 'grid', gap: 16, padding: '1rem 0' }} aria-label="外部资源目录">
      <header className="antd-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Database size={22} style={{ color: 'var(--antd-primary, #1677ff)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>外部能力目录</h2>
            <span style={{ color: '#ad6800', fontSize: 12, fontWeight: 600 }}><LockKeyhole size={13} /> 只读投影</span>
          </div>
          <span style={{ color: '#666', fontSize: 13 }}>动态发现、健康、新鲜度和准入边界</span>
        </div>
        <button type="button" className="antd-btn" onClick={() => void refetch()} disabled={isLoading} aria-label="刷新外部资源目录">
          <RefreshCw size={14} className={isLoading ? 'spinning' : ''} /> 刷新
        </button>
      </header>

      <ReviewQueuePanel
        projection={reviewQueue.data?.projection}
        isLoading={reviewQueue.isLoading}
        error={reviewQueue.error instanceof Error ? reviewQueue.error : null}
        onRetry={() => void reviewQueue.refetch()}
      />

      <ExternalSceneTrialReviewPanel />

      <ExternalResourcePackPreflightPanel />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[
          ['资源', summary.resource_count, '#1677ff'],
          ['可用', summary.by_availability?.available ?? 0, '#389e0d'],
          ['仅提案', summary.by_availability?.proposal_only ?? 0, '#ad6800'],
          ['不可用/错误', summary.unavailable_count, '#cf1322'],
        ].map(([label, value, color]) => (
          <div className="antd-card" key={label} style={{ padding: 14, display: 'grid', gap: 4 }}>
            <span style={{ color: '#666', fontSize: 12 }}>{label}</span>
            <strong style={{ color: String(color), fontSize: 22 }}>{value}</strong>
          </div>
        ))}
      </div>

      <div className="antd-card" style={{ padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="antd-input" aria-label="搜索外部资源" placeholder="搜索资源、提供方或能力" value={query} onChange={(event) => setQuery(event.target.value)} style={{ flex: '1 1 240px' }} />
        <select className="antd-input" aria-label="按资源类型筛选" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="all">全部类型</option>
          {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="antd-input" aria-label="按可用性筛选" value={availability} onChange={(event) => setAvailability(event.target.value)}>
          <option value="all">全部状态</option>
          {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <form className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }} onSubmit={handleEvaluation} aria-label="按场景评估外部资源">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <ClipboardCheck size={18} style={{ color: 'var(--antd-primary, #1677ff)' }} />
          <strong>按场景评估候选</strong>
          <span style={{ color: '#ad6800', fontSize: 12, fontWeight: 600 }}><LockKeyhole size={13} /> 只读决策</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label>能力<input className="antd-input" aria-label="评估能力" value={capability} onChange={(event) => setCapability(event.target.value)} placeholder="search" /></label>
          {([
            ['scene_id', '场景 ID'],
            ['journey_id', '旅程 ID'],
            ['outcome_metric', '结果指标'],
            ['data_scope', '数据范围'],
            ['operator', '操作人'],
            ['permission_ref', '权限引用'],
          ] as const).map(([field, label]) => (
            <label key={field}>{label}<input className="antd-input" aria-label={`评估${label}`} value={sceneBinding[field]} onChange={(event) => updateSceneBinding(field, event.target.value)} /></label>
          ))}
          <label>WorkflowRun ID<input className="antd-input" aria-label="评估 WorkflowRun ID" value={workflowRunId} onChange={(event) => setWorkflowRunId(event.target.value)} placeholder="可选，用于关联执行" /></label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" aria-label="记录选择评估观察" checked={persistObservation} onChange={(event) => setPersistObservation(event.target.checked)} />
            记录选择评估观察
          </label>
          <button type="submit" className="antd-btn antd-btn-primary" disabled={evaluate.isPending || !capability.trim()} aria-label="评估外部资源候选">
            <ListChecks size={14} /> {evaluate.isPending ? '评估中...' : '评估候选'}
          </button>
          <span style={{ color: '#666', fontSize: 12 }}>结果只展示候选、淘汰原因和决策因子，不会激活连接。</span>
          {evaluate.error && <span style={{ color: '#cf1322', fontSize: 12 }}>{evaluate.error instanceof Error ? evaluate.error.message : '评估失败'}</span>}
        </div>
      </form>

      {evaluationResult && (
        <section className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }} aria-label="外部资源场景评估结果">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={18} style={{ color: '#389e0d' }} /><strong>评估结果：{evaluationResult.status}</strong></div>
            <span style={{ color: '#ad6800', fontSize: 12, fontWeight: 600 }}>activation: {evaluationResult.activation}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#666', fontSize: 12 }}>
            <span>候选 {evaluationResult.summary.candidate_count}</span>
            <span>可选 {evaluationResult.summary.eligible_count}</span>
            <span>淘汰 {evaluationResult.summary.rejected_count}</span>
            <span>不适用 {evaluationResult.summary.not_applicable_count}</span>
            <span>最终选择 {evaluationResult.selected_resource_id || '无'}</span>
            <span>观察记录 {observationStatus === 'recorded' ? '已记录' : observationStatus === 'deduplicated' ? '已去重' : '未请求'}</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {evaluationResult.candidates.map((candidate) => (
              <div key={candidate.resource_id} style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 10, display: 'grid', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ overflowWrap: 'anywhere' }}>{candidate.resource_id}</strong>
                  <span style={{ color: candidate.status === 'eligible' ? '#389e0d' : '#ad6800', fontSize: 12 }}>{candidate.status}</span>
                </div>
                {candidate.reasons.length > 0 && <span style={{ color: '#ad6800', fontSize: 12 }}>{candidate.reasons.join(' · ')}</span>}
                {Object.keys(candidate.decision_factors).length > 0 && <span style={{ color: '#666', fontSize: 12 }}>健康 {candidate.decision_factors.health} · 可信度 {candidate.decision_factors.trust ?? 0} · 新鲜度 {candidate.decision_factors.freshness ?? 0} · 成本 {candidate.decision_factors.cost ?? 0} · 延迟 {candidate.decision_factors.latency ?? 0}</span>}
              </div>
            ))}
            {evaluationResult.candidates.length === 0 && <span style={{ color: '#666' }}><CircleSlash2 size={14} /> 没有可评估候选。</span>}
          </div>
        </section>
      )}

      {selectionEvaluation.data?.dataset && (
        <section className="antd-card" style={{ padding: 14, display: 'grid', gap: 8 }} aria-label="外部资源评测集摘要">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardCheck size={16} style={{ color: 'var(--antd-primary, #1677ff)' }} /><strong>场景评测证据</strong></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#666', fontSize: 12 }}>
            <span>观察 {selectionEvaluation.data.dataset.summary.row_count}</span>
            <span>已关联运行 {selectionEvaluation.data.dataset.summary.linked_run_count ?? 0}</span>
            <span>已执行 {selectionEvaluation.data.dataset.summary.executed_count ?? 0}</span>
            <span>资源对齐 {selectionEvaluation.data.dataset.summary.aligned_count ?? 0}</span>
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(0, 1.6fr)', gap: 16, alignItems: 'start' }}>
        <div className="antd-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong>发现结果</strong><span style={{ color: '#666', fontSize: 12 }}>{filtered.length} 条</span></div>
          {filtered.map((item) => <ResourceRow key={item.id} item={item} active={item.id === selected?.id} onSelect={() => setSelectedId(item.id)} />)}
          {filtered.length === 0 && <span style={{ color: '#666' }}>没有匹配的资源。</span>}
        </div>

        {selected ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="antd-card" style={{ padding: 16, display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div><span style={{ color: '#8c8c8c', fontSize: 12 }}>资源标识</span><h3 style={{ margin: '4px 0 0', fontSize: '1.05rem', overflowWrap: 'anywhere' }}>{selected.id}</h3></div>
                <span style={{ color: availabilityColor(selected.availability), fontSize: 12, fontWeight: 600 }}>{AVAILABILITY_LABELS[selected.availability]}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div><small>类型</small><div>{KIND_LABELS[selected.kind] || selected.kind}</div></div>
                <div><small>提供方</small><div>{selected.provider}</div></div>
                <div><small>生命周期</small><div>{selected.lifecycle}</div></div>
                <div><small>版本</small><div>{selected.version}</div></div>
              </div>
              <div><small>能力</small><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{selected.capabilities.map((capability) => <span key={capability} style={{ background: '#f0f5ff', color: '#1d39c4', border: '1px solid #adc6ff', borderRadius: 4, padding: '3px 6px', fontSize: 11 }}>{capability}</span>)}</div></div>
              <div><small>探针</small><div>{selected.health.status} · {formatTime(selected.health.observed_at)}{selected.health.latency_ms != null ? ` · ${selected.health.latency_ms} ms` : ''}</div></div>
              <div><small>来源引用</small><div style={{ overflowWrap: 'anywhere' }}>{selected.provenance_ref}</div></div>
            </div>
            <div className="antd-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
              <strong><ShieldAlert size={15} /> 准入与风险</strong>
              <div style={{ color: '#666', fontSize: 13 }}>activation: {projection.activation} · mode: {selected.mode} · rollback: {selected.rollback_plan ? '已声明' : '缺失'}</div>
              {selected.reason_codes.length ? <ul style={{ margin: 0, paddingLeft: 20, color: '#ad6800' }}>{selected.reason_codes.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <div style={{ color: '#389e0d' }}><CheckCircle2 size={14} /> 当前投影没有额外风险码</div>}
            </div>
          </div>
        ) : (
          <div className="antd-card" style={{ padding: 24, color: '#666' }}><CircleSlash2 size={20} /> 选择资源查看详情</div>
        )}
      </div>
      {!!projection.errors.length && <div className="antd-card" style={{ padding: 14, borderLeft: '3px solid #cf1322' }}><strong>发现错误 {projection.errors.length} 条</strong><ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>{projection.errors.map((item) => <li key={`${item.entry_point}:${item.error}`}>{item.entry_point} · {item.error}</li>)}</ul></div>}
    </section>
  );
}
