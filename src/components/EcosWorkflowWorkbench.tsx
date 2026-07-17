import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FlaskConical, GitBranch, Loader2, Play, RefreshCw, ShieldAlert } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

type Workflow = {
  name: string;
  display?: string;
  id?: string;
  domain?: string;
  layer?: string;
  subtype?: string;
};

type JsonValue = Record<string, unknown>;
type RetryOperation = 'catalog' | 'inspect' | 'test' | 'dry-run' | 'queue';

const EMPTY: JsonValue = {};

type EcosWorkflowWorkbenchProps = {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

async function fetchJson(url: string, init?: RequestInit): Promise<JsonValue> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.detail === 'string'
      ? data.detail
      : typeof data.error === 'string'
        ? data.error
        : `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  if (typeof data.error === 'string' && data.error) throw new Error(data.error);
  return data;
}

function resultText(value: unknown) {
  return value === undefined ? '无结果' : JSON.stringify(value, null, 2);
}

export default function EcosWorkflowWorkbench({ onNavigate, onOpenTarget }: EcosWorkflowWorkbenchProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [detail, setDetail] = useState<JsonValue | null>(null);
  const [validation, setValidation] = useState<JsonValue | null>(null);
  const [runResult, setRunResult] = useState<JsonValue | null>(null);
  const [backends, setBackends] = useState<JsonValue[]>([]);
  const [actions, setActions] = useState<JsonValue[]>([]);
  const [logs, setLogs] = useState<JsonValue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [lastRunMode, setLastRunMode] = useState<'test' | 'dry_run'>('test');
  const [queueResult, setQueueResult] = useState<JsonValue | null>(null);
  const [retryOperation, setRetryOperation] = useState<RetryOperation>('catalog');

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.name === selectedName) || null,
    [selectedName, workflows],
  );

  const loadCatalog = async () => {
    setLoading('catalog');
    setRetryOperation('catalog');
    setError(null);
    try {
      const [catalog, backendPayload, actionPayload, logsPayload] = await Promise.all([
        fetchJson('/api/ecos/workflow/list'),
        fetchJson('/api/ecos/workflow/backends'),
        fetchJson('/api/ecos/workflow/actions'),
        fetchJson('/api/ecos/workflow/logs?recent=8'),
      ]);
      const nextWorkflows = Array.isArray(catalog.workflows) ? catalog.workflows as Workflow[] : [];
      setWorkflows(nextWorkflows);
      setBackends(Array.isArray(backendPayload.backends) ? backendPayload.backends as JsonValue[] : []);
      setActions(Array.isArray(actionPayload.actions) ? actionPayload.actions as JsonValue[] : []);
      setLogs(Array.isArray(logsPayload.runs) ? logsPayload.runs as JsonValue[] : []);
      setSelectedName((current) => current || nextWorkflows[0]?.name || '');
    } catch (reason) {
      setError(`工作流目录不可用：${reason instanceof Error ? reason.message : '未知错误'}`);
    } finally {
      setLoading(null);
    }
  };

  const inspectWorkflow = async (name: string) => {
    if (!name) return;
    setLoading('inspect');
    setRetryOperation('inspect');
    setError(null);
    setDetail(null);
    setValidation(null);
    try {
      const [definition, verdict] = await Promise.all([
        fetchJson(`/api/ecos/workflow/describe/${encodeURIComponent(name)}`),
        fetchJson(`/api/ecos/workflow/validate/${encodeURIComponent(name)}`),
      ]);
      setDetail(definition);
      setValidation(verdict);
    } catch (reason) {
      setError(`工作流检查失败：${reason instanceof Error ? reason.message : '未知错误'}`);
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => { void loadCatalog(); }, []);
  useEffect(() => { if (selectedName) void inspectWorkflow(selectedName); }, [selectedName]);

  const testWorkflow = async (dryRun: boolean) => {
    if (!selectedName) return;
    setLoading(dryRun ? 'dry-run' : 'test');
    setRetryOperation(dryRun ? 'dry-run' : 'test');
    setError(null);
    try {
      const endpoint = dryRun
        ? `/api/ecos/workflow/run?name=${encodeURIComponent(selectedName)}&dry_run=true`
        : `/api/ecos/workflow/test?name=${encodeURIComponent(selectedName)}`;
      setRunResult(await fetchJson(endpoint, { method: 'POST' }));
      setLastRunMode(dryRun ? 'dry_run' : 'test');
      setQueueResult(null);
    } catch (reason) {
      setError(`${dryRun ? '干跑' : '模拟测试'}失败：${reason instanceof Error ? reason.message : '未知错误'}`);
    } finally {
      setLoading(null);
    }
  };

  const queueVerification = async () => {
    if (!selectedName) return;
    setLoading('queue');
    setRetryOperation('queue');
    setError(null);
    try {
      const queued = await fetchJson(
        `/api/cockpit/ecos/workflows/${encodeURIComponent(selectedName)}/queue?mode=${lastRunMode}`,
        { method: 'POST' },
      );
      setQueueResult(queued);
      if (typeof queued.id === 'string') {
        openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: queued.id }, onNavigate, onOpenTarget);
      }
    } catch (reason) {
      setError(`验证任务承接失败：${reason instanceof Error ? reason.message : '未知错误'}`);
    } finally {
      setLoading(null);
    }
  };

  const retryFailedAction = () => {
    switch (retryOperation) {
      case 'inspect':
        void inspectWorkflow(selectedName);
        break;
      case 'test':
        void testWorkflow(false);
        break;
      case 'dry-run':
        void testWorkflow(true);
        break;
      case 'queue':
        void queueVerification();
        break;
      default:
        void loadCatalog();
    }
  };

  const retryLabel = {
    catalog: '重试目录',
    inspect: '重试校验',
    test: '重试模拟测试',
    'dry-run': '重试 Dry-run',
    queue: '重试任务承接',
  }[retryOperation];

  return (
    <section className="services-section" role="region" aria-label="eCOS工作流验证台">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>eCOS 工作流验证台</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>把工作流定义、约束校验、模拟测试和干跑证据收进同一个协议入口。</p>
        </div>
        <button type="button" className="antd-btn" onClick={() => void loadCatalog()} disabled={loading === 'catalog'} aria-label="刷新eCOS工作流目录">
          {loading === 'catalog' ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />} 刷新目录
        </button>
      </div>

      {error && <div className="error-banner" role="alert"><ShieldAlert size={16} /> <span>{error}</span><button type="button" className="antd-btn" onClick={retryFailedAction}>{retryLabel}</button></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 0.8fr) minmax(0, 1.8fr)', gap: 16 }}>
        <div className="antd-card" style={{ padding: 16, display: 'grid', gap: 10, alignContent: 'start' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><GitBranch size={16} /><strong>工作流目录</strong><span className="status-badge online">{workflows.length}</span></div>
          <select className="antd-input" aria-label="选择eCOS工作流" value={selectedName} onChange={(event) => setSelectedName(event.target.value)}>
            <option value="">请选择工作流</option>
            {workflows.map((workflow) => <option value={workflow.name} key={workflow.name}>{workflow.display || workflow.name}</option>)}
          </select>
          {selectedWorkflow && <div className="text-muted" style={{ display: 'grid', gap: 4, fontSize: 12 }}><span>{selectedWorkflow.name}</span><span>{selectedWorkflow.layer || '未分层'} · {selectedWorkflow.subtype || '未分类'} · {selectedWorkflow.domain || '未标域'}</span></div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge online">后端 {backends.length}</span>
            <span className="status-badge online">动作 {actions.length}</span>
          </div>
          <small className="text-muted">当前只提供模拟测试和 dry-run；真实执行仍需走受控治理入口。</small>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="antd-btn" onClick={() => void inspectWorkflow(selectedName)} disabled={!selectedName || loading === 'inspect'}>{loading === 'inspect' ? <Loader2 size={14} className="spinner" /> : <ClipboardCheck size={14} />} 重新校验</button>
            <button type="button" className="antd-btn antd-btn-primary" onClick={() => void testWorkflow(false)} disabled={!selectedName || loading === 'test'}>{loading === 'test' ? <Loader2 size={14} className="spinner" /> : <FlaskConical size={14} />} 模拟测试</button>
            <button type="button" className="antd-btn" onClick={() => void testWorkflow(true)} disabled={!selectedName || loading === 'dry-run'}>{loading === 'dry-run' ? <Loader2 size={14} className="spinner" /> : <Play size={14} />} Dry-run</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <article className="antd-card" style={{ padding: 14 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{validation?.valid === true ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}<strong>约束校验</strong></div><pre style={{ margin: '10px 0 0', maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11 }}>{resultText(validation || EMPTY)}</pre></article>
            <article className="antd-card" style={{ padding: 14 }}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><GitBranch size={15} /><strong>工作流定义</strong></div><pre style={{ margin: '10px 0 0', maxHeight: 180, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11 }}>{resultText(detail || EMPTY)}</pre></article>
          </div>
          {runResult && <article className="antd-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>最近验证结果</strong>
              <button type="button" className="antd-btn" onClick={() => void queueVerification()} disabled={loading === 'queue'}>
                {loading === 'queue' ? <Loader2 size={14} className="spinner" /> : <ClipboardCheck size={14} />}
                承接到任务中心
              </button>
            </div>
            <pre style={{ margin: '10px 0 0', maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 11 }}>{resultText(runResult)}</pre>
            {queueResult && <div className="shell-data-banner" role="status" style={{ marginTop: 10 }}>{resultText(queueResult)}</div>}
          </article>}
          <article className="antd-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ClipboardCheck size={15} /><strong>历史运行证据</strong><span className="status-badge online">{logs.length}</span></div>
            {logs.length === 0 ? <p className="text-muted" style={{ margin: '10px 0 0' }}>暂无 eCOS 运行日志。</p> : <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{logs.slice(0, 5).map((log, index) => <div key={`${String(log.workflow_id ?? log.name ?? 'run')}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}><span>{String(log.name ?? log.workflow_id ?? '未命名运行')}</span><span className="text-muted">{String(log.status ?? 'unknown')} · {String(log.generated_at ?? '无时间')}</span></div>)}</div>}
          </article>
        </div>
      </div>
    </section>
  );
}
