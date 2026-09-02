import React from 'react';
import { AlertTriangle, ArrowRight, Compass, ExternalLink, ShieldAlert } from 'lucide-react';
import type { CockpitNavigationTarget, FeatureDomain, SourceRef, SystemMapPayload } from './types';
import { statusClass } from './utils';
import PageButton from './PageButton';
import SourceRefList from './SourceRefList';

type DomainCoverageProps = {
  systemMap: SystemMapPayload;
  selectedFeatureDomainId: string | null;
  activeSourceTarget: string;
  onSetSelectedFeatureDomainId: (id: string | null) => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
};

function DomainCoverage({
  systemMap,
  selectedFeatureDomainId,
  activeSourceTarget,
  onSetSelectedFeatureDomainId,
  onNavigate,
  onOpenTarget,
  onInspect,
}: DomainCoverageProps) {
  const pagesById = new Map(systemMap.cockpit_pages.map((p) => [p.id, p]));

  return (
    <>
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>功能域覆盖</h2><p className="text-muted">能力域来自功能能力地图，Cockpit 负责把它们指到可操作页面。</p></div>
          <Compass size={18} className="text-muted" />
        </div>
        <div className="system-map-domain-grid">
          {systemMap.feature_domains.map((domain) => {
            const page = pagesById.get(domain.cockpit_page);
            return (
              <article className={`system-map-domain ${selectedFeatureDomainId === domain.id ? 'active' : ''}`} key={domain.id}>
                <div><h3>{domain.title}</h3><p>{domain.english || 'Capability Domain'}</p></div>
                <div className="system-map-provider-line">{domain.providers.slice(0, 5).map((provider) => (<span key={provider}>{provider}</span>))}</div>
                <SourceRefList refs={domain.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} />
                <div className="system-map-page-maturity-card-actions">
                  <button className="antd-btn" onClick={() => onSetSelectedFeatureDomainId(domain.id)}><span>查看剖面</span></button>
                  {page && <PageButton page={page} onNavigate={onNavigate} onOpenTarget={onOpenTarget} contextQuery={domain.id} />}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>领域应用覆盖</h2><p className="text-muted">把家庭驾驶舱、OPC 和 family-hub 从应用中心拉进总图，先看健康、运行和安全门。</p></div>
          <span className={`status-badge ${statusClass(systemMap.domain_apps.status)}`}><ShieldAlert size={13} />{systemMap.domain_apps.summary.score}%</span>
        </div>
        <div className="system-map-domain-app-summary">
          <span><strong>{systemMap.domain_apps.summary.ready}</strong> ready</span>
          <span><strong>{systemMap.domain_apps.summary.running}</strong> running</span>
          <span><strong>{systemMap.domain_apps.summary.external_mounts}</strong> external</span>
          <span><strong>{systemMap.domain_apps.summary.security_attention_apps}</strong> security attention</span>
        </div>
        <div className="system-map-domain-app-grid">
          {systemMap.domain_apps.items.map((app) => (
            <article className={`system-map-domain-app-card ${statusClass(app.security_posture)}`} key={app.id}>
              <div className="system-map-domain-app-head">
                <div><h3>{app.name}</h3><p>{app.domain?.name || app.kind} · {app.integration_mode}</p></div>
                <span className={`status-badge ${statusClass(app.security_posture)}`}>{app.security_posture}</span>
              </div>
              <div className="system-map-domain-app-metrics">
                <span className={statusClass(app.health)}>健康 {app.health}</span>
                <span className={statusClass(app.runtime_status)}>运行 {app.runtime_status}</span>
                <span className={statusClass(app.risk_level)}>风险 {app.risk_level}</span>
                <span>动作 {app.action_count}</span>
              </div>
              <div className="system-map-domain-app-capabilities">
                {app.read_capabilities.slice(0, 3).map((item) => (<span key={`${app.id}-read-${item}`}>读 {item}</span>))}
                {app.write_capabilities.slice(0, 3).map((item) => (<span className="degraded" key={`${app.id}-write-${item}`}>写 {item}</span>))}
              </div>
              <strong className="system-map-domain-app-next">{app.next_action}</strong>
              <div className="system-map-domain-app-actions">
                {app.launch_url && (<a className="antd-btn" href={app.launch_url} rel="noreferrer" target="_blank"><ExternalLink size={13} /><span>打开</span></a>)}
                <button className="antd-btn" onClick={() => onOpenTarget?.({ tab: 'DomainApps', taskQuery: app.id })}><ArrowRight size={13} /><span>应用中心</span></button>
              </div>
            </article>
          ))}
        </div>
        {systemMap.domain_apps.attention_items.length > 0 && (
          <div className="system-map-domain-app-attention">
            <strong>优先处理：</strong>
            {systemMap.domain_apps.attention_items.map((app) => (<span className={statusClass(app.security_posture)} key={app.id} title={app.next_action}>{app.id} · {app.runtime_status}</span>))}
          </div>
        )}
        <p className="system-map-domain-app-nextline">{systemMap.domain_apps.next_action}</p>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>项目聚焦</h2><p className="text-muted">把项目矩阵切成可处理队列：运行、验证、目录和日用状态都能直接定位。</p></div>
          <span className="status-badge degraded"><AlertTriangle size={13} />{systemMap.project_focus.summary.needs_action}</span>
        </div>
        <div className="system-map-project-focus-grid">
          {systemMap.project_focus.queues.map((queue) => (
            <button key={queue.id} className={`system-map-project-focus ${statusClass(queue.severity)}`} onClick={() => onOpenTarget?.({ tab: 'SystemMap', projectFilter: queue.id })} title={queue.reason}>
              <span>{queue.title}</span><strong>{queue.count}</strong><small>{queue.reason}</small>
              {queue.top_projects.length > 0 && (<div className="system-map-project-focus-hits">{queue.top_projects.slice(0, 4).map((project) => (<em key={project.id}>{project.id}</em>))}</div>)}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

export default DomainCoverage;
