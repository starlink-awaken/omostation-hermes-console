import React, { useState } from 'react';
import { CheckCircle2, CircleSlash2, FileCode2, LockKeyhole, ShieldAlert } from 'lucide-react';
import {
  usePreflightExternalResourcePack,
  type ExternalResourcePackCheckProjection,
  type ExternalResourcePackCheckStatus,
} from '../api/hooks';

const STATUS_LABELS: Record<ExternalResourcePackCheckStatus, string> = {
  blocked: '阻断',
  proposal_only: '仅提案',
  ready_for_catalog_preview: '可进入目录预览',
};

const STATUS_COLORS: Record<ExternalResourcePackCheckStatus, string> = {
  blocked: '#cf1322',
  proposal_only: '#ad6800',
  ready_for_catalog_preview: '#389e0d',
};

const EXAMPLE_MANIFEST = JSON.stringify({
  schema: 'external-resource-pack/v1',
  pack_id: 'pack:research-provider',
  pack_version: '1.0.0',
  activation: 'forbidden',
  extension: {
    entry_point_group: 'external.resources',
    entry_point: 'research-provider',
    provider_method: 'external_descriptor',
    health_probe: { method: 'health_probe', side_effect: 'read_only', required: true },
  },
  descriptor: {
    id: 'source:research-provider',
    kind: 'knowledge_source',
    provider: 'research-provider',
    protocol: 'external-resource/v1',
    capabilities: ['discover', 'search', 'read'],
    data_classification: 'public',
    provenance: { source_ref: 'evidence://research/provider' },
    lifecycle: 'sandbox',
    health: { status: 'healthy', observed_at: '2099-01-01T00:00:00+00:00', latency_ms: 10, source: 'probe:research' },
    owner: 'owner:research',
    version: '1.0.0',
    permission_ref: 'permission://research/read',
    mode: 'live_query',
    expires_at: '2099-01-01T00:00:00+00:00',
    rollback_plan: 'disable provider',
  },
}, null, 2);

function StatusProjection({ projection }: { projection: ExternalResourcePackCheckProjection }) {
  const color = STATUS_COLORS[projection.status];
  return (
    <section style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14, display: 'grid', gap: 10 }} aria-label="外部扩展包预检结果">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {projection.status === 'blocked' ? <CircleSlash2 size={18} style={{ color }} /> : projection.status === 'proposal_only' ? <ShieldAlert size={18} style={{ color }} /> : <CheckCircle2 size={18} style={{ color }} />}
          <strong style={{ color }}>{STATUS_LABELS[projection.status]}</strong>
        </div>
        <span style={{ color: '#ad6800', fontSize: 12, fontWeight: 600 }}>activation: forbidden</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: '#666', fontSize: 12 }}>
        <span>包 {projection.pack.pack_id || '未提供'}</span>
        <span>版本 {projection.pack.pack_version || '未提供'}</span>
        {projection.descriptor && <span>资源 {projection.descriptor.id} · {projection.descriptor.kind}</span>}
      </div>
      {projection.reason_codes.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 20, color: '#ad6800', fontSize: 13 }}>
          {projection.reason_codes.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      ) : (
        <span style={{ color: '#389e0d', fontSize: 13 }}>合同完整，可进入下一步目录预览。</span>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: '#666', fontSize: 12 }}>
        <span>安装禁止</span><span>provider 加载禁止</span><span>健康探针禁止</span><span>OMO 写入禁止</span><span>业务调用禁止</span>
      </div>
    </section>
  );
}

export default function ExternalResourcePackPreflightPanel() {
  const [manifest, setManifest] = useState(EXAMPLE_MANIFEST);
  const [localError, setLocalError] = useState('');
  const preflight = usePreflightExternalResourcePack();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');
    try {
      const parsed = JSON.parse(manifest) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('manifest 必须是 JSON 对象');
      preflight.mutate(parsed as Record<string, unknown>);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'manifest JSON 无效');
    }
  };

  return (
    <section className="antd-card" style={{ padding: 16, display: 'grid', gap: 12 }} aria-label="外部扩展包预检">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileCode2 size={18} style={{ color: 'var(--antd-primary, #1677ff)' }} />
          <strong>外部扩展包预检</strong>
          <span style={{ color: '#ad6800', fontSize: 12, fontWeight: 600 }}><LockKeyhole size={13} /> 只读合同检查</span>
        </div>
        <span style={{ color: '#666', fontSize: 12 }}>pack → catalog preview</span>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6, color: '#666', fontSize: 12 }}>
          JSON manifest
          <textarea
            aria-label="外部扩展包 JSON manifest"
            value={manifest}
            onChange={(event) => setManifest(event.target.value)}
            rows={10}
            spellCheck={false}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.5, padding: 10, border: '1px solid #d9d9d9', borderRadius: 6 }}
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" className="antd-btn antd-btn-primary" disabled={preflight.isPending} aria-label="预检外部扩展包">
            <FileCode2 size={14} /> {preflight.isPending ? '检查中...' : '运行预检'}
          </button>
          <span style={{ color: '#666', fontSize: 12 }}>不会安装、加载、探活、持久化或激活。</span>
          {localError && <span style={{ color: '#cf1322', fontSize: 12 }}>{localError}</span>}
          {preflight.error && <span style={{ color: '#cf1322', fontSize: 12 }}>{preflight.error instanceof Error ? preflight.error.message : '预检不可用'}</span>}
        </div>
      </form>
      {preflight.data?.projection && <StatusProjection projection={preflight.data.projection} />}
      {preflight.data && !preflight.data.projection && preflight.data.message && <span style={{ color: '#cf1322', fontSize: 13 }}>{preflight.data.message}</span>}
    </section>
  );
}
