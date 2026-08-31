import React from 'react';
import { Copy, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import type { SourcePreview, SourceRef } from './types';
import { compactPath, copySourceRef } from './utils';

type SourceInspectorProps = {
  activeRef: SourceRef | null;
  preview: SourcePreview | null;
  loading: boolean;
  error: string;
};

function SourceInspector({ activeRef, preview, loading, error }: SourceInspectorProps) {
  return (
    <section className="services-section system-map-section system-map-source-inspector">
      <div className="section-header">
        <div>
          <h2>来源证据</h2>
          <p className="text-muted">
            {activeRef ? `${activeRef.label} · ${compactPath(activeRef.path)}${activeRef.line ? `:${activeRef.line}` : ''}` : '暂无来源选择'}
          </p>
        </div>
        <button className="antd-btn" disabled={!activeRef} onClick={() => activeRef && void copySourceRef(activeRef)}>
          <Copy size={14} />
          <span>复制位置</span>
        </button>
      </div>

      {loading && (
        <div className="system-map-source-preview-empty">
          <RefreshCw size={14} />
          <span>读取来源...</span>
        </div>
      )}

      {!loading && error && (
        <div className="system-map-source-preview-empty offline">
          <ShieldAlert size={14} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && !preview && (
        <div className="system-map-source-preview-empty">
          <ExternalLink size={14} />
          <span>选择一个来源定位</span>
        </div>
      )}

      {!loading && !error && preview && (
        <div className="system-map-source-preview">
          <div className="system-map-source-preview-meta">
            <code>{preview.workspace_relative_path}</code>
            <span>
              {preview.context_start}-{preview.context_end} / {preview.total_lines}
            </span>
            <small>{preview.guard}</small>
          </div>
          <div className="system-map-source-code" role="region" aria-label="来源代码预览">
            {preview.lines.map((line) => (
              <div className={`system-map-source-code-line ${line.highlight ? 'highlight' : ''}`} key={line.number}>
                <span>{line.number}</span>
                <code>{line.text || ' '}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default SourceInspector;
