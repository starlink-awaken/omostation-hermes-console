import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileInput,
  LockKeyhole,
  PlayCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  useIntakeSceneCard,
  usePreflightSceneCard,
  type SceneCardCandidate,
  type SceneCardInput,
  type SceneCardIntakeResponse,
  type SceneCardPreflightResponse,
} from '../api/hooks';

type SceneCardForm = SceneCardInput;
type TextField = Exclude<keyof SceneCardForm, 'schema' | 'lifecycle' | 'activation' | 'sample_refs' | 'demand_evidence_refs' | 'activation_evidence_refs' | 'required_capabilities'>;

const TEXT_FIELDS: Array<{ key: TextField; label: string; multiline?: boolean }> = [
  { key: 'scene_id', label: '场景标识' },
  { key: 'journey_id', label: '用户旅程标识' },
  { key: 'goal', label: '业务目标', multiline: true },
  { key: 'trigger', label: '触发条件', multiline: true },
  { key: 'input_contract', label: '输入契约', multiline: true },
  { key: 'result_contract', label: '结果契约', multiline: true },
  { key: 'outcome_metric', label: '结果指标' },
  { key: 'consumer', label: '结果消费者' },
  { key: 'approver', label: '业务审批人' },
  { key: 'owner', label: '业务责任人' },
  { key: 'failure_cost', label: '失败代价', multiline: true },
  { key: 'data_classification', label: '数据分类' },
  { key: 'data_scope', label: '数据范围', multiline: true },
  { key: 'operator', label: '操作人' },
  { key: 'permission_ref', label: '权限引用' },
  { key: 'rollback_plan', label: '回滚方案', multiline: true },
  { key: 'opportunity_window', label: '需求证据或机会窗口', multiline: true },
];

const REF_FIELDS: Array<{ key: 'sample_refs' | 'demand_evidence_refs' | 'activation_evidence_refs' | 'required_capabilities'; label: string; placeholder: string }> = [
  { key: 'sample_refs', label: '脱敏样本引用', placeholder: 'sample://domain/example-1，每行一个，3-10 个' },
  { key: 'demand_evidence_refs', label: '需求证据引用', placeholder: 'evidence://domain/demand-1；没有时填写机会窗口' },
  { key: 'activation_evidence_refs', label: '激活证据引用', placeholder: 'evidence://domain/approval-1' },
  { key: 'required_capabilities', label: '所需能力标识', placeholder: 'source.search, method.summarize' },
];

function splitValues(value: string): string[] {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
}

function valuesText(values: string[]): string {
  return values.join('\n');
}

function initialForm(candidate?: SceneCardCandidate): SceneCardForm {
  return {
    schema: 'scene-card/v1',
    lifecycle: 'proposal_only',
    activation: 'forbidden',
    scene_id: candidate?.proposed_scene_id || '',
    journey_id: candidate?.proposed_journey_id || '',
    goal: '',
    trigger: '',
    input_contract: '',
    result_contract: '',
    outcome_metric: candidate?.outcome_metric_hint || '',
    consumer: '',
    approver: '',
    owner: '',
    failure_cost: '',
    data_classification: 'internal',
    data_scope: '',
    operator: 'human-under-review',
    permission_ref: '',
    rollback_plan: '',
    sample_refs: candidate?.sample_refs || [],
    demand_evidence_refs: candidate?.demand_evidence_refs || [],
    activation_evidence_refs: candidate?.activation_evidence_refs || [],
    required_capabilities: candidate?.capability_refs || [],
    opportunity_window: candidate?.opportunity_window || '',
  };
}

function resultTone(status?: string): string {
  if (status === 'ready_for_admission_preview') return '#389e0d';
  if (status === 'proposal_only') return '#1677ff';
  if (status === 'blocked') return '#ad6800';
  return '#cf1322';
}

