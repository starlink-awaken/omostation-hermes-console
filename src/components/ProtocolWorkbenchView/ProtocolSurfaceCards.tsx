import React from 'react';
import { Route } from 'lucide-react';
import { type ProtocolSurfaceCard } from './types';

export function ProtocolSurfaceCards({
  surfaces,
  activeSurfaceId,
  onSurfaceChange,
}: {
  surfaces: ProtocolSurfaceCard[];
  activeSurfaceId: string;
  onSurfaceChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {surfaces.map((surface) => (
        <article key={surface.id} className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <small className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{surface.id}</small>
            <strong style={{ fontSize: 15 }}>{surface.title}</strong>
            <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{surface.summary}</p>
          </div>
          <div style={{ minHeight: 54, padding: '10px 12px', borderRadius: 'var(--antd-radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <small className="text-muted" style={{ display: 'block', marginBottom: 4 }}>怎么用</small>
            <span style={{ fontSize: 12, lineHeight: 1.6 }}>{surface.detail}</span>
          </div>
          <button
            type="button"
            className="antd-btn small"
            aria-label={`切换协议子面板 ${surface.title}`}
            onClick={() => onSurfaceChange(surface.id)}
          >
            <Route size={13} />
            <span>{surface.id === activeSurfaceId ? '当前查看' : '切到此层'}</span>
          </button>
        </article>
      ))}
    </div>
  );
}
