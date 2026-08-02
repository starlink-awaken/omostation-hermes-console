import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { apiPost, API_ENDPOINTS, useKosSearch, useKnowledgeActionOperations, useRecordKnowledgeAction, useRequestTaskWorkflow, type KnowledgeActionInput, type KnowledgeActionRef, type WorkflowRequestInput } from '../api';
import { openCockpitNavigationTarget } from './cockpitNavigation';

const DEFAULT_FORM = {
  title: '',
  description: '',
  sceneId: 'engineering-delivery',
  journeyId: 'knowledge-to-action',
  outcomeMetric: 'task_adoption_rate',
  priority: 'medium',
  riskLevel: 'L1',
};

function asRef(id: string, title: string, rank: number): KnowledgeActionRef {
  return { ref: `kos:${id}`, title, source_type: 'kos', rank };
}

export default function KnowledgeActionView() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [receiptWarning, setReceiptWarning] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<{ input: KnowledgeActionInput; taskId: string } | null>(null);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('knowledge-to-action');
  const [evidencePlan, setEvidencePlan] = useState('结果摘要\n人工复核回执');
  const [pendingWorkflowReceipt, setPendingWorkflowReceipt] = useState<{ input: KnowledgeActionInput; taskId: string; workflowRunId: string } | null>(null);
  const [requestedWorkflowRunId, setRequestedWorkflowRunId] = useState<string | null>(null);
  const search = useKosSearch(searchQuery, 8);
  const operations = useKnowledgeActionOperations(form.sceneId);
  const receipt = useRecordKnowledgeAction();
  const workflowRequest = useRequestTaskWorkflow();
  const selectedRefs = useMemo(
    () => (search.data?.data?.results || [])
      .filter((item) => selected.includes(item.id))
      .map((item, index) => asRef(item.id, item.title, index + 1)),
    [search.data, selected],
  );

  const update = (field: keyof typeof DEFAULT_FORM, value: string) => {
    setMessage(null);
    setReceiptWarning(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchQuery(query.trim());
    setSelected([]);
    setMessage(null);
  };

  const persistReceipt = async (input: KnowledgeActionInput, taskId: string) => {
    try {
      const receiptResult = await receipt.mutateAsync(input);
      if (!receiptResult.ok || !receiptResult.data?.ok) {
        setPendingReceipt({ input, taskId });
        setReceiptWarning(true);
        setMessage(`任务 ${taskId} 已创建，但行动回执未记录；可以重试回执。`);
        return false;
      }
    } catch (error) {
      setPendingReceipt({ input, taskId });
      setReceiptWarning(true);
      setMessage(`任务 ${taskId} 已创建，但行动回执未记录：${error instanceof Error ? error.message : '请求失败'}`);
      return false;
    }
    setPendingReceipt(null);
    setReceiptWarning(false);
    setMessage(`任务 ${taskId} 已创建，并已记录知识到行动回执；请确认后再请求 Workflow。`);
    return true;
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedRefs.length === 0) {
      setMessage('至少选择一条知识引用后再创建任务。');
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      setMessage('请填写任务标题和任务说明。');
      return;
    }
    if (!form.sceneId.trim() || !form.journeyId.trim() || !form.outcomeMetric.trim()) {
      setMessage('场景、旅程和结果指标必须完整，才能进入可追踪闭环。');
      return;
    }
    setMessage(null);
    setReceiptWarning(false);
    const taskResult = await apiPost<{ id: string; title: string; knowledge_refs?: string[] }>(API_ENDPOINTS.tasks.createTask, {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      risk_level: form.riskLevel,
      knowledge_refs: selectedRefs.map((item) => item.ref),
    });
    if (!taskResult.ok || !taskResult.data?.id) {
      setMessage(taskResult.error || '任务创建失败，未写入行动回执。');
      return;
    }
    setCreatedTaskId(taskResult.data.id);
    await persistReceipt({
      action_kind: 'task_created',
      query,
      knowledge_refs: selectedRefs,
      scene_binding: {
        scene_id: form.sceneId.trim(),
        journey_id: form.journeyId.trim(),
        outcome_metric: form.outcomeMetric.trim(),
      },
      task_ref: taskResult.data.id,
      actor_ref: 'cockpit-ui://knowledge-action',
    }, taskResult.data.id);
  };

  const persistWorkflowReceipt = async (input: KnowledgeActionInput, taskId: string, workflowRunId: string) => {
    try {
      const receiptResult = await receipt.mutateAsync(input);
      if (!receiptResult.ok || !receiptResult.data?.ok) {
        setPendingWorkflowReceipt({ input, taskId, workflowRunId });
        setReceiptWarning(true);
        setMessage(`Workflow ${workflowRunId} 已请求，但工作流行动回执未记录；可以重试回执。`);
        return false;
      }
    } catch (error) {
      setPendingWorkflowReceipt({ input, taskId, workflowRunId });
      setReceiptWarning(true);
      setMessage(`Workflow ${workflowRunId} 已请求，但工作流行动回执未记录：${error instanceof Error ? error.message : '请求失败'}`);
      return false;
    }
    setPendingWorkflowReceipt(null);
    setReceiptWarning(false);
    return true;
  };

  const requestWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createdTaskId) return;
    const input: WorkflowRequestInput = {
      workflow_name: workflowName.trim(),
      scene_binding: {
        scene_id: form.sceneId.trim(),
        journey_id: form.journeyId.trim(),
        outcome_metric: form.outcomeMetric.trim(),
      },
      evidence_plan: evidencePlan.split('\n').map((item) => item.trim()).filter(Boolean),
      operation_level: form.riskLevel,
      actor_ref: 'cockpit-ui://knowledge-action',
    };
    if (!input.workflow_name || input.evidence_plan.length === 0) {
      setMessage('工作流名称和至少一项证据计划不能为空。');
      return;
    }
    setMessage(null);
    setReceiptWarning(false);
    try {
      const result = await workflowRequest.mutateAsync({ taskId: createdTaskId, input });
      if (!result.ok || !result.data?.workflow_run_id) {
        setMessage(result.error || 'Workflow 请求未被接受。');
        return;
      }
      const workflowRunId = result.data.workflow_run_id;
      setRequestedWorkflowRunId(workflowRunId);
      const receiptInput: KnowledgeActionInput = {
        action_kind: 'workflow_requested',
        query: query || form.title,
        knowledge_refs: selectedRefs,
        scene_binding: input.scene_binding,
        task_ref: createdTaskId,
        workflow_run_id: workflowRunId,
        actor_ref: 'cockpit-ui://knowledge-action',
      };
      if (await persistWorkflowReceipt(receiptInput, createdTaskId, workflowRunId)) {
        setMessage(`Workflow ${workflowRunId} 已记录为${result.data.request_state === 'approval_required' ? '待审批请求' : '可进入准入评估的请求'}，未启动 worker。`);
        openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: createdTaskId });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Workflow 请求失败。');
    }
  };

  const liveOperations = operations.data?.data?.operations;
  const results = search.data?.data?.results || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
      <header className="antd-card" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BookOpen size={22} style={{ color: 'var(--antd-primary, #1677ff)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>知识到行动</h2>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: '#666', fontSize: '0.85rem' }}>把可追溯的知识引用承接为受治理任务，再由 Workflow Mesh 继续推进。</p>
          <p style={{ margin: '0.35rem 0 0', color: '#8c8c8c', fontSize: '0.78rem' }}>只保存引用和哈希，不保存知识原文；外部系统不会被自动触达。</p>
        </div>
        <button className="antd-btn" type="button" onClick={() => { void operations.refetch(); }} title="刷新行动运营投影">
          <RefreshCw size={14} /> 刷新投影
        </button>
      </header>

      <section className="antd-card" style={{ padding: '1rem' }}>
        <form onSubmit={runSearch} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <label htmlFor="knowledge-action-query" style={{ width: '100%', fontWeight: 600 }}>检索知识</label>
          <input id="knowledge-action-query" className="antd-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入问题或缺口" style={{ flex: '1 1 280px' }} />
          <button className="antd-btn antd-btn-primary" type="submit" disabled={query.trim().length < 2}>
            <Search size={14} /> 检索
          </button>
        </form>
        {search.isLoading && <p>正在检索...</p>}
        {search.error && <p style={{ color: '#a8071a' }}>检索不可用：{search.error.message}</p>}
        {searchQuery && !search.isLoading && results.length === 0 && <p style={{ color: '#8c8c8c' }}>没有可引用的知识结果。</p>}
        {results.length > 0 && (
          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '1rem' }}>
            {results.map((item, index) => (
              <label key={item.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', border: '1px solid #f0f0f0', padding: '0.7rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                <span><strong>{item.title || `知识结果 ${index + 1}`}</strong><br /><small style={{ color: '#8c8c8c' }}>{item.id} · 引用时只发送这个标识</small></span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="antd-card" style={{ padding: '1rem' }}>
        <form onSubmit={createTask} style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} /><strong>承接为受治理任务</strong></div>
          <input className="antd-input" aria-label="任务标题" value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="任务标题" />
          <textarea className="antd-input" aria-label="任务说明" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="任务说明与预期证据" rows={4} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
            <input className="antd-input" aria-label="场景" value={form.sceneId} onChange={(event) => update('sceneId', event.target.value)} placeholder="场景" />
            <input className="antd-input" aria-label="旅程" value={form.journeyId} onChange={(event) => update('journeyId', event.target.value)} placeholder="旅程" />
            <input className="antd-input" aria-label="结果指标" value={form.outcomeMetric} onChange={(event) => update('outcomeMetric', event.target.value)} placeholder="结果指标" />
            <select className="antd-input" aria-label="优先级" value={form.priority} onChange={(event) => update('priority', event.target.value)}><option value="low">低优先级</option><option value="medium">中优先级</option><option value="high">高优先级</option><option value="critical">紧急</option></select>
            <select className="antd-input" aria-label="风险等级" value={form.riskLevel} onChange={(event) => update('riskLevel', event.target.value)}><option value="L0">L0</option><option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option></select>
          </div>
          <button className="antd-btn antd-btn-primary" type="submit" disabled={receipt.isPending}><ArrowRight size={14} /> 创建任务并记录回执</button>
        </form>
        {pendingReceipt && <button className="antd-btn" type="button" onClick={() => { void persistReceipt(pendingReceipt.input, pendingReceipt.taskId); }} disabled={receipt.isPending}>重试行动回执</button>}
        {message && <p role="status" style={{ color: receiptWarning ? '#a8071a' : '#237804', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>{receiptWarning ? <ShieldAlert size={15} /> : <CheckCircle2 size={15} />} {message}</p>}
      </section>

      {createdTaskId && (
        <section className="antd-card" style={{ padding: '1rem' }}>
          <form onSubmit={requestWorkflow} style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} /><strong>请求进入 Workflow Mesh</strong></div>
            <small style={{ color: '#8c8c8c' }}>任务 {createdTaskId} 已落在 planned 队列；此操作只记录 WorkflowRequested，不启动 worker，也不触达外部系统。</small>
            <input className="antd-input" aria-label="工作流名称" value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} placeholder="工作流名称" />
            <textarea className="antd-input" aria-label="证据计划" value={evidencePlan} onChange={(event) => setEvidencePlan(event.target.value)} placeholder="每行一项证据计划" rows={3} />
            <button className="antd-btn antd-btn-primary" type="submit" disabled={workflowRequest.isPending || receipt.isPending}><ArrowRight size={14} /> 请求 Workflow（人工确认后准入）</button>
          </form>
          {pendingWorkflowReceipt && <button className="antd-btn" type="button" onClick={() => { void persistWorkflowReceipt(pendingWorkflowReceipt.input, pendingWorkflowReceipt.taskId, pendingWorkflowReceipt.workflowRunId); }} disabled={receipt.isPending}>重试工作流行动回执</button>}
          {requestedWorkflowRunId && <div role="status" style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #d9d9d9', background: '#fafafa' }}>
            <strong>准入状态：已请求，等待真实门禁</strong>
            <p style={{ margin: '0.35rem 0', color: '#666', fontSize: '0.82rem' }}>运行 {requestedWorkflowRunId} 仍需审批、能力健康和预算检查；没有真实健康快照时不会显示可执行，也不会启动 worker。</p>
            <button className="antd-btn" type="button" onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: createdTaskId })}>去任务中心继续评估</button>
          </div>}
        </section>
      )}

      <section className="antd-card" style={{ padding: '1rem' }}>
        <strong>行动漏斗</strong>
        {operations.isLoading && <p>正在读取行动投影...</p>}
        {operations.error && <p style={{ color: '#a8071a' }}>行动投影不可用：{operations.error.message}</p>}
        {liveOperations && <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <span>检索 {liveOperations.funnel.retrieved}</span><span>引用 {liveOperations.funnel.cited}</span><span>任务 {liveOperations.funnel.task_created}</span><span>工作流 {liveOperations.funnel.workflow_requested}</span><span>结果回执 {liveOperations.funnel.result_feedback_recorded}</span>
        </div>}
      </section>
    </div>
  );
}
