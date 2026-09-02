import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CockpitNavigationTarget, SourceRef, SystemMapPayload } from './types';
import { statusClass } from './utils';
import PageButton from './PageButton';
import SourceRefList from './SourceRefList';

type RoadmapSectionProps = {
  systemMap: SystemMapPayload;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
  activeSourceTarget: string;
};

function RoadmapSection({
  systemMap,
  onNavigate,
  onOpenTarget,
  onInspect,
  activeSourceTarget,
}: RoadmapSectionProps) {
  const pagesById = new Map(systemMap.cockpit_pages.map((p) => [p.id, p]));

  return (
    <section className="services-section system-map-section">
      <div className="section-header">
        <div><h2>能力路线图</h2><p className="text-muted">把"感觉缺功能"拆成优先级、页面入口、动作和验收标准。</p></div>
        <span className="status-badge degraded"><AlertTriangle size={13} />P0 {systemMap.roadmap.summary.p0}</span>
      </div>
      <div className="system-map-roadmap-grid">
        {systemMap.roadmap.lanes.map((lane) => (
          <article className="system-map-roadmap-lane" key={lane.id}>
            <div className="system-map-roadmap-lane-title"><h3>{lane.title}</h3><span>{lane.items.length}</span></div>
            <div className="system-map-roadmap-list">
              {lane.items.map((item) => {
                const page = pagesById.get(item.cockpit_page);
                return (
                  <div className="system-map-roadmap-item" key={item.id}>
                    <div className="system-map-roadmap-meta">
                      <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span>
                      <span>{item.priority}</span><span>{item.domain}</span>
                    </div>
                    <h4>{item.title}</h4><p>{item.problem}</p>
                    <div className="system-map-roadmap-body">
                      <div><strong>动作</strong><ul>{item.actions.slice(0, 2).map((action) => <li key={action}>{action}</li>)}</ul></div>
                      <div><strong>验收</strong><ul>{item.acceptance.slice(0, 2).map((acceptance) => <li key={acceptance}>{acceptance}</li>)}</ul></div>
                    </div>
                    {page && <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={item.id} />}
                    <SourceRefList refs={item.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RoadmapSection;
