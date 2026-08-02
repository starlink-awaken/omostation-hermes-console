import React, { useState } from 'react';
import { CheckCircle2, CircleSlash2, FileCheck2, LockKeyhole, RefreshCw, Wrench, XCircle } from 'lucide-react';
import {
  useExternalSceneTrialReview,
  useReviewExternalSceneTrial,
  type ExternalSceneTrialReviewAction,
  type ExternalSceneTrialReviewItem,
} from '../api/hooks';

const ACTION_LABELS: Record<ExternalSceneTrialReviewAction, string> = {
  continue: '继续试运行',
  request_changes: '要求补充',
  reject: '否决试运行',
};

function formatTime(value?: string | null): string {
  if (!value) return '无时间';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function TrialItem({
  item,
  onReview,
  pending,
}: {
  item: ExternalSceneTrialReviewItem;
  onReview: (item: ExternalSceneTrialReviewItem, action: ExternalSceneTrialReviewAction) => void;
  pending: boolean;
}) {
  return (
    <article style={{ border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 3 }}>
          <strong style={{ overflowWrap: 'anywhere' }}>{item.trial_id}</strong>
          <span style={{ color: '#666', fontSize: 12 }}>{item.scene_binding.scene_id} · {item.scene_binding.journey_id}</span>
        </div>
        <span style={{ color: item.latest_review ? '#389e0d' : '#ad6800', fontSize: 12, fontWeight: 600 }}>
          {item.latest_review ? `已评审：${ACTION_LABELS[item.latest_review.review_action]}` : '待评审'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#666', fontSize: 12 }}>
        <span>消费者 {item.consumer_ref}</span>
        <span>指标 {String(item.metric.metric_id || item.scene_binding.outcome_metric)}</span>
        <span>样本 ≥ {item.sample_plan.minimum_samples}</span>
        <span>窗口 {item.sample_plan.window_seconds}s</span>
        <span>证据 {item.evidence_refs.length} 条</span>
      </div>
      <span style={{ color: '#666', fontSize: 12 }}>
        观测 {formatTime(item.observed_at)} · catalog {item.catalog_observation_id} · activation: {item.activation}
      </span>
      {item.latest_review && (
        <span style={{ color: '#389e0d', fontSize: 12 }}>
          最近回执 {item.latest_review.feedback_id} · {formatTime(item.latest_review.recorded_at)}
        </span>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="antd-btn antd-btn-primary" disabled={pending} onClick={() => onReview(item, 'continue')} aria-label={`继续试运行 ${item.trial_id}`}>
          <CheckCircle2 size={14} /> {ACTION_LABELS.continue}
        </button>
        <button type="button" className="antd-btn" disabled={pending} onClick={() => onReview(item, 'request_changes')} aria-label={`要求补充 ${item.trial_id}`}>
          <Wrench size={14} /> {ACTION_LABELS.request_changes}
        </button>
        <button type="button" className="antd-btn" disabled={pending} onClick={() => onReview(item, 'reject')} aria-label={`否决试运行 ${item.trial_id}`}>
          <XCircle size={14} /> {ACTION_LABELS.reject}
        </button>
      </div>
    </article>
  );
}

export default function ExternalSceneTrialReviewPanel() {
  const review = useExternalSceneTrialReview();
  const mutation = useReviewExternalSceneTrial();
  const [reviewerRef, setReviewerRef] = useState('ref://cockpit/reviewer');
  const [reviewRef, setReviewRef] = useState('ref://cockpit/scene-trial-review');
  const [evidenceRefs, setEvidenceRefs] = useState('evidence://cockpit/scene-trial-review');

  const handleReview = (item: ExternalSceneTrialReviewItem, action: ExternalSceneTrialReviewAction) => {
    const refs = evidenceRefs.split(',').map((value) => value.trim()).filter(Boolean);
    if (!reviewerRef.trim() || !reviewRef.trim() || refs.length === 0) return;
    mutation.mutate({
      feedback_id: `scene-trial-review:${item.trial_id}:${action}`,
      trial_id: item.trial_id,
      review_action: action,
      evidence_refs: refs,
      reviewer_ref: reviewerRef.trim(),
      review_ref: reviewRef.trim(),
    });
  };

  const projection = review.data?.projection;
  const items = projection?.items ?? [];
  const summary = projection?.summary ?? { trial_count: 0, unreviewed_count: 0, reviewed_count: 0, review_actions: {} };
  return (
    <section className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }} aria-label="外部场景试运行审阅">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileCheck2 size={18} style={{ color: 'var(--antd-primary, #1677ff)' }} />
          <strong>场景试运行审阅</strong>
          <span style={{ color: '#ad6800', fontSize: 12, fontWeight: 600 }}><LockKeyhole size={13} /> proposal-only</span>
        </div>
        <button type="button" className="antd-btn" onClick={() => void review.refetch()} disabled={review.isFetching} aria-label="刷新外部场景试运行审阅">
          <RefreshCw size={14} className={review.isFetching ? 'spinning' : ''} /> 刷新
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <label>评审人引用<input className="antd-input" aria-label="试运行评审人引用" value={reviewerRef} onChange={(event) => setReviewerRef(event.target.value)} /></label>
        <label>评审依据引用<input className="antd-input" aria-label="试运行评审依据引用" value={reviewRef} onChange={(event) => setReviewRef(event.target.value)} /></label>
        <label>证据引用（逗号分隔）<input className="antd-input" aria-label="试运行证据引用" value={evidenceRefs} onChange={(event) => setEvidenceRefs(event.target.value)} /></label>
      </div>
      <span style={{ color: '#666', fontSize: 12 }}>仅提交脱敏引用和评审动作；不会创建 WorkflowRun、调用 provider 或激活连接。</span>
      {mutation.error && <span style={{ color: '#cf1322', fontSize: 12 }}>{mutation.error instanceof Error ? mutation.error.message : '试运行评审提交失败'}</span>}
      {review.isLoading && !projection && <span style={{ color: '#666', fontSize: 13 }}>正在读取受治理试运行...</span>}
      {review.error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#cf1322', fontSize: 13 }}>
          <span>{review.error instanceof Error ? review.error.message : '试运行审阅不可用'}</span>
          <button type="button" className="antd-btn" onClick={() => void review.refetch()} aria-label="重试读取外部场景试运行审阅"><RefreshCw size={14} /> 重试</button>
        </div>
      )}
      {projection && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#666', fontSize: 12 }}>
            <span>试运行 {summary.trial_count}</span>
            <span>待评审 {summary.unreviewed_count}</span>
            <span>已评审 {summary.reviewed_count}</span>
            <span>状态 {projection.status}</span>
          </div>
          {items.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: 13 }}><CircleSlash2 size={15} /> 尚无可审阅的试运行记录。</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((item) => <TrialItem key={item.trial_id} item={item} onReview={handleReview} pending={mutation.isPending} />)}
            </div>
          )}
          <span style={{ color: '#666', fontSize: 12 }}>{projection.next_action}</span>
        </>
      )}
    </section>
  );
}
