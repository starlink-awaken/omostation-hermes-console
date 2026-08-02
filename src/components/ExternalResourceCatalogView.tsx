import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash2,
  Database,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  useExternalResources,
  type ExternalResourceAvailability,
  type ExternalResourceItem,
} from '../api/hooks';

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

export default function ExternalResourceCatalogView() {
  const { data, isLoading, error, refetch } = useExternalResources();
  const [kind, setKind] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
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
