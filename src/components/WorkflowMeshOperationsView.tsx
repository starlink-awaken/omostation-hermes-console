import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  RefreshCw,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  useRecordOutcomeFeedback,
  useWorkflowMeshOperations,
  type OutcomeConsumptionState,
  type OutcomeFeedbackInput,
  type WorkflowMeshOperationsData,
} from '../api/hooks';

const FEEDBACK_STATES: Array<{ value: OutcomeConsumptionState; label: string }> = [
  { value: 'reviewed', label: '已复核' },
  { value: 'adopted', label: '已采纳' },
  { value: 'submitted', label: '已提交' },
  { value: 'dispatched', label: '已派发' },
  { value: 'cited', label: '已引用' },
  { value: 'rejected', label: '已拒绝' },
];

const EMPTY_FORM = {
  outcomeId: '',
  state: 'reviewed' as OutcomeConsumptionState,
  consumerRef: 'operator://redacted/reviewer',
  resultRef: '',
  evidenceRefs: '',
  amount: '',
  unit: '',
  note: '',
};

function metricLabel(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : `${Math.round(value * 100)}%`;
}

function statusTone(status: WorkflowMeshOperationsData['consumption']['status']) {
  if (status === 'observed') return { color: '#237804', background: '#f6ffed', border: '#b7eb8f' };
  if (status === 'rejected') return { color: '#a8071a', background: '#fff1f0', border: '#ffa39e' };
  return { color: '#874d00', background: '#fffbe6', border: '#ffe58f' };
}

