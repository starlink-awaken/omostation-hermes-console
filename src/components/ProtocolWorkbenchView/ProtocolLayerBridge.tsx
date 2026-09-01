import React from 'react';
import { type ProtocolLayer } from './types';
import { statusLabel } from './utils';

export function ProtocolLayerBridge({
  layers,
}: {
  layers: ProtocolLayer[];
}) {
  return (
    <section className="services-section">
      <div className="section-header">
        <div>
          <h2>协议层桥</h2>
          <p className="text-muted">从 ecos 的 MOF 到 model-driven，再到 workflow 与治理写回，这几层要同时成立才算真能用。</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {layers.length === 0 ? (
          <div className="antd-card" style={{ padding: 18, textAlign: 'center' }}>
            <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的协议层。</p>
          </div>
        ) : layers.map((layer) => (
          <article key={layer.id} className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>{layer.title}</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>{layer.role}</p>
              </div>
              <span className={`status-badge ${layer.status === 'ready' ? 'online' : 'degraded'}`}>{statusLabel(layer.status)}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--antd-text-secondary)' }}>
              {layer.facts.map((fact) => (
                <li key={`${layer.id}-${fact}`}>{fact}</li>
              ))}
            </ul>
            <p style={{ margin: 0, fontSize: 13 }}>{layer.next_action}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