export default function SceneCardIntakePanel({ candidate }: { candidate?: SceneCardCandidate }) {
  const [form, setForm] = useState<SceneCardForm>(() => initialForm(candidate));
  const [intake, setIntake] = useState<SceneCardIntakeResponse | undefined>();
  const [preflight, setPreflight] = useState<SceneCardPreflightResponse | undefined>();
  const intakeMutation = useIntakeSceneCard();
  const preflightMutation = usePreflightSceneCard();

  const selectedTitle = useMemo(() => candidate?.title || '新建业务场景', [candidate]);

  const updateText = (key: TextField, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setIntake(undefined);
    setPreflight(undefined);
  };

  const updateValues = (key: 'sample_refs' | 'demand_evidence_refs' | 'activation_evidence_refs' | 'required_capabilities', value: string) => {
    setForm((current) => ({ ...current, [key]: splitValues(value) }));
    setIntake(undefined);
    setPreflight(undefined);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    intakeMutation.mutate(form, {
      onSuccess: (result) => {
        setIntake(result);
        setPreflight(undefined);
      },
    });
  };

  const handlePreflight = () => {
    preflightMutation.mutate(form, { onSuccess: setPreflight });
  };

  const intakeProjection = intake?.projection;
  const preflightProjection = preflight?.projection;
  const canPreflight = intakeProjection?.status === 'proposal_only';

  return (
    <section className="antd-card" style={{ padding: 16, display: 'grid', gap: 16 }} aria-label="Scene Card 输入与只读预检">
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileInput size={20} style={{ color: 'var(--antd-primary, #1677ff)' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Scene Card 输入与只读预检</h3>
            <span style={{ color: '#389e0d', fontSize: 12, fontWeight: 600 }}><LockKeyhole size={13} /> proposal-only</span>
          </div>
          <span style={{ color: '#666', fontSize: 13 }}>当前对象：{selectedTitle}。提交只生成安全投影，不保存原文、不调用 provider。</span>
        </div>
        <span style={{ color: '#389e0d', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={14} /> activation: forbidden</span>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }} aria-label="Scene Card 业务输入表单">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {TEXT_FIELDS.map(({ key, label, multiline }) => (
            <label key={key} style={{ display: 'grid', gap: 5, gridColumn: multiline ? 'span 2' : undefined }}>
              <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
              {multiline ? (
                <textarea className="antd-input" aria-label={label} value={form[key] || ''} onChange={(event) => updateText(key, event.target.value)} rows={2} />
              ) : (
                <input className="antd-input" aria-label={label} value={form[key] || ''} onChange={(event) => updateText(key, event.target.value)} />
              )}
            </label>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {REF_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
              <textarea className="antd-input" aria-label={label} placeholder={placeholder} value={valuesText(form[key])} onChange={(event) => updateValues(key, event.target.value)} rows={3} />
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" className="antd-btn antd-btn-primary" disabled={intakeMutation.isPending} aria-label="提交 Scene Card 输入">
            <Send size={14} /> {intakeMutation.isPending ? '检查中...' : '提交输入闸门'}
          </button>
          <button type="button" className="antd-btn" disabled={!canPreflight || preflightMutation.isPending} onClick={handlePreflight} aria-label="运行 Scene Card 只读预检">
            <PlayCircle size={14} /> {preflightMutation.isPending ? '预检中...' : '运行只读预检'}
          </button>
          <span style={{ fontSize: 12, color: '#777' }}>生命周期和激活状态由系统固定为 proposal-only / forbidden。</span>
        </div>
      </form>

      {intakeMutation.error && <div style={{ color: 'var(--antd-error, #cf1322)', display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={15} /> {intakeMutation.error instanceof Error ? intakeMutation.error.message : '输入闸门不可用'}</div>}
      {intakeProjection && (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14, display: 'grid', gap: 8 }} aria-label="Scene Card 输入结果">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {intakeProjection.status === 'proposal_only' ? <CheckCircle2 size={16} style={{ color: resultTone(intakeProjection.status) }} /> : <AlertTriangle size={16} style={{ color: resultTone(intakeProjection.status) }} />}
            <strong style={{ color: resultTone(intakeProjection.status) }}>输入结果：{intakeProjection.status}</strong>
          </div>
          <span style={{ color: '#555', fontSize: 13 }}>下一步：{intakeProjection.next_action}</span>
          {intakeProjection.missing_fields.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{intakeProjection.missing_fields.map((field) => <span key={field} style={{ background: '#fff7e6', color: '#ad6800', border: '1px solid #ffd591', borderRadius: 4, padding: '3px 6px', fontSize: 11 }}>{field}</span>)}</div>}
          <span style={{ color: '#8c8c8c', fontSize: 11 }}>intake_id: {intakeProjection.intake_id} · persistence: none · activation: {intakeProjection.activation}</span>
        </div>
      )}

      {preflightMutation.error && <div style={{ color: 'var(--antd-error, #cf1322)', display: 'flex', gap: 6, alignItems: 'center' }}><AlertTriangle size={15} /> {preflightMutation.error instanceof Error ? preflightMutation.error.message : '只读预检不可用'}</div>}
      {preflightProjection && (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14, display: 'grid', gap: 8 }} aria-label="Scene Card 只读预检结果">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {preflightProjection.status === 'ready_for_admission_preview' ? <CheckCircle2 size={16} style={{ color: resultTone(preflightProjection.status) }} /> : <AlertTriangle size={16} style={{ color: resultTone(preflightProjection.status) }} />}
            <strong style={{ color: resultTone(preflightProjection.status) }}>预检结果：{preflightProjection.status}</strong>
          </div>
          <span style={{ color: '#555', fontSize: 13 }}>下一步：{preflightProjection.next_action}</span>
          {preflightProjection.missing_fields.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{preflightProjection.missing_fields.map((field) => <span key={field} style={{ background: '#fff7e6', color: '#ad6800', border: '1px solid #ffd591', borderRadius: 4, padding: '3px 6px', fontSize: 11 }}>{field}</span>)}</div>}
          {preflightProjection.capability_checks && <div style={{ display: 'grid', gap: 5 }}>{preflightProjection.capability_checks.map((check) => <div key={check.capability} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}><span>{check.capability}</span><strong style={{ color: resultTone(check.status) }}>{check.status}</strong></div>)}</div>}
          <span style={{ color: '#8c8c8c', fontSize: 11 }}>source: OMO governed observation · provider_called: false · workflow_created: false · activation: {preflightProjection.activation}</span>
        </div>
      )}
    </section>
  );
}