export default function WorkflowMeshOperationsView() {
  const { data, isLoading, error, refetch } = useWorkflowMeshOperations();
  const feedbackMutation = useRecordOutcomeFeedback();
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<string | null>(null);

  const operations = data?.operations;
  const selectedOutcome = useMemo(
    () => operations?.consumption.eligible_outcomes.find((item) => item.outcome_id === form.outcomeId),
    [form.outcomeId, operations],
  );

  const updateForm = (field: keyof typeof EMPTY_FORM, value: string) => {
    setMessage(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitFeedback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOutcome) {
      setMessage('请选择一个已经形成结果的 WorkflowRun。');
      return;
    }
    const input: OutcomeFeedbackInput = {
      workflow_run_id: selectedOutcome.workflow_run_id,
      outcome_id: selectedOutcome.outcome_id,
      scene_binding: selectedOutcome.scene_binding,
      consumption_state: form.state,
      consumer_ref: form.consumerRef,
      result_ref: form.resultRef || undefined,
      evidence_refs: form.evidenceRefs
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      value: form.amount || form.unit ? { amount: form.amount ? Number(form.amount) : undefined, unit: form.unit || undefined } : undefined,
      note: form.note || undefined,
      actor_ref: 'cockpit-ui://workflow-mesh-operations',
    };

    try {
      const result = await feedbackMutation.mutateAsync(input);
      setMessage(result.status === 'deduplicated' ? '这条反馈已存在，未重复写入。' : '结果消费反馈已记录。');
      setForm((current) => ({ ...EMPTY_FORM, outcomeId: current.outcomeId }));
    } catch (mutationError) {
      setMessage(mutationError instanceof Error ? mutationError.message : '反馈记录失败。');
    }
  };

  if (isLoading && !operations) {
    return <div className="antd-card" style={{ padding: '2rem' }}>正在读取 Workflow Mesh 运营投影...</div>;
  }

  if (error || !operations) {
    return (
      <div className="antd-card" style={{ padding: '1.5rem', borderColor: '#ffa39e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#a8071a', fontWeight: 600 }}>
          <ShieldAlert size={18} /> Workflow Mesh 运营投影不可用
        </div>
        <p style={{ color: '#595959', marginBottom: '1rem' }}>{error instanceof Error ? error.message : '后端未提供可验证的运行事实。'}</p>
        <button className="antd-btn" onClick={() => { void refetch(); }} type="button">
          <RefreshCw size={14} /> 重试
        </button>
      </div>
    );
  }

  const consumptionTone = statusTone(operations.consumption.status);
  const summary = [
    ['运行总数', operations.summary.run_count],
    ['Workflow 请求', operations.workflow_requests?.request_count ?? 0],
    ['待准入', operations.workflow_requests?.pending_count ?? 0],
    ['已成功', operations.summary.succeeded_runs],
    ['已验证', operations.summary.verified_runs],
    ['已关闭', operations.summary.closed_runs],
    ['已消费', operations.consumption.consumed_runs],
    ['消费率', metricLabel(operations.consumption.consumption_rate_among_eligible_closed_runs)],
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
      <header className="antd-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={22} style={{ color: 'var(--antd-primary, #1677ff)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Workflow Mesh 运营闭环</h2>
            <span style={{ color: '#237804', background: '#f6ffed', border: '1px solid #b7eb8f', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>Live</span>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: '#666', fontSize: '0.85rem' }}>从运行事实、复盘队列到结果消费回执，确认交付是否产生真实价值。</p>
        </div>
        <button className="antd-btn" onClick={() => { void refetch(); }} type="button" title="刷新运营投影">
          <RefreshCw size={14} /> 刷新
        </button>
      </header>

      <section aria-label="运行摘要" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        {summary.map(([label, value]) => (
          <div className="antd-card" key={label} style={{ padding: '1rem' }}>
            <div style={{ color: '#8c8c8c', fontSize: '0.78rem' }}>{label}</div>
            <strong style={{ display: 'block', fontSize: '1.45rem', marginTop: '0.25rem' }}>{value}</strong>
          </div>
        ))}
      </section>

      <section className="antd-card" style={{ background: consumptionTone.background, borderColor: consumptionTone.border }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
          {operations.consumption.status === 'observed' ? <CheckCircle2 size={20} style={{ color: consumptionTone.color }} /> : operations.consumption.status === 'rejected' ? <XCircle size={20} style={{ color: consumptionTone.color }} /> : <ClipboardCheck size={20} style={{ color: consumptionTone.color }} />}
          <div>
            <strong style={{ color: consumptionTone.color }}>{operations.consumption.status === 'observed' ? '结果消费已观测' : operations.consumption.status === 'rejected' ? '结果反馈存在拒绝记录' : '结果消费尚未观测'}</strong>
            <p style={{ margin: '0.3rem 0 0', color: '#595959' }}>
              {operations.consumption.status === 'observed' ? `已记录 ${operations.consumption.feedback_count} 条反馈，覆盖 ${operations.consumption.consumed_runs} 个运行。` : '关闭、验证和证据存在都不等于业务消费，需要人工或业务系统显式提交回执。'}
            </p>
          </div>
        </div>
      </section>

      <section className="antd-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.75rem' }}>
          <Send size={18} style={{ color: 'var(--antd-primary, #1677ff)' }} />
          <h3 style={{ margin: 0 }}>人工结果反馈</h3>
          <span style={{ color: '#8c8c8c', fontSize: '0.78rem' }}>只记录回执，不改变 WorkflowRun 状态</span>
        </div>
        {operations.consumption.eligible_outcomes.length === 0 ? (
          <p style={{ color: '#8c8c8c', margin: 0 }}>当前没有带场景绑定的可反馈结果。先完成一个真实 WorkflowRun，再回来记录消费。</p>
        ) : (
          <form onSubmit={submitFeedback} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <label>结果
              <select value={form.outcomeId} onChange={(event) => updateForm('outcomeId', event.target.value)} required>
                <option value="">选择运行结果</option>
                {operations.consumption.eligible_outcomes.map((outcome) => <option key={outcome.outcome_id} value={outcome.outcome_id}>{outcome.workflow_run_id} · {outcome.state}</option>)}
              </select>
            </label>
            <label>消费状态
              <select value={form.state} onChange={(event) => updateForm('state', event.target.value)}>
                {FEEDBACK_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}
              </select>
            </label>
            <label>消费方引用
              <input value={form.consumerRef} onChange={(event) => updateForm('consumerRef', event.target.value)} required placeholder="operator://..." />
            </label>
            <label>结果引用
              <input value={form.resultRef} onChange={(event) => updateForm('resultRef', event.target.value)} placeholder="PR、文档或业务结果引用" />
            </label>
            <label>证据引用（逗号分隔）
              <input value={form.evidenceRefs} onChange={(event) => updateForm('evidenceRefs', event.target.value)} placeholder="evidence://..." />
            </label>
            <label>价值金额 / 单位
              <div style={{ display: 'flex', gap: '0.5rem' }}><input type="number" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} placeholder="金额" /><input value={form.unit} onChange={(event) => updateForm('unit', event.target.value)} placeholder="单位" /></div>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>复盘备注（仅存摘要，不存原文）
              <input value={form.note} onChange={(event) => updateForm('note', event.target.value)} placeholder="可选：结果如何被使用" />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button className="antd-btn antd-btn-primary" disabled={feedbackMutation.isPending} type="submit"><FileCheck2 size={14} /> {feedbackMutation.isPending ? '记录中...' : '记录反馈'}</button>
              {message && <span role="status" style={{ color: message.includes('失败') ? '#a8071a' : '#237804', fontSize: '0.85rem' }}>{message}</span>}
            </div>
          </form>
        )}
      </section>

      <section className="antd-card">
        <h3 style={{ margin: '0 0 0.75rem' }}>待复盘队列</h3>
        {operations.review_queue.length === 0 ? <p style={{ color: '#8c8c8c', margin: 0 }}>当前没有待复盘运行。</p> : operations.review_queue.map((item, index) => <div key={`${String(item.workflow_run_id)}-${index}`} style={{ borderTop: '1px solid #f0f0f0', padding: '0.75rem 0', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}><span>{String(item.workflow_run_id)}</span><span style={{ color: '#8c8c8c' }}>{String(item.next_action || item.state || 'review')}</span></div>)}
      </section>

      <section className="antd-card">
        <h3 style={{ margin: '0 0 0.75rem' }}>已记录反馈</h3>
        {operations.consumption.feedback.length === 0 ? <p style={{ color: '#8c8c8c', margin: 0 }}>尚无显式结果消费反馈。</p> : operations.consumption.feedback.map((item) => <div key={item.feedback_id} style={{ borderTop: '1px solid #f0f0f0', padding: '0.75rem 0', display: 'grid', gap: '0.2rem' }}><strong>{item.workflow_run_id} · {item.consumption_state}</strong><span style={{ color: '#595959', fontSize: '0.82rem' }}>{item.consumer_ref} · {item.result_ref || '无结果引用'} · {item.observed_at}</span></div>)}
      </section>
    </div>
  );
}
