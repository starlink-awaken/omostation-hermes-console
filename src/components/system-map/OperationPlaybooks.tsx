import React from 'react';
import { ArrowRight, ClipboardCheck, Layers, Route } from 'lucide-react';
import type { CockpitNavigationTarget, SourceRef, SystemMapPayload } from './types';
import { statusClass } from './utils';
import PageButton from './PageButton';
import SourceRefList from './SourceRefList';

type OperationPlaybooksProps = {
  systemMap: SystemMapPayload;
  activeSourceTarget: string;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
};

function OperationPlaybooks({
  systemMap,
  activeSourceTarget,
  onNavigate,
  onOpenTarget,
  onInspect,
}: OperationPlaybooksProps) {
  const pagesById = new Map(systemMap.cockpit_pages.map((p) => [p.id, p]));

  return (
    <>
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>使用路径</h2><p className="text-muted">常用目标直接串页面，减少在侧边栏里猜。</p></div>
          <Route size={18} className="text-muted" />
        </div>
        <div className="system-map-path-grid">
          {systemMap.usage_paths.map((path) => (
            <article className="system-map-path" key={path.id}>
              <div><h3>{path.title}</h3><p>{path.intent}</p></div>
              <div className="system-map-step-row">
                {path.pages.map((page, index) => (
                  <React.Fragment key={page.id}>
                    {index > 0 && <ArrowRight size={13} className="text-muted" />}
                    <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={path.id} />
                  </React.Fragment>
                ))}
              </div>
              <SourceRefList refs={path.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>操作清单</h2><p className="text-muted">把常用路径拆成可执行步骤：入口、动作、证据和完成标准都摆出来。</p></div>
          <span className="status-badge online"><ClipboardCheck size={13} />{systemMap.summary.playbooks}</span>
        </div>
        <div className="system-map-playbook-grid">
          {systemMap.playbooks.map((playbook) => (
            <article className="system-map-playbook" key={playbook.id}>
              <div className="system-map-playbook-head">
                <div><h3>{playbook.title}</h3><p>{playbook.goal}</p></div>
                <span className={`status-badge ${statusClass(playbook.risk)}`}>{playbook.frequency}</span>
              </div>
              <div className="system-map-playbook-meta"><span>{playbook.owner}</span><span>{playbook.risk}</span></div>
              <SourceRefList refs={playbook.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
              <div className="system-map-playbook-steps">
                {playbook.steps.map((step, index) => (
                  <div className="system-map-playbook-step" key={step.id}>
                    <span className="system-map-step-index">{index + 1}</span>
                    <div className="system-map-playbook-copy">
                      <strong>{step.action}</strong><small>证据：{step.evidence}</small><small>完成：{step.done_when}</small>
                    </div>
                    <button className="antd-btn system-map-step-btn" onClick={() => onOpenTarget?.({ tab: step.page.id, taskQuery: playbook.id })}>
                      <span>{step.page.title}</span><ArrowRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>架构层级覆盖</h2><p className="text-muted">层级来自项目注册表，页面只做入口映射。</p></div>
          <Layers size={18} className="text-muted" />
        </div>
        <div className="system-map-layer-grid">
          {systemMap.layers.map((layer) => (
            <article className="system-map-layer" key={layer.id}>
              <div className="system-map-layer-header"><span>{layer.id}</span><strong>{layer.name}</strong></div>
              <div className="system-map-chip-row">
                {layer.projects.map((project) => (
                  <button key={project.id} className={`system-map-chip ${statusClass(project.coverage)}`} onClick={() => onOpenTarget?.({ tab: project.cockpit_page, projectId: project.id })} title={`${project.role} · ${project.stack}`}>{project.id}</button>
                ))}
              </div>
              <SourceRefList refs={layer.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default OperationPlaybooks;
