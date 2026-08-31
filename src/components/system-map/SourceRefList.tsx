import React from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import type { SourceRef } from './types';
import { compactPath, copySourceRef, sourceLabels, sourceTarget } from './utils';

type SourceRefListProps = {
  refs?: SourceRef[];
  compact?: boolean;
  onInspect?: (ref: SourceRef) => void;
  activeTarget?: string;
};

function SourceRefList({ refs, compact = false, onInspect, activeTarget }: SourceRefListProps) {
  if (!refs || refs.length === 0) return null;
  return (
    <div className={`system-map-source-ref-list ${compact ? 'compact' : ''}`}>
      {refs.slice(0, compact ? 2 : 3).map((ref) => {
        const target = sourceTarget(ref);
        return (
          <button
            key={`${ref.source_key}-${ref.target}`}
            className={`system-map-source-ref ${ref.exists ? 'online' : 'offline'} ${activeTarget === target ? 'active' : ''}`}
            onClick={() => {
              if (onInspect && ref.exists) {
                onInspect(ref);
                return;
              }
              void copySourceRef(ref);
            }}
            title={ref.exists ? `预览 ${target}` : `复制 ${target}`}
          >
            {ref.exists ? <ExternalLink size={12} /> : <Copy size={12} />}
            <span>{ref.label}</span>
            <small>
              {compact ? (sourceLabels[ref.source_key] || ref.source_key) : compactPath(ref.path)}
              {ref.line ? `:${ref.line}` : ''}
            </small>
          </button>
        );
      })}
    </div>
  );
}

export default SourceRefList;
