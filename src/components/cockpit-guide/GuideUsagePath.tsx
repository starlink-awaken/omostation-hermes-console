import React from 'react';
import { Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuidePath } from './types';

interface GuideUsagePathProps {
  paths: GuidePath[];
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideUsagePath({ paths, onNavigate, onOpenTarget }: GuideUsagePathProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>推荐使用路径</h2>
          <p className="text-muted">按照目标走，不要按菜单乱撞。</p>
        </div>
      </div>
      <div className="cockpit-guide-path-grid">
        {paths.map((path) => (
          <article key={path.id} className="cockpit-guide-path-card">
            <div className="cockpit-guide-path-head">
              <span>{path.tag}</span>
              <strong>{path.title}</strong>
            </div>
            <p>{path.description}</p>
            <div className="cockpit-guide-path-steps" aria-label={`${path.title} 路径步骤`}>
              {path.steps.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开推荐路径 ${path.title}`}
              onClick={() => openCockpitNavigationTarget(path.target, onNavigate, onOpenTarget)}
            >
              <Route size={14} />
              <span>{path.actionLabel}</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
