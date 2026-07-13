import React from 'react';
import { ArrowRight, Copy } from 'lucide-react';

type ActionSurfaceItem = {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  actionType: 'navigate' | 'copy';
  actionValue: string;
};

interface ActionSurfacePanelProps {
  title: string;
  subtitle: string;
  statusText?: string;
  items: ActionSurfaceItem[];
  onNavigate?: (tab: string) => void;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function ActionSurfacePanel({
  title,
  subtitle,
  statusText,
  items,
  onNavigate,
}: ActionSurfacePanelProps) {
  return (
    <section className="action-surface-panel antd-card">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            {subtitle}
          </p>
        </div>
        {statusText && <span className="status-badge degraded">{statusText}</span>}
      </div>
      <div className="action-surface-grid">
        {items.map((item) => (
          <article key={item.id} className="action-surface-item">
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <button
              type="button"
              className="antd-btn"
              onClick={() => {
                if (item.actionType === 'navigate') {
                  onNavigate?.(item.actionValue);
                  return;
                }
                void copyText(item.actionValue);
              }}
            >
              {item.actionType === 'navigate' ? <ArrowRight size={14} /> : <Copy size={14} />}
              <span>{item.actionLabel}</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
