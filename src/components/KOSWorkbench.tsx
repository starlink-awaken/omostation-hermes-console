import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardList, Database, Loader2, Network, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

type JsonRecord = Record<string, unknown>;

type KOSState = {
  health: JsonRecord | null;
  stats: JsonRecord | null;
  healthError: string | null;
  statsError: string | null;
};

function errorMessage(data: JsonRecord, fallback: string) {
  const detail = data.detail ?? data.error ?? data.message;
  return typeof detail === 'string' ? detail : fallback;
}

function asResults(data: unknown): JsonRecord[] {
  if (Array.isArray(data)) return data.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object'));
  if (!data || typeof data !== 'object') return [];
  const record = data as JsonRecord;
  for (const key of ['results', 'items', 'documents', 'data']) {
    if (Array.isArray(record[key])) return asResults(record[key]);
  }
  return [];
}

function displayValue(value: unknown, fallback = '未提供') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(errorMessage(data, `${response.status} ${response.statusText}`));
  return data;
}

function fetchJson(url: string, init?: RequestInit) {
  if (typeof window.fetch !== 'function') return Promise.reject(new Error('当前环境未提供 fetch'));
  return Promise.resolve(window.fetch(url, init)).then(readJson);
}

interface KOSWorkbenchProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  initialQuery?: string;
}

