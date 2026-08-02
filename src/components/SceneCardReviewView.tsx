import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  useReviewSceneCardCandidate,
  useSceneCardCandidates,
  type SceneCardReviewReceipt,
  type SceneCardReviewDecision,
} from '../api/hooks';
import SceneCardIntakePanel from './SceneCardIntakePanel';

const DECISIONS: Array<{ value: SceneCardReviewDecision; label: string }> = [
  { value: 'pending', label: '保留待审' },
  { value: 'request_evidence', label: '请求补证' },
  { value: 'reject', label: '拒绝候选' },
  { value: 'approve', label: '尝试确认' },
];

function decisionHint(decision: SceneCardReviewDecision): string {
  if (decision === 'approve') return '确认仍会被完整性闸门阻断，不会激活场景。';
  if (decision === 'request_evidence') return '只生成补证回执，等待业务样本和结果指标确认。';
  if (decision === 'reject') return '候选保留在非激活队列，不会删除发现证据。';
  return '只登记当前人工评审状态，不改变运行态。';
}

export default function SceneCardReviewView() {
  const { data, isLoading, error, refetch } = useSceneCardCandidates();
  const review = useReviewSceneCardCandidate();
  const candidates = useMemo(() => data?.projection.candidates ?? [], [data]);
  const [selectedId, setSelectedId] = useState('');
  const [decision, setDecision] = useState<SceneCardReviewDecision>('pending');
  const [reviewerRef, setReviewerRef] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<SceneCardReviewReceipt | undefined>(undefined);

  const selected = useMemo(
    () => candidates.find((candidate) => candidate.candidate_id === (selectedId || candidates[0]?.candidate_id)),
    [candidates, selectedId],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    review.mutate(
      { candidate_id: selected.candidate_id, decision, reviewer_ref: reviewerRef, note },
      { onSuccess: (result) => setReceipt(result.receipt) },
    );
  };

  if (isLoading && !data) {
    return <div className="antd-card" style={{ padding: 24 }}>正在加载候选投影...</div>;
  }

  if (error || !data) {
    const message = error instanceof Error ? error.message : '候选投影不可用';
    return (
      <section className="antd-card" style={{ padding: 24, display: 'grid', gap: 12 }} aria-label="场景卡评审不可用">
        <AlertTriangle size={28} style={{ color: 'var(--antd-error, #cf1322)' }} />
        <strong>{message}</strong>
        <span style={{ color: '#666' }}>系统不会在没有候选事实时伪造可评审状态。</span>
        <button type="button" className="antd-btn" onClick={() => void refetch()} aria-label="重试加载场景卡候选">
          <RefreshCw size={14} /> 重试
        </button>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 16, padding: '1rem 0' }} aria-label="场景卡候选评审">
      <header className="antd-card" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck2 size={22} style={{ color: 'var(--antd-primary, #1677ff)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Scene Card 场景卡评审</h2>
            <span style={{ color: '#389e0d', fontSize: 12, fontWeight: 600 }}><LockKeyhole size={13} /> 仅提案</span>
          </div>
          <span style={{ color: '#666', fontSize: 13 }}>把业务机会转成可复核候选，完整性和业务确认完成前始终禁止激活。</span>
        </div>
        <button type="button" className="antd-btn" onClick={() => void refetch()} disabled={isLoading} aria-label="刷新场景卡候选">
          <RefreshCw size={14} className={isLoading ? 'spinning' : ''} /> 刷新
        </button>
      </header>

      <SceneCardIntakePanel key={selected?.candidate_id || 'new-scene-card'} candidate={selected} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(0, 1.6fr)', gap: 16, alignItems: 'start' }}>
        <div className="antd-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>候选队列</strong>
            <span style={{ color: '#666', fontSize: 12 }}>{data.projection.summary.candidate_count} 条</span>
          </div>
          {candidates.map((candidate) => {
            const active = candidate.candidate_id === (selectedId || candidates[0]?.candidate_id);
            return (
              <button
                type="button"
                key={candidate.candidate_id}
                onClick={() => { setSelectedId(candidate.candidate_id); setReceipt(undefined); }}
                aria-label={`选择候选 ${candidate.title}`}
                style={{ textAlign: 'left', border: active ? '1px solid var(--antd-primary, #1677ff)' : '1px solid #e8e8e8', background: active ? '#f0f7ff' : '#fff', padding: 12, borderRadius: 6, cursor: 'pointer' }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>{candidate.title}</strong>
                <span style={{ display: 'block', color: '#666', fontSize: 12 }}>{candidate.outcome_metric_hint || '待补结果指标'}</span>
                <span style={{ display: 'block', color: '#8c8c8c', fontSize: 11, marginTop: 6 }}>{candidate.missing_activation_fields.length} 项待补</span>
              </button>
            );
          })}
          {candidates.length === 0 && <span style={{ color: '#666' }}>暂无可供人工消费的候选。</span>}
        </div>

        {selected && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>候选标识</span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem' }}>{selected.title}</h3>
                </div>
                <span style={{ color: '#389e0d', fontSize: 12, fontWeight: 600 }}><ShieldCheck size={13} /> activation: forbidden</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <div><small>场景</small><div>{selected.proposed_scene_id || '待业务确认'}</div></div>
                <div><small>旅程</small><div>{selected.proposed_journey_id || '待业务确认'}</div></div>
                <div><small>指标提示</small><div>{selected.outcome_metric_hint || '待补'}</div></div>
                <div><small>发现来源</small><div>{selected.discovery_source}</div></div>
              </div>
              <div>
                <small>安全观察</small>
                <ul style={{ margin: '6px 0 0', paddingLeft: 20, color: '#444' }}>{selected.safe_observations.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <small>待补字段</small>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{selected.missing_activation_fields.map((field) => <span key={field} style={{ background: '#fff7e6', color: '#ad6800', border: '1px solid #ffd591', borderRadius: 4, padding: '3px 6px', fontSize: 11 }}>{field}</span>)}</div>
              </div>
            </div>

            <form className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }} onSubmit={handleSubmit} aria-label="提交场景卡评审">
              <strong>人工评审</strong>
              <label>评审人引用<input className="antd-input" aria-label="评审人引用" value={reviewerRef} onChange={(event) => setReviewerRef(event.target.value)} placeholder="business://owner" /></label>
              <label>决策<select className="antd-input" aria-label="场景卡评审决策" value={decision} onChange={(event) => setDecision(event.target.value as SceneCardReviewDecision)}>{DECISIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label>评审备注<textarea className="antd-input" aria-label="场景卡评审备注" value={note} onChange={(event) => setNote(event.target.value)} placeholder="只写必要的判断或补证要求；返回面只保留摘要哈希。" style={{ minHeight: 84, resize: 'vertical' }} /></label>
              <span style={{ color: '#666', fontSize: 12 }}>{decisionHint(decision)}</span>
              <button type="submit" className="antd-btn antd-btn-primary" disabled={review.isPending || !selected} aria-label="提交场景卡评审">
                <Send size={14} /> {review.isPending ? '提交中...' : '提交评审'}
              </button>
              {review.error && <span style={{ color: 'var(--antd-error, #cf1322)' }}>{review.error instanceof Error ? review.error.message : '评审提交失败'}</span>}
            </form>

            {receipt && (
              <div className="antd-card" style={{ padding: 16, display: 'grid', gap: 8, borderLeft: '3px solid #389e0d' }} aria-label="场景卡评审回执">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><CheckCircle2 size={16} style={{ color: '#389e0d' }} /><strong>评审回执：{receipt.status}</strong></div>
                <div style={{ color: '#555' }}>原因：{receipt.reason}；下一步：{receipt.next_action}</div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>review_id: {receipt.review_id} · note_digest: {receipt.note_digest || 'none'} · activation: {receipt.activation}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