export default function KOSWorkbench({ onNavigate, onOpenTarget, initialQuery }: KOSWorkbenchProps) {
  const [state, setState] = useState<KOSState>({ health: null, stats: null, healthError: null, statsError: null });
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<JsonRecord[]>([]);
  const [context, setContext] = useState<JsonRecord | null>(null);
  const [clusters, setClusters] = useState<JsonRecord | null>(null);
  const [claim, setClaim] = useState('');
  const [verifyResult, setVerifyResult] = useState<JsonRecord | null>(null);
  const [writeSlug, setWriteSlug] = useState('');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeTags, setWriteTags] = useState('');
  const [writeNotice, setWriteNotice] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);

  const hasEvidence = results.length > 0 || Boolean(context || clusters || verifyResult);

  const createEvidenceTask = async () => {
    if (!hasEvidence || taskPending) return;
    const subject = claim.trim() || query.trim() || 'KOS 知识证据';
    setTaskPending(true);
    setTaskNotice(null);
    setError(null);
    try {
      const evidence = JSON.stringify({ query: query.trim(), claim: claim.trim(), results, context, clusters, verifyResult }, null, 2).slice(0, 6000);
      const response = await fetchJson('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `KOS 证据治理：${subject}`,
          description: `基于 KOS 检索或声明校验结果，核对知识证据、关联对象和后续执行动作。\n\n原始摘要：\n${evidence}`,
          priority: verifyResult ? 'high' : 'medium',
          risk_level: 'L1',
          evidence_required: ['KOS 原始响应', '关联知识对象确认', '后续执行结果', 'task closeout'],
        }),
      }) as JsonRecord;
      const taskId = typeof response.id === 'string' ? response.id : '';
      if (!taskId) throw new Error('任务服务没有返回任务 ID');
      setTaskNotice(`KOS 证据已登记为任务：${taskId}`);
      openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: taskId }, onNavigate, onOpenTarget);
    } catch (reason) {
      setError(`KOS 证据任务登记失败：${reason instanceof Error ? reason.message : '未知错误'}`);
    } finally {
      setTaskPending(false);
    }
  };

  const loadStatus = async () => {
    setLoading('status');
    const [health, stats] = await Promise.allSettled([
      fetchJson('/api/kos/health'),
      fetchJson('/api/kos/stats'),
    ]);
    setState({
      health: health.status === 'fulfilled' ? health.value : null,
      stats: stats.status === 'fulfilled' ? stats.value : null,
      healthError: health.status === 'rejected' ? health.reason.message : null,
      statsError: stats.status === 'rejected' ? stats.reason.message : null,
    });
    setLoading(null);
  };

  // 异步状态探测在 effect 内启动，结果在异步回调中写回。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadStatus(); }, []);

  useEffect(() => {
    const prefix = query.trim();
    if (!prefix) {
      // 清空上一次异步建议，避免旧查询继续显示。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      fetchJson(`/api/kos/suggest?prefix=${encodeURIComponent(prefix)}&limit=6`)
        .then((data) => setSuggestions(asResults(data).map((item) => displayValue(item.text ?? item.title ?? item.value, '')).filter(Boolean)))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const healthChecks = useMemo(() => {
    const checks = state.health?.checks;
    return checks && typeof checks === 'object' ? Object.entries(checks as JsonRecord) : [];
  }, [state.health]);
  const healthDegraded = healthChecks.some(([, value]) => typeof value === 'object' && value !== null && (value as JsonRecord).status !== 'pass');

  const runQuery = async (action: 'search' | 'context' | 'clusters', requestedQuery = query) => {
    const normalizedQuery = requestedQuery.trim();
    if (!normalizedQuery) return;
    setLoading(action); setError(null);
    try {
      const data = await fetchJson(`/api/kos/${action}?q=${encodeURIComponent(normalizedQuery)}&limit=8`);
      if (action === 'search') setResults(asResults(data));
      if (action === 'context') setContext(data);
      if (action === 'clusters') setClusters(data);
    } catch (reason) { setError(`${action} 失败：${reason instanceof Error ? reason.message : '未知错误'}`); }
    finally { setLoading(null); }
  };

  useEffect(() => {
    const nextQuery = initialQuery?.trim();
    if (!nextQuery || nextQuery.length < 2) return;
    // 导航焦点是外部输入，写入本地查询状态后再触发检索。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(nextQuery);
    void runQuery('search', nextQuery);
    // 导航带入的对象查询只在焦点改变时自动执行，用户手动改词后不重复抢焦点。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const verifyClaim = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claim.trim()) return;
    setLoading('verify'); setError(null);
    try {
      const data = await fetchJson('/api/kos/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claim.trim(), query: query.trim() }),
      });
      setVerifyResult(data);
    } catch (reason) { setError(`声明校验失败：${reason instanceof Error ? reason.message : '未知错误'}`); }
    finally { setLoading(null); }
  };

  const writeKnowledge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!writeSlug.trim() || !writeTitle.trim() || !writeContent.trim()) return;
    setWriting(true);
    setWriteNotice(null);
    setError(null);
    try {
      const data = await fetchJson('/api/knowledge/put', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: writeSlug.trim(),
          title: writeTitle.trim(),
          content: writeContent.trim(),
          tags: writeTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        }),
      }) as JsonRecord;
      setWriteNotice(`知识卡片已写入：${displayValue(data.knowledge_ref ?? data.source_ref, '已落盘')}`);
    } catch (reason) {
      setError(`知识写入失败：${reason instanceof Error ? reason.message : '未知错误'}`);
    } finally {
      setWriting(false);
    }
  };

  return (
    <section className="services-section" role="region" aria-label="KOS知识检索与校验">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>KOS 知识证据台</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>直接承接知识搜索、上下文、聚类和声明校验，底层不可用时保留真实诊断。</p>
        </div>
        <button type="button" className="antd-btn" onClick={() => void loadStatus()} disabled={loading === 'status'} aria-label="刷新KOS状态">
          {loading === 'status' ? <Loader2 size={14} className="spinner" /> : <Database size={14} />} 刷新状态
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div className="stat-card"><div className="text-muted">服务健康</div><strong>{state.healthError ? '不可用' : healthDegraded ? '底层异常' : state.health ? '可用' : '检查中'}</strong><small className="text-muted">{state.healthError || displayValue(state.health?.status, '等待探测')}</small></div>
        <div className="stat-card"><div className="text-muted">文档统计</div><strong>{state.statsError ? '不可用' : displayValue(state.stats?.document_count ?? state.stats?.documents ?? state.stats?.total, '已连接')}</strong><small className="text-muted">{state.statsError || '来自 KOS /api/v1/stats'}</small></div>
        <div className="stat-card"><div className="text-muted">健康检查项</div><strong>{healthChecks.length ? `${healthChecks.filter(([, value]) => (value as JsonRecord).status === 'pass').length}/${healthChecks.length} 通过` : '无证据'}</strong><small className="text-muted">不把连通性冒充数据完整性</small></div>
      </div>

      {healthChecks.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{healthChecks.map(([name, value]) => { const check = value as JsonRecord; const pass = check.status === 'pass'; return <span className={`status-badge ${pass ? 'online' : 'degraded'}`} key={name}>{pass ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {name}: {displayValue(check.detail ?? check.status)}</span>; })}</div>}
      {(state.healthError || state.statsError || error) && <div className="error-banner" role="alert"><AlertTriangle size={16} /> {state.healthError || state.statsError || error}<button type="button" className="antd-btn" onClick={() => void loadStatus()}>重试</button></div>}

      <div className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <form onSubmit={(event) => { event.preventDefault(); void runQuery('search'); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Search size={17} style={{ alignSelf: 'center' }} />
          <input className="antd-input" list="kos-suggestions" aria-label="KOS搜索" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索知识、决策或上下文" style={{ flex: 1, minWidth: 220 }} />
          <datalist id="kos-suggestions">{suggestions.map((suggestion) => <option value={suggestion} key={suggestion} />)}</datalist>
          <button type="submit" className="antd-btn antd-btn-primary" disabled={loading === 'search'}>{loading === 'search' ? <Loader2 size={14} className="spinner" /> : <Search size={14} />} 检索</button>
          <button type="button" className="antd-btn" onClick={() => void runQuery('context')} disabled={loading === 'context'}><Sparkles size={14} /> 构建上下文</button>
          <button type="button" className="antd-btn" onClick={() => void runQuery('clusters')} disabled={loading === 'clusters'}><Network size={14} /> 看聚类</button>
        </form>
        {results.length > 0 && <div style={{ display: 'grid', gap: 8 }}>{results.map((result, index) => <article className="stat-card" key={`${displayValue(result.id, 'result')}-${index}`}><strong>{displayValue(result.title ?? result.slug ?? result.name, '未命名知识')}</strong><p className="text-muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{displayValue(result.chunk_text ?? result.content ?? result.text, '无摘要')}</p></article>)}</div>}
        {context && <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(context, null, 2)}</pre>}
        {clusters && <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(clusters, null, 2)}</pre>}
        {!results.length && !context && !clusters && <div className="text-muted">输入关键词后选择检索、构建上下文或查看聚类。</div>}
        {hasEvidence && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="antd-btn" onClick={() => void createEvidenceTask()} disabled={taskPending} aria-label="登记KOS证据任务">
              {taskPending ? <Loader2 size={14} className="spinner" /> : <ClipboardList size={14} />}
              {taskPending ? '登记中...' : '登记证据任务'}
            </button>
            {taskNotice && <span className="text-muted" role="status">{taskNotice}</span>}
          </div>
        )}
      </div>

      <form onSubmit={verifyClaim} className="antd-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ShieldCheck size={17} /><strong>声明校验</strong><span className="text-muted">把结论送入 KOS 验证接口，结果保留原始响应。</span></div>
        <textarea className="antd-input" aria-label="待校验声明" value={claim} onChange={(event) => setClaim(event.target.value)} placeholder="输入需要核验的声明" style={{ minHeight: 72, resize: 'vertical' }} />
        <button type="submit" className="antd-btn antd-btn-primary" disabled={loading === 'verify' || !claim.trim()} style={{ width: 'fit-content' }}>{loading === 'verify' ? <Loader2 size={14} className="spinner" /> : <ShieldCheck size={14} />} 校验声明</button>
        {verifyResult && <pre style={{ margin: 0, maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(verifyResult, null, 2)}</pre>}
      </form>

      <form onSubmit={writeKnowledge} className="antd-card" style={{ padding: 16, display: 'grid', gap: 10 }} aria-label="知识注入">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BookOpen size={17} /><strong>知识注入</strong><span className="text-muted">把经过整理的内容写入本地知识卡片。</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          <input className="antd-input" aria-label="知识卡片标题" value={writeTitle} onChange={(event) => setWriteTitle(event.target.value)} placeholder="标题" />
          <input className="antd-input" aria-label="知识卡片标识" value={writeSlug} onChange={(event) => setWriteSlug(event.target.value)} placeholder="slug，例如 architecture-decision" />
          <input className="antd-input" aria-label="知识卡片标签" value={writeTags} onChange={(event) => setWriteTags(event.target.value)} placeholder="标签，用逗号分隔" />
        </div>
        <textarea className="antd-input" aria-label="知识卡片正文" value={writeContent} onChange={(event) => setWriteContent(event.target.value)} placeholder="输入可复用的知识、决策或操作说明" style={{ minHeight: 100, resize: 'vertical' }} />
        <button type="submit" className="antd-btn antd-btn-primary" disabled={writing || !writeSlug.trim() || !writeTitle.trim() || !writeContent.trim()} style={{ width: 'fit-content' }}>
          {writing ? <Loader2 size={14} className="spinner" /> : <BookOpen size={14} />} {writing ? '写入中...' : '写入知识卡片'}
        </button>
        {writeNotice && <span className="text-muted" role="status">{writeNotice}</span>}
      </form>
    </section>
  );
}
